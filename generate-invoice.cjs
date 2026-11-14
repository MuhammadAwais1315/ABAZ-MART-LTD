/**
 * generate-invoice.cjs
 * Generates an official wholesale invoice PDF and responsive HTML for Abaz Mart Ltd.
 *
 * Output:
 *   1. ./invoices/INV-2026-0001.pdf
 *   2. ./invoices/INV-2026-0001.html
 */

const { jsPDF } = require("jspdf")
const fs = require("fs")
const path = require("path")

// ─── Invoice Data ───────────────────────────────────────────────────────────

const INVOICE = {
  number: "INV-2026-0001",
  date: "14 November 2026",
  dueDate: "14 November 2026",
  orderNumber: "ABZ-WHL-141126",
  paymentTerms: "Paid in Full (Card)",
}

const SELLER = {
  name: "Abaz Mart Ltd",
  tagline: "Luxury Skincare, Perfumes & Beauty",
  address: "Office 951, 60 Tottenham Court Road",
  city: "Fitzrovia, London W1T 2EW",
  country: "United Kingdom",
  companyNo: "17094173",
  email: "care@abazmart.co.uk",
  phone: "+44 (0)20 3432 2415",
  website: "www.abazmart.co.uk",
}

const BUYER = {
  name: "Maira Shakoor",
  company: "ALINA MART LTD",
  address: "12 Crispin Crescent, Wallington",
  city: "Surrey, Croydon",
  postcode: "CR0 4UD",
  country: "United Kingdom",
  phone: "+44 7380 415606",
}

const SHIPPING = {
  name: "Maira Shakoor",
  company: "BSL Exchange",
  address: "Unit 0017, Attic Self Storage, 806 Ripple Road",
  city: "Barking, London",
  postcode: "IG11 0TT",
  country: "United Kingdom",
  phone: "07380 415606",
}

const PAYMENT = {
  method: "Mastercard (7183)",
  status: "PAID",
  paymentDate: "14 November 2026",
}

const LINE_ITEMS = [
  {
    description: "Afnan Lynked Freedom Eau de Parfum 100ml / 3.4 fl oz",
    details: "Luxury EDP Spray for Men & Unisex | Aromatic Spicy Fragrance",
    sku: "GTIN / EAN: 6290171077428",
    gtin: "EAN-13: 6290171077428",
    quantity: 120,
    unitPrice: 25.0,
  },
]

// ─── Calculations ───────────────────────────────────────────────────────────

const subtotal = LINE_ITEMS.reduce(
  (sum, item) => sum + item.quantity * item.unitPrice,
  0,
)
const shippingFee = 0.0 // Free UK Delivery
const vatAmount = 0.0 // VAT Included / Zero-rated Wholesale
const grandTotal = subtotal + vatAmount + shippingFee
const amountPaid = grandTotal
const balanceDue = 0.0

