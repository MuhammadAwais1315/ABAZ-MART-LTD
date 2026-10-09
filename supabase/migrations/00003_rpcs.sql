-- ============================================================================
-- 00003_rpcs.sql
-- SECURE TRANSACTIONAL PROCEDURES (SECURITY DEFINER WITH SEARCH_PATH = '')
-- ============================================================================

-- RPC 1: Validate Coupon Code (Returns calculated discount amount only)
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_subtotal numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_coupon record;
  v_discount numeric := 0.00;
BEGIN
  IF p_subtotal <= 0 OR p_code IS NULL OR trim(p_code) = '' THEN
    RETURN 0.00;
  END IF;

  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = upper(trim(p_code))
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN 0.00;
  END IF;

  IF p_subtotal < v_coupon.min_spend THEN
    RETURN 0.00;
  END IF;

  v_discount := ROUND((p_subtotal * (v_coupon.discount_percent / 100.0)), 2);

  IF v_coupon.max_discount IS NOT NULL AND v_discount > v_coupon.max_discount THEN
    v_discount := v_coupon.max_discount;
  END IF;

  RETURN v_discount;
END;
$$;

-- RPC 2: Create Order Secure (Atomic order placement with stock check & decrement)
CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_shipping_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_postal_code text,
  p_shipping_country text,
  p_payment_method public.payment_method,
  p_items jsonb, -- Array of { product_id, quantity, option }
  p_coupon_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_settings record;
  v_item jsonb;
  v_product record;
  v_subtotal numeric := 0.00;
  v_shipping numeric := 0.00;
  v_tax numeric := 0.00;
  v_discount numeric := 0.00;
  v_total numeric := 0.00;
  v_coupon_id bigint := NULL;
  v_order_id uuid;
  v_order_number text;
  v_line_total numeric;
  v_est_delivery date;
BEGIN
  -- 1. Ensure user is authenticated (No guest checkout)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: You must be signed in to place an order';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- 2. Fetch Store Settings
  SELECT * INTO v_settings FROM public.store_settings WHERE id = 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store configuration not found';
  END IF;

  -- 3. Validate & decrement stock, calculate exact subtotal from database product prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::bigint AND is_active = true
    FOR UPDATE; -- Row-level lock to prevent race condition overselling

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product with ID % is no longer available', (v_item->>'product_id');
    END IF;

    IF v_product.stock < (v_item->>'quantity')::int THEN
      RAISE EXCEPTION 'Insufficient stock for product "%". Only % available', v_product.name, v_product.stock;
    END IF;

    -- Decrement stock atomically
    UPDATE public.products
    SET stock = stock - (v_item->>'quantity')::int
    WHERE id = v_product.id;

    v_line_total := ROUND((v_product.price * (v_item->>'quantity')::int), 2);
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  -- 4. Calculate coupon discount if provided
  IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
    SELECT id INTO v_coupon_id
    FROM public.coupons
    WHERE code = upper(trim(p_coupon_code))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now());

    IF v_coupon_id IS NOT NULL THEN
      v_discount := public.validate_coupon(p_coupon_code, v_subtotal);
    END IF;
  END IF;

  -- 5. Calculate Shipping & Tax from Store Settings
  IF v_subtotal >= v_settings.free_shipping_threshold THEN
    v_shipping := 0.00;
  ELSE
    v_shipping := v_settings.shipping_fee;
  END IF;

  v_tax := ROUND(((v_subtotal - v_discount) * v_settings.tax_rate), 2);
  v_total := ROUND((v_subtotal - v_discount + v_shipping + v_tax), 2);

  -- 6. Generate Order Number & Delivery Estimate (5 days)
  v_order_number := 'ABZ-' || lpad(floor(random() * 900000 + 100000)::text, 6, '0');
  v_est_delivery := current_date + interval '5 days';

  -- 7. Insert Order
  INSERT INTO public.orders (
    order_number,
    user_id,
    status,
    subtotal,
    shipping,
    tax,
    discount,
    total,
    coupon_id,
    payment_method,
    payment_status,
    shipping_name,
    shipping_phone,
    shipping_address,
    shipping_city,
    shipping_postal_code,
    shipping_country,
    estimated_delivery_date
  ) VALUES (
    v_order_number,
    v_user_id,
    'Pending',
    v_subtotal,
    v_shipping,
    v_tax,
    v_discount,
    v_total,
    v_coupon_id,
    p_payment_method,
    'pending',
    trim(p_shipping_name),
    trim(p_shipping_phone),
    trim(p_shipping_address),
    trim(p_shipping_city),
    trim(p_shipping_postal_code),
    COALESCE(NULLIF(trim(p_shipping_country), ''), v_settings.default_country),
    v_est_delivery
  )
  RETURNING id INTO v_order_id;

  -- 8. Insert Order Items Snapshot
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::bigint;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_brand,
      product_image,
      selected_option,
      unit_price,
      quantity,
      line_total
    ) VALUES (
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.brand,
      v_product.image,
      COALESCE(v_item->>'option', ''),
      v_product.price,
      (v_item->>'quantity')::int,
      ROUND((v_product.price * (v_item->>'quantity')::int), 2)
    );
  END LOOP;

  -- 9. Clear user's cart items from DB
  DELETE FROM public.cart_items WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'shipping', v_shipping,
    'tax', v_tax,
    'discount', v_discount,
    'total', v_total,
    'estimated_delivery', v_est_delivery
  );
END;
$$;

-- RPC 3: Cancel Order Secure (Restocks inventory if order is pending)
CREATE OR REPLACE FUNCTION public.cancel_order_secure(
  p_order_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order record;
  v_item record;
BEGIN
  -- Verify order exists and caller owns it or is admin
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: You cannot cancel this order';
  END IF;

  IF v_order.status <> 'Pending' THEN
    RAISE EXCEPTION 'Only Pending orders can be cancelled. Current status is %', v_order.status;
  END IF;

  -- Restock items
  FOR v_item IN
    SELECT product_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    UPDATE public.products
    SET stock = stock + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- Update order status
  UPDATE public.orders
  SET status = 'Cancelled'
  WHERE id = p_order_id;

  RETURN true;
END;
$$;

-- RPC 4: Submit Review Secure (Enforces verified buyer, approved flag, and profile name)
CREATE OR REPLACE FUNCTION public.submit_review_secure(
  p_product_id bigint,
  p_rating int,
  p_title text,
  p_content text
)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_profile record;
  v_is_verified boolean := false;
  v_review public.reviews;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to submit a review';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 stars';
  END IF;

  -- Fetch user profile for reviewer name
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND OR trim(v_profile.full_name) = '' THEN
    RAISE EXCEPTION 'Profile not found or missing name';
  END IF;

  -- Verify buyer by checking for a Delivered order containing the product
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = v_user_id
      AND o.status = 'Delivered'
      AND oi.product_id = p_product_id
  ) INTO v_is_verified;

  -- Insert or update user review
  INSERT INTO public.reviews (
    product_id,
    user_id,
    reviewer_name,
    rating,
    title,
    content,
    is_verified_buyer,
    is_approved
  ) VALUES (
    p_product_id,
    v_user_id,
    v_profile.full_name,
    p_rating,
    trim(p_title),
    trim(p_content),
    v_is_verified,
    true
  )
  ON CONFLICT (product_id, user_id) DO UPDATE
  SET 
    rating = EXCLUDED.rating,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    reviewer_name = EXCLUDED.reviewer_name,
    is_verified_buyer = EXCLUDED.is_verified_buyer
  RETURNING * INTO v_review;

  RETURN v_review;
END;
$$;
