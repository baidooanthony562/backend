const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');
const User = require('../models/User');
const { sendResendEmail, escapeHtml } = require('../utils/email');
const { getMoMoTransaction } = require('./paymentController');

const VALID_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const VALID_PAYMENT_METHODS = ['cash-on-delivery', 'bank-transfer', 'momo', 'Paystack'];
const MAX_ORDER_ITEMS = 50;
const LOW_STOCK_THRESHOLD = 5;

// Email admin when an order pushes a product's stock down to or below the
// threshold. Fired only on the *crossing* order (not every subsequent one
// while stock is already low) so a busy product doesn't spam the inbox.
function notifyLowStock(product) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return;
  const FRONTEND = process.env.FRONTEND_URL || 'https://backend-alpha-seven-54.vercel.app';
  sendResendEmail({
    to,
    subject: `Low stock: ${product.name} (${product.stock} left)`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#b45309;margin-bottom:4px">Low stock alert</h2>
        <p style="color:#555;margin-top:0">A recent order has dropped a product to the low-stock threshold.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888;width:120px">Product</td>
            <td style="padding:10px 0;font-weight:700;color:#131921">${escapeHtml(product.name)}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888">Remaining stock</td>
            <td style="padding:10px 0;font-weight:700;color:${product.stock === 0 ? '#dc2626' : '#b45309'}">${product.stock}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">Total sold</td>
            <td style="padding:10px 0;color:#131921">${product.totalSold || 0}</td>
          </tr>
        </table>
        <a href="${FRONTEND}/admin"
           style="display:inline-block;margin:8px 0 20px;padding:12px 24px;background:#D4AF37;color:#000;font-weight:700;border-radius:999px;text-decoration:none">
          Open admin dashboard
        </a>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; restock when convenient.</p>
      </div>
    `,
  }).catch((err) => console.error('[LowStock] Alert email failed:', err.message));
}

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
    throw new Error('Payment amount does not match order total. Contact support.');
  }
}

// Verify a MoMo payment server-side before trusting a 'momo' order.
async function verifyMoMoRef(reference, expectedTotal) {
  let data;
  try {
    data = await getMoMoTransaction(reference);
  } catch {
    throw new Error('MoMo payment could not be verified. Contact support if money was deducted.');
  }
  if (data.status !== 'SUCCESSFUL') {
    throw new Error('MoMo payment was not completed. Contact support if money was deducted.');
  }
  // MoMo collects whole currency units; the order total may carry pesewas.
  if (Math.abs(Number(data.amount) - Math.round(expectedTotal)) > 1) {
    throw new Error('Payment amount does not match order total. Contact support.');
  }
}

// A successful payment reference may back exactly one order. Reject any
// reference already attached to an existing order (payment replay).
async function assertReferenceUnused(field, reference) {
  const existing = await Order.findOne({ [field]: reference }).select('_id');
  if (existing) {
    throw new Error('This payment has already been used for an order.');
  }
}

const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, promoCode, paystackReference, momoReference } = req.body;

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
  if (paymentMethod === 'momo' && !momoReference) {
    res.status(400);
    throw new Error('MoMo payment reference is required');
  }

  // Reject replayed payment references before touching stock or payment APIs.
  if (paymentMethod === 'Paystack') {
    res.status(400);
    await assertReferenceUnused('paystackReference', String(paystackReference));
  }
  if (paymentMethod === 'momo') {
    res.status(400);
    await assertReferenceUnused('momoReference', String(momoReference));
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

      // Atomic check-and-decrement — prevents overselling under concurrent load.
      // `new: true` returns the post-update doc so we can detect threshold crossings.
      const reserved = await Product.findOneAndUpdate(
        { _id: product._id, active: true, stock: { $gte: qty } },
        { $inc: { stock: -qty, totalSold: qty } },
        { new: true }
      );
      if (!reserved) {
        res.status(400);
        throw new Error(`"${product.name}" is out of stock or has insufficient quantity`);
      }
      decremented.push({ id: product._id, qty });

      // Only fire when this order is what crossed the line — prevents repeat
      // alerts while stock is already low.
      if (reserved.stock <= LOW_STOCK_THRESHOLD && reserved.stock + qty > LOW_STOCK_THRESHOLD) {
        notifyLowStock(reserved);
      }

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

    // Verify payment server-side — prevents order creation without actual payment
    if (paymentMethod === 'Paystack') {
      res.status(400); // pre-set so errorHandler returns 400 if verification throws
      await verifyPaystackRef(paystackReference, serverTotal);
    } else if (paymentMethod === 'momo') {
      res.status(400);
      await verifyMoMoRef(momoReference, serverTotal);
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
      ...(paymentMethod === 'Paystack' && { paystackReference: String(paystackReference), isPaid: true, paidAt: new Date() }),
      ...(paymentMethod === 'momo' && { momoReference: String(momoReference), isPaid: true, paidAt: new Date() }),
    });

    const created = await order.save();

    // Record order on user profile
    await User.findByIdAndUpdate(req.user._id, { $push: { orders: created._id } });

    // Send order confirmation email (non-blocking — don't fail the order if email fails)
    if (req.user.email) {
      const itemRows = validatedItems.map((item) =>
        `<tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:8px 4px">${escapeHtml(item.name)}</td>
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
            <p>Hi ${escapeHtml(req.user.name || 'Customer')},</p>
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
              <strong>Payment:</strong> ${escapeHtml(paymentMethod || 'N/A')}<br>
              <strong>Ship to:</strong> ${escapeHtml(shippingAddress?.address || '')}, ${escapeHtml(shippingAddress?.city || '')}
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
    // Duplicate-key = the unique reference index caught a payment replay race
    if (err.code === 11000) {
      res.status(400);
      throw new Error('This payment has already been used for an order.');
    }
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
  // Guest orders have no `user` — they are retrieved via the guest endpoint only
  if (!order.user || !req.user._id || order.user._id.toString() !== req.user._id.toString()) {
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
    heading: 'Order Shipped',
    body: 'Your order has been handed over to our delivery team and is on its way to you. Please be available to receive it.',
    color: '#8B5CF6',
  },
  Delivered: {
    subject: 'Your order has been delivered',
    heading: 'Order Delivered',
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
        <p>Hi ${escapeHtml(userName || 'Customer')},</p>
        <p>${tpl.body}</p>
        <div style="margin:20px 0;padding:16px;background:#f9f9f9;border-radius:8px;font-size:14px;line-height:1.8">
          <strong>Order ID:</strong> #${orderId}<br>
          <strong>Status:</strong> <span style="color:${tpl.color};font-weight:700">${status}</span><br>
          <strong>Items:</strong> ${order.orderItems?.length || 0}<br>
          <strong>Total:</strong> &#8373;${Number(order.totalPrice || 0).toFixed(2)}
        </div>
        ${(status !== 'Cancelled' && order.user) ? `
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
    // Fall back to guest fields so guests receive status emails too — they
    // were silently skipped before since order.user is null for guest orders.
    sendStatusEmail(order.user?.email || order.guestEmail, order.user?.name || order.guestName, order, 'Cancelled');
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
    sendStatusEmail(order.user?.email || order.guestEmail, order.user?.name || order.guestName, updated, status);
  }

  res.json(updated);
});

const createGuestOrder = asyncHandler(async (req, res) => {
  const { guestName, guestEmail, orderItems, shippingAddress, paymentMethod, promoCode, paystackReference, momoReference } = req.body;

  if (!guestName || !String(guestName).trim()) { res.status(400); throw new Error('Name is required'); }
  if (String(guestName).trim().length > 100) { res.status(400); throw new Error('Name is too long'); }
  if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) { res.status(400); throw new Error('Valid email is required'); }
  if (!orderItems || orderItems.length === 0) { res.status(400); throw new Error('Order items required'); }
  if (orderItems.length > MAX_ORDER_ITEMS) { res.status(400); throw new Error(`Order cannot exceed ${MAX_ORDER_ITEMS} items`); }
  if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) { res.status(400); throw new Error('Invalid payment method'); }
  if (paymentMethod === 'Paystack' && !paystackReference) { res.status(400); throw new Error('Paystack reference is required for online payments'); }
  if (paymentMethod === 'momo' && !momoReference) { res.status(400); throw new Error('MoMo payment reference is required'); }

  // Reject replayed payment references before touching stock or payment APIs.
  if (paymentMethod === 'Paystack') { res.status(400); await assertReferenceUnused('paystackReference', String(paystackReference)); }
  if (paymentMethod === 'momo') { res.status(400); await assertReferenceUnused('momoReference', String(momoReference)); }

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
        { $inc: { stock: -qty, totalSold: qty } },
        { new: true }
      );
      if (!reserved) { res.status(400); throw new Error(`"${product.name}" is out of stock`); }
      decremented.push({ id: product._id, qty });
      if (reserved.stock <= LOW_STOCK_THRESHOLD && reserved.stock + qty > LOW_STOCK_THRESHOLD) {
        notifyLowStock(reserved);
      }
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
      res.status(400);
      await verifyPaystackRef(paystackReference, serverTotal);
    } else if (paymentMethod === 'momo') {
      res.status(400);
      await verifyMoMoRef(momoReference, serverTotal);
    }

    const guestOrderToken = crypto.randomBytes(24).toString('hex');

    const order = await new Order({
      guestName: String(guestName).trim().slice(0, 100),
      guestEmail: String(guestEmail).toLowerCase().trim(),
      guestOrderToken,
      orderItems: validatedItems,
      shippingAddress: sanitizeAddress(shippingAddress),
      paymentMethod,
      subtotalPrice: serverSubtotal,
      discountPrice: serverDiscount,
      promoCode: validPromoCode,
      totalPrice: serverTotal,
      ...(paymentMethod === 'Paystack' && { paystackReference: String(paystackReference), isPaid: true, paidAt: new Date() }),
      ...(paymentMethod === 'momo' && { momoReference: String(momoReference), isPaid: true, paidAt: new Date() }),
    }).save();

    // Confirmation email to guest
    const itemRows = validatedItems.map((item) =>
      `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:8px 4px">${escapeHtml(item.name)}</td>
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
          <p>Hi ${escapeHtml(String(guestName).trim())},</p>
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
            <strong>Payment:</strong> ${escapeHtml(paymentMethod || 'N/A')}<br>
            <strong>Ship to:</strong> ${escapeHtml(shippingAddress?.address || '')}, ${escapeHtml(shippingAddress?.city || '')}
          </div>
          <p style="color:#666;font-size:13px">We will notify you when your order is shipped.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
        </div>
      `,
    }).catch((err) => console.error('[Email] Guest order confirmation failed:', err.message));

    // Expose the token to the immediate response so the frontend can stash it
    // for the confirmation page. It is not persisted in any subsequent read.
    res.status(201).json({ ...order.toObject(), guestOrderToken });
  } catch (err) {
    await rollback();
    if (err.code === 11000) {
      res.status(400);
      throw new Error('This payment has already been used for an order.');
    }
    throw err;
  }
});

const getGuestOrder = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) { res.status(400); throw new Error('Access token is required'); }
  // Need +guestOrderToken because the field is select:false by default.
  const order = await Order.findById(req.params.id).select('+guestOrderToken');
  if (!order || !order.guestEmail) { res.status(404); throw new Error('Order not found'); }
  // Constant-time compare avoids leaking token bytes via response timing.
  const provided = Buffer.from(String(token), 'utf8');
  const expected = Buffer.from(String(order.guestOrderToken || ''), 'utf8');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    res.status(403);
    throw new Error('Access denied');
  }
  // Strip the token from the response so it never appears in logs / proxies.
  const { guestOrderToken: _t, ...safe } = order.toObject();
  res.json(safe);
});

// Calls Paystack's /refund endpoint. Returns the refund id on success or
// throws a clear, customer-safe error message on failure — Paystack's own
// error strings are sometimes too technical to forward verbatim.
async function refundPaystackTransaction(reference) {
  const response = await fetch('https://api.paystack.co/refund', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transaction: String(reference) }),
  });
  const data = await response.json();
  if (!response.ok || !data.status) {
    const err = new Error(data.message || 'Paystack refused the refund. Try again or refund manually from the Paystack dashboard.');
    err.statusCode = 502;
    throw err;
  }
  return data.data?.id || data.data?.transaction?.id || null;
}

function sendRefundEmail(order) {
  const recipient = order.user?.email || order.guestEmail;
  const name = order.user?.name || order.guestName || 'Customer';
  if (!recipient) return;
  const orderId = order._id.toString().slice(-8).toUpperCase();
  sendResendEmail({
    to: recipient,
    subject: `Refund processed — Order #${orderId}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <h2 style="color:#10B981;margin-bottom:4px">Refund processed</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Your order <strong>#${orderId}</strong> has been refunded for <strong>&#8373;${Number(order.totalPrice || 0).toFixed(2)}</strong>.</p>
        ${order.refundReason ? `<p style="color:#555;font-size:14px"><strong>Reason:</strong> ${escapeHtml(order.refundReason)}</p>` : ''}
        <p style="color:#666;font-size:13px">Refunds to your card typically appear in your statement within 5–10 business days, depending on your bank. If you do not see it after 10 business days, reply to this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
      </div>
    `,
  }).catch((err) => console.error('[Refund] Customer email failed:', err.message));
}

const refundOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.paymentMethod !== 'Paystack') {
    res.status(400);
    throw new Error('Only Paystack orders can be refunded automatically. Refund this one manually from your MoMo or bank dashboard, then record it.');
  }
  if (!order.isPaid || !order.paystackReference) {
    res.status(400);
    throw new Error('This order was never paid via Paystack, so there is nothing to refund.');
  }
  if (order.isRefunded) {
    res.status(400);
    throw new Error('This order has already been refunded.');
  }

  const reason = String(req.body?.reason || '').trim().slice(0, 500);

  // Fire the Paystack refund first. If it fails, do not touch the order or
  // stock — we never want a "refunded" record without the money actually moved.
  const paystackRefundId = await refundPaystackTransaction(order.paystackReference);

  // Restore stock only if the order has not already gone out the door.
  if (!order.isDelivered) {
    await Promise.allSettled(order.orderItems.map((item) =>
      Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, totalSold: -item.quantity } })
    ));
  }

  order.isRefunded = true;
  order.refundedAt = new Date();
  order.refundReason = reason || undefined;
  order.refundedBy = req.user?.email || 'admin';
  order.paystackRefundId = paystackRefundId || undefined;
  order.status = 'Cancelled'; // keeps the order out of "active" lists
  await order.save();

  sendRefundEmail(order);

  res.json(order);
});

module.exports = { createOrder, createGuestOrder, getGuestOrder, getOrderById, getMyOrders, getOrders, updateOrderStatus, refundOrder };
