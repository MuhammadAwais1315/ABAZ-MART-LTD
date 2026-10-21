/**
 * Meta (Facebook) Pixel Integration Utility
 * Pixel ID: 1179877284601261
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: any
  }
}

export function fbqTrack(event: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    try {
      if (params) {
        window.fbq("track", event, params)
      } else {
        window.fbq("track", event)
      }
    } catch (err) {
      console.warn(`[Meta Pixel] Error tracking ${event}:`, err)
    }
  }
}

export const metaPixel = {
  /**
   * Track PageView on SPA route transition
   */
  pageView: () => {
    fbqTrack("PageView")
  },

  /**
   * Track when a customer views a product detail page
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
   * Track when a customer adds an item to cart
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
   * Track when a customer initiates checkout
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
   * Track when an order / purchase is successfully placed
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
    })
  },
}
