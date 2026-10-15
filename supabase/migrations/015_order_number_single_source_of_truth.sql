-- =============================================================================
-- Migration 015: Order Number Single Source of Truth
-- 
-- 1. Create per-outlet per-day atomic counter table
-- 2. Allocate monotonic sequential 3-digit order numbers resetting daily at IST midnight
-- 3. Add order_number column to orders with UNIQUE index per outlet per day
-- 4. Backfill existing orders without renumbering
-- 5. Set up BEFORE INSERT & BEFORE UPDATE triggers ensuring order_number is always populated
-- 6. Keep money math (totals, platform margin, wallet debit, splits) 100% untouched
-- =============================================================================

-- 1. Counter table
CREATE TABLE IF NOT EXISTS outlet_daily_counters (
  outlet_id text NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  order_date date NOT NULL,
  last_number int NOT NULL DEFAULT 0,
  PRIMARY KEY (outlet_id, order_date)
);

-- 2. Add order_number column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;

-- 3. Atomic counter allocation function
CREATE OR REPLACE FUNCTION allocate_order_number(p_outlet_id text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_date date;
  v_num int;
  v_token text;
BEGIN
  -- Date in India standard time (UTC+5:30)
  v_date := (timezone('Asia/Kolkata', now()))::date;
  
  -- Upsert with atomic row lock
  INSERT INTO outlet_daily_counters (outlet_id, order_date, last_number)
  VALUES (p_outlet_id, v_date, 1)
  ON CONFLICT (outlet_id, order_date)
  DO UPDATE SET last_number = outlet_daily_counters.last_number + 1
  RETURNING last_number INTO v_num;
  
  -- Formatted as minimum 3-digit string ('001', '042', '125', etc.)
  v_token := lpad(v_num::text, 3, '0');
  RETURN v_token;
END;
$$;

-- 4. Update legacy helper to point to allocate_order_number
CREATE OR REPLACE FUNCTION _generate_token(p_outlet_id text)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN allocate_order_number(p_outlet_id);
END;
$$;

-- 5. Backfill existing rows (only rows with missing order_number, never renumber existing tokens)
UPDATE orders
SET order_number = COALESCE(token, lpad(id::text, 3, '0'))
WHERE order_number IS NULL;

UPDATE orders
SET token = order_number
WHERE token IS NULL;

-- 6. Ensure UNIQUE constraint for assigned order_numbers per outlet per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_outlet_day_order_number 
ON orders (outlet_id, ((timezone('Asia/Kolkata', created_at))::date), order_number)
WHERE status != 'payment_pending' AND order_number IS NOT NULL;

-- 7. Trigger to guarantee order_number and token synchronization on INSERT
CREATE OR REPLACE FUNCTION trg_assign_order_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_number IS NULL AND NEW.token IS NOT NULL THEN
    NEW.order_number := NEW.token;
  ELSIF NEW.order_number IS NOT NULL AND NEW.token IS NULL THEN
    NEW.token := NEW.order_number;
  ELSIF NEW.order_number IS NULL AND NEW.token IS NULL AND NEW.status != 'payment_pending' THEN
    NEW.order_number := allocate_order_number(NEW.outlet_id);
    NEW.token := NEW.order_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_order_number ON orders;
CREATE TRIGGER trg_orders_order_number
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION trg_assign_order_number();

-- 8. Trigger to assign order_number when status changes from payment_pending to placed
CREATE OR REPLACE FUNCTION trg_orders_status_update_order_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'payment_pending' AND NEW.status = 'placed' THEN
    IF NEW.order_number IS NULL THEN
      NEW.order_number := allocate_order_number(NEW.outlet_id);
    END IF;
    NEW.token := NEW.order_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_status_update ON orders;
CREATE TRIGGER trg_orders_status_update
BEFORE UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION trg_orders_status_update_order_number();

-- 9. Update place_order_wallet keeping exact signature RETURNS bigint
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
  v_user          profiles%ROWTYPE;
  v_wallet        wallets%ROWTYPE;
  v_coupon        coupons%ROWTYPE;
  v_slot          pickup_slots%ROWTYPE;
  v_order_id      bigint;
  v_token         text;
  v_shop_payout   int := 0;
  v_total         int := 0;
  v_student_debit int := 0;
  v_discount      int := 0;
  v_tax_service   int := 0;
  v_convenience   int := 0;
  v_item_id       bigint;
  v_qty           int;
  v_item          menu_items%ROWTYPE;
  v_elem          jsonb;
  v_old_qty       int;
BEGIN
  -- a) Verify user
  SELECT * INTO v_user FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', p_user_id;
  END IF;

  -- b) Verify outlet
  SELECT * INTO v_outlet FROM outlets WHERE id = p_outlet_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Outlet not found: %', p_outlet_id;
  END IF;
  IF NOT v_outlet.is_open THEN
    RAISE EXCEPTION 'Outlet % is currently closed', v_outlet.name;
  END IF;

  -- c) Validate pickup slot if provided
  IF p_slot_id IS NOT NULL THEN
    SELECT * INTO v_slot FROM pickup_slots WHERE id = p_slot_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pickup slot not found: %', p_slot_id;
    END IF;
    IF NOT v_slot.is_active THEN
      RAISE EXCEPTION 'Pickup slot is inactive';
    END IF;
  END IF;

  -- d) Compute shop payout & validate items
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_elem->>'item_id')::bigint;
    v_qty     := (v_elem->>'qty')::int;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be positive for item %', v_item_id;
    END IF;

    SELECT * INTO v_item FROM menu_items WHERE id = v_item_id AND outlet_id = p_outlet_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item % not found for outlet %', v_item_id, p_outlet_id;
    END IF;
    IF NOT v_item.available THEN
      RAISE EXCEPTION 'Item % (%) is currently unavailable', v_item.name, v_item_id;
    END IF;
    IF v_item.stock_qty IS NOT NULL AND v_item.stock_qty < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for %: requested %, available %', v_item.name, v_qty, v_item.stock_qty;
    END IF;

    v_shop_payout := v_shop_payout + (v_item.price * v_qty);
  END LOOP;

  -- e) Apply coupon if provided
  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon FROM coupons
    WHERE code = upper(trim(p_coupon_code))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now());

    IF FOUND THEN
      IF v_coupon.min_order_amount IS NOT NULL AND v_shop_payout < v_coupon.min_order_amount THEN
        RAISE EXCEPTION 'Order amount ₹% does not meet minimum ₹% for coupon %',
          v_shop_payout, v_coupon.min_order_amount, v_coupon.code;
      END IF;

      IF v_coupon.discount_percent IS NOT NULL THEN
        v_discount := (v_shop_payout * v_coupon.discount_percent) / 100;
      ELSIF v_coupon.discount_flat IS NOT NULL THEN
        v_discount := v_coupon.discount_flat;
      END IF;

      IF v_coupon.max_discount IS NOT NULL AND v_discount > v_coupon.max_discount THEN
        v_discount := v_coupon.max_discount;
      END IF;
    END IF;
  END IF;

  -- f) Fee calculations
  v_tax_service := floor(v_shop_payout * 5 / 100);
  v_convenience := ceil(v_shop_payout * 2 / 100);
  v_total       := v_shop_payout + v_tax_service + v_convenience;
  v_student_debit := GREATEST(0, v_total - v_discount);

  -- g) Atomic wallet debit
  UPDATE wallets
  SET balance = balance - v_student_debit
  WHERE user_id = p_user_id AND balance >= v_student_debit;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: ₹%', v_student_debit;
  END IF;

  -- h) Atomic single source of truth order number
  v_token := allocate_order_number(p_outlet_id);

  -- i) Insert order
  INSERT INTO orders (
    user_id, outlet_id, token, order_number, status, payment_method,
    shop_payout, total, pickup_slot_id, group_id, is_group_payer
  )
  VALUES (
    p_user_id, p_outlet_id, v_token, v_token, 'placed', 'wallet',
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

  -- m) Calculate Three-Way Split for Wallet Order
  BEGIN
    PERFORM calculate_order_split(v_order_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_order_id;
END;
$$;

-- 10. Verify pickup code RPC supporting order_number
CREATE OR REPLACE FUNCTION verify_pickup_code(
  p_outlet_id text,
  p_order_id bigint,
  p_token text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order RECORD;
  v_norm_token text;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.outlet_id <> p_outlet_id THEN
    RAISE EXCEPTION 'Order does not belong to outlet %', p_outlet_id;
  END IF;

  v_norm_token := upper(trim(p_token));
  v_norm_token := replace(v_norm_token, '#', '');

  IF upper(trim(COALESCE(v_order.order_number, ''))) <> v_norm_token 
     AND upper(trim(COALESCE(v_order.token, ''))) <> v_norm_token THEN
    RAISE EXCEPTION 'Invalid pickup code. Token does not match order #%', p_order_id;
  END IF;

  IF v_order.status NOT IN ('placed', 'preparing', 'ready') THEN
    RAISE EXCEPTION 'Order status % cannot be marked collected', v_order.status;
  END IF;

  UPDATE orders
  SET status = 'collected', updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_number', COALESCE(v_order.order_number, v_order.token),
    'token', v_order.token,
    'status', 'collected'
  );
END;
$$;
