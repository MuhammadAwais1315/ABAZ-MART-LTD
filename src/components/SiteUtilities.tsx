import { useEffect, useState } from "react"
import { ArrowUp, MessageCircle, X } from "lucide-react"
import { Button } from "./ui"

export default function SiteUtilities() {
  const [showTop, setShowTop] = useState(false)
  const [showCookies, setShowCookies] = useState(
    () => window.localStorage.getItem("abaz-cookie-consent") !== "accepted",
  )

  useEffect(() => {
    const handleScroll = () => setShowTop(window.scrollY > 520)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <div className="floating-actions">
        {showTop && (
          <Button
            variant="outline"
            className="back-to-top"
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp />
          </Button>
        )}
        <a
          className="whatsapp-button"
          href="https://wa.me/15551234567"
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with Abaz Mart on WhatsApp"
        >
          <MessageCircle />
        </a>
      </div>
      {showCookies && (
        <aside className="cookie-banner" aria-label="Cookie consent">
          <div>
            <strong>Your privacy matters</strong>
            <p>
              We use essential cookies to remember your cart and improve your
              shopping experience.
            </p>
          </div>
          <Button
            onClick={() => {
              window.localStorage.setItem("abaz-cookie-consent", "accepted")
              setShowCookies(false)
            }}
          >
            Accept cookies
          </Button>
          <Button
            variant="ghost"
            className="cookie-close"
            aria-label="Close cookie message"
            onClick={() => setShowCookies(false)}
          >
            <X />
          </Button>
        </aside>
      )}
    </>
  )
}
