import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient } from "@supabase/supabase-js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS")

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    "https://twstiotnaaglptizaxkm.supabase.co"
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  const supabaseKey = serviceKey || process.env.VITE_SUPABASE_ANON_KEY || ""

  if (!supabaseKey || supabaseKey.includes("placeholder")) {
    res.status(200).json({
      configured: false,
      error:
        "VITE_SUPABASE_ANON_KEY is missing or contains placeholder in Vercel environment variables",
    })
    return
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })

    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price, stock, is_active, category_name, created_at")
      .order("id", { ascending: false })

    const { data: categories, error: catErr } = await supabase
      .from("categories")
      .select("id, name")

    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false })

    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })

    res.status(200).json({
      configured: true,
      supabaseUrl,
      hasKey: Boolean(supabaseKey && supabaseKey.length > 20),
      hasServiceKey: Boolean(serviceKey && serviceKey.length > 20),
      productCount: products?.length || 0,
      products: products || [],
      prodError: prodErr ? prodErr.message : null,
      categories: categories || [],
      catError: catErr ? catErr.message : null,
      profileCount: profiles?.length || 0,
      profiles: profiles || [],
      profError: profErr ? profErr.message : null,
      orderCount: orders?.length || 0,
      orders: orders || [],
      ordersError: ordersErr ? ordersErr.message : null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: message })
  }
}
