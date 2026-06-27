const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const PromoCode = require('../models/PromoCode');
const PendingOrder = require('../models/PendingOrder');
const User = require('../models/User');
const { sendResendEmail, escapeHtml } = require('../utils/email');
const { getMoMoTransaction } = require('./paymentController');

const { LOW_STOCK_THRESHOLD } = require('../config/constants');

const VALID_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const VALID_PAYMENT_METHODS = ['cash-on-delivery', 'bank-transfer', 'momo', 'Paystack'];
const MAX_ORDER_ITEMS = 50;

// An Error carrying an HTTP status, so order logic can live outside an Express
// handler (the webhook/finalizer path) and still produce correct responses.
function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

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
    throw httpError(400, 'Paystack payment could not be verified. Contact support if money was deducted.');
  }
  // Paystack amounts are in pesewas (GHS × 100); allow 1 pesewa tolerance for rounding
  const paidPesewas = Number(data.data.amount);
  const expectedPesewas = Math.round(expectedTotal * 100);
  if (Math.abs(paidPesewas - expectedPesewas) > 1) {
    throw httpError(400, 'Payment amount does not match order total. Contact support.');
  }
}

// Verify a MoMo payment server-side before trusting a 'momo' order.
async function verifyMoMoRef(reference, expectedTotal) {
  let data;
  try {
    data = await getMoMoTransaction(reference);
  } catch {
    throw httpError(400, 'MoMo payment could not be verified. Contact support if money was deducted.');
  }
  if (data.status !== 'SUCCESSFUL') {
    throw httpError(400, 'MoMo payment was not completed. Contact support if money was deducted.');
  }
  // MoMo collects whole currency units; the order total may carry pesewas.
  if (Math.abs(Number(data.amount) - Math.round(expectedTotal)) > 1) {
    throw httpError(400, 'Payment amount does not match order total. Contact support.');
  }
}

// A successful payment reference may back exactly one order. Reject any
// reference already attached to an existing order (payment replay).
async function assertReferenceUnused(field, reference) {
  const existing = await Order.findOne({ [field]: reference }).select('_id');
  if (existing) {
    throw httpError(400, 'This payment has already been used for an order.');
  }
}

