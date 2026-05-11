const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const promoRoutes = require('./routes/promos');
const supportRoutes = require('./routes/support');
const { seedData } = require('./utils/seeder');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

dotenv.config();
const app = express();

connectDB();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://new-web-cindy.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow localhost (any port) and any vercel.app subdomain
    if (
      origin.includes('localhost') ||
      origin.endsWith('.vercel.app') ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts, please try again in 15 minutes.' },
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

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/api/status', (req, res) => res.json({ status: 'ok', message: 'Cindy Nat backend running' }));
app.get('/api/seed', seedData);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', authLimiter, adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/support', supportLimiter, supportRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
