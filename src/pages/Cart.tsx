import { useEffect, useState } from "react"
import { ArrowRight, Check, Minus, Plus, ShoppingBag, Sparkles, Trash2 } from "lucide-react"
import { Link } from "react-router"
import { Breadcrumb, Button, Input } from "../components/ui"
import { CartItem, useStore } from "../context/StoreContext"
import { formatPrice } from "../utils/formatPrice"
import {
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
  StoreSettings,
  validateCoupon,
} from "../services/checkout"

export function OrderSummary({
  cart,
  showCheckout = false,
}: {
  cart: CartItem[]
  showCheckout?: boolean
}) {
  const [promoCode, setPromoCode] = useState(() => {
    return window.sessionStorage.getItem("abaz_promo_code") || ""
  })
  const [promoDiscount, setPromoDiscount] = useState<number>(() => {
    return Number(window.sessionStorage.getItem("abaz_promo_discount")) || 0
  })
  const [promoError, setPromoError] = useState<string | null>(null)
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS)

  useEffect(() => {
    getStoreSettings().then(setSettings)
  }, [])

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )
  const shipping =
    subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee
  const tax = subtotal * settings.taxRate
  const discount = Math.min(subtotal, promoDiscount)
  const total = Math.max(0, subtotal + shipping + tax - discount)

  const handleApplyCoupon = async () => {
    if (!promoCode.trim()) return
    setValidatingPromo(true)
    setPromoError(null)

    const res = await validateCoupon(promoCode, subtotal)
    setValidatingPromo(false)

    if (res.error) {
      setPromoError(res.error.message)
      setPromoDiscount(0)
      window.sessionStorage.removeItem("abaz_promo_code")
      window.sessionStorage.removeItem("abaz_promo_discount")
    } else {
      setPromoDiscount(res.discount)
      window.sessionStorage.setItem(
        "abaz_promo_code",
        promoCode.trim().toUpperCase(),
      )
      window.sessionStorage.setItem("abaz_promo_discount", String(res.discount))
    }
  }

  return (
    <aside className="order-summary">
      <h2>Order summary</h2>
      {cart.map((item) => (
        <div className="mini-item" key={item.product.id}>
          <img src={item.product.image} alt={item.product.name} />
          <span>
            <strong>{item.product.name}</strong>
            <small>
              {item.option} · Qty {item.quantity}
            </small>
          </span>
          <b>{formatPrice(item.product.price * item.quantity)}</b>
        </div>
      ))}
      <div className="coupon">
        <Input
          placeholder="Promo code"
          value={promoCode}
          disabled={validatingPromo}
          onChange={(event) => {
            setPromoCode(event.target.value)
            setPromoError(null)
          }}
        />
        <Button
          variant="secondary"
          disabled={!promoCode.trim() || validatingPromo}
          onClick={handleApplyCoupon}
        >
          {validatingPromo
            ? "Checking..."
            : promoDiscount > 0
              ? "Applied"
              : "Apply"}
        </Button>
      </div>
      {promoError && (
        <p className="text-xs text-red-600 mt-1" role="alert">
          {promoError}
        </p>
      )}
      {promoDiscount > 0 && !promoError && (
        <p className="promo-success">
          <Check /> Promo offer applied: {formatPrice(promoDiscount)} off
        </p>
      )}
      <div className="totals">
        <span>
          Subtotal <b>{formatPrice(subtotal)}</b>
        </span>
        <span>
          Shipping <b>{shipping === 0 ? "Free" : formatPrice(shipping)}</b>
        </span>
        {tax > 0 && (
          <span>
            Estimated tax <b>{formatPrice(tax)}</b>
          </span>
        )}
        {promoDiscount > 0 && (
          <span className="discount-line">
            Promo discount <b>−{formatPrice(discount)}</b>
          </span>
        )}
        <span className="total">
          Total <b>{formatPrice(total)}</b>
        </span>
      </div>
      {showCheckout && (
        <Link to="/checkout" className="btn btn-primary summary-checkout">
          Proceed to Checkout <ArrowRight />
        </Link>
      )}
    </aside>
  )
}

export default function Cart() {
  const { cart, updateQuantity, removeFromCart } = useStore()

  return (
    <div className="page shell narrow-page">
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Shopping bag" }]}
      />
      <div className="page-title">
        <p className="eyebrow">Your selection</p>
        <h1>Shopping bag</h1>
        <p>
          {cart.length} {cart.length === 1 ? "item" : "items"} waiting for you
        </p>
      </div>
      {cart.length ? (
        <div className="cart-layout">
          <div className="cart-main">
            <Link className="continue-shopping" to="/shop">
              <ArrowRight /> Continue Shopping
            </Link>
            <div className="cart-list">
              {cart.map((item) => (
                <article className="cart-item" key={item.product.id}>
                  <img src={item.product.image} alt={item.product.name} />
                  <div className="cart-copy">
                    <p className="eyebrow">{item.product.brand}</p>
                    <Link to={`/product/${item.product.id}`}>
                      {item.product.name}
                    </Link>
                    <small>{item.option}</small>
                    <div className="quantity">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                      >
                        <Minus />
                      </Button>
                      <span>{item.quantity}</span>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>
                  <div className="cart-price">
                    <strong>
                      {formatPrice(item.product.price * item.quantity)}
                    </strong>
                    <Button
                      variant="ghost"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 size={17} /> Remove
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <OrderSummary cart={cart} showCheckout />
        </div>
      ) : (
        <div className="empty cart-empty">
          <div className="empty-bag-illustration">
            <ShoppingBag />
            <Sparkles />
          </div>
          <h2>Your bag is feeling light</h2>
          <p>
            Fill it with something beautiful and begin your next beauty ritual.
          </p>
          <Link className="btn btn-primary" to="/shop">
            Continue Shopping
          </Link>
        </div>
      )}
    </div>
  )
}
