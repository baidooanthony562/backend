const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const generateToken = require('../utils/generateToken');

function safeEqual(a, b) {
  const bufa = Buffer.from(String(a));
  const bufb = Buffer.from(String(b));
  if (bufa.length !== bufb.length) {
    // Still run timingSafeEqual on equal-length buffers to avoid timing leak
    crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1));
    return false;
  }
  return crypto.timingSafeEqual(bufa, bufb);
}

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const adminEmail = process.env.ADMIN_EMAIL || '';
  const adminPassword = process.env.ADMIN_PASSWORD || '';

  if (safeEqual(email, adminEmail) && safeEqual(password, adminPassword)) {
    return res.json({
      token: generateToken('admin'),
      email,
      name: 'Cindy Nat Admin',
      isAdmin: true,
    });
  }

  // Also allow database users with isAdmin flag
  const user = await User.findOne({ email });
  if (user && user.isAdmin && (await bcrypt.compare(password, user.password))) {
    return res.json({
      token: generateToken(user._id),
      email: user.email,
      name: user.name,
      isAdmin: true,
    });
  }

  res.status(401);
  throw new Error('Invalid admin credentials');
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();
  const revenue = await Order.aggregate([
    { $group: { _id: null, revenue: { $sum: '$totalPrice' } } },
  ]);
  const lowStock = await Product.find({ stock: { $lte: 5 } }).limit(10);

  res.json({
    totalUsers,
    totalProducts,
    totalOrders,
    revenue: revenue[0]?.revenue || 0,
    lowStock,
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 }).limit(500);
  res.json(users);
});

module.exports = { adminLogin, getDashboardStats, getUsers };
