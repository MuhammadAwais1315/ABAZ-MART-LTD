import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { Database, OrderStatus, PaymentMethod } from "../types/database"
import { products } from "../data/products"

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

      return {
        id: o.id,
        number: o.order_number,
        date: formattedDate,
        status: o.status,
        subtotal: Number(o.subtotal),
        shipping: Number(o.shipping),
        tax: Number(o.tax),
        discount: Number(o.discount),
        total: Number(o.total),
        paymentMethod: (o.payment_method as PaymentMethod) || "card",
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

/**
 * Cancel a pending order securely via cancel_order_secure RPC.
 */
export async function cancelOrder(
  orderId: string,
): Promise<{ success: boolean; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { success: true, error: null }
  }

  try {
    const { data, error } = await supabase.rpc("cancel_order_secure", {
      p_order_id: orderId,
    })

    if (error) {
      return { success: false, error: new Error(error.message) }
    }

    return { success: Boolean(data), error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cancellation failed"
    return { success: false, error: new Error(message) }
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
        postal_code: address.postalCode,
        country: address.country || "United Kingdom",
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
    if (address.postalCode !== undefined) updates.postal_code = address.postalCode
    if (address.country !== undefined) updates.country = address.country
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
  if (!isSupabaseConfigured()) return [1, 5, 9]

  try {
    const { data } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("user_id", userId)

    if (!data) return [1, 5, 9]
    return data.map((item) => Number(item.product_id))
  } catch {
    return [1, 5, 9]
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
  return [
    {
      id: "demo-1",
      number: "ABZ-10842",
      date: "18 February 2026",
      status: "Delivered",
      subtotal: 126.4,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 126.4,
      items: [
        {
          id: 101,
          productId: products[0].id,
          name: products[0].name,
          brand: products[0].brand,
          image: products[0].image,
          option: products[0].options[0] || "Standard",
          unitPrice: products[0].price,
          quantity: 1,
          lineTotal: products[0].price,
        },
        {
          id: 102,
          productId: products[4].id,
          name: products[4].name,
          brand: products[4].brand,
          image: products[4].image,
          option: products[4].options[0] || "Standard",
          unitPrice: products[4].price,
          quantity: 1,
          lineTotal: products[4].price,
        },
      ],
      shippingAddress: {
        name: "Amara Williams",
        phone: "+44 20 7946 0958",
        address: "123 Rose Street, Apt 4B",
        city: "London",
        postalCode: "SW1A 1AA",
        country: "United Kingdom",
      },
    },
    {
      id: "demo-2",
      number: "ABZ-10796",
      date: "2 February 2026",
      status: "Shipped",
      subtotal: 74.0,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 74.0,
      items: [
        {
          id: 103,
          productId: products[15].id,
          name: products[15].name,
          brand: products[15].brand,
          image: products[15].image,
          option: products[15].options[0] || "Standard",
          unitPrice: products[15].price,
          quantity: 1,
          lineTotal: products[15].price,
        },
      ],
      shippingAddress: {
        name: "Amara Williams",
        phone: "+44 20 7946 0958",
        address: "123 Rose Street, Apt 4B",
        city: "London",
        postalCode: "SW1A 1AA",
        country: "United Kingdom",
      },
    },
    {
      id: "demo-3",
      number: "ABZ-10751",
      date: "21 January 2026",
      status: "Pending",
      subtotal: 58.75,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 58.75,
      items: [
        {
          id: 104,
          productId: products[8].id,
          name: products[8].name,
          brand: products[8].brand,
          image: products[8].image,
          option: products[8].options[0] || "Standard",
          unitPrice: products[8].price,
          quantity: 1,
          lineTotal: products[8].price,
        },
      ],
      shippingAddress: {
        name: "Amara Williams",
        phone: "+44 20 7946 0958",
        address: "123 Rose Street, Apt 4B",
        city: "London",
        postalCode: "SW1A 1AA",
        country: "United Kingdom",
      },
    },
  ]
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
