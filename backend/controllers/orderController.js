const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');
const User = require('../models/User');
const { sendResendEmail } = require('../utils/email');

const VALID_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const VALID_PAYMENT_METHODS = ['cash-on-delivery', 'bank-transfer', 'momo', 'Paystack'];
const MAX_ORDER_ITEMS = 50;

function sanitizeAddress(addr) {
  return {
    address: String(addr?.address || '').trim().slice(0, 200),
    city:    String(addr?.city    || '').trim().slice(0, 100),
    phone:   String(addr?.phone   || '').trim().slice(0, 30),
  };
}

async function verifyPaystackRef(reference, expectedTotal) {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(String(reference))}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  const data = await response.json();
  if (!data.status || data.data?.status !== 'success') {
    const err = new Error('Paystack payment could not be verified. Contact support if money was deducted.');
    err.statusCode = 400;
    throw err;
  }
  // Paystack amounts are in pesewas (GHS × 100); allow 1 pesewa tolerance for rounding
  const paidPesewas = Number(data.data.amount);
  const expectedPesewas = Math.round(expectedTotal * 100);
  if (Math.abs(paidPesewas - expectedPesewas) > 1) {
    const err = new Error('Payment amount does not match order total. Contact support.');
    err.statusCode = 400;
    throw err;
  }
}

