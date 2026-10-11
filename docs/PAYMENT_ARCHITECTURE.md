# V FOODS — Complete Payment Architecture & Paytm Integration
## Comprehensive Architectural Specification

**Status**: Active Production Architecture  
**Target Platform**: V Foods Campus Dining (React + Vite + FastAPI + Supabase/PostgreSQL + Paytm Gateway)  
**Security Classification**: Non-Sensitive Developer & Systems Architecture Guide  

---

## 1. System Overview & Architecture Boundary

V Foods is a high-concurrency campus food ordering platform serving university food courts, canteens, and quick-service outlets. Payment operations must survive rush-hour peak concurrency (hundreds of orders per minute during class changeovers), unstable campus Wi-Fi, browser drops, and gateway delays without double-charging or overselling inventory.

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Zero Trust)"]
        UserApp["User App / PWA / Web"]
        StaffConsole["Shop Staff Console"]
        ShopAdmin["Shop Admin Portal"]
        SuperAdmin["Super Admin Console"]
    end

    subgraph BackendLayer ["FastAPI Service Layer"]
        OrderRoutes["Order & Checkout APIs"]
        TrackingRoutes["Payment & Refund Tracking APIs"]
        WebhookRoutes["Paytm S2S Webhook Ingestion"]
        ReconService["Scheduled Reconciliation Job"]
    end

    subgraph DataLayer ["Supabase / PostgreSQL Authority"]
        OrdersTable[("orders & order_items")]
        PaymentsTable[("payments & payment_splits")]
        RefundsTable[("refunds")]
        WebhookAudit[("webhook_events")]
        ReconAudit[("reconciliation_records")]
        WalletsTable[("wallets & wallet_txns")]
        SP_Verify["Stored Proc: verify_and_record_payment()"]
    end

    subgraph GatewayLayer ["Paytm Payment Gateway"]
        PaytmCheckout["Paytm Payment Engine"]
        PaytmStatusAPI["Paytm Transaction Status API"]
        PaytmRefundAPI["Paytm Refund & Refund Status API"]
        PaytmWebhooks["Paytm S2S Webhook Push"]
    end

    UserApp -->|1. Checkout Request| OrderRoutes
    OrderRoutes -->|2. Generate Signed Txn| PaytmCheckout
    PaytmCheckout -->|3. S2S Webhook Push| WebhookRoutes
    WebhookRoutes -->|4. HMAC-SHA256 & Atomic Record| SP_Verify
    SP_Verify --> PaymentsTable
    SP_Verify --> OrdersTable
    WebhookRoutes --> WebhookAudit

    UserApp -->|5. Check Status (Rate Limited)| TrackingRoutes
    TrackingRoutes -->|6. Query Gateway Status| PaytmStatusAPI
    TrackingRoutes --> ReconAudit

    ReconService -->|7. Stale Txn Query| PaytmStatusAPI
    ReconService --> SP_Verify

    SP_Verify -->|8. Out of Stock -> Trigger Refund| PaytmRefundAPI
    PaytmRefundAPI --> RefundsTable
    PaytmWebhooks -->|9. Refund S2S Push| WebhookRoutes
```

---

## 2. End-to-End Payment & Lifecycle Traceability

Every financial transaction in V Foods is strictly linked across systems:

```
USER
  ↓
ORDER (V Foods order ID + token)
  ↓
PAYMENT (V Foods payment ID)
  ↓
PAYTM TRANSACTION (Paytm Order ID + Paytm Txn ID)
  ↓
PAYTM WEBHOOK / STATUS API (Cryptographic Checksum Verification)
  ↓
PAYMENT VERIFICATION (Idempotent verify_and_record_payment RPC)
  ↓
ORDER CONFIRMATION (Atomic Row Lock & Stock Decrement)
  ↓
REFUND IF REQUIRED (Automatic if item sold out or cancelled)
  ↓
PAYTM REFUND (Deterministic refId = refund-{payment_id})
  ↓
REFUND STATUS / WEBHOOK (Idempotent record_refund RPC)
  ↓
RECONCILIATION (Audited in reconciliation_records)
  ↓
