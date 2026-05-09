const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }

  if (decoded.id === 'admin') {
    req.user = { isAdmin: true, email: process.env.ADMIN_EMAIL };
  } else {
    req.user = await User.findById(decoded.id).select('-password');
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
