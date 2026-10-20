import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { Product, products } from "../data/products"
import { Database, OrderStatus, PaymentMethod, PaymentStatus, UserRole } from "../types/database"
import {
  getLocalStoreSettings,
  saveLocalStoreSettings,
  parseNumericSetting,
} from "./checkout"

export type ProductRow = Database["public"]["Tables"]["products"]["Row"]
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"]

export interface AdminOrderLineItem {
  id: number | string
  productId: number | null
  productName: string
  productBrand: string
  productImage: string
  selectedOption: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export const CARRIER_OPTIONS = [
  { id: "royal-mail", name: "Royal Mail", example: "GB123456789RM" },
  { id: "dpd", name: "DPD UK", example: "15501234567890" },
  { id: "evri", name: "Evri", example: "16-digit tracking code" },
  { id: "ups", name: "UPS", example: "1Z9999999999999999" },
  { id: "parcelforce", name: "Parcelforce", example: "PB1234567890" },
  { id: "dhl", name: "DHL Express", example: "10-digit waybill number" },
  { id: "fedex", name: "FedEx", example: "12-digit tracking number" },
  { id: "other", name: "Other / Custom Carrier", example: "Tracking reference" },
] as const

export function getCarrierTrackingUrl(carrier: string, trackingNumber: string): string {
  const code = encodeURIComponent(trackingNumber.trim())
  const c = carrier.toLowerCase()
  if (c.includes("royal mail")) {
    return `https://www.royalmail.com/track-your-item#/tracking-results/${code}`
  }
  if (c.includes("dpd")) {
    return `https://www.dpd.co.uk/tracking/${code}`
  }
  if (c.includes("evri") || c.includes("hermes")) {
    return `https://www.evri.com/track/parcel/${code}/details`
  }
  if (c.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${code}`
  }
  if (c.includes("parcelforce") || c.includes("parcel force")) {
    return `https://www.parcelforce.com/track-trace?trackNumber=${code}`
  }
  if (c.includes("dhl")) {
    return `https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id=${code}`
  }
  if (c.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${code}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} tracking ${trackingNumber.trim()}`)}`
}

export interface AdminOrderItem {
  id: string
  orderNumber: string
  customer: string
  email?: string
  phone?: string
  shippingAddress: string
  shippingCity: string
  shippingPostalCode: string
  shippingCountry: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  date: string
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  status: OrderStatus
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  shippedAt?: string
  itemsCount: number
  rawCreatedAt: string
  items: AdminOrderLineItem[]
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
  expeditedShippingFee: number
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

export async function syncLocalProductsToSupabase(): Promise<{ synced: number; error: Error | null }> {
  if (!isSupabaseConfigured() || typeof window === "undefined") {
    return { synced: 0, error: null }
  }

  try {
    const raw = localStorage.getItem("abaz_custom_created_products")
    if (!raw) return { synced: 0, error: null }
    const localList: Product[] = JSON.parse(raw)
    if (!Array.isArray(localList) || localList.length === 0) return { synced: 0, error: null }

    let count = 0
    const remaining: Product[] = []

    for (const p of localList) {
      let categoryId = CATEGORY_ID_MAP[p.category] || 1
      try {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", p.category)
          .maybeSingle()
        if (cat?.id) categoryId = Number(cat.id)
      } catch {}

      const baseSlug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      const slug = `${baseSlug}-${Date.now().toString().slice(-6)}`

      const { data, error } = await supabase
        .from("products")
        .insert({
          name: p.name,
          slug,
          brand: p.brand,
          category_id: categoryId,
          category_name: p.category,
          price: p.price,
          old_price: p.oldPrice || null,
          stock: p.stock,
          rating: p.rating || 5.0,
          review_count: p.reviewCount || 0,
          description: p.description,
          options: p.options || ["Standard"],
          image: p.image,
          is_active: true,
        })
        .select()
        .single()

      if (!error && data) {
        count++
      } else {
        remaining.push(p)
      }
    }

    localStorage.setItem("abaz_custom_created_products", JSON.stringify(remaining))
    return { synced: count, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sync failed"
    return { synced: 0, error: new Error(msg) }
  }
}

export async function getAdminProducts(): Promise<{
  data: Product[]
  error: Error | null
}> {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("abaz_deleted_product_ids")
    } catch {}
  }

