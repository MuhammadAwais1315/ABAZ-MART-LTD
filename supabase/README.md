# Abaz Mart — Supabase Database Architecture & Migrations

This directory contains the production-ready PostgreSQL migrations, triggers, security policies, and seed data for the Abaz Mart e-commerce platform.

---

## Migration Index

| File | Purpose |
|---|---|
| [`00001_initial_schema.sql`](./migrations/00001_initial_schema.sql) | Extensions, enums (`user_role`, `order_status`, etc.), 14 tables, foreign keys, constraints, and performance indexes. |
| [`00002_triggers_and_functions.sql`](./migrations/00002_triggers_and_functions.sql) | `updated_at` triggers, `handle_new_user()` (Google + email signup), role-change prevention, rating recalculation, and order status history logging. |
| [`00003_rpcs.sql`](./migrations/00003_rpcs.sql) | Atomic transaction RPCs: `validate_coupon()`, `create_order_secure()`, `cancel_order_secure()`, and `submit_review_secure()`. All with `SET search_path = ''`. |
| [`00004_rls_policies.sql`](./migrations/00004_rls_policies.sql) | Strict Row Level Security policies: private profiles, admin overrides, no direct order/item inserts, coupon privacy, and review safeguards. |
| [`00005_storage_and_seed.sql`](./migrations/00005_storage_and_seed.sql) | Storage buckets (`product-images`, `avatars`) with RLS policies, default `store_settings` (GBP £, 0 tax), categories, and promotional coupons. |
| [`00006_seed_catalog.sql`](./migrations/00006_seed_catalog.sql) | 14 cosmetic brands and all 24 beauty products with descriptions, ingredients, options, stock, and Unsplash imagery. |
| [`00007_admin_setup.sql`](./migrations/00007_admin_setup.sql) | Administrative helper function `public.promote_user_to_admin(email)` to assign admin roles. |

---

## How to Apply Migrations

### Option A: Via Supabase Web Dashboard (Recommended for quick setup)
1. Open your Supabase project dashboard at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** tab.
3. Run the files sequentially from `00001` through `00007` (or paste their combined contents into a query tab).
4. Verify all tables in the **Table Editor**.

### Option B: Via Supabase CLI
```bash
# Link your local project
supabase link --project-ref your-project-id

# Push migrations to the remote database
supabase db push
```

---

## Setting Up Your First Admin User

1. Create an account via the storefront `/register` page using your chosen admin email (e.g. `admin@abazmart.com`).
2. Run the promotion helper in the Supabase SQL Editor:
   ```sql
   SELECT public.promote_user_to_admin('admin@abazmart.com');
   ```
3. Sign in to access the `/admin` portal.

---

## Environment Configuration

In `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
The typed frontend client is available at [`src/lib/supabase.ts`](../src/lib/supabase.ts).
