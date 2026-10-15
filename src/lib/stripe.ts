import { loadStripe, Stripe } from "@stripe/stripe-js"

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""

let stripePromise: Promise<Stripe | null> | null = null

export const isStripeConfigured = (): boolean => {
  return Boolean(
    stripePublishableKey &&
      stripePublishableKey.startsWith("pk_") &&
      !stripePublishableKey.includes("placeholder"),
  )
}

export const getStripe = (): Promise<Stripe | null> => {
  if (!isStripeConfigured()) {
    return Promise.resolve(null)
  }

  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey)
  }

  return stripePromise
}
