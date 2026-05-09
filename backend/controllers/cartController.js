const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart');

const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  res.json(cart || { items: [] });
});

const updateCart = asyncHandler(async (req, res) => {
  const { items } = req.body;
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items });
  } else {
    cart.items = items;
  }
  const updated = await cart.save();
  res.json(updated);
});

module.exports = { getCart, updateCart };
