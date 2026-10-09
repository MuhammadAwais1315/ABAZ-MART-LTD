/**
 * Centralized currency and price formatting helper for Abaz Mart.
 * Defaults to GBP (£) with standard 2 decimal places.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount)
}
