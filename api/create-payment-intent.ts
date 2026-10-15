import type { VercelRequest, VercelResponse } from "@vercel/node"
import Stripe from "stripe"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  )

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!stripeSecretKey || stripeSecretKey.includes("placeholder")) {
    res.status(200).json({
      clientSecret: null,
      mockMode: true,
      message: "Stripe secret key not yet configured in environment variables.",
    })
    return
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}
    const { amount, currency = "gbp", orderNumber = "", customerEmail = "" } = body

    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ error: "Invalid payment amount" })
      return
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
    })

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount)), // Amount in pence/cents
      currency: String(currency).toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderNumber: String(orderNumber),
        customerEmail: String(customerEmail),
      },
      ...(customerEmail && String(customerEmail).includes("@")
        ? { receipt_email: String(customerEmail).trim() }
        : {}),
    })

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      isLive: true,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create PaymentIntent"
    console.error("Stripe error:", message)
    res.status(500).json({ error: message })
  }
}
