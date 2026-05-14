const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, address, city, country } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword, phone, address, city, country });
  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      city: user.city,
      country: user.country,
      isAdmin: user.isAdmin,
      wishlist: user.wishlist,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Always return the same message — never reveal whether email exists
  const genericResponse = { message: 'If that email is registered, a reset link has been sent.' };

  const user = await User.findOne({ email });
  if (!user) return res.json(genericResponse);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.resetToken = hashedToken;
  user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'https://backend-alpha-seven-54.vercel.app'}/reset-password/${rawToken}`;

  await axios.post('https://api.brevo.com/v3/smtp/email', {
    sender: { name: 'Cindy Nat Enterprise', email: 'noreply@cindynat.com' },
    to: [{ email: user.email, name: user.name }],
    subject: 'Reset your Cindy Nat password',
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8f8f8;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#D4AF37;border-radius:12px;font-size:22px;font-weight:900;color:#000">CN</div>
          <h1 style="margin:12px 0 0;font-size:22px;color:#131921">Cindy Nat Enterprise</h1>
        </div>
        <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e2e8f0">
          <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a">Password reset request</h2>
          <p style="margin:0 0 20px;font-size:14px;color:#475569">Hi ${user.name},</p>
          <p style="margin:0 0 20px;font-size:14px;color:#475569">We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${resetUrl}" style="display:inline-block;background:#D4AF37;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:100px;text-decoration:none">Reset my password</a>
          </div>
          <p style="margin:0;font-size:12px;color:#94a3b8">If you didn't request this, you can safely ignore this email — your password will not change.</p>
        </div>
        <p style="text-align:center;margin-top:20px;font-size:12px;color:#94a3b8">Cindy Nat Enterprise · Kumasi, Ghana</p>
      </div>
    `,
  }, {
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
  });

  res.json(genericResponse);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6) {
    res.status(400);
    throw new Error('Token and a password of at least 6 characters are required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetToken: hashedToken,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Reset link is invalid or has expired');
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  res.json({ message: 'Password reset successfully. You can now sign in.' });
});

module.exports = { registerUser, authUser, getUserProfile, forgotPassword, resetPassword };
