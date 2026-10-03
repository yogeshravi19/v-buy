# V FOODS Database Architecture Specification

This document details the PostgreSQL / Supabase database architecture for the V FOODS campus dining platform, including the complete schema, functions, triggers, security policies, and the Paytm three-way revenue settlement system.

---

## 1. Schema Overview & Entity Relationship

```
                       +----------------------------+
                       |          outlets           |
                       +----------------------------+
                                      | 1
                                      |
                 +--------------------+--------------------+
                 | 1                                       | 1
                 v 1                                       v *
+--------------------------------+               +--------------------+
|     outlet_paytm_accounts      |               |     menu_items     |
| (per-shop split % & Paytm sub) |               +--------------------+
+--------------------------------+                         |
                 ^                                         |
                 |                                         v *
                 | 1                            +----------------------+
                 |                              |     order_items      |
                 |                              +----------------------+
                 |                                         ^ *
                 |                                         | 1
+--------------------------------+               +--------------------+
|         payment_splits         | *           1 |       orders       |
|   (SHOP / PLATFORM / COLLEGE)  |-------------->| (token, status,    |
+--------------------------------+               |  shop_payout, total|
                 | *                             |  payment_id FK)    |
                 v 1                             +--------------------+
+--------------------------------+                         | 1
|            payments            |<------------------------+
| (Paytm direct order & top-up)  |
+--------------------------------+
                 | 1
                 v *
+--------------------------------+
|            refunds             |
+--------------------------------+
```

---

## 2. Table Definitions

### 2.1 Core Entities

#### `outlets`
Campus dining outlets and event food stalls.
- `id` (text, PK): e.g. `'main-canteen'`, `'tech-cafe'`.
- `name` (text, NOT NULL): Display name.
- `location` (text, NOT NULL): Physical location on campus.
- `is_event` (boolean, DEFAULT false): Whether outlet operates in event mode.
- `is_open` (boolean, DEFAULT true): Current operating status.

#### `menu_items`
Food and drink items offered by outlets.
- `id` (bigint, GENERATED ALWAYS AS IDENTITY PK).
- `outlet_id` (text, FK `outlets.id` ON DELETE CASCADE).
- `name` (text, NOT NULL).
- `price` (int, CHECK price > 0): In INR.
- `available` (boolean, DEFAULT true).
- `is_veg` (boolean, DEFAULT true).
- `category` (text, DEFAULT 'General').
- `available_from` (time, NULL): Available start time window.
- `available_to` (time, NULL): Available end time window.
- `stock_qty` (int, NULL): Available units; NULL for unlimited.
- `reserved_qty` (int, DEFAULT 0): Temporarily locked during payment pending.

#### `profiles`
User profiles extending `auth.users`.
- `id` (uuid, PK FK `auth.users.id` ON DELETE CASCADE).
- `full_name` (text, DEFAULT '').
- `role` (user_role ENUM: `'customer'`, `'staff'`, `'shop_admin'`, `'super_admin'`, `'admin'`).
- `cust_type` (cust_type ENUM: `'student'`, `'faculty'`, `'visitor'`).
- `outlet_id` (text, NULL FK `outlets.id`): Assigned stall for staff/shop admins.
- `phone` (text, NULL): Used for WhatsApp/SMS notifications.
- `created_at` (timestamptz, DEFAULT now()).

#### `wallets`
Prepaid digital campus wallet balances.
- `user_id` (uuid, PK FK `profiles.id` ON DELETE CASCADE).
- `balance` (int, DEFAULT 0 CHECK balance >= 0).
- `updated_at` (timestamptz, DEFAULT now()).

#### `wallet_txns`
Audit ledger of all credits, debits, orders, and refunds.
- `id` (bigint, GENERATED ALWAYS AS IDENTITY PK).
- `user_id` (uuid, FK `profiles.id` ON DELETE CASCADE).
- `amount` (int): Positive for credits, negative for debits.
- `kind` (text, CHECK `'topup'`, `'order'`, `'refund'`, `'admin_credit'`).
- `ref` (text, UNIQUE): Idempotency key (e.g. `'paytm:TXN123'`, `'order:456'`).
- `note` (text, NULL).
- `created_at` (timestamptz, DEFAULT now()).

