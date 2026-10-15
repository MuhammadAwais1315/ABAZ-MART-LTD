import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getResendClient, getSenderEmail } from "./lib/resend"
import {
  generateOrderConfirmationHtml,
  generateOrderConfirmationText,
  OrderConfirmationData,
} from "./templates/orderConfirmationTemplate"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
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
    res.status(405).json({ error: "Method not allowed. Use POST." })
    return
  }

  const resend = getResendClient()
  if (!resend) {
    console.info("[Resend] Skipped: RESEND_API_KEY is not configured or in placeholder state.")
    res.status(200).json({
      success: false,
      configured: false,
      message: "RESEND_API_KEY environment variable is not configured. Email confirmation skipped.",
    })
    return
  }

  try {
    const payload: OrderConfirmationData =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}

    const { order, customer, items = [], paymentMethod } = payload

    if (!customer?.email || !order?.order_number) {
      res.status(400).json({
        success: false,
        error: "Missing required order details (customer.email and order.order_number are required).",
      })
      return
    }

    const fromAddress = getSenderEmail()
    const htmlBody = generateOrderConfirmationHtml({
      order,
      customer,
      items,
      paymentMethod,
    })
    const textBody = generateOrderConfirmationText({
      order,
      customer,
      items,
      paymentMethod,
    })

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [customer.email.trim()],
      subject: `Official Receipt for Order #${order.order_number} · Abaz Mart`,
      html: htmlBody,
      text: textBody,
    })

    if (error) {
      console.error("[Resend] Delivery error:", error)
      res.status(200).json({
        success: false,
        configured: true,
        error: error.message,
      })
      return
    }

    console.info(`[Resend] Order receipt #${order.order_number} sent to ${customer.email} (ID: ${data?.id})`)
    res.status(200).json({
      success: true,
      configured: true,
      emailId: data?.id,
      recipient: customer.email,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send order confirmation email"
    console.error("[Resend] Handler exception:", message)
    res.status(500).json({ success: false, error: message })
  }
}
