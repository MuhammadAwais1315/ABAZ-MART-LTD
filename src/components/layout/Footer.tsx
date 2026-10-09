import { ArrowRight, Camera, UsersRound } from "lucide-react"
import { Link } from "react-router"
import { Button } from "../ui"

export default function Footer({ notify }: { notify: (message: string) => void }) {
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
          <h3>Customer care</h3>
          <a href="mailto:care@abazmart.com">Contact us</a>
          <Link to="/shop">Shipping & returns</Link>
          <a href="mailto:care@abazmart.com?subject=Abaz%20Mart%20Question">
            FAQs
          </a>
          <Link to="/account">My account</Link>
        </div>
        <div>
          <h3>A little beauty in your inbox</h3>
          <p>Receive new arrivals, rituals, and special offers.</p>
          <form
            className="newsletter"
            onSubmit={(event) => {
              event.preventDefault()
              notify("Welcome to the Abaz Mart newsletter")
            }}
          >
            <input
              type="email"
              placeholder="Email address"
              aria-label="Newsletter email"
            />
            <Button aria-label="Subscribe">
              <ArrowRight />
            </Button>
          </form>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 Abaz Mart. All rights reserved.</span>
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
