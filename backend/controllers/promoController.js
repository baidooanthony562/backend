const asyncHandler = require('express-async-handler');
const PromoCode = require('../models/PromoCode');

const createPromo = asyncHandler(async (req, res) => {
  const { code, description, discountType, discountValue, minAmount, expiresAt } = req.body;
  const promo = new PromoCode({
    code: code.toUpperCase(),
    description,
    discountType: discountType || 'percent',
    discountValue,
    minAmount: minAmount || 0,
    expiresAt,
  });
  const created = await promo.save();
  res.status(201).json(created);
});

const getPromos = asyncHandler(async (req, res) => {
  const promos = await PromoCode.find({ active: true });
  res.json(promos);
});

const validatePromo = asyncHandler(async (req, res) => {
  const { code, amount } = req.body;
  if (!code) {
    res.status(400);
    throw new Error('Promo code is required');
  }
  const promo = await PromoCode.findOne({ code: code.toUpperCase(), active: true });
  if (!promo) {
    res.status(404);
    throw new Error('Promo code not found');
  }
  if (promo.expiresAt && promo.expiresAt < Date.now()) {
    res.status(400);
    throw new Error('Promo code has expired');
  }
  if (promo.minAmount && Number(amount) < promo.minAmount) {
    res.status(400);
    throw new Error(`Minimum order value is $${promo.minAmount.toFixed(2)} for this code`);
  }
  const baseAmount = Number(amount) || 0;
  const discountAmount = promo.discountType === 'fixed'
    ? promo.discountValue
    : Number((baseAmount * (promo.discountValue / 100)).toFixed(2));
  res.json({
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount,
    totalAfterDiscount: Math.max(0, baseAmount - discountAmount),
  });
});

module.exports = {
  createPromo,
  getPromos,
  validatePromo,
};
