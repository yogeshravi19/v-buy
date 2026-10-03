-- =============================================================================
-- Migration 011: Paytm Payment Gateway Architecture & Three-Way Split Schema
--
-- V FOODS Automated Revenue Settlement Architecture:
-- 1. Full schema for Paytm payments (Top-up & Direct Order Payment)
-- 2. Recipient sub-accounts:
--    - outlet_paytm_accounts (per-shop configurable split)
--    - platform_settlement_account (fixed 1 row startup account)
--    - college_settlement_accounts (1 active row per campus)
-- 3. payment_splits table with strict recipient constraints
-- 4. refunds table for split, order, and topup refunds
-- 5. orders table extension with payment_id FK
-- 6. Split validation trigger enforcing shop + platform + college = 100%
-- 7. Stored procedure calculate_order_split(order_id)
-- 8. Stored procedure verify_and_record_payment(...) (idempotent, SECURITY DEFINER)
-- 9. Integration with place_order_wallet() for uniform settlement accounting
-- 10. Comprehensive Row Level Security (RLS) policies
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PAYMENTS TABLE (Create or Migrate to Unified Paytm Schema)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- If legacy payments table exists with phonepe_txn_id as PK, migrate it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'phonepe_txn_id'
  ) THEN
    -- Rename legacy table to payments_legacy
    ALTER TABLE payments RENAME TO payments_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (
  id                bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid            NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  order_id          bigint          NULL REFERENCES orders(id) ON DELETE SET NULL,
  wallet_txn_id     bigint          NULL REFERENCES wallet_txns(id) ON DELETE SET NULL,
  amount            numeric         NOT NULL CHECK (amount > 0),
  payment_purpose   text            NOT NULL CHECK (payment_purpose IN ('ORDER', 'WALLET_TOPUP')),
  payment_method    text            NOT NULL CHECK (payment_method IN ('UPI_ID', 'UPI_APP', 'UPI_QR', 'DEBIT_CARD', 'CREDIT_CARD', 'WALLET')),
  status            text            NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED')),
  paytm_order_id    text            NULL,
  paytm_txn_id      text            NULL UNIQUE,
  payment_reference text            NULL,
  paid_at           timestamptz     NULL,
  failure_reason    text            NULL,
  created_at        timestamptz     NOT NULL DEFAULT now(),
  updated_at        timestamptz     NOT NULL DEFAULT now()
);

-- Copy legacy payments if table was renamed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_legacy') THEN
    INSERT INTO payments (
      user_id, order_id, amount, payment_purpose, payment_method, status, paytm_txn_id, payment_reference, created_at, updated_at
    )
    SELECT
      user_id,
      order_id,
      amount,
      CASE WHEN purpose = 'topup' THEN 'WALLET_TOPUP' ELSE 'ORDER' END,
      'UPI_APP',
      CASE WHEN status = 'SUCCESS' THEN 'SUCCESS'
           WHEN status = 'FAILED' THEN 'FAILED'
           ELSE 'PENDING' END,
      NULL,
      'legacy:' || phonepe_txn_id,
      created_at,
      updated_at
    FROM payments_legacy
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paytm_order ON payments(paytm_order_id);

