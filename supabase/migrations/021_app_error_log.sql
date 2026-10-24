-- =============================================================================
-- Migration 021: Developer System Map Error Telemetry (app_error_log)
-- Confirmed Supabase Project Reference: wahftohnwfoepuszvzrx
-- 
-- Strict Change Control:
-- 1. Single additive table: app_error_log.
-- 2. No modification to existing tables or RLS policies.
-- 3. Stripped of all personal data, secrets, tokens, emails, phone numbers.
-- 4. Rate-limited via stored procedure log_app_error().
-- 5. Read-restricted strictly to Super Admin.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.app_error_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  card_id text NOT NULL,
  role text NOT NULL,
  route text NOT NULL,
  endpoint text NULL,
  http_status int NULL,
  short_message text NOT NULL,
  request_id text NULL
);

-- Index for 7-day telemetry querying by card and created_at
CREATE INDEX IF NOT EXISTS idx_app_error_log_card_created 
  ON public.app_error_log(card_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_error_log_created 
  ON public.app_error_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.app_error_log ENABLE ROW LEVEL SECURITY;

-- 1. INSERT POLICY: Authenticated & service callers can insert error events
DROP POLICY IF EXISTS "app_error_log_insert_all" ON public.app_error_log;
CREATE POLICY "app_error_log_insert_all" ON public.app_error_log
  FOR INSERT
  WITH CHECK (true);

-- 2. SELECT POLICY: Super Admin exclusively can read error logs
DROP POLICY IF EXISTS "app_error_log_super_admin_read" ON public.app_error_log;
CREATE POLICY "app_error_log_super_admin_read" ON public.app_error_log
  FOR SELECT
  USING (
    public.get_my_role() = 'super_admin'
  );

-- No UPDATE policy defined -> DENY all updates (immutable audit trail)
-- No DELETE policy defined -> DENY all deletes (immutable audit trail)

-- 3. RATE-LIMITED LOGGING PROCEDURE (Security Definer)
-- Dropping excessive duplicate logs (>30 per card per minute) to prevent log storms
CREATE OR REPLACE FUNCTION public.log_app_error(
  p_card_id text,
  p_role text,
  p_route text,
  p_endpoint text DEFAULT NULL,
  p_http_status int DEFAULT NULL,
  p_short_message text DEFAULT 'Unknown Error',
  p_request_id text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count int;
  v_log_id bigint;
  v_clean_message text;
BEGIN
  -- Rate limiting per card_id: max 30 records per minute
  SELECT count(*) INTO v_recent_count
  FROM app_error_log
  WHERE card_id = p_card_id
    AND created_at > (now() - interval '1 minute');

  IF v_recent_count >= 30 THEN
    RETURN 0;
  END IF;

  -- Hard cap message length to 255 chars
  v_clean_message := substring(trim(p_short_message) from 1 for 255);

  INSERT INTO app_error_log (
    card_id,
    role,
    route,
    endpoint,
    http_status,
    short_message,
    request_id
  ) VALUES (
    p_card_id,
    p_role,
    p_route,
    p_endpoint,
    p_http_status,
    v_clean_message,
    p_request_id
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- =============================================================================
-- ROLLBACK SQL:
-- DROP POLICY IF EXISTS "app_error_log_super_admin_read" ON public.app_error_log;
-- DROP POLICY IF EXISTS "app_error_log_insert_all" ON public.app_error_log;
-- DROP FUNCTION IF EXISTS public.log_app_error(text, text, text, text, int, text, text);
-- DROP TABLE IF EXISTS public.app_error_log CASCADE;
-- =============================================================================
