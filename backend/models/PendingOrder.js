const mongoose = require('mongoose');

// An order "intent" saved server-side at Paystack initialization, keyed by the
// payment reference. It lets either the browser return OR the Paystack webhook
// finalize the real order from the same source of truth — so a paid order is
// never lost just because the customer's browser didn't make it back.
//
// Only the minimum needed to rebuild the order is stored; buildOrder() re-reads
// products and re-prices everything server-side, so stale prices here can't be
// exploited. The record is deleted once the order is created, and a TTL sweeps
// away intents for payments that were abandoned.
const pendingOrderItemSchema = mongoose.Schema(
  {
    product: { type: String, required: true },
    quantity: { type: Number, required: true },
    name: { type: String },
    image: { type: String },
  },
  { _id: false }
);

const pendingOrderSchema = mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    isGuest: { type: Boolean, default: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestName: { type: String },
    guestEmail: { type: String },
    orderItems: [pendingOrderItemSchema],
    shippingAddress: {
      address: { type: String },
      city: { type: String },
      phone: { type: String },
    },
    promoCode: { type: String },
    expectedTotal: { type: Number },
    // Auto-expire abandoned intents after 24h (Paystack also retries webhooks
    // well within this window). Deleted explicitly once the order is created.
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
  }
);

module.exports = mongoose.model('PendingOrder', pendingOrderSchema);
