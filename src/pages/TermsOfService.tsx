import { Link } from "react-router"
import { Scale, CheckCircle2, AlertCircle } from "lucide-react"

export default function TermsOfService() {
  return (
    <div className="shell py-12 md:py-16 max-w-4xl">
      <div className="mb-10 text-center">
        <p className="eyebrow">Customer Agreement</p>
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-4">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: October 2026 · Governed by the laws of England and Wales
        </p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-2xl border border-border shadow-xs space-y-8 text-sm leading-relaxed text-foreground">
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <Scale className="w-5 h-5 text-rose-600" />
            1. Company Information &amp; Scope
          </h2>
          <p className="text-muted-foreground">
            These terms and conditions govern your use of the <strong>Abaz Mart</strong> website (<a href="https://www.abazmart.co.uk" className="text-rose-600 hover:underline">abazmart.co.uk</a>) and any purchase of goods from <strong>Abaz Mart Ltd</strong> ("we", "us", or "our"), a company incorporated in England and Wales under Company Registration Number <strong>14920841</strong>, with registered office at <strong>Office 951, 60 Tottenham Court Road, Fitzrovia, London, W1T 2EW, United Kingdom</strong>.
          </p>
          <p className="text-muted-foreground">
            By browsing our website, creating an account, or placing an order, you agree to be bound by these Terms, our Privacy Policy, and our Returns Policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground">
            2. Orders &amp; Contract Formation
          </h2>
          <p className="text-muted-foreground">
            When you place an order on our website, you are offering to purchase the goods specified. A legally binding contract is only formed when we dispatch your order and issue a formal dispatch confirmation receipt.
          </p>
          <p className="text-muted-foreground">
            We reserve the right to decline or cancel any order if goods are unexpectedly out of stock, if pricing errors occur, or if fraudulent activity is suspected. In any such case, a full refund will be issued immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground">
            3. Pricing, Taxes &amp; Currency
          </h2>
          <p className="text-muted-foreground">
            All prices displayed on <strong>abazmart.co.uk</strong> are stated in <strong>Pounds Sterling (£ GBP)</strong>. Where applicable, prices include UK Value Added Tax (VAT) at the prevailing statutory rate. Delivery charges are displayed clearly during the checkout process before payment confirmation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground">
            4. Payment Methods &amp; Security
          </h2>
          <p className="text-muted-foreground">
            We accept major credit and debit cards (Visa, Mastercard, American Express), Apple Pay, Google Pay, and direct BACS / Faster Payments bank transfer. All digital card payments are processed securely via Stripe with 256-bit encryption. For bank transfers, orders are dispatched once funds have cleared in our official Wise business account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            5. Consumer Statutory Rights &amp; Cancellation
          </h2>
          <p className="text-muted-foreground">
            Under the <strong>Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013</strong>, you have the legal right to cancel your contract within <strong>14 calendar days</strong> of receiving your goods.
          </p>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Hygiene &amp; Health Protection Notice (Cosmetics &amp; Skincare):</span>
            </div>
            <p>
              Under Regulation 28(3)(a) of the Consumer Contracts Regulations 2013, the right to cancel does not apply to goods unsealed after delivery which are not suitable for return due to health protection or hygiene reasons. All beauty, cosmetic, and skincare products must be returned in their original, unopened packaging with hygiene seals intact.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground">
            6. Defective or Faulty Goods
          </h2>
          <p className="text-muted-foreground">
            Under the <strong>Consumer Rights Act 2015</strong>, goods supplied must be as described, fit for purpose, and of satisfactory quality. If your items arrive damaged or defective, please contact us at <a href="mailto:care@abazmart.co.uk" className="text-rose-600 hover:underline">care@abazmart.co.uk</a> within 48 hours with photographic proof for an immediate replacement or full refund.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground">
            7. Limitation of Liability &amp; Governing Law
          </h2>
          <p className="text-muted-foreground">
            Nothing in these terms shall limit our liability for fraud, death, or personal injury caused by our negligence. These Terms and Conditions and any dispute or claim arising out of them shall be governed by and construed in accordance with the laws of <strong>England and Wales</strong>, and the courts of England and Wales shall have exclusive jurisdiction.
          </p>
        </section>
      </div>
    </div>
  )
}
