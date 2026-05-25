const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { COOKIE_NAME } = require('../utils/generateToken');

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no session');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Not authorized, session invalid');
  }

  if (decoded.id === 'admin') {
    req.user = { isAdmin: true, email: process.env.ADMIN_EMAIL };
  } else {
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      res.status(401);
      throw new Error('Account no longer exists');
    }
  }
  next();
});

const adminProtect = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403);
    throw new Error('Admin access denied');
  }
};

module.exports = { protect, adminProtect };
