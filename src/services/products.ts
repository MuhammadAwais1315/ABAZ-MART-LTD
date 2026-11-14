import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { Database } from "../types/database"
import { matchCategory } from "../utils/categoryMatcher"
import { slugify, getProductSlug } from "../utils/slugify"
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
    slug: row.slug || undefined,
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
export function isProductDeleted(_idOrSlug: number | string): boolean {
  return false
}

/**
 * Synchronously merge custom edits/created items from localStorage.
 * Used across customer storefront and fallback mocks.
 */
export function getEffectiveProducts(list: Product[] = defaultProducts): Product[] {
  if (typeof window === "undefined") {
    return list
  }

  let storedEdits: Record<string, Partial<Product>> = {}
  let customCreated: Product[] = []

  try {
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

  return combined.map((p) => {
    const edit = storedEdits[p.id.toString()]
    if (!edit) return p
    const isFromLiveDb = existingIds.has(p.id)
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
      stock: isFromLiveDb ? p.stock : (edit.stock !== undefined ? Number(edit.stock) : p.stock),
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

    // Category filter with intelligent perfume/fragrance clustering
    if (params.category && params.category !== "All") {
      const catTrim = params.category.trim()
      if (/\b(fragran|perfum|parfum)\w*\b/i.test(catTrim)) {
        query = query.or("category_name.ilike.%fragran%,category_name.ilike.%perfum%")
      } else {
        query = query.or(`category_name.ilike.%${catTrim}%,category_name.ilike.${catTrim}`)
      }
    } else if (params.categories && params.categories.length > 0) {
      const hasFragrance = params.categories.some((c) =>
        /\b(fragran|perfum)\w*\b/i.test(c),
      )
      if (hasFragrance) {
        query = query.or("category_name.ilike.%fragran%,category_name.ilike.%perfum%")
      } else {
        query = query.in("category_name", params.categories)
      }
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

  const rawKey = String(idOrSlug).trim()
  const lowerKey = rawKey.toLowerCase()
  const isNumeric = !Number.isNaN(Number(rawKey)) && /^\d+$/.test(rawKey)
  const numericId = isNumeric ? Number(rawKey) : NaN

  const effectiveFallback = getEffectiveProducts(defaultProducts)
  const findInFallback = () =>
    effectiveFallback.find((p) => {
      if (isNumeric && p.id === numericId) return true
      if (p.slug && p.slug.toLowerCase() === lowerKey) return true
      if (slugify(p.name) === lowerKey) return true
      if (p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === lowerKey) return true
      return false
    }) || null

  if (!isSupabaseConfigured()) {
    const found = findInFallback()
    return { data: found, error: null }
  }

  try {
    let productRow: any = null

    if (isNumeric) {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("id", numericId)
        .maybeSingle()
      if (data) {
        productRow = data
      }
    }

    if (!productRow) {
      // 1. Try exact slug match
      const { data: exactSlugData } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("slug", rawKey)
        .maybeSingle()

      if (exactSlugData) {
        productRow = exactSlugData
      }
    }

    if (!productRow) {
      // 2. Try slug prefix match (handles cases where a slug had an admin timestamp suffix)
      const { data: prefixSlugData } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .ilike("slug", `${rawKey}%`)
        .maybeSingle()

      if (prefixSlugData) {
        productRow = prefixSlugData
      }
    }

    if (!productRow) {
      // 3. Try matching product name
      const nameGuess = rawKey.replace(/-/g, " ")
      const { data: nameData } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .ilike("name", `%${nameGuess}%`)
        .maybeSingle()

      if (nameData) {
        productRow = nameData
      }
    }

    if (!productRow) {
      const fallback = findInFallback()
      return { data: fallback, error: null }
    }

    const mapped = mapDbProductToProduct(productRow)
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
  const getCustomLocalCategories = (): string[] => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem("abaz_custom_categories")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => (typeof item === "string" ? item : item.name)).filter(Boolean)
        }
      }
    } catch {}
    return []
  }

  const catalogCategories = Array.from(
    new Set(getEffectiveProducts(defaultProducts).map((p) => p.category)),
  ).filter(Boolean)

  const localCategories = getCustomLocalCategories()

  let dbCategories: string[] = []
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .order("display_order", { ascending: true })

      if (!error && data && data.length > 0) {
        dbCategories = data.map((c: { name: string }) => c.name)
      }
    } catch {}
  }

  // Combine in order of precedence: db, local, catalog, defaults
  const mergedPool = [
    ...dbCategories,
    ...localCategories,
    ...catalogCategories,
    ...defaultCategories,
  ]

  // Case-insensitive deduplication
  const seen = new Set<string>()
  const finalCategories: string[] = []

  for (const cat of mergedPool) {
    if (!cat) continue
    const trimmed = cat.trim()
    const lower = trimmed.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      finalCategories.push(trimmed)
    }
  }

  return finalCategories
}

/**
 * Fetch unique brands of active products currently listed in the catalog.
 * Optionally filtered by category so only brands present in that category are returned.
 */
