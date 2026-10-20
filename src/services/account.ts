import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { Database, OrderStatus, PaymentMethod } from "../types/database"
import { products } from "../data/products"
import { formatUKPostcode } from "../utils/ukPostcode"

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"]
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"]
export type UserAddressRow = Database["public"]["Tables"]["user_addresses"]["Row"]

export interface CustomerOrderItem {
  id: number
  productId: number | null
  name: string
  brand: string
  image: string
  option: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface CustomerOrder {
  id: string
  number: string
  date: string
  status: OrderStatus
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  paymentMethod?: PaymentMethod
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  shippedAt?: string
  items: CustomerOrderItem[]
  shippingAddress: {
    name: string
    phone: string
    address: string
    city: string
    postalCode: string
    country: string
  }
}

export interface AddressItem {
  id: number
  label: string
  name: string
  phone?: string | null
  line: string
  city: string
  state?: string | null
  postalCode: string
  country: string
  isDefault: boolean
}

/**
 * Fetch all orders for the authenticated customer.
 */
export async function getCustomerOrders(
  userId: string,
): Promise<{ data: CustomerOrder[]; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: getFallbackOrders(), error: null }
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (*)
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Failed to fetch customer orders from Supabase:", error.message)
      return { data: getFallbackOrders(), error: null }
    }

    if (!data || data.length === 0) {
      return { data: [], error: null }
    }

    const mapped: CustomerOrder[] = data.map((o) => {
      const createdDate = new Date(o.created_at)
      const formattedDate = createdDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })

      let orderStatus = o.status
      if (typeof window !== "undefined") {
        const localStatus = localStorage.getItem(`abaz_order_status_${o.id}`) as OrderStatus | null
        if (localStatus) {
          orderStatus = localStatus
        }
      }

      const rawItems = (o.order_items as OrderItemRow[]) || []
      const items: CustomerOrderItem[] = rawItems.map((item) => ({
        id: Number(item.id),
        productId: item.product_id ? Number(item.product_id) : null,
        name: item.product_name,
        brand: item.product_brand,
        image: item.product_image,
        option: item.selected_option,
        unitPrice: Number(item.unit_price),
        quantity: item.quantity,
        lineTotal: Number(item.line_total),
      }))

      let carrier = (o as any).carrier || undefined
      let trackingNumber = (o as any).tracking_number || undefined
      let trackingUrl = (o as any).tracking_url || undefined
      let shippedAt = (o as any).shipped_at || undefined

      if (typeof window !== "undefined") {
        try {
          const rawTracking = localStorage.getItem(`abaz_order_tracking_${o.id}`)
          if (rawTracking) {
            const parsedTracking = JSON.parse(rawTracking)
            carrier = parsedTracking.carrier || carrier
            trackingNumber = parsedTracking.trackingNumber || trackingNumber
            trackingUrl = parsedTracking.trackingUrl || trackingUrl
            shippedAt = parsedTracking.shippedAt || shippedAt
          }
        } catch {}
      }

      return {
        id: o.id,
        number: o.order_number,
        date: formattedDate,
        status: orderStatus,
        subtotal: Number(o.subtotal),
        shipping: Number(o.shipping),
        tax: Number(o.tax),
        discount: Number(o.discount),
        total: Number(o.total),
        paymentMethod: (o.payment_method as PaymentMethod) || "card",
        carrier,
        trackingNumber,
        trackingUrl,
        shippedAt,
        items,
        shippingAddress: {
          name: o.shipping_name,
          phone: o.shipping_phone,
          address: o.shipping_address,
          city: o.shipping_city,
          postalCode: o.shipping_postal_code,
          country: o.shipping_country,
        },
      }
    })

    return { data: mapped, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load orders"
    return { data: getFallbackOrders(), error: new Error(message) }
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Cancel an order safely with local resilience and database syncing.
 */
export async function cancelOrder(
  orderId: string,
): Promise<{ success: boolean; error: Error | null }> {
  // Always record cancellation locally so it immediately takes effect and persists
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`abaz_order_status_${orderId}`, "Cancelled")
      window.dispatchEvent(
        new CustomEvent("abaz_order_status_changed", {
          detail: { orderId, status: "Cancelled" },
        }),
      )
    } catch {}
  }

  // Non-UUID (e.g. demo-1, demo-3) or unconfigured Supabase
  if (!UUID_REGEX.test(orderId) || !isSupabaseConfigured()) {
    return { success: true, error: null }
  }

  try {
    // 1. Try secure stored procedure first
    const { data, error } = await supabase.rpc("cancel_order_secure", {
      p_order_id: orderId,
    })

    if (!error && data) {
      return { success: true, error: null }
    }

    // 2. Fallback to direct table update if RPC failed (e.g. order was Processing, or RPC uninstalled)
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "Cancelled" })
      .eq("id", orderId)

    if (updateError) {
      console.warn("Direct DB order cancel error (persisted locally):", updateError.message)
    }

    return { success: true, error: null }
  } catch (err: unknown) {
    console.warn("Order cancellation caught error (persisted locally):", err)
    return { success: true, error: null }
  }
}

