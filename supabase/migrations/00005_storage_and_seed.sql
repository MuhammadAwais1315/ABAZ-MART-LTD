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
CREATE POLICY "Public read for product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admin upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admin update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admin delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.is_admin());

-- B. Avatars: Public read, User upload to own folder
CREATE POLICY "Public read for avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
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
