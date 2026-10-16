-- =============================================================================
-- Migration 019: Create Campuses Table & RLS Policies
-- Defect: DEFECT-07 (Campuses Schema & RLS)
--
-- SUMMARY:
-- Creates the `campuses` table to back the Super Admin "Campuses" directory.
-- Enables RLS with public/authenticated read access and Super Admin-only write access.
-- Seeds default campus clusters (VIT Chennai, VIT Vellore, Riviera Arena).
--
-- HOW TO ROLL BACK:
-- DROP TABLE IF EXISTS public.campuses CASCADE;
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.campuses (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  city           text NOT NULL,
  outlets_count  integer NOT NULL DEFAULT 0,
  students_count integer NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_campuses_status ON public.campuses (status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;

-- 1. READ POLICY: Public and authenticated users can view operational campuses
DROP POLICY IF EXISTS "campuses_select_all" ON public.campuses;
CREATE POLICY "campuses_select_all" ON public.campuses
  FOR SELECT
  USING (true);

-- 2. WRITE POLICY: Only platform administrators can insert/update/delete campuses
DROP POLICY IF EXISTS "campuses_super_admin_manage" ON public.campuses;
CREATE POLICY "campuses_super_admin_manage" ON public.campuses
  FOR ALL
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin')
  );

-- Seed initial campuses
INSERT INTO public.campuses (id, name, city, outlets_count, students_count, status)
VALUES
  ('vit-chennai', 'VIT Chennai (Main Campus)', 'Chennai, TN', 13, 11200, 'active'),
  ('vit-vellore', 'VIT Vellore (Satellite Connect)', 'Vellore, TN', 24, 24000, 'active'),
  ('vit-riviera', 'Riviera Festival Food Court Arena', 'Festival Grounds', 20, 18500, 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  status = EXCLUDED.status,
  updated_at = now();