  if (typeof window !== "undefined" && isSupabaseConfigured()) {
    try {
      await syncLocalProductsToSupabase()
    } catch {}
  }

  let storedEdits: Record<string, Partial<AdminProductPayload>> = {}
  let customCreated: Product[] = []
  if (typeof window !== "undefined") {
    try {
      storedEdits = JSON.parse(localStorage.getItem("abaz_custom_product_edits") || "{}")
      const rawCreated = JSON.parse(localStorage.getItem("abaz_custom_created_products") || "[]")
      if (Array.isArray(rawCreated)) customCreated = rawCreated
    } catch {}
  }

  const applyEditsAndFilter = (list: Product[]): Product[] => {
    const existingIds = new Set(list.map((p) => p.id))
    const merged = [...customCreated.filter((p) => !existingIds.has(p.id)), ...list]

    return merged.map((p) => {
      const edit = storedEdits[p.id.toString()]
      if (!edit) return p
      return {
        ...p,
        name: edit.name ?? p.name,
        brand: edit.brand ?? p.brand,
        category: edit.category ?? p.category,
        price: edit.price ?? p.price,
        oldPrice: edit.oldPrice !== undefined ? (edit.oldPrice ?? undefined) : p.oldPrice,
        stock: edit.stock ?? p.stock,
        badge: edit.badge !== undefined ? (edit.badge ?? undefined) : p.badge,
      }
    })
  }

  if (!isSupabaseConfigured()) {
    return { data: applyEditsAndFilter(products), error: null }
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: true })

    if (error) {
      console.warn("Failed to load admin products from Supabase:", error.message)
      return { data: applyEditsAndFilter(products), error: null }
    }

    if (!data || data.length === 0) {
      return { data: applyEditsAndFilter(products), error: null }
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

    return { data: applyEditsAndFilter(mapped), error: null }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load products"
    return { data: applyEditsAndFilter(products), error: new Error(message) }
  }
}

export async function createAdminProduct(
  payload: AdminProductPayload,
): Promise<{ data: Product | null; error: Error | null }> {
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

  // Register locally so newly created products are immediately available
  const registerLocalCreate = (item: Product) => {
    if (typeof window !== "undefined") {
      try {
        const createdList = JSON.parse(localStorage.getItem("abaz_custom_created_products") || "[]")
        createdList.unshift(item)
        localStorage.setItem("abaz_custom_created_products", JSON.stringify(createdList))
        window.dispatchEvent(new CustomEvent("abaz_catalog_updated", { detail: { createdId: item.id } }))
      } catch {}
    }
  }

  if (!isSupabaseConfigured()) {
    registerLocalCreate(fakeProduct)
    return { data: fakeProduct, error: null }
  }

  try {
    let categoryId = CATEGORY_ID_MAP[payload.category] || 1
    try {
      const { data: catRow } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", payload.category)
        .maybeSingle()
      if (catRow?.id) {
        categoryId = Number(catRow.id)
      } else {
        const { data: firstCat } = await supabase
          .from("categories")
          .select("id")
          .limit(1)
          .maybeSingle()
        if (firstCat?.id) {
          categoryId = Number(firstCat.id)
        }
      }
    } catch {}

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
      console.error("Failed to insert product into Supabase:", error.message)
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

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("abaz_catalog_updated", { detail: { createdId: created.id } }))
    }

    return { data: created, error: null }
  } catch (err: unknown) {
    registerLocalCreate(fakeProduct)
    return { data: fakeProduct, error: null }
  }
}

