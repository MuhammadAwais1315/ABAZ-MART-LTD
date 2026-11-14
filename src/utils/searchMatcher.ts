import { Product } from "../data/products"

/**
 * Intelligent storefront search matcher:
 * - Tolerant to store branding in queries (e.g., "reef 33 abazmart" -> "reef 33")
 * - Handles multi-word keywords in any order (e.g., "armaf intense man")
 * - Matches across title, brand, category, description, and options
 */
export function matchesSearchQuery(product: Product, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true

  // Normalize query & strip store noise if combined with product terms
  const rawLower = rawQuery.toLowerCase().trim()
  let clean = rawLower
    .replace(/\babazmart\b/gi, "")
    .replace(/\babaz\s+mart\b/gi, "")
    .replace(/\babaz\b/gi, "")
    .trim()

  if (!clean) {
    clean = rawLower
  }

  const searchableText = `${product.name} ${product.brand} ${product.category} ${product.description || ""} ${product.badge || ""} ${(product.options || []).join(" ")}`.toLowerCase()

  // 1. Direct whole-phrase substring match
  if (searchableText.includes(clean)) {
    return true
  }

  // 2. Tokenized word match: all significant words must match
  const stopWords = new Set(["the", "and", "for", "with", "from", "in", "on", "at", "to", "a", "an", "of"])
  const tokens = clean
    .split(/[\s,–—\-_/|]+/)
    .map((t) => t.trim().replace(/[^a-z0-9]/gi, ""))
    .filter((t) => t.length > 0 && !stopWords.has(t))

  if (tokens.length === 0) {
    return true
  }

  return tokens.every((token) => searchableText.includes(token))
}
