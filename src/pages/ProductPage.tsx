import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  Heart,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react"
import ProductCard from "../components/ProductCard"
import ProductDescription, {
  getProductIntroExcerpt,
} from "../components/ProductDescription"
import { useCategories } from "../hooks/useProducts"
import { matchCategory } from "../utils/categoryMatcher"
import {
  Badge,
  Breadcrumb,
  Button,
  Input,
  Modal,
  RatingStars,
  Skeleton,
  Tabs,
} from "../components/ui"
import { useStore } from "../context/StoreContext"
import { useAuth } from "../context/AuthContext"
import { Product, products } from "../data/products"
import { formatPrice } from "../utils/formatPrice"
import {
  getEffectiveProducts,
  getProductById,
  getProducts,
  getProductReviews,
  isProductDeleted,
  ReviewItem,
  submitProductReview,
} from "../services/products"
import { getProductSlug, getProductUrl } from "../utils/slugify"
import { metaPixel } from "../utils/metaPixel"

export default function ProductPage() {
  const { slug, id } = useParams()
  const rawIdentifier = (slug || id || "").trim()
  const effectiveCatalog = getEffectiveProducts(products)
  const [catalog, setCatalog] = useState<Product[]>(effectiveCatalog)

  const isDeleted = rawIdentifier ? isProductDeleted(rawIdentifier) : false

  const findMatchingProduct = (list: Product[], key: string): Product | null => {
    if (!key) return null
    const lower = key.toLowerCase()
    const isNum = /^\d+$/.test(key)
    const num = isNum ? Number(key) : NaN

    return (
      list.find((item) => {
        if (isNum && item.id === num) return true
        if (item.slug && item.slug.toLowerCase() === lower) return true
        if (getProductSlug(item).toLowerCase() === lower) return true
        if (item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === lower) return true
        return false
      }) || null
    )
  }

  const initialProduct = findMatchingProduct(effectiveCatalog, rawIdentifier)
  const [product, setProduct] = useState<Product | null>(initialProduct)
  const [notFound, setNotFound] = useState(isDeleted)
  const { addToCart, wishlist, toggleWishlist, notify } = useStore()
  const { user } = useAuth()
  const { categories: storeCategories } = useCategories()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [option, setOption] = useState(initialProduct?.options?.[0] || "Default")
  const [detailTab, setDetailTab] = useState("Description")
  const [activeImage, setActiveImage] = useState(initialProduct?.image || "")
  const [productLoading, setProductLoading] = useState(true)
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([])
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState("")
  const [reviewContent, setReviewContent] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Fetch full live catalog for related products
  useEffect(() => {
    let mounted = true
    getProducts({ limit: 100 }).then((res) => {
      if (mounted && res.data && res.data.length > 0) {
        setCatalog(res.data)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const displayCategory = product
    ? storeCategories.find((c) => matchCategory(c, product.category)) ||
      product.category
    : ""

  const discount = product?.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0

  const productImages = product
    ? [
        product.image,
        ...catalog
          .filter(
            (item) =>
              matchCategory(item.category, product.category) &&
              item.id !== product.id,
          )
          .slice(0, 3)
          .map((item) => item.image),
      ]
    : []

  const relatedProducts = product
    ? [
        ...catalog.filter(
          (item) =>
            matchCategory(item.category, product.category) &&
            item.id !== product.id,
        ),
        ...catalog.filter(
          (item) =>
            !matchCategory(item.category, product.category) &&
            item.id !== product.id,
        ),
      ].slice(0, 4)
    : []

  const shadeClasses = [
    "shade-rose",
    "shade-nude",
    "shade-berry",
    "shade-cocoa",
  ]

  useEffect(() => {
    if (product && product.id) {
      metaPixel.viewContent(product)
    }
  }, [product?.id])

  // Redirect numeric IDs (e.g. /product/3) to SEO name-based slug URL (e.g. /product/eira-barrier-restore-cream)
  useEffect(() => {
    if (product && /^\d+$/.test(rawIdentifier)) {
      const canonicalSlugUrl = getProductUrl(product)
      if (canonicalSlugUrl && canonicalSlugUrl !== `/product/${rawIdentifier}`) {
        navigate(canonicalSlugUrl, { replace: true })
      }
    }
  }, [product, rawIdentifier, navigate])

  useEffect(() => {
    let mounted = true
    const loadProduct = () => {
      if (!rawIdentifier) return
      if (isProductDeleted(rawIdentifier)) {
        setNotFound(true)
        setProductLoading(false)
        return
      }
      getProductById(rawIdentifier).then((res) => {
        if (mounted) {
          if (res.data) {
            setProduct(res.data)
            setNotFound(false)
          } else {
            setNotFound(true)
          }
        }
      })
    }

    loadProduct()

    const handleStockUpdate = () => {
      loadProduct()
    }

    window.addEventListener("abaz_stock_updated", handleStockUpdate)
    window.addEventListener("abaz_catalog_updated", handleStockUpdate)
    window.addEventListener("storage", handleStockUpdate)

    return () => {
      mounted = false
      window.removeEventListener("abaz_stock_updated", handleStockUpdate)
      window.removeEventListener("abaz_catalog_updated", handleStockUpdate)
      window.removeEventListener("storage", handleStockUpdate)
    }
  }, [rawIdentifier])

  useEffect(() => {
    let mounted = true
    if (product?.id) {
      getProductReviews(product.id).then((res) => {
        if (mounted && res.data) {
          setReviewsList(res.data)
        }
      })
    }
    return () => {
      mounted = false
    }
  }, [product?.id])

  const handleOpenReview = () => {
    if (!user) {
      notify("Please sign in to write a review")
      navigate(
        `/login?redirect=${encodeURIComponent(product ? getProductUrl(product) : "/shop")}`,
      )
      return
    }
    setReviewError(null)
    setReviewModalOpen(true)
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    if (!reviewTitle.trim() || !reviewContent.trim()) {
      setReviewError("Please provide both a title and review comments.")
      return
    }

    setSubmittingReview(true)
    setReviewError(null)

    const res = await submitProductReview(
      product.id,
      reviewRating,
      reviewTitle,
      reviewContent,
    )

    setSubmittingReview(false)

    if (res.error) {
      setReviewError(res.error.message)
    } else {
      notify("Thank you! Your review has been submitted.")
      setReviewModalOpen(false)
      setReviewTitle("")
      setReviewContent("")
      getProductReviews(product.id).then((r) => {
        if (r.data) setReviewsList(r.data)
      })
    }
  }

  useEffect(() => {
    if (!product) return
    setProductLoading(true)
    setOption(product.options?.[0] || "Standard")
    setActiveImage(product.image)
    setQuantity(product.stock > 0 ? 1 : 0)
    setDetailTab("Description")
    const timer = window.setTimeout(() => setProductLoading(false), 320)
    return () => window.clearTimeout(timer)
  }, [product?.id, product?.image, product?.options, product?.stock])

  const handleAdd = () => {
    if (product && product.stock > 0) {
      addToCart(product, quantity, option)
    }
  }

  if (notFound || !product) {
    return (
      <div className="page shell text-center py-24 space-y-4">
        <h2 className="text-2xl font-serif">Product Not Found</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This product is no longer available in our boutique catalog.
        </p>
        <Link to="/shop" className="btn btn-primary inline-flex">
          Return to Shop
        </Link>
      </div>
    )
  }

  const isFragrance =
    matchCategory(product.category, "Fragrance") ||
    /extrait|parfum|fragrance|eau de/i.test(product.name) ||
    /fragrance notes/i.test(product.description)

  const detailContent =
    detailTab === "Description" ? (
      <div className="tab-copy !text-left !max-w-4xl pt-2">
        <ProductDescription
          description={product.description}
          productName={product.name}
          brand={product.brand}
          category={product.category}
        />
      </div>
    ) : detailTab === "Ingredients" ? (
      <div className="tab-copy !text-left !max-w-3xl">
        <h3 className="font-serif text-xl font-semibold mb-3 text-ink">
          {isFragrance ? "Fragrance Formulation" : "Clean Formulation"}
        </h3>
        <p className="text-stone-700 leading-relaxed text-sm md:text-base">
          {isFragrance
            ? "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Limonene, Linalool, Coumarin, Citronellol, Geraniol, Alpha-Isomethyl Ionone, Benzyl Benzoate. Crafted according to IFRA luxury perfumery standards. Please refer to individual product packaging for the batch-specific ingredient formulation."
            : "Aqua, glycerin, niacinamide, squalane, panthenol, vitamin E, botanical extracts, and skin-safe fragrance. Please refer to the product packaging for the most current full ingredient list."}
        </p>
      </div>
    ) : detailTab === "How to Use" ? (
      <div className="tab-copy !text-left !max-w-3xl">
        <h3 className="font-serif text-xl font-semibold mb-3 text-ink">
          {isFragrance ? "How to Apply Fragrance" : "Your Daily Ritual"}
        </h3>
        <p className="text-stone-700 leading-relaxed text-sm md:text-base">
          {isFragrance
            ? "Spray lightly onto warm pulse points: wrists, inner elbows, base of the neck, and behind the ears from a distance of 15–20 cm. Allow the extrait to dry naturally on the skin without rubbing to preserve the top notes and enable the complex heart and base accords to unfold seamlessly throughout the day."
            : "Apply a small amount to clean skin or hair as appropriate. Massage in gently and allow the formula to absorb before layering your next product. Use morning or evening for best results."}
        </p>
      </div>
    ) : detailTab === "Shipping & Returns" ? (
      <div className="tab-copy shipping-copy">
        <div>
          <Truck />
          <span>
            <h3>Fast, free shipping</h3>
            <p>Free standard shipping on orders over £50.</p>
          </span>
        </div>
        <div>
          <Package />
          <span>
            <h3>Easy 30-day returns</h3>
            <p>Return unopened products within 30 days for a full refund.</p>
          </span>
        </div>
      </div>
    ) : (
      <div className="reviews-panel">
        <div className="review-summary">
          <div className="review-score">
            <strong>{product.rating}</strong>
            <RatingStars rating={product.rating} />
            <span>Based on {product.reviewCount ?? reviewsList.length} reviews</span>
            <Button onClick={handleOpenReview}>Write a review</Button>
          </div>
          <div className="rating-breakdown">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars}>
                <span>{stars} star</span>
                <div>
                  <i />
                </div>
                <b>
                  {stars === 5
                    ? "86%"
                    : stars === 4
                      ? "10%"
                      : stars === 3
                        ? "3%"
                        : stars === 2
                          ? "1%"
                          : "0%"}
                </b>
              </div>
            ))}
          </div>
        </div>
        <div className="review-list">
          {reviewsList.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No reviews yet. Be the first to share your experience with this product!
            </div>
          ) : (
            reviewsList.map((review, idx) => (
              <article key={review.id ?? idx}>
                <div>
                  <RatingStars rating={review.rating} />
                  <span>{review.date}</span>
                </div>
                <h3>{review.title}</h3>
                <p>{review.text}</p>
                <strong>
                  {review.name}
                  {review.verified ? " · Verified buyer" : ""}
                </strong>
              </article>
            ))
          )}
        </div>
      </div>
    )

  if (productLoading) {
    return (
      <div
        className="page shell product-loading-page"
        aria-label="Loading product"
      >
        <Skeleton className="product-loading-breadcrumb" />
        <div className="product-loading-grid">
          <div className="product-loading-gallery">
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
          <Skeleton className="product-loading-image" />
          <div className="product-loading-copy">
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page shell product-page">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          {
            label: displayCategory,
            href: `/shop?category=${encodeURIComponent(displayCategory)}`,
          },
          { label: product.name },
        ]}
      />
      <div className="product-detail">
        <div className="product-gallery">
          <div className="thumbnail-list" aria-label="Product images">
            {productImages.map((image, index) => (
              <Button
                variant="ghost"
                className={activeImage === image ? "is-active" : ""}
                key={`${image}-${index}`}
                onClick={() => setActiveImage(image)}
                aria-label={`View product image ${index + 1}`}
              >
                <img src={image} alt={`${product.name} view ${index + 1}`} />
              </Button>
            ))}
          </div>
          <div className="detail-image">
            <img src={activeImage} alt={product.name} />
            {(discount > 0 || product.badge) && (
              <Badge tone={discount > 0 ? "gold" : "rose"}>
                {discount > 0 ? `${discount}% off` : product.badge}
              </Badge>
            )}
            <span className="zoom-hint">Hover to zoom</span>
          </div>
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.brand}</p>
          <h1>{product.name}</h1>
          <RatingStars rating={product.rating} count={product.reviewCount} />
          <div className="detail-price">
            {formatPrice(product.price)}{" "}
            {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
            {discount > 0 && <Badge tone="gold">Save {discount}%</Badge>}
          </div>
          <div className="detail-description space-y-2">
            <p className="leading-relaxed text-stone-600 text-sm md:text-base m-0">
              {getProductIntroExcerpt(product.description)}
            </p>
            {product.description && product.description.includes("###") && (
              <button
                type="button"
                onClick={() => {
                  setDetailTab("Description")
                  const element = document.querySelector(".product-notes")
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" })
                  }
                }}
                className="text-xs font-semibold text-[#b83b5e] hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
              >
                View full notes &amp; details &darr;
              </button>
            )}
          </div>
          {(() => {
            const rawOptions = product.options || []
            const validOptions = rawOptions.filter(
              (item) => item && item !== "Default" && item !== "Standard",
            )

            if (validOptions.length === 0) return null

            const isMakeup = matchCategory(product.category, "Makeup")

            // If only 1 option (e.g. "100 Millilitres" or "100ml")
            if (validOptions.length === 1) {
              return (
                <div className="option-block flex items-center gap-2">
                  <span className="font-semibold text-ink text-xs uppercase tracking-wider">
                    {isMakeup ? "Shade" : "Size"}:
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-ink border border-border">
                    {validOptions[0]}
                  </span>
                </div>
              )
            }

            // Multiple options
            return (
              <div className="option-block">
                <strong>
                  {isMakeup ? "Shade" : "Size"}: <span>{option}</span>
                </strong>
                {isMakeup ? (
                  <div className="shade-list">
                    {validOptions.map((item, index) => (
                      <Button
                        key={item}
                        variant="ghost"
                        className={`${shadeClasses[index % shadeClasses.length]} ${
                          item === option ? "is-active" : ""
                        }`}
                        onClick={() => setOption(item)}
                        aria-label={`Select ${item} shade`}
                        title={item}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="option-list">
                    {validOptions.map((item) => (
                      <Button
                        key={item}
                        variant={item === option ? "primary" : "outline"}
                        onClick={() => setOption(item)}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
          {/* Stock Availability Indicator */}
          {product.stock <= 0 ? (
            <div className="stock-label text-rose-600 font-semibold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block animate-pulse" />
              Out of stock — Unavailable
            </div>
          ) : product.stock <= 5 ? (
            <div className="stock-label text-amber-600 font-medium flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Low Stock — Only {product.stock} left in stock
            </div>
          ) : (
            <div className="stock-label">
              <i /> In stock — {product.stock} available
            </div>
          )}

          <div className="purchase-row">
            <div className="quantity">
              <Button
                variant="ghost"
                disabled={quantity <= 1 || product.stock <= 0}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
              >
                <Minus />
              </Button>
              <span>{product.stock <= 0 ? 0 : quantity}</span>
              <Button
                variant="ghost"
                disabled={quantity >= product.stock || product.stock <= 0}
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                aria-label="Increase quantity"
              >
                <Plus />
              </Button>
            </div>
            <Button
              className="grow"
              disabled={product.stock <= 0}
              onClick={handleAdd}
            >
              <ShoppingBag />{" "}
              {product.stock <= 0
                ? "Out of Stock"
                : `Add to Cart · ${formatPrice(product.price * quantity)}`}
            </Button>
            <Button
              variant="outline"
              className={wishlist.includes(product.id) ? "wishlist-active" : ""}
              aria-label="Add to wishlist"
              onClick={() => toggleWishlist(product)}
            >
              <Heart
                fill={wishlist.includes(product.id) ? "currentColor" : "none"}
              />
            </Button>
          </div>
          <Button
            variant="outline"
            className="buy-now"
            disabled={product.stock <= 0}
            onClick={() => {
              if (product.stock <= 0) return
              addToCart(product, quantity, option)
              navigate("/checkout")
            }}
          >
            {product.stock <= 0 ? "Out of Stock" : "Buy Now"}
          </Button>
          <div className="trust-list">
            <span>
              <ShieldCheck /> Authentic
            </span>
            <span>
              <Truck /> Free Shipping
            </span>
            <span>
              <Package /> Easy Returns
            </span>
          </div>
        </div>
      </div>
      <section className="product-notes">
        <Tabs
          items={[
            "Description",
            "Ingredients",
            "How to Use",
            "Reviews",
            "Shipping & Returns",
          ]}
          active={detailTab}
          onChange={setDetailTab}
        />
        {detailContent}
      </section>
      <section className="section">
        <div className="section-head">
          <p className="eyebrow">You may also love</p>
          <h2>You May Also Like</h2>
        </div>
        <div className="product-grid">
          {relatedProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAdd={addToCart}
              onWishlist={toggleWishlist}
              isWishlisted={wishlist.includes(p.id)}
            />
          ))}
        </div>
      </section>
      <div className="mobile-cart-bar">
        <div>
          <strong>{formatPrice(product.price)}</strong>
          <span>{product.name}</span>
        </div>
        <Button onClick={handleAdd}>
          <ShoppingBag /> Add to Cart
        </Button>
      </div>

      <Modal
        open={reviewModalOpen}
        title={`Review ${product.name}`}
        onClose={() => setReviewModalOpen(false)}
      >
        <form onSubmit={handleSubmitReview} className="space-y-4 my-2 text-left">
          {reviewError && (
            <div
              className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs mb-3"
              role="alert"
            >
              {reviewError}
            </div>
          )}
          <div className="mb-3">
            <span className="block text-xs font-medium text-stone-700 mb-1">
              Your Rating
            </span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-1 hover:scale-110 transition bg-transparent border-none cursor-pointer"
                  aria-label={`${star} star`}
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= reviewRating
                        ? "text-amber-500 fill-amber-500"
                        : "text-stone-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Review Title"
            placeholder="e.g. Life-changing formula!"
            value={reviewTitle}
            onChange={(e) => setReviewTitle(e.target.value)}
            required
            disabled={submittingReview}
          />
          <label className="field">
            <span>Your Experience</span>
            <textarea
              className="w-full p-3 border border-stone-300 rounded-md text-sm outline-none focus:border-stone-800"
              rows={4}
              placeholder="Tell others how this product worked for your routine..."
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              required
              disabled={submittingReview}
            />
          </label>
          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              disabled={submittingReview}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submittingReview}>
              {submittingReview ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
