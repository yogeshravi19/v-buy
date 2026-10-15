-- =====================================================================
-- Migration 016: Menu Management, Archival, Storage Policies & Audit Log
-- =====================================================================

-- 1. Schema Extensions on menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Constraint: price must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_menu_items_price_positive'
  ) THEN
    ALTER TABLE menu_items ADD CONSTRAINT chk_menu_items_price_positive CHECK (price > 0);
  END IF;
END $$;

-- 2. Storage Bucket for menu-images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  2097152, -- 2MB max at bucket level
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- 3. Storage Policies on storage.objects
DROP POLICY IF EXISTS "menu_images_public_read" ON storage.objects;
CREATE POLICY "menu_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "menu_images_super_admin" ON storage.objects;
CREATE POLICY "menu_images_super_admin" ON storage.objects
  FOR ALL USING (
    bucket_id = 'menu-images' AND get_my_role() = 'super_admin'
  ) WITH CHECK (
    bucket_id = 'menu-images' AND get_my_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "menu_images_outlet_staff_admin" ON storage.objects;
CREATE POLICY "menu_images_outlet_staff_admin" ON storage.objects
  FOR ALL USING (
    bucket_id = 'menu-images'
    AND get_my_role() IN ('staff', 'shop_admin')
    AND (storage.foldername(name))[1] = get_my_outlet()
  ) WITH CHECK (
    bucket_id = 'menu-images'
    AND get_my_role() IN ('staff', 'shop_admin')
    AND (storage.foldername(name))[1] = get_my_outlet()
  );

-- 4. Menu Items RLS and Staff Protection Triggers
DROP POLICY IF EXISTS "menu_items_public_read" ON menu_items;
CREATE POLICY "menu_items_public_read" ON menu_items
  FOR SELECT USING (
    is_archived = false
    OR get_my_role() = 'super_admin'
    OR (get_my_role() IN ('shop_admin', 'staff') AND outlet_id = get_my_outlet())
  );

DROP POLICY IF EXISTS "menu_items_staff_insert" ON menu_items;
CREATE POLICY "menu_items_staff_insert" ON menu_items
  FOR INSERT WITH CHECK (
    (get_my_role() = 'staff' AND outlet_id = get_my_outlet())
    OR (get_my_role() = 'shop_admin' AND outlet_id = get_my_outlet())
    OR get_my_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "menu_items_staff_update" ON menu_items;
CREATE POLICY "menu_items_staff_update" ON menu_items
  FOR UPDATE USING (
    (get_my_role() = 'staff' AND outlet_id = get_my_outlet())
    OR (get_my_role() = 'shop_admin' AND outlet_id = get_my_outlet())
    OR get_my_role() = 'super_admin'
  ) WITH CHECK (
    (get_my_role() = 'staff' AND outlet_id = get_my_outlet())
    OR (get_my_role() = 'shop_admin' AND outlet_id = get_my_outlet())
    OR get_my_role() = 'super_admin'
  );

-- Function & Trigger: Enforce that staff cannot change outlet_id or is_archived
CREATE OR REPLACE FUNCTION trg_menu_items_staff_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF get_my_role() = 'staff' THEN
    IF NEW.outlet_id <> OLD.outlet_id THEN
      RAISE EXCEPTION 'Staff cannot change item outlet_id';
    END IF;
    IF NEW.is_archived IS DISTINCT FROM OLD.is_archived THEN
      RAISE EXCEPTION 'Only Shop Admin or Super Admin can archive or restore items';
    END IF;
  END IF;

  NEW.updated_at = now();

  IF NEW.is_archived = true AND (OLD.is_archived = false OR OLD.is_archived IS NULL) THEN
    NEW.archived_at = now();
  ELSIF NEW.is_archived = false AND OLD.is_archived = true THEN
    NEW.archived_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_menu_items_staff_restrictions ON menu_items;
CREATE TRIGGER trg_menu_items_staff_restrictions
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_menu_items_staff_restrictions();

-- Prevent hard delete of menu items if referenced by any order_items
CREATE OR REPLACE FUNCTION trg_prevent_hard_delete_menu_items()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM order_items WHERE item_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete menu item referenced by orders. Archive it instead.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_hard_delete_menu_items ON menu_items;
CREATE TRIGGER trg_prevent_hard_delete_menu_items
  BEFORE DELETE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_hard_delete_menu_items();

-- 5. Audit Log Table & Trigger
CREATE TABLE IF NOT EXISTS menu_items_audit (
  id bigserial PRIMARY KEY,
  item_id bigint REFERENCES menu_items(id) ON DELETE SET NULL,
  outlet_id text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  field_name text NOT NULL,
  old_value text,
  new_value text
);

ALTER TABLE menu_items_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_audit_shop_admin" ON menu_items_audit;
CREATE POLICY "menu_audit_shop_admin" ON menu_items_audit
  FOR SELECT USING (
    (get_my_role() = 'shop_admin' AND outlet_id = get_my_outlet())
    OR get_my_role() = 'super_admin'
  );

CREATE OR REPLACE FUNCTION trg_log_menu_item_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'UPDATE' THEN
    IF OLD.price IS DISTINCT FROM NEW.price THEN
      INSERT INTO menu_items_audit (item_id, outlet_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.outlet_id, v_user_id, 'price', OLD.price::text, NEW.price::text);
    END IF;

    IF OLD.name IS DISTINCT FROM NEW.name THEN
      INSERT INTO menu_items_audit (item_id, outlet_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.outlet_id, v_user_id, 'name', OLD.name, NEW.name);
    END IF;

    IF OLD.image_url IS DISTINCT FROM NEW.image_url THEN
      INSERT INTO menu_items_audit (item_id, outlet_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.outlet_id, v_user_id, 'photo', OLD.image_url, NEW.image_url);
    END IF;

    IF OLD.available IS DISTINCT FROM NEW.available THEN
      INSERT INTO menu_items_audit (item_id, outlet_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.outlet_id, v_user_id, 'availability', OLD.available::text, NEW.available::text);
    END IF;

    IF OLD.is_archived IS DISTINCT FROM NEW.is_archived THEN
      INSERT INTO menu_items_audit (item_id, outlet_id, changed_by, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.outlet_id, v_user_id, 'archived', OLD.is_archived::text, NEW.is_archived::text);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_menu_item_changes ON menu_items;
CREATE TRIGGER trg_log_menu_item_changes
  AFTER UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_log_menu_item_changes();
