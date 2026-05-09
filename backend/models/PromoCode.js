const mongoose = require('mongoose');

const promoCodeSchema = mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    description: { type: String },
    discountType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    discountValue: { type: Number, required: true },
    minAmount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PromoCode', promoCodeSchema);
