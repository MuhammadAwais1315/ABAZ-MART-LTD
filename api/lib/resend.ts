import { Resend } from "resend"

/**
 * Validates and returns an initialized Resend instance.
 * Returns null if RESEND_API_KEY is missing or contains placeholder values.
 */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("placeholder") || apiKey.includes("your_")) {
    return null
  }
  return new Resend(apiKey.trim())
}

/**
 * Returns the configured 'from' email address.
 * Defaults to Resend's verified testing domain (onboarding@resend.dev) if not configured.
 */
export function getSenderEmail(): string {
  const customFrom = process.env.RESEND_FROM_EMAIL?.trim()
  if (customFrom && customFrom.length > 0 && !customFrom.includes("placeholder")) {
    return customFrom
  }
  // Default sandbox sender provided by Resend for immediate zero-config testing
  return "Abaz Mart <onboarding@resend.dev>"
}