CREATE OR REPLACE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RECIPIENT SUB-ACCOUNT TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 Outlet Paytm accounts (one per shop, configurable split)
CREATE TABLE IF NOT EXISTS outlet_paytm_accounts (
  outlet_id               text            PRIMARY KEY REFERENCES outlets(id) ON DELETE CASCADE,
  paytm_account_id        text            NOT NULL,
  onboarding_status       text            NOT NULL DEFAULT 'PENDING' CHECK (onboarding_status IN ('PENDING', 'ACTIVE', 'REJECTED')),
  settlement_enabled      boolean         NOT NULL DEFAULT false,
  shop_split_percentage   numeric         NOT NULL DEFAULT 90 CHECK (shop_split_percentage >= 0 AND shop_split_percentage <= 100),
  created_at              timestamptz     NOT NULL DEFAULT now(),
  updated_at              timestamptz     NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_outlet_paytm_accounts_updated_at
  BEFORE UPDATE ON outlet_paytm_accounts
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

-- 2.2 Platform settlement account (exactly one singleton row)
CREATE TABLE IF NOT EXISTS platform_settlement_account (
  id                          int             PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  paytm_account_id            text            NOT NULL,
  settlement_enabled          boolean         NOT NULL DEFAULT false,
  platform_split_percentage   numeric         NOT NULL DEFAULT 5 CHECK (platform_split_percentage >= 0 AND platform_split_percentage <= 100),
  created_at                  timestamptz     NOT NULL DEFAULT now(),
  updated_at                  timestamptz     NOT NULL DEFAULT now()
);

-- Seed singleton platform account if missing
INSERT INTO platform_settlement_account (id, paytm_account_id, settlement_enabled, platform_split_percentage)
VALUES (1, 'PAYTM_PLATFORM_VFOODS_01', true, 5)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE TRIGGER trg_platform_settlement_updated_at
  BEFORE UPDATE ON platform_settlement_account
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

-- 2.3 College settlement accounts (one active row per campus)
CREATE TABLE IF NOT EXISTS college_settlement_accounts (
  id                          bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campus_name                 text            NOT NULL,
  paytm_account_id            text            NOT NULL,
  onboarding_status           text            NOT NULL DEFAULT 'PENDING' CHECK (onboarding_status IN ('PENDING', 'ACTIVE', 'REJECTED')),
  settlement_enabled          boolean         NOT NULL DEFAULT false,
  is_active                   boolean         NOT NULL DEFAULT true,
  college_split_percentage    numeric         NOT NULL DEFAULT 5 CHECK (college_split_percentage >= 0 AND college_split_percentage <= 100),
  created_at                  timestamptz     NOT NULL DEFAULT now(),
  updated_at                  timestamptz     NOT NULL DEFAULT now()
);

-- Partial unique index: exactly one active campus settlement account
CREATE UNIQUE INDEX IF NOT EXISTS idx_college_single_active 
  ON college_settlement_accounts(is_active) 
  WHERE is_active = true;

-- Seed default VIT Chennai college account if missing
INSERT INTO college_settlement_accounts (campus_name, paytm_account_id, onboarding_status, settlement_enabled, is_active, college_split_percentage)
SELECT 'VIT Chennai', 'PAYTM_COLLEGE_VITC_01', 'ACTIVE', true, true, 5
WHERE NOT EXISTS (SELECT 1 FROM college_settlement_accounts WHERE is_active = true);

CREATE OR REPLACE TRIGGER trg_college_settlement_updated_at
  BEFORE UPDATE ON college_settlement_accounts
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

-- Seed outlet Paytm accounts for existing outlets if missing
INSERT INTO outlet_paytm_accounts (outlet_id, paytm_account_id, onboarding_status, settlement_enabled, shop_split_percentage)
SELECT 
  o.id,
  'PAYTM_OUTLET_' || upper(replace(o.id, '-', '_')),
  'ACTIVE',
  true,
  90
FROM outlets o
ON CONFLICT (outlet_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SPLIT PERCENTAGE VALIDATION TRIGGER (Shop + Platform + College = 100%)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_outlet_split_percentages()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_platform_pct numeric;
  v_college_pct  numeric;
  v_total_pct    numeric;
BEGIN
  SELECT platform_split_percentage INTO v_platform_pct 
  FROM platform_settlement_account WHERE id = 1;
  IF v_platform_pct IS NULL THEN v_platform_pct := 5; END IF;

  SELECT college_split_percentage INTO v_college_pct 
  FROM college_settlement_accounts WHERE is_active = true LIMIT 1;
  IF v_college_pct IS NULL THEN v_college_pct := 5; END IF;

  v_total_pct := NEW.shop_split_percentage + v_platform_pct + v_college_pct;
  IF v_total_pct <> 100 THEN
    RAISE EXCEPTION 'Split percentages must sum to 100 for outlet %. Got Shop (%) + Platform (%) + College (%) = %',
      NEW.outlet_id, NEW.shop_split_percentage, v_platform_pct, v_college_pct, v_total_pct;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_outlet_split ON outlet_paytm_accounts;
CREATE TRIGGER trg_validate_outlet_split
  BEFORE INSERT OR UPDATE ON outlet_paytm_accounts
  FOR EACH ROW EXECUTE FUNCTION validate_outlet_split_percentages();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PAYMENT SPLITS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_splits (
  id                          bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id                  bigint          NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  recipient_type              text            NOT NULL CHECK (recipient_type IN ('SHOP', 'PLATFORM', 'COLLEGE')),
  outlet_paytm_account_id     text            NULL REFERENCES outlet_paytm_accounts(outlet_id) ON DELETE RESTRICT,
  platform_account_id         int             NULL REFERENCES platform_settlement_account(id) ON DELETE RESTRICT,
  college_account_id          bigint          NULL REFERENCES college_settlement_accounts(id) ON DELETE RESTRICT,
  split_amount                numeric         NOT NULL CHECK (split_amount >= 0),
  split_percentage            numeric         NULL CHECK (split_percentage IS NULL OR (split_percentage >= 0 AND split_percentage <= 100)),
  settlement_status           text            NOT NULL DEFAULT 'PENDING' CHECK (settlement_status IN ('PENDING', 'SETTLED', 'FAILED')),
  settlement_reference        text            NULL,
  settled_at                  timestamptz     NULL,
  created_at                  timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT chk_split_recipient_account CHECK (
    (recipient_type = 'SHOP' AND outlet_paytm_account_id IS NOT NULL AND platform_account_id IS NULL AND college_account_id IS NULL) OR
    (recipient_type = 'PLATFORM' AND platform_account_id IS NOT NULL AND outlet_paytm_account_id IS NULL AND college_account_id IS NULL) OR
    (recipient_type = 'COLLEGE' AND college_account_id IS NOT NULL AND outlet_paytm_account_id IS NULL AND platform_account_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_payment_splits_payment_id ON payment_splits(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_recipient ON payment_splits(recipient_type);
CREATE INDEX IF NOT EXISTS idx_payment_splits_outlet ON payment_splits(outlet_paytm_account_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. REFUNDS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refunds (
  id                bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id        bigint          NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  order_id          bigint          NULL REFERENCES orders(id) ON DELETE SET NULL,
  wallet_txn_id     bigint          NULL REFERENCES wallet_txns(id) ON DELETE SET NULL,
  refund_type       text            NOT NULL CHECK (refund_type IN ('ORDER_REFUND', 'WALLET_TOPUP_REFUND', 'SPLIT_REFUND')),
  amount            numeric         NOT NULL CHECK (amount > 0),
  status            text            NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  paytm_refund_id   text            NULL,
  reason            text            NULL,
  created_at        timestamptz     NOT NULL DEFAULT now(),
  processed_at      timestamptz     NULL
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. EXTEND ORDERS TABLE (Add payment_id FK)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_id bigint NULL REFERENCES payments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. STORED PROCEDURE: calculate_order_split(p_order_id, p_payment_id)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_order_split(
  p_order_id    bigint,
  p_payment_id  bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order               orders%ROWTYPE;
  v_resolved_payment_id bigint := p_payment_id;
  v_shop_account        outlet_paytm_accounts%ROWTYPE;
  v_platform_account    platform_settlement_account%ROWTYPE;
  v_college_account     college_settlement_accounts%ROWTYPE;
  v_shop_amount         numeric;
  v_platform_amount     numeric;
  v_college_amount      numeric;
  v_order_total         numeric;
BEGIN
  -- 1. Fetch Order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'calculate_order_split: Order % not found', p_order_id;
  END IF;

  v_order_total := v_order.total::numeric;

  -- 2. Resolve or Create Associated Payment Record
  IF v_resolved_payment_id IS NULL THEN
    IF v_order.payment_id IS NOT NULL THEN
      v_resolved_payment_id := v_order.payment_id;
    ELSE
      -- Check if a payment record exists for this order
      SELECT id INTO v_resolved_payment_id 
      FROM payments 
      WHERE order_id = p_order_id 
      ORDER BY id DESC LIMIT 1;

      -- If still null, this is a wallet-funded order; create settlement payment record
      IF v_resolved_payment_id IS NULL THEN
        INSERT INTO payments (
          user_id,
          order_id,
          amount,
          payment_purpose,
          payment_method,
          status,
          payment_reference,
          paid_at
        ) VALUES (
          v_order.user_id,
          v_order.id,
          v_order_total,
          'ORDER',
          'WALLET',
          'SUCCESS',
          'wallet:order:' || v_order.id,
          now()
        ) RETURNING id INTO v_resolved_payment_id;
      END IF;

      UPDATE orders SET payment_id = v_resolved_payment_id WHERE id = p_order_id;
    END IF;
  END IF;

  -- 3. Idempotency Check: Do not insert splits if already calculated for this payment
  IF EXISTS (SELECT 1 FROM payment_splits WHERE payment_id = v_resolved_payment_id) THEN
    RETURN;
  END IF;

  -- 4. Fetch Recipient Split Accounts
  -- 4a. Shop outlet account
  SELECT * INTO v_shop_account FROM outlet_paytm_accounts WHERE outlet_id = v_order.outlet_id;
  IF NOT FOUND THEN
    -- Fallback default 90% if not explicitly seeded
    INSERT INTO outlet_paytm_accounts (outlet_id, paytm_account_id, onboarding_status, settlement_enabled, shop_split_percentage)
    VALUES (v_order.outlet_id, 'PAYTM_OUTLET_' || upper(replace(v_order.outlet_id, '-', '_')), 'ACTIVE', true, 90)
    ON CONFLICT (outlet_id) DO UPDATE SET outlet_id = EXCLUDED.outlet_id
    RETURNING * INTO v_shop_account;
  END IF;

  -- 4b. Platform settlement account
  SELECT * INTO v_platform_account FROM platform_settlement_account WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO platform_settlement_account (id, paytm_account_id, settlement_enabled, platform_split_percentage)
    VALUES (1, 'PAYTM_PLATFORM_VFOODS_01', true, 5)
    RETURNING * INTO v_platform_account;
  END IF;

  -- 4c. Active college settlement account
  SELECT * INTO v_college_account FROM college_settlement_accounts WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO college_settlement_accounts (campus_name, paytm_account_id, onboarding_status, settlement_enabled, is_active, college_split_percentage)
    VALUES ('VIT Chennai', 'PAYTM_COLLEGE_VITC_01', 'ACTIVE', true, true, 5)
    RETURNING * INTO v_college_account;
  END IF;

  -- 5. Calculate Split Amounts
  -- Uses the outlet's configured shop_split_percentage, platform's percentage, and college's percentage
  v_shop_amount     := round((v_order_total * v_shop_account.shop_split_percentage) / 100.0, 2);
  v_platform_amount := round((v_order_total * v_platform_account.platform_split_percentage) / 100.0, 2);
  -- Guarantee exact penny summation by taking the residual for college
  v_college_amount  := v_order_total - v_shop_amount - v_platform_amount;

  -- 6. Insert Exactly 3 Rows into payment_splits
  -- 6a. SHOP split
  INSERT INTO payment_splits (
    payment_id,
    recipient_type,
    outlet_paytm_account_id,
    platform_account_id,
    college_account_id,
    split_amount,
    split_percentage,
    settlement_status
  ) VALUES (
    v_resolved_payment_id,
    'SHOP',
    v_shop_account.outlet_id,
    NULL,
    NULL,
    v_shop_amount,
    v_shop_account.shop_split_percentage,
    CASE WHEN v_shop_account.settlement_enabled THEN 'PENDING' ELSE 'PENDING' END
  );

  -- 6b. PLATFORM split
  INSERT INTO payment_splits (
    payment_id,
    recipient_type,
    outlet_paytm_account_id,
    platform_account_id,
    college_account_id,
    split_amount,
    split_percentage,
    settlement_status
  ) VALUES (
    v_resolved_payment_id,
    'PLATFORM',
    NULL,
    v_platform_account.id,
    NULL,
    v_platform_amount,
    v_platform_account.platform_split_percentage,
    CASE WHEN v_platform_account.settlement_enabled THEN 'PENDING' ELSE 'PENDING' END
  );

  -- 6c. COLLEGE split
  INSERT INTO payment_splits (
    payment_id,
    recipient_type,
    outlet_paytm_account_id,
    platform_account_id,
    college_account_id,
    split_amount,
    split_percentage,
    settlement_status
  ) VALUES (
    v_resolved_payment_id,
    'COLLEGE',
    NULL,
    NULL,
    v_college_account.id,
    v_college_amount,
    v_college_account.college_split_percentage,
    CASE WHEN v_college_account.settlement_enabled THEN 'PENDING' ELSE 'PENDING' END
  );

END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. STORED PROCEDURE: verify_and_record_payment (idempotent, SECURITY DEFINER)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION verify_and_record_payment(
  p_paytm_txn_id      text,
  p_status            text,
  p_paytm_order_id    text DEFAULT NULL,
  p_payment_reference text DEFAULT NULL,
  p_failure_reason    text DEFAULT NULL,
  p_payment_method    text DEFAULT 'UPI_APP'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment           payments%ROWTYPE;
  v_order             orders%ROWTYPE;
  v_token             text;
  v_oi                order_items%ROWTYPE;
  v_item              menu_items%ROWTYPE;
  v_wallet_ref        text;
  v_wallet_txn        wallet_txns%ROWTYPE;
BEGIN
  -- Validate status
  IF p_status NOT IN ('SUCCESS', 'FAILED', 'PENDING', 'CANCELLED') THEN
    RAISE EXCEPTION 'verify_and_record_payment: Invalid status %', p_status;
  END IF;

  -- 1. Locate existing payment record
  SELECT * INTO v_payment 
  FROM payments 
  WHERE paytm_txn_id = p_paytm_txn_id
  FOR UPDATE;

  IF NOT FOUND AND p_paytm_order_id IS NOT NULL THEN
    SELECT * INTO v_payment 
    FROM payments 
    WHERE paytm_order_id = p_paytm_order_id
    FOR UPDATE;
  END IF;

  IF NOT FOUND AND p_payment_reference IS NOT NULL THEN
    SELECT * INTO v_payment 
    FROM payments 
    WHERE payment_reference = p_payment_reference
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'verify_and_record_payment: Payment not found for txn %, order %, ref %',
      p_paytm_txn_id, p_paytm_order_id, p_payment_reference;
  END IF;

  -- 2. Idempotency Guard: If already marked SUCCESS, no-op immediately
  IF v_payment.status = 'SUCCESS' THEN
    RETURN jsonb_build_object(
      'status', 'already_processed',
      'payment_id', v_payment.id,
      'purpose', v_payment.payment_purpose,
      'order_id', v_payment.order_id
    );
  END IF;

  -- 3. Update payment record
  UPDATE payments
  SET
    status            = p_status,
    paytm_txn_id      = COALESCE(p_paytm_txn_id, paytm_txn_id),
    paytm_order_id    = COALESCE(p_paytm_order_id, paytm_order_id),
    payment_reference = COALESCE(p_payment_reference, payment_reference),
    payment_method    = COALESCE(p_payment_method, payment_method),
    paid_at           = CASE WHEN p_status = 'SUCCESS' THEN COALESCE(paid_at, now()) ELSE NULL END,
    failure_reason    = p_failure_reason,
    updated_at        = now()
  WHERE id = v_payment.id
  RETURNING * INTO v_payment;

  -- 4. Process Success/Failure paths
  IF p_status = 'SUCCESS' THEN
    -- Path A: WALLET TOP-UP
    IF v_payment.payment_purpose = 'WALLET_TOPUP' THEN
      v_wallet_ref := 'paytm:' || p_paytm_txn_id;
      
      -- Credit wallet via existing idempotent procedure
      PERFORM credit_wallet(
        v_payment.user_id,
        v_payment.amount::int,
        'topup',
        v_wallet_ref,
        'Paytm top-up ' || p_paytm_txn_id
      );

      -- Link wallet_txn_id back to payment record
      SELECT * INTO v_wallet_txn FROM wallet_txns WHERE ref = v_wallet_ref LIMIT 1;
      IF FOUND THEN
        UPDATE payments SET wallet_txn_id = v_wallet_txn.id WHERE id = v_payment.id;
      END IF;

      RETURN jsonb_build_object(
        'status', 'success',
        'payment_id', v_payment.id,
        'purpose', 'WALLET_TOPUP',
        'amount', v_payment.amount
      );

    -- Path B: DIRECT ORDER PAYMENT
    ELSIF v_payment.payment_purpose = 'ORDER' THEN
      SELECT * INTO v_order FROM orders WHERE id = v_payment.order_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % linked to payment % not found', v_payment.order_id, v_payment.id;
      END IF;

      -- If not already placed, decrement stock and finalize order
      IF v_order.status = 'payment_pending' THEN
        -- Finalize stock decrements
        FOR v_oi IN SELECT * FROM order_items WHERE order_id = v_order.id LOOP
          SELECT * INTO v_item FROM menu_items WHERE id = v_oi.item_id FOR UPDATE;
          IF v_item.stock_qty IS NOT NULL THEN
            UPDATE menu_items
            SET stock_qty    = GREATEST(0, stock_qty - v_oi.qty),
                reserved_qty = GREATEST(0, reserved_qty - v_oi.qty),
                available    = CASE WHEN (stock_qty - v_oi.qty) <= 0 THEN false ELSE available END
            WHERE id = v_oi.item_id;
          ELSE
            UPDATE menu_items
            SET reserved_qty = GREATEST(0, reserved_qty - v_oi.qty)
            WHERE id = v_oi.item_id;
          END IF;
        END LOOP;

        -- Generate 3-digit token if not set
        v_token := COALESCE(v_order.token, _generate_token(v_order.outlet_id));

        -- Mark order placed and link payment
        UPDATE orders
        SET status = 'placed',
            token = v_token,
            payment_id = v_payment.id,
            expires_at = NULL,
            updated_at = now()
        WHERE id = v_order.id;
      ELSE
        -- Ensure order links to this payment
        UPDATE orders SET payment_id = v_payment.id WHERE id = v_order.id;
      END IF;

      -- Trigger three-way split calculation
      PERFORM calculate_order_split(v_order.id, v_payment.id);

      RETURN jsonb_build_object(
        'status', 'success',
        'payment_id', v_payment.id,
        'purpose', 'ORDER',
        'order_id', v_order.id,
        'token', v_token
      );
    END IF;

  ELSIF p_status IN ('FAILED', 'CANCELLED') THEN
    -- On order failure, cancel pending order and release any reserved quantities
    IF v_payment.payment_purpose = 'ORDER' AND v_payment.order_id IS NOT NULL THEN
      SELECT * INTO v_order FROM orders WHERE id = v_payment.order_id FOR UPDATE;
      IF FOUND AND v_order.status = 'payment_pending' THEN
        FOR v_oi IN SELECT * FROM order_items WHERE order_id = v_order.id LOOP
          UPDATE menu_items
          SET reserved_qty = GREATEST(0, reserved_qty - v_oi.qty)
          WHERE id = v_oi.item_id;
        END LOOP;

        UPDATE orders 
        SET status = 'cancelled',
            cancel_reason = COALESCE(p_failure_reason, 'Paytm payment failed'),
            updated_at = now()
        WHERE id = v_order.id;
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'status', 'failed',
      'payment_id', v_payment.id,
      'reason', p_failure_reason
    );
  END IF;

  RETURN jsonb_build_object('status', p_status, 'payment_id', v_payment.id);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. EXTEND place_order_wallet() TO INVOKE calculate_order_split()
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION place_order_wallet(
  p_user_id         uuid,
  p_outlet_id       text,
  p_items           jsonb,
  p_slot_id         uuid        DEFAULT NULL,
  p_coupon_code     text        DEFAULT NULL,
  p_group_id        uuid        DEFAULT NULL,
  p_is_group_payer  boolean     DEFAULT false
)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_outlet        outlets%ROWTYPE;
  v_settings      settings%ROWTYPE;
  v_item          menu_items%ROWTYPE;
  v_slot          pickup_slots%ROWTYPE;
  v_coupon        coupons%ROWTYPE;
  v_elem          jsonb;
  v_item_id       bigint;
  v_qty           int;
  v_old_qty       int;
  v_now_time      time := localtime;
  v_shop_payout   int  := 0;
  v_total         int;
  v_student_debit int;
  v_discount      int  := 0;
  v_order_id      bigint;
  v_token         text;
BEGIN
  -- a) Lock outlet
  SELECT * INTO v_outlet FROM outlets WHERE id = p_outlet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Outlet % not found', p_outlet_id; END IF;
  IF NOT v_outlet.is_open THEN RAISE EXCEPTION 'Outlet % is currently closed', p_outlet_id; END IF;

  -- b) Event-mode guard
  SELECT * INTO v_settings FROM settings WHERE id = 1;
  IF v_settings.event_mode AND NOT v_outlet.is_event THEN
    RAISE EXCEPTION 'Only event stalls are accepting orders right now';
  END IF;
  IF NOT v_settings.event_mode AND v_outlet.is_event THEN
    RAISE EXCEPTION 'Event stalls only operate during event mode';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  -- c) Validate items + compute shop_payout
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_elem->>'item_id')::bigint;
    v_qty     := (v_elem->>'qty')::int;
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Invalid qty % for item %', v_qty, v_item_id; END IF;

    SELECT * INTO v_item FROM menu_items WHERE id = v_item_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Menu item % not found', v_item_id; END IF;
    IF v_item.outlet_id <> p_outlet_id THEN
      RAISE EXCEPTION 'Item % does not belong to outlet %', v_item_id, p_outlet_id;
    END IF;
    IF NOT v_item.available THEN
      RAISE EXCEPTION 'Item "%" is not available', v_item.name;
    END IF;

    -- Time-window check
    IF v_item.available_from IS NOT NULL AND v_item.available_to IS NOT NULL THEN
      IF v_now_time < v_item.available_from OR v_now_time > v_item.available_to THEN
        RAISE EXCEPTION 'Item "%" is only available between % and %',
          v_item.name, v_item.available_from, v_item.available_to;
      END IF;
    END IF;

    -- Stock check
    IF v_item.stock_qty IS NOT NULL THEN
      IF (v_item.stock_qty - v_item.reserved_qty) < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%"', v_item.name;
      END IF;
    END IF;

    v_shop_payout := v_shop_payout + (v_item.price * v_qty);
  END LOOP;

  -- d) Platform pricing
  v_total := ceil(v_shop_payout * 1.05);
  v_student_debit := v_total;

  -- e) Validate & Lock Scheduled Pickup Slot (if provided)
  IF p_slot_id IS NOT NULL THEN
    SELECT * INTO v_slot FROM pickup_slots WHERE id = p_slot_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected pickup slot does not exist';
    END IF;
    IF v_slot.outlet_id <> p_outlet_id THEN
      RAISE EXCEPTION 'Pickup slot does not belong to this outlet';
    END IF;
    IF v_slot.slot_time < now() THEN
      RAISE EXCEPTION 'Pickup slot % is in the past', v_slot.slot_time;
    END IF;
    IF v_slot.current_orders >= v_slot.max_orders THEN
      RAISE EXCEPTION 'Pickup slot % is fully booked (%/%)', v_slot.slot_time, v_slot.current_orders, v_slot.max_orders;
    END IF;

    UPDATE pickup_slots
    SET current_orders = current_orders + 1
    WHERE id = p_slot_id;
  END IF;

  -- f) Validate & Lock Coupon (if provided)
  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon FROM coupons WHERE code = upper(trim(p_coupon_code)) FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid coupon code "%"', p_coupon_code;
    END IF;
    IF NOT v_coupon.active THEN
      RAISE EXCEPTION 'Coupon "%" is inactive', p_coupon_code;
    END IF;
    IF now() < v_coupon.valid_from OR now() > v_coupon.valid_to THEN
      RAISE EXCEPTION 'Coupon "%" is expired or not yet valid', p_coupon_code;
    END IF;
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Coupon "%" has reached maximum usage limit', p_coupon_code;
    END IF;
    IF v_coupon.min_order_value IS NOT NULL AND v_total < v_coupon.min_order_value THEN
      RAISE EXCEPTION 'Coupon requires minimum order value of ₹%', v_coupon.min_order_value;
    END IF;
    IF v_coupon.outlet_id IS NOT NULL AND v_coupon.outlet_id <> p_outlet_id THEN
      RAISE EXCEPTION 'Coupon "%" is only valid at outlet %', p_coupon_code, v_coupon.outlet_id;
    END IF;

    IF v_coupon.discount_type = 'flat' THEN
      v_discount := LEAST(v_total, v_coupon.discount_value::int);
    ELSIF v_coupon.discount_type = 'percent' THEN
      v_discount := LEAST(v_total, (v_total * v_coupon.discount_value / 100)::int);
    END IF;

    v_student_debit := GREATEST(0, v_total - v_discount);

    UPDATE coupons
    SET used_count = used_count + 1
    WHERE code = v_coupon.code;
  END IF;

  -- g) Atomic wallet debit
  UPDATE wallets
  SET balance = balance - v_student_debit
  WHERE user_id = p_user_id AND balance >= v_student_debit;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: ₹%', v_student_debit;
  END IF;

  -- h) Generate pickup token
  v_token := _generate_token(p_outlet_id);

  -- i) Insert order
  INSERT INTO orders (
    user_id, outlet_id, token, status, payment_method,
    shop_payout, total, pickup_slot_id, group_id, is_group_payer
  )
  VALUES (
    p_user_id, p_outlet_id, v_token, 'placed', 'wallet',
    v_shop_payout, v_total, p_slot_id, p_group_id, p_is_group_payer
  )
  RETURNING id INTO v_order_id;

  -- j) Record coupon redemption if applied
  IF v_coupon.code IS NOT NULL THEN
    INSERT INTO coupon_redemptions (coupon_code, user_id, order_id)
    VALUES (v_coupon.code, p_user_id, v_order_id);
  END IF;

  -- k) Insert order_items + decrement stock + log to stock_adjustments
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_elem->>'item_id')::bigint;
    v_qty     := (v_elem->>'qty')::int;
    SELECT * INTO v_item FROM menu_items WHERE id = v_item_id FOR UPDATE;

    INSERT INTO order_items (order_id, item_id, name, price, qty)
    VALUES (v_order_id, v_item_id, v_item.name, v_item.price, v_qty);

    IF v_item.stock_qty IS NOT NULL THEN
      v_old_qty := v_item.stock_qty;
      
      UPDATE menu_items
      SET stock_qty = stock_qty - v_qty,
          available = CASE WHEN (stock_qty - v_qty) <= 0 THEN false ELSE available END
      WHERE id = v_item_id;

      INSERT INTO stock_adjustments (
        outlet_id,
        item_id,
        adjusted_by,
        qty_change,
        previous_qty,
        new_qty,
        reason
      ) VALUES (
        p_outlet_id,
        v_item_id,
        p_user_id,
        -v_qty,
        v_old_qty,
        v_old_qty - v_qty,
        'order_decrement'
      );
    END IF;
  END LOOP;

  -- l) Wallet transaction row
  INSERT INTO wallet_txns (user_id, amount, kind, ref, note)
  VALUES (
    p_user_id, -v_student_debit, 'order', 'order:' || v_order_id,
    'Order #' || v_order_id || ' at ' || p_outlet_id ||
    CASE WHEN v_discount > 0 THEN ' (Coupon ' || v_coupon.code || ' -₹' || v_discount || ')' ELSE '' END ||
    CASE WHEN p_slot_id IS NOT NULL THEN ' [Scheduled Slot]' ELSE '' END
  );

  -- m) Calculate Three-Way Split for Wallet Order (produces identical settlement accounting)
  PERFORM calculate_order_split(v_order_id);

  RETURN v_order_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- 10.1 payments RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_own_read" ON payments;
