import { forwardRef, useImperativeHandle, useState } from "react"
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"

export interface EmbeddedStripeFormRef {
  submitPayment: () => Promise<{ success: boolean; error?: string; paymentIntentId?: string }>
}

interface EmbeddedStripeFormProps {
  onReady?: () => void
}

export const EmbeddedStripeForm = forwardRef<
  EmbeddedStripeFormRef,
  EmbeddedStripeFormProps
>(function EmbeddedStripeForm({ onReady }, ref) {
  const stripe = useStripe()
  const elements = useElements()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useImperativeHandle(ref, () => ({
    async submitPayment() {
      if (!stripe || !elements) {
        return { success: false, error: "Stripe has not initialized yet." }
      }

      setErrorMessage(null)

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout`,
        },
        redirect: "if_required",
      })

      if (result.error) {
        let msg = result.error.message || "Payment confirmation failed."
        if (result.error.code === "processing_error") {
          msg = "A processing error occurred. In Test Mode, please use the test card (4242 4242 4242 4242) with any future expiry and 123 CVC."
        }
        setErrorMessage(msg)
        return { success: false, error: msg }
      }

      if (
        result.paymentIntent &&
        (result.paymentIntent.status === "succeeded" ||
          result.paymentIntent.status === "processing")
      ) {
        return {
          success: true,
          paymentIntentId: result.paymentIntent.id,
        }
      }

      return {
        success: false,
        error: "Payment status pending or incomplete.",
      }
    },
  }))

  return (
    <div className="embedded-stripe-container space-y-3">
      {errorMessage && (
        <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-lg border border-rose-200">
          {errorMessage}
        </div>
      )}
      <PaymentElement
        id="payment-element"
        onReady={onReady}
        options={{
          layout: "tabs",
          wallets: {
            applePay: "auto",
            googlePay: "auto",
          },
        }}
      />
    </div>
  )
})