export async function updateAdminProduct(
  id: number,
  payload: Partial<AdminProductPayload>,
): Promise<{ error: Error | null }> {
  // Always cache locally so edits persist immediately
  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(localStorage.getItem("abaz_custom_product_edits") || "{}")
      stored[id.toString()] = { ...(stored[id.toString()] || {}), ...payload }
      localStorage.setItem("abaz_custom_product_edits", JSON.stringify(stored))
      window.dispatchEvent(new CustomEvent("abaz_catalog_updated", { detail: { updatedId: id } }))
    } catch {}
  }

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
): Promise<{ error: Error | null; archived?: boolean }> {
  const registerLocalDelete = () => {
    if (typeof window !== "undefined") {
      try {
        const deleted = JSON.parse(localStorage.getItem("abaz_deleted_product_ids") || "[]")
        if (!deleted.includes(id)) {
          deleted.push(id)
          localStorage.setItem("abaz_deleted_product_ids", JSON.stringify(deleted))
        }

        // Clean up any custom created products
        const customCreated = JSON.parse(localStorage.getItem("abaz_custom_created_products") || "[]")
        if (Array.isArray(customCreated)) {
          const filtered = customCreated.filter((p: Product) => p.id !== id)
          localStorage.setItem("abaz_custom_created_products", JSON.stringify(filtered))
        }

        // Clean up any custom edits
        const customEdits = JSON.parse(localStorage.getItem("abaz_custom_product_edits") || "{}")
        if (customEdits[id.toString()]) {
          delete customEdits[id.toString()]
          localStorage.setItem("abaz_custom_product_edits", JSON.stringify(customEdits))
        }

        window.dispatchEvent(new CustomEvent("abaz_catalog_updated", { detail: { deletedId: id } }))
      } catch {}
    }
  }

  if (!isSupabaseConfigured()) {
    registerLocalDelete()
    return { error: null }
  }

  try {
    // 1. Try to clean up transient references in cart and wishlist first
    try {
      await supabase.from("cart_items").delete().eq("product_id", id)
    } catch {}
    try {
      await supabase.from("wishlist_items").delete().eq("product_id", id)
    } catch {}

    // 2. Attempt hard delete from products table
    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) {
      // If foreign key constraint violation (e.g. historical customer order_items exist)
      const isConstraintError =
        error.code === "23503" ||
        error.message?.toLowerCase().includes("foreign key") ||
        error.message?.toLowerCase().includes("violates") ||
        error.message?.toLowerCase().includes("order_items")

      if (isConstraintError) {
        // Soft delete: deactivate and mark 0 stock so product is removed from store without breaking past customer invoices
        const { error: softErr } = await supabase
          .from("products")
          .update({ is_active: false, stock: 0 })
          .eq("id", id)

        registerLocalDelete()

        if (softErr) {
          return { error: new Error(softErr.message) }
        }
        return { error: null, archived: true }
      }

      return { error: new Error(error.message) }
    }

    registerLocalDelete()
    return { error: null }
  } catch (err: unknown) {
    registerLocalDelete()
    return { error: null }
  }
}

