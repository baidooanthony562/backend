// RFC 6238 TOTP (time-based one-time passwords) + RFC 4648 base32, implemented
// on Node's crypto so we don't pull in a third-party auth dependency. Correctness
// is pinned by tests against the official RFC 6238 vectors (see tests/totp.test.js).
//
// Used for admin two-factor auth: a 6-digit code from an authenticator app
// (Google Authenticator, Authy, etc.) on top of the admin password.

const crypto = require('crypto');

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | B32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// HOTP (RFC 4226): one code for a given counter.
function hotp(secretBuf, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, '0');
}

function counterFor(time, step) {
  return Math.floor(time / 1000 / step);
}

// The current 6-digit code for a base32 secret.
function generateTOTP(secretBase32, forTime = Date.now(), step = 30) {
  return hotp(base32Decode(secretBase32), counterFor(forTime, step));
}

// Verify a submitted code, allowing ±`window` steps of clock drift. Constant-time
// compare so a wrong code can't be timed digit-by-digit.
function verifyTOTP(token, secretBase32, { window = 1, forTime = Date.now(), step = 30 } = {}) {
  const clean = String(token || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  const secretBuf = base32Decode(secretBase32);
  const counter = counterFor(forTime, step);
  const submitted = Buffer.from(clean);
  for (let w = -window; w <= window; w++) {
    const candidate = Buffer.from(hotp(secretBuf, counter + w));
    if (candidate.length === submitted.length && crypto.timingSafeEqual(candidate, submitted)) {
      return true;
    }
  }
  return false;
}

// A fresh random secret for enrolling an authenticator app.
function randomSecretBase32(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

module.exports = { generateTOTP, verifyTOTP, randomSecretBase32, base32Encode, base32Decode };
