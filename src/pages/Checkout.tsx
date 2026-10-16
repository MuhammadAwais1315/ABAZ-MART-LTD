import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import {
  Check,
  ChevronDown,
  LockKeyhole,
  ShoppingBag,
  ArrowRight,
  Building2,
  CreditCard,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { Elements } from "@stripe/react-stripe-js"
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
import { getStripe, isStripeConfigured } from "../lib/stripe"
import {
  EmbeddedStripeForm,
  EmbeddedStripeFormRef,
} from "../components/checkout/EmbeddedStripeForm"
import { OrderReceipt } from "../components/checkout/OrderReceipt"

export function CheckoutSummary({
  cart,
  discount = 0,
  settings = DEFAULT_STORE_SETTINGS,
  deliveryOption = "standard",
}: {
  cart: CartItem[]
  discount?: number
  settings?: StoreSettings
  deliveryOption?: "standard" | "expedited"
}) {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )
  const shipping =
    deliveryOption === "expedited"
      ? settings.expeditedShippingFee
      : subtotal >= settings.freeShippingThreshold
        ? 0
        : settings.shippingFee
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
  const [deliveryOption, setDeliveryOption] = useState<"standard" | "expedited">("standard")
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

  // Stripe State
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const stripeFormRef = useRef<EmbeddedStripeFormRef>(null)
  const stripeConfigured = isStripeConfigured()

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
  const standardShippingFee =
    orderSubtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee
  const shippingFee =
    deliveryOption === "expedited"
      ? settings.expeditedShippingFee
      : standardShippingFee
  const taxAmount = orderSubtotal * settings.taxRate
  const orderTotal = Math.max(0, orderSubtotal + shippingFee + taxAmount - couponDiscount)

  // Initialize Stripe Payment Intent when on Payment step with card method
  useEffect(() => {
    let isMounted = true
    async function initPaymentIntent() {
      if (!stripeConfigured || paymentMethod !== "card" || orderTotal <= 0) return
      if (stripeClientSecret) return

      try {
        setStripeLoading(true)
        const res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(orderTotal * 100),
            currency: "gbp",
            customerEmail: form.email,
          }),
        })

        if (!res.ok) {
          throw new Error(`API returned HTTP ${res.status}`)
        }

        const data = await res.json()
        if (isMounted) {
          if (data.clientSecret) {
            setStripeClientSecret(data.clientSecret)
          } else if (data.mockMode) {
            console.info("Stripe backend in demo/mock mode:", data.message)
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Could not initialize Stripe PaymentIntent, using fallback:", err)
        }
      } finally {
        if (isMounted) {
          setStripeLoading(false)
        }
      }
    }

    if (step === 2) {
      initPaymentIntent()
    }

    return () => {
      isMounted = false
    }
  }, [step, paymentMethod, orderTotal, stripeConfigured, form.email, stripeClientSecret])

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
    // If live Stripe is active, PaymentElement validates automatically on confirmation
    if (stripeConfigured && stripeClientSecret) {
      setErrors({})
      return true
    }
    // Fallback/demo validation
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
    setStep((current) => Math.min(2, current + 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return
    if (!validatePayment()) return

    setSubmittingOrder(true)
    setOrderError(null)

    // If live Stripe Card / Apple Pay / Google Pay is selected
    if (paymentMethod === "card" && stripeConfigured && stripeClientSecret) {
      if (!stripeFormRef.current) {
        setSubmittingOrder(false)
        setOrderError("Payment terminal is still initializing. Please wait a moment.")
        return
      }
      const paymentResult = await stripeFormRef.current.submitPayment()
      if (!paymentResult.success) {
        setSubmittingOrder(false)
        setOrderError(
          paymentResult.error || "Payment was declined or cancelled. Please try again.",
        )
        notify(paymentResult.error || "Payment authorization failed")
        return
      }
    }

    // Atomically create the order in Supabase
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
      shippingMethod: deliveryOption,
      shippingFee,
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

      // Send branded order confirmation email in the background
      const orderPayload = res.data
      fetch("/api/send-order-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            order_number: orderPayload.order_number,
            subtotal: orderPayload.subtotal,
            shipping: orderPayload.shipping,
            discount: orderPayload.discount,
            total: orderPayload.total,
            estimated_delivery: orderPayload.estimated_delivery,
          },
          customer: {
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            address: form.address,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          },
          items: cart.map((item) => ({
            name: item.product.name,
            brand: item.product.brand,
            option: item.option,
            price: item.product.price,
            quantity: item.quantity,
          })),
          paymentMethod,
        }),
      }).catch((err) => {
        console.warn("Background order confirmation email error:", err)
      })

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

      notify(
        paymentMethod === "bank_transfer"
          ? "Order reserved! Please complete the bank transfer."
          : "Your order has been placed successfully!",
      )
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

  // Order Confirmation Screen with Official Downloadable Receipt
  if (complete && confirmedOrder) {
    return (
      <div className="page shell confirmation-page max-w-4xl mx-auto py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-100 text-rose-700 mb-3 shadow-sm">
            <Check className="w-7 h-7" />
          </div>
          <p className="text-xs uppercase tracking-widest font-semibold text-rose-600 mb-1">
            Order Confirmed
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
            Thank you, beautiful.
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md mx-auto mt-1">
            Your order <strong>#{confirmedOrder.order_number}</strong> has been
            placed.
            {form.email ? (
              <> A confirmation receipt has been dispatched to <strong>{form.email}</strong>.</>
            ) : null}{" "}
            You can download your official PDF receipt below.
          </p>
        </div>

        {/* Official Receipt */}
        <OrderReceipt
          order={confirmedOrder}
          items={confirmedCart.map((item) => ({
            id: item.product.id,
            name: item.product.name,
            brand: item.product.brand,
            option: item.option,
            price: item.product.price,
            quantity: item.quantity,
          }))}
          customer={{
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            address: form.address,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          }}
          paymentMethod={paymentMethod}
        />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 print:hidden">
          <Link to="/shop" className="btn btn-primary w-full sm:w-auto">
            Continue Shopping <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
          {user && (
            <Link
              to="/account?tab=orders"
              className="btn btn-outline w-full sm:w-auto"
            >
              View My Orders
            </Link>
          )}
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
            deliveryOption={deliveryOption}
          />
        </div>
      )}

      <div
        className="checkout-progress"
        aria-label={`Checkout step ${step} of 2`}
        style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
      >
        {[
          { num: 1, label: "Shipping Information" },
          { num: 2, label: "Payment & Confirmation" },
        ].map((item) => (
          <div className={step >= item.num ? "is-active" : ""} key={item.num}>
            <span>{step > item.num ? <Check /> : item.num}</span>
            <strong>{item.label}</strong>
          </div>
        ))}
      </div>

      <div className="checkout-layout">
        <div className="checkout-step-card">
          {step === 1 && (
            <>
              <div className="step-heading">
                <p className="eyebrow">Step 1 of 2</p>
                <h2>Shipping information</h2>
                <p>Where should we deliver your luxury beauty essentials?</p>
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
                  placeholder: "123 Rose Street, Apt 4B",
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
                label="Save this delivery address for next time"
                checked={saveAddress}
                onChange={(event) => setSaveAddress(event.target.checked)}
              />

              {/* Delivery Speed Options */}
              <div className="mt-6 border-t border-border pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-rose" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Choose Delivery Option
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      deliveryOption === "standard"
                        ? "border-rose-600 bg-rose-50/50 ring-1 ring-rose-600 shadow-xs"
                        : "border-border bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="deliveryOption"
                          checked={deliveryOption === "standard"}
                          onChange={() => setDeliveryOption("standard")}
                          className="accent-rose-600"
                        />
                        <span className="font-semibold text-xs text-foreground">
                          Standard Tracked
                        </span>
                      </div>
                      <span className="font-bold text-xs text-rose-700">
                        {standardShippingFee === 0 ? "FREE" : formatPrice(settings.shippingFee)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      2–4 business days via Royal Mail Tracked 48 / Evri
                    </p>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      deliveryOption === "expedited"
                        ? "border-rose-600 bg-rose-50/50 ring-1 ring-rose-600 shadow-xs"
                        : "border-border bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="deliveryOption"
                          checked={deliveryOption === "expedited"}
                          onChange={() => setDeliveryOption("expedited")}
                          className="accent-rose-600"
                        />
                        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          Expedited Next-Day
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            EXPRESS
                          </span>
                        </span>
                      </div>
                      <span className="font-bold text-xs text-rose-700">
                        {formatPrice(settings.expeditedShippingFee)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      1–2 business days priority dispatch via DPD / Royal Mail Special
                    </p>
                  </label>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="step-heading">
                <p className="eyebrow">Step 2 of 2</p>
                <h2>Payment & Review</h2>
                <p>Choose your payment method and confirm your order.</p>
              </div>

              {/* Shipping Destination Summary Recap */}
              <div className="p-3.5 mb-6 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-0.5">
                    Delivering To:
                  </span>
                  <strong className="text-foreground">{form.fullName}</strong>
                  <div className="text-muted-foreground">
                    {form.address}, {form.city}, {form.postalCode} ({form.country})
                  </div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">
                    {form.email} · {form.phone}
                  </div>
                  <div className="text-rose-700 font-medium text-[11px] mt-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    <span>
                      {deliveryOption === "expedited"
                        ? `Expedited Next-Day Delivery (${formatPrice(settings.expeditedShippingFee)})`
                        : `Standard Tracked Delivery (${standardShippingFee === 0 ? "Free" : formatPrice(settings.shippingFee)})`}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-xs py-1 px-2.5 text-rose-700 hover:text-rose-800"
                >
                  Change
                </Button>
              </div>

              <div className="payment-options">
                {/* 1. Credit / Debit Card & Apple Pay / Google Pay via Stripe */}
                <label className={paymentMethod === "card" ? "is-active" : ""}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                  />
                  <span className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong>Credit / Debit Card</strong>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                        Apple Pay
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                        Google Pay
                      </span>
                    </div>
                    <small>
                      Visa, Mastercard, Amex, Apple Pay & Google Pay via encrypted Stripe checkout
                    </small>
                  </span>
                </label>

                {paymentMethod === "card" && (
                  <div className="p-4 bg-white rounded-xl border border-border shadow-sm">
                    {stripeConfigured && stripeClientSecret ? (
                      <Elements
                        stripe={getStripe()}
                        options={{
                          clientSecret: stripeClientSecret,
                          appearance: {
                            theme: "stripe",
                            variables: {
                              colorPrimary: "#b83b5e",
                              colorBackground: "#ffffff",
                              colorText: "#2b2024",
                              colorDanger: "#d64545",
                              fontFamily: "'Inter', sans-serif",
                              borderRadius: "10px",
                            },
                          },
                        }}
                      >
                        <EmbeddedStripeForm ref={stripeFormRef} />
                      </Elements>
                    ) : stripeConfigured && stripeLoading ? (
                      <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                        <span>Initializing secure payment terminal...</span>
                      </div>
                    ) : (
                      <div>
                        <div className="p-3 mb-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>
                            <strong>Demo Mode:</strong> Live embedded Card & Apple/Google Pay will activate when Stripe API keys are configured in Vercel. You can test checkout with any sample card.
                          </span>
                        </div>
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
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Direct Bank Transfer (BACS / Faster Payments) */}
                <label
                  className={paymentMethod === "bank_transfer" ? "is-active" : ""}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "bank_transfer"}
                    onChange={() => setPaymentMethod("bank_transfer")}
                  />
                  <span className="flex-1">
                    <div className="flex items-center gap-2">
                      <strong>Direct Bank Transfer</strong>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                        BACS / Faster Payments / IBAN
                      </span>
                    </div>
                    <small>
                      Transfer directly to our official UK Wise business account (Sort Code, Account No &amp; IBAN)
                    </small>
                  </span>
                </label>

                {paymentMethod === "bank_transfer" && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-3">
                    <div className="flex items-center gap-2 font-bold text-amber-950">
                      <Building2 className="w-4 h-4 text-amber-700" />
                      <span>Official UK Wise Business Account Details</span>
                    </div>
                    <p className="text-amber-900/90 leading-relaxed">
                      Please send payment to our official <strong>Wise</strong> business account using Faster Payments or BACS. An official receipt with your unique order reference will be generated immediately upon confirmation.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white p-3.5 rounded-lg border border-amber-200 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans uppercase">
                          Bank
                        </span>
                        <strong className="text-foreground font-sans">Wise</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans uppercase">
                          Account Name
                        </span>
                        <strong className="text-foreground font-sans">
                          Abaz Mart Ltd
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans uppercase">
                          Sort Code
                        </span>
                        <strong className="text-foreground font-bold text-rose-700">60-84-64</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans uppercase">
                          Account Number
                        </span>
                        <strong className="text-foreground font-bold text-rose-700">60869680</strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-muted-foreground block font-sans uppercase">
                          IBAN
                        </span>
                        <strong className="text-foreground break-all">GB71 TRWI 6084 6460 8696 80</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-sans uppercase">
                          SWIFT / BIC
                        </span>
                        <strong className="text-foreground">TRWIGB2LXXX</strong>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      * Office 951 60 Tottenham Court Road, Fitzrovia, London W1T 2EW, UK
                    </p>
                  </div>
                )}
              </div>

              <p className="secure-note mt-4">
                <LockKeyhole /> 256-bit bank-grade encryption protects your payment information.
              </p>
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
            {step === 1 ? (
              <Button onClick={nextStep}>
                Continue to Payment <ArrowRight />
              </Button>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  width: "100%",
                }}
              >
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
                  disabled={
                    cart.length === 0 ||
                    submittingOrder ||
                    (stripeLoading && paymentMethod === "card")
                  }
                >
                  <LockKeyhole />{" "}
                  {submittingOrder
                    ? "Securing Your Order..."
                    : paymentMethod === "bank_transfer"
                      ? `Place Order & View Bank Receipt (${formatPrice(orderTotal)})`
                      : `Pay ${formatPrice(orderTotal)} Securely`}
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
            deliveryOption={deliveryOption}
          />
          <p className="secure-note">
            <LockKeyhole /> Secure checkout powered by encrypted payments.
          </p>
        </aside>
      </div>
    </div>
  )
}
