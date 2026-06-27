// Sentry MUST come first so its auto-instrumentation can hook other modules.
const Sentry = require('./sentry');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { authLimiter, supportLimiter, promoLimiter, orderLimiter, paymentLimiter } = require('./middlewares/limiters');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const promoRoutes = require('./routes/promos');
const supportRoutes = require('./routes/support');
const paymentRoutes = require('./routes/payments');
const { paystackWebhook } = require('./controllers/paymentController');
const { seedData } = require('./utils/seeder');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
const User = require('./models/User');

dotenv.config();
const app = express();

// Connect to MongoDB only when this file is the entrypoint (node server.js).
// Tests import the app and supply their own in-memory connection instead.
if (require.main === module) {
  connectDB();
}

// Trust Render's proxy so req.ip is the real client IP (required for rate limiting)
app.set('trust proxy', 1);

// Security headers — configure CORP as cross-origin so the frontend (different origin)
// can read API responses. Default 'same-origin' breaks cross-origin fetch.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Strict CORS — only explicitly listed origins, no *.vercel.app wildcard
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://backend-alpha-seven-54.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

// CSRF defense-in-depth, ahead of CORS so it returns a clean 403. The auth
// cookie is SameSite=None (cross-site frontend), so it rides along on cross-site
// requests. CORS preflight already blocks cross-origin JSON calls, but simple
// requests (e.g. a form POST) skip preflight — so we also reject any
// state-changing request whose Origin isn't allow-listed. A missing Origin is
// allowed: that's a non-browser client (curl/mobile) or a server-to-server call
// like the Paystack webhook, neither of which is a CSRF vector (the browser
// always sends Origin on cross-site writes).
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
app.use((req, res, next) => {
  if (!STATE_CHANGING_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) return next();
  res.status(403);
  return next(new Error('Cross-origin request blocked'));
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow curl / Postman / mobile
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

// Use combined format in production (structured, no colour codes); stay quiet
// under test so the suite output isn't buried in request logs.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 10mb cap — admin product uploads send images inline as base64, and a single
// real phone photo already exceeds a 2mb cap. Still bounded to block large
// payload DoS; the admin-only upload routes are the only ones that need it.
// `verify` stashes the raw bytes so the Paystack webhook can validate its
// HMAC signature against exactly what was sent.
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(cookieParser());

app.get('/api/status', (req, res) => res.json({ status: 'ok', message: 'Cindy Nat backend running' }));

// Seed disabled in production — prevents catastrophic database wipe
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/seed', seedData);
} else {
  app.get('/api/seed', (req, res) => res.status(403).json({ message: 'Not available in production' }));
}

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', authLimiter, adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderLimiter, orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/promos', promoLimiter, promoRoutes);
app.use('/api/support', supportLimiter, supportRoutes);
// Webhook is registered before the rate-limited payments mount so Paystack's
// retries are never throttled. It ends the response itself (no next()), so the
// limited mount below won't also handle it.
app.post('/api/payments/paystack/webhook', paystackWebhook);
app.use('/api/payments', paymentLimiter, paymentRoutes);

app.use(notFound);

// Sentry's Express error capture must run BEFORE our error responder.
if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

// Export the configured app so tests can drive it with supertest. Runtime
// side effects below only fire when this file is executed directly.
module.exports = app;

if (require.main === module) {
  // Crash-safe: log unhandled rejections instead of silently dying
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
  });

  // Purge unverified accounts whose 30-minute window has expired — runs every 10 minutes
  setInterval(async () => {
    try {
      const result = await User.deleteMany({
        isVerified: false,
        verifyTokenExpiry: { $lt: Date.now() },
      });
      if (result.deletedCount > 0) {
        console.log(`[Cleanup] Deleted ${result.deletedCount} expired unverified account(s)`);
      }
    } catch (err) {
      console.error('[Cleanup] Failed to purge unverified accounts:', err.message);
    }
  }, 10 * 60 * 1000);

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
