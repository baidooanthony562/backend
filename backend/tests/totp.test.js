const { test } = require('node:test');
const assert = require('node:assert');
const { generateTOTP, verifyTOTP, randomSecretBase32 } = require('../utils/totp');

// Official RFC 6238 test vectors (SHA1, 8-digit). The shared secret is the ASCII
// string "12345678901234567890", which is this base32:
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

// We emit 6 digits, so compare against the last 6 of each published 8-digit code.
const VECTORS = [
  { time: 59, code: '287082' },
  { time: 1111111109, code: '081804' },
  { time: 1111111111, code: '050471' },
  { time: 1234567890, code: '005924' },
  { time: 2000000000, code: '279037' },
  { time: 20000000000, code: '353130' },
];

test('generateTOTP matches the RFC 6238 vectors', () => {
  for (const { time, code } of VECTORS) {
    assert.equal(generateTOTP(RFC_SECRET, time * 1000), code, `t=${time}`);
  }
});

test('verifyTOTP accepts the current code and rejects a wrong one', () => {
  const now = 1234567890 * 1000;
  assert.equal(verifyTOTP('005924', RFC_SECRET, { forTime: now }), true);
  assert.equal(verifyTOTP('000000', RFC_SECRET, { forTime: now }), false);
});

test('verifyTOTP tolerates one step of clock drift', () => {
  const t = 1234567890 * 1000;
  const prev = generateTOTP(RFC_SECRET, t - 30 * 1000);
  const next = generateTOTP(RFC_SECRET, t + 30 * 1000);
  assert.equal(verifyTOTP(prev, RFC_SECRET, { forTime: t }), true);
  assert.equal(verifyTOTP(next, RFC_SECRET, { forTime: t }), true);
});

test('verifyTOTP rejects malformed input', () => {
  assert.equal(verifyTOTP('', RFC_SECRET), false);
  assert.equal(verifyTOTP('12345', RFC_SECRET), false);
  assert.equal(verifyTOTP('abcdef', RFC_SECRET), false);
  assert.equal(verifyTOTP(undefined, RFC_SECRET), false);
});

test('a freshly generated secret round-trips through generate/verify', () => {
  const secret = randomSecretBase32();
  const code = generateTOTP(secret);
  assert.equal(verifyTOTP(code, secret), true);
});