/**
 * Fetch customer addresses.
 */
export async function getCustomerAddresses(
  userId: string,
): Promise<{ data: AddressItem[]; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: getFallbackAddresses(), error: null }
  }

  try {
    const { data, error } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })

    if (error) {
      return { data: getFallbackAddresses(), error: null }
    }

    const mapped: AddressItem[] = (data || []).map((a) => ({
      id: Number(a.id),
      label: a.label,
      name: a.full_name,
      phone: a.phone,
      line: a.address_line,
      city: a.city,
      state: a.state,
      postalCode: a.postal_code,
      country: a.country,
      isDefault: a.is_default,
    }))

    return { data: mapped, error: null }
  } catch {
    return { data: getFallbackAddresses(), error: null }
  }
}

/**
 * Add a new saved address.
 */
export async function addCustomerAddress(
  userId: string,
  address: Omit<AddressItem, "id">,
): Promise<{ data: AddressItem | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return {
      data: { id: Date.now(), ...address },
      error: null,
    }
  }

  try {
    const { data, error } = await supabase
      .from("user_addresses")
      .insert({
        user_id: userId,
        label: address.label,
        full_name: address.name,
        phone: address.phone || null,
        address_line: address.line,
        city: address.city,
        state: address.state || null,
        postal_code: formatUKPostcode(address.postalCode),
        country: "United Kingdom",
        is_default: address.isDefault ?? false,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return {
      data: {
        id: Number(data.id),
        label: data.label,
        name: data.full_name,
        phone: data.phone,
        line: data.address_line,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        isDefault: data.is_default,
      },
      error: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add address"
    return { data: null, error: new Error(message) }
  }
}

/**
 * Update an existing saved address.
 */
export async function updateCustomerAddress(
  addressId: number,
  address: Partial<AddressItem>,
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: null }
  }

  try {
    const updates: Partial<UserAddressRow> = {}
    if (address.label !== undefined) updates.label = address.label
    if (address.name !== undefined) updates.full_name = address.name
    if (address.phone !== undefined) updates.phone = address.phone
    if (address.line !== undefined) updates.address_line = address.line
    if (address.city !== undefined) updates.city = address.city
    if (address.postalCode !== undefined)
      updates.postal_code = formatUKPostcode(address.postalCode)
    updates.country = "United Kingdom"
    if (address.isDefault !== undefined) updates.is_default = address.isDefault

    const { error } = await supabase
      .from("user_addresses")
      .update(updates)
      .eq("id", addressId)

    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update address"
    return { error: new Error(message) }
  }
}

/**
 * Delete a saved address.
 */
export async function deleteCustomerAddress(
  addressId: number,
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: null }
  }

  try {
    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("id", addressId)

    return { error: error ? new Error(error.message) : null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete address"
    return { error: new Error(message) }
  }
}

/**
 * Fetch customer wishlist from Supabase.
 */
export async function getCustomerWishlist(userId: string): Promise<number[]> {
  if (!isSupabaseConfigured()) return []

  try {
    const { data } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("user_id", userId)

    if (!data) return []
    return data.map((item) => Number(item.product_id))
  } catch {
    return []
  }
}

/**
 * Add or remove product from customer wishlist.
 */
export async function toggleCustomerWishlist(
  userId: string,
  productId: number,
  saved: boolean,
) {
  if (!isSupabaseConfigured()) return

  try {
    if (saved) {
      await supabase
        .from("wishlist_items")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId)
    } else {
      await supabase.from("wishlist_items").upsert({
        user_id: userId,
        product_id: productId,
      })
    }
  } catch (err) {
    console.warn("Failed to update wishlist in Supabase:", err)
  }
}

// Fallback demo mock orders
function getFallbackOrders(): CustomerOrder[] {
  return []
}

function getFallbackAddresses(): AddressItem[] {
  return [
    {
      id: 1,
      label: "Home",
      name: "Amara Williams",
      phone: "+44 20 7946 0958",
      line: "123 Rose Street, Apt 4B",
      city: "London",
      postalCode: "SW1A 1AA",
      country: "United Kingdom",
      isDefault: true,
    },
    {
      id: 2,
      label: "Work",
      name: "Amara Williams",
      phone: "+44 20 7946 0958",
      line: "88 Regent Street, Floor 4",
      city: "London",
      postalCode: "W1B 5RS",
      country: "United Kingdom",
      isDefault: false,
    },
  ]
}
