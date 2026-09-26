-- =============================================================================
-- CampusBite — Supabase Migration 001: Full Initial Schema
-- Run in: Supabase SQL Editor → New Query → Run
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_bytes, hmac

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ──────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role      AS ENUM ('customer', 'staff', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cust_type      AS ENUM ('student', 'faculty', 'outsider', 'event_team');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status   AS ENUM (
    'payment_pending', 'placed', 'preparing', 'ready', 'collected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('wallet', 'gateway');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. TABLES
-- ──────────────────────────────────────────────────────────────────────────────

-- 2.1 outlets
CREATE TABLE IF NOT EXISTS outlets (
  id         text        PRIMARY KEY,
  name       text        NOT NULL,
  location   text        NOT NULL,
  is_event   boolean     NOT NULL DEFAULT false,
  is_open    boolean     NOT NULL DEFAULT true
);

-- 2.2 menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id               bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  outlet_id        text        NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  price            int         NOT NULL CHECK (price > 0),
  available        boolean     NOT NULL DEFAULT true,
  is_veg           boolean     NOT NULL DEFAULT true,
  category         text        NOT NULL DEFAULT 'General',
  available_from   time        NULL,          -- NULL = no time restriction
  available_to     time        NULL,          -- NULL = no time restriction
  stock_qty        int         NULL CHECK (stock_qty IS NULL OR stock_qty >= 0),
  reserved_qty     int         NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0)
);
CREATE INDEX IF NOT EXISTS idx_menu_items_outlet ON menu_items(outlet_id);

