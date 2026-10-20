import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { Database } from "../types/database"
import {
  categories as defaultCategories,
  Product,
  products as defaultProducts,
} from "../data/products"

export type ProductRow = Database["public"]["Tables"]["products"]["Row"]
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"]
export type BrandRow = Database["public"]["Tables"]["brands"]["Row"]
export type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"]

export interface ProductQueryParams {
  category?: string
  categories?: string[]
  brands?: string[]
  skinTypes?: string[]
  query?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStockOnly?: boolean
  sort?: "featured" | "price-asc" | "price-desc" | "rating" | "new" | string
  limit?: number
  offset?: number
}

export interface ReviewItem {
  id?: number
  name: string
  rating: number
  date: string
  title: string
  text: string
  verified: boolean
}

export function mapDbProductToProduct(row: ProductRow): Product {
  return {
    id: Number(row.id),
    name: row.name,
    brand: row.brand,
    category: row.category_name as Product["category"],
    price: Number(row.price),
    oldPrice: row.old_price !== null ? Number(row.old_price) : undefined,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    image: row.image,
    description: row.description,
    stock: row.stock,
    badge: row.badge || undefined,
    options:
      row.options && row.options.length > 0 ? row.options : ["Default"],
  }
}

/**
 * Check whether a product ID or slug is marked as deleted in the store.
 */
export function isProductDeleted(idOrSlug: number | string): boolean {
  if (typeof window === "undefined") return false
  if (isSupabaseConfigured()) return false
  try {
    const rawDeleted = localStorage.getItem("abaz_deleted_product_ids")
    if (rawDeleted) {
      const parsed = JSON.parse(rawDeleted)
      if (Array.isArray(parsed)) {
        const numId = Number(idOrSlug)
        if (!isNaN(numId) && parsed.includes(numId)) {
          return true
        }
        // Also check if any deleted product id corresponds to this slug in defaultProducts
        const matched = defaultProducts.find(
          (p) =>
            p.id === numId ||
            p.name.toLowerCase().replace(/\s+/g, "-") === String(idOrSlug).toLowerCase(),
        )
        if (matched && parsed.includes(matched.id)) {
          return true
        }
      }
    }
  } catch {}
  return false
}

/**
 * Synchronously filter deleted products and merge custom edits/created items from localStorage.
 * Used across the entire customer storefront and fallback mocks.
 */
export function getEffectiveProducts(list: Product[] = defaultProducts): Product[] {
  if (typeof window === "undefined") {
    return list
  }

  const deletedIds = new Set<number>()
  let storedEdits: Record<string, Partial<Product>> = {}
  let customCreated: Product[] = []

  try {
    const rawDeleted = localStorage.getItem("abaz_deleted_product_ids")
    if (rawDeleted) {
      const parsed = JSON.parse(rawDeleted)
      if (Array.isArray(parsed)) {
        parsed.forEach((id: number) => deletedIds.add(Number(id)))
      }
    }

    const rawEdits = localStorage.getItem("abaz_custom_product_edits")
    if (rawEdits) {
      storedEdits = JSON.parse(rawEdits)
    }

    const rawCreated = localStorage.getItem("abaz_custom_created_products")
    if (rawCreated) {
      const parsed = JSON.parse(rawCreated)
      if (Array.isArray(parsed)) {
        customCreated = parsed
      }
    }
  } catch (err) {
    console.warn("Could not read local product overrides:", err)
  }

  // Combine custom created items (not already in list) with list
  const existingIds = new Set(list.map((p) => p.id))
  const newItems = customCreated.filter((p) => !existingIds.has(p.id))
  const combined = [...newItems, ...list]

  return combined
    .filter((p) => {
      // Products directly returned from the live database are authoritative
      if (list.length > 0 && list.some((item) => item.id === p.id)) {
        return true
      }
      return !deletedIds.has(p.id)
    })
    .map((p) => {
      const edit = storedEdits[p.id.toString()]
      if (!edit) return p
      return {
        ...p,
        name: edit.name ?? p.name,
        brand: edit.brand ?? p.brand,
        category: edit.category ?? p.category,
        price: edit.price !== undefined ? Number(edit.price) : p.price,
        oldPrice:
          edit.oldPrice !== undefined
            ? edit.oldPrice === null
              ? undefined
              : Number(edit.oldPrice)
            : p.oldPrice,
        stock: edit.stock !== undefined ? Number(edit.stock) : p.stock,
        badge:
          edit.badge !== undefined
            ? edit.badge
              ? String(edit.badge)
              : undefined
            : p.badge,
        description: edit.description ?? p.description,
      }
    })
}

