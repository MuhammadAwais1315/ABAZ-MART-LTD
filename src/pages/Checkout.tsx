import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { Check, ChevronDown, LockKeyhole, ShoppingBag, ArrowRight } from "lucide-react"
import { Breadcrumb, Button, Checkbox, Input, Select } from "../components/ui"
import { CartItem, useStore } from "../context/StoreContext"
import { useAuth } from "../context/AuthContext"
import { formatPrice } from "../utils/formatPrice"
import {
  createOrderSecure,
  DEFAULT_STORE_SETTINGS,
  getStoreSettings,
  getUserAddresses,
  OrderResult,
  saveAddressForUser,
  StoreSettings,
} from "../services/checkout"
import { PaymentMethod } from "../types/database"

export function CheckoutSummary({
  cart,
  discount = 0,
  settings = DEFAULT_STORE_SETTINGS,
}: {
  cart: CartItem[]
  discount?: number
  settings?: StoreSettings
}) {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )
  const shipping =
    subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee
  const tax = subtotal * settings.taxRate
  const total = Math.max(0, subtotal + shipping + tax - discount)

  return (
    <div className="checkout-summary-content">
      <div className="checkout-summary-items">
        {cart.map((item) => (
          <div className="mini-item" key={item.product.id}>
            <div className="summary-image">
              <img src={item.product.image} alt={item.product.name} />
              <b>{item.quantity}</b>
            </div>
            <span>
              <strong>{item.product.name}</strong>
              <small>{item.option}</small>
            </span>
            <b>{formatPrice(item.product.price * item.quantity)}</b>
          </div>
        ))}
      </div>
      <div className="totals">
        <span>
          Subtotal <b>{formatPrice(subtotal)}</b>
        </span>
        <span>
          Shipping <b>{shipping === 0 ? "Free" : formatPrice(shipping)}</b>
        </span>
        {tax > 0 && (
          <span>
            Tax <b>{formatPrice(tax)}</b>
          </span>
        )}
        {discount > 0 && (
          <span>
            Discount <b>−{formatPrice(discount)}</b>
          </span>
        )}
        <span className="total">
          Total <b>{formatPrice(total)}</b>
        </span>
      </div>
    </div>
  )
}

