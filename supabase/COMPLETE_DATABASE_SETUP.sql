-- ============================================================================
-- ABAZ MART LTD: COMPLETE MASTER DATABASE INITIALIZATION
-- Execute this in your Supabase SQL Editor once.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums Safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'user_role' AND n.nspname = 'public') THEN
    CREATE TYPE public.user_role AS ENUM ('customer', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'order_status' AND n.nspname = 'public') THEN
    CREATE TYPE public.order_status AS ENUM ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payment_method' AND n.nspname = 'public') THEN
    CREATE TYPE public.payment_method AS ENUM ('card', 'bank_transfer', 'cod', 'paypal');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payment_status' AND n.nspname = 'public') THEN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END $$;

ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'bank_transfer';

-- ============================================================================
-- 00001_initial_schema.sql
-- ABAZ MART INITIAL DATABASE SCHEMA
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums





-- Table 1: Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'customer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 2: Store Settings (Single row config)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  currency text NOT NULL DEFAULT 'GBP',
  currency_symbol text NOT NULL DEFAULT '£',
  shipping_fee numeric(10, 2) NOT NULL DEFAULT 6.00 CHECK (shipping_fee >= 0),
  free_shipping_threshold numeric(10, 2) NOT NULL DEFAULT 50.00 CHECK (free_shipping_threshold >= 0),
  tax_rate numeric(5, 4) NOT NULL DEFAULT 0.0000 CHECK (tax_rate >= 0),
  default_country text NOT NULL DEFAULT 'United Kingdom',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 3: Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  image_url text,
  description text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 4: Brands
CREATE TABLE IF NOT EXISTS public.brands (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 5: Products
CREATE TABLE IF NOT EXISTS public.products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  brand_id bigint REFERENCES public.brands(id) ON DELETE SET NULL,
  brand text NOT NULL,
  category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  category_name text NOT NULL,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  old_price numeric(10, 2) CHECK (old_price IS NULL OR old_price >= price),
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  rating numeric(3, 2) NOT NULL DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  review_count int NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  description text NOT NULL,
  ingredients text,
  how_to_use text,
  options text[] NOT NULL DEFAULT '{}',
  image text NOT NULL,
  additional_images text[] NOT NULL DEFAULT '{}',
  badge text,
  skin_types text[] DEFAULT '{All}',
  is_active boolean NOT NULL DEFAULT true,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(description, ''))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 6: User Addresses
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  phone text,
  address_line text NOT NULL,
  city text NOT NULL,
  state text,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'United Kingdom',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 7: Cart Items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  selected_option text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, selected_option)
);

-- Table 8: Wishlist Items
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Table 9: Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_percent numeric(5, 2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  min_spend numeric(10, 2) DEFAULT 0,
  max_discount numeric(10, 2),
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 10: Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'Pending',
  subtotal numeric(10, 2) NOT NULL CHECK (subtotal >= 0),
  shipping numeric(10, 2) NOT NULL DEFAULT 0 CHECK (shipping >= 0),
  tax numeric(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  discount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(10, 2) NOT NULL CHECK (total >= 0),
  coupon_id bigint REFERENCES public.coupons(id) ON DELETE SET NULL,
  payment_method public.payment_method NOT NULL DEFAULT 'card',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  shipping_name text NOT NULL,
  shipping_phone text NOT NULL,
  shipping_address text NOT NULL,
  shipping_city text NOT NULL,
  shipping_postal_code text NOT NULL,
  shipping_country text NOT NULL DEFAULT 'United Kingdom',
  estimated_delivery_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 11: Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id bigint REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_brand text NOT NULL,
  product_image text NOT NULL,
  selected_option text NOT NULL,
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity int NOT NULL CHECK (quantity > 0),
  line_total numeric(10, 2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table 12: Order Status History
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status public.order_status,
  new_status public.order_status NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table 13: Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  content text NOT NULL,
  is_verified_buyer boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Table 14: Newsletter Subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  subscribed_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON public.products(rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);


-- ============================================================================
-- 00002_triggers_and_functions.sql
-- AUTOMATED TRIGGERS AND CORE HELPER FUNCTIONS
-- ============================================================================

-- Function 1: Generic updated_at timestamp updater
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_brands_updated_at ON public.brands;
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER trg_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON public.coupons;
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function 2: Helper to check if caller is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Function 3: Prevent role modification by non-admins
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only administrators are permitted to change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

-- Function 4: Auto-create profile on Auth signup (handles email and Google metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  -- Handle both standard email signup (full_name) and Google OAuth (name or full_name)
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function 5: Recalculate product rating & review count
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
      WHERE product_id = target_product_id AND is_approved = true
    ), 5.0),
    review_count = (
      SELECT COUNT(*) 
      FROM public.reviews 
      WHERE product_id = target_product_id AND is_approved = true
    )
  WHERE id = target_product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- Function 6: Log order status history
CREATE OR REPLACE FUNCTION public.log_order_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, note)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), 'Initial order creation');
  ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_status_history
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_history();


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

  -- Ensure profile row exists in public.profiles for foreign key integrity
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  SELECT 
    v_user_id, 
    COALESCE(u.email, ''), 
    COALESCE(NULLIF(trim(p_shipping_name), ''), u.raw_user_meta_data->>'full_name', 'Customer'),
    trim(p_shipping_phone), 
    'customer'::public.user_role
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone);

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

