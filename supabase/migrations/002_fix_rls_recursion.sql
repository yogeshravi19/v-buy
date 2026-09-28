-- =============================================================================
-- V FOODS — Migration 002: Fix RLS Policy Infinite Recursion
-- Run in Supabase SQL Editor to resolve error 42P17
-- =============================================================================

-- 1. Helper functions with SECURITY DEFINER (avoids infinite loop)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid();
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

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
DROP POLICY IF EXISTS "outlets_admin_all" ON outlets;
DROP POLICY IF EXISTS "menu_items_staff_write" ON menu_items;
DROP POLICY IF EXISTS "wallets_admin_all" ON wallets;
DROP POLICY IF EXISTS "wallet_txns_admin_all" ON wallet_txns;
DROP POLICY IF EXISTS "orders_admin_all" ON orders;
DROP POLICY IF EXISTS "orders_staff_read" ON orders;
DROP POLICY IF EXISTS "orders_staff_update" ON orders;
DROP POLICY IF EXISTS "order_items_admin_staff" ON order_items;

-- 3. Re-create clean non-recursive policies
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "outlets_admin_all" ON outlets FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "menu_items_staff_write" ON menu_items FOR ALL
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'staff' AND outlet_id = public.get_my_outlet())
  );

CREATE POLICY "wallets_admin_all" ON wallets FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "wallet_txns_admin_all" ON wallet_txns FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "orders_staff_read" ON orders FOR SELECT
  USING (public.get_my_role() = 'staff' AND outlet_id = public.get_my_outlet());

CREATE POLICY "orders_staff_update" ON orders FOR UPDATE
  USING (public.get_my_role() = 'staff' AND outlet_id = public.get_my_outlet());

CREATE POLICY "orders_admin_all" ON orders FOR ALL
  USING (public.get_my_role() = 'admin');
