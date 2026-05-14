const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { authLimiter, supportLimiter } = require('./middlewares/limiters');
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
const { seedData } = require('./utils/seeder');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

dotenv.config();
const app = express();

connectDB();

// Security headers
app.use(helmet());

// Strict CORS — only explicitly listed origins, no *.vercel.app wildcard
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://new-web-cindy.vercel.app',
  'https://backend-alpha-seven-54.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow curl / Postman / mobile
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

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
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/support', supportLimiter, supportRoutes);
app.use('/api/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
