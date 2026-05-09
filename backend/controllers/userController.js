const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Product = require('../models/Product');

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').populate('wishlist');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user);
});

const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user.wishlist);
});

const addToWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const productId = req.params.id;
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (!productId) {
    res.status(400);
    throw new Error('Product ID is required');
  }
  if (user.wishlist.some((item) => item.toString() === productId)) {
    res.status(400);
    throw new Error('Product already in wishlist');
  }
  user.wishlist.push(productId);
  await user.save();
  await user.populate('wishlist');
  res.status(201).json(user.wishlist);
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const productId = req.params.id;
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.wishlist = user.wishlist.filter((item) => item.toString() !== productId);
  await user.save();
  await user.populate('wishlist');
  res.json(user.wishlist);
});

module.exports = {
  getUsers,
  getUserProfile,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
