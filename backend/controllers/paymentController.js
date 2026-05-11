const crypto = require('crypto');
const asyncHandler = require('express-async-handler');

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

const checkMoMoStatus = asyncHandler(async (req, res) => {
  const { referenceId } = req.params;
  const token = await getMoMoToken();

  const response = await fetch(
    `${MOMO_BASE}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': TARGET_ENV,
        'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
      },
    }
  );

  if (!response.ok) {
    res.status(400);
    throw new Error('Failed to check payment status');
  }

  const data = await response.json();
  res.json({ status: data.status, financialTransactionId: data.financialTransactionId });
});

module.exports = { initiateMoMoPayment, checkMoMoStatus };
