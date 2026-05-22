const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendResendEmail, escapeHtml } = require('../utils/email');

const MAX_CODE_ATTEMPTS = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FRONTEND = process.env.FRONTEND_URL || 'https://backend-alpha-seven-54.vercel.app';
const { validatePassword } = require('../utils/passwordStrength');

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
  const normalizedEmail = String(email).toLowerCase().trim();

  const pwdErrors = validatePassword(password, { name, email: normalizedEmail });
  if (pwdErrors.length > 0) {
    res.status(400);
    throw new Error(`Password must: ${pwdErrors.join(', ')}`);
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    // Allow re-registration if account exists but was never verified and window expired
    if (existingUser.isVerified === false && existingUser.verifyTokenExpiry < Date.now()) {
      await User.deleteOne({ _id: existingUser._id });
    } else if (existingUser.isVerified === false) {
      res.status(400);
      throw new Error('A verification email was already sent to this address. Please check your inbox (expires in 30 minutes).');
    } else {
      res.status(400);
      throw new Error('User already exists');
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const verifyToken = crypto.createHash('sha256').update(code).digest('hex');

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
    verifyTokenExpiry: Date.now() + 30 * 60 * 1000, // 30 minutes
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid user data');
  }

  sendResendEmail({
    to: user.email,
    subject: 'Your Cindy Nat verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#131921">Welcome to Cindy Nat!</h2>
        <p>Hi ${escapeHtml(String(name).trim())},</p>
        <p>Use the code below to verify your email address. It expires in <strong>30 minutes</strong>.</p>
        <div style="margin:28px 0;text-align:center">
          <span style="display:inline-block;letter-spacing:10px;font-size:40px;font-weight:900;color:#131921;background:#f5f5f5;padding:16px 24px;border-radius:12px;border:2px solid #D4AF37">
            ${code}
          </span>
        </div>
        <p style="color:#444;font-size:14px">Enter this code on the verification page. Do not share it with anyone.</p>
        <p style="color:#666;font-size:13px">If you didn't create this account, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
      </div>
    `,
  }).catch((err) => console.error('[Email] Verification email failed:', err.message));

  res.status(201).json({ message: 'Account created. A 6-digit verification code has been sent to your email.' });
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

  // Block unverified accounts; delete them if their 10-minute window has expired
  if (user.isVerified === false) {
    if (user.verifyTokenExpiry && user.verifyTokenExpiry < Date.now()) {
      await User.deleteOne({ _id: user._id });
      res.status(403);
      throw new Error('Your account was not verified in time and has been removed. Please register again.');
    }
    res.status(403);
    throw new Error('Please verify your email before logging in. Check your inbox for the 6-digit code.');
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
  // Legacy link-based route — kept for backward compatibility but code flow is preferred
  const hashedToken = crypto.createHash('sha256').update(String(req.params.token)).digest('hex');
  const user = await User.findOne({ verifyToken: hashedToken, verifyTokenExpiry: { $gt: Date.now() } });
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

const verifyEmailCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400);
    throw new Error('Email and code are required');
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // No usable code: never registered, already verified, or window expired
  if (!user || user.isVerified || !user.verifyToken || !user.verifyTokenExpiry || user.verifyTokenExpiry < Date.now()) {
    res.status(400);
    throw new Error('Code is invalid or has expired. Please register again.');
  }

  const hashedCode = crypto.createHash('sha256').update(String(code).trim()).digest('hex');
  if (user.verifyToken !== hashedCode) {
    user.verifyAttempts = (user.verifyAttempts || 0) + 1;
    // Burn the code after too many wrong guesses so it cannot be brute-forced
    if (user.verifyAttempts >= MAX_CODE_ATTEMPTS) {
      user.verifyToken = undefined;
      user.verifyTokenExpiry = undefined;
      user.verifyAttempts = 0;
      await user.save();
      res.status(400);
      throw new Error('Too many incorrect attempts. Please request a new code.');
    }
    await user.save();
    res.status(400);
    throw new Error('Code is invalid or has expired. Please register again.');
  }

  user.isVerified = true;
  user.verifyToken = undefined;
  user.verifyTokenExpiry = undefined;
  user.verifyAttempts = 0;
  await user.save();
  res.json({ message: 'Email verified successfully. You can now sign in.' });
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const genericResponse = { message: 'If that email is registered and unverified, a new code has been sent.' };

  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.json(genericResponse);
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || user.isVerified) return res.json(genericResponse);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  user.verifyToken = crypto.createHash('sha256').update(code).digest('hex');
  user.verifyTokenExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes
  user.verifyAttempts = 0;
  await user.save();

  sendResendEmail({
    to: user.email,
    subject: 'Your new Cindy Nat verification code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#131921">New Verification Code</h2>
        <p>Hi ${escapeHtml(user.name)},</p>
        <p>Here is your new verification code. It expires in <strong>30 minutes</strong>.</p>
        <div style="margin:28px 0;text-align:center">
          <span style="display:inline-block;letter-spacing:10px;font-size:40px;font-weight:900;color:#131921;background:#f5f5f5;padding:16px 24px;border-radius:12px;border:2px solid #D4AF37">
            ${code}
          </span>
        </div>
        <p style="color:#444;font-size:14px">Enter this code on the verification page.</p>
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
  user.resetAttempts = 0;
  await user.save();

  try {
    await sendResendEmail({
      to: user.email,
      subject: 'Your Cindy Nat password reset code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#131921">Password Reset Code</h2>
          <p>Hi ${escapeHtml(user.name)},</p>
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

const verifyResetCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400);
    throw new Error('Email and code are required');
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.resetToken || !user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
    res.status(400);
    throw new Error('Code is invalid or has expired');
  }
  const hashedCode = crypto.createHash('sha256').update(String(code).trim()).digest('hex');
  if (user.resetToken !== hashedCode) {
    user.resetAttempts = (user.resetAttempts || 0) + 1;
    if (user.resetAttempts >= MAX_CODE_ATTEMPTS) {
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      user.resetAttempts = 0;
      await user.save();
      res.status(400);
      throw new Error('Too many incorrect attempts. Please request a new code.');
    }
    await user.save();
    res.status(400);
    throw new Error('Code is invalid or has expired');
  }
  res.json({ valid: true });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;

  if (!email || !code || !password) {
    res.status(400);
    throw new Error('Email, code and new password are required');
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const pwdErrors = validatePassword(password, { email: normalizedEmail });
  if (pwdErrors.length > 0) {
    res.status(400);
    throw new Error(`Password must: ${pwdErrors.join(', ')}`);
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.resetToken || !user.resetTokenExpiry || user.resetTokenExpiry < Date.now()) {
    res.status(400);
    throw new Error('Code is invalid or has expired');
  }

  const hashedCode = crypto.createHash('sha256').update(String(code).trim()).digest('hex');
  if (user.resetToken !== hashedCode) {
    user.resetAttempts = (user.resetAttempts || 0) + 1;
    if (user.resetAttempts >= MAX_CODE_ATTEMPTS) {
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      user.resetAttempts = 0;
      await user.save();
      res.status(400);
      throw new Error('Too many incorrect attempts. Please request a new code.');
    }
    await user.save();
    res.status(400);
    throw new Error('Code is invalid or has expired');
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  user.resetAttempts = 0;
  user.isVerified = true; // OTP proves email ownership
  user.verifyToken = undefined;
  user.verifyTokenExpiry = undefined;
  await user.save();

  res.json({ message: 'Password reset successfully. You can now sign in.' });
});

module.exports = { registerUser, authUser, verifyEmail, verifyEmailCode, resendVerification, getUserProfile, forgotPassword, verifyResetCode, resetPassword };