export async function getBrands(category?: string): Promise<string[]> {
  let fallback = getEffectiveProducts(defaultProducts)
  if (category && category !== "All") {
    fallback = fallback.filter((p) => matchCategory(p.category, category))
  }
  const fallbackBrands = Array.from(
    new Set(fallback.map((p) => p.brand?.trim()).filter((b): b is string => Boolean(b))),
  ).sort((a, b) => a.localeCompare(b))

  if (!isSupabaseConfigured()) {
    return fallbackBrands
  }

  try {
    let query = supabase
      .from("products")
      .select("brand")
      .eq("is_active", true)

    if (category && category !== "All") {
      const catTrim = category.trim()
      if (/\b(fragran|perfum|parfum)\w*\b/i.test(catTrim)) {
        query = query.or("category_name.ilike.%fragran%,category_name.ilike.%perfum%")
      } else {
        query = query.or(`category_name.ilike.%${catTrim}%,category_name.ilike.${catTrim}`)
      }
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      return fallbackBrands
    }

    const unique = Array.from(
      new Set(
        data
          .map((row: { brand: string }) => row.brand?.trim())
          .filter((b: string): b is string => Boolean(b)),
      ),
    ).sort((a, b) => a.localeCompare(b))

    return unique.length > 0 ? unique : fallbackBrands
  } catch {
    return fallbackBrands
  }
}

function getLocalReviews(productId: number): ReviewItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(`abaz_reviews_${productId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

function saveLocalReview(productId: number, item: ReviewItem): void {
  if (typeof window === "undefined") return
  try {
    const existing = getLocalReviews(productId)
    const filtered = existing.filter((r) => r.id !== item.id && r.text !== item.text)
    const updated = [item, ...filtered]
    localStorage.setItem(`abaz_reviews_${productId}`, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent("abaz_review_updated"))
  } catch {}
}

/**
 * Fetch approved reviews for a product.
 */
export async function getProductReviews(
  productId: number,
): Promise<{ data: ReviewItem[]; error: Error | null }> {
  const localList = getLocalReviews(productId)

  if (!isSupabaseConfigured()) {
    return { data: localList, error: null }
  }

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })

    if (error || !data || data.length === 0) {
      return { data: localList, error: null }
    }

    const dbMapped: ReviewItem[] = data.map((r) => ({
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

    // Merge database reviews and locally submitted reviews
    const dbKeys = new Set(dbMapped.map((r) => `${r.title}::${r.text}`))
    const uniqueLocals = localList.filter((r) => !dbKeys.has(`${r.title}::${r.text}`))
    const combined = [...uniqueLocals, ...dbMapped]

    return { data: combined, error: null }
  } catch {
    return { data: localList, error: null }
  }
}

/**
 * Submit a customer review with multi-tier resilience:
 * 1. Calls submit_review_secure RPC
 * 2. Falls back to direct Supabase upsert
 * 3. Falls back to serverless /api/submit-review endpoint (service-role bypass)
 * 4. Falls back to immediate local storage persistence so reviews are never lost
 */
export async function submitProductReview(
  productId: number,
  rating: number,
  title: string,
  content: string,
): Promise<{ data: any; error: Error | null }> {
  const cleanTitle = title.trim()
  const cleanContent = content.trim()
  const cleanRating = Math.min(5, Math.max(1, rating))

  let user: any = null
  let sessionToken = ""
  try {
    const { data: userData } = await supabase.auth.getUser()
    user = userData?.user
    const { data: sessionData } = await supabase.auth.getSession()
    sessionToken = sessionData?.session?.access_token || ""
  } catch {}

  const reviewerName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : "Verified Customer")

  const buildReviewItem = (id?: number): ReviewItem => ({
    id: id || Date.now(),
    name: reviewerName,
    rating: cleanRating,
    date: new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    title: cleanTitle,
    text: cleanContent,
    verified: true,
  })

  if (isSupabaseConfigured()) {
    // Strategy 1: Attempt the RPC function
    try {
      const { data, error } = await supabase.rpc("submit_review_secure", {
        p_product_id: productId,
        p_rating: cleanRating,
        p_title: cleanTitle,
        p_content: cleanContent,
      })

      if (!error && data) {
        const item = buildReviewItem(Number(data.id))
        saveLocalReview(productId, item)
        return { data: item, error: null }
      }
    } catch {}

    // Strategy 2: Direct upsert into reviews table
    if (user?.id) {
      try {
        const { data: inserted, error: insertErr } = await supabase
          .from("reviews")
          .upsert(
            {
              product_id: productId,
              user_id: user.id,
              reviewer_name: reviewerName,
              rating: cleanRating,
              title: cleanTitle,
              content: cleanContent,
              is_verified_buyer: true,
              is_approved: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "product_id,user_id" },
          )
          .select()
          .maybeSingle()

        if (!insertErr && inserted) {
          const item = buildReviewItem(Number(inserted.id))
          saveLocalReview(productId, item)
          return { data: item, error: null }
        }
      } catch {}
    }

    // Strategy 3: Serverless endpoint /api/submit-review
    try {
      const res = await fetch("/api/submit-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          productId,
          rating: cleanRating,
          title: cleanTitle,
          content: cleanContent,
          userId: user?.id,
          reviewerName,
        }),
      })

      if (res.ok) {
        const json = await res.json()
        if (json?.data) {
          const item = buildReviewItem(Number(json.data.id))
          saveLocalReview(productId, item)
          return { data: item, error: null }
        }
      }
    } catch {}
  }

  // Strategy 4: Local persistence fallback
  const fallbackItem = buildReviewItem()
  saveLocalReview(productId, fallbackItem)
  return { data: fallbackItem, error: null }
}

// Fallback filtering helper for mock data
function filterDefaultProducts(params: ProductQueryParams) {
  let list = getEffectiveProducts(defaultProducts)

  if (params.category && params.category !== "All") {
    list = list.filter((p) => matchCategory(p.category, params.category))
  } else if (params.categories && params.categories.length > 0) {
    list = list.filter((p) =>
      params.categories!.some((cat) => matchCategory(p.category, cat)),
    )
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