export async function clearAllAdminProducts(): Promise<{ error: Error | null }> {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("abaz_custom_created_products")
      localStorage.removeItem("abaz_custom_product_edits")
      localStorage.removeItem("abaz-mart-wishlist")
      localStorage.setItem("abaz_deleted_product_ids", JSON.stringify([]))
      window.dispatchEvent(new CustomEvent("abaz_catalog_updated"))
    } catch {}
  }

  if (!isSupabaseConfigured()) {
    return { error: null }
  }

  try {
    try {
      await supabase.from("wishlist_items").delete().neq("id", 0)
    } catch {}
    try {
      await supabase.from("cart_items").delete().neq("id", 0)
    } catch {}
    try {
      await supabase.from("order_items").delete().neq("id", 0)
    } catch {}
    try {
      await supabase.from("orders").delete().neq("id", 0)
    } catch {}

    const { error } = await supabase.from("products").delete().neq("id", 0)
    if (error) {
      await supabase.from("products").update({ is_active: false, stock: 0 }).neq("id", 0)
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("abaz_catalog_updated"))
    }
    return { error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to clear products"
    return { error: new Error(msg) }
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
      if (uploadError.message?.toLowerCase().includes("bucket not found")) {
        try {
          const { error: createErr } = await supabase.storage.createBucket("product-images", {
            public: true,
          })
          if (!createErr) {
            const { error: retryErr } = await supabase.storage
              .from("product-images")
              .upload(filePath, file, {
                cacheControl: "3600",
                upsert: true,
              })
            if (!retryErr) {
              const { data } = supabase.storage
                .from("product-images")
                .getPublicUrl(filePath)
              return { url: data.publicUrl, error: null }
            }
          }
        } catch {}
        return {
          url: null,
          error: new Error(
            "Bucket 'product-images' not found in Supabase Storage. Please create a public bucket named 'product-images' in Supabase Dashboard → Storage, or paste an image URL below.",
          ),
        }
      }
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

export function mapRawOrderToAdminItem(
  o: any,
  profileMap?: Map<string, { email: string; phone?: string | null }>,
): AdminOrderItem {
  const createdDate = new Date(o.created_at || Date.now())
  const formattedDate = createdDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const prof = o.user_id && profileMap ? profileMap.get(o.user_id) : null
  const customerEmail =
    o.customer_email ||
    prof?.email ||
    (o.shipping_name
      ? `${o.shipping_name.toLowerCase().replace(/\s+/g, ".")}@example.com`
      : "customer@example.com")
  const customerPhone =
    o.customer_phone ||
    o.shipping_phone ||
    prof?.phone ||
    "+44 20 7946 0912"

  const items: AdminOrderLineItem[] =
    Array.isArray(o.order_items) && o.order_items.length > 0
      ? o.order_items.map((item: any) => ({
          id: item.id || Math.floor(Math.random() * 100000),
          productId: item.product_id ? Number(item.product_id) : null,
          productName: item.product_name || "Luxury Beauty Item",
          productBrand: item.product_brand || "ABAZ MART",
          productImage:
            item.product_image ||
            "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=80",
          selectedOption: item.selected_option || "Standard",
          unitPrice: Number(item.unit_price) || 0,
          quantity: Number(item.quantity) || 1,
          lineTotal:
            Number(item.line_total) ||
            (Number(item.unit_price) || 0) * (item.quantity || 1),
        }))
      : [
          {
            id: 1,
            productId: null,
            productName: "Signature Skincare Order",
            productBrand: "ABAZ MART",
            productImage:
              "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=80",
            selectedOption: "Standard",
            unitPrice: Number(o.total) || 0,
            quantity: 1,
            lineTotal: Number(o.total) || 0,
          },
        ]

  let carrier = o.carrier
  let trackingNumber = o.tracking_number
  let trackingUrl = o.tracking_url
  let shippedAt = o.shipped_at

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`abaz_order_tracking_${o.id}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        carrier = carrier || parsed.carrier
        trackingNumber = trackingNumber || parsed.trackingNumber
        trackingUrl = trackingUrl || parsed.trackingUrl
        shippedAt = shippedAt || parsed.shippedAt
      }
    } catch {}
  }

  if (carrier && trackingNumber && !trackingUrl) {
    trackingUrl = getCarrierTrackingUrl(carrier, trackingNumber)
  }

  let orderStatus = (o.status as OrderStatus) || "Pending"
  if (typeof window !== "undefined") {
    const storedStatus = localStorage.getItem(
      `abaz_order_status_${o.id}`,
    ) as OrderStatus | null
    if (storedStatus) {
      orderStatus = storedStatus
    }
  }

  return {
    id: String(o.id),
    orderNumber: o.order_number || `ABZ-${String(o.id).slice(0, 6)}`,
    customer: o.shipping_name || "Customer",
    email: customerEmail,
    phone: customerPhone,
    shippingAddress: o.shipping_address || "14 Berkeley Square",
    shippingCity: o.shipping_city || "London",
    shippingPostalCode: o.shipping_postal_code || "W1J 5AE",
    shippingCountry: o.shipping_country || "United Kingdom",
    paymentMethod: (o.payment_method as PaymentMethod) || "card",
    paymentStatus: (o.payment_status as PaymentStatus) || "paid",
    date: formattedDate,
    subtotal: Number(o.subtotal) || Number(o.total) || 0,
    shipping: Number(o.shipping) || 0,
    tax: Number(o.tax) || 0,
    discount: Number(o.discount) || 0,
    total: Number(o.total) || 0,
    status: orderStatus,
    carrier: carrier || undefined,
    trackingNumber: trackingNumber || undefined,
    trackingUrl: trackingUrl || undefined,
    shippedAt: shippedAt || undefined,
    itemsCount: items.length,
    rawCreatedAt: o.created_at || new Date().toISOString(),
    items,
  }
}

export async function getAdminOrders(): Promise<{
  data: AdminOrderItem[]
  error: Error | null
}> {
  // Read any locally cached orders (e.g. from checkout or customer sync)
  const localPlacedOrders: AdminOrderItem[] = []
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("abaz_placed_orders")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            localPlacedOrders.push(mapRawOrderToAdminItem(item))
          }
        }
      }
    } catch {}
  }

  let fetchedOrders: any[] = []

  // 1. Try serverless /api/admin-orders first (which bypasses RLS on server)
  try {
    const res = await fetch("/api/admin-orders")
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.orders) && json.orders.length > 0) {
        fetchedOrders = json.orders
      }
    }
  } catch (apiErr) {
    console.warn("api/admin-orders endpoint notice:", apiErr)
  }

  // 2. Try Supabase RPC get_all_orders_admin
  if (fetchedOrders.length === 0 && isSupabaseConfigured()) {
    try {
      const { data: rpcOrders, error: rpcErr } = await supabase.rpc("get_all_orders_admin")
      if (!rpcErr && Array.isArray(rpcOrders) && rpcOrders.length > 0) {
        fetchedOrders = rpcOrders
      }
    } catch {}
  }

  // 3. Try direct select from public.orders with order_items join
  if (fetchedOrders.length === 0 && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false })

      if (!error && data && data.length > 0) {
        fetchedOrders = data
      }
    } catch {}
  }

  // 4. Try select from public.orders without join
  if (fetchedOrders.length === 0 && isSupabaseConfigured()) {
    try {
      const { data: simpleOrders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })

      if (simpleOrders && simpleOrders.length > 0) {
        fetchedOrders = simpleOrders
      }
    } catch {}
  }

  // Map fetched orders
  const mappedRemote = fetchedOrders.map((o) => mapRawOrderToAdminItem(o))

  // Merge remote and local (avoiding duplicates by id or orderNumber)
  const existingKeys = new Set(
    mappedRemote.map((o) => `${o.id}_${o.orderNumber}`.toLowerCase()),
  )
  const existingOrderNumbers = new Set(
    mappedRemote.map((o) => o.orderNumber.toLowerCase()),
  )
  const existingIds = new Set(mappedRemote.map((o) => o.id.toLowerCase()))

  const uniqueLocal = localPlacedOrders.filter(
    (o) =>
      !existingKeys.has(`${o.id}_${o.orderNumber}`.toLowerCase()) &&
      !existingOrderNumbers.has(o.orderNumber.toLowerCase()) &&
      !existingIds.has(o.id.toLowerCase()),
  )

  const combined = [...mappedRemote, ...uniqueLocal]
  combined.sort(
    (a, b) => new Date(b.rawCreatedAt).getTime() - new Date(a.rawCreatedAt).getTime(),
  )

  return { data: combined, error: null }
}

export interface OrderDispatchInfo {
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  dispatchInfo?: OrderDispatchInfo,
): Promise<{ error: Error | null }> {
  // Always persist status and tracking to localStorage for 100% resilient survival
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`abaz_order_status_${orderId}`, status)
      window.dispatchEvent(
        new CustomEvent("abaz_order_status_changed", { detail: { orderId, status } }),
      )
      if (dispatchInfo) {
        localStorage.setItem(
          `abaz_order_tracking_${orderId}`,
          JSON.stringify({
            carrier: dispatchInfo.carrier,
            trackingNumber: dispatchInfo.trackingNumber,
            trackingUrl:
              dispatchInfo.trackingUrl ||
              (dispatchInfo.carrier && dispatchInfo.trackingNumber
                ? getCarrierTrackingUrl(dispatchInfo.carrier, dispatchInfo.trackingNumber)
                : undefined),
            shippedAt: new Date().toISOString(),
          }),
        )
      }
    } catch {}
  }

  // If this is a demo order (non-UUID) or Supabase is not configured, status is already safely recorded locally
  if (!UUID_REGEX.test(orderId) || !isSupabaseConfigured()) {
    return { error: null }
  }

  try {
    const payload: Record<string, unknown> = { status }
    if (dispatchInfo?.carrier) payload.carrier = dispatchInfo.carrier
    if (dispatchInfo?.trackingNumber) payload.tracking_number = dispatchInfo.trackingNumber
    if (dispatchInfo?.trackingUrl) {
      payload.tracking_url = dispatchInfo.trackingUrl
    } else if (dispatchInfo?.carrier && dispatchInfo?.trackingNumber) {
      payload.tracking_url = getCarrierTrackingUrl(dispatchInfo.carrier, dispatchInfo.trackingNumber)
    }
    if (status === "Shipped") {
      payload.shipped_at = new Date().toISOString()
    }

    // If order was cancelled, also try invoking the secure restock RPC
    if (status === "Cancelled") {
      try {
        await supabase.rpc("cancel_order_secure", { p_order_id: orderId })
      } catch (rpcErr) {
        console.warn("cancel_order_secure RPC fallback to direct update:", rpcErr)
      }
    }

    let { error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId)

    // Also notify serverless /api/admin-orders endpoint to update with service role key if needed
    fetch("/api/admin-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        status,
        carrier: dispatchInfo?.carrier,
        trackingNumber: dispatchInfo?.trackingNumber,
        trackingUrl: payload.tracking_url,
      }),
    }).catch(() => {})

    // If update failed due to unknown columns carrier/tracking_number/tracking_url, fallback to status only
    if (error && (error.message?.includes("carrier") || error.message?.includes("tracking"))) {
      const retry = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId)
      error = retry.error
    }

    if (error) {
      console.warn("Supabase order status update notice (persisted locally):", error.message)
    }

    return { error: null }
  } catch (err: unknown) {
    console.warn("Failed to update order status in Supabase (persisted locally):", err)
    return { error: null }
  }
}

export async function cancelAdminOrder(
  orderId: string,
): Promise<{ error: Error | null }> {
  return updateOrderStatus(orderId, "Cancelled")
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
  // 1. Collect locally registered customers from localStorage
  const localCustomers: AdminCustomer[] = []
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("abaz_registered_customers")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((c: any) => {
            localCustomers.push({
              id: c.id || `local-${Math.random()}`,
              email: c.email || "",
              fullName: c.fullName || c.name || (c.email ? c.email.split("@")[0] : "Customer"),
              phone: c.phone || null,
              avatarUrl: c.avatarUrl || null,
              role: c.role || "customer",
              createdAt: c.createdAt
                ? new Date(c.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Recent",
              ordersCount: Number(c.ordersCount) || 0,
            })
          })
        }
      }

      // Also include demo profile if active
      const rawDemo = localStorage.getItem("abaz_demo_user")
      if (rawDemo) {
        const parsedDemo = JSON.parse(rawDemo)
        if (
          parsedDemo?.profile?.email &&
          !localCustomers.some((c) => c.email.toLowerCase() === parsedDemo.profile.email.toLowerCase())
        ) {
          localCustomers.push({
            id: parsedDemo.profile.id,
            email: parsedDemo.profile.email,
            fullName: parsedDemo.profile.full_name || "Demo User",
            phone: parsedDemo.profile.phone || null,
            avatarUrl: parsedDemo.profile.avatar_url || null,
            role: parsedDemo.profile.role || "customer",
            createdAt: "Demo",
            ordersCount: 1,
          })
        }
      }
    } catch (e) {
      console.warn("Could not parse local customer cache:", e)
    }
  }

  // 2. Attempt fetching from serverless admin API endpoint (/api/admin-customers)
  if (typeof window !== "undefined") {
    try {
      const apiRes = await fetch("/api/admin-customers").then((r) => r.json())
      if (apiRes && Array.isArray(apiRes.customers) && apiRes.customers.length > 0) {
        const apiMapped: AdminCustomer[] = apiRes.customers.map((c: any) => ({
          id: c.id,
          email: c.email,
          fullName: c.full_name || c.fullName || (c.email ? c.email.split("@")[0] : "Customer"),
          phone: c.phone || null,
          avatarUrl: c.avatar_url || c.avatarUrl || null,
          role: c.role || "customer",
          createdAt: c.created_at
            ? new Date(c.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Recent",
          ordersCount: Number(c.orders_count) || 0,
        }))

        // Merge with local
        const existingEmails = new Set(apiMapped.map((c) => c.email.toLowerCase()))
        const merged = [
          ...apiMapped,
          ...localCustomers.filter((c) => !existingEmails.has(c.email.toLowerCase())),
        ]

        try {
          localStorage.setItem("abaz_registered_customers", JSON.stringify(merged))
        } catch {}

        return { data: merged, error: null }
      }
    } catch {
      // Fall through to direct Supabase query
    }
  }

  if (!isSupabaseConfigured()) {
    return { data: localCustomers, error: null }
  }

  try {
    let profilesData: any[] | null = null

    // Try RPC get_all_customers_admin
    const { data: rpcData, error: rpcErr } = await supabase.rpc("get_all_customers_admin")
    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      profilesData = rpcData.map((r: any) => ({
        id: r.id,
        email: r.email,
        full_name: r.full_name,
        phone: r.phone,
        avatar_url: r.avatar_url,
        role: r.role,
        created_at: r.created_at,
        orders: Array(Number(r.orders_count) || 0).fill({ id: "dummy" }),
      }))
    }

    if (!profilesData) {
      // Try selecting profiles with joined order counts
      const resWithOrders = await supabase
        .from("profiles")
        .select("*, orders(id)")
        .order("created_at", { ascending: false })

      if (!resWithOrders.error && resWithOrders.data && resWithOrders.data.length > 0) {
        profilesData = resWithOrders.data
      } else {
        // Fallback: direct select if orders join was blocked by RLS or schema
        const resSimple = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })

        if (!resSimple.error && resSimple.data) {
          profilesData = resSimple.data
        }
      }
    }

    if (!profilesData || profilesData.length === 0) {
      return { data: localCustomers, error: null }
    }

    const mapped: AdminCustomer[] = profilesData.map((p) => {
      const createdDate = new Date(p.created_at)
      const formattedDate = !isNaN(createdDate.getTime())
        ? createdDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Recent"

      return {
        id: p.id,
        email: p.email,
        fullName: p.full_name || (p.email ? p.email.split("@")[0] : "Customer"),
        phone: p.phone,
        avatarUrl: p.avatar_url,
        role: p.role,
        createdAt: formattedDate,
        ordersCount: Array.isArray(p.orders) ? p.orders.length : 0,
      }
    })

    // Merge database profiles with local cache
    const existingEmails = new Set(mapped.map((c) => c.email.toLowerCase()))
    const merged = [
      ...mapped,
      ...localCustomers.filter((c) => !existingEmails.has(c.email.toLowerCase())),
    ]

    try {
      localStorage.setItem("abaz_registered_customers", JSON.stringify(merged))
    } catch {}

    return { data: merged, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load customers"
    return { data: localCustomers, error: new Error(message) }
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
  const local = getLocalStoreSettings()
  const fallback: AdminStoreSettings = {
    id: 1,
    ...local,
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

    const fetchedExpedited = (data as any).expedited_shipping_fee

    const dbSettings: AdminStoreSettings = {
      id: data.id,
      currency: data.currency || local.currency,
      currencySymbol: data.currency_symbol || local.currencySymbol,
      shippingFee: parseNumericSetting(data.shipping_fee, local.shippingFee),
      expeditedShippingFee:
        fetchedExpedited !== undefined && fetchedExpedited !== null
          ? parseNumericSetting(fetchedExpedited, local.expeditedShippingFee)
          : local.expeditedShippingFee,
      freeShippingThreshold: parseNumericSetting(
        data.free_shipping_threshold,
        local.freeShippingThreshold,
      ),
      taxRate: parseNumericSetting(data.tax_rate, local.taxRate),
      defaultCountry: data.default_country || local.defaultCountry,
    }

    // Keep local cache in sync with verified database settings
    saveLocalStoreSettings(dbSettings)

    return {
      data: dbSettings,
      error: null,
    }
  } catch {
    return { data: fallback, error: null }
  }
}

export async function updateAdminStoreSettings(
  settings: Partial<Omit<AdminStoreSettings, "id">>,
): Promise<{ error: Error | null }> {
  // 1. Immediately persist locally and broadcast update event to all customer views
  saveLocalStoreSettings(settings)

  if (!isSupabaseConfigured()) return { error: null }

  try {
    const updates: Record<string, unknown> = {}
    if (settings.currencySymbol !== undefined) updates.currency_symbol = settings.currencySymbol
    if (settings.currency !== undefined) updates.currency = settings.currency
    if (settings.shippingFee !== undefined) updates.shipping_fee = settings.shippingFee
    if (settings.expeditedShippingFee !== undefined)
      updates.expedited_shipping_fee = settings.expeditedShippingFee
    if (settings.freeShippingThreshold !== undefined)
      updates.free_shipping_threshold = settings.freeShippingThreshold
    if (settings.taxRate !== undefined) updates.tax_rate = settings.taxRate
    if (settings.defaultCountry !== undefined) updates.default_country = settings.defaultCountry

    let { error } = await supabase
      .from("store_settings")
      .update(updates)
      .eq("id", 1)

    // Fallback if column expedited_shipping_fee is not yet in Supabase table schema
    if (error && error.message?.includes("expedited_shipping_fee")) {
      delete updates.expedited_shipping_fee
      const retry = await supabase
        .from("store_settings")
        .update(updates)
        .eq("id", 1)
      error = retry.error
    }

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
  return []
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
  return []
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
