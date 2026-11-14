-- ============================================================================
-- 00015_create_submit_review_secure.sql
-- COMPLETE FIX: is_admin, public review visibility, verified buyer check, product rating sync
-- ============================================================================

-- 1. Ensure is_admin helper functions exist (both 0-arg and 1-arg to prevent ERROR 42883)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT (role = 'admin') FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT (role = 'admin') FROM public.profiles WHERE id = p_user_id LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon, service_role;

-- 2. Ensure reviews table exists with all necessary columns
CREATE TABLE IF NOT EXISTS public.reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  content text NOT NULL,
  is_verified_buyer boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- 3. Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Everyone (guests, customers, all visitors) can view reviews!
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Approved reviews viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Approved reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.reviews;

CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
CREATE POLICY "Authenticated users can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;
CREATE POLICY "Users update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users delete own reviews or admin delete" ON public.reviews;
CREATE POLICY "Users delete own reviews or admin delete"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- 5. Mark any existing reviews as approved so they are immediately visible to all
UPDATE public.reviews
SET is_approved = true, is_verified_buyer = true
WHERE is_approved IS NULL OR is_approved = false;

-- 6. Trigger to recalculate product rating & review_count
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_product_id bigint;
BEGIN
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);

  UPDATE public.products
  SET 
    rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1) 
      FROM public.reviews 
      WHERE product_id = target_product_id
    ), 5.0),
    review_count = (
      SELECT COUNT(*)::int 
      FROM public.reviews 
      WHERE product_id = target_product_id
    )
  WHERE id = target_product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- 7. Secure review submission RPC with VERIFIED BUYER CHECK
CREATE OR REPLACE FUNCTION public.submit_review_secure(
  p_product_id bigint,
  p_rating int,
  p_title text,
  p_content text
)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean := false;
  v_is_buyer boolean := false;
  v_profile record;
  v_name text;
  v_review public.reviews;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to submit a review';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 stars';
  END IF;

  IF trim(p_title) = '' OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'Please provide both a headline and review comments';
  END IF;

  -- Admin check
  v_is_admin := public.is_admin();

  -- Verified buyer check: User must have purchased this product in an active order
  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.user_id = v_user_id
        AND oi.product_id = p_product_id
        AND o.status NOT IN ('Cancelled')
    ) INTO v_is_buyer;

    IF NOT v_is_buyer THEN
      RAISE EXCEPTION 'Verified buyers only: You can only review products you have purchased.';
    END IF;
  ELSE
    v_is_buyer := true;
  END IF;

  -- Get reviewer name from profile or metadata
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF FOUND AND v_profile.full_name IS NOT NULL AND trim(v_profile.full_name) <> '' THEN
    v_name := trim(v_profile.full_name);
  ELSE
    SELECT coalesce(raw_user_meta_data->>'full_name', email, 'Verified Buyer')
    INTO v_name
    FROM auth.users
    WHERE id = v_user_id;
  END IF;

  IF v_name IS NULL OR trim(v_name) = '' THEN
    v_name := 'Verified Buyer';
  END IF;

  -- Upsert review
  INSERT INTO public.reviews (
    product_id,
    user_id,
    reviewer_name,
    rating,
    title,
    content,
    is_verified_buyer,
    is_approved,
    updated_at
  ) VALUES (
    p_product_id,
    v_user_id,
    v_name,
    p_rating,
    trim(p_title),
    trim(p_content),
    true,
    true,
    now()
  )
  ON CONFLICT (product_id, user_id) DO UPDATE SET
    reviewer_name = EXCLUDED.reviewer_name,
    rating = EXCLUDED.rating,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    is_verified_buyer = true,
    is_approved = true,
    updated_at = now()
  RETURNING * INTO v_review;

  -- Immediately sync products table rating and review_count
  UPDATE public.products
  SET 
    rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM public.reviews
      WHERE product_id = p_product_id
    ), 5.0),
    review_count = (
      SELECT COUNT(*)::int
      FROM public.reviews
      WHERE product_id = p_product_id
    )
  WHERE id = p_product_id;

  RETURN v_review;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.submit_review_secure(bigint, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review_secure(bigint, int, text, text) TO service_role;

-- 8. Backfill products table rating & review_count for all products
UPDATE public.products p
SET 
  rating = COALESCE((
    SELECT ROUND(AVG(r.rating)::numeric, 1)
    FROM public.reviews r
    WHERE r.product_id = p.id
  ), 5.0),
  review_count = COALESCE((
    SELECT COUNT(*)::int
    FROM public.reviews r
    WHERE r.product_id = p.id
  ), 0);
