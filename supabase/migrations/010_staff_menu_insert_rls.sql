-- =============================================================================
-- Migration 010: Grant Shop Staff INSERT & UPDATE on menu_items (scoped to own outlet)
--
-- Shop Staff can insert and update menu items scoped strictly to their own outlet.
-- Shop Admin retains full CRUD for their outlet (a strict superset of Staff).
-- Super Admin retains full CRUD across all outlets.
-- =============================================================================

DROP POLICY IF EXISTS "menu_items_staff_write" ON menu_items;
DROP POLICY IF EXISTS "menu_items_staff_insert" ON menu_items;
DROP POLICY IF EXISTS "menu_items_staff_update" ON menu_items;
DROP POLICY IF EXISTS "menu_items_shop_admin" ON menu_items;
DROP POLICY IF EXISTS "menu_items_super_admin" ON menu_items;

-- Staff can insert menu items for their own outlet only
CREATE POLICY "menu_items_staff_insert" ON menu_items FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'staff'
    AND outlet_id = public.get_my_outlet()
  );

-- Staff can update menu items for their own outlet only
CREATE POLICY "menu_items_staff_update" ON menu_items FOR UPDATE
  USING (
    public.get_my_role() = 'staff' 
    AND outlet_id = public.get_my_outlet()
  )
  WITH CHECK (
    public.get_my_role() = 'staff'
    AND outlet_id = public.get_my_outlet()
  );

-- Shop Admin has full CRUD for their outlet
CREATE POLICY "menu_items_shop_admin" ON menu_items FOR ALL
  USING (
    public.get_my_role() = 'shop_admin' 
    AND outlet_id = public.get_my_outlet()
  )
  WITH CHECK (
    public.get_my_role() = 'shop_admin'
    AND outlet_id = public.get_my_outlet()
  );

-- Super Admin has full CRUD across all outlets
CREATE POLICY "menu_items_super_admin" ON menu_items FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');
