# Admin two-factor authentication (TOTP)

Admin login can require a 6-digit code from an authenticator app (Google
Authenticator, Authy, 1Password, etc.) on top of the password. It's **opt-in**:
two-factor is enforced only when `ADMIN_TOTP_SECRET` is set on the server, so
turning it on is a deliberate act and there's no way to lock yourself out by
accident.

## Enroll

1. Generate a secret:

   ```bash
   node backend/scripts/generate-admin-totp.js
   ```

   It prints a base32 secret, an `otpauth://` URL, and a QR-code link.

2. Add it to your authenticator app — scan the QR (open the printed link in a
   browser) or paste the `otpauth://` URL / type the secret manually.

3. On the server (Render → backend → Environment), set:

   ```
   ADMIN_TOTP_SECRET = <the base32 secret>
   ```

   Save and let it redeploy.

4. From now on, the admin login page's **Authenticator code** field is required.
   Enter the current 6-digit code from your app along with email + password.

## Turn it off

Remove the `ADMIN_TOTP_SECRET` env var and redeploy. Login reverts to
email + password only.

## Notes

- The code field is always visible on the admin login page but is only checked
  when `ADMIN_TOTP_SECRET` is set; leave it blank when 2FA is off.
- Verification allows ±1 time-step (30s) of clock drift.
- This protects the **env-based admin account** (`ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- Keep the secret somewhere safe (a password manager). If you lose the
  authenticator and the secret, clear `ADMIN_TOTP_SECRET` to get back in, then
  re-enroll.
- The TOTP implementation (`backend/utils/totp.js`) is verified against the
  official RFC 6238 test vectors in `backend/tests/totp.test.js`.
