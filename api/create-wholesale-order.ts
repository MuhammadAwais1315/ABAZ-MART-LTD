import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

/**
 * POST /api/create-wholesale-order
 * Creates a wholesale/bulk order directly in the database with confirmed payment.
 * Uses service role key to bypass RLS.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Admin-Key",
  )

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || "https://twstiotnaaglptizaxkm.supabase.co"
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""

  if (!supabaseKey || supabaseKey.includes("placeholder")) {
    res.status(500).json({ error: "Supabase key not configured" })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  })

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}

    const {
      orderNumber,
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      shippingCountry,
      paymentMethod,
      paymentStatus,
      status,
      subtotal,
      shipping,
      tax,
      discount,
      total,
      estimatedDeliveryDate,
      items,
      userId,
    } = body

    if (!orderNumber || !items || !Array.isArray(items) || items.length === 0) {
      res
        .status(400)
        .json({ error: "Missing required fields: orderNumber, items" })
      return
    }

    // Generate a UUID for the order
    const orderId = crypto.randomUUID()

    // Insert the order
    const { error: orderErr } = await supabase.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      user_id: userId || "6e1277d2-ce86-4d05-b709-2f9729048955", // admin user
      status: status || "Processing",
      subtotal: subtotal || 0,
      shipping: shipping || 0,
      tax: tax || 0,
      discount: discount || 0,
      total: total || 0,
      payment_method: paymentMethod || "card",
      payment_status: paymentStatus || "paid",
      shipping_name: shippingName || "",
      shipping_phone: shippingPhone || "",
      shipping_address: shippingAddress || "",
      shipping_city: shippingCity || "",
      shipping_postal_code: shippingPostalCode || "",
      shipping_country: shippingCountry || "United Kingdom",
      estimated_delivery_date: estimatedDeliveryDate || null,
      delivery_option: "standard",
    })

    if (orderErr) {
      res.status(500).json({ error: `Order insert failed: ${orderErr.message}` })
      return
    }

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: orderId,
      product_id: item.productId || null,
      product_name: item.productName || "",
      product_brand: item.productBrand || "",
      product_image: item.productImage || "",
      selected_option: item.selectedOption || "100ml",
      unit_price: item.unitPrice || 0,
      quantity: item.quantity || 1,
      line_total: item.lineTotal || 0,
    }))

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItems)

    if (itemsErr) {
      // Try to clean up the order if items fail
      await supabase.from("orders").delete().eq("id", orderId)
      res
        .status(500)
        .json({ error: `Order items insert failed: ${itemsErr.message}` })
      return
    }

    res.status(200).json({
      success: true,
      orderId,
      orderNumber,
      total,
      message: `Wholesale order ${orderNumber} created successfully with ${items.length} line item(s).`,
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create wholesale order"
    res.status(500).json({ error: message })
  }
}
