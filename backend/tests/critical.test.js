// Critical-path integration tests: the money-handling logic and the fixes made
// during the June audit (refund visibility, session invalidation, review gating).
//
// Runs the real Express app against an in-memory MongoDB (no mocks for the DB
// layer), with only the outbound Paystack/Resend network calls stubbed.
//
//   npm test            # runs this suite

// --- Environment must be set before the app (and its modules) are required ---
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'AdminPass123!';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_dummy';
process.env.FRONTEND_URL = 'http://localhost:5173';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Stub the email module before the app loads so controllers capture the stub
// (they destructure sendResendEmail at require time) and no real HTTPS request
// to Resend is ever made during tests.
const emailPath = require.resolve('../utils/email');
require.cache[emailPath] = {
  id: emailPath,
  filename: emailPath,
  loaded: true,
  exports: { sendResendEmail: async () => 'stubbed', escapeHtml: (s) => String(s == null ? '' : s) },
};

// Stub outbound Paystack calls (verify + refund). `paystackVerifyAmount` lets a
// test say what amount Paystack should claim was paid, so we can exercise the
// server-side amount check.
const realFetch = global.fetch;
let paystackVerifyAmount = 0; // in pesewas
global.fetch = async (url) => {
  const u = String(url);
  if (u.includes('/transaction/verify/')) {
    return { ok: true, json: async () => ({ status: true, data: { status: 'success', reference: 'ref', amount: paystackVerifyAmount } }) };
  }
  if (u.includes('api.paystack.co/refund')) {
    return { ok: true, json: async () => ({ status: true, data: { id: 'rf_test_123' } }) };
  }
  throw new Error('Unexpected fetch in test: ' + u);
};

const app = require('../server');
const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  global.fetch = realFetch;
});

beforeEach(async () => {
  for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({});
});

// --- helpers ---------------------------------------------------------------

const USER_PW = 'UserPass123!';

async function makeUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: 'user@test.com',
    password: await bcrypt.hash(USER_PW, 10),
    isVerified: true,
    ...overrides,
  });
}

async function loginCookie(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return res.headers['set-cookie'];
}

async function adminCookie() {
  const res = await request(app)
    .post('/api/admin/login')
    .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
    .expect(200);
  return res.headers['set-cookie'];
}

const shipping = { address: '1 Test St', city: 'Kumasi', phone: '0240000000' };

// Build an order body that lies about prices, to prove the server ignores them.
function orderBody(product, qty, extra = {}) {
  return {
    orderItems: [{ product: product._id.toString(), quantity: qty, price: 1, name: product.name }],
    shippingAddress: shipping,
    subtotalPrice: 1,
    totalPrice: 1,
    ...extra,
  };
}

// --- tests -----------------------------------------------------------------

test('order total is computed server-side, ignoring client-supplied prices', async () => {
  const user = await makeUser();
  const cookie = await loginCookie(user.email, USER_PW);
  const product = await Product.create({ name: 'Widget', price: 100, stock: 10, active: true });

  const res = await request(app)
    .post('/api/orders')
    .set('Cookie', cookie)
    .send(orderBody(product, 2, { paymentMethod: 'cash-on-delivery' }))
    .expect(201);

  assert.equal(res.body.totalPrice, 200, 'server should price 2 × 100');
  assert.equal(res.body.orderItems[0].price, 100, 'server should override the faked unit price');
});

test('overselling is rejected and stock is rolled back', async () => {
  const user = await makeUser();
  const cookie = await loginCookie(user.email, USER_PW);
  const product = await Product.create({ name: 'Scarce', price: 50, stock: 1, active: true });

  await request(app)
    .post('/api/orders')
    .set('Cookie', cookie)
    .send(orderBody(product, 5, { paymentMethod: 'cash-on-delivery' }))
    .expect(400);

  const fresh = await Product.findById(product._id);
  assert.equal(fresh.stock, 1, 'stock must be untouched after a failed order');
});

test('a successful order decrements stock', async () => {
  const user = await makeUser();
  const cookie = await loginCookie(user.email, USER_PW);
  const product = await Product.create({ name: 'Widget', price: 100, stock: 10, active: true });

  await request(app)
    .post('/api/orders')
    .set('Cookie', cookie)
    .send(orderBody(product, 3, { paymentMethod: 'cash-on-delivery' }))
    .expect(201);

  const fresh = await Product.findById(product._id);
  assert.equal(fresh.stock, 7);
});

