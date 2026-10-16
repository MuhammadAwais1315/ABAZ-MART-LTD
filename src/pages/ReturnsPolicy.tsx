import { Link } from "react-router"
import { RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Mail } from "lucide-react"

export default function ReturnsPolicy() {
  return (
    <div className="shell py-12 md:py-16 max-w-4xl">
      <div className="mb-10 text-center">
        <p className="eyebrow">Customer Satisfaction</p>
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-4">
          Refund &amp; Returns Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          30-Day Return Window · Hassle-free refunds compliant with UK Consumer Rights
        </p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-2xl border border-border shadow-xs space-y-8 text-sm leading-relaxed text-foreground">
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-600" />
            1. Our 30-Day Guarantee
          </h2>
          <p className="text-muted-foreground">
            At <strong>Abaz Mart Ltd</strong>, your satisfaction is our priority. If you are not completely satisfied with your purchase, you may return eligible items within <strong>30 calendar days</strong> of delivery for a full refund back to your original payment method.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            2. Hygiene &amp; Return Conditions
          </h2>
          <p className="text-muted-foreground">
            Due to strict UK public health and cosmetics hygiene standards, items must meet the following criteria to qualify for a return:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Products must be unused, in their original condition, and in original packaging.</li>
            <li>All tamper-evident hygiene seals, plastic wraps, and boxed closures must be <strong>unbroken and intact</strong>.</li>
            <li>Sample items, gift cards, and promotional gifts with purchase must also be returned if the entire order is returned for refund.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-rose-600" />
            3. How to Initiate a Return (Step-by-Step)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-light rounded-xl border border-border">
              <span className="w-7 h-7 rounded-full bg-rose text-white flex items-center justify-center font-bold text-xs mb-2">1</span>
              <strong className="block text-foreground text-xs mb-1">Contact Customer Care</strong>
              <p className="text-xs text-muted-foreground">
                Email <a href="mailto:care@abazmart.co.uk" className="text-rose-600 underline">care@abazmart.co.uk</a> with your order reference (e.g. <code>#ABZ-10842</code>).
              </p>
            </div>
            <div className="p-4 bg-light rounded-xl border border-border">
              <span className="w-7 h-7 rounded-full bg-rose text-white flex items-center justify-center font-bold text-xs mb-2">2</span>
              <strong className="block text-foreground text-xs mb-1">Securely Package Items</strong>
              <p className="text-xs text-muted-foreground">
                Pack your items with original padding to prevent damage during transit. Enclose your return reference slip.
              </p>
            </div>
            <div className="p-4 bg-light rounded-xl border border-border">
              <span className="w-7 h-7 rounded-full bg-rose text-white flex items-center justify-center font-bold text-xs mb-2">3</span>
              <strong className="block text-foreground text-xs mb-1">Fast Refund Processing</strong>
              <p className="text-xs text-muted-foreground">
                Once received and inspected, refunds are credited back to your original payment method within 5–7 business days.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground">
            4. Damaged, Faulty, or Incorrect Orders
          </h2>
          <p className="text-muted-foreground">
            If you receive a faulty item, an item damaged in transit, or the incorrect shade/formula, please notify us within 48 hours of delivery. In these instances, <strong>Abaz Mart covers 100% of return postage costs</strong> and will arrange an immediate replacement or full refund.
          </p>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <Mail className="w-5 h-5 text-rose-600" />
            5. Questions Regarding Returns?
          </h2>
          <p className="text-muted-foreground">
            Our customer service specialists are available Monday to Friday to assist you:
            <br />
            Email: <a href="mailto:care@abazmart.co.uk" className="text-rose-600 hover:underline">care@abazmart.co.uk</a>
            <br />
            Telephone: +44 20 7946 0958
          </p>
        </section>
      </div>
    </div>
  )
}