/**
 * Fetch products from Supabase with full filtering, sorting, and pagination.
 * Gracefully falls back to defaultProducts if Supabase is offline or unconfigured.
 */
export async function getProducts(
  params: ProductQueryParams = {},
): Promise<{ data: Product[]; total: number; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return filterDefaultProducts(params)
  }

  try {
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("is_active", true)

    // Category filter
    if (params.category && params.category !== "All") {
      query = query.eq("category_name", params.category)
    } else if (params.categories && params.categories.length > 0) {
      query = query.in("category_name", params.categories)
    }

    // Brands filter
    if (params.brands && params.brands.length > 0) {
      query = query.in("brand", params.brands)
    }

    // Search query filter (search across name, brand, description)
    if (params.query && params.query.trim()) {
      const q = params.query.trim()
      query = query.or(
        `name.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%,category_name.ilike.%${q}%`,
      )
    }

    // Price range filter
    if (params.minPrice !== undefined) {
      query = query.gte("price", params.minPrice)
    }
    if (params.maxPrice !== undefined) {
      query = query.lte("price", params.maxPrice)
    }

    // Rating filter
    if (params.minRating !== undefined && params.minRating > 0) {
      query = query.gte("rating", params.minRating)
    }

    // In-stock filter
    if (params.inStockOnly) {
      query = query.gt("stock", 0)
    }

    // Skin type filter
    if (params.skinTypes && params.skinTypes.length > 0) {
      query = query.overlaps("skin_types", params.skinTypes)
    }

    // Sorting
    switch (params.sort) {
      case "price-asc":
      case "price-low":
        query = query.order("price", { ascending: true })
        break
      case "price-desc":
      case "price-high":
        query = query.order("price", { ascending: false })
        break
      case "rating":
        query = query.order("rating", { ascending: false })
        break
      case "new":
        query = query.order("created_at", { ascending: false })
        break
      case "sale":
        query = query.not("old_price", "is", null).order("price", { ascending: true })
        break
      case "featured":
      default:
        query = query.order("id", { ascending: true })
        break
    }

    // Pagination
    if (params.limit !== undefined) {
      const offset = params.offset || 0
      query = query.range(offset, offset + params.limit - 1)
    }

    const { data, count, error } = await query

    if (error) {
      console.warn("Supabase products fetch failed, using fallback:", error.message)
      return filterDefaultProducts(params)
    }

    const mapped = (data || []).map(mapDbProductToProduct)
    const effective = getEffectiveProducts(mapped)
    return { data: effective, total: effective.length, error: null }
  } catch (err) {
    console.warn("Error fetching products from Supabase, using fallback:", err)
    return filterDefaultProducts(params)
  }
}

/**
 * Fetch a single product by numeric ID or slug.
 */
export async function getProductById(
  idOrSlug: number | string,
): Promise<{ data: Product | null; error: Error | null }> {
  if (isProductDeleted(idOrSlug)) {
    return { data: null, error: new Error("Product no longer available") }
  }

  const effectiveFallback = getEffectiveProducts(defaultProducts)
  const findInFallback = () =>
    effectiveFallback.find(
      (p) =>
        p.id === Number(idOrSlug) ||
        p.name.toLowerCase().replace(/\s+/g, "-") === String(idOrSlug).toLowerCase(),
    ) || null

  if (!isSupabaseConfigured()) {
    const found = findInFallback()
    return { data: found, error: null }
  }

  try {
    const isNumeric = !Number.isNaN(Number(idOrSlug))
    const query = supabase
      .from("products")
      .select("*")
      .eq("is_active", true)

    const finalQuery = isNumeric
      ? query.eq("id", Number(idOrSlug))
      : query.eq("slug", String(idOrSlug))

    const { data, error } = await finalQuery.maybeSingle()

    if (error || !data) {
      const fallback = findInFallback()
      return { data: fallback, error: null }
    }

    const mapped = mapDbProductToProduct(data)
    const [effective] = getEffectiveProducts([mapped])
    return { data: effective || null, error: null }
  } catch (err) {
    const fallback = findInFallback()
    return { data: fallback, error: null }
  }
}

