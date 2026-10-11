# Payments & Paytm: Dual Payment Architecture & Three-Way Automated Revenue Split

A comprehensive, plain-English architectural guide to how payments work in V FOODS, how Paytm payment confirmation operates end-to-end, and how automated three-way revenue splitting (Shop, Platform, College) is handled.

---

## 1. The Dual Payment Choice: Wallet Top-Up vs. Direct Order Payment

V FOODS supports **both** payment paths for maximum speed and customer flexibility:

1. **Path 1: Wallet Top-Up (Prepaid Campus Wallet)**
   - **How it works**: Students add money to their digital campus wallet when convenient (e.g. from their dorm room or in the morning) via Paytm UPI or Cards.
   - **Splitting Rule**: **NEVER split**. A top-up is a 100% store of value credited directly to the student's wallet balance.
   - **Confirmation**: Confirmed strictly via Paytm's signed server-to-server webhook, credited through the idempotent `credit_wallet()` procedure.

2. **Path 2: Direct Order Payment (Instant Gateway Checkout)**
   - **How it works**: Students pay Paytm directly for one specific food order, bypassing the wallet balance completely.
   - **Splitting Rule**: Confirmed via Paytm webhook before the order is marked `placed` and sent to the kitchen KDS screen. Once confirmed, it triggers the three-way split.
   - **Why use it**: Perfect for visitors, faculty, or students who prefer direct bank debit per meal without maintaining a wallet balance.

Both paths support payment methods: `UPI_ID`, `UPI_APP`, `UPI_QR`, `DEBIT_CARD`, `CREDIT_CARD` (and `WALLET` internally for campus wallet orders).

---

## 2. Confirmation of What Existed vs. What Was Added

| Payment Path / Component | Status Prior to Architecture Update | Current Status After Migration 011 |
| :--- | :--- | :--- |
| **Wallet Top-Up Flow** | Existed via PhonePe sandbox routes (`POST /wallet/topup`) and Supabase `credit_wallet()`. | **Migrated to Paytm**: Implemented `POST /wallet/topup/paytm`, signed payload generation, and verified webhook crediting. |
| **Direct Order Payment Flow** | Existed conceptually via `orders.payment_method = 'gateway'`, `create_pending_gateway_order()`, and `finalize_gateway_order()`. | **Fully Unified**: Added `POST /order/checkout/paytm-session`, `payments` record linkage, and automatic three-way split upon webhook confirmation. |
| **Payment Gateway** | PhonePe SDK mock / sandbox (`phonepe_txn_id` primary key). | **Paytm Production Architecture**: Replaced with Paytm merchant configuration, HMAC-SHA256 checksum verification, and `paytm_txn_id` tracking. |
| **Revenue Splitting** | Did not exist (orders only had a generated column `my_profit = shop_payout * 5%`). | **Three-Way Automated Split (`payment_splits`)**: Configurable outlet accounts, fixed platform account, active college account, and exact penny split records. |
| **Sub-Account Onboarding** | None. | Added `outlet_paytm_accounts`, `platform_settlement_account`, and `college_settlement_accounts`. |
| **Refunds Schema** | None. | Added unified `refunds` table supporting `ORDER_REFUND`, `WALLET_TOPUP_REFUND`, and `SPLIT_REFUND`. |

---

## 3. General Payment-Confirmation Flow

Payment confirmation follows strict zero-trust, server-authoritative principles:

```
[Student Device]                 [Paytm Gateway]                [FastAPI Server]             [Supabase DB]
      |                                 |                              |                           |
      | 1. Initiates Payment           |                              |                           |
      |-------------------------------->|                              |                           |
      | 2. Authorizes UPI/Card         |                              |                           |
      |    (Shows "Processing...")      |                              |                           |
      |                                 | 3. Signed Webhook Callback   |                           |
      |                                 |    (CHECKSUMHASH + TXNID)    |                           |
      |                                 |----------------------------->|                           |
      |                                 |                              | 4. Verify HMAC-SHA256     |
      |                                 |                              |    Signature Match        |
      |                                 |                              |-------------------------- |
      |                                 |                              | 5. verify_and_record_payment
      |                                 |                              |-------------------------->|
      |                                 |                              |                           | 6. Check Idempotency
      |                                 |                              |                           |    If Topup -> credit_wallet()
      |                                 |                              |                           |    If Order -> calculate_order_split()
      | 7. Realtime Push (order placed) |                              |                           |<--------------------------|
      |<-------------------------------------------------------------------------------------------|
```

