import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { Product, products } from "../data/products"
import { Database, OrderStatus, PaymentMethod, PaymentStatus, UserRole } from "../types/database"

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

export async function getAdminProducts(): Promise<{
  data: Product[]
  error: Error | null
}> {
  const deletedIds = new Set<number>()
  let storedEdits: Record<string, Partial<AdminProductPayload>> = {}
  if (typeof window !== "undefined") {
    try {
      const ids = JSON.parse(localStorage.getItem("abaz_deleted_product_ids") || "[]")
      if (Array.isArray(ids)) ids.forEach((id: number) => deletedIds.add(id))
      storedEdits = JSON.parse(localStorage.getItem("abaz_custom_product_edits") || "{}")
    } catch {}
  }

  const applyEditsAndFilter = (list: Product[]): Product[] => {
    return list
      .filter((p) => !deletedIds.has(p.id))
      .map((p) => {
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
      registerLocalCreate(fakeProduct)
      return { data: fakeProduct, error: null }
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
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Failed to fetch admin orders from Supabase:", error.message)
      return { data: getFallbackAdminOrders(), error: null }
    }

    if (!data || data.length === 0) {
      return { data: getFallbackAdminOrders(), error: null }
    }

    // Try to get profile emails if possible
    const userIds = Array.from(new Set(data.map((o) => o.user_id).filter(Boolean)))
    const profileMap = new Map<string, { email: string; phone?: string | null }>()
    if (userIds.length > 0) {
      try {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, phone")
          .in("id", userIds)
        if (profs) {
          for (const p of profs) {
            profileMap.set(p.id, { email: p.email, phone: p.phone })
          }
        }
      } catch {
        // Fallback silently if profiles query fails
      }
    }

    const mapped: AdminOrderItem[] = data.map((o) => {
      const createdDate = new Date(o.created_at)
      const formattedDate = createdDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })

      const prof = profileMap.get(o.user_id)
      const customerEmail = prof?.email || (o.shipping_name ? `${o.shipping_name.toLowerCase().replace(/\s+/g, ".")}@example.com` : "customer@example.com")
      const customerPhone = o.shipping_phone || prof?.phone || "+44 20 7946 0912"

      const items: AdminOrderLineItem[] = Array.isArray(o.order_items) && o.order_items.length > 0
        ? o.order_items.map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name || "Luxury Beauty Item",
            productBrand: item.product_brand || "ABAZ MART",
            productImage: item.product_image || "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=80",
            selectedOption: item.selected_option || "Standard",
            unitPrice: Number(item.unit_price) || 0,
            quantity: Number(item.quantity) || 1,
            lineTotal: Number(item.line_total) || (Number(item.unit_price) || 0) * (item.quantity || 1),
          }))
        : [
            {
              id: 1,
              productId: null,
              productName: "Signature Skincare Order",
              productBrand: "ABAZ MART",
              productImage: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=80",
              selectedOption: "Standard",
              unitPrice: Number(o.total),
              quantity: 1,
              lineTotal: Number(o.total),
            },
          ]

      // Check for carrier / tracking info
      let carrier = (o as any).carrier
      let trackingNumber = (o as any).tracking_number
      let trackingUrl = (o as any).tracking_url
      let shippedAt = (o as any).shipped_at

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

      let orderStatus = o.status
      if (typeof window !== "undefined") {
        const storedStatus = localStorage.getItem(`abaz_order_status_${o.id}`) as OrderStatus | null
        if (storedStatus) {
          orderStatus = storedStatus
        }
      }

      return {
        id: o.id,
        orderNumber: o.order_number,
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
        subtotal: Number(o.subtotal) || Number(o.total),
        shipping: Number(o.shipping) || 0,
        tax: Number(o.tax) || 0,
        discount: Number(o.discount) || 0,
        total: Number(o.total),
        status: orderStatus,
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
        trackingUrl: trackingUrl || undefined,
        shippedAt: shippedAt || undefined,
        itemsCount: items.length,
        rawCreatedAt: o.created_at,
        items,
      }
    })

    return { data: mapped, error: null }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load admin orders"
    return { data: getFallbackAdminOrders(), error: new Error(message) }
  }
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
  const localExpedited =
    typeof window !== "undefined"
      ? localStorage.getItem("abaz_expedited_shipping_fee")
      : null
  const defaultExpedited = localExpedited ? parseFloat(localExpedited) : 8.5

  const fallback: AdminStoreSettings = {
    id: 1,
    currency: "GBP",
    currencySymbol: "£",
    shippingFee: 6.0,
    expeditedShippingFee: defaultExpedited,
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

    const fetchedExpedited = (data as any).expedited_shipping_fee

    return {
      data: {
        id: data.id,
        currency: data.currency,
        currencySymbol: data.currency_symbol,
        shippingFee: Number(data.shipping_fee),
        expeditedShippingFee:
          fetchedExpedited !== undefined && fetchedExpedited !== null
            ? Number(fetchedExpedited)
            : defaultExpedited,
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
  if (typeof window !== "undefined" && settings.expeditedShippingFee !== undefined) {
    try {
      localStorage.setItem(
        "abaz_expedited_shipping_fee",
        settings.expeditedShippingFee.toString(),
      )
    } catch {}
  }

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
  const baseList: AdminOrderItem[] = [
    {
      id: "demo-1",
      orderNumber: "ABZ-10842",
      customer: "Amara Williams",
      email: "amara.williams@gmail.com",
      phone: "+44 7700 900142",
      shippingAddress: "42 Kensington High Street",
      shippingCity: "London",
      shippingPostalCode: "W8 4PT",
      shippingCountry: "United Kingdom",
      paymentMethod: "card",
      paymentStatus: "paid",
      date: "18 Feb 2026",
      subtotal: 126.4,
      shipping: 0.0,
      tax: 0.0,
      discount: 0.0,
      total: 126.4,
      status: "Delivered",
      itemsCount: 2,
      rawCreatedAt: "2026-02-18T10:00:00Z",
      items: [
        {
          id: 101,
          productId: 1,
          productName: "Luminous Glow Hydrating Serum",
          productBrand: "Aura Radiance",
          productImage: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80",
          selectedOption: "30ml",
          unitPrice: 68.0,
          quantity: 1,
          lineTotal: 68.0,
        },
        {
          id: 102,
          productId: 2,
          productName: "Velvet Botanical Cleansing Balm",
          productBrand: "Botanica Organics",
          productImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80",
          selectedOption: "100ml",
          unitPrice: 58.4,
          quantity: 1,
          lineTotal: 58.4,
        },
      ],
    },
    {
      id: "demo-2",
      orderNumber: "ABZ-10839",
      customer: "Nadia Brooks",
      email: "nadia.brooks@outlook.com",
      phone: "+44 7700 900881",
      shippingAddress: "18 George Street",
      shippingCity: "Edinburgh",
      shippingPostalCode: "EH2 2PF",
      shippingCountry: "United Kingdom",
      paymentMethod: "bank_transfer",
      paymentStatus: "paid",
      date: "18 Feb 2026",
      subtotal: 84.0,
      shipping: 0.0,
      tax: 0.0,
      discount: 0.0,
      total: 84.0,
      status: "Shipped",
      carrier: "Royal Mail",
      trackingNumber: "GB928471928RM",
      trackingUrl: "https://www.royalmail.com/track-your-item#/tracking-results/GB928471928RM",
      shippedAt: "2026-02-18T11:45:00Z",
      itemsCount: 1,
      rawCreatedAt: "2026-02-18T09:30:00Z",
      items: [
        {
          id: 103,
          productId: 4,
          productName: "Silk Peptide Restorative Night Cream",
          productBrand: "Cellular Glow",
          productImage: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80",
          selectedOption: "50ml",
          unitPrice: 84.0,
          quantity: 1,
          lineTotal: 84.0,
        },
      ],
    },
    {
      id: "demo-3",
      orderNumber: "ABZ-10835",
      customer: "Sofia Chen",
      email: "sofia.chen@icloud.com",
      phone: "+44 7700 900329",
      shippingAddress: "9 Deansgate",
      shippingCity: "Manchester",
      shippingPostalCode: "M3 2AY",
      shippingCountry: "United Kingdom",
      paymentMethod: "paypal",
      paymentStatus: "paid",
      date: "17 Feb 2026",
      subtotal: 152.25,
      shipping: 0.0,
      tax: 0.0,
      discount: 0.0,
      total: 152.25,
      status: "Processing",
      itemsCount: 2,
      rawCreatedAt: "2026-02-17T14:15:00Z",
      items: [
        {
          id: 104,
          productId: 5,
          productName: "Rose Water Balancing Facial Mist",
          productBrand: "Rose Atelier",
          productImage: "https://images.unsplash.com/photo-1608248597359-548d7936a287?auto=format&fit=crop&w=400&q=80",
          selectedOption: "150ml",
          unitPrice: 42.0,
          quantity: 1,
          lineTotal: 42.0,
        },
        {
          id: 105,
          productId: 6,
          productName: "Cellular Renewal Youth Elixir",
          productBrand: "Aura Radiance",
          productImage: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=400&q=80",
          selectedOption: "30ml",
          unitPrice: 110.25,
          quantity: 1,
          lineTotal: 110.25,
        },
      ],
    },
    {
      id: "demo-4",
      orderNumber: "ABZ-10831",
      customer: "Leila Morgan",
      email: "leila.morgan@gmail.com",
      phone: "+44 7700 900512",
      shippingAddress: "27 Queen Square",
      shippingCity: "Bath",
      shippingPostalCode: "BA1 2HX",
      shippingCountry: "United Kingdom",
      paymentMethod: "card",
      paymentStatus: "pending",
      date: "17 Feb 2026",
      subtotal: 61.5,
      shipping: 6.0,
      tax: 0.0,
      discount: 0.0,
      total: 67.5,
      status: "Pending",
      itemsCount: 1,
      rawCreatedAt: "2026-02-17T11:00:00Z",
      items: [
        {
          id: 106,
          productId: 3,
          productName: "Golden Marula Nourishing Face Oil",
          productBrand: "Botanica Organics",
          productImage: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=80",
          selectedOption: "30ml",
          unitPrice: 61.5,
          quantity: 1,
          lineTotal: 61.5,
        },
      ],
    },
    {
      id: "demo-5",
      orderNumber: "ABZ-10828",
      customer: "Maya Roberts",
      email: "maya.roberts@gmail.com",
      phone: "+44 7700 900741",
      shippingAddress: "15 Park Row",
      shippingCity: "Leeds",
      shippingPostalCode: "LS1 5HD",
      shippingCountry: "United Kingdom",
      paymentMethod: "card",
      paymentStatus: "refunded",
      date: "16 Feb 2026",
      subtotal: 91.0,
      shipping: 0.0,
      tax: 0.0,
      discount: 0.0,
      total: 91.0,
      status: "Cancelled",
      itemsCount: 1,
      rawCreatedAt: "2026-02-16T16:45:00Z",
      items: [
        {
          id: 107,
          productId: 7,
          productName: "Diamond Infused Brightening Cream",
          productBrand: "Cellular Glow",
          productImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80",
          selectedOption: "50ml",
          unitPrice: 91.0,
          quantity: 1,
          lineTotal: 91.0,
        },
      ],
    },
    {
      id: "demo-6",
      orderNumber: "ABZ-10824",
      customer: "Olivia Kim",
      email: "olivia.kim@yahoo.co.uk",
      phone: "+44 7700 900693",
      shippingAddress: "73 King Street",
      shippingCity: "Bristol",
      shippingPostalCode: "BS1 4LE",
      shippingCountry: "United Kingdom",
      paymentMethod: "card",
      paymentStatus: "paid",
      date: "16 Feb 2026",
      subtotal: 220.8,
      shipping: 0.0,
      tax: 0.0,
      discount: 15.0,
      total: 205.8,
      status: "Delivered",
      itemsCount: 3,
      rawCreatedAt: "2026-02-16T08:20:00Z",
      items: [
        {
          id: 108,
          productId: 1,
          productName: "Luminous Glow Hydrating Serum",
          productBrand: "Aura Radiance",
          productImage: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80",
          selectedOption: "30ml",
          unitPrice: 68.0,
          quantity: 1,
          lineTotal: 68.0,
        },
        {
          id: 109,
          productId: 2,
          productName: "Velvet Botanical Cleansing Balm",
          productBrand: "Botanica Organics",
          productImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80",
          selectedOption: "100ml",
          unitPrice: 58.4,
          quantity: 1,
          lineTotal: 58.4,
        },
        {
          id: 110,
          productId: 8,
          productName: "Pure Moroccan Argan Hair Elixir",
          productBrand: "Rose Atelier",
          productImage: "https://images.unsplash.com/photo-1608248597359-548d7936a287?auto=format&fit=crop&w=400&q=80",
          selectedOption: "100ml",
          unitPrice: 94.4,
          quantity: 1,
          lineTotal: 94.4,
        },
      ],
    },
  ]

  return baseList.map((o) => {
    let orderStatus = o.status
    let carrier = o.carrier
    let trackingNumber = o.trackingNumber
    let trackingUrl = o.trackingUrl
    let shippedAt = o.shippedAt

    if (typeof window !== "undefined") {
      const storedStatus = localStorage.getItem(`abaz_order_status_${o.id}`) as OrderStatus | null
      if (storedStatus) orderStatus = storedStatus

      const storedTrack = localStorage.getItem(`abaz_order_tracking_${o.id}`)
      if (storedTrack) {
        try {
          const parsed = JSON.parse(storedTrack)
          if (parsed.carrier) carrier = parsed.carrier
          if (parsed.trackingNumber) trackingNumber = parsed.trackingNumber
          if (parsed.trackingUrl) trackingUrl = parsed.trackingUrl
          if (parsed.shippedAt) shippedAt = parsed.shippedAt
        } catch {}
      }
    }

    return {
      ...o,
      status: orderStatus,
      carrier,
      trackingNumber,
      trackingUrl,
      shippedAt,
    }
  })
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
