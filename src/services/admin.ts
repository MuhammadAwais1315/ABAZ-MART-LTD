import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { Product, products } from "../data/products"
import { Database, OrderStatus, UserRole } from "../types/database"

export type ProductRow = Database["public"]["Tables"]["products"]["Row"]
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"]

export interface AdminOrderItem {
  id: string
  orderNumber: string
  customer: string
  email?: string
  date: string
  total: number
  status: OrderStatus
  itemsCount: number
  rawCreatedAt: string
}

export interface AdminProductPayload {
  name: string
  brand: string
  category: Product["category"]
  price: number
  oldPrice?: number | null
  stock: number
  description: string
  options: string[]
  image: string
  additionalImages?: string[]
  badge?: string | null
  skinTypes?: string[]
}

export interface AdminCategory {
  id: number
  name: string
  slug: string
  description?: string | null
  image?: string | null
  displayOrder: number
  productCount?: number
}

export interface AdminCustomer {
  id: string
  email: string
  fullName: string
  phone?: string | null
  avatarUrl?: string | null
  role: UserRole
  createdAt: string
  ordersCount: number
}

export interface AdminStoreSettings {
  id: number
  currency: string
  currencySymbol: string
  shippingFee: number
  freeShippingThreshold: number
  taxRate: number
  defaultCountry: string
}

export interface AdminCoupon {
  id: number
  code: string
  discountPercent: number
  minSpend: number
  maxDiscount?: number | null
  isActive: boolean
  expiresAt?: string | null
  createdAt: string
}

export interface AdminNewsletterSubscriber {
  id: number
  email: string
  subscribedAt: string
}

const CATEGORY_ID_MAP: Record<string, number> = {
  Skincare: 1,
  Makeup: 2,
  Haircare: 3,
  Fragrance: 4,
  "Body Care": 5,
}

// ----------------------------------------------------------------------------
// PRODUCTS
// ----------------------------------------------------------------------------

export async function getAdminProducts(): Promise<{
  data: Product[]
  error: Error | null
}> {
  if (!isSupabaseConfigured()) {
    return { data: products, error: null }
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true })

    if (error) {
      console.warn("Failed to load admin products from Supabase:", error.message)
      return { data: products, error: null }
    }

    if (!data || data.length === 0) {
      return { data: products, error: null }
    }

    const mapped: Product[] = data.map((item) => ({
      id: Number(item.id),
      name: item.name,
      brand: item.brand,
      category: item.category_name as Product["category"],
      price: Number(item.price),
      oldPrice: item.old_price ? Number(item.old_price) : undefined,
      rating: Number(item.rating) || 5.0,
      reviewCount: item.review_count || 0,
      description: item.description,
      image: item.image,
      options:
        item.options && item.options.length > 0 ? item.options : ["Standard"],
      badge: item.badge || undefined,
      stock: item.stock,
    }))

    return { data: mapped, error: null }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load products"
    return { data: products, error: new Error(message) }
  }
}

export async function createAdminProduct(
  payload: AdminProductPayload,
): Promise<{ data: Product | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    const fakeProduct: Product = {
      id: Date.now(),
      name: payload.name,
      brand: payload.brand,
      category: payload.category,
      price: payload.price,
      oldPrice: payload.oldPrice || undefined,
      rating: 5.0,
      reviewCount: 0,
      description: payload.description,
      image: payload.image,
      options: payload.options.length > 0 ? payload.options : ["Standard"],
      badge: payload.badge || undefined,
      stock: payload.stock,
    }
    return { data: fakeProduct, error: null }
  }

  try {
    const categoryId = CATEGORY_ID_MAP[payload.category] || 1
    const baseSlug = payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    const slug = `${baseSlug}-${Date.now().toString().slice(-6)}`

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: payload.name,
        slug,
        brand: payload.brand,
        category_id: categoryId,
        category_name: payload.category,
        price: payload.price,
        old_price: payload.oldPrice || null,
        stock: payload.stock,
        rating: 5.0,
        review_count: 0,
        description: payload.description,
        options: payload.options,
        image: payload.image,
        additional_images: payload.additionalImages || [],
        badge: payload.badge || null,
        skin_types: payload.skinTypes || ["All"],
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    const created: Product = {
      id: Number(data.id),
      name: data.name,
      brand: data.brand,
      category: data.category_name as Product["category"],
      price: Number(data.price),
      oldPrice: data.old_price ? Number(data.old_price) : undefined,
      rating: Number(data.rating),
      reviewCount: data.review_count,
      description: data.description,
      image: data.image,
      options: data.options,
      badge: data.badge || undefined,
      stock: data.stock,
    }

    return { data: created, error: null }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create product"
    return { data: null, error: new Error(message) }
  }
}