### Core Security Rules:
1. **The frontend NEVER decides a payment succeeded**: The frontend only ever displays "Processing" until the database status updates. Even if a student's phone claims a payment finished, the backend and kitchen screens ignore it completely until the server-side callback arrives.
2. **Paytm sends a signed webhook callback**: When the transaction completes on Paytm's banking infrastructure, Paytm's server fires an HTTPS POST callback directly to our FastAPI endpoint `/webhooks/paytm`.
3. **Backend verifies Paytm's checksum signature**: The backend recalculates the HMAC-SHA256 checksum using the private `PAYTM_MERCHANT_KEY`. If the signature is missing, forged, or fails verification, the webhook is rejected outright with an HTTP 400 Bad Request error.
4. **Action only after signature verification**: Only after cryptographic verification does the backend execute `verify_and_record_payment()` in PostgreSQL.
   - For `WALLET_TOPUP`: Credits the wallet via the existing idempotent `credit_wallet()` stored procedure.
   - For `ORDER`: Marks the order `placed`, issues the pickup token, decrements menu item stock, and triggers `calculate_order_split()`.
5. **Idempotency against network retries**: Paytm retries webhooks multiple times if network packets drop. The system checks `payments.paytm_txn_id` and `wallet_txns.ref`. Whether the webhook arrives once or five times, it produces the exact same result with zero duplicate payments and zero double-credits.
6. **Student connection resilience**: If the student's phone battery dies, closes the browser, or loses cellular connectivity right after paying in their UPI app, confirmation is completely unaffected. The confirmation travels server-to-server between Paytm and V Foods, not through the student's device.

---

## 4. The Three-Way Split (Shop, Platform, College)

Every meal order in V Foods—whether paid directly via Paytm or funded using the campus wallet—generates an automated, three-way revenue distribution record in `payment_splits`. Top-ups are never split.

### The Three Recipients:
1. **SHOP (The Fulfilling Outlet)**:
   - Differs per shop: Each outlet has its own distinct Paytm sub-account (`outlet_paytm_accounts`) and its own configurable `shop_split_percentage` (default **90%**).
   - For example, Main Canteen may have 90%, while Tech Café may have 85% or 92% based on their commercial agreement.
2. **PLATFORM (V Foods Startup)**:
   - One fixed account (`platform_settlement_account`) app-wide for the startup company (`platform_split_percentage` = **5%**).
3. **COLLEGE (Host Institution / Campus)**:
   - One fixed account (`college_settlement_accounts`) for the current active campus (`college_split_percentage` = **5%**).
   - Structured with `is_active` boolean and partial unique index, allowing seamless expansion to future campuses (e.g. VIT Vellore, VIT AP, or SRM).

### Percentage Balancing Rule (100% Invariant):
- The database enforces an unchangeable constraint via trigger:
  $$\text{Shop Percentage} + \text{Platform Percentage} + \text{College Percentage} = 100\%$$
- When calculating penny split amounts from the order total, the platform and shop amounts are rounded to 2 decimal places, and the college receives the exact penny residual. This guarantees that:
  $$\text{Split}_{\text{Shop}} + \text{Split}_{\text{Platform}} + \text{Split}_{\text{College}} \equiv \text{Order Total}$$

---

## 5. Sub-Account Onboarding & Settlement Schema

Every recipient must be onboarded with Paytm before split payouts can be disbursed:

