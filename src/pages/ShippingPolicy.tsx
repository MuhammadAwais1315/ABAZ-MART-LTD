import { Link } from "react-router"
import { Truck, Clock, ShieldCheck, HelpCircle } from "lucide-react"

export default function ShippingPolicy() {
  return (
    <div className="shell py-12 md:py-16 max-w-4xl">
      <div className="mb-10 text-center">
        <p className="eyebrow">Fast &amp; Insured Fulfillment</p>
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-4">
          Shipping &amp; Delivery Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Tracked UK Delivery · Free shipping on qualifying orders over £50
        </p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-2xl border border-border shadow-xs space-y-8 text-sm leading-relaxed text-foreground">
        <section className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <Truck className="w-5 h-5 text-rose-600" />
            1. UK Shipping Rates &amp; Delivery Times
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-light text-muted uppercase text-[10px] tracking-wider">
                  <th className="p-3">Service</th>
                  <th className="p-3">Estimated Transit</th>
                  <th className="p-3">Cost</th>
                  <th className="p-3">Qualifying Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3 font-semibold">UK Standard Tracked (Royal Mail 48 / Evri)</td>
                  <td className="p-3 text-muted-foreground">2 – 3 Business Days</td>
                  <td className="p-3 font-semibold">£6.00</td>
                  <td className="p-3 text-muted-foreground">Orders under £50.00</td>
                </tr>
                <tr className="bg-emerald-50/50">
                  <td className="p-3 font-semibold text-emerald-800">Free UK Tracked Delivery</td>
                  <td className="p-3 text-emerald-800">2 – 3 Business Days</td>
                  <td className="p-3 font-semibold text-emerald-700">FREE</td>
                  <td className="p-3 font-semibold text-emerald-700">Orders £50.00 and above</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">Express Next-Day Tracked (Royal Mail 24 / DPD)</td>
                  <td className="p-3 text-muted-foreground">1 Business Day (Order before 1pm)</td>
                  <td className="p-3 font-semibold">£8.50</td>
                  <td className="p-3 text-muted-foreground">Available at checkout</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-600" />
            2. Order Processing &amp; Dispatch Schedule
          </h2>
          <p className="text-muted-foreground">
            All orders placed Monday to Friday are processed and dispatched within <strong>24 to 48 hours</strong>. Orders placed on Saturdays, Sundays, or UK Bank Holidays will be processed on the following business day.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground">
            3. Parcel Tracking
          </h2>
          <p className="text-muted-foreground">
            Once your parcel is dispatched from our fulfillment facility, you will receive an automated dispatch notification email containing your carrier tracking reference. You can also view live fulfillment status at any time in your <Link to="/account" className="text-rose-600 hover:underline font-medium">Customer Account</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-600" />
            4. Damaged or Lost Shipments
          </h2>
          <p className="text-muted-foreground">
            All ABAZ MART parcels are fully insured during transit. In the rare event that your shipment arrives damaged or is delayed beyond 7 business days, please email our customer care team at <a href="mailto:care@abazmart.co.uk" className="text-rose-600 hover:underline">care@abazmart.co.uk</a> with your order reference (e.g. <code>#ABZ-10842</code>). We will investigate with the courier and issue an immediate replacement or full refund.
          </p>
        </section>
      </div>
    </div>
  )
}
