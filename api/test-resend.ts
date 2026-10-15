import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getResendClient, getSenderEmail } from "./lib/resend"
import {
  generateOrderConfirmationHtml,
  generateOrderConfirmationText,
} from "./templates/orderConfirmationTemplate"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  )

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  const resend = getResendClient()
  if (!resend) {
    res.status(200).json({
      success: false,
      configured: false,
      message:
        "RESEND_API_KEY is missing or empty. Please set RESEND_API_KEY in your Vercel project environment variables.",
    })
    return
  }

  // Get recipient email from query or body
  let recipient = ""
  if (req.method === "GET") {
    recipient = (req.query.to as string) || (req.query.email as string) || ""
  } else if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}
    recipient = body.to || body.email || ""
  }

  if (!recipient || !recipient.includes("@")) {
    res.status(400).json({
      success: false,
      configured: true,
      error:
        "Please provide a valid recipient email address. (e.g. POST { 'to': 'your-email@example.com' } or GET ?to=your-email@example.com)",
    })
    return
  }

  try {
    const fromAddress = getSenderEmail()
    const testOrderNumber = `ABZ-TEST-${Math.floor(100000 + Math.random() * 900000)}`

    const sampleData = {
      order: {
        order_number: testOrderNumber,
        subtotal: 62.0,
        shipping: 0,
        discount: 10.0,
        total: 52.0,
        estimated_delivery: "Within 2-3 business days",
      },
      customer: {
        fullName: "Test Customer",
        email: recipient.trim(),
        phone: "+44 20 7946 0958",
        address: "74 High Street",
        city: "London",
        postalCode: "W1D 3QU",
        country: "United Kingdom",
      },
      items: [
        {
          name: "Hydrating Vitamin C Serum",
          brand: "Luméra",
          option: "30ml Full Size",
          price: 38.0,
          quantity: 1,
        },
        {
          name: "Cloud Cream Gentle Cleanser",
          brand: "Eira Skin",
          option: "50ml",
          price: 24.0,
          quantity: 1,
        },
      ],
      paymentMethod: "card" as const,
    }

    const html = generateOrderConfirmationHtml(sampleData)
    const text = generateOrderConfirmationText(sampleData)

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [recipient.trim()],
      subject: `[Test] Official Receipt #${testOrderNumber} · Abaz Mart`,
      html,
      text,
    })

    if (error) {
      res.status(200).json({
        success: false,
        configured: true,
        from: fromAddress,
        to: recipient.trim(),
        error: error.message,
        tip:
          "If using the free sandbox 'onboarding@resend.dev', you can only send emails to the email address registered on your Resend account. To send to any customer email, verify your domain in resend.com/domains.",
      })
      return
    }

    res.status(200).json({
      success: true,
      configured: true,
      message: `Test order receipt sent successfully to ${recipient.trim()}!`,
      emailId: data?.id,
      from: fromAddress,
      to: recipient.trim(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send test email"
    res.status(500).json({ success: false, error: message })
  }
}