CREATE POLICY "payments_own_read" ON payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payments_outlet_read" ON payments;
CREATE POLICY "payments_outlet_read" ON payments
  FOR SELECT USING (
    order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM orders o
      JOIN profiles pr ON pr.id = auth.uid()
      WHERE o.id = payments.order_id
        AND o.outlet_id = pr.outlet_id
        AND pr.role IN ('staff', 'shop_admin')
    )
  );

DROP POLICY IF EXISTS "payments_super_admin_all" ON payments;
CREATE POLICY "payments_super_admin_all" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- 10.2 outlet_paytm_accounts RLS
ALTER TABLE outlet_paytm_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outlet_paytm_accounts_shop_admin" ON outlet_paytm_accounts;
CREATE POLICY "outlet_paytm_accounts_shop_admin" ON outlet_paytm_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = 'shop_admin'
        AND pr.outlet_id = outlet_paytm_accounts.outlet_id
    )
  );

DROP POLICY IF EXISTS "outlet_paytm_accounts_super_admin" ON outlet_paytm_accounts;
CREATE POLICY "outlet_paytm_accounts_super_admin" ON outlet_paytm_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- 10.3 platform_settlement_account RLS
ALTER TABLE platform_settlement_account ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settlement_super_admin" ON platform_settlement_account;
CREATE POLICY "platform_settlement_super_admin" ON platform_settlement_account
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- 10.4 college_settlement_accounts RLS
ALTER TABLE college_settlement_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "college_settlement_super_admin" ON college_settlement_accounts;
CREATE POLICY "college_settlement_super_admin" ON college_settlement_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- 10.5 payment_splits RLS
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_splits_shop_staff" ON payment_splits;
CREATE POLICY "payment_splits_shop_staff" ON payment_splits
  FOR SELECT USING (
    recipient_type = 'SHOP' AND EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('staff', 'shop_admin')
        AND pr.outlet_id = payment_splits.outlet_paytm_account_id
    )
  );

DROP POLICY IF EXISTS "payment_splits_super_admin" ON payment_splits;
CREATE POLICY "payment_splits_super_admin" ON payment_splits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- 10.6 refunds RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refunds_own_read" ON refunds;
CREATE POLICY "refunds_own_read" ON refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = refunds.payment_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "refunds_outlet_read" ON refunds;
CREATE POLICY "refunds_outlet_read" ON refunds
  FOR SELECT USING (
    order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM orders o
      JOIN profiles pr ON pr.id = auth.uid()
      WHERE o.id = refunds.order_id
        AND o.outlet_id = pr.outlet_id
        AND pr.role IN ('staff', 'shop_admin')
    )
  );

DROP POLICY IF EXISTS "refunds_super_admin" ON refunds;
CREATE POLICY "refunds_super_admin" ON refunds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. REALTIME PUBLICATION
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
