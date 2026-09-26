-- =============================================================================
-- Migration 003: Item Ratings Table & Status Constraint Trigger
-- Read-Only Addition: Extends schema without touching wallets or place_order
-- =============================================================================

CREATE TABLE IF NOT EXISTS item_ratings (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id   bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id    bigint NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_order_item_user_rating UNIQUE (order_id, item_id, user_id)
);

-- Index for speedy rating aggregations by menu item
CREATE INDEX IF NOT EXISTS idx_item_ratings_item_id ON item_ratings(item_id);
CREATE INDEX IF NOT EXISTS idx_item_ratings_order_id ON item_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_item_ratings_user_id ON item_ratings(user_id);

-- Enforce that item rating is only insertable when order status = 'collected'
CREATE OR REPLACE FUNCTION check_item_rating_order_status()
RETURNS TRIGGER AS $$
DECLARE
  v_status order_status;
  v_user_id uuid;
BEGIN
  SELECT status, user_id INTO v_status, v_user_id
  FROM orders
  WHERE id = NEW.order_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Order % not found', NEW.order_id;
  END IF;

  IF v_status <> 'collected' THEN
    RAISE EXCEPTION 'Item ratings can only be submitted for orders with status "collected" (current: %)', v_status;
  END IF;

  IF v_user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'User % does not own order %', NEW.user_id, NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_item_rating_order_status ON item_ratings;
CREATE TRIGGER trg_check_item_rating_order_status
BEFORE INSERT ON item_ratings
FOR EACH ROW
EXECUTE FUNCTION check_item_rating_order_status();

-- Enable RLS
ALTER TABLE item_ratings ENABLE ROW LEVEL SECURITY;

-- Everyone can read ratings
DO $$ BEGIN
  CREATE POLICY "item_ratings_select_all"
    ON item_ratings FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only authenticated users can insert ratings for their own collected orders
DO $$ BEGIN
  CREATE POLICY "item_ratings_insert_own"
    ON item_ratings FOR INSERT
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_id
          AND orders.user_id = auth.uid()
          AND orders.status = 'collected'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
