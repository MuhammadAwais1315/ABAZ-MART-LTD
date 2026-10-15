import type { VercelRequest, VercelResponse } from "@vercel/node"
import { Resend } from "resend"

interface OrderItemPayload {
  name: string
  brand?: string
  option?: string
  price: number
  quantity: number
}

interface OrderConfirmationPayload {
  order: {
    order_number: string
    subtotal: number
    shipping: number
    discount: number
    total: number
    estimated_delivery: string
  }
  customer: {
    fullName: string
    email: string
    phone?: string
    address: string
    city: string
    postalCode: string
    country: string
  }
  items: OrderItemPayload[]
  paymentMethod: "card" | "bank_transfer"
}

function formatGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount)
}

function buildHtmlReceipt(data: OrderConfirmationPayload): string {
  const { order, customer, items, paymentMethod } = data
  const isBankTransfer = paymentMethod === "bank_transfer"
  const paymentLabel = isBankTransfer
    ? "Direct Bank Transfer (BACS)"
    : "Credit / Debit Card / Digital Wallet (Stripe)"

  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f3eef0; font-size: 13px; color: #2b2024;">
          <strong>${item.name}</strong><br/>
          <span style="font-size: 11px; color: #6b5b61;">${item.brand ? `${item.brand} · ` : ""}${item.option || "Standard"}</span>
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f3eef0; font-size: 13px; color: #2b2024; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f3eef0; font-size: 13px; color: #2b2024; text-align: right;">
          ${formatGbp(item.price)}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #f3eef0; font-size: 13px; font-weight: bold; color: #2b2024; text-align: right;">
          ${formatGbp(item.price * item.quantity)}
        </td>
      </tr>
    `,
    )
    .join("")

  const bankDetailsSection = isBankTransfer
    ? `
      <div style="background-color: #fef8ee; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">Please Complete Your Bank Transfer</h4>
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #78350f;">
          Please transfer <strong>${formatGbp(order.total)}</strong> using the following details:
        </p>
        <table style="width: 100%; font-size: 12px; color: #451a03; background: #ffffff; border: 1px solid #fef3c7; border-radius: 6px; padding: 8px;">
          <tr><td><strong>Bank:</strong> Barclays UK</td><td><strong>Sort Code:</strong> 20-00-00</td></tr>
          <tr><td><strong>Account No:</strong> 83920184</td><td><strong>Reference:</strong> <span style="color: #b83b5e; font-weight: bold;">${order.order_number}</span></td></tr>
        </table>
      </div>
    `
    : ""

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Receipt #${order.order_number}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fdfbfa; margin: 0; padding: 24px; color: #2b2024;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #eadfe2; overflow: hidden;">
        <!-- Header -->
        <div style="background-color: #b83b5e; padding: 20px 24px; color: #ffffff; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-family: Georgia, serif; letter-spacing: 0.5px;">Abaz Mart</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Luxury Skincare &amp; Beauty · Official Order Receipt</p>
        </div>

        <!-- Body -->
        <div style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #eadfe2; padding-bottom: 16px;">
            <div>
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #b83b5e; font-weight: bold;">Receipt Number</p>
              <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #2b2024; font-family: monospace;">#${order.order_number}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #6b5b61;">Est. Delivery</p>
              <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold; color: #2b2024;">${order.estimated_delivery}</p>
            </div>
          </div>

          <!-- Customer & Payment Info -->
          <table style="width: 100%; margin-bottom: 24px; font-size: 12px;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; color: #b83b5e; font-weight: bold;">Delivered To</p>
                <p style="margin: 0; font-weight: bold; color: #2b2024;">${customer.fullName}</p>
                <p style="margin: 2px 0; color: #6b5b61;">${customer.address}</p>
                <p style="margin: 2px 0; color: #6b5b61;">${customer.city}, ${customer.postalCode}</p>
                <p style="margin: 2px 0; color: #6b5b61;">${customer.country}</p>
                ${customer.phone ? `<p style="margin: 2px 0; color: #6b5b61;">Phone: ${customer.phone}</p>` : ""}
              </td>
              <td style="vertical-align: top; width: 50%;">
                <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; color: #b83b5e; font-weight: bold;">Payment Details</p>
                <p style="margin: 0; color: #6b5b61;">Method: <strong style="color: #2b2024;">${paymentLabel}</strong></p>
                <p style="margin: 4px 0; color: #6b5b61;">Status: <strong style="color: ${isBankTransfer ? "#b45309" : "#15803d"};">${isBankTransfer ? "Awaiting Bank Settlement" : "Payment Confirmed"}</strong></p>
              </td>
            </tr>
          </table>

          ${bankDetailsSection}

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #faf6f7;">
                <th style="padding: 8px; text-align: left; font-size: 11px; color: #b83b5e; text-transform: uppercase;">Item</th>
                <th style="padding: 8px; text-align: center; font-size: 11px; color: #b83b5e; text-transform: uppercase;">Qty</th>
                <th style="padding: 8px; text-align: right; font-size: 11px; color: #b83b5e; text-transform: uppercase;">Price</th>
                <th style="padding: 8px; text-align: right; font-size: 11px; color: #b83b5e; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Financial Breakdown -->
          <div style="border-top: 1px solid #eadfe2; padding-top: 12px; margin-left: auto; width: 220px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #6b5b61;">
              <span>Subtotal:</span>
              <span>${formatGbp(order.subtotal)}</span>
            </div>
            ${
              order.discount > 0
                ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #16a34a;">
              <span>Discount:</span>
              <span>-${formatGbp(order.discount)}</span>
            </div>
            `
                : ""
            }
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #6b5b61;">
              <span>Shipping:</span>
              <span>${order.shipping === 0 ? "Free" : formatGbp(order.shipping)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eadfe2; font-size: 15px; font-weight: bold; color: #b83b5e;">
              <span>Total Paid:</span>
              <span>${formatGbp(order.total)}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #faf6f7; padding: 16px 24px; text-align: center; font-size: 11px; color: #6b5b61; border-top: 1px solid #eadfe2;">
          <p style="margin: 0 0 4px 0;">Abaz Mart Ltd · Luxury Skincare &amp; Beauty</p>
          <p style="margin: 0;">Registered in England &amp; Wales · care@abazmart.com · +44 20 7946 0958</p>
        </div>
      </div>
    </body>
    </html>
  `
}

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

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey || resendApiKey.includes("placeholder")) {
    console.info("RESEND_API_KEY is not configured. Email confirmation skipped.")
    res.status(200).json({
      success: false,
      message: "RESEND_API_KEY is not configured in environment variables.",
    })
    return
  }

  try {
    const body: OrderConfirmationPayload =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}

    const { order, customer, items, paymentMethod } = body

    if (!customer?.email || !order?.order_number) {
      res.status(400).json({ error: "Missing required order or customer details" })
      return
    }

    const resend = new Resend(resendApiKey)
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "Abaz Mart <orders@resend.dev>"

    const htmlContent = buildHtmlReceipt({
      order,
      customer,
      items: items || [],
      paymentMethod,
    })

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [customer.email],
      subject: `Official Receipt for Order #${order.order_number} - Abaz Mart`,
      html: htmlContent,
    })

    if (error) {
      console.error("Resend API error:", error)
      res.status(200).json({
        success: false,
        error: error.message,
      })
      return
    }

    res.status(200).json({
      success: true,
      emailId: data?.id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to dispatch email confirmation"
    console.error("Email dispatch error:", message)
    res.status(500).json({ error: message })
  }
}
