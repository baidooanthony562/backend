const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const PendingOrder = require('../models/PendingOrder');

const MOMO_BASE = process.env.MOMO_ENV === 'production'
  ? 'https://proxy.momoapi.mtn.com'
  : 'https://sandbox.momodeveloper.mtn.com';

const TARGET_ENV = process.env.MOMO_ENV || 'sandbox';
const CURRENCY = TARGET_ENV === 'production' ? 'GHS' : 'EUR';

async function getMoMoToken() {
  const credentials = Buffer.from(
    `${process.env.MOMO_USER_ID}:${process.env.MOMO_API_KEY}`
  ).toString('base64');

  const res = await fetch(`${MOMO_BASE}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MoMo token error: ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

function normalizeMsisdn(phone) {
  let p = phone.replace(/[\s\-().+]/g, '');
  if (p.startsWith('0')) p = '233' + p.slice(1);
  if (!p.startsWith('233')) p = '233' + p;
  return p;
}

const initiateMoMoPayment = asyncHandler(async (req, res) => {
  const { phone, amount, externalId } = req.body;
  if (!phone || !amount) {
    res.status(400);
    throw new Error('Phone number and amount are required');
  }

  const referenceId = crypto.randomUUID();
  const token = await getMoMoToken();
  const msisdn = normalizeMsisdn(String(phone));

  const response = await fetch(`${MOMO_BASE}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': TARGET_ENV,
      'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(Math.round(Number(amount))),
      currency: CURRENCY,
      externalId: String(externalId || referenceId),
      payer: { partyIdType: 'MSISDN', partyId: msisdn },
      payerMessage: 'Cindy Nat Enterprise — Payment',
      payeeNote: `Order ₵${Number(amount).toFixed(2)}`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    res.status(400);
    throw new Error(`Payment request failed: ${text}`);
  }

  res.json({ referenceId, status: 'PENDING' });
});

// Reusable MoMo transaction lookup — used by the status endpoint and by
// orderController to verify a payment server-side before creating an order.
async function getMoMoTransaction(referenceId) {
  const token = await getMoMoToken();
  const response = await fetch(
    `${MOMO_BASE}/collection/v1_0/requesttopay/${encodeURIComponent(String(referenceId))}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': TARGET_ENV,
        'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
      },
    }
  );
  if (!response.ok) {
    throw new Error('Failed to check payment status');
  }
  return response.json();
}

const checkMoMoStatus = asyncHandler(async (req, res) => {
  const { referenceId } = req.params;
  let data;
  try {
    data = await getMoMoTransaction(referenceId);
  } catch {
    res.status(400);
    throw new Error('Failed to check payment status');
  }
  res.json({ status: data.status, financialTransactionId: data.financialTransactionId });
});

const initializePaystackPayment = asyncHandler(async (req, res) => {
  const { email, amount, orderPayload } = req.body;
  if (!email || !amount) {
    res.status(400);
    throw new Error('Email and amount are required');
  }

  const amountInPesewas = Math.round(Number(amount) * 100);
  const reference = `CN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const callbackUrl = `${process.env.FRONTEND_URL}/payment/verify`;

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, amount: amountInPesewas, currency: 'GHS', reference, callback_url: callbackUrl }),
  });

  const data = await response.json();
  if (!data.status) {
    res.status(400);
    throw new Error(data.message || 'Failed to initialize Paystack payment');
  }

  // Persist the order intent server-side, keyed by the reference, so the order
  // can be created by either the browser return or the webhook — even if the
  // customer's browser never makes it back. buildOrder re-reads products and
  // re-prices on finalize, so the items stored here can't be used to underpay.
  if (orderPayload && Array.isArray(orderPayload.orderItems) && orderPayload.orderItems.length > 0) {
    try {
      await PendingOrder.create({
        reference,
        isGuest: !req.user,
        user: req.user?._id,
        guestName: req.user ? undefined : orderPayload.guestName,
        guestEmail: req.user ? undefined : orderPayload.guestEmail,
        orderItems: orderPayload.orderItems.map((i) => ({
          product: String(i.product),
          quantity: Number(i.quantity),
          name: i.name,
          image: i.image,
        })),
        shippingAddress: orderPayload.shippingAddress,
        promoCode: orderPayload.promoCode,
        expectedTotal: Number(amount),
      });
    } catch (err) {
      // Don't block payment on intent-save failure; the browser return path
      // still carries the payload as a fallback.
      console.error('[Paystack] Failed to save pending order:', err.message);
    }
  }

  res.json({ authorization_url: data.data.authorization_url, reference: data.data.reference });
});

// Paystack webhook — the server-side safety net that finalizes the order even
// if the customer's browser never returns. Verifies the HMAC-SHA512 signature
// (with the secret key) before trusting the event; without this, anyone could
// forge a "payment succeeded" event and create unpaid orders.
const paystackWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers['x-paystack-signature'];
  const raw = req.rawBody;

  if (!secret || !raw || !signature) return res.sendStatus(401);

  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  const sigBuf = Buffer.from(String(signature));
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.sendStatus(401);
  }

  const event = req.body;
  if (event?.event === 'charge.success' && event.data?.reference) {
    // Lazy require avoids a circular dependency (orderController requires this
    // module for getMoMoTransaction).
    const { finalizeOrderFromReference } = require('./orderController');
    try {
      await finalizeOrderFromReference(event.data.reference);
    } catch (err) {
      console.error('[Webhook] Order finalize failed:', err.message);
      // Still 200 below so Paystack doesn't hammer retries on our-side errors.
    }
  }

  res.sendStatus(200);
});

const verifyPaystackPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  if (!reference) {
    res.status(400);
    throw new Error('Reference is required');
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });

  const data = await response.json();
  if (!data.status || data.data?.status !== 'success') {
    res.status(400);
    throw new Error('Payment not successful or could not be verified');
  }

  // Endpoint is unauthenticated (guest checkout needs it) — do not leak
  // the payer's email or amount. Order creation re-verifies independently.
  res.json({ success: true, reference: data.data.reference });
});

module.exports = { initiateMoMoPayment, checkMoMoStatus, getMoMoTransaction, initializePaystackPayment, verifyPaystackPayment, paystackWebhook };
