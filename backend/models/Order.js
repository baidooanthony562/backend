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
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    orderItems: [orderItemSchema],
    shippingAddress: {
      address: { type: String },
      city: { type: String },
      phone: { type: String },
    },
    paymentMethod: { type: String, default: 'card' },
    paymentResult: { id: String, status: String, email_address: String },
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

module.exports = mongoose.model('Order', orderSchema);
