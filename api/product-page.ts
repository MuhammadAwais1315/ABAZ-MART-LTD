import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function escapeJson(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS & caching headers (revalidate product pages every 60 seconds)
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")

  const rawId = req.query.id as string || ""
  const productId = rawId.trim()

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || "https://twstiotnaaglptizaxkm.supabase.co"
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""

  let product: any = null

  if (supabaseKey && productId) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      })

      const isNumeric = !isNaN(Number(productId))
      const query = supabase.from("products").select("*").eq("is_active", true)

      const { data, error } = isNumeric
        ? await query.eq("id", Number(productId)).maybeSingle()
        : await query.eq("slug", productId).maybeSingle()

      if (!error && data) {
        product = data
      }
    } catch (dbErr) {
      console.warn("Could not load product from database:", dbErr)
    }
  }

  // Load base HTML shell
  let baseHtml = ""
  const distPath = path.join(process.cwd(), "dist", "index.html")
  const rootPath = path.join(process.cwd(), "index.html")

  if (fs.existsSync(distPath)) {
    try {
      baseHtml = fs.readFileSync(distPath, "utf-8")
    } catch {}
  } else if (fs.existsSync(rootPath)) {
    try {
      baseHtml = fs.readFileSync(rootPath, "utf-8")
    } catch {}
  }

  // If baseHtml couldn't be loaded from disk, fetch from host
  if (!baseHtml && req.headers.host) {
    try {
      const protocol = req.headers["x-forwarded-proto"] || "https"
      const resp = await fetch(`${protocol}://${req.headers.host}/index.html`)
      if (resp.ok) {
        baseHtml = await resp.text()
      }
    } catch {}
  }

  // If no product found, return the base HTML for client-side routing
  if (!product) {
    if (baseHtml) {
      res.status(200).send(baseHtml)
    } else {
      res.status(404).send("<!doctype html><html><body><h1>Product Not Found</h1></body></html>")
    }
    return
  }

  const productName = product.name || "Luxury Skincare Product"
  const productBrand = product.brand || "Abaz Mart"
  const productPrice = Number(product.price) || 0
  const productStock = Number(product.stock) || 0
  const isAvailable = productStock > 0
  const productCategory = product.category_name || "Skincare"
  const productImg =
    product.image ||
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80"
  const productDesc =
    product.description ||
    `Discover ${productName} by ${productBrand} at Abaz Mart. Premium luxury skincare delivered with tracked UK shipping.`
  const howToUse = product.how_to_use || ""
  const ingredients = product.ingredients || ""

  const pageTitle = `${productName} · £${productPrice.toFixed(2)} | Abaz Mart UK`
  const canonicalUrl = `https://www.abazmart.co.uk/product/${product.id}`

  // 1. Build Schema.org Product JSON-LD
  const schemaLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": productName,
    "image": [productImg],
    "description": productDesc,
    "brand": {
      "@type": "Brand",
      "name": productBrand,
    },
    "category": productCategory,
    "offers": {
      "@type": "Offer",
      "url": canonicalUrl,
      "priceCurrency": "GBP",
      "price": productPrice.toFixed(2),
      "priceValidUntil": "2027-12-31",
      "availability": isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": {
        "@type": "Organization",
        "name": "Abaz Mart Ltd",
        "url": "https://www.abazmart.co.uk",
      },
    },
  }

  // 2. Pre-rendered HTML inside <div id="root">
  const preRenderedContent = `
    <main class="product-server-render" style="max-width: 1200px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2b2024;">
      <nav aria-label="Breadcrumb" style="font-size: 13px; color: #7a686f; margin-bottom: 28px;">
        <a href="/" style="color: #7a686f; text-decoration: none;">Home</a> /
        <a href="/shop" style="color: #7a686f; text-decoration: none;">Shop</a> /
        <a href="/shop?category=${encodeURIComponent(productCategory)}" style="color: #7a686f; text-decoration: none;">${escapeHtml(productCategory)}</a> /
        <span style="color: #2b2024; font-weight: 500;">${escapeHtml(productName)}</span>
      </nav>

      <article style="display: flex; flex-wrap: wrap; gap: 48px; align-items: flex-start;">
        <div style="flex: 1 1 420px; max-width: 520px;">
          <img
            src="${escapeHtml(productImg)}"
            alt="${escapeHtml(productName)}"
            style="width: 100%; height: auto; border-radius: 16px; object-fit: cover; box-shadow: 0 4px 24px rgba(43,32,36,0.06); border: 1px solid #efe4e7;"
          />
        </div>

        <div style="flex: 1 1 440px;">
          <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #b83b5e; margin: 0 0 8px 0;">
            ${escapeHtml(productBrand)}
          </div>

          <h1 style="font-size: 26px; font-weight: 700; line-height: 1.35; margin: 0 0 16px 0; color: #2b2024; font-family: 'Playfair Display', Georgia, serif;">
            ${escapeHtml(productName)}
          </h1>

          <div style="font-size: 26px; font-weight: 700; color: #2b2024; margin-bottom: 12px;">
            £${productPrice.toFixed(2)}
          </div>

          <div style="display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; margin-bottom: 24px; ${
            isAvailable
              ? "background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;"
              : "background-color: #fff1f2; color: #be123c; border: 1px solid #fecdd3;"
          }">
            ${isAvailable ? `In Stock (${productStock} units available)` : "Currently Out of Stock"}
          </div>

          <div style="font-size: 14.5px; line-height: 1.7; color: #5a4b51; margin-bottom: 28px;">
            <h2 style="font-size: 15px; font-weight: 700; color: #2b2024; margin: 0 0 8px 0;">Product Description</h2>
            <p style="margin: 0;">${escapeHtml(productDesc)}</p>
          </div>

          ${
            howToUse
              ? `<div style="background-color: #faf6f7; border: 1px solid #eadfe2; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 6px 0; font-size: 13.5px; font-weight: 700; color: #b83b5e; text-transform: uppercase; letter-spacing: 0.5px;">
                    How to Use &amp; Key Claims
                  </h3>
                  <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #4a3a40;">${escapeHtml(howToUse)}</p>
                </div>`
              : ""
          }

          ${
            ingredients
              ? `<div style="background-color: #faf6f7; border: 1px solid #eadfe2; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 6px 0; font-size: 13.5px; font-weight: 700; color: #b83b5e; text-transform: uppercase; letter-spacing: 0.5px;">
                    Key Ingredients
                  </h3>
                  <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #615056;">${escapeHtml(ingredients)}</p>
                </div>`
              : ""
          }

          <div style="border-top: 1px solid #efe4e7; padding-top: 18px; font-size: 12px; color: #7a686f; line-height: 1.6;">
            <p style="margin: 0 0 4px 0;"><strong>ABAZ MART LTD</strong> · Registered in England &amp; Wales (Company No. 17094173)</p>
            <p style="margin: 0 0 4px 0;">Office 951, 60 Tottenham Court Road, London W1T 2EW, United Kingdom</p>
            <p style="margin: 0;">Contact: <a href="mailto:care@abazmart.co.uk" style="color: #b83b5e;">care@abazmart.co.uk</a> · +4402034322415 · Tracked UK Delivery</p>
          </div>
        </div>
      </article>
    </main>
  `

  // 3. Inject SEO metadata and pre-rendered content into baseHtml
  let rendered = baseHtml || `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title></title></head><body><div id="root"></div></body></html>`

  // Replace Title
  rendered = rendered.replace(
    /<title>.*?<\/title>/i,
    `<title>${escapeHtml(pageTitle)}</title>`,
  )

  // Replace Canonical Link
  if (rendered.includes('rel="canonical"')) {
    rendered = rendered.replace(
      /<link[^>]+rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    )
  }

  // Remove generic meta descriptions & og tags to replace with product-specific ones
  rendered = rendered.replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
  rendered = rendered.replace(/<meta\s+property=["']og:title["'][^>]*>/gi, "")
  rendered = rendered.replace(/<meta\s+property=["']og:description["'][^>]*>/gi, "")
  rendered = rendered.replace(/<meta\s+property=["']og:image["'][^>]*>/gi, "")
  rendered = rendered.replace(/<meta\s+property=["']og:url["'][^>]*>/gi, "")
  rendered = rendered.replace(/<meta\s+name=["']twitter:title["'][^>]*>/gi, "")
  rendered = rendered.replace(/<meta\s+name=["']twitter:description["'][^>]*>/gi, "")
  rendered = rendered.replace(/<meta\s+name=["']twitter:image["'][^>]*>/gi, "")

  // Build product-specific meta tags
  const productMetaTags = `
    <meta name="description" content="${escapeHtml(productDesc)}" />
    <meta property="og:type" content="product" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:site_name" content="Abaz Mart" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(productDesc)}" />
    <meta property="og:image" content="${escapeHtml(productImg)}" />
    <meta property="product:price:amount" content="${productPrice.toFixed(2)}" />
    <meta property="product:price:currency" content="GBP" />
    <meta property="product:availability" content="${isAvailable ? "in stock" : "out of stock"}" />
    <meta property="product:brand" content="${escapeHtml(productBrand)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(productDesc)}" />
    <meta name="twitter:image" content="${escapeHtml(productImg)}" />
    <script type="application/ld+json">
${JSON.stringify(schemaLd, null, 2)}
    </script>
  `

  // Inject meta tags before </head>
  rendered = rendered.replace("</head>", `${productMetaTags}\n</head>`)

  // Inject pre-rendered product content into <div id="root">
  rendered = rendered.replace(
    '<div id="root"></div>',
    `<div id="root">${preRenderedContent}</div>`,
  )

  res.status(200).send(rendered)
}
