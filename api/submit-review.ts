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

    const reviewPayload = {
      product_id: Number(productId),
      user_id: finalUserId,
      reviewer_name: finalReviewerName,
      rating: Math.min(5, Math.max(1, Number(rating))),
      title: String(title).trim(),
      content: String(content).trim(),
      is_verified_buyer: true,
      is_approved: true,
      updated_at: new Date().toISOString(),
    }

    // Try upsert first
    const { data, error } = await supabase
      .from("reviews")
      .upsert(reviewPayload, { onConflict: "product_id,user_id" })
      .select()
      .maybeSingle()

    if (error) {
      // Fallback: try insert
      const { data: insertData, error: insertErr } = await supabase
        .from("reviews")
        .insert(reviewPayload)
        .select()
        .maybeSingle()

      if (insertErr) {
        res.status(400).json({ error: insertErr.message })
        return
      }

      res.status(200).json({ success: true, data: insertData })
      return
    }

    res.status(200).json({ success: true, data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit review"
    res.status(500).json({ error: message })
  }
}