export async function updateAdminProduct(
  id: number,
  payload: Partial<AdminProductPayload>,
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: null }
  }

  try {
    const updates: Record<string, unknown> = {}
    if (payload.name !== undefined) updates.name = payload.name
    if (payload.brand !== undefined) updates.brand = payload.brand
    if (payload.category !== undefined) {
      updates.category_name = payload.category
      updates.category_id = CATEGORY_ID_MAP[payload.category] || 1
    }
    if (payload.price !== undefined) updates.price = payload.price
    if (payload.oldPrice !== undefined) updates.old_price = payload.oldPrice
    if (payload.stock !== undefined) updates.stock = payload.stock
    if (payload.description !== undefined)
      updates.description = payload.description
    if (payload.options !== undefined) updates.options = payload.options
    if (payload.image !== undefined) updates.image = payload.image
    if (payload.additionalImages !== undefined)
      updates.additional_images = payload.additionalImages
    if (payload.badge !== undefined) updates.badge = payload.badge
    if (payload.skinTypes !== undefined) updates.skin_types = payload.skinTypes

    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)

    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update product"
    return { error: new Error(message) }
  }
}

export async function deleteAdminProduct(
  id: number,
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: null }
  }

  try {
    const { error } = await supabase.from("products").delete().eq("id", id)
    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete product"
    return { error: new Error(message) }
  }
}

