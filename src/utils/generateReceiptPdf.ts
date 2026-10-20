import { jsPDF } from "jspdf"
import { OrderResult } from "../services/checkout"
import { PaymentMethod } from "../types/database"
import { OrderReceiptItem } from "../components/checkout/OrderReceipt"
import { formatPrice } from "./formatPrice"

interface DownloadReceiptPdfParams {
  order: OrderResult
  items: OrderReceiptItem[]
  customer: {
    fullName: string
    phone: string
    address: string
    city: string
    postalCode: string
    country: string
  }
  paymentMethod: PaymentMethod
}

export function downloadReceiptPdf({
  order,
  items,
  customer,
  paymentMethod,
}: DownloadReceiptPdfParams) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const isBankTransfer = paymentMethod === "bank_transfer"
  const paymentLabel = isBankTransfer
    ? "Direct Bank Transfer (BACS)"
    : "Credit / Debit Card / Digital Wallet (Stripe)"

  const dateFormatted = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  // Format delivery date nicely (e.g. 2026-10-25 -> 25 October 2026)
  let deliveryFormatted = order.estimated_delivery || "Within 3-5 business days"
  if (order.estimated_delivery && /^\d{4}-\d{2}-\d{2}$/.test(order.estimated_delivery)) {
    const [y, m, d] = order.estimated_delivery.split("-")
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
    if (!isNaN(dateObj.getTime())) {
      deliveryFormatted = dateObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    }
  }

  // Brand Palette
  const roseColor: [number, number, number] = [184, 59, 94]
  const inkColor: [number, number, number] = [43, 32, 36]
  const mutedColor: [number, number, number] = [107, 91, 97]
  const borderColor: [number, number, number] = [234, 223, 226]

  // 1. Top Decorative Brand Bar
  doc.setFillColor(...roseColor)
  doc.rect(0, 0, 210, 4, "F")

  // 2. Header: Company Branding & Official Details
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(...roseColor)
  doc.text("Abaz Mart", 15, 20)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedColor)
  doc.text("Abaz Mart Ltd · Luxury Skincare & Beauty", 15, 25.5)
  doc.text("Office 951, 60 Tottenham Court Road, Fitzrovia, London W1T 2EW", 15, 29.5)
  doc.text("Registered in England & Wales · Company No. 17094173", 15, 33.5)
  doc.text("care@abazmart.co.uk · +4402034322415", 15, 37.5)

  // 3. Header: Receipt Badge & Details (Right Aligned)
  doc.setFillColor(254, 242, 245)
  doc.roundedRect(142, 12, 53, 8.5, 2, 2, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...roseColor)
  doc.text("OFFICIAL RECEIPT", 168.5, 17.5, { align: "center" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...inkColor)
  doc.text(`#${order.order_number}`, 195, 27, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedColor)
  doc.text(`Date: ${dateFormatted}`, 195, 32, { align: "right" })

  // 4. Horizontal Separator
  doc.setDrawColor(...borderColor)
  doc.setLineWidth(0.4)
  doc.line(15, 41, 195, 41)

  // 5. Customer & Payment Information
  let currentY = 49

  // Column A: Delivered To
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...roseColor)
  doc.text("DELIVERED TO:", 15, currentY)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(...inkColor)
  doc.text(customer.fullName || "Valued Customer", 15, currentY + 5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedColor)
  doc.text(customer.address || "14 Berkeley Square", 15, currentY + 9.5)
  doc.text(`${customer.city || "London"}, ${customer.postalCode || ""}`, 15, currentY + 14)
  doc.text(customer.country || "United Kingdom", 15, currentY + 18.5)
  if (customer.phone) {
    doc.text(`Phone: ${customer.phone}`, 15, currentY + 23)
  }

  // Column B: Payment Details
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...roseColor)
  doc.text("PAYMENT DETAILS:", 115, currentY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedColor)
  doc.text("Method:", 115, currentY + 5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...inkColor)
  doc.text(paymentLabel, 129, currentY + 5)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...mutedColor)
  doc.text("Status:", 115, currentY + 10)
  doc.setFont("helvetica", "bold")
  if (isBankTransfer) {
    doc.setTextColor(180, 83, 9)
    doc.text("Awaiting Bank Settlement", 128, currentY + 10)
  } else {
    doc.setTextColor(46, 158, 107)
    doc.text("Payment Confirmed", 128, currentY + 10)
  }

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...mutedColor)
  doc.text("Est. Delivery:", 115, currentY + 15)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...inkColor)
  doc.text(deliveryFormatted, 137, currentY + 15)

  currentY += 28

  // 6. Bank Transfer Remittance Box (If Applicable)
  if (isBankTransfer) {
    doc.setFillColor(254, 243, 199)
    doc.setDrawColor(245, 158, 11)
    doc.roundedRect(15, currentY, 180, 28, 2, 2, "FD")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(120, 53, 15)
    doc.text("Please Complete Your Bank Transfer (BACS / Faster Payments / IBAN):", 20, currentY + 6)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.text(
      `Bank: Wise   |   Account Name: Abaz Mart Ltd   |   Sort Code: 60-84-64   |   Account No: 60869680`,
      20,
      currentY + 11.5,
    )
    doc.text(
      `IBAN: GB71 TRWI 6084 6460 8696 80   |   SWIFT/BIC: TRWIGB2LXXX`,
      20,
      currentY + 16.5,
    )
    doc.setFont("helvetica", "bold")
    doc.text(`Payment Reference: ${order.order_number}`, 20, currentY + 22.5)

    currentY += 33
  } else {
    currentY += 4
  }

  // 7. Table Header (Width: 180mm from x=15 to x=195)
  doc.setFillColor(248, 245, 246)
  doc.rect(15, currentY, 180, 8, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...roseColor)
  doc.text("ITEM DESCRIPTION", 18, currentY + 5.5)
  doc.text("QTY", 122, currentY + 5.5, { align: "center" })
  doc.text("PRICE", 158, currentY + 5.5, { align: "right" })
  doc.text("TOTAL", 192, currentY + 5.5, { align: "right" })

  currentY += 8

  // 8. Table Rows with Automatic Text Wrapping (No Overlapping)
  const itemDescriptionWidth = 96 // Constrained width from x=18 to x=114

  items.forEach((item) => {
    // Wrap product name into lines fitting within itemDescriptionWidth
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    const nameLines: string[] = doc.splitTextToSize(item.name, itemDescriptionWidth)
    const nameHeight = nameLines.length * 3.8

    const brandOption = `${item.brand ? `${item.brand} · ` : ""}${item.option || "Standard"}`
    const totalRowHeight = Math.max(12, nameHeight + 6.5)

    // Page overflow guard
    if (currentY + totalRowHeight > 255) {
      doc.addPage()
      currentY = 20
    }

    // Print wrapped product title
    doc.setTextColor(...inkColor)
    doc.text(nameLines, 18, currentY + 4.5)

    // Print brand / variant directly below title
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...mutedColor)
    doc.text(brandOption, 18, currentY + 4.5 + nameHeight)

    // Align QTY, PRICE, and TOTAL on top row alongside the product name
    const numbersBaselineY = currentY + 4.5
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.setTextColor(...inkColor)
    doc.text(String(item.quantity), 122, numbersBaselineY, { align: "center" })
    doc.text(formatPrice(item.price), 158, numbersBaselineY, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.text(formatPrice(item.price * item.quantity), 192, numbersBaselineY, {
      align: "right",
    })

    // Hairline divider
    doc.setDrawColor(240, 234, 236)
    doc.setLineWidth(0.2)
    doc.line(15, currentY + totalRowHeight, 195, currentY + totalRowHeight)

    currentY += totalRowHeight
  })

  // 9. Financial Summary Breakdown (Right Aligned)
  currentY += 5

  const summaryLabelX = 130
  const summaryValueX = 192

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedColor)
  doc.text("Subtotal:", summaryLabelX, currentY)
  doc.text(formatPrice(order.subtotal), summaryValueX, currentY, { align: "right" })

  if (order.discount > 0) {
    currentY += 5
    doc.setTextColor(46, 158, 107)
    doc.text("Discount / Promo:", summaryLabelX, currentY)
    doc.text(`-${formatPrice(order.discount)}`, summaryValueX, currentY, {
      align: "right",
    })
  }

  currentY += 5
  doc.setTextColor(...mutedColor)
  doc.text("Standard Shipping:", summaryLabelX, currentY)
  doc.text(
    order.shipping === 0 ? "Free" : formatPrice(order.shipping),
    summaryValueX,
    currentY,
    { align: "right" },
  )

  currentY += 5
  doc.text("VAT (Included):", summaryLabelX, currentY)
  doc.text("£0.00", summaryValueX, currentY, { align: "right" })

  // Grand Total Highlight Box
  currentY += 6
  doc.setFillColor(254, 242, 245)
  doc.setDrawColor(...roseColor)
  doc.setLineWidth(0.5)
  doc.roundedRect(summaryLabelX - 5, currentY - 1.5, 67, 9.5, 1.5, 1.5, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(...roseColor)
  doc.text("Total Paid:", summaryLabelX, currentY + 5)
  doc.text(formatPrice(order.total), summaryValueX, currentY + 5, { align: "right" })

  // 10. Footer Note
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(...mutedColor)
  doc.text(
    "Thank you for choosing Abaz Mart · 30-Day Happiness Guarantee",
    105,
    278,
    { align: "center" },
  )
  doc.text("Questions regarding your order? Email care@abazmart.co.uk · +4402034322415", 105, 282.5, {
    align: "center",
  })

  // 11. Trigger Download
  doc.save(`Abaz-Mart-Receipt-${order.order_number}.pdf`)
}
