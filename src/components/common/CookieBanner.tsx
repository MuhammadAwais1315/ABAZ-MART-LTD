import { useEffect, useState } from "react"
import { Link } from "react-router"
import { Cookie, ShieldCheck, X } from "lucide-react"
import { Button } from "../ui"

const COOKIE_STORAGE_KEY = "abaz_cookie_consent_v1"

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = window.localStorage.getItem(COOKIE_STORAGE_KEY)
    if (!consent) {
      const timer = window.setTimeout(() => setVisible(true), 1200)
      return () => window.clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = () => {
    window.localStorage.setItem(COOKIE_STORAGE_KEY, "all")
    setVisible(false)
  }

  const handleEssentialOnly = () => {
    window.localStorage.setItem(COOKIE_STORAGE_KEY, "essential")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie Preferences"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-border shadow-2xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-1 text-xs">
          <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            Your Privacy & Cookies
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We use essential cookies to power your cart and secure checkout, and optional analytics to tailor your luxury shopping experience. Learn more in our{" "}
            <Link to="/privacy" className="text-rose-600 hover:underline font-medium">
              Privacy Policy
            </Link>.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleAcceptAll}
              className="text-xs py-1.5 px-3 bg-rose hover:bg-rose-700 text-white font-medium"
            >
              Accept All
            </Button>
            <Button
              variant="outline"
              onClick={handleEssentialOnly}
              className="text-xs py-1.5 px-3 font-medium"
            >
              Essential Only
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleEssentialOnly}
          className="text-muted hover:text-foreground p-1 transition-colors"
          aria-label="Dismiss cookie notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
