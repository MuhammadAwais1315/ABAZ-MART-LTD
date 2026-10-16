import { useState } from "react"
import { ArrowRight, Camera, UsersRound } from "lucide-react"
import { Link } from "react-router"
import { Button } from "../ui"
import { subscribeNewsletter } from "../../services/admin"

export default function Footer({ notify }: { notify: (message: string) => void }) {
  const [email, setEmail] = useState("")
  const [subscribing, setSubscribing] = useState(false)

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim() || subscribing) return

    setSubscribing(true)
    const { success, error } = await subscribeNewsletter(email.trim())
    setSubscribing(false)

    if (error) {
      notify(error.message)
    } else if (success) {
      setEmail("")
      notify("Welcome! You have been subscribed to the Abaz Mart newsletter.")
    }
  }

  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div>
          <Link to="/" className="logo footer-logo">
            Abaz <i>Mart</i>
          </Link>
          <p>
            Thoughtfully chosen beauty essentials to make every day feel a
            little more special.
          </p>
          <div className="socials">
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Abaz Mart on Instagram"
            >
              <Camera />
            </a>
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Abaz Mart on Facebook"
            >
              <UsersRound />
            </a>
          </div>
        </div>
        <div>
          <h3>Shop</h3>
          <Link to="/shop">New arrivals</Link>
          <Link to="/shop">Bestsellers</Link>
          <Link to="/shop?sort=sale">Sale</Link>
          <Link to="/shop">Gift cards</Link>
        </div>
        <div>
          <h3>Customer Care</h3>
          <a href="mailto:care@abazmart.co.uk">Contact Us</a>
          <Link to="/shipping">Shipping Policy</Link>
          <Link to="/returns">Refunds &amp; Returns</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms &amp; Conditions</Link>
          <Link to="/account">My Account</Link>
        </div>
        <div>
          <h3>A little beauty in your inbox</h3>
          <p>Receive new arrivals, rituals, and special offers.</p>
          <form className="newsletter" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Email address"
              aria-label="Newsletter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button aria-label="Subscribe" disabled={subscribing}>
              <ArrowRight />
            </Button>
          </form>
        </div>
      </div>
      <div className="shell footer-bottom">
        <div className="space-y-1 text-xs">
          <div>© 2026 Abaz Mart Ltd. All rights reserved.</div>
          <div className="text-[11px] text-muted-foreground">
            Office 951, 60 Tottenham Court Road, Fitzrovia, London W1T 2EW · Co. No. 14920841 · <Link to="/privacy" className="hover:underline">Privacy</Link> · <Link to="/terms" className="hover:underline">Terms</Link> · <Link to="/shipping" className="hover:underline">Shipping</Link> · <Link to="/returns" className="hover:underline">Returns</Link>
          </div>
        </div>
        <div className="payments">
          <b>VISA</b>
          <b>MC</b>
          <b>AMEX</b>
          <b>Pay</b>
        </div>
      </div>
    </footer>
  )
}