-- 2.3 profiles
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text        NOT NULL DEFAULT '',
  role        user_role   NOT NULL DEFAULT 'customer',
  cust_type   cust_type   NOT NULL DEFAULT 'student',
  outlet_id   text        NULL REFERENCES outlets(id) ON DELETE SET NULL,
  phone       text        NULL,           -- used for MSG91 WhatsApp/SMS
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2.4 wallets
CREATE TABLE IF NOT EXISTS wallets (
  user_id     uuid  PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance     int   NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2.5 wallet_txns
CREATE TABLE IF NOT EXISTS wallet_txns (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      int         NOT NULL,          -- positive = credit, negative = debit
  kind        text        NOT NULL CHECK (kind IN ('topup','order','refund','admin_credit')),
  ref         text        NOT NULL UNIQUE,   -- idempotency key
  note        text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_user ON wallet_txns(user_id, created_at DESC);

-- 2.6 orders
CREATE TABLE IF NOT EXISTS orders (
  id              bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid            NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  outlet_id       text            NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  token           text            NULL,          -- 3-digit pickup code, set when placed
  status          order_status    NOT NULL DEFAULT 'payment_pending',
  payment_method  payment_method  NOT NULL DEFAULT 'wallet',
  shop_payout     int             NOT NULL CHECK (shop_payout > 0),
  total           int             NOT NULL CHECK (total > 0),
  my_profit       int             GENERATED ALWAYS AS (shop_payout * 5 / 100) STORED,
  cancel_reason   text            NULL,
  expires_at      timestamptz     NULL,          -- only for payment_pending gateway orders
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_outlet  ON orders(outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_expires ON orders(expires_at) WHERE expires_at IS NOT NULL;

-- 2.7 order_items
CREATE TABLE IF NOT EXISTS order_items (
  order_id  bigint  NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id   bigint  NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  name      text    NOT NULL,      -- snapshot at order time
  price     int     NOT NULL,      -- snapshot at order time
  qty       int     NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 2.8 payments
CREATE TABLE IF NOT EXISTS payments (
  phonepe_txn_id  text        PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  order_id        bigint      NULL REFERENCES orders(id) ON DELETE SET NULL, -- NULL for topups
  amount          int         NOT NULL CHECK (amount > 0),
  purpose         text        NOT NULL CHECK (purpose IN ('topup','order_payment')),
  status          text        NOT NULL DEFAULT 'created'
                              CHECK (status IN ('created','PENDING','SUCCESS','FAILED')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_user  ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- 2.9 settings (singleton row, id always = 1)
CREATE TABLE IF NOT EXISTS settings (
  id           int     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  event_mode   boolean NOT NULL DEFAULT false
);
INSERT INTO settings(id, event_mode) VALUES (1, false) ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. HELPER: updated_at auto-maintenance
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

CREATE OR REPLACE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

CREATE OR REPLACE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGER: auto-create profile + wallet on auth.users INSERT
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user ON auth.users;
CREATE TRIGGER trg_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION _handle_new_user();

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. HELPER: generate 3-digit pickup token unique per outlet per day
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _generate_token(p_outlet_id text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_token text;
  v_tries int := 0;
BEGIN
  LOOP
    v_token := lpad((floor(random() * 900) + 100)::int::text, 3, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM orders
      WHERE outlet_id = p_outlet_id
        AND token = v_token
        AND status IN ('placed','preparing','ready')
        AND created_at >= current_date
    );
    v_tries := v_tries + 1;
    IF v_tries > 500 THEN
      RAISE EXCEPTION 'Token space exhausted for outlet % today', p_outlet_id;
    END IF;
  END LOOP;
  RETURN v_token;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. STORED PROCEDURE: credit_wallet  (idempotent)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id  uuid,
  p_amount   int,
  p_kind     text,   -- 'topup' | 'refund' | 'admin_credit'
  p_ref      text,   -- idempotency key  e.g. 'phonepe:TXN123' or 'refund:order:456'
  p_note     text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inserted boolean;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'credit_wallet: amount must be positive, got %', p_amount;
  END IF;

  INSERT INTO wallet_txns (user_id, amount, kind, ref, note)
  VALUES (p_user_id, p_amount, p_kind, p_ref, p_note)
  ON CONFLICT (ref) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;   -- 1 if new row, 0 on conflict

  IF v_inserted THEN
    UPDATE wallets
    SET balance = balance + p_amount
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'credit_wallet: wallet not found for user %', p_user_id;
    END IF;
  END IF;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. STORED PROCEDURE: place_order_wallet
-- p_items: [{"item_id": 5, "qty": 2}, ...]
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION place_order_wallet(
  p_user_id   uuid,
  p_outlet_id text,
  p_items     jsonb
)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_outlet      outlets%ROWTYPE;
  v_settings    settings%ROWTYPE;
  v_item        menu_items%ROWTYPE;
  v_elem        jsonb;
  v_item_id     bigint;
  v_qty         int;
  v_now_time    time := localtime;
  v_shop_payout int  := 0;
  v_total       int;
  v_order_id    bigint;
  v_token       text;
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

    -- Stock check (effective = stock_qty - reserved_qty)
    IF v_item.stock_qty IS NOT NULL THEN
      IF (v_item.stock_qty - v_item.reserved_qty) < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%"', v_item.name;
      END IF;
    END IF;

    v_shop_payout := v_shop_payout + (v_item.price * v_qty);
  END LOOP;

  -- d) Total = ceil(shop_payout * 1.05)
  v_total := ceil(v_shop_payout * 1.05);

  -- e) Atomic wallet debit
  UPDATE wallets
  SET balance = balance - v_total
  WHERE user_id = p_user_id AND balance >= v_total;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- f) Generate pickup token
  v_token := _generate_token(p_outlet_id);

  -- g) Insert order
  INSERT INTO orders (user_id, outlet_id, token, status, payment_method, shop_payout, total)
  VALUES (p_user_id, p_outlet_id, v_token, 'placed', 'wallet', v_shop_payout, v_total)
  RETURNING id INTO v_order_id;

  -- h) Insert order_items + decrement stock
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_elem->>'item_id')::bigint;
    v_qty     := (v_elem->>'qty')::int;
    SELECT * INTO v_item FROM menu_items WHERE id = v_item_id;

    INSERT INTO order_items (order_id, item_id, name, price, qty)
    VALUES (v_order_id, v_item_id, v_item.name, v_item.price, v_qty);

    IF v_item.stock_qty IS NOT NULL THEN
      UPDATE menu_items
      SET stock_qty = stock_qty - v_qty,
          available = CASE WHEN (stock_qty - v_qty) <= 0 THEN false ELSE available END
      WHERE id = v_item_id;
    END IF;
  END LOOP;

  -- i) Wallet transaction row
  INSERT INTO wallet_txns (user_id, amount, kind, ref, note)
  VALUES (p_user_id, -v_total, 'order', 'order:' || v_order_id,
          'Order #' || v_order_id || ' at ' || p_outlet_id);

  RETURN v_order_id;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. STORED PROCEDURE: create_pending_gateway_order
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_pending_gateway_order(
  p_user_id   uuid,
  p_outlet_id text,
  p_items     jsonb
)
RETURNS TABLE(order_id bigint, total int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_outlet      outlets%ROWTYPE;
  v_settings    settings%ROWTYPE;
  v_item        menu_items%ROWTYPE;
  v_elem        jsonb;
  v_item_id     bigint;
  v_qty         int;
  v_now_time    time := localtime;
  v_shop_payout int  := 0;
  v_total_int   int;
  v_order_id    bigint;
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

  -- c) Validate + reserve stock
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

    IF v_item.available_from IS NOT NULL AND v_item.available_to IS NOT NULL THEN
      IF v_now_time < v_item.available_from OR v_now_time > v_item.available_to THEN
        RAISE EXCEPTION 'Item "%" is only available between % and %',
          v_item.name, v_item.available_from, v_item.available_to;
      END IF;
    END IF;

    IF v_item.stock_qty IS NOT NULL THEN
      IF (v_item.stock_qty - v_item.reserved_qty) < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%"', v_item.name;
      END IF;
      UPDATE menu_items SET reserved_qty = reserved_qty + v_qty WHERE id = v_item_id;
    END IF;

    v_shop_payout := v_shop_payout + (v_item.price * v_qty);
  END LOOP;

  v_total_int := ceil(v_shop_payout * 1.05);

  -- d) Insert pending order
  INSERT INTO orders (user_id, outlet_id, token, status, payment_method,
                      shop_payout, total, expires_at)
  VALUES (p_user_id, p_outlet_id, NULL, 'payment_pending', 'gateway',
          v_shop_payout, v_total_int, now() + interval '10 minutes')
  RETURNING id INTO v_order_id;

  -- e) Insert order_items (price snapshot)
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_elem->>'item_id')::bigint;
    v_qty     := (v_elem->>'qty')::int;
    SELECT * INTO v_item FROM menu_items WHERE id = v_item_id;

    INSERT INTO order_items (order_id, item_id, name, price, qty)
    VALUES (v_order_id, v_item_id, v_item.name, v_item.price, v_qty);
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_total_int;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. STORED PROCEDURE: finalize_gateway_order  (idempotent)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION finalize_gateway_order(
  p_order_id       bigint,
  p_phonepe_txn_id text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order  orders%ROWTYPE;
  v_oi     order_items%ROWTYPE;
  v_item   menu_items%ROWTYPE;
  v_token  text;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order % not found', p_order_id; END IF;

  -- Idempotency: already placed → no-op
  IF v_order.status = 'placed' THEN RETURN 'already_placed'; END IF;

  IF v_order.status <> 'payment_pending' THEN
    RAISE EXCEPTION 'Order % is in status %, cannot finalize', p_order_id, v_order.status;
  END IF;

  -- Expired?
  IF v_order.expires_at IS NOT NULL AND v_order.expires_at < now() THEN
    FOR v_oi IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
      UPDATE menu_items
      SET reserved_qty = GREATEST(0, reserved_qty - v_oi.qty)
      WHERE id = v_oi.item_id;
    END LOOP;
    UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = p_order_id;
    RETURN 'expired_cancelled';
  END IF;

  -- Check stock + decrement
  FOR v_oi IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
    SELECT * INTO v_item FROM menu_items WHERE id = v_oi.item_id FOR UPDATE;

    IF v_item.stock_qty IS NOT NULL THEN
      IF v_item.stock_qty < v_oi.qty THEN
        -- Stock ran out — release all, cancel
        FOR v_oi IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
          UPDATE menu_items
          SET reserved_qty = GREATEST(0, reserved_qty - v_oi.qty)
          WHERE id = v_oi.item_id;
        END LOOP;
        UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = p_order_id;
        RETURN 'stock_unavailable_cancelled';
      END IF;

      UPDATE menu_items
      SET stock_qty    = stock_qty - v_oi.qty,
          reserved_qty = GREATEST(0, reserved_qty - v_oi.qty),
          available    = CASE WHEN (stock_qty - v_oi.qty) <= 0 THEN false ELSE available END
      WHERE id = v_oi.item_id;
    ELSE
      UPDATE menu_items
      SET reserved_qty = GREATEST(0, reserved_qty - v_oi.qty)
      WHERE id = v_oi.item_id;
    END IF;
  END LOOP;

  -- Generate token + place
  v_token := _generate_token(v_order.outlet_id);
  UPDATE orders
  SET status = 'placed', token = v_token, expires_at = NULL, updated_at = now()
  WHERE id = p_order_id;

  RETURN 'placed:' || v_token;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 10. STORED PROCEDURE: expire_pending_orders  (called by cron)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION expire_pending_orders()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order  orders%ROWTYPE;
  v_oi     order_items%ROWTYPE;
  v_count  int := 0;
BEGIN
  FOR v_order IN
    SELECT * FROM orders
    WHERE status = 'payment_pending'
      AND expires_at IS NOT NULL
      AND expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    FOR v_oi IN SELECT * FROM order_items WHERE order_id = v_order.id LOOP
      UPDATE menu_items
      SET reserved_qty = GREATEST(0, reserved_qty - v_oi.qty)
      WHERE id = v_oi.item_id;
    END LOOP;

    UPDATE orders
    SET status        = 'cancelled',
        cancel_reason = 'Payment not completed within 10 minutes',
        updated_at    = now()
    WHERE id = v_order.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 11. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────────────────────

-- outlets
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outlets_public_read" ON outlets FOR SELECT USING (true);
CREATE POLICY "outlets_admin_all"   ON outlets FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_items_public_read" ON menu_items FOR SELECT USING (true);
CREATE POLICY "menu_items_staff_write" ON menu_items FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'staff'
      AND outlet_id = (SELECT outlet_id FROM profiles WHERE id = auth.uid())
    )
  );

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own_read"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"  ON profiles FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_own_read"  ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_admin_all" ON wallets FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- wallet_txns
ALTER TABLE wallet_txns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_txns_own_read"  ON wallet_txns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallet_txns_admin_all" ON wallet_txns FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_owner_read" ON orders FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "orders_staff_read" ON orders FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'staff'
    AND outlet_id = (SELECT outlet_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "orders_staff_update" ON orders FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'staff'
    AND outlet_id = (SELECT outlet_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "orders_admin_all" ON orders FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_read" ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (
          o.user_id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
          OR (
            (SELECT role FROM profiles WHERE id = auth.uid()) = 'staff'
            AND o.outlet_id = (SELECT outlet_id FROM profiles WHERE id = auth.uid())
          )
        )
    )
  );

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_own_read"  ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_admin_all" ON payments FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_all"   ON settings FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ──────────────────────────────────────────────────────────────────────────────
-- 12. REALTIME: publish orders table
-- ──────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ──────────────────────────────────────────────────────────────────────────────
-- 13. SEED DATA — VIT Chennai outlets + menu items
-- ──────────────────────────────────────────────────────────────────────────────

