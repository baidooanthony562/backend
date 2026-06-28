# Pre-launch checklist

Work top to bottom before pointing customers at the live site. Items marked
**(you)** can only be done by someone with access to Render/Vercel/Paystack;
the rest are verifiable in the code/repo.

## Secrets & environment (you)

On **Render** (backend), confirm these are set and are NOT the `.env.example`
placeholders:

- [ ] `JWT_SECRET` — long random string (NOT `supersecretjwtkey`). A weak value
      lets anyone forge an admin session. **Highest-priority check.**
- [ ] `ADMIN_PASSWORD` — strong and unique (NOT `Admin@123`).
- [ ] `ADMIN_EMAIL` — the address that should receive admin/login/low-stock alerts.
- [ ] `MONGO_URI` — points at the production database (not a local/dev one).
- [ ] `PAYSTACK_SECRET_KEY` — the **live** key.
- [ ] `FRONTEND_URL` — the real Vercel URL (drives CORS, payment callback, email links).
- [ ] `RESEND_API_KEY` / `RESEND_FROM` — verified sender for transactional email.
- [ ] `NODE_ENV=production`.
- [ ] (Optional) `ADMIN_TOTP_SECRET` — enables admin 2FA. See `docs/admin-mfa.md`.
- [ ] `SENTRY_DSN` if you want error tracking.

On **Vercel** (frontend, build-time): `VITE_SENTRY_DSN`, `VITE_GA_MEASUREMENT_ID`
if used.

## Payments (you)

- [ ] Register the Paystack **webhook URL** (`.../api/payments/paystack/webhook`)
      in the Paystack dashboard.
- [ ] Run the full verification in `docs/verify-paystack-webhook.md` — including
      the "close the tab after paying" durability test.

## Code-side guards (already in place — confirm they survived any config drift)

- [x] `/api/seed` is disabled when `NODE_ENV=production` (returns 403).
- [x] CORS is a strict allow-list (no `*.vercel.app` wildcard); a new frontend
      origin must be added in `server.js` or via `FRONTEND_URL`.
- [x] Auth cookie is httpOnly + Secure + SameSite=None in production.
- [x] CSRF origin guard rejects cross-site state-changing requests.
- [x] Rate limiters on auth/admin/orders/payments/promos/support.
- [x] Payments verified server-side; payment references can't be replayed.

## Data & ops (you)

- [ ] Seed/confirm the real product catalogue and categories.
- [ ] Confirm the weekly MongoDB backup workflow has its `MONGO_URI` secret set
      (GitHub Actions → `db-backup.yml`).
- [ ] Do one real test purchase end-to-end (small amount): order appears in
      admin, confirmation email arrives, status emails work.

## Smoke test the key flows (you, on the live site)

- [ ] Register → email verification code → login.
- [ ] Browse → product detail → add to cart → checkout (Paystack) → order shows.
- [ ] Guest checkout → confirmation page loads via its token.
- [ ] Wishlist: save as guest → log in → items merged into the account.
- [ ] Admin: log in, see the order, update status (customer gets the email),
      refund a Paystack order (it stays visible as "Refunded").
- [ ] Forgot-password OTP flow.

## CI

- [x] Backend + frontend test workflows run on push/PR. Confirm both are green
      on `main` before launch (repo → Actions tab).
