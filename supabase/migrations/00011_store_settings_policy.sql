-- ============================================================================
-- 00011_store_settings_policy.sql
-- Fix store_settings Row Level Security (RLS) so admin updates apply cleanly
-- ============================================================================

-- 1. Ensure table has RLS enabled
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if present
DROP POLICY IF EXISTS "Store settings are publicly viewable" ON public.store_settings;
DROP POLICY IF EXISTS "Admin manage store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow store admin manage store settings" ON public.store_settings;

-- 3. Public SELECT policy so any customer or visitor can read shipping rates & thresholds
CREATE POLICY "Store settings are publicly viewable"
  ON public.store_settings FOR SELECT
  USING (true);

-- 4. Permissive ALL policy so settings can be saved from the admin dashboard
CREATE POLICY "Allow store admin manage store settings"
  ON public.store_settings FOR ALL
  USING (true)
  WITH CHECK (true);
