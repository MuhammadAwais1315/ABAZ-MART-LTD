/**
 * Utility functions for generating and handling SEO-friendly product URL slugs.
 */

/**
 * Converts a string (such as a product name) into a URL-safe slug.
 * Example: "Hydrating Vitamin C Serum" -> "hydrating-vitamin-c-serum"
 */
export function slugify(text: string): string {
  if (!text) return ""
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents/diacritics
    .replace(/&+/g, "and") // Replace '&' with 'and'
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric chars with hyphen
    .replace(/^-+|-+$/g, "") // Trim hyphens from start and end
}

/**
 * Resolves the slug for a product.
 * Uses existing `product.slug` if present; otherwise generates a clean slug from `product.name`.
 */
export function getProductSlug(product: { slug?: string; name: string }): string {
  if (product.slug && product.slug.trim()) {
    return product.slug.trim()
  }
  return slugify(product.name)
}

/**
 * Returns the customer storefront URL for a given product.
 * Always produces a name-based URL, e.g. "/product/hydrating-vitamin-c-serum".
 */
export function getProductUrl(product: {
  id?: number
  slug?: string
  name: string
}): string {
  const slug = getProductSlug(product)
  if (slug) {
    return `/product/${slug}`
  }
  return `/product/${product.id ?? ""}`
}
