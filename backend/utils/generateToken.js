const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'cnAuth';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// In production the frontend and backend are on different sites (vercel ↔ render)
// so the cookie must be SameSite=None + Secure to be sent cross-site.
// In development both sides are on localhost (same site) so Lax works without HTTPS.
const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  };
};

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, cookieOptions());
};

const clearAuthCookie = (res) => {
  // clearCookie needs the same path/sameSite/secure flags as the original
  // cookie or some browsers refuse to remove it.
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
};

module.exports = generateToken;
module.exports.COOKIE_NAME = COOKIE_NAME;
module.exports.setAuthCookie = setAuthCookie;
module.exports.clearAuthCookie = clearAuthCookie;
