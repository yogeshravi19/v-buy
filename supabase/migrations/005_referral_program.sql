-- =============================================================================
-- Migration 005: Referral Program
-- =============================================================================

-- Add referral_code to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id     uuid        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  reward_credited bool        NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Users can create referral on signup"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (referred_id = auth.uid());

-- Trigger: When referred user's FIRST order reaches 'collected', credit both wallets
CREATE OR REPLACE FUNCTION reward_referral_on_first_order()
RETURNS trigger AS $$
DECLARE
  v_ref record;
  v_order_count int;
  v_reward_amount int := 30; -- ₹30 referral reward
BEGIN
  IF (NEW.status = 'collected' AND (OLD.status IS NULL OR OLD.status <> 'collected')) THEN
    -- Check if this is their first collected order
    SELECT count(*) INTO v_order_count
    FROM orders
    WHERE user_id = NEW.user_id AND status = 'collected';

    IF v_order_count = 1 THEN
      -- Find pending referral
      SELECT * INTO v_ref
      FROM referrals
      WHERE referred_id = NEW.user_id AND status = 'pending' AND reward_credited = false
      LIMIT 1;

      IF FOUND THEN
        -- Credit referrer
        PERFORM credit_wallet(
          v_ref.referrer_id,
          v_reward_amount,
          'referral_bonus',
          'referral:referrer:' || v_ref.id::text,
          'Referral bonus for inviting friend'
        );

        -- Credit referred user
        PERFORM credit_wallet(
          v_ref.referred_id,
          v_reward_amount,
          'referral_bonus',
          'referral:welcome:' || v_ref.id::text,
          'Welcome bonus on first completed order'
        );

        -- Update referral status
        UPDATE referrals
        SET status = 'completed', reward_credited = true
        WHERE id = v_ref.id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reward_referral ON orders;
CREATE TRIGGER trg_reward_referral
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION reward_referral_on_first_order();
