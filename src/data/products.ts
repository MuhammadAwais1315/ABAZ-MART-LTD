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

const images = [
  "https://images.unsplash.com/photo-1764694187688-454d172e5ca0?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1773070309549-8123488410d7?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1771329064159-33f758d91f4a?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1752134593973-ac72a80ba7c7?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1653784097013-786a8965ea3b?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1701271482230-5ecaec3cd3e1?auto=format&fit=crop&w=900&q=85",
]

const catalog: Omit<Product, "id" | "image">[] = [
  {
    name: "Hydrating Vitamin C Serum",
    brand: "Luméra",
    category: "Skincare",
    price: 38,
    oldPrice: 46,
    rating: 4.8,
    reviewCount: 184,
    stock: 24,
    description:
      "A silky hyaluronic serum with rose water and squalane for bouncy, dewy skin.",
    options: ["30 ml", "50 ml"],
    badge: "Bestseller",
  },
  {
    name: "Cloud Cream Cleanser",
    brand: "Eira Skin",
    category: "Skincare",
    price: 24,
    rating: 4.7,
    reviewCount: 96,
    stock: 31,
    description:
      "A gentle cream cleanser that melts away makeup while protecting the skin barrier.",
    options: ["100 ml", "200 ml"],
    badge: "New",
  },
  {
    name: "Moonlight Renewal Cream",
    brand: "Nocturne",
    category: "Skincare",
    price: 52,
    rating: 4.9,
    reviewCount: 212,
    stock: 16,
    description:
      "A restorative night cream with peptides, ceramides, and calming oat extract.",
    options: ["50 ml"],
  },
  {
    name: "Daily Veil SPF 50",
    brand: "Solara",
    category: "Skincare",
    price: 32,
    oldPrice: 38,
    rating: 4.6,
    reviewCount: 143,
    stock: 42,
    description:
      "Invisible broad-spectrum protection with a weightless, satin finish.",
    options: ["50 ml"],
    badge: "Sale",
  },
  {
    name: "Matte Velvet Lipstick",
    brand: "Maison Rosé",
    category: "Makeup",
    price: 26,
    rating: 4.8,
    reviewCount: 306,
    stock: 54,
    description:
      "A cushiony satin lipstick delivering rich color and all-day comfort.",
    options: ["Rosewood", "Petal", "Mulberry", "Nude Tea"],
    badge: "Bestseller",
  },
  {
    name: "Soft Focus Skin Tint",
    brand: "Aster & Co.",
    category: "Makeup",
    price: 36,
    rating: 4.6,
    reviewCount: 129,
    stock: 28,
    description:
      "Breathable sheer coverage that evens tone and leaves a natural glow.",
    options: ["Light", "Light Medium", "Medium", "Deep"],
  },
  {
    name: "Golden Hour Highlighter",
    brand: "Vela Beauty",
    category: "Makeup",
    price: 29,
    oldPrice: 34,
    rating: 4.7,
    reviewCount: 88,
    stock: 19,
    description:
      "Finely milled illuminating powder with a seamless, candlelit sheen.",
    options: ["Pearl", "Champagne", "Bronze"],
    badge: "Sale",
  },
  {
    name: "Featherlight Lash Mascara",
    brand: "Maison Rosé",
    category: "Makeup",
    price: 23,
    rating: 4.5,
    reviewCount: 201,
    stock: 37,
    description:
      "Lengthening, flake-free mascara with a precision defining brush.",
    options: ["Soft Black", "Espresso"],
  },
  {
    name: "Silk Repair Hair Mask",
    brand: "Mara Botanics",
    category: "Haircare",
    price: 34,
    rating: 4.9,
    reviewCount: 171,
    stock: 22,
    description:
      "A rich weekly treatment with argan oil and plant proteins for glossy strands.",
    options: ["200 ml", "400 ml"],
    badge: "Bestseller",
  },
  {
    name: "Rosemary Root Elixir",
    brand: "Verdant Hair",
    category: "Haircare",
    price: 28,
    rating: 4.6,
    reviewCount: 118,
    stock: 26,
    description:
      "A lightweight scalp oil formulated to nourish roots and support healthy hair.",
    options: ["50 ml"],
  },
  {
    name: "Weightless Shine Mist",
    brand: "Élan Hair",
    category: "Haircare",
    price: 25,
    oldPrice: 30,
    rating: 4.4,
    reviewCount: 73,
    stock: 14,
    description:
      "A dry finishing mist that tames flyaways and adds mirror-like shine.",
    options: ["100 ml"],
    badge: "Sale",
  },
  {
    name: "Gentle Balance Shampoo",
    brand: "Mara Botanics",
    category: "Haircare",
    price: 27,
    rating: 4.7,
    reviewCount: 94,
    stock: 35,
    description:
      "Sulfate-free daily shampoo for clean, soft hair without stripping moisture.",
    options: ["250 ml", "500 ml"],
  },
  {
    name: "Fleur No. 07 Eau de Parfum",
    brand: "Atelier Abaz",
    category: "Fragrance",
    price: 78,
    rating: 4.9,
    reviewCount: 126,
    stock: 12,
    description:
      "An intimate floral of peony, pink pepper, soft woods, and skin musk.",
    options: ["30 ml", "50 ml", "100 ml"],
    badge: "Exclusive",
  },
  {
    name: "Santal Veil Eau de Parfum",
    brand: "Atelier Abaz",
    category: "Fragrance",
    price: 82,
    rating: 4.8,
    reviewCount: 89,
    stock: 9,
    description:
      "Creamy sandalwood, iris, and amber wrapped in a warm, lingering veil.",
    options: ["50 ml", "100 ml"],
  },
  {
    name: "Citrus Muse Travel Spray",
    brand: "Olea Parfums",
    category: "Fragrance",
    price: 32,
    rating: 4.5,
    reviewCount: 67,
    stock: 29,
    description:
      "Sparkling bergamot, neroli, and white tea in a purse-ready spray.",
    options: ["10 ml"],
  },
  {
    name: "Midnight Fig Eau de Parfum",
    brand: "Olea Parfums",
    category: "Fragrance",
    price: 74,
    oldPrice: 88,
    rating: 4.7,
    reviewCount: 104,
    stock: 7,
    description:
      "Ripe fig, violet leaf, and cedar for a sophisticated evening signature.",
    options: ["50 ml"],
    badge: "Sale",
  },
  {
    name: "Rose Milk Body Lotion",
    brand: "Bain & Bloom",
    category: "Body Care",
    price: 26,
    rating: 4.8,
    reviewCount: 158,
    stock: 33,
    description:
      "A fast-absorbing body lotion with shea butter and a delicate rose scent.",
    options: ["250 ml"],
  },
  {
    name: "Cashmere Body Wash",
    brand: "Bain & Bloom",
    category: "Body Care",
    price: 22,
    rating: 4.6,
    reviewCount: 93,
    stock: 38,
    description:
      "A creamy, pH-balanced wash that leaves skin soft and lightly scented.",
    options: ["300 ml", "500 ml"],
  },
  {
    name: "Amber Sugar Body Polish",
    brand: "Rituel",
    category: "Body Care",
    price: 30,
    oldPrice: 36,
    rating: 4.7,
    reviewCount: 111,
    stock: 18,
    description:
      "A smoothing brown sugar polish enriched with jojoba and apricot oils.",
    options: ["250 g"],
    badge: "Sale",
  },
  {
    name: "Satin Hands Ritual",
    brand: "Rituel",
    category: "Body Care",
    price: 19,
    rating: 4.5,
    reviewCount: 65,
    stock: 44,
    description:
      "A nourishing hand cream with niacinamide, shea butter, and cotton flower.",
    options: ["50 ml", "100 ml"],
  },
  {
    name: "Barrier Rescue Balm",
    brand: "Eira Skin",
    category: "Skincare",
    price: 31,
    rating: 4.8,
    reviewCount: 137,
    stock: 21,
    description:
      "An all-purpose ceramide balm to comfort dry, sensitive areas instantly.",
    options: ["40 ml"],
  },
  {
    name: "Sculpt & Flush Duo",
    brand: "Vela Beauty",
    category: "Makeup",
    price: 39,
    rating: 4.7,
    reviewCount: 119,
    stock: 17,
    description:
      "A creamy blush and contour pairing for effortless, dimensional color.",
    options: ["Blossom", "Terracotta", "Berry"],
  },
  {
    name: "Peptide Gloss Treatment",
    brand: "Luméra",
    category: "Makeup",
    price: 21,
    rating: 4.8,
    reviewCount: 228,
    stock: 46,
    description:
      "A high-shine lip treatment with peptides and nourishing raspberry oil.",
    options: ["Clear", "Rose", "Cocoa"],
    badge: "Trending",
  },
  {
    name: "Nourishing Hair Oil",
    brand: "Élan Hair",
    category: "Haircare",
    price: 31,
    rating: 4.6,
    reviewCount: 82,
    stock: 25,
    description:
      "A featherlight botanical blend that smooths ends without weighing hair down.",
    options: ["50 ml", "100 ml"],
  },
]

export const products: Product[] = catalog.map((product, index) => ({
  ...product,
  id: index + 1,
  image: images[index % images.length],
}))

export const categories = [
  "Skincare",
  "Makeup",
  "Haircare",
  "Fragrance",
  "Body Care",
] as const
