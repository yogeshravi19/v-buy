-- =============================================================================
-- Migration 009: Dashboard Backend Unification & Cross-Role Connectivity
-- 
-- Unifies the shared backend layer for all 4 dashboards:
-- 1. Automatic order-driven stock decrements logged to stock_adjustments
-- 2. Staff/Shop Admin scan-to-collect & 3-digit backup token verification RPC
-- 3. Counter walk-in POS order generation with stock logging
-- 4. Student authenticated self-topup stored procedure
-- 5. Team management (active/deactivate staff) and invite revocation RPCs
-- 6. Outlets, pickup slots, and settings RLS policy updates for 4-tier roles
-- 7. Realtime publications with REPLICA IDENTITY FULL across all shared tables
-- 8. Analytics & hierarchy functions for Shop Admin and Super Admin
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTEND place_order_wallet TO LOG AUTOMATIC ORDER DECREMENTS TO stock_adjustments
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

  -- d) Standard platform total = ceil(shop_payout * 1.05)
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

      -- Both manual adjustments and automatic order-driven decrements write to stock_adjustments
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

  RETURN v_order_id;
END;
$$;

-- Alias
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. VERIFY AND COLLECT ORDER (SCAN QR / 3-DIGIT BACKUP CODE)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_and_collect_order(
  p_order_id bigint,
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_my_outlet text;
  v_order orders%ROWTYPE;
  v_norm_token text;
BEGIN
  v_role := public.get_my_role();
  v_my_outlet := public.get_my_outlet();

  IF v_role NOT IN ('staff', 'shop_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: only staff, shop_admin, or super_admin can verify and collect orders';
  END IF;

  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order #% not found', p_order_id;
  END IF;

  -- Scoped to outlet for staff and shop_admin
  IF v_role IN ('staff', 'shop_admin') AND v_order.outlet_id <> v_my_outlet THEN
    RAISE EXCEPTION 'Order belongs to outlet %, but caller is assigned to %', v_order.outlet_id, v_my_outlet;
  END IF;

  v_norm_token := upper(trim(p_token));
  IF upper(trim(COALESCE(v_order.token, ''))) <> v_norm_token THEN
    RAISE EXCEPTION 'Invalid pickup code. Token does not match order #%', p_order_id;
  END IF;

  IF v_order.status = 'collected' THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_order.id,
      'status', 'collected',
      'already_collected', true,
      'message', 'Order was already collected'
    );
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot collect a cancelled order';
  END IF;

  -- Advance to collected
  UPDATE orders
  SET status = 'collected',
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'outlet_id', v_order.outlet_id,
    'token', v_order.token,
    'status', 'collected',
    'collected_at', now()
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COUNTER POS WALK-IN ORDER STORED PROCEDURE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_counter_order(
  p_outlet_id text,
  p_items jsonb,
  p_payment_method text DEFAULT 'cash'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_my_outlet text;
  v_elem jsonb;
  v_item_id bigint;
  v_qty int;
  v_old_qty int;
  v_item menu_items%ROWTYPE;
  v_shop_payout int := 0;
  v_total int;
  v_order_id bigint;
  v_token text;
BEGIN
  v_role := public.get_my_role();
  v_my_outlet := public.get_my_outlet();

  IF v_role NOT IN ('staff', 'shop_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: only staff, shop_admin, or super_admin can create counter orders';
  END IF;

  IF v_role IN ('staff', 'shop_admin') AND p_outlet_id <> v_my_outlet THEN
    RAISE EXCEPTION 'Permission denied for outlet %', p_outlet_id;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Validate stock
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_elem->>'item_id')::bigint;
    v_qty     := (v_elem->>'qty')::int;
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Invalid quantity %', v_qty; END IF;

    SELECT * INTO v_item FROM menu_items WHERE id = v_item_id FOR UPDATE;
    IF NOT FOUND OR v_item.outlet_id <> p_outlet_id THEN
      RAISE EXCEPTION 'Item % not found in outlet %', v_item_id, p_outlet_id;
    END IF;

    IF v_item.stock_qty IS NOT NULL AND v_item.stock_qty < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for "%"', v_item.name;
    END IF;

    v_shop_payout := v_shop_payout + (v_item.price * v_qty);
  END LOOP;

  v_total := ceil(v_shop_payout * 1.05);
  v_token := _generate_token(p_outlet_id);

  -- Insert order
  INSERT INTO orders (
    user_id, outlet_id, token, status, payment_method,
    shop_payout, total
  ) VALUES (
    auth.uid(), p_outlet_id, v_token, 'ready', 'gateway',
    v_shop_payout, v_total
  ) RETURNING id INTO v_order_id;

  -- Insert items and decrement stock with 'counter_pos' reason
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_elem->>'item_id')::bigint;
    v_qty     := (v_elem->>'qty')::int;
    SELECT * INTO v_item FROM menu_items WHERE id = v_item_id;

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
        auth.uid(),
        -v_qty,
        v_old_qty,
        v_old_qty - v_qty,
        'counter_pos'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'token', v_token,
    'total', v_total,
    'shop_payout', v_shop_payout
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STUDENT WALLET TOP-UP STORED PROCEDURE (SELF-SCOPED)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.topup_my_wallet(
  p_amount int,
  p_payment_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_ref text;
  v_new_balance int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to top up wallet';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Top up amount must be positive, got %', p_amount;
  END IF;

  v_ref := COALESCE(p_payment_ref, 'topup:' || v_user_id || ':' || extract(epoch from now())::bigint);

  -- Use credit_wallet procedure
  PERFORM public.credit_wallet(
    v_user_id,
    p_amount,
    'topup',
    v_ref,
    'Prepaid Wallet Top-up'
  );

  SELECT balance INTO v_new_balance FROM wallets WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'amount_added', p_amount,
    'new_balance', v_new_balance,
    'ref', v_ref
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TEAM MANAGEMENT & INVITE REVOCATION
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_staff_active_status(
  p_staff_id uuid,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_my_outlet text;
  v_staff profiles%ROWTYPE;
BEGIN
  v_role := public.get_my_role();
  v_my_outlet := public.get_my_outlet();

  SELECT * INTO v_staff FROM profiles WHERE id = p_staff_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff profile % not found', p_staff_id;
  END IF;

  IF v_role = 'super_admin' THEN
    -- Super admin can toggle anyone
    NULL;
  ELSIF v_role = 'shop_admin' THEN
    IF v_staff.outlet_id <> v_my_outlet THEN
      RAISE EXCEPTION 'Cannot manage staff from another outlet';
    END IF;
    IF v_staff.role <> 'staff'::user_role THEN
      RAISE EXCEPTION 'Shop admin can only toggle staff accounts';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles
  SET is_active = p_is_active
  WHERE id = p_staff_id;

  RETURN jsonb_build_object(
    'success', true,
    'staff_id', p_staff_id,
    'is_active', p_is_active
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_invite(
  p_invite_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_my_outlet text;
  v_invite invites%ROWTYPE;
BEGIN
  v_role := public.get_my_role();
  v_my_outlet := public.get_my_outlet();

  SELECT * INTO v_invite FROM invites WHERE id = p_invite_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite % not found', p_invite_id;
  END IF;

  IF v_role = 'super_admin' THEN
    NULL;
  ELSIF v_role = 'shop_admin' THEN
    IF v_invite.outlet_id <> v_my_outlet THEN
      RAISE EXCEPTION 'Cannot revoke invite for another outlet';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE invites
  SET status = 'revoked'
  WHERE id = p_invite_id;

  RETURN jsonb_build_object('success', true, 'invite_id', p_invite_id, 'status', 'revoked');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS POLICY HARMONIZATION (OUTLETS, SETTINGS, PICKUP SLOTS)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "outlets_admin_all" ON outlets;
DROP POLICY IF EXISTS "outlets_super_admin" ON outlets;
DROP POLICY IF EXISTS "outlets_shop_admin_update" ON outlets;

CREATE POLICY "outlets_super_admin" ON outlets FOR ALL
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "outlets_shop_admin_update" ON outlets FOR UPDATE
  USING (
    public.get_my_role() = 'shop_admin'
    AND id = public.get_my_outlet()
  )
  WITH CHECK (
    public.get_my_role() = 'shop_admin'
    AND id = public.get_my_outlet()
  );

-- Settings RLS
DROP POLICY IF EXISTS "settings_admin_update" ON settings;
DROP POLICY IF EXISTS "settings_super_admin_update" ON settings;

CREATE POLICY "settings_super_admin_update" ON settings FOR ALL
  USING (public.get_my_role() = 'super_admin');

-- Pickup Slots RLS
DROP POLICY IF EXISTS "Admins and staff can manage pickup slots" ON pickup_slots;
DROP POLICY IF EXISTS "pickup_slots_shop_admin" ON pickup_slots;
DROP POLICY IF EXISTS "pickup_slots_super_admin" ON pickup_slots;

CREATE POLICY "pickup_slots_shop_admin" ON pickup_slots FOR ALL
  USING (
    public.get_my_role() = 'shop_admin'
    AND outlet_id = public.get_my_outlet()
  );

CREATE POLICY "pickup_slots_super_admin" ON pickup_slots FOR ALL
  USING (public.get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. REPLICA IDENTITY FULL & REALTIME PUBLICATION EXTENSION
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE menu_items REPLICA IDENTITY FULL;
ALTER TABLE stock_adjustments REPLICA IDENTITY FULL;
ALTER TABLE wallets REPLICA IDENTITY FULL;
ALTER TABLE pickup_slots REPLICA IDENTITY FULL;
ALTER TABLE invites REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pickup_slots;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE invites;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ANALYTICS & HIERARCHY STORED PROCEDURES
-- ─────────────────────────────────────────────────────────────────────────────

-- Outlet Analytics for Shop Admin
CREATE OR REPLACE FUNCTION public.get_outlet_analytics(
  p_outlet_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_my_outlet text;
  v_total_revenue numeric;
  v_total_orders int;
  v_avg_order_value numeric;
  v_best_sellers jsonb;
  v_active_staff int;
BEGIN
  v_role := public.get_my_role();
  v_my_outlet := public.get_my_outlet();

  IF v_role NOT IN ('shop_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_role = 'shop_admin' AND p_outlet_id <> v_my_outlet THEN
    RAISE EXCEPTION 'Cannot access analytics for other outlets';
  END IF;

  SELECT 
    COALESCE(SUM(shop_payout), 0),
    COUNT(*),
    COALESCE(ROUND(AVG(shop_payout), 2), 0)
  INTO v_total_revenue, v_total_orders, v_avg_order_value
  FROM orders
  WHERE outlet_id = p_outlet_id AND status <> 'cancelled';

  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_best_sellers
  FROM (
    SELECT oi.name, SUM(oi.qty) as total_sold, SUM(oi.price * oi.qty) as revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.outlet_id = p_outlet_id AND o.status <> 'cancelled'
    GROUP BY oi.name
    ORDER BY total_sold DESC
    LIMIT 5
  ) sub;

  SELECT COUNT(*) INTO v_active_staff
  FROM profiles
  WHERE outlet_id = p_outlet_id AND role = 'staff' AND is_active = true;

  RETURN jsonb_build_object(
    'outlet_id', p_outlet_id,
    'total_revenue', v_total_revenue,
    'total_orders', v_total_orders,
    'avg_order_value', v_avg_order_value,
    'best_sellers', v_best_sellers,
    'active_staff_count', v_active_staff
  );
END;
$$;

-- Platform-wide Overview & Hierarchy for Super Admin
CREATE OR REPLACE FUNCTION public.get_super_admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_total_gmv numeric;
  v_platform_profit numeric;
  v_total_orders int;
  v_total_outlets int;
  v_hierarchy jsonb;
  v_audit_logs jsonb;
BEGIN
  v_role := public.get_my_role();
  IF v_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: super_admin only';
  END IF;

  SELECT 
    COALESCE(SUM(total), 0),
    COALESCE(SUM(my_profit), 0),
    COUNT(*)
  INTO v_total_gmv, v_platform_profit, v_total_orders
  FROM orders
  WHERE status <> 'cancelled';

  SELECT COUNT(*) INTO v_total_outlets FROM outlets;

  -- Nested Hierarchy: Outlet -> Shop Admin -> Staff
  SELECT COALESCE(jsonb_agg(outlet_node), '[]'::jsonb) INTO v_hierarchy
  FROM (
    SELECT 
      o.id,
      o.name,
      o.location,
      o.is_open,
      o.is_event,
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', sa.id,
            'full_name', sa.full_name,
            'phone', sa.phone,
            'is_active', sa.is_active,
            'staff', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'id', st.id,
                  'full_name', st.full_name,
                  'phone', st.phone,
                  'is_active', st.is_active,
                  'created_at', st.created_at
                )
              ), '[]'::jsonb)
              FROM profiles st
              WHERE st.outlet_id = o.id AND st.role = 'staff'
            )
          )
        ), '[]'::jsonb)
        FROM profiles sa
        WHERE sa.outlet_id = o.id AND sa.role = 'shop_admin'
      ) as shop_admins
    FROM outlets o
    ORDER BY o.name ASC
  ) outlet_node;

  -- Recent Stock Adjustments audit log
  SELECT COALESCE(jsonb_agg(adj), '[]'::jsonb) INTO v_audit_logs
  FROM (
    SELECT 
      sa.id,
      sa.outlet_id,
      o.name as outlet_name,
      sa.item_id,
      mi.name as item_name,
      sa.qty_change,
      sa.previous_qty,
      sa.new_qty,
      sa.reason,
      p.full_name as adjusted_by_name,
      sa.created_at
    FROM stock_adjustments sa
    LEFT JOIN outlets o ON o.id = sa.outlet_id
    LEFT JOIN menu_items mi ON mi.id = sa.item_id
    LEFT JOIN profiles p ON p.id = sa.adjusted_by
    ORDER BY sa.created_at DESC
    LIMIT 25
  ) adj;

  RETURN jsonb_build_object(
    'total_gmv', v_total_gmv,
    'platform_profit', v_platform_profit,
    'total_orders', v_total_orders,
    'total_outlets', v_total_outlets,
    'hierarchy', v_hierarchy,
    'audit_logs', v_audit_logs
  );
END;
$$;
