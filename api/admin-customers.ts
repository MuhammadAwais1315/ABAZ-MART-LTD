import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient } from "@supabase/supabase-js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  )

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    "https://twstiotnaaglptizaxkm.supabase.co"
  // Prefer service_role key to bypass RLS for admin endpoints, fallback to anon key
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""

  if (!supabaseKey || supabaseKey.includes("placeholder")) {
    res.status(200).json({ customers: [], error: "Supabase key not configured" })
    return
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })

    // 1. First attempt to call the RPC if available
    const { data: rpcData, error: rpcErr } = await supabase.rpc("get_all_customers_admin")
    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      return res.status(200).json({ customers: rpcData, source: "rpc" })
    }

    // 2. Query public.profiles directly
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("*, orders(id)")
      .order("created_at", { ascending: false })

    if (!profErr && profiles && profiles.length > 0) {
      const mapped = profiles.map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name || (p.email ? p.email.split("@")[0] : "Customer"),
        phone: p.phone,
        avatar_url: p.avatar_url,
        role: p.role,
        created_at: p.created_at,
        orders_count: Array.isArray(p.orders) ? p.orders.length : 0,
      }))
      return res.status(200).json({ customers: mapped, source: "profiles" })
    }

    // 3. Fallback simple profiles query
    const { data: simpleProfiles, error: simpleErr } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (!simpleErr && simpleProfiles && simpleProfiles.length > 0) {
      const mapped = simpleProfiles.map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name || (p.email ? p.email.split("@")[0] : "Customer"),
        phone: p.phone,
        avatar_url: p.avatar_url,
        role: p.role,
        created_at: p.created_at,
        orders_count: 0,
      }))
      return res.status(200).json({ customers: mapped, source: "simple_profiles" })
    }

    res.status(200).json({
      customers: [],
      error: profErr ? profErr.message : simpleErr ? simpleErr.message : "No profiles found",
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error"
    res.status(500).json({ customers: [], error: message })
  }
}
