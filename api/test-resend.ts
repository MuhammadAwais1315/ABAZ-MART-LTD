import type { VercelRequest, VercelResponse } from "@vercel/node"
import { Resend } from "resend"

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("placeholder") || apiKey.includes("your_")) {
    res.status(200).json({
      success: false,
      configured: false,
      message:
        "RESEND_API_KEY is not configured yet in your Vercel project Environment Variables.",
    })
    return
  }

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
        "Please provide a recipient email. Example: /api/test-resend?to=your-email@example.com",
    })
    return
  }

  try {
    const resend = new Resend(apiKey.trim())
    const fromAddress =
      process.env.RESEND_FROM_EMAIL?.trim() || "Abaz Mart <orders@abazmart.co.uk>"

    const testOrderNum = `ABZ-TEST-${Math.floor(100000 + Math.random() * 900000)}`

    const html = `
      <div style="font-family: Georgia, serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #eadfe2; border-radius: 12px; background: #fff;">
        <div style="background: #4a1525; color: #fff; padding: 18px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">Abaz <i style="color: #f4b8c7;">Mart</i></h2>
          <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Test Receipt</p>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 14px; color: #2b2024;">Hello,</p>
          <p style="font-size: 13px; color: #6b5b61; line-height: 1.5;">
            Your Resend API connection is successfully operational! This is a test receipt for order <strong>#${testOrderNum}</strong>.
          </p>
          <div style="margin: 20px 0; padding: 14px; background: #faf6f7; border-radius: 8px; font-size: 12px;">
            <div><strong>From:</strong> ${fromAddress}</div>
            <div style="margin-top: 4px;"><strong>To:</strong> ${recipient}</div>
            <div style="margin-top: 4px;"><strong>Status:</strong> Connected &amp; Verified</div>
          </div>
          <p style="font-size: 12px; color: #7a686f;">
            Thank you for configuring Abaz Mart · <a href="https://www.abazmart.co.uk" style="color: #b83b5e;">www.abazmart.co.uk</a>
          </p>
        </div>
      </div>
    `

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [recipient.trim()],
      subject: `[Test] Official Receipt #${testOrderNum} · Abaz Mart`,
      html,
      text: `Abaz Mart Test Receipt for order #${testOrderNum}. Resend API is active.`,
    })

    if (error) {
      res.status(200).json({
        success: false,
        configured: true,
        from: fromAddress,
        to: recipient.trim(),
        error: error.message,
      })
      return
    }

    res.status(200).json({
      success: true,
      configured: true,
      message: `Test email sent to ${recipient.trim()}`,
      emailId: data?.id,
      from: fromAddress,
      to: recipient.trim(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send test email"
    res.status(500).json({ success: false, error: message })
  }
}
