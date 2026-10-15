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

  // Colors
  const roseColor: [number, number, number] = [184, 59, 94]
  const inkColor: [number, number, number] = [43, 32, 36]
  const mutedColor: [number, number, number] = [107, 91, 97]
  const borderColor: [number, number, number] = [234, 223, 226]

  // 1. Top Decorative Brand Bar
  doc.setFillColor(...roseColor)
  doc.rect(0, 0, 210, 4, "F")

  // 2. Header: Company Branding
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(...roseColor)
  doc.text("Abaz Mart", 15, 20)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedColor)
  doc.text("Abaz Mart Ltd · Luxury Skincare & Beauty", 15, 26)
  doc.text("Registered in England & Wales · Company No. 14920841", 15, 30.5)
  doc.text("care@abazmart.com · +44 20 7946 0958", 15, 35)

  // 3. Header: Receipt Badge & Details (Right Aligned)
  doc.setFillColor(254, 242, 245)
  doc.roundedRect(145, 12, 50, 8, 2, 2, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...roseColor)
  doc.text("OFFICIAL RECEIPT", 170, 17.5, { align: "center" })

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

  // 5. Two-column Customer & Payment Information
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
  doc.text(customer.address, 15, currentY + 9.5)
  doc.text(`${customer.city}, ${customer.postalCode}`, 15, currentY + 14)
  doc.text(customer.country, 15, currentY + 18.5)
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
  doc.text(paymentLabel, 130, currentY + 5)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...mutedColor)
  doc.text("Status:", 115, currentY + 10)
  doc.setFont("helvetica", "bold")
  if (isBankTransfer) {
    doc.setTextColor(180, 83, 9) // Amber
    doc.text("Awaiting Bank Settlement", 128, currentY + 10)
  } else {
    doc.setTextColor(46, 158, 107) // Green
    doc.text("Payment Confirmed", 128, currentY + 10)
  }

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...mutedColor)
  doc.text("Est. Delivery:", 115, currentY + 15)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...inkColor)
  doc.text(order.estimated_delivery || "Within 3-5 business days", 137, currentY + 15)

  currentY += 28

  // 6. Bank Transfer Remittance Box (If Applicable)
  if (isBankTransfer) {
    doc.setFillColor(254, 243, 199) // Amber light
    doc.setDrawColor(245, 158, 11) // Amber border
    doc.roundedRect(15, currentY, 180, 24, 2, 2, "FD")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(120, 53, 15)
    doc.text("Please Complete Your Bank Transfer (BACS / Faster Payments):", 20, currentY + 6)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(
      `Bank: Barclays UK   |   Sort Code: 20-00-00   |   Account No: 83920184   |   Account Name: Abaz Mart Ltd`,
      20,
      currentY + 12,
    )
    doc.setFont("helvetica", "bold")
    doc.text(`Payment Reference: ${order.order_number}`, 20, currentY + 18)

    currentY += 29
  } else {
    currentY += 4
  }

  // 7. Table Header
  doc.setFillColor(248, 245, 246)
  doc.rect(15, currentY, 180, 8, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...roseColor)
  doc.text("ITEM DESCRIPTION", 18, currentY + 5.5)
  doc.text("QTY", 120, currentY + 5.5, { align: "center" })
  doc.text("PRICE", 155, currentY + 5.5, { align: "right" })
  doc.text("TOTAL", 192, currentY + 5.5, { align: "right" })

  currentY += 9

  // 8. Table Rows
  items.forEach((item) => {
    // Check if new page needed
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...inkColor)
    doc.text(item.name, 18, currentY + 4)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...mutedColor)
    const brandOption = `${item.brand ? `${item.brand} · ` : ""}${item.option || "Standard"}`
    doc.text(brandOption, 18, currentY + 8)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.setTextColor(...inkColor)
    doc.text(String(item.quantity), 120, currentY + 6, { align: "center" })
    doc.text(formatPrice(item.price), 155, currentY + 6, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.text(formatPrice(item.price * item.quantity), 192, currentY + 6, {
      align: "right",
    })

    // Separator line
    doc.setDrawColor(243, 238, 240)
    doc.setLineWidth(0.2)
    doc.line(15, currentY + 11, 195, currentY + 11)

    currentY += 13
  })

  // 9. Financial Summary Breakdown (Right Aligned)
  currentY += 4

  const summaryX = 135
  const valueX = 192

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...mutedColor)
  doc.text("Subtotal:", summaryX, currentY)
  doc.text(formatPrice(order.subtotal), valueX, currentY, { align: "right" })

  if (order.discount > 0) {
    currentY += 5
    doc.setTextColor(46, 158, 107)
    doc.text("Discount / Promo:", summaryX, currentY)
    doc.text(`-${formatPrice(order.discount)}`, valueX, currentY, {
      align: "right",
    })
  }

  currentY += 5
  doc.setTextColor(...mutedColor)
  doc.text("Standard Shipping:", summaryX, currentY)
  doc.text(
    order.shipping === 0 ? "Free" : formatPrice(order.shipping),
    valueX,
    currentY,
    { align: "right" },
  )

  currentY += 5
  doc.text("VAT (Included):", summaryX, currentY)
  doc.text("£0.00", valueX, currentY, { align: "right" })

  // Grand Total
  currentY += 7
  doc.setDrawColor(...roseColor)
  doc.setLineWidth(0.6)
  doc.line(summaryX - 5, currentY - 2, 195, currentY - 2)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...roseColor)
  doc.text("Total Paid:", summaryX, currentY + 4)
  doc.text(formatPrice(order.total), valueX, currentY + 4, { align: "right" })

  // 10. Footer Note
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...mutedColor)
  doc.text(
    "Thank you for choosing Abaz Mart · 30-Day Happiness Guarantee",
    105,
    278,
    { align: "center" },
  )
  doc.text("Questions regarding your order? Email care@abazmart.com", 105, 283, {
    align: "center",
  })

  // 11. Trigger Download directly into browser's Downloads folder
  doc.save(`Abaz-Mart-Receipt-${order.order_number}.pdf`)
}
