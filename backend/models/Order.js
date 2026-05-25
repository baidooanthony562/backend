const mongoose = require('mongoose');

const orderItemSchema = mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    image: { type: String },
  },
  { _id: false }
);

const orderSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User' },
    guestName: { type: String },
    guestEmail: { type: String },
    // Random per-order secret used to authorise guest reads of /orders/guest/:id.
    // Replaces the old "email as access control" model, which let anyone with
    // a guest's email + order ID view the full order PII.
    guestOrderToken: { type: String, select: false },
    orderItems: [orderItemSchema],
    shippingAddress: {
      address: { type: String },
      city: { type: String },
      phone: { type: String },
    },
    paymentMethod: { type: String, default: 'card' },
    paymentResult: { id: String, status: String, email_address: String },
    paystackReference: { type: String },
    momoReference: { type: String },
    taxPrice: { type: Number, default: 0 },
    shippingPrice: { type: Number, default: 0 },
    subtotalPrice: { type: Number, default: 0 },
    discountPrice: { type: Number, default: 0 },
    promoCode: { type: String },
    totalPrice: { type: Number, required: true, default: 0 },
    status: { type: String, default: 'Pending' },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

// A successful payment reference may back exactly one order — blocks payment replay.
orderSchema.index({ paystackReference: 1 }, { unique: true, sparse: true });
orderSchema.index({ momoReference: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Order', orderSchema);
