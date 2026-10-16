import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { Database, PaymentMethod } from "../types/database"

export interface StoreSettings {
  shippingFee: number
  expeditedShippingFee: number
  freeShippingThreshold: number
  taxRate: number
  currency: string
  currencySymbol: string
  defaultCountry: string
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  shippingFee: 6.0,
  expeditedShippingFee: 8.5,
  freeShippingThreshold: 50.0,
  taxRate: 0.0,
  currency: "GBP",
  currencySymbol: "£",
  defaultCountry: "United Kingdom",
}

export interface CreateOrderParams {
  shippingName: string
  shippingPhone: string
  shippingAddress: string
  shippingCity: string
  shippingPostalCode: string
  shippingCountry: string
  paymentMethod: PaymentMethod
  items: {
    product_id: number
    quantity: number
    option: string
  }[]
  couponCode?: string | null
  shippingMethod?: "standard" | "expedited"
  shippingFee?: number
}

export interface OrderResult {
  order_id: string
  order_number: string
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  estimated_delivery: string
}

/**
 * Fetch store settings (shipping rates, tax rates, free shipping threshold).
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  const localExpedited =
    typeof window !== "undefined"
      ? localStorage.getItem("abaz_expedited_shipping_fee")
      : null
  const defaultExpedited = localExpedited
    ? parseFloat(localExpedited)
    : DEFAULT_STORE_SETTINGS.expeditedShippingFee

  if (!isSupabaseConfigured()) {
    return {
      ...DEFAULT_STORE_SETTINGS,
      expeditedShippingFee: defaultExpedited,
    }
  }

  try {
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()

    if (error || !data) {
      return {
        ...DEFAULT_STORE_SETTINGS,
        expeditedShippingFee: defaultExpedited,
      }
    }

    const fetchedExpedited = (data as any).expedited_shipping_fee

    return {
      shippingFee: Number(data.shipping_fee) || DEFAULT_STORE_SETTINGS.shippingFee,
      expeditedShippingFee:
        fetchedExpedited !== undefined && fetchedExpedited !== null
          ? Number(fetchedExpedited)
          : defaultExpedited,
      freeShippingThreshold:
        Number(data.free_shipping_threshold) ||
        DEFAULT_STORE_SETTINGS.freeShippingThreshold,
      taxRate: Number(data.tax_rate) || DEFAULT_STORE_SETTINGS.taxRate,
      currency: data.currency || DEFAULT_STORE_SETTINGS.currency,
      currencySymbol:
        data.currency_symbol || DEFAULT_STORE_SETTINGS.currencySymbol,
      defaultCountry:
        data.default_country || DEFAULT_STORE_SETTINGS.defaultCountry,
    }
  } catch {
    return {
      ...DEFAULT_STORE_SETTINGS,
      expeditedShippingFee: defaultExpedited,
    }
  }
}

/**
 * Validate a promo/coupon code using the hardened validate_coupon RPC.
 * Returns the exact discount amount calculated by PostgreSQL.
 */
