import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient } from "@supabase/supabase-js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
  )

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}
    const { productId, rating, title, content, reviewerName, userId } = body

    if (!productId || !rating || !title || !content) {
      res.status(400).json({ error: "Missing required fields" })
      return
    }

    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      "https://twstiotnaaglptizaxkm.supabase.co"
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ""

    if (!supabaseKey) {
      res.status(500).json({ error: "Supabase configuration missing" })
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })

    let finalUserId = userId || null
    let finalReviewerName = reviewerName || "Verified Buyer"

    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "").trim()
        const { data: authData } = await supabase.auth.getUser(token)
        if (authData?.user) {
          finalUserId = authData.user.id
          if (authData.user.user_metadata?.full_name) {
            finalReviewerName = authData.user.user_metadata.full_name
          }
        }
      } catch {}
    }

    if (!finalUserId) {
      res.status(401).json({ error: "You must be signed in to submit a review" })
      return
    }

    // 1. Verify Buyer or Admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", finalUserId)
      .maybeSingle()

    const isAdmin = profile?.role === "admin"

    if (!isAdmin) {
      // Check if user has an order with this product
      const { data: buyerOrders, error: orderErr } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          order_items (
            product_id
          )
        `)
        .eq("user_id", finalUserId)
        .neq("status", "Cancelled")

      const isBuyer = Array.isArray(buyerOrders) && buyerOrders.some((ord: any) =>
        Array.isArray(ord.order_items) &&
        ord.order_items.some((it: any) => Number(it.product_id) === Number(productId))
      )

      if (!isBuyer) {
        res.status(403).json({
          error: "Verified buyers only: You can only review products you have purchased.",
        })
        return
      }
    }

    const numRating = Math.min(5, Math.max(1, Number(rating)))
    const cleanTitle = String(title).trim()
    const cleanContent = String(content).trim()
    const prodIdNum = Number(productId)

    const reviewPayload = {
      product_id: prodIdNum,
      user_id: finalUserId,
      reviewer_name: finalReviewerName,
      rating: numRating,
      title: cleanTitle,
      content: cleanContent,
      is_verified_buyer: true,
      is_approved: true,
      updated_at: new Date().toISOString(),
    }

    // 2. Upsert review
    let savedReview: any = null
    const { data, error } = await supabase
      .from("reviews")
      .upsert(reviewPayload, { onConflict: "product_id,user_id" })
      .select()
      .maybeSingle()

    if (error) {
      const { data: insertData, error: insertErr } = await supabase
        .from("reviews")
        .insert(reviewPayload)
        .select()
        .maybeSingle()

      if (insertErr) {
        res.status(400).json({ error: insertErr.message })
        return
      }
      savedReview = insertData
    } else {
      savedReview = data
    }

    // 3. Sync products table rating and review_count so it displays for everyone
    try {
      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("product_id", prodIdNum)

      if (allReviews && allReviews.length > 0) {
        const sum = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0)
        const avg = Math.round((sum / allReviews.length) * 10) / 10
        await supabase
          .from("products")
          .update({
            rating: avg,
            review_count: allReviews.length,
          })
          .eq("id", prodIdNum)
      }
    } catch {}

    res.status(200).json({ success: true, data: savedReview })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit review"
    res.status(500).json({ error: message })
  }
}
