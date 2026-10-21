import { FormEvent, useEffect, useState } from "react"
import { Link, NavLink, useNavigate } from "react-router"
import {
  ArrowRight,
  CircleUserRound,
  Heart,
  House,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "../ui"
import { metaPixel } from "../../utils/metaPixel"
import { useAuth } from "../../context/AuthContext"
import { Product, products as initialProducts } from "../../data/products"
import { formatPrice } from "../../utils/formatPrice"
import { useCategories } from "../../hooks/useProducts"
import { getProducts } from "../../services/products"
import { getStoreSettings } from "../../services/checkout"

export default function Navbar({
  cartCount,
  wishlistCount,
  onCartOpen,
}: {
  cartCount: number
  wishlistCount: number
  onCartOpen: () => void
}) {
  const { user, profile, isAdmin } = useAuth()
  const { categories } = useCategories()
  const [catalog, setCatalog] = useState<Product[]>(initialProducts)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [shippingThreshold, setShippingThreshold] = useState(50)
  const [currencySymbol, setCurrencySymbol] = useState("£")
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    const loadSettings = () => {
      getStoreSettings().then((settings) => {
        if (mounted) {
          setShippingThreshold(settings.freeShippingThreshold)
          setCurrencySymbol(settings.currencySymbol)
        }
      })
    }
    loadSettings()

    window.addEventListener("abaz_settings_updated", loadSettings)
    window.addEventListener("storage", loadSettings)
    return () => {
      mounted = false
      window.removeEventListener("abaz_settings_updated", loadSettings)
      window.removeEventListener("storage", loadSettings)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    getProducts({ limit: 50 }).then((res) => {
      if (mounted && res.data && res.data.length > 0) {
        setCatalog(res.data)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const suggestions = query.trim()
    ? catalog
        .filter((product) =>
          `${product.name} ${product.brand} ${product.category}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .slice(0, 5)
    : []

  const search = (event: FormEvent) => {
    event.preventDefault()
    if (query.trim()) {
      metaPixel.search(query.trim())
    }
    navigate(`/shop?q=${encodeURIComponent(query)}`)
    setMobileSearchOpen(false)
    setMobileOpen(false)
    setQuery("")
  }

  return (
    <>
      <div className="announcement">
        <Sparkles size={14} /> Free shipping on orders over {currencySymbol}{shippingThreshold}{" "}
        <span> · Easy 30-day returns</span>
      </div>
      <header className="navbar">
        <div className="nav-main shell">
          <Button
            variant="ghost"
            className="mobile-menu"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
          <Link to="/" className="logo-brand" aria-label="Abaz Mart Home">
            <img
              src="/logo-horizontal.png"
              alt="Abaz Mart"
              className="site-logo"
            />
          </Link>
          <div className="mobile-header-actions">
            <Button
              variant="ghost"
              aria-label="Open search"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              {mobileSearchOpen ? <X /> : <Search />}
            </Button>
          </div>
          <form className="search" onSubmit={search}>
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products, brands..."
              aria-label="Search products"
            />
            {query.trim() && (
              <div className="search-suggestions">
                <span>Product suggestions</span>
                {suggestions.length ? (
                  suggestions.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      onClick={() => setQuery("")}
                    >
                      <img src={product.image} alt={product.name} />
                      <span>
                        <strong>{product.name}</strong>
                        <small>
                          {product.brand} · {formatPrice(product.price)}
                        </small>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p>No matching products found.</p>
                )}
                <Link
                  className="search-all-link"
                  to={`/shop?q=${encodeURIComponent(query)}`}
                  onClick={() => setQuery("")}
                >
                  View all results <ArrowRight />
                </Link>
              </div>
            )}
          </form>
          <div className="nav-icons">
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-900 text-stone-100 hover:bg-stone-800 transition shadow-xs"
                title="Admin Dashboard"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin</span>
              </Link>
            )}
            <Link
              to={user ? "/account" : "/login"}
              aria-label={user ? (profile?.full_name || "My Account") : "Sign in / Register"}
              title={user ? (profile?.full_name || "My Account") : "Sign in / Register"}
              className="inline-flex items-center justify-center"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Account"}
                  className="w-6 h-6 rounded-full object-cover border border-stone-300"
                />
              ) : (
                <CircleUserRound />
              )}
            </Link>
            <Link
              to="/account"
              className="wishlist-icon"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <Heart />
              {wishlistCount > 0 && <b>{wishlistCount}</b>}
            </Link>
            <Button
              variant="ghost"
              className="cart-icon nav-icon-button"
              aria-label={`Cart with ${cartCount} items`}
              onClick={onCartOpen}
            >
              <ShoppingBag />
              <b>{cartCount}</b>
            </Button>
          </div>
        </div>
        {mobileSearchOpen && (
          <form className="mobile-search-panel" onSubmit={search}>
            <Search />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products and brands..."
              aria-label="Search products"
            />
            <Button type="submit">Search</Button>
            {query.trim() && (
              <div className="search-suggestions mobile-suggestions">
                {suggestions.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    onClick={() => {
                      setQuery("")
                      setMobileSearchOpen(false)
                    }}
                  >
                    <img src={product.image} alt={product.name} />
                    <span>
                      <strong>{product.name}</strong>
                      <small>{product.brand}</small>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </form>
        )}
        {mobileOpen && (
          <div
            className="mobile-nav-backdrop"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <nav className={`category-nav ${mobileOpen ? "is-open" : ""}`}>
          <div className="mobile-drawer-head">
            <Link
              to="/"
              className="logo-brand"
              onClick={() => setMobileOpen(false)}
              aria-label="Abaz Mart Home"
            >
              <img
                src="/logo-horizontal.png"
                alt="Abaz Mart"
                className="site-logo"
              />
            </Link>
            <Button
              variant="ghost"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X />
            </Button>
          </div>
          {categories.map((category) => (
            <NavLink
              key={category}
              to={`/shop?category=${encodeURIComponent(category)}`}
              onClick={() => setMobileOpen(false)}
            >
              {category}
            </NavLink>
          ))}
          <NavLink
            to="/shop?sort=sale"
            className="sale-link"
            onClick={() => setMobileOpen(false)}
          >
            Sale
          </NavLink>
          <div className="mobile-drawer-links">
            <Link
              to={user ? "/account" : "/login"}
              onClick={() => setMobileOpen(false)}
            >
              <CircleUserRound /> {user ? "My Account" : "Sign In / Register"}
            </Link>
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}>
                <ShieldCheck className="w-4 h-4 text-amber-600" /> Admin Portal
              </Link>
            )}
            <Link
              to="/account?tab=wishlist"
              onClick={() => setMobileOpen(false)}
            >
              <Heart /> Wishlist
            </Link>
          </div>
        </nav>
      </header>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end>
          <House />
          <span>Home</span>
        </NavLink>
        <NavLink to="/shop">
          <ShoppingBag />
          <span>Shop</span>
        </NavLink>
        <NavLink to="/account?tab=wishlist">
          <Heart />
          {wishlistCount > 0 && <b>{wishlistCount}</b>}
          <span>Wishlist</span>
        </NavLink>
        <Button variant="ghost" onClick={onCartOpen}>
          <ShoppingBag />
          {cartCount > 0 && <b>{cartCount}</b>}
          <span>Cart</span>
        </Button>
        <NavLink to={user ? "/account" : "/login"}>
          <CircleUserRound />
          <span>{user ? "Account" : "Sign In"}</span>
        </NavLink>
      </nav>
    </>
  )
}
