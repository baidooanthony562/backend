const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AdminSession = require('../models/AdminSession');
const generateToken = require('../utils/generateToken');

// Constant-time string comparison — always runs both sides, no short-circuit
function safeEqual(a, b) {
  const bufa = Buffer.from(String(a));
  const bufb = Buffer.from(String(b));
  // Pad shorter buffer so length doesn't leak via early exit
  const len = Math.max(bufa.length, bufb.length);
  const pa = Buffer.concat([bufa, Buffer.alloc(len - bufa.length)]);
  const pb = Buffer.concat([bufb, Buffer.alloc(len - bufb.length)]);
  // timingSafeEqual requires same-length buffers
  const equal = crypto.timingSafeEqual(pa, pb);
  // Return true only if lengths also match (a padded buffer could false-positive)
  return equal && bufa.length === bufb.length;
}

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

  // Only attempt env-var login if both are configured — prevents empty-string bypass
  if (adminEmail && adminPassword) {
    const emailMatch = safeEqual(email, adminEmail);
    const passwordMatch = safeEqual(password, adminPassword);
    if (emailMatch && passwordMatch) {
      const session = await AdminSession.create({ email, ip });
      return res.json({
        token: generateToken('admin'),
        email,
        name: 'Cindy Nat Admin',
        isAdmin: true,
        sessionId: session._id,
      });
    }
  }

  // Also allow database users with isAdmin flag
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (user && user.isAdmin && (await bcrypt.compare(password, user.password))) {
    const session = await AdminSession.create({ email: user.email, ip });
    return res.json({
      token: generateToken(user._id),
      email: user.email,
      name: user.name,
      isAdmin: true,
      sessionId: session._id,
    });
  }

  res.status(401);
  throw new Error('Invalid admin credentials');
});

const getDashboardStats = asyncHandler(async (req, res) => {
  // Run all queries in parallel — no reason to wait for each one sequentially
  const [totalUsers, totalProducts, totalOrders, revenue, lowStock] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: null, revenue: { $sum: '$totalPrice' } } }]),
    Product.find({ stock: { $lte: 5 } }).select('name stock price').limit(10),
  ]);

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

const adminLogout = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    await AdminSession.findByIdAndUpdate(sessionId, { logoutAt: new Date() });
  }
  res.json({ message: 'Logged out' });
});

const getAdminSessions = asyncHandler(async (req, res) => {
  const sessions = await AdminSession.find({}).sort({ loginAt: -1 }).limit(20);
  res.json(sessions);
});

module.exports = { adminLogin, adminLogout, getAdminSessions, getDashboardStats, getUsers };
