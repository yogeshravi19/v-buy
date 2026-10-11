-- =============================================================================
-- Migration 013: Payment Reliability, Refunds, Reconciliation & Lifecycle
-- =============================================================================

-- 1. Extend order_status enum with lifecycle states
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'EXPIRED';

-- 2. Refunds Table with Deterministic Idempotency Key
CREATE TABLE IF NOT EXISTS refunds (
  id                bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id        bigint          NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  order_id          bigint          NULL REFERENCES orders(id) ON DELETE SET NULL,
  wallet_txn_id     bigint          NULL REFERENCES wallet_txns(id) ON DELETE SET NULL,
  refund_ref        text            NOT NULL UNIQUE,
  refund_type       text            NOT NULL CHECK (refund_type IN ('ORDER_REFUND', 'WALLET_TOPUP_REFUND', 'SPLIT_REFUND')),
  amount            numeric         NOT NULL CHECK (amount > 0),
  status            text            NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  paytm_refund_id   text            NULL,
  reason            text            NULL,
  created_at        timestamptz     NOT NULL DEFAULT now(),
  processed_at      timestamptz     NULL
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_refund_ref ON refunds(refund_ref);

-- 3. Procedure: record_refund (Idempotent recording with deterministic refund_ref)
CREATE OR REPLACE FUNCTION record_refund(
  p_payment_id        bigint,
  p_refund_ref        text,
  p_refund_type       text,
  p_amount            numeric,
  p_status            text DEFAULT 'PENDING',
  p_order_id          bigint DEFAULT NULL,
  p_paytm_refund_id   text DEFAULT NULL,
  p_reason            text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund   refunds%ROWTYPE;
  v_payment  payments%ROWTYPE;
BEGIN
  IF p_status NOT IN ('PENDING', 'SUCCESS', 'FAILED') THEN
    RAISE EXCEPTION 'record_refund: Invalid refund status %', p_status;
  END IF;
  IF p_refund_type NOT IN ('ORDER_REFUND', 'WALLET_TOPUP_REFUND', 'SPLIT_REFUND') THEN
    RAISE EXCEPTION 'record_refund: Invalid refund type %', p_refund_type;
  END IF;

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'record_refund: Payment % not found', p_payment_id;
  END IF;

  INSERT INTO refunds (
    payment_id,
    order_id,
    refund_ref,
    refund_type,
    amount,
    status,
    paytm_refund_id,
    reason,
    processed_at
  ) VALUES (
    p_payment_id,
    COALESCE(p_order_id, v_payment.order_id),
    p_refund_ref,
    p_refund_type,
    p_amount,
    p_status,
    p_paytm_refund_id,
    p_reason,
    CASE WHEN p_status = 'SUCCESS' THEN now() ELSE NULL END
  )
  ON CONFLICT (refund_ref) DO UPDATE
  SET
    status          = EXCLUDED.status,
    paytm_refund_id = COALESCE(EXCLUDED.paytm_refund_id, refunds.paytm_refund_id),
    reason          = COALESCE(EXCLUDED.reason, refunds.reason),
    processed_at    = CASE WHEN EXCLUDED.status = 'SUCCESS' THEN COALESCE(refunds.processed_at, now()) ELSE refunds.processed_at END
  RETURNING * INTO v_refund;

  IF p_status = 'SUCCESS' THEN
    UPDATE payments 
    SET status = 'REFUNDED', updated_at = now() 
    WHERE id = p_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'refund_id', v_refund.id,
    'refund_ref', v_refund.refund_ref,
    'status', v_refund.status,
    'amount', v_refund.amount,
    'paytm_refund_id', v_refund.paytm_refund_id
  );
END;
$$;

-- 4. Procedure: expire_stale_awaiting_orders
CREATE OR REPLACE FUNCTION expire_stale_awaiting_orders(p_older_than_minutes int DEFAULT 10)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN
  WITH expired_orders AS (
    UPDATE orders
    SET status = 'expired',
        cancel_reason = 'Payment window expired',
        updated_at = now()
    WHERE status IN ('awaiting_payment', 'payment_pending')
      AND (
        (expires_at IS NOT NULL AND expires_at < now()) OR
        (created_at < now() - (p_older_than_minutes || ' minutes')::interval)
      )
    RETURNING id, payment_id
  )
  SELECT count(*) INTO v_count FROM expired_orders;

  UPDATE payments
  SET status = 'CANCELLED',
      failure_reason = 'Order expired before payment was completed',
      updated_at = now()
  WHERE status = 'PENDING'
    AND order_id IN (
      SELECT id FROM orders WHERE status = 'expired'
    );

  RETURN v_count;
END;
$$;
