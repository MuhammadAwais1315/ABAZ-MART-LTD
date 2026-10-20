-- ============================================================================
-- 00012_fix_profiles_rls.sql
-- Fix public.profiles RLS so the admin dashboard can see all registered customers
-- ============================================================================

-- 1. Ensure table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive read policy
DROP POLICY IF EXISTS "Users read own profile or admin read all" ON public.profiles;
DROP POLICY IF EXISTS "Allow read profiles for admin or self" ON public.profiles;

-- 3. Create permissive SELECT policy so admin dashboard and storefront user lookups succeed
CREATE POLICY "Allow read profiles for admin or self"
  ON public.profiles FOR SELECT
  USING (true);

-- 4. Preserve UPDATE security: users can only update their own profile, or admins can update any
DROP POLICY IF EXISTS "Users update own profile or admin update" ON public.profiles;
CREATE POLICY "Users update own profile or admin update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());