GRANT EXECUTE ON FUNCTION public.create_order_secure TO authenticated, anon, service_role;
NOTIFY pgrst, 'reload schema';

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


-- ============================================================================
-- 00004_rls_policies.sql
-- COMPREHENSIVE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
-- Users can ONLY read their own profile; admins can read all profiles. Public SELECT is completely removed.
DROP POLICY IF EXISTS "Users read own profile or admin read all" ON public.profiles;
CREATE POLICY "Users read own profile or admin read all" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own profile or admin update" ON public.profiles;
CREATE POLICY "Users update own profile or admin update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

-- 2. Store Settings
-- Public read for storefront display (shipping thresholds, currency, etc.)
DROP POLICY IF EXISTS "Store settings are publicly viewable" ON public.store_settings;
CREATE POLICY "Store settings are publicly viewable" ON public.store_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage store settings" ON public.store_settings;
CREATE POLICY "Admin manage store settings" ON public.store_settings FOR ALL
  USING (public.is_admin());

-- 3. Categories
DROP POLICY IF EXISTS "Categories viewable by everyone" ON public.categories;
CREATE POLICY "Categories viewable by everyone" ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL
  USING (public.is_admin());

-- 4. Brands
DROP POLICY IF EXISTS "Brands viewable by everyone" ON public.brands;
CREATE POLICY "Brands viewable by everyone" ON public.brands FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage brands" ON public.brands;
CREATE POLICY "Admin manage brands" ON public.brands FOR ALL
  USING (public.is_admin());

-- 5. Products
DROP POLICY IF EXISTS "Active products viewable by everyone" ON public.products;
CREATE POLICY "Active products viewable by everyone" ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin manage products" ON public.products;
CREATE POLICY "Admin manage products" ON public.products FOR ALL
  USING (public.is_admin());

-- 6. User Addresses
DROP POLICY IF EXISTS "Users manage own addresses" ON public.user_addresses;
CREATE POLICY "Users manage own addresses" ON public.user_addresses FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin view user addresses" ON public.user_addresses;
CREATE POLICY "Admin view user addresses" ON public.user_addresses FOR SELECT
  USING (public.is_admin());

-- 7. Cart Items
DROP POLICY IF EXISTS "Users manage own cart" ON public.cart_items;
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL
  USING (auth.uid() = user_id);

-- 8. Wishlist Items
DROP POLICY IF EXISTS "Users manage own wishlist" ON public.wishlist_items;
CREATE POLICY "Users manage own wishlist" ON public.wishlist_items FOR ALL
  USING (auth.uid() = user_id);

-- 9. Coupons
-- NO public SELECT policy. Customers validate via validate_coupon RPC. Admins can view and manage.
DROP POLICY IF EXISTS "Admin manage coupons" ON public.coupons;
CREATE POLICY "Admin manage coupons" ON public.coupons FOR ALL
  USING (public.is_admin());

-- 10. Orders
-- Direct INSERT policy removed! Orders are created solely via create_order_secure RPC.
DROP POLICY IF EXISTS "Users view own orders or admin view all" ON public.orders;
CREATE POLICY "Users view own orders or admin view all" ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin update orders" ON public.orders;
CREATE POLICY "Admin update orders" ON public.orders FOR UPDATE
  USING (public.is_admin());

-- 11. Order Items
-- Direct INSERT policy removed! Order items are inserted solely via create_order_secure RPC.
DROP POLICY IF EXISTS "Users view order items of own orders" ON public.order_items;
CREATE POLICY "Users view order items of own orders" ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- 12. Order Status History
DROP POLICY IF EXISTS "Users view status history of own orders" ON public.order_status_history;
CREATE POLICY "Users view status history of own orders" ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- 13. Reviews
DROP POLICY IF EXISTS "Approved reviews viewable by everyone" ON public.reviews;
CREATE POLICY "Approved reviews viewable by everyone" ON public.reviews FOR SELECT
  USING (is_approved = true OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own reviews or admin delete" ON public.reviews;
CREATE POLICY "Users delete own reviews or admin delete" ON public.reviews FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- 14. Newsletter Subscribers
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin view newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admin view newsletter subscribers" ON public.newsletter_subscribers FOR SELECT
  USING (public.is_admin());


-- ============================================================================
-- 00005_storage_and_seed.sql
-- STORAGE BUCKETS SETUP & INITIAL SEED DATA
-- ============================================================================

-- 1. Create Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product-images', 'product-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies
-- A. Product Images: Public read, Admin write
DROP POLICY IF EXISTS "Public read for product images" ON storage.objects;
CREATE POLICY "Public read for product images" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
CREATE POLICY "Admin upload product images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admin update product images" ON storage.objects;
CREATE POLICY "Admin update product images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
CREATE POLICY "Admin delete product images" ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.is_admin());

