-- ============================================================================
-- 00010_launch_readiness.sql
-- ABAZ MART LTD: PRODUCTION LAUNCH READINESS MIGRATION
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/twstiotnaaglptizaxkm/editor
-- ============================================================================

-- 1. Add carrier and tracking columns to public.orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS carrier text,
ADD COLUMN IF NOT EXISTS tracking_number text,
ADD COLUMN IF NOT EXISTS tracking_url text,
ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
ADD COLUMN IF NOT EXISTS delivery_option text DEFAULT 'standard';

-- 2. Add expedited_shipping_fee to store_settings table
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS expedited_shipping_fee numeric(10, 2) NOT NULL DEFAULT 8.50;

-- Ensure default row has expedited fee populated
UPDATE public.store_settings
SET expedited_shipping_fee = 8.50
WHERE id = 1 AND expedited_shipping_fee IS NULL;

-- 3. Fix role protection trigger to allow SQL Editor and service_role executions
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Allow superuser, service_role, and SQL editor (where auth.uid() is null)
    -- Only restrict if an authenticated web user (auth.uid() is not null) attempts to promote themselves
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only administrators are permitted to change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

-- 4. Create or replace promote_user_to_admin helper function
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
    RAISE EXCEPTION 'Email address cannot be blank';
  END IF;

  UPDATE public.profiles
  SET role = 'admin'
  WHERE lower(trim(email)) = lower(trim(p_email));

  IF FOUND THEN
    v_updated := true;
    RAISE NOTICE 'Successfully promoted user % to admin role', p_email;
  ELSE
    RAISE NOTICE 'No profile found matching %. Make sure the user has registered at least once.', p_email;
  END IF;

  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION public.promote_user_to_admin(text) IS
'Promotes any registered user profile to the admin role by email address.';

-- 5. Safe cancellation and stock restoration procedure
CREATE OR REPLACE FUNCTION public.cancel_order_secure(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Mark order as Cancelled if not already cancelled
  UPDATE public.orders
  SET status = 'Cancelled', updated_at = now()
  WHERE id = p_order_id AND status != 'Cancelled';

  IF FOUND THEN
    -- Automatically restock inventory for each order item
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_items
      WHERE order_id = p_order_id AND product_id IS NOT NULL
    LOOP
      UPDATE public.products
      SET stock = stock + v_item.quantity, updated_at = now()
      WHERE id = v_item.product_id;
    END LOOP;

    -- Record in order status history if table exists
    BEGIN
      INSERT INTO public.order_status_history (order_id, old_status, new_status, note)
      VALUES (p_order_id, 'Pending', 'Cancelled', 'Cancelled via secure procedure; stock restored.');
    EXCEPTION WHEN OTHERS THEN
      -- Optional table; ignore if not present
    END;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.cancel_order_secure(uuid) IS
'Cancels an order and automatically restocks all products in the order.';
