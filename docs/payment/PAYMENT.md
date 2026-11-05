# Payment Architecture & Razorpay Integration

## 1. Principles
- Server-side authoritative amount calculation.
- Client cannot specify prices during payment creation.
- Dual verification:
  1. Frontend returns signature, verified via HMAC SHA256 using `RAZORPAY_KEY_SECRET`.
  2. Authoritative server-to-server Webhook (`payment.captured` / `order.paid`) processed with replay-protection & idempotency locks.
- Duplicate webhooks receive HTTP 200 OK and return early without duplicate ledger adjustments.
- Offline payment options (Cash on Counter, Bank Transfer / NEFT, Cheque) require Accounts department verification before releasing to production.