-- B. Avatars: Public read, User upload to own folder
DROP POLICY IF EXISTS "Public read for avatars" ON storage.objects;
CREATE POLICY "Public read for avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Seed Default Store Settings
INSERT INTO public.store_settings (
  id,
  currency,
  currency_symbol,
  shipping_fee,
  free_shipping_threshold,
  tax_rate,
  default_country
) VALUES (
  1,
  'GBP',
  '£',
  6.00,
  50.00,
  0.0000,
  'United Kingdom'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Initial Categories
INSERT INTO public.categories (name, slug, description, display_order)
VALUES
  ('Skincare', 'skincare', 'Clean, science-backed cleansers, serums, and moisturisers.', 1),
  ('Makeup', 'makeup', 'Weightless tints, velvet lip colours, and glow enhancers.', 2),
  ('Haircare', 'haircare', 'Nourishing botanical oils, restorative masks, and gentle washes.', 3),
  ('Fragrance', 'fragrance', 'Artisanal eau de parfums crafted with rare botanical notes.', 4),
  ('Body Care', 'body-care', 'Indulgent body lotions, polishes, and soothing balms.', 5)
ON CONFLICT (name) DO NOTHING;

-- 5. Seed Initial Coupons
INSERT INTO public.coupons (code, discount_percent, min_spend, max_discount, is_active)
VALUES
  ('WELCOME10', 10.00, 0.00, 50.00, true),
  ('GLOW15', 15.00, 40.00, 60.00, true)
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- 00006_seed_catalog.sql
-- COMPLETE CATALOG SEEDING (BRANDS, PRODUCTS & SAMPLE REVIEWS)
-- ============================================================================

-- 1. Seed Brands
INSERT INTO public.brands (name, slug, description)
VALUES
  ('Luméra', 'lumera', 'High-performance botanical serums and active elixirs.'),
  ('Eira Skin', 'eira-skin', 'Nordic-inspired restorative formulas for the skin barrier.'),
  ('Nocturne', 'nocturne', 'Concentrated night-time recovery and peptide complexes.'),
  ('Solara', 'solara', 'Weightless, invisible broad-spectrum sun and environmental protection.'),
  ('Maison Rosé', 'maison-rose', 'Parisian beauty rituals, velvet lipsticks, and lash enhancers.'),
  ('Aster & Co.', 'aster-and-co', 'Breathable skin tints and clean skin-evening formulations.'),
  ('Vela Beauty', 'vela-beauty', 'Candlelit radiance powders, cream blushes, and sculpting duos.'),
  ('Mara Botanics', 'mara-botanics', 'Deeply nourishing botanical oils and restorative hair masks.'),
  ('Verdant Hair', 'verdant-hair', 'Scalp therapy with rosemary root and botanical actives.'),
  ('Élan Hair', 'elan-hair', 'Featherlight finishing oils and glossing mists.'),
  ('Atelier Abaz', 'atelier-abaz', 'Haute perfumery featuring intimate florals and creamy woods.'),
  ('Olea Parfums', 'olea-parfums', 'Sparkling Mediterranean bergamot, fig, and aromatic cedar.'),
  ('Bain & Bloom', 'bain-and-bloom', 'pH-balanced nourishing washes and shea butter body milks.'),
  ('Rituel', 'rituel', 'Sensory exfoliating polishes and softening hand balms.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 2. Seed 24 Catalog Products (matching src/data/products.ts)
INSERT INTO public.products (
  id,
  name,
  slug,
  brand_id,
  brand,
  category_id,
  category_name,
  price,
  old_price,
  stock,
  rating,
  review_count,
  description,
  ingredients,
  how_to_use,
  options,
  image,
  additional_images,
  badge,
  skin_types,
  is_active
) OVERRIDING SYSTEM VALUE VALUES
(
  1,
  'Hydrating Vitamin C Serum',
  'hydrating-vitamin-c-serum',
  (SELECT id FROM public.brands WHERE name = 'Luméra'),
  'Luméra',
  (SELECT id FROM public.categories WHERE name = 'Skincare'),
  'Skincare',
  38.00,
  46.00,
  24,
  4.8,
  184,
  'A silky hyaluronic serum with rose water and squalane for bouncy, dewy skin.',
  'Aqua, Sodium Hyaluronate, Ascorbyl Glucoside (Vitamin C), Rosa Damascena Flower Water, Squalane, Glycerin, Niacinamide, Tocopherol.',
  'Apply 3-4 drops onto cleansed, damp skin every morning. Gently press into face and neck before applying moisturiser and SPF.',
  ARRAY['30 ml', '50 ml'],
  'https://images.unsplash.com/photo-1764694187688-454d172e5ca0?auto=format&fit=crop&w=900&q=85',
  ARRAY[
    'https://images.unsplash.com/photo-1617213226302-99a82b62626f?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1602532381225-eec578361933?auto=format&fit=crop&w=900&q=85'
  ],
  'Bestseller',
  ARRAY['All', 'Dry', 'Combination', 'Sensitive'],
  true
),
(
  2,
  'Cloud Cream Cleanser',
  'cloud-cream-cleanser',
  (SELECT id FROM public.brands WHERE name = 'Eira Skin'),
  'Eira Skin',
  (SELECT id FROM public.categories WHERE name = 'Skincare'),
  'Skincare',
  24.00,
  NULL,
  31,
  4.7,
  96,
  'A gentle cream cleanser that melts away makeup while protecting the skin barrier.',
  'Aqua, Cetearyl Alcohol, Glycerin, Caprylic/Capric Triglyceride, Avena Sativa (Oat) Kernel Extract, Ceramide NP, Panthenol.',
  'Massage 1-2 pumps onto damp skin with circular motions. Rinse thoroughly with lukewarm water.',
  ARRAY['100 ml', '200 ml'],
  'https://images.unsplash.com/photo-1773070309549-8123488410d7?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1602532381225-eec578361933?auto=format&fit=crop&w=900&q=85'],
  'New',
  ARRAY['All', 'Dry', 'Sensitive'],
  true
),
(
  3,
  'Moonlight Renewal Cream',
  'moonlight-renewal-cream',
  (SELECT id FROM public.brands WHERE name = 'Nocturne'),
  'Nocturne',
  (SELECT id FROM public.categories WHERE name = 'Skincare'),
  'Skincare',
  52.00,
  NULL,
  16,
  4.9,
  212,
  'A restorative night cream with peptides, ceramides, and calming oat extract.',
  'Aqua, Butyrospermum Parkii (Shea) Butter, Squalane, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Ceramide AP, Ceramide EOP.',
  'Warm a small amount between your fingertips and gently press into skin as the final step of your evening ritual.',
  ARRAY['50 ml'],
  'https://images.unsplash.com/photo-1771329064159-33f758d91f4a?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1653784097013-786a8965ea3b?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All', 'Dry', 'Combination'],
  true
),
(
  4,
  'Daily Veil SPF 50',
  'daily-veil-spf-50',
  (SELECT id FROM public.brands WHERE name = 'Solara'),
  'Solara',
  (SELECT id FROM public.categories WHERE name = 'Skincare'),
  'Skincare',
  32.00,
  38.00,
  42,
  4.6,
  143,
  'Invisible broad-spectrum protection with a weightless, satin finish.',
  'Zinc Oxide (Non-nano 12%), Aqua, Isoamyl Laurate, Niacinamide, Camellia Sinensis (Green Tea) Leaf Extract, Bisabolol.',
  'Apply generously and evenly across face, neck, and decollete 15 minutes before sun exposure.',
  ARRAY['50 ml'],
  'https://images.unsplash.com/photo-1752134593973-ac72a80ba7c7?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1701271482230-5ecaec3cd3e1?auto=format&fit=crop&w=900&q=85'],
  'Sale',
  ARRAY['All', 'Oily', 'Combination'],
  true
),
(
  5,
  'Matte Velvet Lipstick',
  'matte-velvet-lipstick',
  (SELECT id FROM public.brands WHERE name = 'Maison Rosé'),
  'Maison Rosé',
  (SELECT id FROM public.categories WHERE name = 'Makeup'),
  'Makeup',
  26.00,
  NULL,
  54,
  4.8,
  306,
  'A cushiony satin lipstick delivering rich color and all-day comfort.',
  'Dimethicone, Polyglyceryl-2 Triisostearate, Silica, Candelilla Wax, Simmondsia Chinensis (Jojoba) Seed Oil, Tocopheryl Acetate.',
  'Glide directly across lips from the center outwards. Blot once with a tissue for a soft-focus blurred effect.',
  ARRAY['Rosewood', 'Petal', 'Mulberry', 'Nude Tea'],
  'https://images.unsplash.com/photo-1653784097013-786a8965ea3b?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1764694187688-454d172e5ca0?auto=format&fit=crop&w=900&q=85'],
  'Bestseller',
  ARRAY['All'],
  true
),
(
  6,
  'Soft Focus Skin Tint',
  'soft-focus-skin-tint',
  (SELECT id FROM public.brands WHERE name = 'Aster & Co.'),
  'Aster & Co.',
  (SELECT id FROM public.categories WHERE name = 'Makeup'),
  'Makeup',
  36.00,
  NULL,
  28,
  4.6,
  129,
  'Breathable sheer coverage that evens tone and leaves a natural glow.',
  'Aqua, Cyclopentasiloxane, Glycerin, Titanium Dioxide, Squalane, Centella Asiatica Extract, Sodium Hyaluronate.',
  'Shake well. Blend 2-3 drops over face with clean fingertips, a damp sponge, or a buffing brush.',
  ARRAY['Light', 'Light Medium', 'Medium', 'Deep'],
  'https://images.unsplash.com/photo-1701271482230-5ecaec3cd3e1?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1773070309549-8123488410d7?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All', 'Dry', 'Combination'],
  true
),
(
  7,
  'Golden Hour Highlighter',
  'golden-hour-highlighter',
  (SELECT id FROM public.brands WHERE name = 'Vela Beauty'),
  'Vela Beauty',
  (SELECT id FROM public.categories WHERE name = 'Makeup'),
  'Makeup',
  29.00,
  34.00,
  19,
  4.7,
  88,
  'Finely milled illuminating powder with a seamless, candlelit sheen.',
  'Mica, Synthetic Fluorphlogopite, Dimethicone, Zinc Stearate, Caprylyl Glycol, Ethylhexylglycerin.',
  'Dust lightly over cheekbones, the brow bone, and cupid’s bow using a tapered fan brush.',
  ARRAY['Pearl', 'Champagne', 'Bronze'],
  'https://images.unsplash.com/photo-1764694187688-454d172e5ca0?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1752134593973-ac72a80ba7c7?auto=format&fit=crop&w=900&q=85'],
  'Sale',
  ARRAY['All'],
  true
),
(
  8,
  'Featherlight Lash Mascara',
  'featherlight-lash-mascara',
  (SELECT id FROM public.brands WHERE name = 'Maison Rosé'),
  'Maison Rosé',
  (SELECT id FROM public.categories WHERE name = 'Makeup'),
  'Makeup',
  23.00,
  NULL,
  37,
  4.5,
  201,
  'Lengthening, flake-free mascara with a precision defining brush.',
  'Aqua, Beeswax, Copernicia Cerifera Wax, Stearic Acid, Iron Oxides, Acacia Senegal Gum, Panthenol.',
  'Wiggle brush at the lash base and sweep upward through the tips. Layer for elevated volume.',
  ARRAY['Soft Black', 'Espresso'],
  'https://images.unsplash.com/photo-1773070309549-8123488410d7?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1771329064159-33f758d91f4a?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All', 'Sensitive'],
  true
),
(
  9,
  'Silk Repair Hair Mask',
  'silk-repair-hair-mask',
  (SELECT id FROM public.brands WHERE name = 'Mara Botanics'),
  'Mara Botanics',
  (SELECT id FROM public.categories WHERE name = 'Haircare'),
  'Haircare',
  34.00,
  NULL,
  22,
  4.9,
  171,
  'A rich weekly treatment with argan oil and plant proteins for glossy strands.',
  'Aqua, Cetearyl Alcohol, Argania Spinosa (Argan) Kernel Oil, Hydrolyzed Wheat Protein, Behentrimonium Chloride, Keratin Amino Acids.',
  'After shampooing, apply generously from mid-lengths to ends. Leave for 5-10 minutes, then rinse completely.',
  ARRAY['200 ml', '400 ml'],
  'https://images.unsplash.com/photo-1771329064159-33f758d91f4a?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1764694187688-454d172e5ca0?auto=format&fit=crop&w=900&q=85'],
  'Bestseller',
  ARRAY['All'],
  true
),
(
  10,
  'Rosemary Root Elixir',
  'rosemary-root-elixir',
  (SELECT id FROM public.brands WHERE name = 'Verdant Hair'),
  'Verdant Hair',
  (SELECT id FROM public.categories WHERE name = 'Haircare'),
  'Haircare',
  28.00,
  NULL,
  26,
  4.6,
  118,
  'A lightweight scalp oil formulated to nourish roots and support healthy hair.',
  'Rosmarinus Officinalis (Rosemary) Leaf Oil, Ricinus Communis (Castor) Seed Oil, Simmondsia Chinensis Seed Oil, Biotin, Mentha Piperita Oil.',
  'Part hair into sections and massage 3-5 drops directly onto the scalp. Leave overnight or for at least 30 minutes before washing.',
  ARRAY['50 ml'],
  'https://images.unsplash.com/photo-1752134593973-ac72a80ba7c7?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1653784097013-786a8965ea3b?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All'],
  true
),
(
  11,
  'Weightless Shine Mist',
  'weightless-shine-mist',
  (SELECT id FROM public.brands WHERE name = 'Élan Hair'),
  'Élan Hair',
  (SELECT id FROM public.categories WHERE name = 'Haircare'),
  'Haircare',
  25.00,
  30.00,
  14,
  4.4,
  73,
  'A dry finishing mist that tames flyaways and adds mirror-like shine.',
  'Alcohol Denat., Cyclomethicone, Phenyl Trimethicone, Camellia Japonica Seed Oil, Fragrance, Tocopherol.',
  'Mist lightly over dry, styled hair from 10 inches away for an instant glossy finish.',
  ARRAY['100 ml'],
  'https://images.unsplash.com/photo-1653784097013-786a8965ea3b?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1701271482230-5ecaec3cd3e1?auto=format&fit=crop&w=900&q=85'],
  'Sale',
  ARRAY['All'],
  true
),
(
  12,
  'Gentle Balance Shampoo',
  'gentle-balance-shampoo',
  (SELECT id FROM public.brands WHERE name = 'Mara Botanics'),
  'Mara Botanics',
  (SELECT id FROM public.categories WHERE name = 'Haircare'),
  'Haircare',
  27.00,
  NULL,
  35,
  4.7,
  94,
  'Sulfate-free daily shampoo for clean, soft hair without stripping moisture.',
  'Aqua, Sodium Cocoyl Isethionate, Cocamidopropyl Betaine, Aloe Barbadensis Leaf Juice, Chamomilla Recutita Flower Extract, Citric Acid.',
  'Massage into wet roots to build a rich lather. Rinse thoroughly and follow with conditioner.',
  ARRAY['250 ml', '500 ml'],
  'https://images.unsplash.com/photo-1701271482230-5ecaec3cd3e1?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1773070309549-8123488410d7?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All', 'Sensitive'],
  true
),
(
  13,
  'Fleur No. 07 Eau de Parfum',
  'fleur-no-07-eau-de-parfum',
  (SELECT id FROM public.brands WHERE name = 'Atelier Abaz'),
  'Atelier Abaz',
  (SELECT id FROM public.categories WHERE name = 'Fragrance'),
  'Fragrance',
  78.00,
  NULL,
  12,
  4.9,
  126,
  'An intimate floral of peony, pink pepper, soft woods, and skin musk.',
  'Alcohol Denat., Parfum (Fragrance), Aqua, Benzyl Salicylate, Limonene, Linalool, Hydroxycitronellal.',
  'Spray onto pulse points—wrists, inner elbows, and base of the neck. Do not rub wrists together.',
  ARRAY['30 ml', '50 ml', '100 ml'],
  'https://images.unsplash.com/photo-1764694187688-454d172e5ca0?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1771329064159-33f758d91f4a?auto=format&fit=crop&w=900&q=85'],
  'Exclusive',
  ARRAY['All'],
  true
),
(
  14,
  'Santal Veil Eau de Parfum',
  'santal-veil-eau-de-parfum',
  (SELECT id FROM public.brands WHERE name = 'Atelier Abaz'),
  'Atelier Abaz',
  (SELECT id FROM public.categories WHERE name = 'Fragrance'),
  'Fragrance',
  82.00,
  NULL,
  9,
  4.8,
  89,
  'Creamy sandalwood, iris, and amber wrapped in a warm, lingering veil.',
  'Alcohol Denat., Parfum, Aqua, Santalum Album (Sandalwood) Oil, Coumarin, Farnesol, Geraniol.',
  'Mist over clean pulse points and allow the fragrance to develop naturally on your skin.',
  ARRAY['50 ml', '100 ml'],
  'https://images.unsplash.com/photo-1773070309549-8123488410d7?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1752134593973-ac72a80ba7c7?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All'],
  true
),
(
  15,
  'Citrus Muse Travel Spray',
  'citrus-muse-travel-spray',
  (SELECT id FROM public.brands WHERE name = 'Olea Parfums'),
  'Olea Parfums',
  (SELECT id FROM public.categories WHERE name = 'Fragrance'),
  'Fragrance',
  32.00,
  NULL,
  29,
  4.5,
  67,
  'Sparkling bergamot, neroli, and white tea in a purse-ready spray.',
  'Alcohol Denat., Parfum, Aqua, Citrus Aurantium Bergamia Fruit Oil, Citral, Citronellol, Eugenol.',
  'Spritz anytime throughout the day for an energising botanical refresh.',
  ARRAY['10 ml'],
  'https://images.unsplash.com/photo-1771329064159-33f758d91f4a?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1764694187688-454d172e5ca0?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All'],
  true
),
(
  16,
  'Midnight Fig Eau de Parfum',
  'midnight-fig-eau-de-parfum',
  (SELECT id FROM public.brands WHERE name = 'Olea Parfums'),
  'Olea Parfums',
  (SELECT id FROM public.categories WHERE name = 'Fragrance'),
  'Fragrance',
  74.00,
  88.00,
  7,
  4.7,
  104,
  'Ripe fig, violet leaf, and cedar for a sophisticated evening signature.',
  'Alcohol Denat., Parfum, Aqua, Ficus Carica (Fig) Fruit Extract, Cedrus Atlantica Bark Oil, Isoeugenol.',
  'Apply behind ears and along the collarbones for an alluring evening sillage.',
  ARRAY['50 ml'],
  'https://images.unsplash.com/photo-1752134593973-ac72a80ba7c7?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1653784097013-786a8965ea3b?auto=format&fit=crop&w=900&q=85'],
  'Sale',
  ARRAY['All'],
  true
),
(
  17,
  'Rose Milk Body Lotion',
  'rose-milk-body-lotion',
  (SELECT id FROM public.brands WHERE name = 'Bain & Bloom'),
  'Bain & Bloom',
  (SELECT id FROM public.categories WHERE name = 'Body Care'),
  'Body Care',
  26.00,
  NULL,
  33,
  4.8,
  158,
  'A fast-absorbing body lotion with shea butter and a delicate rose scent.',
  'Aqua, Caprylic/Capric Triglyceride, Butyrospermum Parkii Butter, Rosa Damascena Extract, Prunus Amygdalus Dulcis Oil, Allantoin.',
  'Smooth over clean, towel-dried skin after bathing, paying special attention to dry elbows and knees.',
  ARRAY['250 ml'],
  'https://images.unsplash.com/photo-1653784097013-786a8965ea3b?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1701271482230-5ecaec3cd3e1?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All', 'Dry', 'Sensitive'],
  true
),
(
  18,
  'Cashmere Body Wash',
  'cashmere-body-wash',
  (SELECT id FROM public.brands WHERE name = 'Bain & Bloom'),
  'Bain & Bloom',
  (SELECT id FROM public.categories WHERE name = 'Body Care'),
  'Body Care',
  22.00,
  NULL,
  38,
  4.6,
  93,
  'A creamy, pH-balanced wash that leaves skin soft and lightly scented.',
  'Aqua, Sodium Lauroyl Methyl Isethionate, Glycerin, Avena Sativa Meal Extract, Macadamia Ternifolia Seed Oil, Parfum.',
  'Lather onto damp skin in the shower or pour generously under running water for a luxurious bath.',
  ARRAY['300 ml', '500 ml'],
  'https://images.unsplash.com/photo-1701271482230-5ecaec3cd3e1?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1773070309549-8123488410d7?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All', 'Sensitive'],
  true
),
(
  19,
  'Amber Sugar Body Polish',
  'amber-sugar-body-polish',
  (SELECT id FROM public.brands WHERE name = 'Rituel'),
  'Rituel',
  (SELECT id FROM public.categories WHERE name = 'Body Care'),
  'Body Care',
  30.00,
  36.00,
  18,
  4.7,
  111,
  'A smoothing brown sugar polish enriched with jojoba and apricot oils.',
  'Sucrose, Simmondsia Chinensis Seed Oil, Prunus Armeniaca Kernel Oil, Silica Dimethyl Silylate, Vanilla Planifolia Fruit Extract.',
  'Gently buff onto damp skin in circular motions 1-2 times weekly. Rinse with warm water.',
  ARRAY['250 g'],
  'https://images.unsplash.com/photo-1764694187688-454d172e5ca0?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1752134593973-ac72a80ba7c7?auto=format&fit=crop&w=900&q=85'],
  'Sale',
  ARRAY['All', 'Dry'],
  true
),
(
  20,
  'Satin Hands Ritual',
  'satin-hands-ritual',
  (SELECT id FROM public.brands WHERE name = 'Rituel'),
  'Rituel',
  (SELECT id FROM public.categories WHERE name = 'Body Care'),
  'Body Care',
  19.00,
  NULL,
  44,
  4.5,
  65,
  'A nourishing hand cream with niacinamide, shea butter, and cotton flower.',
  'Aqua, Butyrospermum Parkii Butter, Niacinamide, Glycerin, Gossypium Herbaceum (Cotton) Seed Oil, Sodium Polyacrylate.',
  'Massage into hands and cuticles as needed throughout the day and before sleeping.',
  ARRAY['50 ml', '100 ml'],
  'https://images.unsplash.com/photo-1773070309549-8123488410d7?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1771329064159-33f758d91f4a?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All'],
  true
),
(
  21,
  'Barrier Rescue Balm',
  'barrier-rescue-balm',
  (SELECT id FROM public.brands WHERE name = 'Eira Skin'),
  'Eira Skin',
  (SELECT id FROM public.categories WHERE name = 'Skincare'),
  'Skincare',
  31.00,
  NULL,
  21,
  4.8,
  137,
  'An all-purpose ceramide balm to comfort dry, sensitive areas instantly.',
  'Petrolatum, Cera Alba, Squalane, Ceramide NP, Bisabolol, Madecassoside, Zinc Gluconate.',
  'Warm a small amount between fingers and press onto compromised, flaking, or extra-dry areas.',
  ARRAY['40 ml'],
  'https://images.unsplash.com/photo-1771329064159-33f758d91f4a?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1764694187688-454d172e5ca0?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['Dry', 'Sensitive'],
  true
),
(
  22,
  'Sculpt & Flush Duo',
  'sculpt-and-flush-duo',
  (SELECT id FROM public.brands WHERE name = 'Vela Beauty'),
  'Vela Beauty',
  (SELECT id FROM public.categories WHERE name = 'Makeup'),
  'Makeup',
  39.00,
  NULL,
  17,
  4.7,
  119,
  'A creamy blush and contour pairing for effortless, dimensional color.',
  'Caprylic/Capric Triglyceride, Mica, Polyglyceryl-3 Diisostearate, Carnauba Wax, Silica, Iron Oxides, Red 7 Lake.',
  'Dab contour stick beneath cheekbones and jawline; tap blush onto apples of cheeks. Blend softly with fingertips.',
  ARRAY['Blossom', 'Terracotta', 'Berry'],
  'https://images.unsplash.com/photo-1752134593973-ac72a80ba7c7?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1653784097013-786a8965ea3b?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All'],
  true
),
(
  23,
  'Peptide Gloss Treatment',
  'peptide-gloss-treatment',
  (SELECT id FROM public.brands WHERE name = 'Luméra'),
  'Luméra',
  (SELECT id FROM public.categories WHERE name = 'Makeup'),
  'Makeup',
  21.00,
  NULL,
  46,
  4.8,
  228,
  'A high-shine lip treatment with peptides and nourishing raspberry oil.',
  'Polybutene, Rubus Idaeus (Raspberry) Seed Oil, Palmitoyl Tripeptide-38, Shea Butter, Flavor, Mentha Piperita Extract.',
  'Glide over bare lips for sheer gloss and cushiony moisture, or layer over your favorite lipstick.',
  ARRAY['Clear', 'Rose', 'Cocoa'],
  'https://images.unsplash.com/photo-1653784097013-786a8965ea3b?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1701271482230-5ecaec3cd3e1?auto=format&fit=crop&w=900&q=85'],
  'Trending',
  ARRAY['All'],
  true
),
(
  24,
  'Nourishing Hair Oil',
  'nourishing-hair-oil',
  (SELECT id FROM public.brands WHERE name = 'Élan Hair'),
  'Élan Hair',
  (SELECT id FROM public.categories WHERE name = 'Haircare'),
  'Haircare',
  31.00,
  NULL,
  25,
  4.6,
  82,
  'A featherlight botanical blend that smooths ends without weighing hair down.',
  'Dimethicone, Argania Spinosa Kernel Oil, Camellia Japonica Seed Oil, Helianthus Annuus Seed Oil, Parfum, Linalool.',
  'Dispense 1-2 pumps into palms and work evenly through towel-dried or dry ends.',
  ARRAY['50 ml', '100 ml'],
  'https://images.unsplash.com/photo-1701271482230-5ecaec3cd3e1?auto=format&fit=crop&w=900&q=85',
  ARRAY['https://images.unsplash.com/photo-1773070309549-8123488410d7?auto=format&fit=crop&w=900&q=85'],
  NULL,
  ARRAY['All'],
  true
)
ON CONFLICT (slug) DO UPDATE
SET 
  price = EXCLUDED.price,
  old_price = EXCLUDED.old_price,
  stock = EXCLUDED.stock,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  description = EXCLUDED.description,
  options = EXCLUDED.options,
  image = EXCLUDED.image,
  additional_images = EXCLUDED.additional_images,
  badge = EXCLUDED.badge;


