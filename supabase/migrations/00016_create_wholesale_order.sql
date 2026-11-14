-- ============================================================================
-- 00016_create_wholesale_order.sql
-- Create wholesale order with explicit BILLING and SHIPPING addresses
-- Customer: Maira Shakoor / ALINA MART LTD
-- Product: Afnan Lynked Freedom EDP 100ml (120 units @ £25.00 = £3,000.00)
-- Payment Method: Mastercard (7183) - Status: Paid
-- ============================================================================

-- Ensure billing address columns exist on public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS billing_company text,
  ADD COLUMN IF NOT EXISTS billing_name text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_postal_code text,
  ADD COLUMN IF NOT EXISTS billing_country text,
  ADD COLUMN IF NOT EXISTS billing_phone text;

DO $$
DECLARE
  v_admin_id uuid;
  v_order_id uuid := 'f8a4b2c0-1126-4d9a-8e2b-7c3d1e5f9a01'::uuid;
  v_order_number text := 'ABZ-WHL-141126';
BEGIN
  -- Get admin profile id or fallback
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM public.profiles LIMIT 1;
  END IF;

  -- Delete existing wholesale order with same order number if any
  DELETE FROM public.order_items WHERE order_id = v_order_id;
  DELETE FROM public.orders WHERE id = v_order_id OR order_number = v_order_number;

  -- 1. Insert wholesale order with both Billing & Shipping Addresses
  INSERT INTO public.orders (
    id,
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
    billing_company,
    billing_name,
    billing_address,
    billing_city,
    billing_postal_code,
    billing_country,
    billing_phone,
    shipping_name,
    shipping_phone,
    shipping_address,
    shipping_city,
    shipping_postal_code,
    shipping_country,
    estimated_delivery_date,
    delivery_option,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    v_order_number,
    v_admin_id,
    'Processing',
    3000.00,
    0.00,
    0.00,
    0.00,
    3000.00,
    NULL,
    'card',
    'paid',
    'ALINA MART LTD',
    'Maira Shakoor',
    '12 Crispin Crescent, Wallington',
    'Surrey, Croydon',
    'CR0 4UD',
    'United Kingdom',
    '+447380415606',
    'Maira Shakoor - BSL Exchange',
    '07380415606',
    'BSL Exchange, unit 0017, attic self storage, 806 ripple road',
    'Barking, London',
    'IG11 0TT',
    'United Kingdom',
    CURRENT_DATE + INTERVAL '5 days',
    'standard',
    NOW(),
    NOW()
  );

  -- 2. Insert order item
  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    product_brand,
    product_image,
    selected_option,
    unit_price,
    quantity,
    line_total,
    created_at
  ) VALUES (
    v_order_id,
    NULL,
    'Afnan Lynked Freedom Eau de Parfum 100ml (ASIN: B0FW4HMWYF | GTIN: 6290171077428)',
    'Afnan',
    'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=400&q=80',
    '100ml / 3.4 fl oz (120 units wholesale)',
    25.00,
    120,
    3000.00,
    NOW()
  );

  RAISE NOTICE 'Wholesale order % created successfully with Billing & Shipping addresses, total £3,000.00', v_order_number;
END $$;
