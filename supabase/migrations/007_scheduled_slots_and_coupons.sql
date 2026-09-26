-- =============================================================================
-- Migration 007: Scheduled Pickup Slots & Coupons
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PICKUP SLOTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickup_slots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id       text        NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  slot_time       timestamptz NOT NULL,
  max_orders      int         NOT NULL DEFAULT 15 CHECK (max_orders > 0),
  current_orders  int         NOT NULL DEFAULT 0 CHECK (current_orders >= 0),
  CONSTRAINT uq_outlet_slot_time UNIQUE (outlet_id, slot_time)
);

CREATE INDEX IF NOT EXISTS idx_pickup_slots_outlet_time ON pickup_slots(outlet_id, slot_time);

ALTER TABLE pickup_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pickup slots"
  ON pickup_slots FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins and staff can manage pickup slots"
  ON pickup_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Extend orders with nullable pickup_slot_id
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_slot_id uuid NULL REFERENCES pickup_slots(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_pickup_slot ON orders(pickup_slot_id) WHERE pickup_slot_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. COUPONS & REDEMPTIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  code            text        PRIMARY KEY,
  discount_type   text        NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  discount_value  numeric     NOT NULL CHECK (discount_value > 0),
  min_order_value int         NULL CHECK (min_order_value IS NULL OR min_order_value > 0),
  max_uses        int         NULL CHECK (max_uses IS NULL OR max_uses > 0),
  used_count      int         NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  outlet_id       text        NULL REFERENCES outlets(id) ON DELETE CASCADE, -- NULL = platform-wide
  valid_from      timestamptz NOT NULL DEFAULT now(),
  valid_to        timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  active          bool        NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code text        NOT NULL REFERENCES coupons(code) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id    bigint      NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_code ON coupon_redemptions(coupon_code);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  TO authenticated, anon
  USING (active = true);

CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Users can view own redemptions"
  ON coupon_redemptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Helper: Auto-generate today's pickup slots for an outlet
CREATE OR REPLACE FUNCTION generate_daily_pickup_slots(
  p_outlet_id         text,
  p_interval_minutes  int DEFAULT 15,
  p_max_orders_per_slot int DEFAULT 15,
  p_start_hour        int DEFAULT 8,
  p_end_hour          int DEFAULT 22
)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_time timestamptz;
  v_end_time     timestamptz;
  v_inserted     int := 0;
BEGIN
  v_current_time := date_trunc('day', now()) + (p_start_hour || ' hours')::interval;
  v_end_time     := date_trunc('day', now()) + (p_end_hour || ' hours')::interval;

  WHILE v_current_time < v_end_time LOOP
    INSERT INTO pickup_slots (outlet_id, slot_time, max_orders, current_orders)
    VALUES (p_outlet_id, v_current_time, p_max_orders_per_slot, 0)
    ON CONFLICT (outlet_id, slot_time) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    v_current_time := v_current_time + (p_interval_minutes || ' minutes')::interval;
  END LOOP;

  RETURN v_inserted;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. EXTENDED STORED PROCEDURE: place_order_wallet
-- Accepts optional slot_id, coupon_code, group_id, is_group_payer
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

  -- d) Standard platform total = ceil(shop_payout * 1.05)
  -- shop_payout and platform profit (5%) are computed EXACTLY as before
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

    -- Increment atomically
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

    -- Calculate discount on student-facing total ONLY
    IF v_coupon.discount_type = 'flat' THEN
      v_discount := LEAST(v_total, v_coupon.discount_value::int);
    ELSIF v_coupon.discount_type = 'percent' THEN
      v_discount := LEAST(v_total, (v_total * v_coupon.discount_value / 100)::int);
    END IF;

    v_student_debit := GREATEST(0, v_total - v_discount);

    -- Increment coupon usage count
    UPDATE coupons
    SET used_count = used_count + 1
    WHERE code = v_coupon.code;
  END IF;

  -- g) Atomic wallet debit (student debit only reduced by discount; shop payout unaffected)
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

  -- k) Insert order_items + decrement stock
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

  -- l) Wallet transaction row
  INSERT INTO wallet_txns (user_id, amount, kind, ref, note)
  VALUES (
    p_user_id, -v_student_debit, 'order', 'order:' || v_order_id,
    'Order #' || v_order_id || ' at ' || p_outlet_id ||
    CASE WHEN v_discount > 0 THEN ' (Coupon ' || v_coupon.code || ' -₹' || v_discount || ')' ELSE '' END ||
    CASE WHEN p_slot_id IS NOT NULL THEN ' [Scheduled Slot]' ELSE '' END
  );

  RETURN v_order_id;
END;
$$;

-- Create convenient place_order alias
CREATE OR REPLACE FUNCTION place_order(
  p_user_id         uuid,
  p_outlet_id       text,
  p_items           jsonb,
  p_slot_id         uuid        DEFAULT NULL,
  p_coupon_code     text        DEFAULT NULL,
  p_group_id        uuid        DEFAULT NULL,
  p_is_group_payer  boolean     DEFAULT false
)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN place_order_wallet(p_user_id, p_outlet_id, p_items, p_slot_id, p_coupon_code, p_group_id, p_is_group_payer);
END;
$$;