INSERT INTO outlets (id, name, location, is_event, is_open) VALUES
  ('main-canteen',  'Main Canteen',       'Academic Block',      false, true),
  ('tech-cafe',     'Tech Café',          'Technology Tower',    false, true),
  ('juice-corner',  'Juice Corner',       'Hostel Block A',      false, true),
  ('midnight-mess', 'Midnight Mess',      'Hostel Block B',      false, true),
  ('event-stall-1', 'Spice Fest Stall 1', 'Open Air Theatre',    true,  false),
  ('event-stall-2', 'Spice Fest Stall 2', 'Open Air Theatre',    true,  false)
ON CONFLICT (id) DO NOTHING;

-- Main Canteen
INSERT INTO menu_items (outlet_id, name, price, available, is_veg, category) VALUES
  ('main-canteen', 'Masala Dosa',          40,  true, true,  'South Indian'),
  ('main-canteen', 'Idli Sambar (3 pcs)',  30,  true, true,  'South Indian'),
  ('main-canteen', 'Veg Fried Rice',       60,  true, true,  'Rice'),
  ('main-canteen', 'Egg Fried Rice',       70,  true, false, 'Rice'),
  ('main-canteen', 'Chicken Biryani',      100, true, false, 'Biryani'),
  ('main-canteen', 'Paneer Butter Masala', 90,  true, true,  'Curry'),
  ('main-canteen', 'Chapati (2 pcs)',      25,  true, true,  'Breads'),
  ('main-canteen', 'Sambar Rice',          45,  true, true,  'Rice'),
  ('main-canteen', 'Curd Rice',            35,  true, true,  'Rice'),
  ('main-canteen', 'Veg Noodles',          55,  true, true,  'Noodles')
