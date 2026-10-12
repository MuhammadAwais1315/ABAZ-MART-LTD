import { useEffect, useState } from "react"
import { ArrowRight, Minus, Plus, ShoppingBag, Sparkles, Trash2, X } from "lucide-react"
import { Link } from "react-router"
import { Button } from "../ui"
import { CartItem } from "../../context/StoreContext"
import { formatPrice } from "../../utils/formatPrice"
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
  StoreSettings,
} from "../../services/checkout"

export default function CartDrawer({
  open,
  cart,
  onClose,
  updateQuantity,
  removeFromCart,
}: {
  open: boolean
  cart: CartItem[]
  onClose: () => void
  updateQuantity: (id: number, quantity: number) => void
  removeFromCart: (id: number) => void
}) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS)

  useEffect(() => {
    if (open) {
      getStoreSettings().then(setSettings)
    }
  }, [open])

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )
  const freeShippingRemaining = Math.max(
    0,
    settings.freeShippingThreshold - subtotal,
  )

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose, open])

  if (!open) return null
  return (
    <div className="cart-drawer-backdrop" onClick={onClose}>
      <aside
        className="cart-drawer"
        aria-label="Shopping cart"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Your selection</p>
            <h2>Shopping Bag</h2>
          </div>
          <Button variant="ghost" aria-label="Close cart" onClick={onClose}>
            <X />
          </Button>
        </div>
        {cart.length ? (
          <>
            <div className="drawer-shipping">
              <p>
                {freeShippingRemaining > 0
                  ? `Add ${formatPrice(freeShippingRemaining)} more for free shipping`
                  : "You’ve unlocked free shipping"}
              </p>
              <progress
                max={settings.freeShippingThreshold}
                value={Math.min(subtotal, settings.freeShippingThreshold)}
                aria-label="Free shipping progress"
              />
            </div>
            <div className="drawer-items">
              {cart.map((item) => (
                <article className="drawer-item" key={item.product.id}>
                  <img src={item.product.image} alt={item.product.name} />
                  <div>
                    <Link to={`/product/${item.product.id}`} onClick={onClose}>
                      {item.product.name}
                    </Link>
                    <span>{item.option}</span>
                    <div className="drawer-item-bottom">
                      <div className="quantity">
                        <Button
                          variant="ghost"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
                        >
                          <Minus />
                        </Button>
                        <span>{item.quantity}</span>
                        <Button
                          variant="ghost"
                          aria-label="Increase quantity"
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                        >
                          <Plus />
                        </Button>
                      </div>
                      <strong>
                        {formatPrice(item.product.price * item.quantity)}
                      </strong>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="drawer-remove"
                    aria-label={`Remove ${item.product.name}`}
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <Trash2 />
                  </Button>
                </article>
              ))}
            </div>
            <div className="drawer-footer">
              <div>
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <p>Shipping and taxes calculated at checkout.</p>
              <Link className="btn btn-outline" to="/cart" onClick={onClose}>
                View Cart
              </Link>
              <Link
                className="btn btn-primary"
                to="/checkout"
                onClick={onClose}
              >
                Checkout <ArrowRight />
              </Link>
            </div>
          </>
        ) : (
          <div className="drawer-empty">
            <div className="empty-bag-illustration">
              <ShoppingBag />
              <Sparkles />
            </div>
            <h3>Your bag is empty</h3>
            <p>Discover something beautiful for your daily ritual.</p>
            <Link className="btn btn-primary" to="/shop" onClick={onClose}>
              Start Shopping
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
