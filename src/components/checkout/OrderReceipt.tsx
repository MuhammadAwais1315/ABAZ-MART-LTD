import { Printer, Download, Building2, CheckCircle2 } from "lucide-react"
import { Button } from "../ui"
import { formatPrice } from "../../utils/formatPrice"
import { OrderResult } from "../../services/checkout"
import { PaymentMethod } from "../../types/database"

export interface OrderReceiptItem {
  id?: string | number
  name: string
  brand?: string
  option?: string
  price: number
  quantity: number
}

export interface OrderReceiptProps {
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

export function OrderReceipt({
  order,
  items,
  customer,
  paymentMethod,
}: OrderReceiptProps) {
  const handlePrint = () => {
    window.print()
  }

  const isBankTransfer = paymentMethod === "bank_transfer"
  const isCard = paymentMethod === "card"

  const paymentLabel = isBankTransfer
    ? "Direct Bank Transfer (BACS / Faster Payments)"
    : isCard
      ? "Credit / Debit Card (Processed via Stripe)"
      : "Cash on Delivery"

  return (
    <div className="order-receipt-wrapper max-w-2xl mx-auto my-6">
      {/* Action buttons (hidden in print) */}
      <div className="print:hidden flex items-center justify-between gap-3 mb-6 p-4 bg-muted/40 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Official tax invoice generated. You can save or print it below.</span>
        </div>
        <Button onClick={handlePrint} variant="outline" className="text-xs gap-2">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </Button>
      </div>

      {/* The Printable Invoice Document */}
      <div className="order-receipt-card bg-white p-8 rounded-2xl border border-border shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Receipt Header */}
        <div className="flex justify-between items-start border-b border-border pb-6 mb-6">
          <div>
            <div className="text-2xl font-serif font-bold text-foreground">
              Abaz <i className="text-rose-600 not-italic">Mart</i>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Abaz Mart Ltd · Luxury Skincare & Beauty
            </p>
            <p className="text-xs text-muted-foreground">
              Registered in England & Wales · Company No. 14920841
            </p>
            <p className="text-xs text-muted-foreground">
              care@abazmart.com · +44 20 7946 0958
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
              Official Receipt
            </span>
            <div className="text-sm font-bold text-foreground font-mono">
              #{order.order_number}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Date: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Bill To & Delivery */}
        <div className="grid grid-cols-2 gap-6 text-xs mb-6">
          <div>
            <span className="font-bold text-foreground uppercase tracking-wider block mb-1">
              Delivered To:
            </span>
            <div className="font-semibold text-foreground">{customer.fullName}</div>
            <div className="text-muted-foreground">{customer.address}</div>
            <div className="text-muted-foreground">
              {customer.city}, {customer.postalCode}
            </div>
            <div className="text-muted-foreground">{customer.country}</div>
            <div className="text-muted-foreground mt-1">Phone: {customer.phone}</div>
          </div>

          <div>
            <span className="font-bold text-foreground uppercase tracking-wider block mb-1">
              Payment Details:
            </span>
            <div className="text-muted-foreground">Method: <strong className="text-foreground">{paymentLabel}</strong></div>
            <div className="text-muted-foreground mt-1">
              Status:{" "}
              {isBankTransfer ? (
                <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Awaiting Bank Settlement
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Payment Confirmed
                </span>
              )}
            </div>
            <div className="text-muted-foreground mt-1">
              Est. Delivery: <span className="font-medium text-foreground">{order.estimated_delivery}</span>
            </div>
          </div>
        </div>

        {/* Bank Transfer Instructions Box (Rendered when paymentMethod is bank_transfer) */}
        {isBankTransfer && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950">
            <div className="flex items-center gap-2 font-bold mb-2 text-amber-900">
              <Building2 className="w-4 h-4 text-amber-700" />
              <span>Please Complete Your Bank Transfer:</span>
            </div>
            <p className="mb-3 text-amber-900/90 leading-relaxed">
              To complete your order, please transfer <strong>{formatPrice(order.total)}</strong> to our official business account using the reference code below:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-amber-200/80 font-mono text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-sans">Bank</span>
                <strong className="text-foreground">Barclays UK</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-sans">Sort Code</span>
                <strong className="text-foreground">20-00-00</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-sans">Account No</span>
                <strong className="text-foreground">83920184</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-sans">Reference</span>
                <strong className="text-rose-700 bg-rose-50 px-1 rounded">{order.order_number}</strong>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-amber-800">
              * Your order will be dispatched as soon as the transfer clears into our bank account.
            </p>
          </div>
        )}

        {/* Itemized Table */}
        <div className="mb-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left uppercase text-[10px] tracking-wider">
                <th className="py-2">Item Description</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((item, idx) => (
                <tr key={`${item.id ?? idx}-${idx}`}>
                  <td className="py-3">
                    <div className="font-semibold text-foreground">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.brand ? `${item.brand} · ` : ""}{item.option || "Standard"}
                    </div>
                  </td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">{formatPrice(item.price)}</td>
                  <td className="py-3 text-right font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Breakdown */}
        <div className="border-t border-border pt-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount / Coupon:</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Standard Shipping:</span>
              <span>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT (Included):</span>
              <span>£0.00</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-2">
              <span>Total:</span>
              <span className="text-rose-600">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="border-t border-border mt-8 pt-4 text-center text-[11px] text-muted-foreground">
          Thank you for choosing Abaz Mart · 30-Day Happiness Guarantee · Questions? Email care@abazmart.com
        </div>
      </div>
    </div>
  )
}