export default function Checkout() {
  const { cart, clearCart, notify } = useStore()
  const { user, profile } = useAuth()
  const [step, setStep] = useState(1)
  const [complete, setComplete] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [confirmedCart, setConfirmedCart] = useState<CartItem[]>([])
  const [confirmedOrder, setConfirmedOrder] = useState<OrderResult | null>(null)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [saveAddress, setSaveAddress] = useState(false)
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS)
  const [couponCode, setCouponCode] = useState(() => {
    return window.sessionStorage.getItem("abaz_promo_code") || ""
  })
  const [couponDiscount, setCouponDiscount] = useState<number>(() => {
    return Number(window.sessionStorage.getItem("abaz_promo_discount")) || 0
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    fullName: profile?.full_name || user?.user_metadata?.full_name || "",
    email: profile?.email || user?.email || "",
    phone: profile?.phone || "",
    address: "",
    city: "",
    postalCode: "",
    country: "United Kingdom",
    cardNumber: "",
    cardName: profile?.full_name || "",
    expiry: "",
    cvv: "",
  })

  useEffect(() => {
    getStoreSettings().then(setSettings)
    if (user) {
      getUserAddresses(user.id).then((addresses) => {
        if (addresses && addresses.length > 0) {
          const defaultAddr =
            addresses.find((a) => a.is_default) || addresses[0]
          setForm((prev) => ({
            ...prev,
            fullName: defaultAddr.full_name || prev.fullName,
            phone: defaultAddr.phone || prev.phone,
            address: defaultAddr.address_line || prev.address,
            city: defaultAddr.city || prev.city,
            postalCode: defaultAddr.postal_code || prev.postalCode,
            country: defaultAddr.country || prev.country,
          }))
        }
      })
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || profile.full_name || "",
        email: prev.email || profile.email || "",
        phone: prev.phone || profile.phone || "",
        cardName: prev.cardName || profile.full_name || "",
      }))
    }
  }, [profile])

  const activeCart = complete ? confirmedCart : cart
  const orderSubtotal = activeCart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )
  const shippingFee =
    orderSubtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee
  const taxAmount = orderSubtotal * settings.taxRate
  const orderTotal = Math.max(0, orderSubtotal + shippingFee + taxAmount - couponDiscount)

  const setField = (name: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const validateShipping = () => {
    const next: Record<string, string> = {}
    if (form.fullName.trim().length < 2)
      next.fullName = "Please enter your full name."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email address."
    if (form.phone.replace(/\D/g, "").length < 7)
      next.phone = "Enter a valid phone number."
    if (form.address.trim().length < 5)
      next.address = "Please enter your street address."
    if (!form.city.trim()) next.city = "City is required."
    if (!form.postalCode.trim()) next.postalCode = "Postal code is required."
    if (!form.country) next.country = "Select your country."
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const validatePayment = () => {
    if (paymentMethod !== "card") {
      setErrors({})
      return true
    }
    const next: Record<string, string> = {}
    if (form.cardNumber.replace(/\D/g, "").length < 15)
      next.cardNumber = "Enter a valid card number."
    if (form.cardName.trim().length < 2)
      next.cardName = "Enter the name shown on your card."
    if (!/^\d{2}\s?\/\s?\d{2}$/.test(form.expiry))
      next.expiry = "Use MM / YY format."
    if (!/^\d{3,4}$/.test(form.cvv)) next.cvv = "Enter a valid CVV."
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const nextStep = () => {
    if (step === 1 && !validateShipping()) return
    if (step === 2 && !validatePayment()) return
    setStep((current) => Math.min(3, current + 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return
    setSubmittingOrder(true)
    setOrderError(null)

    const res = await createOrderSecure({
      shippingName: form.fullName,
      shippingPhone: form.phone,
      shippingAddress: form.address,
      shippingCity: form.city,
      shippingPostalCode: form.postalCode,
      shippingCountry: form.country,
      paymentMethod,
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        option: item.option,
      })),
      couponCode: couponCode || undefined,
    })

    if (res.error) {
      setSubmittingOrder(false)
      setOrderError(res.error.message)
      notify(res.error.message)
      return
    }

    if (res.data) {
      setConfirmedOrder(res.data)
      setConfirmedCart(cart)
      setComplete(true)
      clearCart()
      window.sessionStorage.removeItem("abaz_promo_code")
      window.sessionStorage.removeItem("abaz_promo_discount")

      if (saveAddress && user) {
        saveAddressForUser({
          userId: user.id,
          fullName: form.fullName,
          phone: form.phone,
          addressLine: form.address,
          city: form.city,
          postalCode: form.postalCode,
          country: form.country,
        })
      }

      notify("Your order has been placed successfully")
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
    setSubmittingOrder(false)
  }

  const checkoutField = (
    name: keyof typeof form,
    label: string,
    options: {
      type?: string
      placeholder?: string
      className?: string
    } = {},
  ) => (
    <div className={`checkout-field ${options.className || ""}`}>
      <Input
        className={errors[name] ? "has-error" : ""}
        label={label}
        type={options.type}
        placeholder={options.placeholder}
        value={form[name]}
        onChange={(event) => setField(name, event.target.value)}
        aria-invalid={Boolean(errors[name])}
      />
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </div>
  )

  if (complete) {
    return (
      <div className="page shell confirmation-page">
        <div className="success-card order-confirmation">
          <span>
            <Check />
          </span>
          <p className="eyebrow">Order confirmed</p>
          <h1>Thank you, beautiful.</h1>
          <p>
            Your order has been placed and a confirmation is on its way to{" "}
            <strong>{form.email}</strong>.
          </p>
          <div className="confirmation-meta">
            <div>
              <span>Order number</span>
              <strong>
                {confirmedOrder?.order_number || "ABZ-CONFIRMED"}
              </strong>
            </div>
            <div>
              <span>Estimated delivery</span>
              <strong>
                {confirmedOrder?.estimated_delivery
                  ? new Date(
                      confirmedOrder.estimated_delivery,
                    ).toLocaleDateString("en-GB", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Within 5 business days"}
              </strong>
            </div>
          </div>
          <div className="confirmation-summary">
            <h2>Order summary</h2>
            {confirmedCart.map((item) => (
              <div key={item.product.id}>
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
            <p>
              Total{" "}
              <strong>
                {formatPrice(confirmedOrder?.total ?? orderTotal)}
              </strong>
            </p>
          </div>
          <Link to="/shop" className="btn btn-primary">
            Continue Shopping <ArrowRight />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page shell checkout-page">
      <Breadcrumb
        items={[{ label: "Bag", href: "/cart" }, { label: "Checkout" }]}
      />
      <div className="page-title checkout-title">
        <p className="eyebrow">Almost yours</p>
        <h1>Checkout</h1>
      </div>
      <Button
        variant="ghost"
        className="mobile-summary-toggle"
        onClick={() => setSummaryOpen(!summaryOpen)}
        aria-expanded={summaryOpen}
      >
        <span>
          <ShoppingBag /> Order summary
        </span>
        <strong>{formatPrice(orderTotal)}</strong>
        <ChevronDown />
      </Button>
      {summaryOpen && (
        <div className="mobile-checkout-summary">
          <CheckoutSummary
            cart={activeCart}
            discount={couponDiscount}
            settings={settings}
          />
        </div>
      )}
      <div
        className="checkout-progress"
        aria-label={`Checkout step ${step} of 3`}
      >
        {["Shipping", "Payment", "Review"].map((label, index) => (
          <div className={step >= index + 1 ? "is-active" : ""} key={label}>
            <span>{step > index + 1 ? <Check /> : index + 1}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>
      <div className="checkout-layout">
        <div className="checkout-step-card">
          {step === 1 && (
            <>
              <div className="step-heading">
                <p className="eyebrow">Step 1 of 3</p>
                <h2>Shipping information</h2>
                <p>Where should we send your beauty essentials?</p>
              </div>
              <div className="form-grid checkout-fields">
                {checkoutField("fullName", "Full name", {
                  placeholder: "Amara Williams",
                  className: "full",
                })}
                {checkoutField("email", "Email address", {
                  type: "email",
                  placeholder: "amara@example.com",
                })}
                {checkoutField("phone", "Phone number", {
                  type: "tel",
                  placeholder: "+44 20 7946 0958",
                })}
                {checkoutField("address", "Street address", {
                  placeholder: "123 Rose Street",
                  className: "full",
                })}
                {checkoutField("city", "City", { placeholder: "London" })}
                {checkoutField("postalCode", "Postal code", {
                  placeholder: "SW1A 1AA",
                })}
                <div className="checkout-field full">
                  <Select
                    label="Country"
                    className={errors.country ? "has-error" : ""}
                    value={form.country}
                    onChange={(event) =>
                      setField("country", event.target.value)
                    }
                    aria-invalid={Boolean(errors.country)}
                  >
                    <option value="">Select country</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Ireland">Ireland</option>
                    <option value="France">France</option>
                    <option value="Germany">Germany</option>
                  </Select>
                  {errors.country && (
                    <span className="field-error">{errors.country}</span>
                  )}
                </div>
              </div>
              <Checkbox
                label="Save this address for next time"
                checked={saveAddress}
                onChange={(event) => setSaveAddress(event.target.checked)}
              />
            </>
          )}
          {step === 2 && (
            <>
              <div className="step-heading">
                <p className="eyebrow">Step 2 of 3</p>
                <h2>Payment method</h2>
                <p>Choose how you’d like to pay securely.</p>
              </div>
              <div className="payment-options">
                <label className={paymentMethod === "card" ? "is-active" : ""}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                  />
                  <span>
                    <strong>Credit / Debit Card</strong>
                    <small>Visa, Mastercard, American Express</small>
                  </span>
                </label>
                {paymentMethod === "card" && (
                  <div className="card-fields">
                    {checkoutField("cardNumber", "Card number", {
                      placeholder: "1234 5678 9012 3456",
                      className: "full",
                    })}
                    {checkoutField("cardName", "Name on card", {
                      placeholder: "Amara Williams",
                      className: "full",
                    })}
                    {checkoutField("expiry", "Expiry", {
                      placeholder: "MM / YY",
                    })}
                    {checkoutField("cvv", "CVV", {
                      placeholder: "123",
                    })}
                  </div>
                )}
                <label className={paymentMethod === "cod" ? "is-active" : ""}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                  <span>
                    <strong>Cash on Delivery</strong>
                    <small>Pay when your order arrives</small>
                  </span>
                </label>
                <label
                  className={paymentMethod === "paypal" ? "is-active" : ""}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "paypal"}
                    onChange={() => setPaymentMethod("paypal")}
                  />
                  <span>
                    <strong>PayPal</strong>
                    <small>Continue securely with your PayPal account</small>
                  </span>
                </label>
              </div>
              <p className="secure-note">
                <LockKeyhole /> Payments are encrypted and securely processed.
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <div className="step-heading">
                <p className="eyebrow">Step 3 of 3</p>
                <h2>Review your order</h2>
                <p>Take one last look before placing your order.</p>
              </div>
              <div className="review-sections">
                <section>
                  <div>
                    <h3>Shipping details</h3>
                    <Button variant="ghost" onClick={() => setStep(1)}>
                      Edit
                    </Button>
                  </div>
                  <p>
                    <strong>{form.fullName}</strong>
                    <br />
                    {form.address}, {form.city}, {form.postalCode}
                    <br />
                    {form.country}
                    <br />
                    {form.email} · {form.phone}
                  </p>
                </section>
                <section>
                  <div>
                    <h3>Payment method</h3>
                    <Button variant="ghost" onClick={() => setStep(2)}>
                      Edit
                    </Button>
                  </div>
                  <p>
                    {paymentMethod === "card"
                      ? `Credit / Debit Card ending in ${form.cardNumber.replace(/\s/g, "").slice(-4)}`
                      : paymentMethod === "cod"
                        ? "Cash on Delivery"
                        : "PayPal"}
                  </p>
                </section>
                <section className="review-order-items">
                  <h3>Items</h3>
                  {cart.map((item) => (
                    <div key={item.product.id}>
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
                </section>
              </div>
            </>
          )}
          <div className="checkout-actions">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={submittingOrder}
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={nextStep}>
                Continue to {step === 1 ? "Payment" : "Review"} <ArrowRight />
              </Button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                {orderError && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "8px",
                      color: "#b91c1c",
                      fontSize: "0.8rem",
                    }}
                    role="alert"
                  >
                    {orderError}
                  </div>
                )}
                <Button
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0 || submittingOrder}
                >
                  <LockKeyhole />{" "}
                  {submittingOrder ? "Placing Order..." : "Place Order"}
                </Button>
              </div>
            )}
          </div>
        </div>
        <aside className="checkout-summary">
          <h2>Order summary</h2>
          <CheckoutSummary
            cart={activeCart}
            discount={couponDiscount}
            settings={settings}
          />
          <p className="secure-note">
            <LockKeyhole /> Secure checkout powered by encrypted payments.
          </p>
        </aside>
      </div>
    </div>
  )
}
