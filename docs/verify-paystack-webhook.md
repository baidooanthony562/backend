# Verifying the Paystack webhook in production

Follow this after the backend is deployed to Render. The in-memory tests prove
the logic; this proves the live wiring (dashboard config + real signatures +
the browser↔webhook race) that tests can't reach.

Webhook URL:

```
https://backend-9m2y.onrender.com/api/payments/paystack/webhook
```

## 1. Confirm the environment

On Render, check these are set for the backend service:

- `PAYSTACK_SECRET_KEY` — the **live** secret key (used both to verify payments and to check the webhook signature; the webhook will reject everything if this is wrong).
- `FRONTEND_URL` — the deployed frontend origin (used for the payment callback and emails).
- `MONGO_URI`, `RESEND_API_KEY` — DB and confirmation emails.

## 2. Register the webhook

Paystack Dashboard → **Settings → API Keys & Webhooks** → set **Webhook URL** to the URL above → save.

## 3. Health check (endpoint is reachable and secured)

An unsigned POST should be **rejected with 401** — that's the healthy response (it means signature verification is on):

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://backend-9m2y.onrender.com/api/payments/paystack/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"charge.success","data":{"reference":"fake"}}'
# expect: 401
```

If you get 404, the route isn't deployed. If you get 200 to an unsigned body, signature verification is NOT working — stop and investigate.

## 4. Happy-path live test

1. On the live site, add an item to the cart and check out with **Paystack**.
2. Pay with a real card (use a small amount, or Paystack test mode + test card if the dashboard is in test mode).
3. Let the browser redirect back to `/payment/verify` → you should see "Payment successful" and land on the order confirmation page.
4. Confirm in the admin dashboard: the **order appears**, marked paid.
5. Confirm the **confirmation email** arrived.

## 5. The durability test (the whole point)

This proves the webhook covers a browser that never returns:

1. Start another Paystack checkout and pay.
2. **The instant** Paystack shows success, **close the tab** (or kill the network) before it redirects to `/payment/verify`.
3. Wait ~1 minute, then check the admin dashboard.
4. ✅ The order should **still be there** — created by the webhook, not the browser.

If the order is missing, the webhook isn't firing: re-check steps 1–3, and look at the logs (next step).

## 6. Read the logs (Render → Logs)

- Webhook firing and finalizing: no error log on success.
- Failures show `[Webhook] Order finalize failed: <reason>`.
- A signature mismatch returns 401 silently (no order) — usually a wrong `PAYSTACK_SECRET_KEY`.

## 7. Idempotency spot-check

For a normal purchase where both the browser AND the webhook finalize, confirm
there is **exactly one** order for that reference in the admin list (no
duplicates). The unique `paystackReference` index guarantees this; this is just
a visual confirmation.

## Rollback

If anything misbehaves, removing the Webhook URL in the Paystack dashboard
disables the server-side path instantly — checkout falls back to the
browser-return finalize with no redeploy. The code change itself is safe to
leave in place while you investigate.

## Notes

- Abandoned payments (started, never completed) leave a `PendingOrder` that
  self-deletes after 24h via a TTL index — no cleanup needed.
- The webhook is mounted before the rate limiter, so Paystack's retries are
  never throttled.