#### `orders`
Food orders placed by students/customers.
- `id` (bigint, GENERATED ALWAYS AS IDENTITY PK).
- `user_id` (uuid, FK `profiles.id` ON DELETE RESTRICT).
- `outlet_id` (text, FK `outlets.id` ON DELETE RESTRICT).
- `token` (text, NULL): 3-digit daily counter pickup code.
- `status` (order_status ENUM: `'payment_pending'`, `'placed'`, `'preparing'`, `'ready'`, `'collected'`, `'cancelled'`).
- `payment_method` (payment_method ENUM: `'wallet'`, `'gateway'`).
- `shop_payout` (int, CHECK shop_payout > 0): Raw subtotal for items.
- `total` (int, CHECK total > 0): Student bill (`ceil(shop_payout * 1.05)`).
- `my_profit` (int, GENERATED ALWAYS AS `(shop_payout * 5 / 100)` STORED).
- `payment_id` (bigint, NULL FK `payments.id` ON DELETE SET NULL).
- `pickup_slot_id` (uuid, NULL FK `pickup_slots.id`).
- `group_id` (uuid, NULL).
- `is_group_payer` (boolean, DEFAULT false).
- `cancel_reason` (text, NULL).
- `expires_at` (timestamptz, NULL): Expiration for pending gateway orders.
- `created_at` (timestamptz, DEFAULT now()).
- `updated_at` (timestamptz, DEFAULT now()).

#### `order_items`
Line items in an order with snapshot prices.
- `order_id` (bigint, FK `orders.id` ON DELETE CASCADE).
- `item_id` (bigint, FK `menu_items.id` ON DELETE RESTRICT).
- `name` (text, NOT NULL): Snapshot at order time.
- `price` (int, NOT NULL): Snapshot at order time.
- `qty` (int, NOT NULL CHECK qty > 0).
- PRIMARY KEY (`order_id`, `item_id`).

---

### 2.2 Paytm Payment Architecture & Three-Way Revenue Settlement

#### `payments`
Unified ledger of all payment attempts across both Wallet Top-Up and Direct Order Payment.
- `id` (bigint, GENERATED ALWAYS AS IDENTITY PK).
- `user_id` (uuid, FK `profiles.id` ON DELETE RESTRICT).
- `order_id` (bigint, NULL FK `orders.id` ON DELETE SET NULL).
- `wallet_txn_id` (bigint, NULL FK `wallet_txns.id` ON DELETE SET NULL).
- `amount` (numeric, CHECK amount > 0): In INR.
- `payment_purpose` (text, CHECK `'ORDER'`, `'WALLET_TOPUP'`).
- `payment_method` (text, CHECK `'UPI_ID'`, `'UPI_APP'`, `'UPI_QR'`, `'DEBIT_CARD'`, `'CREDIT_CARD'`, `'WALLET'`).
- `status` (text, DEFAULT 'PENDING' CHECK `'PENDING'`, `'SUCCESS'`, `'FAILED'`, `'CANCELLED'`, `'REFUNDED'`).
- `paytm_order_id` (text, NULL): Merchant order reference sent to Paytm.
- `paytm_txn_id` (text, NULL UNIQUE): Paytm bank transaction ID (idempotency key).
- `payment_reference` (text, NULL): Internal tracking reference.
- `paid_at` (timestamptz, NULL): Timestamp when marked SUCCESS.
- `failure_reason` (text, NULL): Paytm gateway error response message.
- `created_at` (timestamptz, DEFAULT now()).
- `updated_at` (timestamptz, DEFAULT now()).

