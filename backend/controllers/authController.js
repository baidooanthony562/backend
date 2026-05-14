const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password: hashedPassword,
    phone,
    address,
    city,
    country,
  });

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

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
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

  if (!email || !EMAIL_RE.test(String(email).trim())) {
    // Return generic response — don't reveal format validation either
    return res.json({ message: 'If that email is registered, a reset link has been sent.' });
  }

  // Always return the same message — never reveal whether email exists
  const genericResponse = { message: 'If that email is registered, a reset link has been sent.' };

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) return res.json(genericResponse);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.resetToken = hashedToken;
  user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'https://backend-alpha-seven-54.vercel.app'}/reset-password/${rawToken}`;

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: user.email,
        subject: 'Reset your Cindy Nat password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="color:#131921">Password Reset</h2>
            <p>Hi ${user.name},</p>
            <p>We received a request to reset your password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#D4AF37;color:#000;font-weight:700;border-radius:999px;text-decoration:none">
              Reset Password
            </a>
            <p style="color:#666;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="color:#999;font-size:12px">Cindy Nat Enterprise &mdash; Kumasi, Ghana</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('[Resend] Failed to send reset email:', errText);
    }
  } catch (emailErr) {
    // Log but don't fail the request — token is already saved
    console.error('[Resend] Error sending reset email:', emailErr.message);
  }

  res.json(genericResponse);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400);
    throw new Error('Token and password are required');
  }
  if (String(password).length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters');
  }

  const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');
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