test('a Paystack reference cannot be reused for a second order (replay)', async () => {
  const user = await makeUser();
  const cookie = await loginCookie(user.email, USER_PW);
  const product = await Product.create({ name: 'Widget', price: 100, stock: 10, active: true });

  paystackVerifyAmount = 100 * 100; // server expects ₵100 → 10000 pesewas

  await request(app)
    .post('/api/orders')
    .set('Cookie', cookie)
    .send(orderBody(product, 1, { paymentMethod: 'Paystack', paystackReference: 'PSREF-DUP' }))
    .expect(201);

  await request(app)
    .post('/api/orders')
    .set('Cookie', cookie)
    .send(orderBody(product, 1, { paymentMethod: 'Paystack', paystackReference: 'PSREF-DUP' }))
    .expect(400);
});

test('refunded orders stay visible (status Refunded) to admin and customer', async () => {
  const user = await makeUser();
  const cookie = await loginCookie(user.email, USER_PW);
  const product = await Product.create({ name: 'Widget', price: 100, stock: 10, active: true });

  paystackVerifyAmount = 100 * 100;
  const orderRes = await request(app)
    .post('/api/orders')
    .set('Cookie', cookie)
    .send(orderBody(product, 1, { paymentMethod: 'Paystack', paystackReference: 'PSREF-REFUND' }))
    .expect(201);
  const orderId = orderRes.body._id;

  const admin = await adminCookie();
  const refundRes = await request(app)
    .post(`/api/orders/${orderId}/refund`)
    .set('Cookie', admin)
    .send({ reason: 'customer changed mind' })
    .expect(200);

  assert.equal(refundRes.body.isRefunded, true);
  assert.equal(refundRes.body.status, 'Refunded', 'refund must not reuse the Cancelled status');

  // Admin list still contains it
  const adminList = await request(app).get('/api/orders').set('Cookie', admin).expect(200);
  assert.ok(adminList.body.some((o) => o._id === orderId), 'admin list should show the refunded order');

  // Customer history still contains it
  const myOrders = await request(app).get('/api/orders/my-orders').set('Cookie', cookie).expect(200);
  assert.ok(myOrders.body.some((o) => o._id === orderId), 'customer history should show the refunded order');
});

test('changing the password invalidates existing sessions but keeps the current one', async () => {
  const user = await makeUser();
  const oldCookie = await loginCookie(user.email, USER_PW);

  // Old cookie works before the change
  await request(app).get('/api/auth/profile').set('Cookie', oldCookie).expect(200);

  const changeRes = await request(app)
    .put('/api/users/change-password')
    .set('Cookie', oldCookie)
    .send({ currentPassword: USER_PW, newPassword: 'BrandNew456!' })
    .expect(200);
  const refreshedCookie = changeRes.headers['set-cookie'];

  // The pre-change cookie is now rejected...
  await request(app).get('/api/auth/profile').set('Cookie', oldCookie).expect(401);
  // ...but the refreshed cookie returned by change-password still works.
  await request(app).get('/api/auth/profile').set('Cookie', refreshedCookie).expect(200);
});

test('only non-refunded purchasers can post a verified review', async () => {
  const product = await Product.create({ name: 'Widget', price: 100, stock: 10, active: true });
  const admin = await adminCookie();

  // Buyer A: keeps the product → can review.
  const buyerA = await makeUser({ email: 'a@test.com' });
  const cookieA = await loginCookie(buyerA.email, USER_PW);
  paystackVerifyAmount = 100 * 100;
  await request(app)
    .post('/api/orders')
    .set('Cookie', cookieA)
    .send(orderBody(product, 1, { paymentMethod: 'Paystack', paystackReference: 'PSREF-A' }))
    .expect(201);
  await request(app)
    .post(`/api/products/${product._id}/reviews`)
    .set('Cookie', cookieA)
    .send({ rating: 5, comment: 'Great' })
    .expect(201);

  // Buyer B: refunded → cannot review.
  const buyerB = await makeUser({ email: 'b@test.com' });
  const cookieB = await loginCookie(buyerB.email, USER_PW);
  paystackVerifyAmount = 100 * 100;
  const orderB = await request(app)
    .post('/api/orders')
    .set('Cookie', cookieB)
    .send(orderBody(product, 1, { paymentMethod: 'Paystack', paystackReference: 'PSREF-B' }))
    .expect(201);
  await request(app)
    .post(`/api/orders/${orderB.body._id}/refund`)
    .set('Cookie', admin)
    .send({ reason: 'returned' })
    .expect(200);
  await request(app)
    .post(`/api/products/${product._id}/reviews`)
    .set('Cookie', cookieB)
    .send({ rating: 1, comment: 'Refunded buyer' })
    .expect(403);

  const reviews = await Review.find({ product: product._id });
  assert.equal(reviews.length, 1, 'only the non-refunded purchase should yield a review');
});