ON CONFLICT DO NOTHING;

-- Tech Café  (time-restricted items)
INSERT INTO menu_items (outlet_id, name, price, available, is_veg, category, available_from, available_to) VALUES
  ('tech-cafe', 'Cappuccino',        60, true, true,  'Beverages', '07:00', '22:00'),
  ('tech-cafe', 'Espresso',          50, true, true,  'Beverages', '07:00', '22:00'),
  ('tech-cafe', 'Cold Coffee',       70, true, true,  'Beverages', '08:00', '22:00'),
  ('tech-cafe', 'Veg Sandwich',      55, true, true,  'Snacks',    '08:00', '20:00'),
  ('tech-cafe', 'Club Sandwich',     75, true, false, 'Snacks',    '08:00', '20:00'),
  ('tech-cafe', 'Chocolate Brownie', 45, true, true,  'Desserts',  '10:00', '21:00'),
  ('tech-cafe', 'Maggi Noodles',     40, true, true,  'Snacks',    '11:00', '22:00'),
  ('tech-cafe', 'Fruit Bowl',        65, true, true,  'Healthy',   '07:00', '18:00'),
  ('tech-cafe', 'Masala Chai',       20, true, true,  'Beverages', '06:00', '22:00'),
  ('tech-cafe', 'Butter Toast',      30, true, true,  'Breakfast', '07:00', '11:00')