#### `outlet_paytm_accounts`
Per-shop Paytm recipient sub-accounts with outlet-configurable split shares.
- `outlet_id` (text, PK FK `outlets.id` ON DELETE CASCADE).
- `paytm_account_id` (text, NOT NULL): Shop's registered Paytm merchant ID.
- `onboarding_status` (text, DEFAULT 'PENDING' CHECK `'PENDING'`, `'ACTIVE'`, `'REJECTED'`).
- `settlement_enabled` (boolean, DEFAULT false).
- `shop_split_percentage` (numeric, DEFAULT 90 CHECK BETWEEN 0 AND 100).
- `created_at` (timestamptz, DEFAULT now()).
- `updated_at` (timestamptz, DEFAULT now()).

#### `platform_settlement_account`
Startup platform settlement account (singleton row `id = 1`).
- `id` (int, PK DEFAULT 1 CHECK id = 1).
- `paytm_account_id` (text, NOT NULL): V Foods company Paytm merchant ID.
- `settlement_enabled` (boolean, DEFAULT false).
- `platform_split_percentage` (numeric, DEFAULT 5 CHECK BETWEEN 0 AND 100).
- `created_at` (timestamptz, DEFAULT now()).
- `updated_at` (timestamptz, DEFAULT now()).

#### `college_settlement_accounts`
Campus institution settlement accounts (one active row per campus).
- `id` (bigint, GENERATED ALWAYS AS IDENTITY PK).
- `campus_name` (text, NOT NULL): e.g. `'VIT Chennai'`.
- `paytm_account_id` (text, NOT NULL): University institution Paytm ID.
- `onboarding_status` (text, DEFAULT 'PENDING' CHECK `'PENDING'`, `'ACTIVE'`, `'REJECTED'`).
- `settlement_enabled` (boolean, DEFAULT false).
- `is_active` (boolean, DEFAULT true): Only one active campus at a time.
- `college_split_percentage` (numeric, DEFAULT 5 CHECK BETWEEN 0 AND 100).
- `created_at` (timestamptz, DEFAULT now()).
- `updated_at` (timestamptz, DEFAULT now()).
- Constraint: `CREATE UNIQUE INDEX idx_college_single_active ON college_settlement_accounts(is_active) WHERE is_active = true;`

#### `payment_splits`
Individual settlement payouts computed for every completed order.
- `id` (bigint, GENERATED ALWAYS AS IDENTITY PK).
- `payment_id` (bigint, FK `payments.id` ON DELETE CASCADE).
- `recipient_type` (text, CHECK `'SHOP'`, `'PLATFORM'`, `'COLLEGE'`).
- `outlet_paytm_account_id` (text, NULL FK `outlet_paytm_accounts.outlet_id` ON DELETE RESTRICT).
- `platform_account_id` (int, NULL FK `platform_settlement_account.id` ON DELETE RESTRICT).
- `college_account_id` (bigint, NULL FK `college_settlement_accounts.id` ON DELETE RESTRICT).
- `split_amount` (numeric, CHECK split_amount >= 0).
- `split_percentage` (numeric, NULL CHECK BETWEEN 0 AND 100).
- `settlement_status` (text, DEFAULT 'PENDING' CHECK `'PENDING'`, `'SETTLED'`, `'FAILED'`).
- `settlement_reference` (text, NULL): Paytm disbursement transaction reference.
- `settled_at` (timestamptz, NULL).
- `created_at` (timestamptz, DEFAULT now()).
- Constraint:
  ```sql
  CHECK (
    (recipient_type = 'SHOP' AND outlet_paytm_account_id IS NOT NULL AND platform_account_id IS NULL AND college_account_id IS NULL) OR
    (recipient_type = 'PLATFORM' AND platform_account_id IS NOT NULL AND outlet_paytm_account_id IS NULL AND college_account_id IS NULL) OR
    (recipient_type = 'COLLEGE' AND college_account_id IS NOT NULL AND outlet_paytm_account_id IS NULL AND platform_account_id IS NULL)
  )
  ```

