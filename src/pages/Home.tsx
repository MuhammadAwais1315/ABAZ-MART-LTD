import {
  ArrowRight,
  Camera,
  LockKeyhole,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { Link } from "react-router"
import { useEffect, useState } from "react"
import ProductCard from "../components/ProductCard"
import { Button, Input, RatingStars } from "../components/ui"
import { useStore } from "../context/StoreContext"
import { Product, products as initialProducts } from "../data/products"
import { useCategories } from "../hooks/useProducts"
import { getEffectiveProducts, getProducts } from "../services/products"

function Hero() {
  return (
    <section className="hero">
      <div className="shell hero-inner">
        <div className="hero-copy">
          <p className="eyebrow">Beauty that feels like you</p>
          <h1>Glow Naturally, Every Day</h1>
          <p>Discover premium skincare, makeup and haircare you can trust</p>
          <div className="button-row">
            <Link className="btn btn-primary" to="/shop">
              Shop Now <ArrowRight size={18} />
            </Link>
            <Link className="btn btn-outline" to="/shop?category=Skincare">
              Explore Skincare
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1694742971702-3887ed069538?auto=format&fit=crop&w=1200&q=88"
            alt="Premium skincare products arranged on a soft neutral surface"
          />
        </div>
      </div>
    </section>
  )
}

const categoryImages = [
  "https://images.unsplash.com/photo-1617213226302-99a82b62626f?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1602532381225-eec578361933?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1751373932697-e7ecf64ed084?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1593938741626-ba54576a743d?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1631730486547-77184f324d8f?auto=format&fit=crop&w=700&q=85",
]

const galleryImages = [
  "https://images.unsplash.com/photo-1631730486784-5456119f69ae?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1712112797786-d43620cac1fd?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1591375462355-a219af30bf16?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1546951400-c106ca5fc813?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1653784097013-786a8965ea3b?auto=format&fit=crop&w=700&q=85",
  "https://images.unsplash.com/photo-1701271482230-5ecaec3cd3e1?auto=format&fit=crop&w=700&q=85",
]

export default function Home() {
  const { addToCart, wishlist, toggleWishlist, notify } = useStore()
  const [catalog, setCatalog] = useState<Product[]>(() => getEffectiveProducts(initialProducts))
  const { categories } = useCategories()

  useEffect(() => {
    let mounted = true
    const loadProducts = () => {
      getProducts({ limit: 16 }).then((res) => {
        if (mounted && res.data) {
          setCatalog(res.data)
        }
      })
    }

    loadProducts()

    const handleCatalogUpdate = () => {
      loadProducts()
    }
    window.addEventListener("abaz_catalog_updated", handleCatalogUpdate)
    window.addEventListener("abaz_stock_updated", handleCatalogUpdate)
    window.addEventListener("abaz_order_placed", handleCatalogUpdate)
    window.addEventListener("storage", handleCatalogUpdate)

    return () => {
      mounted = false
      window.removeEventListener("abaz_catalog_updated", handleCatalogUpdate)
      window.removeEventListener("abaz_stock_updated", handleCatalogUpdate)
      window.removeEventListener("abaz_order_placed", handleCatalogUpdate)
      window.removeEventListener("storage", handleCatalogUpdate)
    }
  }, [])

  const newArrivals = catalog.slice(0, 8).map((product) => ({
    ...product,
    oldPrice: product.oldPrice ?? Math.ceil(product.price * 1.18),
  }))
  const bestSellers =
    catalog.length >= 4
      ? [catalog[0], catalog[4] || catalog[1], catalog[8] || catalog[2], catalog[12] || catalog[3]]
      : catalog.slice(0, 4)

  return (
    <>
      <Hero />
      <section className="category-section">
        <div className="shell section">
          <div className="section-head centered">
            <p className="eyebrow">Find your perfect match</p>
            <h2>Shop by category</h2>
          </div>
          <div className="home-category-grid">
            {categories.map((category, i) => (
              <Link
                to={`/shop?category=${category}`}
                className="home-category-tile"
                key={category}
              >
                <img src={categoryImages[i]} alt={`${category} collection`} />
                <strong>{category}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="section shell">
        <div className="section-head home-section-head">
          <div>
            <p className="eyebrow">Just landed</p>
            <h2>New Arrivals</h2>
          </div>
          <Link className="text-link" to="/shop?sort=new">
            View all <ArrowRight />
          </Link>
        </div>
        <div className="product-grid">
          {newArrivals.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
              <p className="font-serif text-lg text-ink">New Collection Coming Soon</p>
              <p className="mt-1 text-xs max-w-md mx-auto text-muted">
                Our boutique is currently curating luxury beauty essentials. Real products added in the Admin Portal will automatically appear here.
              </p>
            </div>
          ) : (
            newArrivals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
                onWishlist={toggleWishlist}
                isWishlisted={wishlist.includes(product.id)}
              />
            ))
          )}
        </div>
      </section>
      <section className="promo-banner shell">
        <div>
          <p className="eyebrow">Glow more, spend less</p>
          <h2>Up to 30% off on Skincare Essentials</h2>
          <p>
            Refresh your ritual with nourishing formulas your skin will love.
          </p>
          <Link className="btn btn-primary" to="/shop?category=Skincare">
            Shop Skincare <ArrowRight />
          </Link>
        </div>
        <img
          src={catalog[2]?.image || "https://images.unsplash.com/photo-1694742971702-3887ed069538?auto=format&fit=crop&w=800&q=80"}
          alt="Skincare essentials on sale"
        />
      </section>
      <section className="section shell">
        <div className="section-head home-section-head">
          <div>
            <p className="eyebrow">Loved by you</p>
            <h2>Best Sellers</h2>
          </div>
          <Link className="text-link" to="/shop">
            Shop best sellers <ArrowRight />
          </Link>
        </div>
        <div className="product-grid">
          {bestSellers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
              <p className="font-serif text-lg text-ink">Bestsellers Coming Soon</p>
              <p className="mt-1 text-xs max-w-md mx-auto text-muted">
                Products will automatically feature here as customers make purchases.
              </p>
            </div>
          ) : (
            bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
                onWishlist={toggleWishlist}
                isWishlisted={wishlist.includes(product.id)}
              />
            ))
          )}
        </div>
      </section>
      <section className="why-section">
        <div className="shell why-grid">
          <div>
            <ShieldCheck />
            <strong>100% Authentic</strong>
            <span>Only trusted brands</span>
          </div>
          <div>
            <Truck />
            <strong>Free Shipping over £50</strong>
            <span>Delivered with care</span>
          </div>
          <div>
            <Package />
            <strong>Easy Returns</strong>
            <span>30 days, no stress</span>
          </div>
          <div>
            <LockKeyhole />
            <strong>Secure Payment</strong>
            <span>Protected checkout</span>
          </div>
        </div>
      </section>
      <section className="social-gallery">
        <div className="section-head centered">
          <p className="eyebrow">@abazmart</p>
          <h2>Beauty in your feed</h2>
        </div>
        <div className="instagram-grid">
          {galleryImages.map((image, index) => (
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              aria-label={`View Abaz Mart social post ${index + 1}`}
              key={image}
            >
              <img
                src={image}
                alt={`Abaz Mart beauty inspiration ${index + 1}`}
              />
              <Camera />
            </a>
          ))}
        </div>
      </section>
      <section className="home-newsletter">
        <div className="shell">
          <p className="eyebrow">A little something for you</p>
          <h2>Get 10% off your first order</h2>
          <p>
            Sign up for new arrivals, expert beauty tips, and members-only
            offers.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              notify("Your 10% welcome offer is on its way")
            }}
          >
            <Input
              type="email"
              placeholder="Enter your email address"
              aria-label="Email address"
              required
            />
            <Button type="submit">
              Get my 10% off <ArrowRight />
            </Button>
          </form>
          <small>
            By subscribing, you agree to receive Abaz Mart news and offers.
          </small>
        </div>
      </section>
    </>
  )
}
