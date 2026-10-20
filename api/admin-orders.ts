import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient } from "@supabase/supabase-js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS")
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
    res.status(200).json({ orders: [], error: "Supabase key not configured" })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  })

  // Handle status update (POST or PATCH)
  if (req.method === "POST" || req.method === "PATCH") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}
      const { orderId, status, carrier, trackingNumber, trackingUrl } = body

      if (!orderId) {
        res.status(400).json({ error: "Missing orderId" })
        return
      }

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }
      if (status) updatePayload.status = status
      if (carrier) updatePayload.carrier = carrier
      if (trackingNumber) updatePayload.tracking_number = trackingNumber
      if (trackingUrl) updatePayload.tracking_url = trackingUrl
      if (status === "Shipped") {
        updatePayload.shipped_at = new Date().toISOString()
      }

      // Try calling RPC first
      try {
        await supabase.rpc("update_order_status_admin", {
          p_order_id: orderId,
          p_status: status || "Processing",
          p_carrier: carrier || null,
          p_tracking_number: trackingNumber || null,
          p_tracking_url: trackingUrl || null,
        })
      } catch {
        // Fallback to direct update
      }

      const { data, error } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", orderId)
        .select()

      if (error) {
        // Retry with just status if carrier/tracking columns do not exist
        const retry = await supabase
          .from("orders")
          .update({ status: status || "Processing" })
          .eq("id", orderId)
        if (retry.error) {
          res.status(500).json({ error: retry.error.message })
          return
        }
      }

      res.status(200).json({ success: true, order: data?.[0] })
      return
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update order"
      res.status(500).json({ error: message })
      return
    }
  }

  // Handle GET to list all orders
  try {
    // 1. First attempt to call the RPC if available
    const { data: rpcData, error: rpcErr } = await supabase.rpc("get_all_orders_admin")
    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      return res.status(200).json({ orders: rpcData, source: "rpc" })
    }

    // 2. Query public.orders directly with order_items join
    const { data: ordersWithItems, error: joinErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })

    if (!joinErr && ordersWithItems && ordersWithItems.length > 0) {
      // Fetch customer profile emails
      const userIds = Array.from(new Set(ordersWithItems.map((o) => o.user_id).filter(Boolean)))
      const profileMap = new Map<string, { email: string; phone?: string | null }>()
      if (userIds.length > 0) {
        try {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, email, phone")
            .in("id", userIds)
          if (profs) {
            for (const p of profs) {
              profileMap.set(p.id, { email: p.email, phone: p.phone })
            }
          }
        } catch {}
      }

      const mapped = ordersWithItems.map((o) => {
        const prof = profileMap.get(o.user_id)
        return {
          ...o,
          customer_email: prof?.email || (o.shipping_name ? `${o.shipping_name.toLowerCase().replace(/\s+/g, ".")}@example.com` : "customer@example.com"),
          customer_phone: o.shipping_phone || prof?.phone || "",
        }
      })

      return res.status(200).json({ orders: mapped, source: "orders_join" })
    }

    // 3. Fallback: Query orders table directly, then fetch order_items separately
    const { data: simpleOrders, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (!ordersErr && simpleOrders && simpleOrders.length > 0) {
      const orderIds = simpleOrders.map((o) => o.id)
      const { data: allItems } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)

      const itemsByOrder = new Map<string, any[]>()
      if (allItems) {
        for (const it of allItems) {
          const list = itemsByOrder.get(it.order_id) || []
          list.push(it)
          itemsByOrder.set(it.order_id, list)
        }
      }

      const mapped = simpleOrders.map((o) => ({
        ...o,
        order_items: itemsByOrder.get(o.id) || [],
      }))

      return res.status(200).json({ orders: mapped, source: "orders_stitched" })
    }

    res.status(200).json({
      orders: [],
      error: joinErr ? joinErr.message : ordersErr ? ordersErr.message : null,
      source: "empty",
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error"
    res.status(500).json({ orders: [], error: message })
  }
}
