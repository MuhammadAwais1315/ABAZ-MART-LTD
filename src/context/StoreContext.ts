import { useOutletContext } from "react-router"
import { Product } from "../data/products"

export type CartItem = {
  product: Product
  quantity: number
  option: string
}

export type StoreContext = {
  cart: CartItem[]
  wishlist: number[]
  addToCart: (product: Product, quantity?: number, option?: string) => void
  toggleWishlist: (product: Product) => void
  updateQuantity: (id: number, quantity: number) => void
  removeFromCart: (id: number) => void
  clearCart: () => void
  notify: (message: string) => void
}

export function useStore() {
  return useOutletContext<StoreContext>()
}