function fmtPrice(amount) {
  return `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── 1. PDF Generation ──────────────────────────────────────────────────────

function generatePdf() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = 210
  const pageHeight = 297
  const marginL = 15
  const marginR = 195
  const contentWidth = marginR - marginL

  // Brand colours
  const rose = [184, 59, 94]
  const ink = [43, 32, 36]
  const muted = [107, 91, 97]
  const border = [234, 223, 226]
  const lightBg = [254, 242, 245]
  const white = [255, 255, 255]
  const greenBg = [236, 253, 245]
  const greenText = [4, 120, 87]

  let y = 0

  // ── Top Accent Bar ──
  doc.setFillColor(...rose)
  doc.rect(0, 0, pageWidth, 4.5, "F")
  y = 16

  // ── Header: Company Name & Invoice Badge ──
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(...rose)
  doc.text("Abaz Mart", marginL, y)

  // Invoice badge on the right
  doc.setFillColor(...lightBg)
  doc.roundedRect(138, y - 9, 57, 12, 3, 3, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...rose)
  doc.text("COMMERCIAL INVOICE", 166.5, y - 1, { align: "center" })

  y += 5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...muted)
  doc.text(`${SELLER.name} · ${SELLER.tagline}`, marginL, y)

  y += 4
  doc.text(`${SELLER.address}, ${SELLER.city}`, marginL, y)
  y += 3.5
  doc.text(
    `Registered in England & Wales · Company No. ${SELLER.companyNo}`,
    marginL,
    y,
  )
  y += 3.5
  doc.text(
    `${SELLER.email} · ${SELLER.phone} · ${SELLER.website}`,
    marginL,
    y,
  )

  // ── Invoice Meta (right-aligned) ──
  const metaX = marginR
  let metaY = 22
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...ink)
  doc.text(`Invoice: ${INVOICE.number}`, metaX, metaY, { align: "right" })
  metaY += 4.5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...muted)
  doc.text(`Date: ${INVOICE.date}`, metaX, metaY, { align: "right" })
  metaY += 4
  doc.text(`Order No: ${INVOICE.orderNumber}`, metaX, metaY, { align: "right" })
  metaY += 4
  doc.text(`Payment: ${PAYMENT.method}`, metaX, metaY, { align: "right" })
  metaY += 4
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...greenText)
  doc.text(`Payment Status: PAID IN FULL`, metaX, metaY, { align: "right" })

  // ── Divider ──
  y += 8
  doc.setDrawColor(...border)
  doc.setLineWidth(0.4)
  doc.line(marginL, y, marginR, y)
  y += 7

  // ── Bill To & Ship To ──
  const col1X = marginL
  const col2X = 112

  // Bill To (Customer & Billing Address)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(...rose)
  doc.text("BILLING ADDRESS (CUSTOMER)", col1X, y)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(...ink)
  doc.text(BUYER.company, col1X, y + 5.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...muted)
  doc.text(`Attn: ${BUYER.name}`, col1X, y + 10)
  doc.text(BUYER.address, col1X, y + 14)
  doc.text(BUYER.city, col1X, y + 18)
  doc.text(BUYER.postcode, col1X, y + 22)
  doc.text(BUYER.country, col1X, y + 26)
  doc.text(`Tel: ${BUYER.phone}`, col1X, y + 30)

  // Ship To (Delivery Destination)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(...rose)
  doc.text("SHIPPING ADDRESS (DELIVERY)", col2X, y)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(...ink)
  doc.text(SHIPPING.company, col2X, y + 5.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...muted)
  doc.text(`Attn: ${SHIPPING.name}`, col2X, y + 10)
  doc.text(SHIPPING.address, col2X, y + 14)
  doc.text(SHIPPING.city, col2X, y + 18)
  doc.text(SHIPPING.postcode, col2X, y + 22)
  doc.text(SHIPPING.country, col2X, y + 26)
  doc.text(`Tel: ${SHIPPING.phone}`, col2X, y + 30)

  y += 37

  // ── Divider ──
  doc.setDrawColor(...border)
  doc.line(marginL, y, marginR, y)
  y += 6

  // ── Line Items Table ──
  const colDesc = marginL
  const colSKU = 104
  const colQty = 136
  const colUnit = 160
  const colTotal = marginR

  doc.setFillColor(...rose)
  doc.roundedRect(marginL, y - 4, contentWidth, 8.5, 1.5, 1.5, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...white)
  doc.text("DESCRIPTION", colDesc + 4, y + 1)
  doc.text("IDENTIFIERS", colSKU, y + 1)
  doc.text("QTY", colQty + 5, y + 1, { align: "center" })
  doc.text("UNIT RATE", colUnit + 5, y + 1, { align: "center" })
  doc.text("AMOUNT (GBP)", colTotal - 4, y + 1, { align: "right" })

  y += 9.5

  LINE_ITEMS.forEach((item, idx) => {
    const lineTotal = item.quantity * item.unitPrice
    const rowY = y

    if (idx % 2 === 0) {
      doc.setFillColor(252, 249, 250)
      doc.rect(marginL, rowY - 4.5, contentWidth, 19, "F")
    }

    // Product name
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(...ink)
    doc.text(item.description, colDesc + 4, rowY)

    // Product details
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...muted)
    doc.text(item.details, colDesc + 4, rowY + 4.5)

    // SKU + GTIN
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...muted)
    doc.text(item.sku, colSKU, rowY)
    doc.text(item.gtin, colSKU, rowY + 4.5)

    // Quantity
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...ink)
    doc.text(item.quantity.toString(), colQty + 5, rowY, { align: "center" })

    // Unit Price
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.setTextColor(...ink)
    doc.text(fmtPrice(item.unitPrice), colUnit + 5, rowY, { align: "center" })

    // Line Total
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...ink)
    doc.text(fmtPrice(lineTotal), colTotal - 4, rowY, { align: "right" })

    y += 21
  })

  // ── Totals Section ──
  y += 2
  doc.setDrawColor(...border)
  doc.line(115, y, marginR, y)
  y += 6

  const labelX = 125
  const valX = marginR - 4

  // Subtotal
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...muted)
  doc.text("Subtotal (120 units @ £25.00)", labelX, y)
  doc.setTextColor(...ink)
  doc.text(fmtPrice(subtotal), valX, y, { align: "right" })
  y += 5.5

  // Shipping
  doc.setTextColor(...muted)
  doc.text("Shipping & Delivery (UK Mainland)", labelX, y)
  doc.setTextColor(...ink)
  doc.text("FREE (£0.00)", valX, y, { align: "right" })
  y += 5.5

  // VAT
  doc.setTextColor(...muted)
  doc.text("VAT / Tax (Included / Zero-rated)", labelX, y)
  doc.setTextColor(...ink)
  doc.text("£0.00", valX, y, { align: "right" })
  y += 4

  doc.setDrawColor(...border)
  doc.line(115, y, marginR, y)
  y += 6

  // Total
  doc.setFillColor(...lightBg)
  doc.roundedRect(115, y - 5, marginR - 115, 12, 2, 2, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(...rose)
  doc.text("TOTAL AMOUNT", labelX, y + 2)
  doc.setFontSize(12)
  doc.text(fmtPrice(grandTotal), valX, y + 2, { align: "right" })

  y += 14

  // Amount Paid & Balance Due
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...muted)
  doc.text("Amount Paid via Mastercard (7183)", labelX, y)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...greenText)
  doc.text(fmtPrice(amountPaid), valX, y, { align: "right" })
  y += 5

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...muted)
  doc.text("Balance Due", labelX, y)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...ink)
  doc.text(fmtPrice(balanceDue), valX, y, { align: "right" })

  y += 10

  // ── Payment Status Badge ──
  doc.setFillColor(...greenBg)
  doc.roundedRect(marginL, y, 90, 11, 2, 2, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(...greenText)
  doc.text(`✓  PAYMENT CONFIRMED · PAID IN FULL`, marginL + 5, y + 7)

  y += 18

  // ── Bank Details for Reference ──
  doc.setDrawColor(...border)
  doc.line(marginL, y, marginR, y)
  y += 5.5

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...rose)
  doc.text("SELLER PAYMENT & COMPANY REFERENCE", marginL, y)
  y += 5

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(...muted)
  doc.text(
    "Beneficiary: Abaz Mart Ltd  |  Sort Code: 04-00-75  |  Account No: 34197299  |  Bank: Revolut Ltd, London",
    marginL,
    y,
  )
  y += 4
  doc.text(
    "Registered Office: Office 951, 60 Tottenham Court Road, Fitzrovia, London W1T 2EW · England & Wales No. 17094173",
    marginL,
    y,
  )

  y += 6

  // ── Notes ──
  doc.setDrawColor(...border)
  doc.line(marginL, y, marginR, y)
  y += 5

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...rose)
  doc.text("TERMS & CONDITIONS", marginL, y)
  y += 4.5

  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.8)
  doc.setTextColor(...muted)
  const notes = [
    "1. Products are 100% authentic, brand-new in original retail packaging with intact factory seals.",
    "2. Delivery: Dispatched to BSL Exchange, Attic Self Storage, Barking IG11 0TT via tracked courier service.",
    "3. Electronic invoice: Valid without physical signature. All queries: care@abazmart.co.uk.",
  ]
  notes.forEach((note) => {
    doc.text(note, marginL, y)
    y += 3.8
  })

  // ── Footer ──
  const footerY = pageHeight - 12
  doc.setDrawColor(...border)
  doc.line(marginL, footerY - 4, marginR, footerY - 4)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(...muted)
  doc.text(
    `© 2026 ${SELLER.name} · ${SELLER.address}, ${SELLER.city} · ${SELLER.email} · ${SELLER.website}`,
    pageWidth / 2,
    footerY,
    { align: "center" },
  )

  // Bottom accent bar
  doc.setFillColor(...rose)
  doc.rect(0, pageHeight - 3, pageWidth, 3, "F")

  // Output PDF
  const outDir = path.join(__dirname, "invoices")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const pdfPath = path.join(outDir, `${INVOICE.number}.pdf`)
  fs.writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")))
  return pdfPath
}

// ─── 2. HTML Invoice Generation ─────────────────────────────────────────────

function generateHtml() {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${INVOICE.number} · Abaz Mart Ltd</title>
  <style>
    :root {
      --rose: #b83b5e;
      --rose-light: #fef2f5;
      --ink: #2b2024;
      --muted: #6b5b61;
      --border: #eadfe2;
      --green: #047857;
      --green-bg: #ecfdf5;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--ink);
      background: #f7f4f5;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 840px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(43, 32, 36, 0.06);
      overflow: hidden;
    }
    .accent-bar { height: 6px; background: var(--rose); }
    .print-actions {
      max-width: 840px;
      margin: 0 auto 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      background: var(--rose);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover { opacity: 0.92; }
    .invoice-body { padding: 40px; }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
      gap: 24px;
    }
    .brand h1 {
      font-size: 28px;
      color: var(--rose);
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand p { font-size: 13px; color: var(--muted); margin-top: 4px; line-height: 1.6; }
    .meta { text-align: right; }
    .badge-invoice {
      display: inline-block;
      background: var(--rose-light);
      color: var(--rose);
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .meta h2 { font-size: 18px; color: var(--ink); font-weight: 700; }
    .meta p { font-size: 13px; color: var(--muted); margin-top: 3px; }
    .address-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      padding: 28px 0;
      border-bottom: 1px solid var(--border);
    }
    .address-box h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--rose);
      font-weight: 700;
      margin-bottom: 8px;
    }
    .address-box strong { font-size: 15px; color: var(--ink); display: block; margin-bottom: 4px; }
    .address-box p { font-size: 13px; color: var(--muted); line-height: 1.6; }
    .table-wrap { padding: 28px 0; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: var(--rose);
      color: white;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      text-align: left;
    }
    thead th:first-child { border-top-left-radius: 8px; }
    thead th:last-child { border-top-right-radius: 8px; text-align: right; }
    thead th.center { text-align: center; }
    tbody td {
      padding: 16px 14px;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    tbody tr:nth-child(even) { background: #faf6f7; }
    tbody td.center { text-align: center; }
    tbody td.right { text-align: right; font-weight: 700; font-size: 14px; }
    .prod-title { font-weight: 700; color: var(--ink); font-size: 14px; margin-bottom: 4px; }
    .prod-desc { font-size: 12px; color: var(--muted); }
    .prod-ids { font-size: 11.5px; color: var(--muted); line-height: 1.5; font-family: monospace; }
    .summary-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 24px;
      align-items: flex-start;
      padding-top: 16px;
    }
    .payment-badge {
      background: var(--green-bg);
      border: 1px solid #a7f3d0;
      color: var(--green);
      padding: 14px 18px;
      border-radius: 10px;
    }
    .payment-badge h4 { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
    .payment-badge p { font-size: 12px; margin-top: 4px; color: #065f46; }
    .totals-box {
      background: #faf6f7;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .total-row strong { color: var(--ink); }
    .grand-total {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: 800;
      color: var(--rose);
      padding-top: 10px;
      margin-top: 10px;
      border-top: 2px solid var(--border);
    }
    .paid-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 700;
      color: var(--green);
      margin-top: 8px;
    }
    .footer-notes {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      font-size: 11.5px;
      color: var(--muted);
      line-height: 1.7;
    }
    .footer-notes h5 {
      color: var(--rose);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    @media print {
      body { background: white; padding: 0; }
      .print-actions { display: none; }
      .invoice-card { border: none; box-shadow: none; border-radius: 0; }
      .invoice-body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <div>
      <span style="font-weight: 600; font-size: 14px; color: var(--ink);">Abaz Mart Ltd Invoice</span>
      <span style="color: var(--muted); font-size: 13px;"> · ${INVOICE.number}</span>
    </div>
    <button class="print-btn" onclick="window.print()">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="invoice-card">
    <div class="accent-bar"></div>
    <div class="invoice-body">
      <div class="header-row">
        <div class="brand">
          <h1>Abaz Mart</h1>
          <p>
            <strong>Abaz Mart Ltd</strong> · ${SELLER.tagline}<br>
            ${SELLER.address}, ${SELLER.city}<br>
            Registered in England &amp; Wales · Company No. <strong>${SELLER.companyNo}</strong><br>
            Email: <a href="mailto:${SELLER.email}" style="color: var(--rose); text-decoration: none;">${SELLER.email}</a> · Tel: ${SELLER.phone}<br>
            Website: <a href="https://${SELLER.website}" target="_blank" style="color: var(--rose); text-decoration: none;">${SELLER.website}</a>
          </p>
        </div>
        <div class="meta">
          <div class="badge-invoice">COMMERCIAL INVOICE</div>
          <h2>#${INVOICE.number}</h2>
          <p><strong>Order Number:</strong> ${INVOICE.orderNumber}</p>
          <p><strong>Invoice Date:</strong> ${INVOICE.date}</p>
          <p><strong>Payment Terms:</strong> ${INVOICE.paymentTerms}</p>
          <p style="color: var(--green); font-weight: 700; margin-top: 6px;">✓ PAYMENT STATUS: PAID</p>
        </div>
      </div>

      <div class="address-grid">
        <div class="address-box" style="background: #fffbfa; border: 1.5px solid var(--border); border-radius: 10px; padding: 18px;">
          <h3 style="color: var(--rose); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">
            🏢 BILLING ADDRESS (CUSTOMER)
          </h3>
          <strong style="font-size: 15px; color: var(--ink); display: block; margin-bottom: 4px;">${BUYER.company}</strong>
          <p style="font-size: 13px; color: var(--muted); line-height: 1.6;">
            <strong>Attn:</strong> ${BUYER.name}<br>
            ${BUYER.address}<br>
            ${BUYER.city}<br>
            <strong>Postcode:</strong> ${BUYER.postcode}<br>
            ${BUYER.country}<br>
            <strong>Tel:</strong> ${BUYER.phone}
          </p>
        </div>
        <div class="address-box" style="background: #fafafa; border: 1.5px solid var(--border); border-radius: 10px; padding: 18px;">
          <h3 style="color: var(--rose); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px;">
            📦 SHIPPING ADDRESS (DELIVERY)
          </h3>
          <strong style="font-size: 15px; color: var(--ink); display: block; margin-bottom: 4px;">${SHIPPING.company}</strong>
          <p style="font-size: 13px; color: var(--muted); line-height: 1.6;">
            <strong>Attn:</strong> ${SHIPPING.name}<br>
            ${SHIPPING.address}<br>
            ${SHIPPING.city}<br>
            <strong>Postcode:</strong> ${SHIPPING.postcode}<br>
            ${SHIPPING.country}<br>
            <strong>Tel:</strong> ${SHIPPING.phone}
          </p>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 48%;">Item &amp; Description</th>
              <th style="width: 24%;">Identifiers</th>
              <th class="center" style="width: 8%;">Qty</th>
              <th class="center" style="width: 10%;">Rate</th>
              <th style="width: 10%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${LINE_ITEMS.map(
              (item) => `
              <tr>
                <td>
                  <div class="prod-title">${item.description}</div>
                  <div class="prod-desc">${item.details}</div>
                </td>
                <td>
                  <div class="prod-ids">
                    <strong>${item.sku}</strong><br>
                    ${item.gtin}
                  </div>
                </td>
                <td class="center" style="font-size: 15px; font-weight: 700;">${item.quantity}</td>
                <td class="center" style="font-weight: 600;">${fmtPrice(item.unitPrice)}</td>
                <td class="right">${fmtPrice(item.quantity * item.unitPrice)}</td>
              </tr>
            `,
            ).join("")}
          </tbody>
        </table>
      </div>

      <div class="summary-grid">
        <div>
          <div class="payment-badge">
            <h4>✓ Payment Confirmed</h4>
            <p><strong>Payment Method:</strong> ${PAYMENT.method}</p>
            <p><strong>Status:</strong> Paid in Full (${PAYMENT.paymentDate})</p>
            <p><strong>Transaction Ref:</strong> ABZ-TXN-7183-WHL</p>
          </div>

          <div style="margin-top: 14px; font-size: 11.5px; color: var(--muted); line-height: 1.6;">
            <strong style="color: var(--ink);">Bank Details (Reference):</strong><br>
            Beneficiary: Abaz Mart Ltd · Sort Code: 04-00-75 · Account: 34197299<br>
            Bank: Revolut Ltd, 7 Westferry Circus, London E14 4HD
          </div>
        </div>

        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal (120 units @ £25.00)</span>
            <strong>${fmtPrice(subtotal)}</strong>
          </div>
          <div class="total-row">
            <span>Shipping &amp; Delivery (UK Mainland)</span>
            <strong style="color: var(--green);">FREE</strong>
          </div>
          <div class="total-row">
            <span>VAT / Tax (Included / Zero-rated)</span>
            <strong>£0.00</strong>
          </div>
          <div class="grand-total">
            <span>TOTAL AMOUNT</span>
            <span>${fmtPrice(grandTotal)}</span>
          </div>
          <div class="paid-row">
            <span>Amount Paid</span>
            <span>${fmtPrice(amountPaid)}</span>
          </div>
          <div class="total-row" style="margin-top: 6px; font-size: 12px;">
            <span>Balance Due</span>
            <strong>£0.00</strong>
          </div>
        </div>
      </div>

      <div class="footer-notes">
        <h5>Terms &amp; Authentic Quality Guarantee</h5>
        <p>1. All 120 units are 100% genuine Afnan Lynked Freedom Eau de Parfum (100ml) brand-new in original sealed retail packaging.</p>
        <p>2. Dispatched to BSL Exchange, Attic Self Storage, Barking IG11 0TT via insured, tracked courier service.</p>
        <p>3. This document constitutes an official receipt and tax invoice for goods sold by Abaz Mart Ltd.</p>
        <div style="margin-top: 12px; text-align: center; font-size: 11px; color: #9c8e93;">
          © 2026 Abaz Mart Ltd · Registered Office: Office 951, 60 Tottenham Court Road, Fitzrovia, London W1T 2EW · Company No. 17094173
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

  const outDir = path.join(__dirname, "invoices")
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const htmlPath = path.join(outDir, `${INVOICE.number}.html`)
  fs.writeFileSync(htmlPath, htmlContent, "utf8")
  return htmlPath
}

// ─── Execute ────────────────────────────────────────────────────────────────

console.log("==================================================")
console.log("  ABAZ MART LTD - INVOICE GENERATION")
console.log("==================================================")

const pdfFile = generatePdf()
console.log(`✅  PDF Invoice created: ${pdfFile}`)

const htmlFile = generateHtml()
console.log(`✅  HTML Invoice created: ${htmlFile}`)

console.log(`\n📋  Summary:`)
console.log(`    Invoice No:   ${INVOICE.number}`)
console.log(`    Order No:     ${INVOICE.orderNumber}`)
console.log(`    Product:      Afnan Lynked Freedom EDP 100ml`)
console.log(`    Identifiers:  GTIN: 6290171077428 | EAN-13: 6290171077428`)
console.log(`    Quantity:     120 units`)
console.log(`    Rate:         ${fmtPrice(25.0)} / unit`)
console.log(`    Total Amount: ${fmtPrice(grandTotal)}`)
console.log(`    Paid:         ${fmtPrice(amountPaid)} via ${PAYMENT.method}`)
console.log(`    Customer:     ${BUYER.name} (${BUYER.company})`)
console.log(
  `    Shipping To:  ${SHIPPING.name} - ${SHIPPING.company}, Barking IG11 0TT`,
)
console.log("==================================================")
