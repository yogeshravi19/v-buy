-- =============================================================================
-- Migration 006: Group Ordering Columns
-- =============================================================================

-- Add group_id and is_group_payer to orders (additive, backwards compatible)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS group_id uuid NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_group_payer boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_group_id ON orders(group_id) WHERE group_id IS NOT NULL;
