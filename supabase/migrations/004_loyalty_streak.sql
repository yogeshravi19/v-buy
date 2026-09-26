-- =============================================================================
-- Migration 004: Loyalty Streak (Free Tier Loyalty Progress)
-- =============================================================================

CREATE TABLE IF NOT EXISTS loyalty_progress (
  user_id             uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  completed_orders    int         NOT NULL DEFAULT 0 CHECK (completed_orders >= 0),
  free_items_earned   int         NOT NULL DEFAULT 0 CHECK (free_items_earned >= 0),
  free_items_redeemed int         NOT NULL DEFAULT 0 CHECK (free_items_redeemed >= 0),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_progress_user ON loyalty_progress(user_id);

-- Enable RLS
ALTER TABLE loyalty_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty progress"
  ON loyalty_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service and owners can read all loyalty"
  ON loyalty_progress FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Trigger: When order status transitions to 'collected', increment completed_orders
-- At every 10th order (configurable), increment free_items_earned
CREATE OR REPLACE FUNCTION increment_loyalty_on_order_collected()
RETURNS trigger AS $$
DECLARE
  v_threshold int := 10; -- Every 10 completed orders earns 1 free item
BEGIN
  -- Only trigger when status transitions to 'collected'
  IF (NEW.status = 'collected' AND (OLD.status IS NULL OR OLD.status <> 'collected')) THEN
    INSERT INTO loyalty_progress (user_id, completed_orders, free_items_earned, updated_at)
    VALUES (NEW.user_id, 1, CASE WHEN 1 >= v_threshold THEN 1 ELSE 0 END, now())
    ON CONFLICT (user_id) DO UPDATE SET
      completed_orders = loyalty_progress.completed_orders + 1,
      free_items_earned = loyalty_progress.free_items_earned + 
        CASE WHEN (loyalty_progress.completed_orders + 1) % v_threshold = 0 THEN 1 ELSE 0 END,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_increment_loyalty ON orders;
CREATE TRIGGER trg_increment_loyalty
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_loyalty_on_order_collected();
