// One-shot helper to enroll admin two-factor auth.
//
//   node backend/scripts/generate-admin-totp.js
//
// Prints a fresh secret + an otpauth URL (and a QR link). Add the secret to an
// authenticator app, then set ADMIN_TOTP_SECRET to it on the server and
// redeploy. Until ADMIN_TOTP_SECRET is set, admin login works without a code,
// so this can't lock you out.

require('dotenv').config();
const { randomSecretBase32 } = require('../utils/totp');

const secret = randomSecretBase32();
const issuer = 'Cindy Nat';
const account = process.env.ADMIN_EMAIL || 'admin';
const url =
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}` +
  `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

console.log('\nAdmin TOTP secret (base32):\n  ' + secret);
console.log('\notpauth URL — paste into your authenticator app:\n  ' + url);
console.log('\nOr scan this QR (open in a browser):\n  https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(url));
console.log('\nThen set ADMIN_TOTP_SECRET to the secret above on the server and redeploy.\n');