export async function validateCoupon(
  code: string,
  subtotal: number,
): Promise<{ discount: number; error: Error | null }> {
  if (!code.trim() || subtotal <= 0) {
    return { discount: 0, error: null }
  }

  if (!isSupabaseConfigured()) {
    const normalized = code.trim().toUpperCase()
    if (normalized === "GLOW10" || normalized === "BEAUTY10") {
      return { discount: Math.round(subtotal * 0.1 * 100) / 100, error: null }
    }
    if (normalized === "WELCOME15") {
      return { discount: Math.round(subtotal * 0.15 * 100) / 100, error: null }
    }
    return {
      discount: 0,
      error: new Error("Invalid or expired coupon code"),
    }
  }

  try {
    const { data, error } = await supabase.rpc("validate_coupon", {
      p_code: code.trim(),
      p_subtotal: subtotal,
    })

    if (error) {
      return { discount: 0, error: new Error(error.message) }
    }

    const discountAmount = Number(data)
    if (discountAmount <= 0) {
      return {
        discount: 0,
        error: new Error("Coupon code is invalid, expired, or minimum spend not met"),
      }
    }

    return { discount: discountAmount, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to validate coupon"
    return { discount: 0, error: new Error(message) }
  }
}

/**
 * Create an order atomically through the SECURITY DEFINER RPC create_order_secure.
 * Restocks inventory if oversold, calculates subtotal from DB prices, and applies discount.
 */
export async function createOrderSecure(
  params: CreateOrderParams,
): Promise<{ data: OrderResult | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    // Demo fallback order creation
    const subtotal = params.items.reduce((sum, item) => sum + item.quantity * 25, 0)
    let shipping =
      subtotal >= DEFAULT_STORE_SETTINGS.freeShippingThreshold
        ? 0
        : DEFAULT_STORE_SETTINGS.shippingFee
    if (params.shippingFee !== undefined) {
      shipping = params.shippingFee
    } else if (params.shippingMethod === "expedited") {
      shipping = DEFAULT_STORE_SETTINGS.expeditedShippingFee
    }
    const discount = params.couponCode ? 10 : 0
    const total = subtotal + shipping - discount
    const deliveryDate = new Date()
    deliveryDate.setDate(
      deliveryDate.getDate() + (params.shippingMethod === "expedited" ? 2 : 4),
    )

    return {
      data: {
        order_id: `demo-${Date.now()}`,
        order_number: `ABZ-${Math.floor(100000 + Math.random() * 900000)}`,
        subtotal,
        shipping,
        tax: 0,
        discount,
        total,
        estimated_delivery: deliveryDate.toISOString().split("T")[0],
      },
      error: null,
    }
  }

  try {
    const { data, error } = await supabase.rpc("create_order_secure", {
      p_shipping_name: params.shippingName.trim(),
      p_shipping_phone: params.shippingPhone.trim(),
      p_shipping_address: params.shippingAddress.trim(),
      p_shipping_city: params.shippingCity.trim(),
      p_shipping_postal_code: params.shippingPostalCode.trim(),
      p_shipping_country: params.shippingCountry.trim(),
      p_payment_method: params.paymentMethod,
      p_items: params.items,
      p_coupon_code: params.couponCode ? params.couponCode.trim() : null,
    })

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    const orderResult = data as OrderResult
    // If expedited shipping was chosen or custom shipping fee provided, adjust shipping & total
    if (orderResult && params.shippingFee !== undefined && params.shippingFee !== orderResult.shipping) {
      const diff = params.shippingFee - orderResult.shipping
      const newTotal = Math.max(0, orderResult.total + diff)
      orderResult.shipping = params.shippingFee
      orderResult.total = newTotal
      try {
        await supabase
          .from("orders")
          .update({ shipping: params.shippingFee, total: newTotal })
          .eq("id", orderResult.order_id)
      } catch (patchErr) {
        console.warn("Could not sync expedited shipping to orders row:", patchErr)
      }
    }

    return { data: orderResult, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create order"
    return { data: null, error: new Error(message) }
  }
}

/**
 * Save user address to user_addresses table for logged-in users.
 */
export async function saveAddressForUser(address: {
  userId: string
  label?: string
  fullName: string
  phone?: string
  addressLine: string
  city: string
  postalCode: string
  country?: string
}) {
  if (!isSupabaseConfigured()) return

  try {
    await supabase.from("user_addresses").insert({
      user_id: address.userId,
      label: address.label || "Home",
      full_name: address.fullName,
      phone: address.phone || null,
      address_line: address.addressLine,
      city: address.city,
      postal_code: address.postalCode,
      country: address.country || "United Kingdom",
      is_default: false,
    })
  } catch (err) {
    console.warn("Failed to save user address:", err)
  }
}

/**
 * Fetch saved addresses for the authenticated user.
 */
export async function getUserAddresses(userId: string) {
  if (!isSupabaseConfigured()) return []

  try {
    const { data } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })

    return data || []
  } catch {
    return []
  }
}
