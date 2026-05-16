const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendResendEmail } = require('../utils/email');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FRONTEND = process.env.FRONTEND_URL || 'https://backend-alpha-seven-54.vercel.app';

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, address, city, country } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }
  if (String(name).trim().length < 2) {
    res.status(400);
    throw new Error('Name must be at least 2 characters');
  }
  if (!EMAIL_RE.test(String(email).trim())) {
    res.status(400);
    throw new Error('Invalid email address');
  }
  if (String(password).length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const verifyToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashedPassword,
    phone,
    address,
    city,
    country,
    isVerified: false,
    verifyToken,
    verifyTokenExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid user data');
  }

  const verifyUrl = `${FRONTEND}/verify-email/${rawToken}`;

  sendResendEmail({
    to: user.email,
    subject: 'Verify your Cindy Nat account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#131921">Welcome to Cindy Nat!</h2>
        <p>Hi ${user.name},</p>
        <p>Thanks for creating an account. Please verify your email address to get started. This link expires in <strong>24 hours</strong>.</p>
        <a href="${verifyUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#D4AF37;color:#000;font-weight:700;border-radius:999px;text-decoration:none">
          Verify My Email
        </a>
        <p style="color:#666;font-size:13px">If you didn't create this account, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
      </div>
    `,
  }).catch((err) => console.error('[Email] Verification email failed:', err.message));

  res.status(201).json({ message: 'Account created. Please check your email to verify your account.' });
});

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Only block login for users who explicitly have isVerified: false (new accounts)
  // Existing accounts without the field (isVerified: undefined) are allowed through
  if (user.isVerified === false) {
    res.status(403);
    throw new Error('Please verify your email before logging in. Check your inbox or request a new verification link.');
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    token: generateToken(user._id),
    isAdmin: user.isAdmin,
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(String(req.params.token)).digest('hex');

  const user = await User.findOne({
    verifyToken: hashedToken,
    verifyTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Verification link is invalid or has expired.');
  }

  user.isVerified = true;
  user.verifyToken = undefined;
  user.verifyTokenExpiry = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully. You can now sign in.' });
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const genericResponse = { message: 'If that email is registered and unverified, a new link has been sent.' };

  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.json(genericResponse);
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || user.isVerified) return res.json(genericResponse);

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.verifyToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.verifyTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  const verifyUrl = `${FRONTEND}/verify-email/${rawToken}`;

  sendResendEmail({
    to: user.email,
    subject: 'Verify your Cindy Nat account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#131921">Verify Your Email</h2>
        <p>Hi ${user.name},</p>
        <p>Here is your new verification link. It expires in <strong>24 hours</strong>.</p>
        <a href="${verifyUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#D4AF37;color:#000;font-weight:700;border-radius:999px;text-decoration:none">
          Verify My Email
        </a>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
      </div>
    `,
  }).catch((err) => console.error('[Email] Resend verification failed:', err.message));

  res.json(genericResponse);
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

  const genericResponse = { message: 'If that email is registered, a 6-digit code has been sent.' };

  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.json(genericResponse);
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.json(genericResponse);

  // 6-digit OTP — no link, no FRONTEND_URL dependency
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

  user.resetToken = hashedCode;
  user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save();

  try {
    await sendResendEmail({
      to: user.email,
      subject: 'Your Cindy Nat password reset code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#131921">Password Reset Code</h2>
          <p>Hi ${user.name},</p>
          <p>Use the code below to reset your Cindy Nat password. It expires in <strong>15 minutes</strong>.</p>
          <div style="margin:28px 0;text-align:center">
            <span style="display:inline-block;letter-spacing:10px;font-size:40px;font-weight:900;color:#131921;background:#f5f5f5;padding:16px 24px;border-radius:12px;border:2px solid #D4AF37">
              ${code}
            </span>
          </div>
          <p style="color:#444;font-size:14px">Enter this code on the reset page. Do not share it with anyone.</p>
          <p style="color:#666;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error('[Resend] Error sending reset code:', emailErr.message);
  }

  res.json(genericResponse);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;

  if (!email || !code || !password) {
    res.status(400);
    throw new Error('Email, code and new password are required');
  }
  if (String(password).length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const hashedCode = crypto.createHash('sha256').update(String(code).trim()).digest('hex');

  const user = await User.findOne({
    email: normalizedEmail,
    resetToken: hashedCode,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Code is invalid or has expired');
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  res.json({ message: 'Password reset successfully. You can now sign in.' });
});

module.exports = { registerUser, authUser, verifyEmail, resendVerification, getUserProfile, forgotPassword, resetPassword };