#### `refunds`
Audit log of processed and pending customer refunds.
- `id` (bigint, GENERATED ALWAYS AS IDENTITY PK).
- `payment_id` (bigint, FK `payments.id` ON DELETE RESTRICT).
- `order_id` (bigint, NULL FK `orders.id` ON DELETE SET NULL).
- `wallet_txn_id` (bigint, NULL FK `wallet_txns.id` ON DELETE SET NULL).
- `refund_type` (text, CHECK `'ORDER_REFUND'`, `'WALLET_TOPUP_REFUND'`, `'SPLIT_REFUND'`).
- `amount` (numeric, CHECK amount > 0).
- `status` (text, DEFAULT 'PENDING' CHECK `'PENDING'`, `'SUCCESS'`, `'FAILED'`).
- `paytm_refund_id` (text, NULL).
- `reason` (text, NULL).
- `created_at` (timestamptz, DEFAULT now()).
- `processed_at` (timestamptz, NULL).

---

## 3. General Payment-Confirmation Flow

1. **Frontend Isolation**: The frontend client never decides or confirms a payment succeeded. It only displays a temporary "Processing" state and listens for realtime updates from Supabase.
2. **Signed Webhook Ingestion**: When a transaction concludes, Paytm sends an HTTPS POST webhook containing `CHECKSUMHASH` and `TXNID` to the FastAPI backend at `/webhooks/paytm`.
3. **Cryptographic Checksum Verification**: The FastAPI backend recomputes the HMAC-SHA256 signature using `PAYTM_MERCHANT_KEY`. Any unsigned, forged, or altered request is rejected with HTTP 400.
4. **Idempotent DB Procedure**: The backend invokes `verify_and_record_payment()` in PostgreSQL. If the transaction was already processed, it returns immediately without duplicating work.
5. **Path Execution**:
   - For `WALLET_TOPUP`: Credits the user's wallet via `credit_wallet()` and links `wallet_txns.id`. Top-ups are never split.
   - For `ORDER`: Marks the order `placed`, issues the 3-digit token, decrements stock, and calls `calculate_order_split()` to record the 3 split rows.
6. **Network Reliability**: Because confirmation occurs server-to-server, if a student closes their browser or their battery dies right after paying in UPI, confirmation is unaffected.

---

## 4. The Three-Way Revenue Split Explained

- **Shop Split (Configurable per Outlet)**:
  - Each stall owner negotiates a split percentage (default 90%). Stored in `outlet_paytm_accounts.shop_split_percentage`.
  - Differing stalls can have differing rates (e.g. 90% for Main Canteen, 85% for Tech Café).
- **Platform Split (Fixed App-Wide)**:
  - V Foods platform fee (default 5%) stored in `platform_settlement_account.platform_split_percentage`.
- **College Split (Fixed per Campus)**:
  - University institutional royalty (default 5%) stored in `college_settlement_accounts.college_split_percentage`.
- **Trigger Invariant**:
  A PostgreSQL trigger enforces that for any outlet:
  $$\text{Shop \%} + \text{Platform \%} + \text{College \%} = 100\%$$
- **Penny Conservation**:
  The college share takes the residual difference $(Total - Shop - Platform)$ to guarantee exact zero-penny rounding leakage.

---

## 5. Security & Row Level Security (RLS)

- **No Card / PIN Data**: No column stores card PAN, CVV, expiry dates, or UPI PINs.
- **RLS Access Rules**:
  - `payments`: Customers view only their own payments. Staff and Shop Admins view payments for their own outlet via the linked order. Super Admins view all.
  - `payment_splits`: Shop Staff/Admins can view ONLY their own outlet's `SHOP`-type rows. `PLATFORM` and `COLLEGE` rows are visible only to Super Admins. Students have zero access.
  - `outlet_paytm_accounts`: Shop Admins view and manage only their outlet's row. Super Admins manage all.
  - `platform_settlement_account` & `college_settlement_accounts`: Restricted exclusively to Super Admins.
  - `refunds`: Users view own refunds; staff view outlet-scoped order refunds; Super Admins view all.
