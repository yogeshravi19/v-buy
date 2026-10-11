-- ==============================================================================
-- 014_payment_webhook_and_reconciliation_audit.sql
-- V Foods Payment Help, Webhook Event Auditing, and Reconciliation Logging
-- ==============================================================================

-- 1. Webhook Events Table (Auditing incoming Paytm S2S payment & refund webhooks)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'PAYMENT_NOTIFICATION', 'REFUND_NOTIFICATION', 'UNKNOWN'
    gateway TEXT NOT NULL DEFAULT 'paytm',
    gateway_order_id TEXT,
    gateway_txn_id TEXT,
    refund_ref TEXT,
    order_id INTEGER REFERENCES public.orders(id) ON DELETE SET NULL,
    payment_id INTEGER REFERENCES public.payments(id) ON DELETE SET NULL,
    payload_summary JSONB, -- Safe payload without secrets or tokens
    signature_valid BOOLEAN NOT NULL DEFAULT false,
    processed_status TEXT NOT NULL DEFAULT 'PENDING', -- 'SUCCESS', 'DUPLICATE', 'FAILED', 'IGNORED'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for fast lookup by order, payment, and transaction
CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id ON public.webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id ON public.webhook_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway_txn ON public.webhook_events(gateway_txn_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at DESC);

-- 2. Reconciliation Records Table (Auditing periodic and user-triggered reconciliations)
CREATE TABLE IF NOT EXISTS public.reconciliation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id INTEGER REFERENCES public.payments(id) ON DELETE SET NULL,
    order_id INTEGER REFERENCES public.orders(id) ON DELETE SET NULL,
    reconciliation_type TEXT NOT NULL DEFAULT 'PAYMENT', -- 'PAYMENT', 'REFUND'
    local_status TEXT NOT NULL,
    gateway_status TEXT,
    discrepancy_detected BOOLEAN NOT NULL DEFAULT false,
    action_taken TEXT NOT NULL DEFAULT 'NONE', -- 'CONFIRMED_ORDER', 'INITIATED_REFUND', 'EXPIRED_ORDER', 'NONE'
    reconciled_by TEXT NOT NULL DEFAULT 'system_cron', -- 'system_cron', 'user_check_status', 'staff_reconcile', 'admin_force'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_records_order ON public.reconciliation_records(order_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_payment ON public.reconciliation_records(payment_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_created ON public.reconciliation_records(created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_records ENABLE ROW LEVEL SECURITY;

-- Super Admin full access
CREATE POLICY "Super admin can manage webhook events"
    ON public.webhook_events
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "Super admin can manage reconciliation records"
    ON public.reconciliation_records
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

-- Shop Staff & Admin read-only access for permitted outlet
CREATE POLICY "Shop staff can view outlet webhook events"
    ON public.webhook_events
    FOR SELECT
    TO authenticated
    USING (
        order_id IN (
            SELECT id FROM public.orders
            WHERE outlet_id = (SELECT outlet_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Shop staff can view outlet reconciliation records"
    ON public.reconciliation_records
    FOR SELECT
    TO authenticated
    USING (
        order_id IN (
            SELECT id FROM public.orders
            WHERE outlet_id = (SELECT outlet_id FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Users can only view reconciliation summary for their own orders
CREATE POLICY "Users can view own reconciliation records"
    ON public.reconciliation_records
    FOR SELECT
    TO authenticated
    USING (
        order_id IN (
            SELECT id FROM public.orders
            WHERE user_id = auth.uid()
        )
    );
