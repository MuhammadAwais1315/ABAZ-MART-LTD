export type Product = {
  id: number
  name: string
  brand: string
  category: "Skincare" | "Makeup" | "Haircare" | "Fragrance" | "Body Care"
  price: number
  oldPrice?: number
  rating: number
  reviewCount: number
  stock: number
  description: string
  options: string[]
  image: string
  badge?: string
}

export const categories = [
  "Skincare",
  "Makeup",
  "Haircare",
  "Fragrance",
  "Body Care",
] as const

// Real customer storefront starts clean without hardcoded mock products.
// Real products added via the Admin Portal or Supabase database will display here.
export const products: Product[] = []
