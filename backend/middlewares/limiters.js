const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many password reset attempts. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const promoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many promo code attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Too many support messages. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Prevents bots from flooding order creation and depleting stock
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Too many orders placed. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Prevents spam initialization of payment sessions
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many payment requests. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, passwordResetLimiter, promoLimiter, supportLimiter, orderLimiter, paymentLimiter };
