import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient } from "@supabase/supabase-js"

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<":
          return "&lt;"
        case ">":
          return "&gt;"
        case "&":
          return "&amp;"
        case "'":
          return "&apos;"
        case '"':
          return "&quot;"
        default:
          return c
      }
    })
}

function slugify(text: string): string {
  if (!text) return ""
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&+/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Content-Type", "application/xml; charset=utf-8")
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || "https://twstiotnaaglptizaxkm.supabase.co"
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""

  let products: any[] = []

  if (supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      })
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, image, updated_at, created_at")
        .eq("is_active", true)
        .order("id", { ascending: false })

      if (!error && data) {
        products = data
      }
    } catch (err) {
      console.warn("Could not fetch products for sitemap:", err)
    }
  }

  const now = new Date().toISOString().split("T")[0]

  const staticUrls = [
    { loc: "https://www.abazmart.co.uk/", priority: "1.0", changefreq: "daily" },
    { loc: "https://www.abazmart.co.uk/shop", priority: "0.9", changefreq: "daily" },
    { loc: "https://www.abazmart.co.uk/cart", priority: "0.6", changefreq: "weekly" },
    { loc: "https://www.abazmart.co.uk/shipping", priority: "0.5", changefreq: "monthly" },
    { loc: "https://www.abazmart.co.uk/returns", priority: "0.5", changefreq: "monthly" },
    { loc: "https://www.abazmart.co.uk/privacy", priority: "0.4", changefreq: "monthly" },
    { loc: "https://www.abazmart.co.uk/terms", priority: "0.4", changefreq: "monthly" },
  ]

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`

  for (const item of staticUrls) {
    xml += `  <url>\n`
    xml += `    <loc>${item.loc}</loc>\n`
    xml += `    <lastmod>${now}</lastmod>\n`
    xml += `    <changefreq>${item.changefreq}</changefreq>\n`
    xml += `    <priority>${item.priority}</priority>\n`
    xml += `  </url>\n`
  }

  for (const prod of products) {
    const slug = prod.slug || slugify(prod.name)
    const productUrl = `https://www.abazmart.co.uk/product/${slug}`
    const lastMod = prod.updated_at
      ? new Date(prod.updated_at).toISOString().split("T")[0]
      : prod.created_at
        ? new Date(prod.created_at).toISOString().split("T")[0]
        : now

    xml += `  <url>\n`
    xml += `    <loc>${productUrl}</loc>\n`
    xml += `    <lastmod>${lastMod}</lastmod>\n`
    xml += `    <changefreq>daily</changefreq>\n`
    xml += `    <priority>0.8</priority>\n`
    if (prod.image) {
      xml += `    <image:image>\n`
      xml += `      <image:loc>${escapeXml(prod.image)}</image:loc>\n`
      xml += `      <image:title>${escapeXml(prod.name)}</image:title>\n`
      xml += `    </image:image>\n`
    }
    xml += `  </url>\n`
  }

  xml += `</urlset>`

  res.status(200).send(xml)
}
