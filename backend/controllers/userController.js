const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, phone, address, city, country } = req.body;

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (trimmed.length < 2) {
      res.status(400);
      throw new Error('Name must be at least 2 characters');
    }
    user.name = trimmed.slice(0, 100);
  }
  if (phone !== undefined) user.phone = String(phone).trim().slice(0, 20);
  if (address !== undefined) user.address = String(address).trim().slice(0, 200);
  if (city !== undefined) user.city = String(city).trim().slice(0, 100);
  if (country !== undefined) user.country = String(country).trim().slice(0, 100);

  const updated = await user.save();

  // Reflect new name in localStorage token payload
  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    address: updated.address,
    city: updated.city,
    country: updated.country,
    isAdmin: updated.isAdmin,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Current password and new password are required');
  }
  if (newPassword.length < 8) {
    res.status(400);
    throw new Error('New password must be at least 8 characters');
  }
  if (currentPassword === newPassword) {
    res.status(400);
    throw new Error('New password must be different from your current password');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: 'Password updated successfully' });
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
  updateProfile,
  changePassword,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
