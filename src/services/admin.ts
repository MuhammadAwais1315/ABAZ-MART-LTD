import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { Product, products } from "../data/products"
import { Database, OrderStatus } from "../types/database"

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

const CATEGORY_ID_MAP: Record<string, number> = {
  Skincare: 1,
  Makeup: 2,
  Haircare: 3,
  Fragrance: 4,
  "Body Care": 5,
}

/**
 * Fetch all products for the admin panel.
 */
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
      reviewsCount: item.review_count || 0,
      description: item.description,
      image: item.image,
      images: item.additional_images && item.additional_images.length > 0
        ? [item.image, ...item.additional_images]
        : [item.image],
      options: item.options && item.options.length > 0 ? item.options : ["Standard"],
      badge: item.badge || undefined,
      stock: item.stock,
      skinType: item.skin_types && item.skin_types.length > 0 ? item.skin_types : ["All"],
      ingredients: item.ingredients ? [item.ingredients] : ["Sustainably sourced botanical extracts"],
      howToUse: item.how_to_use ? [item.how_to_use] : ["Apply to clean skin as needed."],
    }))

    return { data: mapped, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load products"
    return { data: products, error: new Error(message) }
  }
}

/**
 * Create a new product in Supabase.
 */
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
      reviewsCount: 0,
      description: payload.description,
      image: payload.image,
      images: [payload.image, ...(payload.additionalImages || [])],
      options: payload.options.length > 0 ? payload.options : ["Standard"],
      badge: payload.badge || undefined,
      stock: payload.stock,
      skinType: payload.skinTypes || ["All"],
      ingredients: ["Clean botanical ingredients"],
      howToUse: ["Apply as directed"],
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
      reviewsCount: data.review_count,
      description: data.description,
      image: data.image,
      images: [data.image, ...(data.additional_images || [])],
      options: data.options,
      badge: data.badge || undefined,
      stock: data.stock,
      skinType: data.skin_types || ["All"],
      ingredients: data.ingredients ? [data.ingredients] : [],
      howToUse: data.how_to_use ? [data.how_to_use] : [],
    }

    return { data: created, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create product"
    return { data: null, error: new Error(message) }
  }
}

/**
 * Update an existing product in Supabase.
 */
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
    if (payload.description !== undefined) updates.description = payload.description
    if (payload.options !== undefined) updates.options = payload.options
    if (payload.image !== undefined) updates.image = payload.image
    if (payload.additionalImages !== undefined) updates.additional_images = payload.additionalImages
    if (payload.badge !== undefined) updates.badge = payload.badge
    if (payload.skinTypes !== undefined) updates.skin_types = payload.skinTypes

    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)

    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update product"
    return { error: new Error(message) }
  }
}

/**
 * Delete a product from Supabase.
 */
export async function deleteAdminProduct(id: number): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: null }
  }

  try {
    const { error } = await supabase.from("products").delete().eq("id", id)
    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete product"
    return { error: new Error(message) }
  }
}

/**
 * Upload a product image to Supabase Storage bucket 'product-images'.
 */
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

    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath)
    return { url: data.publicUrl, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload image"
    return { url: null, error: new Error(message) }
  }
}

/**
 * Fetch all orders for admin fulfillment view.
 */
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
    const message = err instanceof Error ? err.message : "Failed to load admin orders"
    return { data: getFallbackAdminOrders(), error: new Error(message) }
  }
}

/**
 * Update order fulfillment status.
 */
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
    const message = err instanceof Error ? err.message : "Failed to update order status"
    return { error: new Error(message) }
  }
}

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
