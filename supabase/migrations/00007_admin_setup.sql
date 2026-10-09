-- ============================================================================
-- 00007_admin_setup.sql
-- ADMINISTRATIVE HELPERS & TEST ACCOUNT SETUP
-- ============================================================================

-- Function to promote an existing registered user to admin by email
-- (Can be executed in the Supabase SQL editor by the project owner)
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated boolean := false;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email cannot be blank';
  END IF;

  UPDATE public.profiles
  SET role = 'admin'
  WHERE email = lower(trim(p_email));

  IF FOUND THEN
    v_updated := true;
    RAISE NOTICE 'Successfully promoted user % to admin', p_email;
  ELSE
    RAISE NOTICE 'No profile found matching email %. Ensure the user has registered first.', p_email;
  END IF;

  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION public.promote_user_to_admin(text) IS 
'Security Definer helper to promote a user profile to the admin role by email address.';