ON CONFLICT DO NOTHING;

-- Juice Corner
INSERT INTO menu_items (outlet_id, name, price, available, is_veg, category) VALUES
  ('juice-corner', 'Fresh Lime Soda',   30, true, true, 'Beverages'),
  ('juice-corner', 'Watermelon Juice',  45, true, true, 'Juices'),
  ('juice-corner', 'Mixed Fruit Juice', 50, true, true, 'Juices'),
  ('juice-corner', 'Mango Lassi',       55, true, true, 'Lassi'),
  ('juice-corner', 'Sugarcane Juice',   30, true, true, 'Juices'),
  ('juice-corner', 'Tender Coconut',    50, true, true, 'Natural'),
  ('juice-corner', 'Banana Shake',      60, true, true, 'Shakes'),
  ('juice-corner', 'Pineapple Juice',   45, true, true, 'Juices')
ON CONFLICT DO NOTHING;

-- Midnight Mess  (late-night, stock-limited)
INSERT INTO menu_items (outlet_id, name, price, available, is_veg, category, available_from, available_to, stock_qty) VALUES
  ('midnight-mess', 'Pav Bhaji',       60, true, true,  'Street Food', '18:00', '01:00', 50),
  ('midnight-mess', 'Cheese Maggi',    50, true, true,  'Snacks',      '20:00', '01:00', 40),
  ('midnight-mess', 'Egg Bhurji',      55, true, false, 'Egg Items',   '18:00', '01:00', 30),
  ('midnight-mess', 'Chicken Rolls',   80, true, false, 'Rolls',       '19:00', '01:00', 25),
  ('midnight-mess', 'Veg Rolls',       60, true, true,  'Rolls',       '19:00', '01:00', 30),
  ('midnight-mess', 'Paratha (2 pcs)', 50, true, true,  'Breads',      '18:00', '23:59', 40),
  ('midnight-mess', 'Instant Noodles', 35, true, true,  'Snacks',      '22:00', '01:00', NULL)
ON CONFLICT DO NOTHING;

-- Event Stall 1
INSERT INTO menu_items (outlet_id, name, price, available, is_veg, category, stock_qty) VALUES
  ('event-stall-1', 'Spicy Chaat',       40, true, true, 'Street Food', 100),
  ('event-stall-1', 'Pani Puri (6 pcs)', 30, true, true, 'Street Food',  80),
  ('event-stall-1', 'Bhel Puri',         35, true, true, 'Street Food',  80),
  ('event-stall-1', 'Aloo Tikki',        40, true, true, 'Street Food',  60)
ON CONFLICT DO NOTHING;

-- Event Stall 2
INSERT INTO menu_items (outlet_id, name, price, available, is_veg, category, stock_qty) VALUES
  ('event-stall-2', 'Paneer Tikka',  90,  true, true,  'Grills', 50),
  ('event-stall-2', 'Chicken Tikka', 110, true, false, 'Grills', 50),
  ('event-stall-2', 'Seekh Kebab',   100, true, false, 'Grills', 40),
  ('event-stall-2', 'Grilled Corn',   40, true, true,  'Snacks', 80)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- END OF MIGRATION 001
-- =============================================================================
