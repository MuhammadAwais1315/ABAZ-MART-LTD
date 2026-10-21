/**
 * Meta (Facebook) Pixel Integration Utility
 * Pixel ID: 1652809650218364
 *
 * Implements official Meta standard events for e-commerce:
 * - PageView
 * - ViewContent
 * - Search
 * - AddToCart
 * - AddToWishlist
 * - InitiateCheckout
 * - AddPaymentInfo
 * - Purchase
 * - CompleteRegistration
 * - Subscribe
 * - Contact
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: any
  }
}

export function fbqTrack(event: string, params?: Record<string, any>) {
  if (typeof window !== "undefined") {
    // Visible console log for easy verification in browser DevTools
    console.log(`[Meta Pixel] Tracking "${event}":`, params || {})

    if (typeof window.fbq === "function") {
      try {
        if (params) {
          window.fbq("track", event, params)
        } else {
          window.fbq("track", event)
        }
      } catch (err) {
        console.warn(`[Meta Pixel] Error tracking ${event}:`, err)
      }
    } else {
      console.warn("[Meta Pixel] window.fbq is not yet available.")
    }
  }
}

export const metaPixel = {
  /**
   * 1. PageView - Triggered on page load & SPA route change
   */
  pageView: () => {
    fbqTrack("PageView")
  },

  /**
   * 2. ViewContent - Triggered when a customer views a product page
   */
  viewContent: (product: {
    id: string | number
    name: string
    price: number
    category?: string
    brand?: string
  }) => {
    fbqTrack("ViewContent", {
      content_name: product.name,
      content_category: product.category || "Skincare",
      content_ids: [String(product.id)],
      content_type: "product",
      value: Number(product.price.toFixed(2)),
      currency: "GBP",
    })
  },

  /**
   * 3. Search - Triggered when a customer searches products
   */
  search: (query: string) => {
    if (!query || !query.trim()) return
    fbqTrack("Search", {
      search_string: query.trim(),
    })
  },

  /**
   * 4. AddToCart - Triggered when an item is added to the bag
   */
  addToCart: (
    product: { id: string | number; name: string; price: number },
    quantity = 1,
  ) => {
    fbqTrack("AddToCart", {
      content_name: product.name,
      content_ids: [String(product.id)],
      content_type: "product",
      value: Number((product.price * quantity).toFixed(2)),
      currency: "GBP",
    })
  },

  /**
   * 5. AddToWishlist - Triggered when a product is saved to wishlist
   */
  addToWishlist: (product: { id: string | number; name: string; price: number }) => {
    fbqTrack("AddToWishlist", {
      content_name: product.name,
      content_ids: [String(product.id)],
      content_type: "product",
      value: Number(product.price.toFixed(2)),
      currency: "GBP",
    })
  },

  /**
   * 6. InitiateCheckout - Triggered when entering checkout
   */
  initiateCheckout: (
    items: { id: string | number; price?: number; quantity?: number }[],
    total: number,
  ) => {
    fbqTrack("InitiateCheckout", {
      content_ids: items.map((i) => String(i.id)),
      content_type: "product",
      num_items: items.reduce((sum, i) => sum + (i.quantity || 1), 0),
      value: Number(total.toFixed(2)),
      currency: "GBP",
    })
  },

  /**
   * 7. AddPaymentInfo - Triggered when selecting payment method / entering payment details
   */
  addPaymentInfo: (total: number, paymentMethod = "card") => {
    fbqTrack("AddPaymentInfo", {
      value: Number(total.toFixed(2)),
      currency: "GBP",
      payment_type: paymentMethod,
    })
  },

  /**
   * 8. Purchase - Triggered upon order confirmation & receipt generation
   */
  purchase: (order: {
    order_number?: string
    total: number
    items?: { id?: string | number; product_id?: string | number }[]
  }) => {
    const contentIds =
      order.items?.map((i) => String(i.id || i.product_id)).filter(Boolean) || []
    fbqTrack("Purchase", {
      content_type: "product",
      content_ids: contentIds,
      num_items: order.items?.length || 1,
      value: Number(order.total.toFixed(2)),
      currency: "GBP",
      order_id: order.order_number || "",
    })
  },

  /**
   * 9. CompleteRegistration - Triggered when a new user registers an account
   */
  completeRegistration: (method = "email") => {
    fbqTrack("CompleteRegistration", {
      status: "success",
      method,
    })
  },

  /**
   * 10. Subscribe - Triggered on newsletter subscription
   */
  subscribe: (email?: string) => {
    fbqTrack("Subscribe", {
      value: 0.0,
      currency: "GBP",
      predicted_ltv: 25.0,
    })
  },

  /**
   * 11. Contact - Triggered when clicking WhatsApp or contact links
   */
  contact: (channel = "whatsapp") => {
    fbqTrack("Contact", {
      channel,
    })
  },
}