export async function uploadProductImage(
  file: File,
): Promise<{ url: string | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return {
      url: URL.createObjectURL(file),
      error: null,
    }
  }

  try {
    const fileExt = file.name.split(".").pop() || "jpg"
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const filePath = `catalog/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      })

    if (uploadError) {
      return { url: null, error: new Error(uploadError.message) }
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath)
    return { url: data.publicUrl, error: null }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to upload image"
    return { url: null, error: new Error(message) }
  }
}

// ----------------------------------------------------------------------------
// ORDERS & FULFILLMENT
// ----------------------------------------------------------------------------

export async function getAdminOrders(): Promise<{
  data: AdminOrderItem[]
  error: Error | null
}> {
  if (!isSupabaseConfigured()) {
    return { data: getFallbackAdminOrders(), error: null }
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(id)")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Failed to fetch admin orders from Supabase:", error.message)
      return { data: getFallbackAdminOrders(), error: null }
    }

    if (!data || data.length === 0) {
      return { data: getFallbackAdminOrders(), error: null }
    }

    const mapped: AdminOrderItem[] = data.map((o) => {
      const createdDate = new Date(o.created_at)
      const formattedDate = createdDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })

      const itemsCount = Array.isArray(o.order_items) ? o.order_items.length : 1

      return {
        id: o.id,
        orderNumber: o.order_number,
        customer: o.shipping_name || "Customer",
        date: formattedDate,
        total: Number(o.total),
        status: o.status,
        itemsCount,
        rawCreatedAt: o.created_at,
      }
    })

    return { data: mapped, error: null }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load admin orders"
    return { data: getFallbackAdminOrders(), error: new Error(message) }
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: null }
  }

  try {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)

    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update order status"
    return { error: new Error(message) }
  }
}

// ----------------------------------------------------------------------------
// CATEGORIES
// ----------------------------------------------------------------------------

export async function getAdminCategories(): Promise<{
  data: AdminCategory[]
  error: Error | null
}> {
  if (!isSupabaseConfigured()) {
    return { data: getFallbackCategories(), error: null }
  }

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*, products(id)")
      .order("display_order", { ascending: true })

    if (error || !data) {
      return { data: getFallbackCategories(), error: null }
    }

    const mapped: AdminCategory[] = data.map((c) => ({
      id: Number(c.id),
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      displayOrder: c.display_order,
      productCount: Array.isArray(c.products) ? c.products.length : 0,
    }))

    return { data: mapped, error: null }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load categories"
    return { data: getFallbackCategories(), error: new Error(message) }
  }
}

export async function createAdminCategory(category: {
  name: string
  description?: string
  displayOrder?: number
}): Promise<{ data: AdminCategory | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return {
      data: {
        id: Date.now(),
        name: category.name,
        slug: category.name.toLowerCase().replace(/\s+/g, "-"),
        description: category.description || null,
        displayOrder: category.displayOrder || 1,
        productCount: 0,
      },
      error: null,
    }
  }

  try {
    const slug = category.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: category.name,
        slug,
        description: category.description || null,
        display_order: category.displayOrder || 1,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return {
      data: {
        id: Number(data.id),
        name: data.name,
        slug: data.slug,
        description: data.description,
        displayOrder: data.display_order,
        productCount: 0,
      },
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create category"
    return { data: null, error: new Error(message) }
  }
}

export async function updateAdminCategory(
  id: number,
  category: Partial<{ name: string; description: string; displayOrder: number }>,
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  try {
    const updates: Record<string, unknown> = {}
    if (category.name !== undefined) {
      updates.name = category.name
      updates.slug = category.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    }
    if (category.description !== undefined) updates.description = category.description
    if (category.displayOrder !== undefined) updates.display_order = category.displayOrder

    const { error } = await supabase.from("categories").update(updates).eq("id", id)
    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update category"
    return { error: new Error(message) }
  }
}

export async function deleteAdminCategory(id: number): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  try {
    const { error } = await supabase.from("categories").delete().eq("id", id)
    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete category"
    return { error: new Error(message) }
  }
}

// ----------------------------------------------------------------------------
// CUSTOMERS & ROLES
// ----------------------------------------------------------------------------

export async function getAdminCustomers(): Promise<{
  data: AdminCustomer[]
  error: Error | null
}> {
  if (!isSupabaseConfigured()) {
    return { data: getFallbackCustomers(), error: null }
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, orders(id)")
      .order("created_at", { ascending: false })

    if (error || !data) {
      return { data: getFallbackCustomers(), error: null }
    }

    const mapped: AdminCustomer[] = data.map((p) => {
      const createdDate = new Date(p.created_at)
      const formattedDate = createdDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })

      return {
        id: p.id,
        email: p.email,
        fullName: p.full_name || p.email.split("@")[0],
        phone: p.phone,
        avatarUrl: p.avatar_url,
        role: p.role,
        createdAt: formattedDate,
        ordersCount: Array.isArray(p.orders) ? p.orders.length : 0,
      }
    })

    return { data: mapped, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load customers"
    return { data: getFallbackCustomers(), error: new Error(message) }
  }
}

export async function updateCustomerRole(
  userId: string,
  role: UserRole,
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)

    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update role"
    return { error: new Error(message) }
  }
}

// ----------------------------------------------------------------------------
// STORE SETTINGS
// ----------------------------------------------------------------------------

export async function getAdminStoreSettings(): Promise<{
  data: AdminStoreSettings
  error: Error | null
}> {
  const fallback: AdminStoreSettings = {
    id: 1,
    currency: "GBP",
    currencySymbol: "£",
    shippingFee: 6.0,
    freeShippingThreshold: 50.0,
    taxRate: 0.0,
    defaultCountry: "United Kingdom",
  }

  if (!isSupabaseConfigured()) {
    return { data: fallback, error: null }
  }

  try {
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .single()

    if (error || !data) {
      return { data: fallback, error: null }
    }

    return {
      data: {
        id: data.id,
        currency: data.currency,
        currencySymbol: data.currency_symbol,
        shippingFee: Number(data.shipping_fee),
        freeShippingThreshold: Number(data.free_shipping_threshold),
        taxRate: Number(data.tax_rate),
        defaultCountry: data.default_country,
      },
      error: null,
    }
  } catch {
    return { data: fallback, error: null }
  }
}

export async function updateAdminStoreSettings(
  settings: Partial<Omit<AdminStoreSettings, "id">>,
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  try {
    const updates: Record<string, unknown> = {}
    if (settings.currencySymbol !== undefined) updates.currency_symbol = settings.currencySymbol
    if (settings.currency !== undefined) updates.currency = settings.currency
    if (settings.shippingFee !== undefined) updates.shipping_fee = settings.shippingFee
    if (settings.freeShippingThreshold !== undefined)
      updates.free_shipping_threshold = settings.freeShippingThreshold
    if (settings.taxRate !== undefined) updates.tax_rate = settings.taxRate
    if (settings.defaultCountry !== undefined) updates.default_country = settings.defaultCountry

    const { error } = await supabase
      .from("store_settings")
      .update(updates)
      .eq("id", 1)

    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update settings"
    return { error: new Error(message) }
  }
}

// ----------------------------------------------------------------------------
// COUPONS
// ----------------------------------------------------------------------------

export async function getAdminCoupons(): Promise<{
  data: AdminCoupon[]
  error: Error | null
}> {
  if (!isSupabaseConfigured()) {
    return { data: getFallbackCoupons(), error: null }
  }

  try {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })

    if (error || !data) {
      return { data: getFallbackCoupons(), error: null }
    }

    const mapped: AdminCoupon[] = data.map((c) => ({
      id: Number(c.id),
      code: c.code,
      discountPercent: Number(c.discount_percent),
      minSpend: Number(c.min_spend),
      maxDiscount: c.max_discount ? Number(c.max_discount) : null,
      isActive: c.is_active,
      expiresAt: c.expires_at,
      createdAt: new Date(c.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    }))

    return { data: mapped, error: null }
  } catch {
    return { data: getFallbackCoupons(), error: null }
  }
}

export async function createAdminCoupon(coupon: {
  code: string
  discountPercent: number
  minSpend?: number
  maxDiscount?: number
}): Promise<{ data: AdminCoupon | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return {
      data: {
        id: Date.now(),
        code: coupon.code.toUpperCase(),
        discountPercent: coupon.discountPercent,
        minSpend: coupon.minSpend || 0,
        maxDiscount: coupon.maxDiscount || null,
        isActive: true,
        createdAt: "Just now",
      },
      error: null,
    }
  }

  try {
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: coupon.code.toUpperCase().trim(),
        discount_percent: coupon.discountPercent,
        min_spend: coupon.minSpend || 0,
        max_discount: coupon.maxDiscount || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return {
      data: {
        id: Number(data.id),
        code: data.code,
        discountPercent: Number(data.discount_percent),
        minSpend: Number(data.min_spend),
        maxDiscount: data.max_discount ? Number(data.max_discount) : null,
        isActive: data.is_active,
        expiresAt: data.expires_at,
        createdAt: "Just now",
      },
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create coupon"
    return { data: null, error: new Error(message) }
  }
}

export async function toggleCouponActive(
  id: number,
  isActive: boolean,
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  try {
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: isActive })
      .eq("id", id)

    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle coupon"
    return { error: new Error(message) }
  }
}

export async function deleteAdminCoupon(id: number): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) return { error: null }

  try {
    const { error } = await supabase.from("coupons").delete().eq("id", id)
    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete coupon"
    return { error: new Error(message) }
  }
}

// ----------------------------------------------------------------------------
// NEWSLETTER
// ----------------------------------------------------------------------------

export async function subscribeNewsletter(
  email: string,
): Promise<{ success: boolean; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { success: true, error: null }
  }

  try {
    const trimmed = email.toLowerCase().trim()
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: trimmed })

    if (error) {
      // 23505 is unique violation in Postgres -> already subscribed!
      if (error.code === "23505") {
        return { success: true, error: null }
      }
      return { success: false, error: new Error(error.message) }
    }

    return { success: true, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Subscription failed"
    return { success: false, error: new Error(message) }
  }
}

export async function getNewsletterSubscribers(): Promise<{
  data: AdminNewsletterSubscriber[]
  error: Error | null
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: [
        { id: 1, email: "amara@example.com", subscribedAt: "18 Feb 2026" },
        { id: 2, email: "sofia@example.com", subscribedAt: "17 Feb 2026" },
      ],
      error: null,
    }
  }

  try {
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false })

    if (error || !data) {
      return { data: [], error: null }
    }

    const mapped = data.map((s) => ({
      id: Number(s.id),
      email: s.email,
      subscribedAt: new Date(s.subscribed_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    }))

    return { data: mapped, error: null }
  } catch {
    return { data: [], error: null }
  }
}

// ----------------------------------------------------------------------------
// FALLBACK DATA
// ----------------------------------------------------------------------------

function getFallbackAdminOrders(): AdminOrderItem[] {
  return [
    {
      id: "demo-1",
      orderNumber: "ABZ-10842",
      customer: "Amara Williams",
      date: "18 Feb 2026",
      total: 126.4,
      status: "Delivered",
      itemsCount: 2,
      rawCreatedAt: "2026-02-18T10:00:00Z",
    },
    {
      id: "demo-2",
      orderNumber: "ABZ-10839",
      customer: "Nadia Brooks",
      date: "18 Feb 2026",
      total: 84.0,
      status: "Shipped",
      itemsCount: 1,
      rawCreatedAt: "2026-02-18T09:30:00Z",
    },
    {
      id: "demo-3",
      orderNumber: "ABZ-10835",
      customer: "Sofia Chen",
      date: "17 Feb 2026",
      total: 152.25,
      status: "Processing",
      itemsCount: 3,
      rawCreatedAt: "2026-02-17T14:15:00Z",
    },
    {
      id: "demo-4",
      orderNumber: "ABZ-10831",
      customer: "Leila Morgan",
      date: "17 Feb 2026",
      total: 67.5,
      status: "Pending",
      itemsCount: 1,
      rawCreatedAt: "2026-02-17T11:00:00Z",
    },
    {
      id: "demo-5",
      orderNumber: "ABZ-10828",
      customer: "Maya Roberts",
      date: "16 Feb 2026",
      total: 91.0,
      status: "Cancelled",
      itemsCount: 2,
      rawCreatedAt: "2026-02-16T16:45:00Z",
    },
    {
      id: "demo-6",
      orderNumber: "ABZ-10824",
      customer: "Olivia Kim",
      date: "16 Feb 2026",
      total: 205.8,
      status: "Delivered",
      itemsCount: 4,
      rawCreatedAt: "2026-02-16T08:20:00Z",
    },
  ]
}

function getFallbackCategories(): AdminCategory[] {
  return [
    {
      id: 1,
      name: "Skincare",
      slug: "skincare",
      description: "Clean, science-backed cleansers, serums, and moisturisers.",
      displayOrder: 1,
      productCount: 12,
    },
    {
      id: 2,
      name: "Makeup",
      slug: "makeup",
      description: "Weightless tints, velvet lip colours, and glow enhancers.",
      displayOrder: 2,
      productCount: 8,
    },
    {
      id: 3,
      name: "Haircare",
      slug: "haircare",
      description: "Nourishing botanical oils, restorative masks, and gentle washes.",
      displayOrder: 3,
      productCount: 5,
    },
    {
      id: 4,
      name: "Fragrance",
      slug: "fragrance",
      description: "Artisanal eau de parfums crafted with rare botanical notes.",
      displayOrder: 4,
      productCount: 3,
    },
    {
      id: 5,
      name: "Body Care",
      slug: "body-care",
      description: "Indulgent body lotions, polishes, and soothing balms.",
      displayOrder: 5,
      productCount: 4,
    },
  ]
}

function getFallbackCustomers(): AdminCustomer[] {
  return [
    {
      id: "cust-1",
      email: "amara@example.com",
      fullName: "Amara Williams",
      phone: "+44 20 7946 0958",
      role: "admin",
      createdAt: "1 Jan 2026",
      ordersCount: 4,
    },
    {
      id: "cust-2",
      email: "nadia@example.com",
      fullName: "Nadia Brooks",
      phone: "+44 20 7946 0912",
      role: "customer",
      createdAt: "15 Jan 2026",
      ordersCount: 2,
    },
    {
      id: "cust-3",
      email: "sofia@example.com",
      fullName: "Sofia Chen",
      role: "customer",
      createdAt: "2 Feb 2026",
      ordersCount: 1,
    },
  ]
}

function getFallbackCoupons(): AdminCoupon[] {
  return [
    {
      id: 1,
      code: "WELCOME10",
      discountPercent: 10,
      minSpend: 0,
      maxDiscount: 50,
      isActive: true,
      createdAt: "1 Jan 2026",
    },
    {
      id: 2,
      code: "GLOW15",
      discountPercent: 15,
      minSpend: 40,
      maxDiscount: 60,
      isActive: true,
      createdAt: "15 Jan 2026",
    },
  ]
}
