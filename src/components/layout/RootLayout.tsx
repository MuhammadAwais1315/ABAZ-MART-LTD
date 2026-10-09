import { useEffect, useState } from "react"
import { Outlet } from "react-router"
import { Check } from "lucide-react"
import Navbar from "./Navbar"
import Footer from "./Footer"
import CartDrawer from "./CartDrawer"
import SiteUtilities from "../SiteUtilities"
import { Toast } from "../ui"
import { CartItem, StoreContext } from "../../context/StoreContext"
import { Product, products } from "../../data/products"
import { useScrollReveal } from "../../hooks/useScrollReveal"

export default function RootLayout() {
  useScrollReveal()
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = window.localStorage.getItem("abaz-mart-cart")
      if (!saved) return []
      const entries = JSON.parse(saved) as {
        id: number
        quantity: number
        option?: string
      }[]
      return entries.flatMap((entry) => {
        const product = products.find((item) => item.id === entry.id)
        return product
          ? [
              {
                product,
                quantity: Math.max(1, entry.quantity),
                option: entry.option || product.options[0],
              },
            ]
          : []
      })
    } catch {
      return []
    }
  })
  const [wishlist, setWishlist] = useState<number[]>([1, 5, 9])
  const [cartOpen, setCartOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const notify = (message: string) => setToastMessage(message)

  const addToCart = (
    product: Product,
    quantity = 1,
    option = product.options[0],
  ) => {
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id)
      return found
        ? current.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          )
        : [...current, { product, quantity, option }]
    })
    setCartOpen(true)
    notify(`${quantity} × ${product.name} added to your cart`)
  }

  const updateQuantity = (id: number, quantity: number) =>
    setCart((current) =>
      current.map((item) =>
        item.product.id === id
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      ),
    )

  const removeFromCart = (id: number) =>
    setCart((current) => current.filter((item) => item.product.id !== id))

  const clearCart = () => setCart([])

  const toggleWishlist = (product: Product) => {
    const isSaved = wishlist.includes(product.id)
    setWishlist((current) =>
      current.includes(product.id)
        ? current.filter((id) => id !== product.id)
        : [...current, product.id],
    )
    notify(
      isSaved
        ? `${product.name} removed from your wishlist`
        : `${product.name} saved to your wishlist`,
    )
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    window.localStorage.setItem(
      "abaz-mart-cart",
      JSON.stringify(
        cart.map((item) => ({
          id: item.product.id,
          quantity: item.quantity,
          option: item.option,
        })),
      ),
    )
  }, [cart])

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(""), 2800)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  return (
    <>
      <Navbar
        cartCount={cartCount}
        wishlistCount={wishlist.length}
        onCartOpen={() => setCartOpen(true)}
      />
      <main>
        <Outlet
          context={
            {
              cart,
              wishlist,
              addToCart,
              toggleWishlist,
              updateQuantity,
              removeFromCart,
              clearCart,
              notify,
            } satisfies StoreContext
          }
        />
      </main>
      <Footer notify={notify} />
      <CartDrawer
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
      />
      <SiteUtilities />
      {toastMessage && (
        <Toast>
          <Check /> {toastMessage}
        </Toast>
      )}
    </>
  )
}
