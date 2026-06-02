const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AdminSession = require('../models/AdminSession');
const generateToken = require('../utils/generateToken');
const { setAuthCookie, clearAuthCookie } = require('../utils/generateToken');
const { sendResendEmail, escapeHtml } = require('../utils/email');

function sendLoginAlert(ip) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return;
  const time = new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra', dateStyle: 'full', timeStyle: 'short' });
  sendResendEmail({
    to,
    subject: 'Admin login — Cindy Nat',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#131921;margin-bottom:4px">Admin panel login</h2>
        <p style="color:#555;margin-top:0">Someone just signed in to your Cindy Nat admin panel.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">
          <tr style="border-bottom:1px solid #eee">
            <td style="padding:10px 0;color:#888;width:120px">Time</td>
            <td style="padding:10px 0;font-weight:600;color:#131921">${time}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">IP address</td>
            <td style="padding:10px 0;font-weight:600;color:#131921">${escapeHtml(ip)}</td>
          </tr>
        </table>
        <p style="color:#c00;font-size:13px">If this wasn't you, change your admin password immediately.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
      </div>
    `,
  }).catch((err) => console.error('[AdminAlert] Login email failed:', err.message));
}

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
      sendLoginAlert(ip);
      setAuthCookie(res, generateToken('admin'));
      return res.json({
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
    sendLoginAlert(ip);
    setAuthCookie(res, generateToken(user._id));
    return res.json({
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
    Order.countDocuments({ status: { $in: ['Pending', 'Processing', 'Shipped'] } }),
    Order.aggregate([
      { $match: { status: 'Delivered' } },
      { $group: { _id: null, revenue: { $sum: '$totalPrice' } } },
    ]),
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

const verifyUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.isVerified = true;
  user.verifyToken = undefined;
  user.verifyTokenExpiry = undefined;
  await user.save();
  res.json({ message: `${user.name} (${user.email}) has been manually verified.` });
});

const adminLogout = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    await AdminSession.findByIdAndUpdate(sessionId, { logoutAt: new Date() });
  }
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
});

const getAdminSessions = asyncHandler(async (req, res) => {
  const sessions = await AdminSession.find({}).sort({ loginAt: -1 }).limit(20);
  res.json(sessions);
});

// NOTE: There is intentionally no endpoint to mutate or delete an admin
// session record. The log is an append-only audit trail — if a malicious
// actor (or anyone with stolen admin creds) could mark sessions as ended
// or remove them, they could cover their tracks after unauthorized access.
// Sessions that never got a clean logout simply show as "Stale" in the UI
// based on their age; the underlying record stays intact.

const getDailySales = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const data = await Order.aggregate([
    { $match: { status: 'Delivered', createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        orders: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  // Fill in zero-value days so the chart has a continuous x-axis
  const map = {};
  for (const row of data) {
    const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}-${String(row._id.day).padStart(2, '0')}`;
    map[key] = { orders: row.orders, revenue: row.revenue };
  }

  const result = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, orders: map[key]?.orders || 0, revenue: map[key]?.revenue || 0 });
  }

  res.json(result);
});

module.exports = { adminLogin, adminLogout, getAdminSessions, getDashboardStats, getUsers, verifyUser, getDailySales };
