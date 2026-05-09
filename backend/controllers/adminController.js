const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const generateToken = require('../utils/generateToken');

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (email === adminEmail && password === adminPassword) {
    return res.json({
      token: generateToken('admin'),
      email,
      name: 'Cindy Nut Admin',
      isAdmin: true,
    });
  }
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
  const users = await User.find({}).select('-password');
  res.json(users);
});

module.exports = { adminLogin, getDashboardStats, getUsers };