SETTLEMENT & ACCOUNTING (Role-based outlet & platform ledger)
```

---

## 3. Dual Payment Channels

V Foods provides two distinct payment channels:

### Channel A: Prepaid User Campus Wallet (Internal)
* **Execution**: Internal single-phase atomic database transaction (`place_order_wallet()`).
* **Gateway Involvement**: None during checkout. Paytm is used strictly during wallet top-ups (`POST /wallet/topup/paytm`).
* **Top-up Splitting Rule**: **Never split**. 100% of the top-up amount credits directly to the user's digital wallet float.
* **Failure Handling**: If order confirmation fails midway, wallet balance debit rolls back atomically with PostgreSQL transaction boundaries.

### Channel B: Direct Online Gateway Checkout (Paytm Direct)
* **Execution**: Two-phase authorization and confirmation.
* **Session Creation**: `POST /order/checkout/paytm-session` creates an awaiting order and pre-creates a `payments` row in `PENDING` status.
* **Paytm Identification**: `ORDERID = ORD-{order_id}-{timestamp}`.
* **Verification Authority**: FastAPI verifies Paytm HMAC-SHA256 signature and executes `verify_and_record_payment()`.
* **Revenue Splitting**: On payment confirmation, automated three-way revenue splitting allocates gross revenue among:
  1. Outlet Shop Payout (90–95%)
  2. Platform Fee (3–5%)
  3. College Infrastructure Royalty (1–2%)

---

## 4. Concurrency Safety & Rush-Hour Concurrency

### The Campus Dining Rush-Hour Problem
During class breaks, 20 users simultaneously attempt to purchase the last 5 units of a popular snack. If payments succeed at the gateway concurrently, ordinary asynchronous updates could oversell inventory.

### The V Foods Atomic Solution
1. **Frontend Has Zero Authority**: The frontend can never declare an order placed or stock decremented.
2. **Pessimistic Row-Level Locking (`SELECT FOR UPDATE`)**:
   In the PostgreSQL stored procedure `verify_and_record_payment()`, the database locks the target `menu_items` rows:
   ```sql
   SELECT stock_count, in_stock INTO v_stock, v_in_stock
   FROM public.menu_items
   WHERE id = item_rec.item_id
   FOR UPDATE;
   ```
3. **Deterministic Fulfillment Decision**:
   - If `v_stock >= item_rec.quantity` and `v_in_stock = TRUE`:
     - Deduct stock atomically: `UPDATE menu_items SET stock_count = stock_count - qty`.
     - Confirm order: `UPDATE orders SET status = 'placed'`.
     - Compute revenue split: `INSERT INTO payment_splits`.
     - Returns: `v_action = 'CONFIRMED'`, `v_refund_needed = FALSE`.
   - If stock is exhausted (`v_stock < qty`):
     - Mark order cancelled: `UPDATE orders SET status = 'cancelled', cancel_reason = 'Item sold out before payment confirmation'`.
     - Flag refund: Returns `v_action = 'REFUND_TRIGGERED'`, `v_refund_needed = TRUE`.
     - FastAPI automatically triggers `_paytm_initiate_refund(payment_id, amount, reason)` in background tasks.

---

## 5. Server Failure & Network Drop Recovery

| Failure Scenario | Immediate System Reaction | Recovery Mechanism |
| :--- | :--- | :--- |
| **Browser crashes after UPI debit** | User frontend never sends callback | Paytm S2S webhook reaches FastAPI independently and confirms order / sends token to KDS. |
| **S2S Webhook delayed or lost** | Order stays `awaiting_payment` in app | User taps **Check Status** on order or Payments & Refunds tab. Backend queries Paytm Transaction Status API and confirms order on the spot. |
| **User internet drops completely** | User visits counter physically | Shop staff views **Payment Issues** tab on Staff Console and triggers backend verification via Order ID or Token. |
| **FastAPI server restarts midway** | Background tasks interrupted | Scheduled Reconciliation Job (`POST /admin/payments/reconcile` running every 2 minutes) queries Paytm for all `PENDING` payments older than 2m. |
| **Item sells out while user pays** | Payment confirmed at Paytm but inventory exhausted | Stored procedure flags `refund_needed`. Automated 100% refund initiated to source payment method. |
| **Duplicate webhook delivery** | Paytm retries webhook 3 times | Idempotent database check on `payments.paytm_txn_id`. Duplicate callbacks return `HTTP 200` without duplicate credits. |

---

## 6. Official Paytm Documentation Verification

All Paytm integrations in V Foods adhere strictly to official Paytm Developer Documentation:

| Paytm Integration Feature | Official Documentation Reference | Clickable Official Link |
| :--- | :--- | :--- |
| **HMAC-SHA256 Checksum** | Paytm Checksum Generation & Verification | [Paytm Checksum SDK Docs](https://developer.paytm.com/docs/checksum/) |
| **Transaction Status Query** | Paytm Transaction Status API (v2) | [Paytm Transaction Status API](https://developer.paytm.com/docs/api/v2/transaction-status-api/) |
| **Refund Initiation** | Paytm Initiate Refund API | [Paytm Refund API](https://developer.paytm.com/docs/api/refund-api/) |
| **Refund Status Query** | Paytm Refund Status API | [Paytm Refund Status API](https://developer.paytm.com/docs/api/refund-status-api/) |
| **S2S Webhook Notifications** | Paytm Webhook Notifications & Signature Verification | [Paytm Webhooks Overview](https://developer.paytm.com/docs/webhooks/) |

---

## 7. Security & Compliance Rules

1. **Merchant Secrets**: `PAYTM_MERCHANT_KEY` and Supabase service role keys are stored exclusively in backend environment variables and NEVER passed to Vite, React, or browser clients.
2. **Masked References**: User and staff APIs only expose masked transaction references (e.g., `...77665544`), preventing sensitive token leakage.
3. **Rate Limiting**:
   - `POST /order/{order_id}/check-payment-status` enforces a strict 10-second per-order cooldown to prevent Paytm API flooding.
   - Global status check rate limiter caps queries at 30 requests/minute per user.
4. **Audit Logging**: Every manual status check, reconciliation run, and webhook push is immutably logged into `public.webhook_events` and `public.reconciliation_records`.