// ── Shared order-creation core ────────────────────────────────────────────
// HTTP-agnostic: validates items, atomically reserves stock, prices everything
// server-side, re-verifies payment, saves the order and emails confirmation.
// Throws httpError(...) on failure (after rolling stock back). `customer` is
// either { kind: 'user', user } or { kind: 'guest', name, email }.
// Returns { order, guestOrderToken } (token only for guest orders).
async function buildOrder({ orderItems, shippingAddress, paymentMethod, promoCode, paystackReference, momoReference, customer }) {
  if (!orderItems || orderItems.length === 0) throw httpError(400, 'Order items required');
  if (orderItems.length > MAX_ORDER_ITEMS) throw httpError(400, `Order cannot exceed ${MAX_ORDER_ITEMS} items`);
  if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) throw httpError(400, 'Invalid payment method');
  if (paymentMethod === 'Paystack' && !paystackReference) throw httpError(400, 'Paystack reference is required for online payments');
  if (paymentMethod === 'momo' && !momoReference) throw httpError(400, 'MoMo payment reference is required');

  // Reject replayed payment references before touching stock or payment APIs.
  if (paymentMethod === 'Paystack') await assertReferenceUnused('paystackReference', String(paystackReference));
  if (paymentMethod === 'momo') await assertReferenceUnused('momoReference', String(momoReference));

  const validatedItems = [];
  const decremented = []; // items whose stock we reduced, for rollback on failure

  const rollback = async () => {
    if (decremented.length > 0) {
      await Promise.allSettled(
        decremented.map((d) => Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty, totalSold: -d.qty } }))
      );
    }
  };

  try {
    for (const item of orderItems) {
      if (!item.product || !/^[a-f\d]{24}$/i.test(String(item.product))) throw httpError(400, 'Invalid product ID in order');
      const qty = Math.floor(Number(item.quantity));
      if (!qty || qty < 1) throw httpError(400, 'Quantity must be at least 1');

      const product = await Product.findById(item.product);
      if (!product || !product.active) throw httpError(400, 'One or more products are no longer available');

      // Atomic check-and-decrement — prevents overselling under concurrent load.
      const reserved = await Product.findOneAndUpdate(
        { _id: product._id, active: true, stock: { $gte: qty } },
        { $inc: { stock: -qty, totalSold: qty } },
        { new: true }
      );
      if (!reserved) throw httpError(400, `"${product.name}" is out of stock or has insufficient quantity`);
      decremented.push({ id: product._id, qty });

      // Fire the low-stock alert only on the order that crossed the threshold.
      if (reserved.stock <= LOW_STOCK_THRESHOLD && reserved.stock + qty > LOW_STOCK_THRESHOLD) {
        notifyLowStock(reserved);
      }

      const isWholesale = product.wholesalePrice > 0 && product.wholesaleMinQty > 0 && qty >= product.wholesaleMinQty;
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

    const serverSubtotal =
      Math.round(validatedItems.reduce((sum, i) => sum + i.price * i.quantity * 100, 0)) / 100;

    // Re-validate promo code server-side
    let serverDiscount = 0;
    let validPromoCode = '';
    if (promoCode) {
      const promo = await PromoCode.findOne({ code: String(promoCode).toUpperCase().trim(), active: true });
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

    // Verify payment server-side — never create a paid order without real payment.
    if (paymentMethod === 'Paystack') await verifyPaystackRef(paystackReference, serverTotal);
    else if (paymentMethod === 'momo') await verifyMoMoRef(momoReference, serverTotal);

    const isGuest = customer.kind === 'guest';
    const guestOrderToken = isGuest ? crypto.randomBytes(24).toString('hex') : undefined;

    const order = await new Order({
      ...(isGuest
        ? {
            guestName: String(customer.name).trim().slice(0, 100),
            guestEmail: String(customer.email).toLowerCase().trim(),
            guestOrderToken,
          }
        : { user: customer.user._id }),
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

    if (!isGuest) {
      await User.findByIdAndUpdate(customer.user._id, { $push: { orders: order._id } });
    }

    const recipientEmail = isGuest ? order.guestEmail : customer.user.email;
    const recipientName = isGuest ? customer.name : customer.user.name;
    if (recipientEmail) {
      sendOrderConfirmationEmail({
        order,
        items: validatedItems,
        recipientEmail,
        recipientName,
        discount: serverDiscount,
        total: serverTotal,
        paymentMethod,
        shippingAddress,
        includeViewLink: !isGuest,
      });
    }

    return { order, guestOrderToken };
  } catch (err) {
    await rollback();
    // Duplicate-key = the unique reference index caught a payment replay race.
    if (err.code === 11000) throw httpError(400, 'This payment has already been used for an order.');
    throw err;
  }
}

// Order confirmation email, shared by user and guest checkouts. Guests don't
// get a "View Order" link because that route requires a signed-in session.
function sendOrderConfirmationEmail({ order, items, recipientEmail, recipientName, discount, total, paymentMethod, shippingAddress, includeViewLink }) {
  const orderId = order._id.toString().slice(-8).toUpperCase();
  const itemRows = items.map((item) =>
    `<tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:8px 4px">${escapeHtml(item.name)}</td>
      <td style="text-align:right;padding:8px 4px">${item.quantity}</td>
      <td style="text-align:right;padding:8px 4px">&#8373;${(item.quantity * item.price).toFixed(2)}</td>
    </tr>`
  ).join('');
  const viewLink = includeViewLink
    ? `<a href="${process.env.FRONTEND_URL || 'https://backend-alpha-seven-54.vercel.app'}/orders/${order._id}"
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:#D4AF37;color:#000;font-weight:700;border-radius:999px;text-decoration:none">
          View Order
        </a>`
    : '';

  sendResendEmail({
    to: recipientEmail,
    subject: `Order Confirmed — #${orderId}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <h2 style="color:#131921">Order Confirmed!</h2>
        <p>Hi ${escapeHtml(recipientName || 'Customer')},</p>
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
        ${discount > 0 ? `<p style="text-align:right;color:#666;margin:4px 0">Promo discount: &minus;&#8373;${discount.toFixed(2)}</p>` : ''}
        <p style="text-align:right;font-size:18px;font-weight:bold;margin:8px 0">Total: &#8373;${total.toFixed(2)}</p>
        <div style="margin:24px 0;padding:16px;background:#f9f9f9;border-radius:8px;font-size:14px;line-height:1.6">
          <strong>Order ID:</strong> #${orderId}<br>
          <strong>Payment:</strong> ${escapeHtml(paymentMethod || 'N/A')}<br>
          <strong>Ship to:</strong> ${escapeHtml(shippingAddress?.address || '')}, ${escapeHtml(shippingAddress?.city || '')}
        </div>
        <p style="color:#666;font-size:13px">We will notify you when your order is shipped.</p>
        ${viewLink}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
      </div>
    `,
  }).catch((err) => console.error('[Email] Order confirmation failed:', err.message));
}

const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, promoCode, paystackReference, momoReference } = req.body;
  const { order } = await buildOrder({
    orderItems, shippingAddress, paymentMethod, promoCode, paystackReference, momoReference,
    customer: { kind: 'user', user: req.user },
  });
  res.status(201).json(order);
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
  // Hide cancelled (deleted) orders but keep refunded ones visible so the
  // customer can see the refund. Legacy refunds may carry status 'Cancelled'
  // with isRefunded set, so match on the flag as well.
  const orders = await Order.find({
    user: req.user._id,
    $or: [{ status: { $ne: 'Cancelled' } }, { isRefunded: true }],
  })
    .populate('orderItems.product', 'name price images')
    .sort({ createdAt: -1 });
  res.json(orders);
});

const getOrders = asyncHandler(async (req, res) => {
  // Same as getMyOrders: keep refunded orders in the admin list (with their
  // badge) instead of dropping every 'Cancelled' record.
  const orders = await Order.find({ $or: [{ status: { $ne: 'Cancelled' } }, { isRefunded: true }] })
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

  // Guest-specific validation; the shared core handles items/stock/payment.
  if (!guestName || !String(guestName).trim()) throw httpError(400, 'Name is required');
  if (String(guestName).trim().length > 100) throw httpError(400, 'Name is too long');
  if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) throw httpError(400, 'Valid email is required');

  const { order, guestOrderToken } = await buildOrder({
    orderItems, shippingAddress, paymentMethod, promoCode, paystackReference, momoReference,
    customer: { kind: 'guest', name: guestName, email: guestEmail },
  });

  // Expose the token once so the frontend can stash it for the confirmation
  // page; it is never returned by subsequent reads.
  res.status(201).json({ ...order.toObject(), guestOrderToken });
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
  // Distinct from 'Cancelled' (which is deleted): a refunded order must stay
  // on record — and stay visible — so admin and customer can see/track it.
  order.status = 'Refunded';
  await order.save();

  sendRefundEmail(order);

  res.json(order);
});

// Turn a paid Paystack reference into a real order, from the intent saved at
// init time. Idempotent and safe to call from two places at once (the browser
// return AND the webhook): the unique reference index means only one order is
// ever created; the loser returns the winner's order. Used by both the webhook
// and the browser-facing finalize endpoint.
async function finalizeOrderFromReference(reference) {
  const ref = String(reference);

  // Already finalized → return it (and tidy up any leftover intent).
  const existing = await Order.findOne({ paystackReference: ref });
  if (existing) {
    await PendingOrder.deleteOne({ reference: ref }).catch(() => {});
    return { order: existing };
  }

  const pending = await PendingOrder.findOne({ reference: ref });
  if (!pending) throw httpError(404, 'No pending order found for this payment reference.');

  let customer;
  if (pending.isGuest) {
    customer = { kind: 'guest', name: pending.guestName, email: pending.guestEmail };
  } else {
    const user = await User.findById(pending.user);
    if (!user) throw httpError(400, 'Account no longer exists');
    customer = { kind: 'user', user };
  }

  try {
    const result = await buildOrder({
      orderItems: pending.orderItems.map((i) => ({ product: i.product, quantity: i.quantity, name: i.name, image: i.image })),
      shippingAddress: pending.shippingAddress,
      paymentMethod: 'Paystack',
      promoCode: pending.promoCode,
      paystackReference: ref,
      customer,
    });
    await PendingOrder.deleteOne({ _id: pending._id }).catch(() => {});
    return result; // { order, guestOrderToken }
  } catch (err) {
    // The other finalize path won the race and created it first.
    if (/already been used/i.test(err.message)) {
      const o = await Order.findOne({ paystackReference: ref });
      if (o) {
        await PendingOrder.deleteOne({ _id: pending._id }).catch(() => {});
        return { order: o };
      }
    }
    throw err;
  }
}

// Browser-facing finalize: called from the payment-return page. The webhook is
// the server-side safety net for the same operation.
const finalizeOrderByReference = asyncHandler(async (req, res) => {
  const { reference } = req.body;
  if (!reference) throw httpError(400, 'Payment reference is required');
  const { order, guestOrderToken } = await finalizeOrderFromReference(reference);
  res.status(200).json(guestOrderToken ? { ...order.toObject(), guestOrderToken } : order);
});

module.exports = { createOrder, createGuestOrder, getGuestOrder, getOrderById, getMyOrders, getOrders, updateOrderStatus, refundOrder, finalizeOrderFromReference, finalizeOrderByReference };
