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
    return { data: mapped, total: count ?? mapped.length, error: null }
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
  if (!isSupabaseConfigured()) {
    const found = defaultProducts.find(
      (p) => p.id === Number(idOrSlug) || p.name.toLowerCase().replace(/\s+/g, "-") === String(idOrSlug),
    )
    return { data: found || null, error: null }
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
      // Fallback to local data
      const fallback = defaultProducts.find(
        (p) => p.id === Number(idOrSlug) || p.name.toLowerCase().replace(/\s+/g, "-") === String(idOrSlug),
      )
      return { data: fallback || null, error: null }
    }

    return { data: mapDbProductToProduct(data), error: null }
  } catch (err) {
    const fallback = defaultProducts.find(
      (p) => p.id === Number(idOrSlug) || p.name.toLowerCase().replace(/\s+/g, "-") === String(idOrSlug),
    )
    return { data: fallback || null, error: null }
  }
}

/**
 * Fetch all categories from Supabase (or fallback).
 */
export async function getCategories(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return [...defaultCategories]
  }

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("name")
      .order("display_order", { ascending: true })

    if (error || !data || data.length === 0) {
      return [...defaultCategories]
    }

    return data.map((c: { name: string }) => c.name)
  } catch {
    return [...defaultCategories]
  }
}

/**
 * Fetch all unique brands from Supabase (or fallback).
 */
export async function getBrands(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return Array.from(new Set(defaultProducts.map((p) => p.brand))).sort()
  }

  try {
    const { data, error } = await supabase
      .from("brands")
      .select("name")
      .order("name", { ascending: true })

    if (error || !data || data.length === 0) {
      return Array.from(new Set(defaultProducts.map((p) => p.brand))).sort()
    }

    return data.map((b) => b.name)
  } catch {
    return Array.from(new Set(defaultProducts.map((p) => p.brand))).sort()
  }
}

/**
 * Fetch approved reviews for a product.
 */
export async function getProductReviews(
  productId: number,
): Promise<{ data: ReviewItem[]; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: defaultMockReviews, error: null }
  }

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })

    if (error || !data || data.length === 0) {
      return { data: defaultMockReviews, error: null }
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
    return { data: defaultMockReviews, error: null }
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
  let list = [...defaultProducts]

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

const defaultMockReviews: ReviewItem[] = [
  {
    name: "Maya R.",
    date: "12 February 2026",
    title: "My skin looks brighter",
    text: "This fits beautifully into my morning routine. The texture feels light, absorbs quickly, and leaves a healthy glow without any stickiness.",
    verified: true,
    rating: 5,
  },
  {
    name: "Olivia K.",
    date: "3 February 2026",
    title: "Beautiful formula",
    text: "I noticed a softer, smoother finish within the first week. It also layers perfectly under makeup and never pills.",
    verified: true,
    rating: 5,
  },
  {
    name: "Samira D.",
    date: "24 January 2026",
    title: "Worth every drop",
    text: "The packaging feels premium and the formula is even better. A little goes a long way, so it has become a daily essential.",
    verified: true,
    rating: 5,
  },
  {
    name: "Chloe T.",
    date: "9 January 2026",
    title: "Gentle and effective",
    text: "My sensitive skin has been very happy with this. It feels soothing, looks luminous, and has no overwhelming fragrance.",
    verified: true,
    rating: 5,
  },
]