/**
 * Fetch all categories from Supabase (or fallback).
 */
export async function getCategories(): Promise<string[]> {
  const fallback = Array.from(new Set(getEffectiveProducts(defaultProducts).map((p) => p.category)))
  if (!isSupabaseConfigured()) {
    return fallback.length > 0 ? fallback : [...defaultCategories]
  }

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("name")
      .order("display_order", { ascending: true })

    if (error || !data || data.length === 0) {
      return fallback.length > 0 ? fallback : [...defaultCategories]
    }

    return data.map((c: { name: string }) => c.name)
  } catch {
    return fallback.length > 0 ? fallback : [...defaultCategories]
  }
}

/**
 * Fetch all unique brands from Supabase (or fallback).
 */
export async function getBrands(): Promise<string[]> {
  const fallback = Array.from(new Set(getEffectiveProducts(defaultProducts).map((p) => p.brand))).sort()
  if (!isSupabaseConfigured()) {
    return fallback
  }

  try {
    const { data, error } = await supabase
      .from("brands")
      .select("name")
      .order("name", { ascending: true })

    if (error || !data || data.length === 0) {
      return fallback
    }

    return data.map((b) => b.name)
  } catch {
    return fallback
  }
}

/**
 * Fetch approved reviews for a product.
 */
export async function getProductReviews(
  productId: number,
): Promise<{ data: ReviewItem[]; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: null }
  }

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })

    if (error || !data || data.length === 0) {
      return { data: [], error: null }
    }

    const mapped: ReviewItem[] = data.map((r) => ({
      id: Number(r.id),
      name: r.reviewer_name,
      rating: r.rating,
      date: new Date(r.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      title: r.title,
      text: r.content,
      verified: r.is_verified_buyer,
    }))

    return { data: mapped, error: null }
  } catch {
    return { data: [], error: null }
  }
}

/**
 * Submit a customer review using the hardened SECURITY DEFINER RPC.
 */
export async function submitProductReview(
  productId: number,
  rating: number,
  title: string,
  content: string,
): Promise<{ data: any; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return {
      data: {
        id: Date.now(),
        product_id: productId,
        rating,
        title,
        content,
        reviewer_name: "Customer",
        is_verified_buyer: true,
      },
      error: null,
    }
  }

  try {
    const { data, error } = await supabase.rpc("submit_review_secure", {
      p_product_id: productId,
      p_rating: rating,
      p_title: title.trim(),
      p_content: content.trim(),
    })

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit review"
    return { data: null, error: new Error(message) }
  }
}

// Fallback filtering helper for mock data
function filterDefaultProducts(params: ProductQueryParams) {
  let list = getEffectiveProducts(defaultProducts)

  if (params.category && params.category !== "All") {
    list = list.filter((p) => p.category === params.category)
  } else if (params.categories && params.categories.length > 0) {
    list = list.filter((p) => params.categories!.includes(p.category))
  }

  if (params.brands && params.brands.length > 0) {
    list = list.filter((p) => params.brands!.includes(p.brand))
  }

  if (params.query && params.query.trim()) {
    const q = params.query.toLowerCase().trim()
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    )
  }

  if (params.minPrice !== undefined) {
    list = list.filter((p) => p.price >= params.minPrice!)
  }
  if (params.maxPrice !== undefined) {
    list = list.filter((p) => p.price <= params.maxPrice!)
  }

  if (params.minRating !== undefined && params.minRating > 0) {
    list = list.filter((p) => p.rating >= params.minRating!)
  }

  if (params.inStockOnly) {
    list = list.filter((p) => p.stock > 0)
  }

  // Sorting
  switch (params.sort) {
    case "price-asc":
    case "price-low":
      list.sort((a, b) => a.price - b.price)
      break
    case "price-desc":
    case "price-high":
      list.sort((a, b) => b.price - a.price)
      break
    case "rating":
      list.sort((a, b) => b.rating - a.rating)
      break
    case "sale":
      list = list.filter((p) => p.oldPrice && p.oldPrice > p.price)
      list.sort((a, b) => a.price - b.price)
      break
    case "new":
      list.sort((a, b) => b.id - a.id)
      break
  }

  const total = list.length
  if (params.limit !== undefined) {
    const offset = params.offset || 0
    list = list.slice(offset, offset + params.limit)
  }

  return { data: list, total, error: null }
}

const defaultMockReviews: ReviewItem[] = []
