import { useEffect, useRef, useState } from "react"
import { Outlet, useLocation } from "react-router"
import { Check } from "lucide-react"
import Navbar from "./Navbar"
import Footer from "./Footer"
import CartDrawer from "./CartDrawer"
import CookieBanner from "../common/CookieBanner"
import SiteUtilities from "../SiteUtilities"
import { Toast } from "../ui"
import { useAuth } from "../../context/AuthContext"
import { CartItem, StoreContext } from "../../context/StoreContext"
import { Product, products } from "../../data/products"
import { useScrollReveal } from "../../hooks/useScrollReveal"
import { metaPixel } from "../../utils/metaPixel"
import {
  getCustomerWishlist,
  toggleCustomerWishlist,
} from "../../services/account"
import { getEffectiveProducts, isProductDeleted } from "../../services/products"

export default function RootLayout() {
  useScrollReveal()
  const location = useLocation()
  const isFirstRender = useRef(true)

  // Track Meta Pixel PageView on client-side route changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    metaPixel.pageView()
  }, [location.pathname, location.search])

  const { user } = useAuth()
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = window.localStorage.getItem("abaz-mart-cart")
      if (!saved) return []
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) return []

      return parsed.flatMap((entry: any) => {
        // If full product is preserved in cart storage
        if (entry && entry.product && entry.product.id) {
          return [
            {
              product: entry.product,
              quantity: Math.max(1, Number(entry.quantity) || 1),
              option: entry.option || entry.product.options?.[0] || "Standard",
            },
          ]
        }
        // Fallback for legacy format where only { id, quantity, option } was saved
        if (entry && entry.id) {
          const found = getEffectiveProducts(products).find((p) => p.id === entry.id)
          if (found) {
            return [
              {
                product: found,
                quantity: Math.max(1, Number(entry.quantity) || 1),
                option: entry.option || found.options?.[0] || "Standard",
              },
            ]
          }
        }
        return []
      })
    } catch {
      return []
    }
  })
  const [wishlist, setWishlist] = useState<number[]>(() => {
    try {
      const saved = window.localStorage.getItem("abaz-mart-wishlist")
      if (!saved) return []
      const list = JSON.parse(saved) as number[]
      if (!Array.isArray(list)) return []

      // Automatically purge legacy mock default wishlist [1, 5, 9]
      const isLegacyMock =
        list.length === 3 &&
        list.includes(1) &&
        list.includes(5) &&
        list.includes(9)
      if (isLegacyMock) {
        window.localStorage.removeItem("abaz-mart-wishlist")
        return []
      }

      return list.filter((id) => !isProductDeleted(id))
    } catch {
      return []
    }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const notify = (message: string) => setToastMessage(message)

  // Sync when catalog updates (e.g. admin deletes or updates a product)
  useEffect(() => {
    try {
      // Purge any legacy deleted IDs from browser local storage so real products are never suppressed
      window.localStorage.removeItem("abaz_deleted_product_ids")
    } catch {}

    const handleCatalogUpdate = () => {
      setCart((current) => current.filter((item) => !isProductDeleted(item.product.id)))
      setWishlist((current) => current.filter((id) => !isProductDeleted(id)))
    }
    window.addEventListener("abaz_catalog_updated", handleCatalogUpdate)
    window.addEventListener("storage", handleCatalogUpdate)
    return () => {
      window.removeEventListener("abaz_catalog_updated", handleCatalogUpdate)
      window.removeEventListener("storage", handleCatalogUpdate)
    }
  }, [])

  // Sync wishlist from Supabase for authenticated customer
  useEffect(() => {
    let mounted = true
    async function syncUserWishlist() {
      if (user?.id) {
        const liveWishlist = await getCustomerWishlist(user.id)
        if (mounted && liveWishlist.length > 0) {
          setWishlist(liveWishlist)
        }
      }
    }
    syncUserWishlist()
    return () => {
      mounted = false
    }
  }, [user?.id])

  // Persist wishlist locally
  useEffect(() => {
    window.localStorage.setItem("abaz-mart-wishlist", JSON.stringify(wishlist))
  }, [wishlist])

  const addToCart = (
    product: Product,
    quantity = 1,
    option = product.options[0],
  ) => {
    const maxStock = product.stock !== undefined ? product.stock : 99
    if (maxStock <= 0) {
      notify(`"${product.name}" is currently out of stock`)
      return
    }

    let addedCount = 0
    let reachedLimit = false

    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id)
      const currentQty = found ? found.quantity : 0
      const availableToAdd = Math.max(0, maxStock - currentQty)

      if (availableToAdd <= 0) {
        reachedLimit = true
        return current
      }

      addedCount = Math.min(quantity, availableToAdd)
      if (addedCount < quantity) {
        reachedLimit = true
      }

      const finalQty = currentQty + addedCount

      return found
        ? current.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: finalQty, option: option || item.option }
              : item,
          )
        : [
            ...current,
            {
              product,
              quantity: addedCount,
              option: option || product.options?.[0] || "Standard",
            },
          ]
    })

    if (reachedLimit && addedCount === 0) {
      notify(`Maximum available stock (${maxStock}) is already in your cart`)
    } else if (reachedLimit) {
      if (addedCount > 0) {
        metaPixel.addToCart(product, addedCount)
      }
      notify(`Only ${maxStock} in stock. Added ${addedCount} to your cart.`)
      setCartOpen(true)
    } else {
      metaPixel.addToCart(product, quantity)
      notify(`${quantity} × ${product.name} added to your cart`)
      setCartOpen(true)
    }
  }

  const updateQuantity = (id: number, quantity: number) => {
    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== id) return item
        const maxStock = item.product.stock !== undefined ? item.product.stock : 99
        if (quantity > maxStock) {
          notify(`Only ${maxStock} available in stock for ${item.product.name}`)
          return { ...item, quantity: Math.max(1, maxStock) }
        }
        return { ...item, quantity: Math.max(1, quantity) }
      }),
    )
  }

  const removeFromCart = (id: number) =>
    setCart((current) => current.filter((item) => item.product.id !== id))

  const clearCart = () => setCart([])

  const toggleWishlist = (product: Product) => {
    const isSaved = wishlist.includes(product.id)
    if (!isSaved) {
      metaPixel.addToWishlist(product)
    }
    setWishlist((current) =>
      current.includes(product.id)
        ? current.filter((id) => id !== product.id)
        : [...current, product.id],
    )
    if (user?.id) {
      toggleCustomerWishlist(user.id, product.id, isSaved)
    }
    notify(
      isSaved
        ? `${product.name} removed from your wishlist`
        : `${product.name} saved to your wishlist`,
    )
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    try {
      window.localStorage.setItem("abaz-mart-cart", JSON.stringify(cart))
    } catch (err) {
      console.warn("Failed to persist cart to localStorage:", err)
    }
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
      <CookieBanner />
      {toastMessage && (
        <Toast>
          <Check /> {toastMessage}
        </Toast>
      )}
    </>
  )
}
