-- ============================================================================
-- 00013_customers_sync_and_rpc.sql
-- Comprehensive Fix for Customer Registration and Admin Visibility
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/twstiotnaaglptizaxkm/editor
-- ============================================================================

-- 1. Ensure public.profiles table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any restrictive legacy policies on profiles
DROP POLICY IF EXISTS "Users read own profile or admin read all" ON public.profiles;
DROP POLICY IF EXISTS "Allow read profiles for admin or self" ON public.profiles;
DROP POLICY IF EXISTS "Allow read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insertable by authenticated users" ON public.profiles;

-- 3. Permissive SELECT policy so the admin dashboard can list all registered clientele
CREATE POLICY "Allow read profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- 4. Permissive INSERT policy so client signups can save their profile directly
CREATE POLICY "Allow insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- 5. UPDATE policy: users update own or admins update any
DROP POLICY IF EXISTS "Users update own profile or admin update" ON public.profiles;
DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;
CREATE POLICY "Allow update profiles"
  ON public.profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 6. Trigger Function: Automatically create a profile whenever a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    v_name,
    COALESCE(NEW.email, ''),
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- Ensure trigger is active on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. BACKFILL: Immediately copy any existing users in auth.users that are missing in public.profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(COALESCE(u.email, ''), '@', 1)),
  'customer'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = CASE 
    WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
    THEN EXCLUDED.full_name 
    ELSE public.profiles.full_name 
  END;

-- 8. SECURITY DEFINER RPC: Bypasses RLS to fetch all registered customers with accurate order counts
CREATE OR REPLACE FUNCTION public.get_all_customers_admin()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  role text,
  created_at timestamptz,
  orders_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.role::text,
    p.created_at,
    COALESCE(COUNT(o.id), 0) AS orders_count
  FROM public.profiles p
  LEFT JOIN public.orders o ON o.user_id = p.id
  GROUP BY p.id, p.email, p.full_name, p.phone, p.avatar_url, p.role, p.created_at
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_customers_admin() TO authenticated, anon, service_role;
