-- =============================================================================
-- Migration 008: Four-Tier Role Hierarchy, Invite Flow & Stock Adjustments
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ROLE ENUM EXPANSION & PROFILES EXTENSION
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'shop_admin';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS added_by uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Migrate legacy roles if any exist
UPDATE profiles SET role = 'student' WHERE role::text = 'customer';
UPDATE profiles SET role = 'super_admin' WHERE role::text = 'admin';

-- Set default role to 'student'
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'student'::user_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HELPER FUNCTIONS FOR RLS (Security Definer avoids recursion)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN role::text = 'admin' THEN 'super_admin'
    WHEN role::text = 'customer' THEN 'student'
    ELSE role::text
  END
  FROM profiles 
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_outlet()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT outlet_id FROM profiles WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. STOCK ADJUSTMENTS AUDIT TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  outlet_id    text NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id      bigint NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  adjusted_by  uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  qty_change   int NOT NULL,
  previous_qty int NULL,
  new_qty      int NULL,
  reason       text NOT NULL CHECK (reason IN ('manual_adjustment', 'order_decrement', 'counter_pos', '86_sold_out', 'restock')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_adj_outlet_created ON stock_adjustments(outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_adj_item ON stock_adjustments(item_id);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. INVITES SYSTEM
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  email       text NULL,
  phone       text NULL,
  role        user_role NOT NULL CHECK (role IN ('staff', 'shop_admin')),
  outlet_id   text NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  invited_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  accepted_by uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_outlet ON invites(outlet_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON invites(invited_by);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. STORED PROCEDURES: ADJUST STOCK & INVITES
-- ─────────────────────────────────────────────────────────────────────────────

-- 5.1 adjust_stock: atomic manual adjustment by staff / shop_admin / super_admin
CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_item_id bigint,
  p_new_qty int,
  p_reason text DEFAULT 'manual_adjustment'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_outlet_id text;
  v_item_outlet_id text;
  v_old_qty int;
  v_qty_change int;
  v_item_name text;
BEGIN
  v_role := public.get_my_role();
  v_outlet_id := public.get_my_outlet();

  -- Fetch item details with lock
  SELECT outlet_id, stock_qty, name 
  INTO v_item_outlet_id, v_old_qty, v_item_name
  FROM menu_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Menu item % not found', p_item_id;
  END IF;

  -- Permission guard
  IF v_role = 'super_admin' THEN
    -- super admin can adjust any item
    NULL;
  ELSIF v_role IN ('shop_admin', 'staff') THEN
    IF v_outlet_id IS NULL OR v_outlet_id <> v_item_outlet_id THEN
      RAISE EXCEPTION 'Permission denied: item belongs to outlet % but caller belongs to %', v_item_outlet_id, v_outlet_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized: only staff, shop_admin, and super_admin can adjust stock';
  END IF;

  v_old_qty := COALESCE(v_old_qty, 0);
  v_qty_change := p_new_qty - v_old_qty;

  -- Update menu_items
  UPDATE menu_items
  SET stock_qty = p_new_qty,
      available = (p_new_qty > 0)
  WHERE id = p_item_id;

  -- Log adjustment
  INSERT INTO stock_adjustments (
    outlet_id,
    item_id,
    adjusted_by,
    qty_change,
    previous_qty,
    new_qty,
    reason
  ) VALUES (
    v_item_outlet_id,
    p_item_id,
    auth.uid(),
    v_qty_change,
    v_old_qty,
    p_new_qty,
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'item_id', p_item_id,
    'name', v_item_name,
    'previous_qty', v_old_qty,
    'new_qty', p_new_qty,
    'available', (p_new_qty > 0)
  );
END;
$$;

-- 5.2 create_invite: scoped invite generator
CREATE OR REPLACE FUNCTION public.create_invite(
  p_role text,
  p_outlet_id text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_role text;
  v_my_outlet text;
  v_code text;
  v_target_role user_role;
  v_invite_id uuid;
BEGIN
  v_my_role := public.get_my_role();
  v_my_outlet := public.get_my_outlet();

  IF p_role NOT IN ('staff', 'shop_admin') THEN
    RAISE EXCEPTION 'Invalid invite role. Can only invite staff or shop_admin.';
  END IF;

  v_target_role := p_role::user_role;

  -- Validate permissions
  IF v_my_role = 'super_admin' THEN
    -- Super Admin can invite shop_admin or staff for any outlet
    IF p_outlet_id IS NULL THEN
      RAISE EXCEPTION 'Outlet ID is required for invites.';
    END IF;
  ELSIF v_my_role = 'shop_admin' THEN
    -- Shop Admin can ONLY invite staff for their OWN outlet
    IF v_target_role <> 'staff'::user_role THEN
      RAISE EXCEPTION 'Shop Admins can only invite Staff accounts.';
    END IF;
    IF p_outlet_id <> v_my_outlet THEN
      RAISE EXCEPTION 'Shop Admins can only invite staff to their own outlet (%).', v_my_outlet;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized: only Super Admin and Shop Admin can generate invites.';
  END IF;

  -- Generate secure random 8-character uppercase alphanumeric code
  v_code := upper(substring(encode(gen_random_bytes(6), 'hex') from 1 for 8));

  INSERT INTO invites (
    code,
    email,
    phone,
    role,
    outlet_id,
    invited_by,
    expires_at,
    status
  ) VALUES (
    v_code,
    p_email,
    p_phone,
    v_target_role,
    p_outlet_id,
    auth.uid(),
    now() + interval '7 days',
    'pending'
  ) RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'invite_id', v_invite_id,
    'code', v_code,
    'role', p_role,
    'outlet_id', p_outlet_id,
    'expires_at', now() + interval '7 days'
  );
END;
$$;

-- 5.3 accept_invite: redeem invite and set profile role & outlet
CREATE OR REPLACE FUNCTION public.accept_invite(
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to accept an invite.';
  END IF;

  SELECT * INTO v_invite
  FROM invites
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code.';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'Invite code has already been %', v_invite.status;
  END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE invites SET status = 'expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Invite code has expired.';
  END IF;

  -- Update the user profile with the assigned role, outlet, and added_by
  UPDATE profiles
  SET role = v_invite.role,
      outlet_id = v_invite.outlet_id,
      added_by = v_invite.invited_by
  WHERE id = v_user_id;

  -- Mark invite as accepted
  UPDATE invites
  SET status = 'accepted',
      accepted_by = v_user_id
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'role', v_invite.role,
    'outlet_id', v_invite.outlet_id
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. REFINED ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- 6.1 PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
DROP POLICY IF EXISTS "profiles_shop_admin_team" ON profiles;
DROP POLICY IF EXISTS "profiles_super_admin_all" ON profiles;

-- Users can view their own profile
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own phone and full_name
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Shop Admins can view and manage their outlet's staff team
CREATE POLICY "profiles_shop_admin_team" ON profiles FOR SELECT
  USING (
    public.get_my_role() = 'shop_admin' 
    AND outlet_id = public.get_my_outlet()
  );

CREATE POLICY "profiles_shop_admin_update_team" ON profiles FOR UPDATE
  USING (
    public.get_my_role() = 'shop_admin' 
    AND outlet_id = public.get_my_outlet() 
    AND role = 'staff'::user_role
  );

-- Super Admins can see and manage all profiles
CREATE POLICY "profiles_super_admin_all" ON profiles FOR ALL
  USING (public.get_my_role() = 'super_admin');

-- 6.2 ORDERS POLICIES
DROP POLICY IF EXISTS "orders_customer_read" ON orders;
DROP POLICY IF EXISTS "orders_customer_insert" ON orders;
DROP POLICY IF EXISTS "orders_staff_read" ON orders;
DROP POLICY IF EXISTS "orders_staff_update" ON orders;
DROP POLICY IF EXISTS "orders_admin_all" ON orders;
DROP POLICY IF EXISTS "orders_shop_admin" ON orders;

-- Student/Customer views own orders
CREATE POLICY "orders_student_read" ON orders FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Staff views orders for their assigned outlet
CREATE POLICY "orders_staff_read" ON orders FOR SELECT
  USING (
    public.get_my_role() = 'staff' 
    AND outlet_id = public.get_my_outlet()
  );

-- Staff updates order status for their assigned outlet
CREATE POLICY "orders_staff_update" ON orders FOR UPDATE
  USING (
    public.get_my_role() = 'staff' 
    AND outlet_id = public.get_my_outlet()
  );

-- Shop Admin views and updates orders for their assigned outlet
CREATE POLICY "orders_shop_admin" ON orders FOR ALL
  USING (
    public.get_my_role() = 'shop_admin' 
    AND outlet_id = public.get_my_outlet()
  );

-- Super Admin has full cross-outlet access
CREATE POLICY "orders_super_admin_all" ON orders FOR ALL
  USING (public.get_my_role() = 'super_admin');

-- 6.3 ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "order_items_customer_read" ON order_items;
DROP POLICY IF EXISTS "order_items_admin_staff" ON order_items;
DROP POLICY IF EXISTS "order_items_outlet_read" ON order_items;
DROP POLICY IF EXISTS "order_items_super_admin" ON order_items;

CREATE POLICY "order_items_student_read" ON order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

CREATE POLICY "order_items_outlet_read" ON order_items FOR SELECT
  USING (
    public.get_my_role() IN ('staff', 'shop_admin')
    AND EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
        AND orders.outlet_id = public.get_my_outlet()
    )
  );

CREATE POLICY "order_items_super_admin" ON order_items FOR ALL
  USING (public.get_my_role() = 'super_admin');

-- 6.4 MENU ITEMS POLICIES
DROP POLICY IF EXISTS "menu_items_public_read" ON menu_items;
DROP POLICY IF EXISTS "menu_items_staff_write" ON menu_items;
DROP POLICY IF EXISTS "menu_items_shop_admin" ON menu_items;
DROP POLICY IF EXISTS "menu_items_super_admin" ON menu_items;

-- Anyone can read available menu items
CREATE POLICY "menu_items_public_read" ON menu_items FOR SELECT
  USING (true);

-- Staff can update stock_qty and availability for their outlet
CREATE POLICY "menu_items_staff_update" ON menu_items FOR UPDATE
  USING (
    public.get_my_role() = 'staff' 
    AND outlet_id = public.get_my_outlet()
  );

-- Shop Admin has full CRUD for their outlet
CREATE POLICY "menu_items_shop_admin" ON menu_items FOR ALL
  USING (
    public.get_my_role() = 'shop_admin' 
    AND outlet_id = public.get_my_outlet()
  );

-- Super Admin has full CRUD across all outlets
CREATE POLICY "menu_items_super_admin" ON menu_items FOR ALL
  USING (public.get_my_role() = 'super_admin');

-- 6.5 STOCK ADJUSTMENTS POLICIES
DROP POLICY IF EXISTS "stock_adj_staff_read" ON stock_adjustments;
DROP POLICY IF EXISTS "stock_adj_super_admin" ON stock_adjustments;

CREATE POLICY "stock_adj_outlet_read" ON stock_adjustments FOR SELECT
  USING (
    public.get_my_role() IN ('staff', 'shop_admin')
    AND outlet_id = public.get_my_outlet()
  );

CREATE POLICY "stock_adj_super_admin" ON stock_adjustments FOR ALL
  USING (public.get_my_role() = 'super_admin');

-- 6.6 INVITES POLICIES
DROP POLICY IF EXISTS "invites_shop_admin" ON invites;
DROP POLICY IF EXISTS "invites_super_admin" ON invites;

CREATE POLICY "invites_shop_admin" ON invites FOR ALL
  USING (
    public.get_my_role() = 'shop_admin' 
    AND outlet_id = public.get_my_outlet()
  );

CREATE POLICY "invites_super_admin" ON invites FOR ALL
  USING (public.get_my_role() = 'super_admin');

-- 6.7 WALLETS & TRANSACTIONS POLICIES
DROP POLICY IF EXISTS "wallets_own_read" ON wallets;
DROP POLICY IF EXISTS "wallets_admin_all" ON wallets;
DROP POLICY IF EXISTS "wallets_super_admin" ON wallets;
DROP POLICY IF EXISTS "wallet_txns_own_read" ON wallet_txns;
DROP POLICY IF EXISTS "wallet_txns_admin_all" ON wallet_txns;
DROP POLICY IF EXISTS "wallet_txns_super_admin" ON wallet_txns;

CREATE POLICY "wallets_own_read" ON wallets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "wallets_super_admin" ON wallets FOR SELECT
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "wallet_txns_own_read" ON wallet_txns FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "wallet_txns_super_admin" ON wallet_txns FOR SELECT
  USING (public.get_my_role() = 'super_admin');

-- 6.8 COUPONS POLICIES
DROP POLICY IF EXISTS "coupons_shop_admin" ON coupons;
DROP POLICY IF EXISTS "coupons_super_admin" ON coupons;

CREATE POLICY "coupons_shop_admin" ON coupons FOR ALL
  USING (
    public.get_my_role() = 'shop_admin' 
    AND outlet_id = public.get_my_outlet()
  );

CREATE POLICY "coupons_super_admin" ON coupons FOR ALL
  USING (public.get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. REALTIME PUBLICATION EXTENSION
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE stock_adjustments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