GRANT EXECUTE ON FUNCTION public.create_order_secure(text, text, text, text, text, text, text, jsonb, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated, anon, service_role;

-- Launch Readiness Enhancements:
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS carrier text,
ADD COLUMN IF NOT EXISTS tracking_number text,
ADD COLUMN IF NOT EXISTS tracking_url text,
ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
ADD COLUMN IF NOT EXISTS delivery_option text DEFAULT 'standard';

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS expedited_shipping_fee numeric(10, 2) NOT NULL DEFAULT 8.50;

UPDATE public.store_settings
SET expedited_shipping_fee = 8.50
WHERE id = 1 AND expedited_shipping_fee IS NULL;

CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only administrators are permitted to change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

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
    RAISE NOTICE 'No profile found matching %. Make sure the user has registered first.', p_email;
  END IF;

  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order_secure(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
BEGIN
  UPDATE public.orders
  SET status = 'Cancelled', updated_at = now()
  WHERE id = p_order_id AND status != 'Cancelled';

  IF FOUND THEN
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_items
      WHERE order_id = p_order_id AND product_id IS NOT NULL
    LOOP
      UPDATE public.products
      SET stock = stock + v_item.quantity, updated_at = now()
      WHERE id = v_item.product_id;
    END LOOP;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(text) TO authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.cancel_order_secure(uuid) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