```sql
-- Outlet sub-accounts (per shop)
CREATE TABLE outlet_paytm_accounts (
  outlet_id               text PRIMARY KEY REFERENCES outlets(id),
  paytm_account_id        text NOT NULL,
  onboarding_status       text NOT NULL CHECK (onboarding_status IN ('PENDING', 'ACTIVE', 'REJECTED')),
  settlement_enabled      boolean NOT NULL DEFAULT false,
  shop_split_percentage   numeric NOT NULL DEFAULT 90 CHECK (shop_split_percentage BETWEEN 0 AND 100),
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- Platform settlement account (singleton startup row)
CREATE TABLE platform_settlement_account (
  id                          int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  paytm_account_id            text NOT NULL,
  settlement_enabled          boolean NOT NULL DEFAULT false,
  platform_split_percentage   numeric NOT NULL DEFAULT 5 CHECK (platform_split_percentage BETWEEN 0 AND 100),
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

-- College settlement accounts (one active campus)
CREATE TABLE college_settlement_accounts (
  id                          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campus_name                 text NOT NULL,
  paytm_account_id            text NOT NULL,
  onboarding_status           text NOT NULL CHECK (onboarding_status IN ('PENDING', 'ACTIVE', 'REJECTED')),
  settlement_enabled          boolean NOT NULL DEFAULT false,
  is_active                   boolean NOT NULL DEFAULT true,
  college_split_percentage    numeric NOT NULL DEFAULT 5 CHECK (college_split_percentage BETWEEN 0 AND 100),
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_college_single_active ON college_settlement_accounts(is_active) WHERE is_active = true;
```

---

## 6. Security Confirmation & PCI Compliance

- **No Sensitive Financial Credentials Stored**: No column anywhere in the V Foods database stores credit/debit card numbers, CVVs, expiry dates, or UPI PINs.
- **Paytm Secret Isolation**: Paytm merchant secret keys (`PAYTM_MERCHANT_KEY`) are stored solely as environment variables in the secure FastAPI server runtime and never exposed to the frontend or database tables.
- **Row Level Security (RLS)**:
  - Students can only view their own payment and refund records.
  - Shop Staff and Shop Admins can only view payments and `SHOP`-type split rows for their own outlet.
  - Platform and College settlement accounts, and platform/college split records, are restricted exclusively to Super Admins.

---

## 7. Order-Before-Payment Lifecycle & State Machine

Direct payment checkout creates the database order record before redirecting the customer to Paytm:

- **Order Pre-Creation**:
  - `POST /order/checkout/paytm-session` creates an `orders` row with status `awaiting_payment` and persists snapshot rows in `order_items`.
  - Links the order to a `payments` row with status `PENDING` and a 10-minute validity timestamp in `expires_at`.
- **Queue and Staff Isolation**:
  - Orders in `awaiting_payment` are strictly filtered out of Shop Staff, Shop Admin, and Kitchen Display Systems (KDS).
  - No pickup counter token is assigned until payment is verified.
- **Stock Validation Strategy (Stock Check at Confirmation Time)**:
  - Stock is evaluated dynamically at confirmation time rather than holding reservations.
  - *Rationale*: Short inventory locks on a campus app cause inventory paralysis if multiple students abandon gateway checkouts. Validating at confirmation guarantees zero locked food items, paired with instant automated refunds if an item sells out in the interim.
- **State Progression**:
  - Unpaid -> `awaiting_payment`
  - Webhook / Reconciliation Verified -> `paid` -> `confirmed` (Token issued, enters kitchen queue, triggers three-way split calculation).
  - Unpaid after 10 minutes -> `expired` (Auto-cleaned by database cron).

---

## 8. What Happens in Each Payment Case

- **Case 1: Failed Payment**
  - Paytm user cancels, bank declines, or payment fails.
  - Paytm returns status `TXN_FAILURE` or `FAILURE`.
  - The `payments` row is updated to `FAILED` with `failure_reason`.
  - The associated order is transitioned from `awaiting_payment` to `expired`.
  - Exactly **zero refunds** are created.
  - The order never appears in kitchen screens or staff queues.

- **Case 2: Pending Payment (Mid-Flight)**
  - Customer completes UPI authorization or closes browser before redirect finishes.
  - The `payments` row remains in `PENDING`.
  - The order remains in `awaiting_payment`.
  - Pay button on frontend is disabled; subsequent checkout attempts reuse the pending session to prevent accidental double-payment.
  - Automated status poller periodically checks the backend; if still unresolved after 10 minutes, the background job marks the order `expired`.

