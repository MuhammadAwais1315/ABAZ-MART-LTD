-- ============================================================================
-- 00009_fix_order_rpc.sql
-- Robust, safe fix for create_order_secure RPC & payment_method enum
-- ============================================================================

-- 1. Safely create enums if they do not exist (without using ::regtype cast)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE t.typname = 'payment_method' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.payment_method AS ENUM ('card', 'bank_transfer', 'cod', 'paypal');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE t.typname = 'order_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.order_status AS ENUM ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE t.typname = 'payment_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END $$;

-- 2. Ensure 'bank_transfer' exists in public.payment_method if it was created previously
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'bank_transfer';

-- 3. Ensure validate_coupon function exists
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

-- 4. Create or Replace create_order_secure
CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_shipping_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_postal_code text,
  p_shipping_country text,
  p_payment_method text,
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
    p_payment_method::public.payment_method,
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

-- 5. Grant execute permissions to PostgREST roles
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_order_secure(text, text, text, text, text, text, text, jsonb, text) TO authenticated, anon, service_role;

-- 6. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
