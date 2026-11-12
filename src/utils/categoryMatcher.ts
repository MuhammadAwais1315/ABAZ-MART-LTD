/**
 * Comprehensive case-insensitive, slug-tolerant, plural-tolerant, and synonym-aware category matching.
 * Handles variations such as:
 * - "Fragrances & Perfumes" <-> "Fragrance" <-> "Perfume" <-> "Perfumes & Fragrances"
 * - "Skincare" <-> "Skin Care"
 * - "Haircare" <-> "Hair Care"
 * - "Body Care" <-> "Bodycare" <-> "Bath & Body"
 */

export function normalizeCategory(cat?: string | null): string {
  if (!cat) return ""
  return cat
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stemWord(word: string): string {
  return word.replace(/(?:es|s)$/, "")
}

const FRAGRANCE_PATTERN = /\b(fragran|perfum|parfum|scent|cologne|eau de)\w*\b/i
const SKINCARE_PATTERN = /\b(skin\s*care|skincare)\b/i
const HAIRCARE_PATTERN = /\b(hair\s*care|haircare)\b/i
const BODYCARE_PATTERN = /\b(body\s*care|bodycare|bath\s*and\s*body)\b/i
const MAKEUP_PATTERN = /\b(make\s*up|makeup|cosmetic)\b/i

export function matchCategory(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  const normA = normalizeCategory(a)
  const normB = normalizeCategory(b)
  if (!normA || !normB) return false

  // 1. Direct exact match
  if (normA === normB) return true

  // 2. Direct compressed match e.g. "skincare" === "skin care"
  const compA = normA.replace(/\s+/g, "")
  const compB = normB.replace(/\s+/g, "")
  if (compA === compB) return true

  // 3. Singular vs plural stem
  if (stemWord(normA) === stemWord(normB)) return true

  // 4. Slug match
  if (normA.replace(/\s+/g, "-") === normB.replace(/\s+/g, "-")) return true

  // 5. Fragrance & Perfume cluster
  // Matches "Fragrances & Perfumes", "Fragrance", "Perfume", "Perfumes & Fragrances", etc.
  if (FRAGRANCE_PATTERN.test(normA) && FRAGRANCE_PATTERN.test(normB)) {
    return true
  }

  // 6. Skincare cluster
  if (SKINCARE_PATTERN.test(normA) && SKINCARE_PATTERN.test(normB)) {
    return true
  }

  // 7. Haircare cluster
  if (HAIRCARE_PATTERN.test(normA) && HAIRCARE_PATTERN.test(normB)) {
    return true
  }

  // 8. Bodycare cluster
  if (BODYCARE_PATTERN.test(normA) && BODYCARE_PATTERN.test(normB)) {
    return true
  }

  // 9. Makeup cluster
  if (MAKEUP_PATTERN.test(normA) && MAKEUP_PATTERN.test(normB)) {
    return true
  }

  // 10. Word intersection for compound categories (e.g. "Fragrance" in "Fragrances and Perfumes")
  const wordsA = normA
    .split(/\s+/)
    .filter((w) => w !== "and" && w !== "&" && w.length > 2)
    .map(stemWord)
  const wordsB = normB
    .split(/\s+/)
    .filter((w) => w !== "and" && w !== "&" && w.length > 2)
    .map(stemWord)

  const commonWord = wordsA.some((wA) => wordsB.some((wB) => wA === wB))
  if (commonWord) return true

  return false
}
