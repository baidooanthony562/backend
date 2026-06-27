# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cindy Nat Enterprise — a full-stack eCommerce store for a home-appliance / kitchenware business in Kumasi, Ghana. Two independently-deployed apps in one repo:

- `frontend/` — React 18 + Vite + Tailwind SPA (customer storefront **and** admin dashboard). Deployed to **Vercel**.
- `backend/` — Express + Mongoose REST API. Deployed to **Render** (see `render.yaml`).

There is no shared root `package.json`; install and run each app from its own directory.

## Commands

```bash
# Backend (from backend/)
npm install
npm run dev          # nodemon server.js  — local API on :5000
npm start            # node server.js      — production start

# Frontend (from frontend/)
npm install
npm run dev          # vite dev server on :5173
npm run build        # production build
npm run build:prod   # build + upload sourcemaps to Sentry
npm run preview      # preview a production build

# One-off DB inspection (from repo root, needs MONGO_URI in env)
node backend/scripts/inspect-db.mjs
```

The **backend has an integration test suite** (`cd backend && npm test`) covering the money-critical paths and audit fixes — it runs the real Express app against an in-memory MongoDB (`mongodb-memory-server` + `supertest`, Node's built-in `node:test` runner); only outbound Paystack/Resend calls are stubbed. `server.js` exports `app` and guards its side effects behind `require.main === module` so tests can import it without connecting to a real DB or listening. Add new backend tests under `backend/tests/*.test.js`. The **frontend has a Vitest suite** (`cd frontend && npm test`, or `npm run test:watch`) — jsdom + React Testing Library, configured in the `test` block of `vite.config.js` with `src/test/setup.js`. It currently covers the localStorage-backed utils (`cart`, `productStore`) and a `ProductCard` smoke test; also still verify a real build with `npm run build`. Add frontend tests as `*.test.js(x)` next to the code. Both suites run in CI (`.github/workflows/{backend,frontend}-tests.yml`) on pushes/PRs that touch the respective folder. No linter is configured. For quick syntax validation of a single backend file use `node --check <file>`.

## Local setup gotchas

- The frontend API base URL is **hardcoded** in `frontend/src/utils/api.js` to the production Render URL (`https://backend-9m2y.onrender.com/api`). To develop against a local backend you must edit that constant — it is not driven by an env var.
- Backend needs a `.env` (see `backend/.env.example`). Minimum: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- Seed demo data by hitting `GET /api/seed` (disabled in production — returns 403 when `NODE_ENV=production`).

## Architecture & cross-cutting conventions

### Auth — httpOnly cookie, not bearer tokens
Auth is carried by an **httpOnly `cnAuth` cookie** set by the backend at login (`backend/utils/generateToken.js`), not by a JS-readable token. Implications:

- All frontend requests go through the shared axios instance (`frontend/src/utils/api.js`) with `withCredentials: true`. A 401 response auto-clears local UI flags and redirects to `/login`.
- `frontend/src/utils/auth.js` only stores **non-sensitive UI flags** in localStorage (`cindyNutUser`, `cindyNutAdminUser`, `cindyNutAdminSession`) so the nav/dashboard can render without a `/profile` round-trip. `getToken()`/`saveToken()` etc. are intentional **no-ops** kept for source-compat after the cookie migration — do not "fix" them by reintroducing token storage.
- Backend: `protect` (verify cookie → load `req.user`) and `adminProtect` (require `req.user.isAdmin`) in `backend/middlewares/authMiddleware.js`. The **admin is not a User document** — a JWT with `id === 'admin'` resolves to a synthetic `{ isAdmin: true }` user, authenticated against `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars.
- Admin logins are tracked as `AdminSession` records; `frontend/src/hooks/useAdminSessionGuard.js` guards stale sessions.

### Orders are the core domain — trust nothing from the client
`backend/controllers/orderController.js` is the most important file. Order creation (`createOrder` for users, `createGuestOrder` for guests) **re-derives everything server-side** and never trusts client-supplied prices/totals:

- Prices, wholesale tiers, discounts, promo validity, and the final total are all recomputed on the server using integer (×100) arithmetic to avoid float drift.
- Stock is reserved with an **atomic** `findOneAndUpdate({ stock: { $gte: qty } }, { $inc: { stock: -qty } })` to prevent overselling under concurrency. On any later failure, decremented stock is rolled back.
- Payments are **verified server-side** against Paystack/MoMo before an order is persisted. A payment `reference` may back exactly one order — replays are rejected (both a pre-check and a unique-index `11000` catch).
- Cancelling an order (`updateOrderStatus` → `Cancelled`) **deletes** the order and restores stock; it does not keep a cancelled row. Refunds (`refundOrder`) set `isRefunded` + `status='Cancelled'` instead, and call Paystack's `/refund` **first** so a "refunded" record never exists without the money actually moving.

When touching order/payment/promo logic, preserve these invariants: server-authoritative pricing, atomic stock, idempotent payment references, and "money moves before we record it."

### Payments
`backend/controllers/paymentController.js` supports two providers, both for the Ghana market (currency GHS):
- **Paystack** — at init the order intent is saved server-side as a `PendingOrder` keyed by the payment reference; after the customer pays, the order is finalized by **whichever arrives first** — the browser return (`POST /payments/paystack/finalize`) or the **webhook** (`POST /payments/paystack/webhook`). This means a paid order is not lost if the customer's browser never returns. `finalizeOrderFromReference` (in `orderController`) is idempotent — the unique `paystackReference` index plus an existing-order short-circuit guarantee exactly one order even if both paths race. The webhook verifies Paystack's **HMAC-SHA512 signature** (`x-paystack-signature`) against the raw request body before trusting the event, and is mounted in `server.js` *before* the rate limiter so retries aren't throttled. **Ops:** the webhook URL must be registered in the Paystack dashboard.
- **MTN MoMo** — `requesttopay` flow, sandbox vs. production via `MOMO_ENV`. `getMoMoTransaction` is reused by the order controller for server-side verification.

Order creation logic lives in one HTTP-agnostic core, `buildOrder()` in `orderController.js` (validates items, atomically reserves stock, prices server-side, verifies payment, saves, emails). `createOrder`, `createGuestOrder`, and the Paystack finalizer are all thin callers of it — keep new order paths going through `buildOrder` so the money invariants stay in one place. It throws `httpError(status, msg)`; `errorMiddleware` honors `err.statusCode`.

### Email
All transactional email goes through `sendResendEmail` in `backend/utils/email.js` (Resend API, raw `https` request — no SDK). **Always** wrap user-controlled strings with `escapeHtml` before interpolating into email HTML. Email sends are fire-and-forget (`.catch` logged) so a mail failure never fails the underlying order/status operation.

### Routing & access control
- Backend routes live in `backend/routes/*.js`, one file per resource, mounted under `/api/*` in `server.js`. Rate limiters from `backend/middlewares/limiters.js` are applied per-resource at mount time (auth, order, payment, promo, support each have their own bucket). Errors flow through `notFound` + `errorHandler` (`errorMiddleware.js`); controllers throw and set `res.status(...)` first.
- Frontend routes are declared in `frontend/src/App.jsx`. Customer-protected routes wrap in `<ProtectedRoute>`, admin routes in `<AdminRoute>`.

### Frontend state — no global store
There is **no Redux/Context store**. Cross-component state is plain modules over `localStorage` that broadcast `window` events, and components subscribe:
- `frontend/src/utils/productStore.js` — cached product list, fires `cindyProductsChanged`. **Note:** it deliberately does *not* fall back to a hardcoded sample catalogue when empty (showing fake products to real shoppers caused real problems). An empty list is the signal for a page to show its own loading/empty state.
- `frontend/src/utils/cart.js`, `wishlist.js`, `auth.js` follow the same localStorage + event pattern.
- `frontend/src/data/` holds static seed-ish content (categories/products) for display fallbacks, not the live catalogue.

### Observability
Sentry is wired on both sides (`backend/sentry.js` must be required **first** in `server.js`; `frontend/src/main.jsx` inits the React SDK). Both are no-ops unless a DSN env var is set. GA4 loads in production from `VITE_GA_MEASUREMENT_ID` with a hardcoded fallback ID in `main.jsx`.

## Environment variables

Backend (`.env`): `PORT`, `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NODE_ENV`, `FRONTEND_URL`, `PAYSTACK_SECRET_KEY`, `MOMO_ENV`/`MOMO_USER_ID`/`MOMO_API_KEY`/`MOMO_SUBSCRIPTION_KEY`, `RESEND_API_KEY`/`RESEND_FROM`, `SENTRY_DSN`.

Frontend (Vite, build-time): `VITE_SENTRY_DSN`, `VITE_GA_MEASUREMENT_ID`.

## Deploy notes

- Backend → Render via `render.yaml` (`startCommand: node backend/server.js`). `app.set('trust proxy', 1)` is required for correct client IPs behind Render's proxy (rate limiting depends on it).
- Frontend → Vercel. CORS on the backend is a **strict allow-list** in `server.js` (no `*.vercel.app` wildcard) — a new frontend origin must be added there or set via `FRONTEND_URL`.
- A weekly MongoDB backup runs via GitHub Actions (`.github/`).