- **Case 3: Payment Succeeded but Order Cannot Be Fulfilled**
  - Customer payment debited successfully (`TXN_SUCCESS`), but one of the following occurs:
    - An ordered item sold out between checkout initiation and payment confirmation.
    - The outlet closed its shift in the interim.
    - The order row expired due to delay.
  - `verify_and_record_payment()` detects the stockout or closure and returns `refund_needed`.
  - The order is marked `cancelled` with a clear explanation (`cancel_reason`).
  - **The order never enters the kitchen queue and never triggers revenue splits.**
  - An automatic refund is immediately dispatched to Paytm's Refund API.
  - The customer is notified with a plain message and refund tracking reference.

---

## 9. Reconciliation Architecture

Reconciliation provides guaranteed self-healing for dropped webhooks or dormant server instances:

- **Dual-Trigger Architecture**:
  1. **User Return Check (`POST /order/{order_id}/check-payment-status`)**:
     - Triggered automatically when the customer returns to the application or taps "Check payment status".
     - Never trusts the browser: directly queries Paytm's Transaction Status API server-to-server.
     - Resolves the payment via idempotent `verify_and_record_payment()`.
  2. **Scheduled Protected Worker (`POST /admin/payments/reconcile`)**:
     - Scans for payments in `PENDING` older than 5 minutes.
     - Queries Paytm's status API for each transaction.
     - Confirms successful payments, marks failed ones `FAILED`, and expires stale `awaiting_payment` orders.
- **Serverless-Safe Scheduling (`pg_cron` + `pg_net`)**:
  - Free web hosts sleep during idle periods, rendering in-memory schedulers unreliable.
  - V FOODS utilizes Supabase database-level `pg_cron` with `pg_net` to trigger automated health and expiration sweeps independently of whether the application server is awake:
    ```sql
    SELECT cron.schedule('expire-stale-awaiting-orders', '*/2 * * * *', 'SELECT expire_stale_awaiting_orders(10);');
    ```
- **Security & Rate Limiting**:
  - Protected by bearer secret token `RECONCILIATION_SECRET`.
  - Rate limited to prevent denial-of-service on external payment gateways.
  - Output scrubbed: never exposes banking credentials, tokens, or PII.

---

## 10. Automated Refunds System

All refunds follow strict idempotency and deterministic accounting:

- **Deterministic Refund Reference**:
  - Every refund uses a deterministic unique key format: `refund-<payment_id>`.
  - Enforced by a `UNIQUE` database constraint on `refunds.refund_ref`.
  - Retries, network timeouts, or repeated webhook deliveries can never generate duplicate refunds.
- **Refund Types**:
  - `ORDER_REFUND`: Refund issued to the customer for an unfulfillable or cancelled food order.
  - `WALLET_TOPUP_REFUND`: Refund issued if a wallet credit fails irrecoverably.
  - `SPLIT_REFUND`: Settlement clawback accounting reversing distributed revenue.
- **Refund Destination by Order Source**:
  - **Direct Paytm Orders**: Refunded directly to the student's original payment method (bank account, debit card, UPI VPA) via Paytm Refund API.
  - **Wallet Orders**: Refunded instantly back into the student's campus wallet balance using `credit_wallet(..., kind='refund')`.
- **Order Cancellation Permissions**:
  - **Customer Cancellation**: Permitted only before the kitchen marks the order `preparing`.
  - **Staff Cancellation**: Permitted if items run out or equipment malfunctions; automatically triggers full refund.
- **Refund Webhooks & Status Check**:
  - Endpoint `POST /webhooks/paytm/refund` validates Paytm's cryptographic checksum and idempotently updates `refunds.status`.
  - Background endpoint `POST /admin/refunds/reconcile` queries Paytm Refund Status API for any refunds pending longer than 5 minutes.
  - Status is updated to `SUCCESS` strictly upon gateway confirmation.

---

## 11. Split Settlement & Refunds

- **Settlement Deductions**:
  - According to Paytm merchant documentation, when an order is refunded, Paytm deducts the refunded amount from the merchant's pending settlement balance prior to daily bank payout.
- **Multi-Party Split Reversals**:
  - In three-way split arrangements (Shop, Platform, College), refunding an order invalidates the revenue shares calculated at confirmation.
  - V FOODS records reversal rows in `refunds` categorized as `SPLIT_REFUND` and marks un-disbursed split rows in `payment_splits` as `FAILED` / cancelled.
