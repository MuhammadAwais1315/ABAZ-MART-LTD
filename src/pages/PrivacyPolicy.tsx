import { Link } from "react-router"
import { Shield, Lock, FileText, Mail } from "lucide-react"

export default function PrivacyPolicy() {
  return (
    <div className="shell py-12 md:py-16 max-w-4xl">
      <div className="mb-10 text-center">
        <p className="eyebrow">Legal & Compliance</p>
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: October 2026 · Compliant with UK Data Protection Act 2018 &amp; UK GDPR
        </p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-2xl border border-border shadow-xs space-y-8 text-sm leading-relaxed text-foreground">
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-600" />
            1. Introduction &amp; Data Controller
          </h2>
          <p className="text-muted-foreground">
            Welcome to <strong>Abaz Mart Ltd</strong> ("we", "our", or "us"). We respect your privacy and are committed to protecting your personal information in accordance with the <strong>UK General Data Protection Regulation (UK GDPR)</strong> and the <strong>Data Protection Act 2018</strong>.
          </p>
          <p className="text-muted-foreground">
            For the purposes of data protection legislation, the data controller is:
            <br />
            <strong>Abaz Mart Ltd</strong>
            <br />
            Office 951, 60 Tottenham Court Road, Fitzrovia, London, W1T 2EW, United Kingdom
            <br />
            Registered in England &amp; Wales (Company No. 14920841)
            <br />
            Email: <a href="mailto:care@abazmart.co.uk" className="text-rose-600 hover:underline">care@abazmart.co.uk</a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-600" />
            2. The Data We Collect About You
          </h2>
          <p className="text-muted-foreground">
            When you visit or place an order through our website (<a href="https://www.abazmart.co.uk" className="text-rose-600 hover:underline">abazmart.co.uk</a>), we may collect the following categories of personal data:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li><strong>Identity &amp; Contact Data:</strong> Full name, billing address, delivery address, email address, and telephone number.</li>
            <li><strong>Transaction &amp; Order Data:</strong> Details of products ordered, order numbers, transaction dates, and coupon codes applied.</li>
            <li><strong>Financial Data:</strong> Payments are processed via encrypted third-party payment providers (Stripe / Apple Pay / Google Pay). We never store your full payment card details or CVV codes on our servers.</li>
            <li><strong>Technical &amp; Usage Data:</strong> Internet protocol (IP) address, browser type and version, time zone setting, browser plug-in types, and operating system.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5 text-rose-600" />
            3. How We Use Your Data &amp; Legal Basis
          </h2>
          <p className="text-muted-foreground">
            We will only use your personal data when the law allows us to. Most commonly, we process your information:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li><strong>Performance of a Contract:</strong> To process your beauty orders, fulfill delivery to your specified address, and send order confirmation and dispatch receipts.</li>
            <li><strong>Legitimate Interests:</strong> To improve our luxury store catalog, protect against fraud, and maintain platform security.</li>
            <li><strong>Consent:</strong> To send you curated beauty rituals and new arrival newsletters when you actively opt-in. You may unsubscribe at any time.</li>
            <li><strong>Legal Obligation:</strong> To maintain accounting records for HMRC tax compliance.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground">
            4. Third-Party Service Providers (Sub-Processors)
          </h2>
          <p className="text-muted-foreground">
            We work with vetted third-party service providers who assist in operating our e-commerce store under strict data processing agreements:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li><strong>Stripe:</strong> PCI-DSS Level 1 compliant card tokenization and digital wallet processing.</li>
            <li><strong>Supabase:</strong> Encrypted European cloud database hosting customer accounts and order records.</li>
            <li><strong>Resend:</strong> Secure transactional email dispatch for order confirmations and digital receipts.</li>
            <li><strong>Postal &amp; Courier Partners:</strong> Royal Mail, DPD, and Evri for parcel dispatch and delivery.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground">
            5. Data Retention &amp; Security
          </h2>
          <p className="text-muted-foreground">
            We retain transaction records for a minimum of 6 years in accordance with UK statutory accounting and tax regulations. We have implemented technical safeguards, including 256-bit SSL encryption and strict Row Level Security (RLS) on our databases, to ensure your information is protected against unauthorized access.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-foreground">
            6. Your Legal Rights Under UK GDPR
          </h2>
          <p className="text-muted-foreground">
            Under UK data protection laws, you have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Request access to your personal data (commonly known as a "subject access request").</li>
            <li>Request correction of incomplete or inaccurate data.</li>
            <li>Request erasure of your personal data where there is no good reason for us to continue processing it.</li>
            <li>Object to processing of your data for direct marketing purposes.</li>
            <li>Lodge a complaint with the UK Information Commissioner's Office (ICO) (<a href="https://ico.org.uk" target="_blank" rel="noreferrer" className="text-rose-600 hover:underline">ico.org.uk</a>).</li>
          </ul>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
            <Mail className="w-5 h-5 text-rose-600" />
            7. Contact Us
          </h2>
          <p className="text-muted-foreground">
            If you have any questions about this Privacy Policy or wish to exercise any of your rights, please contact our Data Protection Officer at:
            <br />
            Email: <a href="mailto:care@abazmart.co.uk" className="text-rose-600 hover:underline">care@abazmart.co.uk</a>
            <br />
            Abaz Mart Ltd, Registered in England and Wales.
          </p>
        </section>
      </div>
    </div>
  )
}