const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, promoCode, paystackReference } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('Order items required');
  }
  if (orderItems.length > MAX_ORDER_ITEMS) {
    res.status(400);
    throw new Error(`Order cannot exceed ${MAX_ORDER_ITEMS} items`);
  }
  if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    res.status(400);
    throw new Error('Invalid payment method');
  }
  if (paymentMethod === 'Paystack' && !paystackReference) {
    res.status(400);
    throw new Error('Paystack reference is required for online payments');
  }

  const validatedItems = [];
  // Track items whose stock was already decremented so we can roll back on failure
  const decremented = [];

  const rollback = async () => {
    if (decremented.length > 0) {
      await Promise.allSettled(
        decremented.map((d) => Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty, totalSold: -d.qty } }))
      );
    }
  };

  try {
    for (const item of orderItems) {
      if (!item.product || !/^[a-f\d]{24}$/i.test(String(item.product))) {
        res.status(400);
        throw new Error('Invalid product ID in order');
      }
      const qty = Math.floor(Number(item.quantity));
      if (!qty || qty < 1) {
        res.status(400);
        throw new Error('Quantity must be at least 1');
      }

      const product = await Product.findById(item.product);
      if (!product || !product.active) {
        res.status(400);
        throw new Error('One or more products are no longer available');
      }

      // Atomic check-and-decrement — prevents overselling under concurrent load
      const reserved = await Product.findOneAndUpdate(
        { _id: product._id, active: true, stock: { $gte: qty } },
        { $inc: { stock: -qty, totalSold: qty } }
      );
      if (!reserved) {
        res.status(400);
        throw new Error(`"${product.name}" is out of stock or has insufficient quantity`);
      }
      decremented.push({ id: product._id, qty });

      // Server-side price — wholesale if quantity qualifies, otherwise discounted retail
      const isWholesale =
        product.wholesalePrice > 0 &&
        product.wholesaleMinQty > 0 &&
        qty >= product.wholesaleMinQty;
      // Use integer arithmetic to avoid floating-point accumulation errors
      const serverPrice = isWholesale
        ? product.wholesalePrice
        : Math.round(product.price * (1 - (product.discount || 0) / 100) * 100) / 100;

      validatedItems.push({
        product: product._id,
        name: product.name,
        quantity: qty,
        price: serverPrice,
        image: product.images?.[0] || item.image || '',
      });
    }

    // Server-side subtotal using integer arithmetic to avoid float drift
    const serverSubtotal =
      Math.round(validatedItems.reduce((sum, i) => sum + i.price * i.quantity * 100, 0)) / 100;

    // Re-validate promo code server-side
    let serverDiscount = 0;
    let validPromoCode = '';
    if (promoCode) {
      const promo = await PromoCode.findOne({
        code: String(promoCode).toUpperCase().trim(),
        active: true,
      });
      if (
        promo &&
        (!promo.expiresAt || promo.expiresAt > Date.now()) &&
        (!promo.minAmount || serverSubtotal >= promo.minAmount)
      ) {
        validPromoCode = promo.code;
        serverDiscount =
          promo.discountType === 'fixed'
            ? promo.discountValue
            : Math.round(serverSubtotal * (promo.discountValue / 100) * 100) / 100;
      }
    }

    const serverTotal = Math.max(0, Math.round((serverSubtotal - serverDiscount) * 100) / 100);

    // Verify Paystack payment server-side — prevents order creation without actual payment
    if (paymentMethod === 'Paystack') {
      await verifyPaystackRef(paystackReference, serverTotal);
    }

    const order = new Order({
      user: req.user._id,
      orderItems: validatedItems,
      shippingAddress: sanitizeAddress(shippingAddress),
      paymentMethod,
      subtotalPrice: serverSubtotal,
      discountPrice: serverDiscount,
      promoCode: validPromoCode,
      totalPrice: serverTotal,
    });

    const created = await order.save();

    // Record order on user profile
    await User.findByIdAndUpdate(req.user._id, { $push: { orders: created._id } });

    // Send order confirmation email (non-blocking — don't fail the order if email fails)
    if (req.user.email) {
      const itemRows = validatedItems.map((item) =>
        `<tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:8px 4px">${item.name}</td>
          <td style="text-align:right;padding:8px 4px">${item.quantity}</td>
          <td style="text-align:right;padding:8px 4px">&#8373;${(item.quantity * item.price).toFixed(2)}</td>
        </tr>`
      ).join('');

      sendResendEmail({
        to: req.user.email,
        subject: `Order Confirmed — #${created._id.toString().slice(-8).toUpperCase()}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
            <h2 style="color:#131921">Order Confirmed!</h2>
            <p>Hi ${req.user.name || 'Customer'},</p>
            <p>Thank you for your order. Here is a summary:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <thead>
                <tr style="border-bottom:2px solid #eee">
                  <th style="text-align:left;padding:8px 4px;color:#888;font-size:12px;text-transform:uppercase">Item</th>
                  <th style="text-align:right;padding:8px 4px;color:#888;font-size:12px;text-transform:uppercase">Qty</th>
                  <th style="text-align:right;padding:8px 4px;color:#888;font-size:12px;text-transform:uppercase">Price</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            ${serverDiscount > 0 ? `<p style="text-align:right;color:#666;margin:4px 0">Promo discount: &minus;&#8373;${serverDiscount.toFixed(2)}</p>` : ''}
            <p style="text-align:right;font-size:18px;font-weight:bold;margin:8px 0">Total: &#8373;${serverTotal.toFixed(2)}</p>
            <div style="margin:24px 0;padding:16px;background:#f9f9f9;border-radius:8px;font-size:14px;line-height:1.6">
              <strong>Order ID:</strong> #${created._id.toString().slice(-8).toUpperCase()}<br>
              <strong>Payment:</strong> ${paymentMethod || 'N/A'}<br>
              <strong>Ship to:</strong> ${shippingAddress?.address || ''}, ${shippingAddress?.city || ''}
            </div>
            <p style="color:#666;font-size:13px">We will notify you when your order is shipped.</p>
            <a href="${process.env.FRONTEND_URL || 'https://backend-alpha-seven-54.vercel.app'}/orders/${created._id}"
               style="display:inline-block;margin:16px 0;padding:12px 28px;background:#D4AF37;color:#000;font-weight:700;border-radius:999px;text-decoration:none">
              View Order
            </a>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
          </div>
        `,
      }).catch((err) => console.error('[Email] Order confirmation failed:', err.message));
    }

    res.status(201).json(created);
  } catch (err) {
    // If an error occurred after some stock was decremented, restore it
    await rollback();
    throw err;
  }
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('orderItems.product', 'name price images')
    .populate('user', 'name email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Admins can see any order; users can only see their own
  if (req.user.isAdmin) {
    return res.json(order);
  }
  if (!req.user._id || order.user._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Access denied');
  }
  res.json(order);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id, status: { $ne: 'Cancelled' } })
    .populate('orderItems.product', 'name price images')
    .sort({ createdAt: -1 });
  res.json(orders);
});

const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ status: { $ne: 'Cancelled' } })
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(500);
  res.json(orders);
});

const STATUS_EMAIL = {
  Processing: {
    subject: 'Your order is being prepared',
    heading: 'We\'re on it!',
    body: 'Great news — your order has been confirmed and our team is now preparing it for dispatch.',
    color: '#3B82F6',
  },
  Shipped: {
    subject: 'Your order is on its way!',
    heading: 'Order Shipped 🚚',
    body: 'Your order has been handed over to our delivery team and is on its way to you. Please be available to receive it.',
    color: '#8B5CF6',
  },
  Delivered: {
    subject: 'Your order has been delivered',
    heading: 'Order Delivered ✓',
    body: 'Your order has been marked as delivered. We hope you love your purchase! If you have any issues, please contact us.',
    color: '#10B981',
  },
  Cancelled: {
    subject: 'Your order has been cancelled',
    heading: 'Order Cancelled',
    body: 'Your order has been cancelled. If you did not request this or have any questions, please contact us immediately.',
    color: '#EF4444',
  },
};

const sendStatusEmail = (userEmail, userName, order, status) => {
  const tpl = STATUS_EMAIL[status];
  if (!tpl || !userEmail) return;
  const orderId = order._id.toString().slice(-8).toUpperCase();
  const FRONTEND = process.env.FRONTEND_URL || 'https://backend-alpha-seven-54.vercel.app';

  sendResendEmail({
    to: userEmail,
    subject: `${tpl.subject} — Order #${orderId}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <h2 style="color:${tpl.color};margin-bottom:4px">${tpl.heading}</h2>
        <p>Hi ${userName || 'Customer'},</p>
        <p>${tpl.body}</p>
        <div style="margin:20px 0;padding:16px;background:#f9f9f9;border-radius:8px;font-size:14px;line-height:1.8">
          <strong>Order ID:</strong> #${orderId}<br>
          <strong>Status:</strong> <span style="color:${tpl.color};font-weight:700">${status}</span><br>
          <strong>Items:</strong> ${order.orderItems?.length || 0}<br>
          <strong>Total:</strong> &#8373;${Number(order.totalPrice || 0).toFixed(2)}
        </div>
        ${status !== 'Cancelled' ? `
        <a href="${FRONTEND}/orders/${order._id}"
           style="display:inline-block;margin:8px 0 20px;padding:12px 28px;background:#D4AF37;color:#000;font-weight:700;border-radius:999px;text-decoration:none">
          View Order
        </a>` : ''}
        <p style="color:#666;font-size:13px">Questions? Contact us on WhatsApp: <a href="https://wa.me/233257543723" style="color:#D4AF37">0257543723</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
      </div>
    `,
  }).catch((err) => console.error(`[Email] Status email (${status}) failed:`, err.message));
};

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Cancelling — restore stock, remove from user record, delete order, notify customer
  if (status === 'Cancelled' && order.status !== 'Cancelled') {
    await Promise.allSettled([
      ...order.orderItems.map((item) =>
        Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, totalSold: -item.quantity } })
      ),
      order.user?._id
        ? User.findByIdAndUpdate(order.user._id, { $pull: { orders: order._id } })
        : Promise.resolve(),
    ]);
    sendStatusEmail(order.user?.email, order.user?.name, order, 'Cancelled');
    await Order.findByIdAndDelete(order._id);
    return res.json({ deleted: true, message: 'Order cancelled and removed.' });
  }

  const prevStatus = order.status;
  order.status = status || order.status;
  order.isDelivered = order.status === 'Delivered';
  if (order.isDelivered && !order.deliveredAt) order.deliveredAt = Date.now();
  const updated = await order.save();

  // Email customer only when status actually changes
  if (status && status !== prevStatus) {
    sendStatusEmail(order.user?.email, order.user?.name, updated, status);
  }

  res.json(updated);
});

const createGuestOrder = asyncHandler(async (req, res) => {
  const { guestName, guestEmail, orderItems, shippingAddress, paymentMethod, promoCode, paystackReference } = req.body;

  if (!guestName || !String(guestName).trim()) { res.status(400); throw new Error('Name is required'); }
  if (String(guestName).trim().length > 100) { res.status(400); throw new Error('Name is too long'); }
  if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) { res.status(400); throw new Error('Valid email is required'); }
  if (!orderItems || orderItems.length === 0) { res.status(400); throw new Error('Order items required'); }
  if (orderItems.length > MAX_ORDER_ITEMS) { res.status(400); throw new Error(`Order cannot exceed ${MAX_ORDER_ITEMS} items`); }
  if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) { res.status(400); throw new Error('Invalid payment method'); }
  if (paymentMethod === 'Paystack' && !paystackReference) { res.status(400); throw new Error('Paystack reference is required for online payments'); }

  const validatedItems = [];
  const decremented = [];
  const rollback = async () => {
    if (decremented.length > 0) {
      await Promise.allSettled(decremented.map((d) => Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty, totalSold: -d.qty } })));
    }
  };

  try {
    for (const item of orderItems) {
      if (!item.product || !/^[a-f\d]{24}$/i.test(String(item.product))) { res.status(400); throw new Error('Invalid product ID'); }
      const qty = Math.floor(Number(item.quantity));
      if (!qty || qty < 1) { res.status(400); throw new Error('Quantity must be at least 1'); }
      const product = await Product.findById(item.product);
      if (!product || !product.active) { res.status(400); throw new Error('One or more products are no longer available'); }
      const reserved = await Product.findOneAndUpdate(
        { _id: product._id, active: true, stock: { $gte: qty } },
        { $inc: { stock: -qty, totalSold: qty } }
      );
      if (!reserved) { res.status(400); throw new Error(`"${product.name}" is out of stock`); }
      decremented.push({ id: product._id, qty });
      const isWholesale = product.wholesalePrice > 0 && product.wholesaleMinQty > 0 && qty >= product.wholesaleMinQty;
      const serverPrice = isWholesale
        ? product.wholesalePrice
        : Math.round(product.price * (1 - (product.discount || 0) / 100) * 100) / 100;
      validatedItems.push({ product: product._id, name: product.name, quantity: qty, price: serverPrice, image: product.images?.[0] || '' });
    }

    const serverSubtotal = Math.round(validatedItems.reduce((sum, i) => sum + i.price * i.quantity * 100, 0)) / 100;
    let serverDiscount = 0;
    let validPromoCode = '';
    if (promoCode) {
      const promo = await PromoCode.findOne({ code: String(promoCode).toUpperCase().trim(), active: true });
      if (promo && (!promo.expiresAt || promo.expiresAt > Date.now()) && (!promo.minAmount || serverSubtotal >= promo.minAmount)) {
        validPromoCode = promo.code;
        serverDiscount = promo.discountType === 'fixed'
          ? promo.discountValue
          : Math.round(serverSubtotal * (promo.discountValue / 100) * 100) / 100;
      }
    }
    const serverTotal = Math.max(0, Math.round((serverSubtotal - serverDiscount) * 100) / 100);

    if (paymentMethod === 'Paystack') {
      await verifyPaystackRef(paystackReference, serverTotal);
    }

    const order = await new Order({
      guestName: String(guestName).trim().slice(0, 100),
      guestEmail: String(guestEmail).toLowerCase().trim(),
      orderItems: validatedItems,
      shippingAddress: sanitizeAddress(shippingAddress),
      paymentMethod,
      subtotalPrice: serverSubtotal,
      discountPrice: serverDiscount,
      promoCode: validPromoCode,
      totalPrice: serverTotal,
    }).save();

    // Confirmation email to guest
    const itemRows = validatedItems.map((item) =>
      `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:8px 4px">${item.name}</td>
        <td style="text-align:right;padding:8px 4px">${item.quantity}</td>
        <td style="text-align:right;padding:8px 4px">&#8373;${(item.quantity * item.price).toFixed(2)}</td>
      </tr>`
    ).join('');
    sendResendEmail({
      to: String(guestEmail).toLowerCase().trim(),
      subject: `Order Confirmed — #${order._id.toString().slice(-8).toUpperCase()}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <h2 style="color:#131921">Order Confirmed!</h2>
          <p>Hi ${String(guestName).trim()},</p>
          <p>Thank you for your order. Here is a summary:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead><tr style="border-bottom:2px solid #eee">
              <th style="text-align:left;padding:8px 4px;color:#888;font-size:12px">Item</th>
              <th style="text-align:right;padding:8px 4px;color:#888;font-size:12px">Qty</th>
              <th style="text-align:right;padding:8px 4px;color:#888;font-size:12px">Price</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          ${serverDiscount > 0 ? `<p style="text-align:right;color:#666">Promo: &minus;&#8373;${serverDiscount.toFixed(2)}</p>` : ''}
          <p style="text-align:right;font-size:18px;font-weight:bold">Total: &#8373;${serverTotal.toFixed(2)}</p>
          <div style="margin:20px 0;padding:16px;background:#f9f9f9;border-radius:8px;font-size:14px;line-height:1.8">
            <strong>Order ID:</strong> #${order._id.toString().slice(-8).toUpperCase()}<br>
            <strong>Payment:</strong> ${paymentMethod || 'N/A'}<br>
            <strong>Ship to:</strong> ${shippingAddress?.address || ''}, ${shippingAddress?.city || ''}
          </div>
          <p style="color:#666;font-size:13px">We will notify you when your order is shipped.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
        </div>
      `,
    }).catch((err) => console.error('[Email] Guest order confirmation failed:', err.message));

    res.status(201).json(order);
  } catch (err) {
    await rollback();
    throw err;
  }
});

const getGuestOrder = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) { res.status(400); throw new Error('Email is required'); }
  const order = await Order.findById(req.params.id);
  if (!order || !order.guestEmail) { res.status(404); throw new Error('Order not found'); }
  if (order.guestEmail !== String(email).toLowerCase().trim()) { res.status(403); throw new Error('Access denied'); }
  res.json(order);
});

module.exports = { createOrder, createGuestOrder, getGuestOrder, getOrderById, getMyOrders, getOrders, updateOrderStatus };
