-- =====================================================================
-- Migration 017: POS (Counter Billing) Schema, Policies & create_pos_order
-- =====================================================================

-- 1. Extend outlets table with fssai_number
ALTER TABLE outlets
  ADD COLUMN IF NOT EXISTS fssai_number text DEFAULT NULL;

-- 2. Extend stock_adjustments with source
ALTER TABLE stock_adjustments
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'app';

-- 3. Extend orders table for POS Counter Billing
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_source text NOT NULL DEFAULT 'APP',
  ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_note text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_quick_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

-- 3b. Extend order_items with per-item customization notes
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

-- Ensure user_id is nullable for POS rows
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Constraints on orders for order_source, payment_mode, and user_id requirement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_source_enum'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT chk_orders_source_enum 
      CHECK (order_source IN ('APP', 'POS'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_payment_mode'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT chk_orders_payment_mode 
      CHECK (payment_mode IS NULL OR payment_mode IN ('CASH', 'UPI_COUNTER', 'CARD_COUNTER', 'OTHER'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_user_id_source'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT chk_orders_user_id_source 
      CHECK (order_source = 'POS' OR (order_source = 'APP' AND user_id IS NOT NULL));
  END IF;
END $$;

-- Unique index for POS idempotency key per outlet
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_outlet_idempotency
  ON orders (outlet_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 4. RLS on orders: Users must NEVER see POS orders
DROP POLICY IF EXISTS "orders_user_read" ON orders;
CREATE POLICY "orders_user_read" ON orders
  FOR SELECT USING (
    (auth.uid() = user_id AND order_source = 'APP')
    OR (get_my_role() IN ('staff', 'shop_admin') AND outlet_id = get_my_outlet())
    OR get_my_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "orders_staff_insert" ON orders;
CREATE POLICY "orders_staff_insert" ON orders
  FOR INSERT WITH CHECK (
    (get_my_role() IN ('staff', 'shop_admin') AND outlet_id = get_my_outlet())
    OR get_my_role() = 'super_admin'
    OR (auth.uid() = user_id AND order_source = 'APP')
  );

-- 5. Atomic function: create_pos_order
CREATE OR REPLACE FUNCTION create_pos_order(
  p_outlet_id text,
  p_items jsonb, -- Array of objects: [{"item_id": 101, "qty": 2, "notes": "extra spicy"}]
  p_payment_mode text, -- 'CASH', 'UPI_COUNTER', 'CARD_COUNTER', 'OTHER'
  p_payment_note text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_is_quick_sale boolean DEFAULT false,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role text;
  v_caller_outlet text;
  v_caller_id uuid;
  v_existing_order record;
  v_item record;
  v_menu_item record;
  v_order_num text;
  v_total_amount integer := 0;
  v_order_id bigint;
  v_initial_status text;
  v_curr_time time;
  v_previous_stock integer;
  v_new_stock integer;
BEGIN
  v_caller_id := auth.uid();
  v_caller_role := get_my_role();
  v_caller_outlet := get_my_outlet();

  -- 1. Authorization check: Staff and Shop Admin only for their outlet; Super Admin for any
  IF v_caller_role NOT IN ('staff', 'shop_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not staff, shop_admin or super_admin';
  END IF;

  IF v_caller_role IN ('staff', 'shop_admin') AND v_caller_outlet <> p_outlet_id THEN
    RAISE EXCEPTION 'Forbidden: Staff and Shop Admin can only bill for their assigned outlet %', v_caller_outlet;
  END IF;

  -- 2. Validate payment mode
  IF p_payment_mode NOT IN ('CASH', 'UPI_COUNTER', 'CARD_COUNTER', 'OTHER') THEN
    RAISE EXCEPTION 'Invalid payment mode: %', p_payment_mode;
  END IF;

  -- 3. Idempotency Check
  IF p_idempotency_key IS NOT NULL AND trim(p_idempotency_key) <> '' THEN
    SELECT id, order_number, token, status, total, created_at, customer_name
    INTO v_existing_order
    FROM orders
    WHERE outlet_id = p_outlet_id AND idempotency_key = trim(p_idempotency_key)
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'order_id', v_existing_order.id,
        'order_number', v_existing_order.order_number,
        'token', v_existing_order.token,
        'status', v_existing_order.status,
        'total', v_existing_order.total,
        'customer_name', v_existing_order.customer_name,
        'is_duplicate', true
      );
    END IF;
  END IF;

  -- 4. Validate items array
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot create an empty POS order';
  END IF;

  v_curr_time := (timezone('Asia/Kolkata', now()))::time;

  -- 5. Lock and validate items, verify pricing and stock availability
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id bigint, qty integer, notes text)
  LOOP
    IF v_item.qty <= 0 THEN
      RAISE EXCEPTION 'Quantity for item % must be greater than zero', v_item.item_id;
    END IF;

    SELECT id, outlet_id, name, price, available, is_veg, stock_qty, available_from, available_to, is_archived
    INTO v_menu_item
    FROM menu_items
    WHERE id = v_item.item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item % not found', v_item.item_id;
    END IF;

    IF v_menu_item.outlet_id <> p_outlet_id THEN
      RAISE EXCEPTION 'Item % belongs to another outlet %', v_item.item_id, v_menu_item.outlet_id;
    END IF;

    IF v_menu_item.is_archived = true THEN
      RAISE EXCEPTION 'Item "%" is archived and cannot be ordered', v_menu_item.name;
    END IF;

    IF v_menu_item.available = false THEN
      RAISE EXCEPTION 'Item "%" is currently marked unavailable', v_menu_item.name;
    END IF;

    -- Availability window check
    IF v_menu_item.available_from IS NOT NULL AND v_menu_item.available_to IS NOT NULL THEN
      IF v_curr_time < v_menu_item.available_from OR v_curr_time > v_menu_item.available_to THEN
        RAISE EXCEPTION 'Item "%" is outside its active serving window (% to %)',
          v_menu_item.name, v_menu_item.available_from, v_menu_item.available_to;
      END IF;
    END IF;

    -- Stock check & adjustment
    IF v_menu_item.stock_qty IS NOT NULL THEN
      IF v_menu_item.stock_qty < v_item.qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%" (requested %, available %)',
          v_menu_item.name, v_item.qty, v_menu_item.stock_qty;
      END IF;

      v_previous_stock := v_menu_item.stock_qty;
      v_new_stock := v_previous_stock - v_item.qty;

      UPDATE menu_items
      SET stock_qty = v_new_stock,
          available = (v_new_stock > 0)
      WHERE id = v_menu_item.id;

      INSERT INTO stock_adjustments (
        outlet_id, item_id, adjusted_by, qty_change, previous_qty, new_qty, reason, source
      ) VALUES (
        p_outlet_id, v_menu_item.id, v_caller_id, -v_item.qty, v_previous_stock, v_new_stock, 'counter_pos', 'pos'
      );
    END IF;

    v_total_amount := v_total_amount + (v_menu_item.price * v_item.qty);
  END LOOP;

  -- 6. Allocate single-source-of-truth order number from Phase 1 daily counter
  v_order_num := allocate_order_number(p_outlet_id);

  -- 7. Determine initial order status
  IF p_is_quick_sale THEN
    v_initial_status := 'collected';
  ELSE
    v_initial_status := 'placed';
  END IF;

  -- 8. Insert into orders table (NO platform split, NO wallet, NO Paytm)
  INSERT INTO orders (
    outlet_id,
    user_id,
    order_number,
    token,
    status,
    total,
    shop_payout,
    order_source,
    payment_mode,
    payment_note,
    payment_method,
    created_by,
    idempotency_key,
    is_quick_sale,
    notes,
    customer_name,
    created_at
  ) VALUES (
    p_outlet_id,
    NULL,
    v_order_num,
    v_order_num, -- Token synchronized with order_number
    v_initial_status::order_status,
    v_total_amount,
    v_total_amount, -- POS counter sales are 100% shop payout (no platform markup)
    'POS',
    p_payment_mode,
    p_payment_note,
    'gateway'::payment_method,
    v_caller_id,
    p_idempotency_key,
    p_is_quick_sale,
    p_notes,
    COALESCE(trim(p_customer_name), 'Counter Walk-in'),
    now()
  )
  RETURNING id INTO v_order_id;

  -- 9. Insert snapshots into order_items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id bigint, qty integer, notes text)
  LOOP
    SELECT name, price INTO v_menu_item FROM menu_items WHERE id = v_item.item_id;

    INSERT INTO order_items (order_id, item_id, name, price, qty, notes)
    VALUES (v_order_id, v_item.item_id, v_menu_item.name, v_menu_item.price, v_item.qty, v_item.notes);
  END LOOP;

  -- 10. Audit log for Super Admin actions
  IF v_caller_role = 'super_admin' THEN
    INSERT INTO menu_items_audit (outlet_id, changed_by, field_name, old_value, new_value)
    VALUES (p_outlet_id, v_caller_id, 'pos_super_admin_sale', NULL, 'Order #' || v_order_num || ' (₹' || v_total_amount || ')');
  END IF;

  -- 11. Return response
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_num,
    'token', v_order_num,
    'status', v_initial_status,
    'total', v_total_amount,
    'payment_mode', p_payment_mode,
    'order_source', 'POS',
    'created_at', now()
  );
END;
$$;

-- 6. Atomic function: void_pos_order (Restores stock, cancels order, logs void)
CREATE OR REPLACE FUNCTION void_pos_order(
  p_order_id bigint,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role text;
  v_caller_outlet text;
  v_caller_id uuid;
  v_order record;
  v_item record;
  v_curr_stock integer;
  v_new_stock integer;
BEGIN
  v_caller_id := auth.uid();
  v_caller_role := get_my_role();
  v_caller_outlet := get_my_outlet();

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.order_source <> 'POS' THEN
    RAISE EXCEPTION 'Only POS orders can be voided via void_pos_order';
  END IF;

  IF v_caller_role IN ('staff', 'shop_admin') AND v_order.outlet_id <> v_caller_outlet THEN
    RAISE EXCEPTION 'Forbidden: You can only void orders for your outlet';
  END IF;

  IF v_order.status IN ('ready', 'collected') THEN
    RAISE EXCEPTION 'Cannot void an order that is already ready or collected';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Order already cancelled');
  END IF;

  -- Update order status to cancelled
  UPDATE orders
  SET status = 'cancelled',
      notes = COALESCE(notes || ' | ', '') || 'VOIDED: ' || COALESCE(p_reason, 'No reason provided'),
      updated_at = now()
  WHERE id = p_order_id;

  -- Restore stock for all items
  FOR v_item IN SELECT item_id, qty FROM order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.item_id IS NOT NULL THEN
      SELECT stock_qty INTO v_curr_stock FROM menu_items WHERE id = v_item.item_id FOR UPDATE;

      IF v_curr_stock IS NOT NULL THEN
        v_new_stock := v_curr_stock + v_item.qty;
        UPDATE menu_items SET stock_qty = v_new_stock, available = true WHERE id = v_item.item_id;

        INSERT INTO stock_adjustments (
          outlet_id, item_id, adjusted_by, qty_change, previous_qty, new_qty, reason, source
        ) VALUES (
          v_order.outlet_id, v_item.item_id, v_caller_id, v_item.qty, v_curr_stock, v_new_stock, 'restock', 'pos_void'
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', 'cancelled',
    'restored', true
  );
END;
$$;
