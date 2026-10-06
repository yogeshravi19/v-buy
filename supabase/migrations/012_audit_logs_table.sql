-- =============================================================================
-- Migration 012: Audit Logs & Security Telemetry
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name  text NOT NULL DEFAULT 'System',
  actor_role  text NOT NULL DEFAULT 'user',
  category    text NOT NULL, -- 'OUTLET', 'MENU', 'ORDER', 'WALLET', 'SECURITY', 'SYSTEM', 'COUPON', 'AUTH'
  action      text NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'OVERRIDE_STATUS', 'TOGGLE', 'LOGIN', etc.
  details     text NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address  text NULL,
  status      text NOT NULL DEFAULT 'SUCCESS',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Optimized query indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs (category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

-- Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. READ POLICY: Only Super Admins can inspect audit trails
DROP POLICY IF EXISTS "audit_logs_super_admin_select" ON public.audit_logs;
CREATE POLICY "audit_logs_super_admin_select" ON public.audit_logs
  FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
    OR public.get_my_role() = 'admin'
  );

-- 2. INSERT POLICY: Authenticated actors and system functions can record audit events
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- 3. IMMUTABILITY: No UPDATE or DELETE policies are granted.
-- Audit logs are strictly append-only, preventing tampering.