- **Items Pending Account Manager Confirmation**:
  - *Clawback from Sub-Accounts*: Does Paytm automatically claw back disbursed funds from individual vendor sub-merchant accounts, or does it debit the master parent merchant pool?
  - *Convenience Fee Reversals*: Confirm whether Paytm's gateway processing fee on the 7% convenience charge is refunded or retained during full customer refunds.

---

## 12. User Experience & Visibility

- **Payment State Feedback**:
  - Upon completing gateway authorization, the UI displays: *"Payment received, confirming your order..."* with an animated progress indicator.
  - The pay button is disabled to prevent duplicate transactions.
- **Delayed Confirmation Notice**:
  - If gateway verification takes longer than 10 seconds, the UI automatically displays:
    > *"Verification is taking a little longer than usual. Order reference: #ORD-XXXX. If your payment was debited and the order cannot complete, your money will be refunded automatically to your source account."*
- **Order History & Status Tracking**:
  - Every order card clearly communicates plain-language refund statuses:
    - *"Refund sent to your bank or wallet on [Date]"*
    - *"Refund started: In progress with Paytm"*
    - *"Refund failed - please contact campus support"*
- **Super Admin Attention Dashboard**:
  - Super Admins have a dedicated **"Payments Needing Attention"** panel identifying:
    - Payments stuck in `PENDING` > 5 minutes.
    - Payments in `SUCCESS` whose orders remain unconfirmed.
    - Refunds stuck in `PENDING` or `FAILED`.
  - Shop Admins see this view strictly scoped to their assigned outlet.

---

## 13. Payments & Refunds User Center & Contextual FAQ

Accessible directly from the User Account/Profile screen (`CustomerDashboard.tsx`), the **Payments & Refunds** section connects the user to live gateway states without generic "Contact Paytm" dead-ends:

1. **Active Discrepancies Banner**:
   - Highlighted whenever an unresolved transaction is detected (e.g., payment debited but order awaiting confirmation, or pending refund).
   - Shows live countdown timer (10s cooldown) and **Check Status** button calling FastAPI `/order/{id}/check-payment-status`.
2. **Payment & Refund History**:
   - Clear distinction between **Payment Status** (`SUCCESS`, `PENDING`, `FAILED`) and **Order Status** (`placed`, `preparing`, `cancelled`, etc.).
   - Full refund tracking badges displaying current state machine stage (`REFUND_INITIATED`, `REFUND_PROCESSING`, `REFUND_SUCCESS`, `REFUND_FAILED`).
   - Transaction details modal showing masked gateway references (e.g., `...77665544`) and exact failure reasons.
3. **Safe Wording Contextual FAQ**:
   - Answers critical student dining questions without making unauthorized bank SLA promises (e.g., explains gateway S2S verification, automatic refunds on kitchen stockouts, and when to show Order ID at the counter).

---

## 14. Role-Based Accounting & Reconciliation Permissions

| Role | Operational Scope | Permitted Actions | Sensitive Data Protection |
| :--- | :--- | :--- | :--- |
| **User** | Own orders and payments (`auth.uid() = user_id`) | Trigger rate-limited status verification, view refund reference, view order receipts. | Cannot view webhook logs, internal DB keys, or other users' payments. |
| **Shop Staff** | Permitted outlet orders | Operational issue lookup by Order ID / Token, trigger backend gateway status check if customer presents debited bank SMS at counter. | Cannot view merchant secrets, checksum hashes, platform commission splits, or other outlets' orders. Cannot manually force payment success. |
| **Shop Admin** | Permitted outlet payments, refunds, and daily totals | Filter ledger by date and status, view daily gross revenue, net payout, and total refunded. View outlet discrepancy list. | Restricted strictly to permitted outlet. Cannot modify global settlement credentials. |
| **Super Admin** | Platform-wide global visibility | Access global accounting metrics, run manual or scheduled reconciliation jobs, inspect S2S webhook audit logs (`webhook_events`), view multi-outlet audit trails. | Authoritative administrative oversight. System never logs plaintext secret merchant keys. |

