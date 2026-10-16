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
    estimated_delivery?: string
    created_at?: string
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
  storeUrl?: string
}

function formatGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount)
}

function buildHtmlReceipt(data: OrderConfirmationPayload): string {
  const {
    order,
    customer,
    items = [],
    paymentMethod,
    storeUrl = "https://www.abazmart.co.uk",
  } = data
  const isBankTransfer = paymentMethod === "bank_transfer"

  const paymentLabel = isBankTransfer
    ? "Direct Bank Transfer (BACS / Faster Payments)"
    : "Credit / Debit Card / Digital Wallet (Stripe)"

  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })

  const estDelivery = order.estimated_delivery || "Within 3-5 business days"

  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 14px 10px; border-bottom: 1px solid #f3eef0; vertical-align: top;">
          <div style="font-size: 13.5px; font-weight: 600; color: #2b2024; line-height: 1.35;">${item.name}</div>
          <div style="font-size: 11.5px; color: #7a686f; margin-top: 3px;">
            ${item.brand ? `${item.brand} · ` : ""}${item.option || "Standard"}
          </div>
        </td>
        <td style="padding: 14px 10px; border-bottom: 1px solid #f3eef0; text-align: center; vertical-align: top; font-size: 13px; color: #2b2024;">
          ${item.quantity}
        </td>
        <td style="padding: 14px 10px; border-bottom: 1px solid #f3eef0; text-align: right; vertical-align: top; font-size: 13px; color: #5a4b51;">
          ${formatGbp(item.price)}
        </td>
        <td style="padding: 14px 10px; border-bottom: 1px solid #f3eef0; text-align: right; vertical-align: top; font-size: 13.5px; font-weight: 700; color: #2b2024;">
          ${formatGbp(item.price * item.quantity)}
        </td>
      </tr>
    `,
    )
    .join("")

  const bankTransferCard = isBankTransfer
    ? `
      <div style="background-color: #fef8ee; border: 1px solid #fde68a; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 13.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
          Bank Transfer Payment Instructions
        </h3>
        <p style="margin: 0 0 14px 0; font-size: 12.5px; color: #78350f; line-height: 1.5;">
          Please send a bank transfer of <strong>${formatGbp(order.total)}</strong> to our official <strong>Wise</strong> business account using your order reference:
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #fef3c7; border-radius: 8px; font-size: 12px; color: #451a03; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fef3c7; width: 50%;">
              <span style="display: block; font-size: 10px; text-transform: uppercase; color: #92400e;">Beneficiary</span>
              <strong>Abaz Mart Ltd</strong>
            </td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fef3c7; width: 50%;">
              <span style="display: block; font-size: 10px; text-transform: uppercase; color: #92400e;">Bank</span>
              <strong>Wise</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fef3c7; width: 50%;">
              <span style="display: block; font-size: 10px; text-transform: uppercase; color: #92400e;">Sort Code</span>
              <strong style="font-family: monospace; font-size: 13px; color: #b83b5e;">60-84-64</strong>
            </td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fef3c7; width: 50%;">
              <span style="display: block; font-size: 10px; text-transform: uppercase; color: #92400e;">Account Number</span>
              <strong style="font-family: monospace; font-size: 13px; color: #b83b5e;">60869680</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fef3c7; width: 50%;">
              <span style="display: block; font-size: 10px; text-transform: uppercase; color: #92400e;">SWIFT / BIC</span>
              <strong style="font-family: monospace; font-size: 12px;">TRWIGB2LXXX</strong>
            </td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #fef3c7; width: 50%;">
              <span style="display: block; font-size: 10px; text-transform: uppercase; color: #92400e;">IBAN</span>
              <strong style="font-family: monospace; font-size: 11px;">GB71 TRWI 6084 6460 8696 80</strong>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px 14px; background-color: #fffbeb;">
              <span style="display: block; font-size: 10px; text-transform: uppercase; color: #92400e;">Payment Reference (Important)</span>
              <strong style="font-family: monospace; font-size: 14px; color: #b83b5e;">${order.order_number}</strong>
            </td>
          </tr>
        </table>
        <p style="margin: 10px 0 0 0; font-size: 11px; color: #92400e;">
          * Office 951 60 Tottenham Court Road, Fitzrovia, London W1T 2EW · Dispatched upon clearance.
        </p>
      </div>
    `
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Official Order Receipt #${order.order_number} · Abaz Mart</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f7f3f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #2b2024;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #eadfe2; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
    <div style="height: 4px; background: linear-gradient(90deg, #b83b5e 0%, #d86280 50%, #c5a880 100%);"></div>

    <!-- Header -->
    <div style="background-color: #4a1525; padding: 28px 24px 22px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">
        Abaz <span style="color: #f4b8c7; font-style: italic;">Mart</span>
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #e5c3cc;">
        Luxury Skincare &amp; Beauty · Official Receipt
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 28px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 1px solid #eadfe2; padding-bottom: 18px; margin-bottom: 22px;">
        <tr>
          <td style="vertical-align: top;">
            <div style="font-size: 10.5px; text-transform: uppercase; font-weight: 700; color: #b83b5e; letter-spacing: 0.8px;">Official Order Receipt</div>
            <div style="font-size: 18px; font-weight: 700; font-family: monospace; color: #2b2024; margin-top: 3px;">#${order.order_number}</div>
            <div style="font-size: 12px; color: #7a686f; margin-top: 2px;">Date: ${orderDate}</div>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <div style="display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; ${
              isBankTransfer
                ? "background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;"
                : "background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0;"
            }">
              ${isBankTransfer ? "Awaiting Transfer" : "Payment Confirmed"}
            </div>
            <div style="font-size: 11.5px; color: #7a686f; margin-top: 6px;">
              Est. Delivery: <strong style="color: #2b2024;">${estDelivery}</strong>
            </div>
          </td>
        </tr>
      </table>

      <!-- Customer & Payment Details -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; font-size: 12.5px; line-height: 1.45;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 12px;">
            <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #b83b5e; margin-bottom: 6px;">Delivered To</div>
            <div style="font-weight: 700; color: #2b2024; font-size: 13px;">${customer.fullName}</div>
            <div style="color: #615056; margin-top: 2px;">${customer.address}</div>
            <div style="color: #615056;">${customer.city}, ${customer.postalCode}</div>
            <div style="color: #615056;">${customer.country}</div>
            ${customer.phone ? `<div style="color: #615056; margin-top: 4px;">Phone: ${customer.phone}</div>` : ""}
          </td>
          <td style="width: 50%; vertical-align: top; padding-left: 12px;">
            <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #b83b5e; margin-bottom: 6px;">Payment Information</div>
            <div style="color: #615056;">Method: <strong style="color: #2b2024;">${paymentLabel}</strong></div>
            <div style="color: #615056; margin-top: 4px;">
              Status: <strong style="color: ${isBankTransfer ? "#b45309" : "#15803d"};">${isBankTransfer ? "Awaiting Settlement" : "Paid in Full"}</strong>
            </div>
            <div style="color: #615056; margin-top: 4px;">
              Dispatched To: <strong style="color: #2b2024;">${customer.email}</strong>
            </div>
          </td>
        </tr>
      </table>

      ${bankTransferCard}

      <!-- Ordered Items -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #b83b5e; margin-bottom: 8px;">Ordered Items</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <thead>
            <tr style="background-color: #faf6f7; border-bottom: 1.5px solid #eadfe2;">
              <th style="padding: 10px; text-align: left; font-size: 10.5px; font-weight: 700; color: #7a686f; text-transform: uppercase;">Item</th>
              <th style="padding: 10px; text-align: center; font-size: 10.5px; font-weight: 700; color: #7a686f; text-transform: uppercase; width: 40px;">Qty</th>
              <th style="padding: 10px; text-align: right; font-size: 10.5px; font-weight: 700; color: #7a686f; text-transform: uppercase; width: 70px;">Price</th>
              <th style="padding: 10px; text-align: right; font-size: 10.5px; font-weight: 700; color: #7a686f; text-transform: uppercase; width: 75px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <!-- Financial Totals -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
        <tr>
          <td style="width: 50%;"></td>
          <td style="width: 50%;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12.5px; color: #615056;">
              <tr>
                <td style="padding: 4px 0;">Subtotal</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #2b2024;">${formatGbp(order.subtotal)}</td>
              </tr>
              ${
                order.discount > 0
                  ? `
              <tr>
                <td style="padding: 4px 0; color: #16a34a;">Discount / Promo</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a;">-${formatGbp(order.discount)}</td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td style="padding: 4px 0;">Standard Shipping</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #2b2024;">
                  ${order.shipping === 0 ? "Free" : formatGbp(order.shipping)}
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">VAT (Included)</td>
                <td style="padding: 4px 0; text-align: right; color: #7a686f;">£0.00</td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top: 10px; border-top: 1.5px solid #b83b5e;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size: 14px; font-weight: 700; color: #2b2024;">Total Paid</td>
                      <td style="font-size: 17px; font-weight: 700; color: #b83b5e; text-align: right;">${formatGbp(order.total)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- CTA -->
      <div style="text-align: center; margin: 28px 0 12px 0;">
        <a href="${storeUrl}" style="display: inline-block; background-color: #b83b5e; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
          Explore More at Abaz Mart
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #faf6f7; border-top: 1px solid #eadfe2; padding: 22px 24px; text-align: center; font-size: 11.5px; color: #7a686f; line-height: 1.6;">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #2b2024;">
        30-Day Happiness Guarantee · Free Returns on All Orders
      </p>
      <p style="margin: 0 0 8px 0;">
        Questions or need support? Simply reply to this email or reach us at <a href="mailto:care@abazmart.co.uk" style="color: #b83b5e; text-decoration: underline;">care@abazmart.co.uk</a> · +44 20 7946 0958
      </p>
      <div style="border-top: 1px solid #efe4e7; margin-top: 12px; padding-top: 12px; font-size: 10.5px; color: #9c8a91;">
        Abaz Mart Ltd · Registered in England &amp; Wales · Company No. 17094173<br/>
        Office 951, 60 Tottenham Court Road, Fitzrovia, London W1T 2EW, United Kingdom
      </div>
    </div>
  </div>
</body>
</html>`
}

function buildTextReceipt(data: OrderConfirmationPayload): string {
  const { order, customer, items = [], paymentMethod } = data
  const isBankTransfer = paymentMethod === "bank_transfer"

  const lines = [
    `ABAZ MART · OFFICIAL ORDER RECEIPT`,
    `========================================`,
    `Order Number: #${order.order_number}`,
    `Date: ${order.created_at || new Date().toISOString().split("T")[0]}`,
    `Status: ${isBankTransfer ? "Awaiting Bank Settlement" : "Payment Confirmed"}`,
    `Estimated Delivery: ${order.estimated_delivery || "Within 3-5 business days"}`,
    ``,
    `DELIVERED TO:`,
    `${customer.fullName}`,
    `${customer.address}`,
    `${customer.city}, ${customer.postalCode}`,
    `${customer.country}`,
    customer.phone ? `Phone: ${customer.phone}` : "",
    ``,
    `ITEMS:`,
  ]

  items.forEach((item) => {
    lines.push(
      `- ${item.name} (${item.brand ? `${item.brand} · ` : ""}${item.option || "Standard"}) x${item.quantity}: ${formatGbp(item.price * item.quantity)}`,
    )
  })

  lines.push(
    ``,
    `FINANCIAL SUMMARY:`,
    `Subtotal: ${formatGbp(order.subtotal)}`,
  )

  if (order.discount > 0) {
    lines.push(`Discount: -${formatGbp(order.discount)}`)
  }

  lines.push(
    `Shipping: ${order.shipping === 0 ? "Free" : formatGbp(order.shipping)}`,
    `VAT (Included): £0.00`,
    `TOTAL: ${formatGbp(order.total)}`,
  )

  if (isBankTransfer) {
    lines.push(
      ``,
      `OFFICIAL UK BANK TRANSFER DETAILS:`,
      `Bank: Wise`,
      `Account Name: Abaz Mart Ltd`,
      `Sort Code: 60-84-64`,
      `Account Number: 60869680`,
      `IBAN: GB71 TRWI 6084 6460 8696 80`,
      `SWIFT / BIC: TRWIGB2LXXX`,
      `Payment Reference: ${order.order_number}`,
      `Registered Address: Office 951 60 Tottenham Court Road, Fitzrovia, London W1T 2EW, UK`,
    )
  }

  lines.push(
    ``,
    `Thank you for choosing Abaz Mart!`,
    `Abaz Mart Ltd · Office 951 60 Tottenham Court Road, London W1T 2EW · Company No. 17094173 · care@abazmart.co.uk`,
  )

  return lines.filter(Boolean).join("\n")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("placeholder") || apiKey.includes("your_")) {
    console.info("[Resend] Skipped: RESEND_API_KEY is not configured.")
    res.status(200).json({
      success: false,
      configured: false,
      message: "RESEND_API_KEY environment variable is not configured. Email confirmation skipped.",
    })
    return
  }

  try {
    const payload: OrderConfirmationPayload =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}

    const { order, customer, items = [], paymentMethod } = payload

    if (!customer?.email || !order?.order_number) {
      res.status(400).json({
        success: false,
        error: "Missing required order details (customer.email and order.order_number are required).",
      })
      return
    }

    const resend = new Resend(apiKey.trim())
    const fromAddress =
      process.env.RESEND_FROM_EMAIL?.trim() || "Abaz Mart <orders@abazmart.co.uk>"

    const htmlBody = buildHtmlReceipt({
      order,
      customer,
      items,
      paymentMethod,
    })
    const textBody = buildTextReceipt({
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
