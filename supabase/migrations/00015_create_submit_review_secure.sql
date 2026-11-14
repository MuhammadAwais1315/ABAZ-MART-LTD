-- ============================================================================
-- 00015_create_submit_review_secure.sql
-- CREATE SUBMIT_REVIEW_SECURE RPC & REVIEWS RLS POLICIES (SELF-CONTAINED)
-- ============================================================================

-- 1. Ensure is_admin helper function exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

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

-- 4. RLS Policies
DROP POLICY IF EXISTS "Approved reviews viewable by everyone" ON public.reviews;
CREATE POLICY "Approved reviews viewable by everyone"
  ON public.reviews FOR SELECT
  USING (
    is_approved = true 
    OR auth.uid() = user_id 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
CREATE POLICY "Authenticated users can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;
CREATE POLICY "Users update own reviews"
  ON public.reviews FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users delete own reviews or admin delete" ON public.reviews;
CREATE POLICY "Users delete own reviews or admin delete"
  ON public.reviews FOR DELETE
  USING (
    auth.uid() = user_id 
    OR public.is_admin()
  );

-- 5. Create or Replace submit_review_secure RPC
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
  v_profile record;
  v_name text;
  v_is_verified boolean := true;
  v_review public.reviews;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to submit a review';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 stars';
  END IF;

  -- Attempt to get full name from profile; fallback to email or 'Verified Buyer'
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
    v_is_verified,
    true,
    now()
  )
  ON CONFLICT (product_id, user_id) DO UPDATE SET
    reviewer_name = EXCLUDED.reviewer_name,
    rating = EXCLUDED.rating,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    is_approved = true,
    updated_at = now()
  RETURNING * INTO v_review;

  RETURN v_review;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.submit_review_secure(bigint, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review_secure(bigint, int, text, text) TO service_role;

-- 4. Create or Replace submit_review_secure RPC
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
  v_profile record;
  v_name text;
  v_is_verified boolean := true;
  v_review public.reviews;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to submit a review';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 stars';
  END IF;

  -- Attempt to get full name from profile; fallback to email or 'Verified Buyer'
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
    v_is_verified,
    true,
    now()
  )
  ON CONFLICT (product_id, user_id) DO UPDATE SET
    reviewer_name = EXCLUDED.reviewer_name,
    rating = EXCLUDED.rating,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    is_approved = true,
    updated_at = now()
  RETURNING * INTO v_review;

  RETURN v_review;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.submit_review_secure(bigint, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review_secure(bigint, int, text, text) TO service_role;
