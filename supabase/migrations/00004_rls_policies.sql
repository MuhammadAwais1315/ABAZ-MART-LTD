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
CREATE POLICY "Users read own profile or admin read all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users update own profile or admin update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

-- 2. Store Settings
-- Public read for storefront display (shipping thresholds, currency, etc.)
CREATE POLICY "Store settings are publicly viewable"
  ON public.store_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin manage store settings"
  ON public.store_settings FOR ALL
  USING (public.is_admin());

-- 3. Categories
CREATE POLICY "Categories viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admin manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin());

-- 4. Brands
CREATE POLICY "Brands viewable by everyone"
  ON public.brands FOR SELECT
  USING (true);

CREATE POLICY "Admin manage brands"
  ON public.brands FOR ALL
  USING (public.is_admin());

-- 5. Products
CREATE POLICY "Active products viewable by everyone"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admin manage products"
  ON public.products FOR ALL
  USING (public.is_admin());

-- 6. User Addresses
CREATE POLICY "Users manage own addresses"
  ON public.user_addresses FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admin view user addresses"
  ON public.user_addresses FOR SELECT
  USING (public.is_admin());

-- 7. Cart Items
CREATE POLICY "Users manage own cart"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id);

-- 8. Wishlist Items
CREATE POLICY "Users manage own wishlist"
  ON public.wishlist_items FOR ALL
  USING (auth.uid() = user_id);

-- 9. Coupons
-- NO public SELECT policy. Customers validate via validate_coupon RPC. Admins can view and manage.
CREATE POLICY "Admin manage coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin());

-- 10. Orders
-- Direct INSERT policy removed! Orders are created solely via create_order_secure RPC.
CREATE POLICY "Users view own orders or admin view all"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admin update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

-- 11. Order Items
-- Direct INSERT policy removed! Order items are inserted solely via create_order_secure RPC.
CREATE POLICY "Users view order items of own orders"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- 12. Order Status History
CREATE POLICY "Users view status history of own orders"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- 13. Reviews
CREATE POLICY "Approved reviews viewable by everyone"
  ON public.reviews FOR SELECT
  USING (is_approved = true OR auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own reviews or admin delete"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- 14. Newsletter Subscribers
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin view newsletter subscribers"
  ON public.newsletter_subscribers FOR SELECT
  USING (public.is_admin());
