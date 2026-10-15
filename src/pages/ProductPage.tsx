import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
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
  getProductById,
  getProductReviews,
  ReviewItem,
  submitProductReview,
} from "../services/products"

export default function ProductPage() {
  const { id } = useParams()
  const initialProduct =
    products.find((item) => item.id === Number(id)) || products[0]
  const [product, setProduct] = useState<Product>(initialProduct)
  const { addToCart, wishlist, toggleWishlist, notify } = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [option, setOption] = useState(initialProduct.options[0])
  const [detailTab, setDetailTab] = useState("Description")
  const [activeImage, setActiveImage] = useState(initialProduct.image)
  const [productLoading, setProductLoading] = useState(true)
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([])
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState("")
  const [reviewContent, setReviewContent] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0

  const productImages = [
    product.image,
    ...products
      .filter(
        (item) => item.category === product.category && item.id !== product.id,
      )
      .slice(0, 3)
      .map((item) => item.image),
  ]

  const relatedProducts = [
    ...products.filter(
      (item) => item.category === product.category && item.id !== product.id,
    ),
    ...products.filter(
      (item) => item.category !== product.category && item.id !== product.id,
    ),
  ].slice(0, 4)

  const shadeClasses = [
    "shade-rose",
    "shade-nude",
    "shade-berry",
    "shade-cocoa",
  ]

  useEffect(() => {
    let mounted = true
    if (id) {
      getProductById(id).then((res) => {
        if (mounted && res.data) {
          setProduct(res.data)
        }
      })
    }
    return () => {
      mounted = false
    }
  }, [id])

  useEffect(() => {
    let mounted = true
    if (product.id) {
      getProductReviews(product.id).then((res) => {
        if (mounted && res.data) {
          setReviewsList(res.data)
        }
      })
    }
    return () => {
      mounted = false
    }
  }, [product.id])

  const handleOpenReview = () => {
    if (!user) {
      notify("Please sign in to write a review")
      navigate(
        `/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`,
      )
      return
    }
    setReviewError(null)
    setReviewModalOpen(true)
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
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
    setProductLoading(true)
    setOption(product.options[0])
    setActiveImage(product.image)
    setQuantity(1)
    setDetailTab("Description")
    const timer = window.setTimeout(() => setProductLoading(false), 320)
    return () => window.clearTimeout(timer)
  }, [product.id, product.image, product.options])

  const handleAdd = () => {
    addToCart(product, quantity, option)
  }

  const detailContent =
    detailTab === "Description" ? (
      <div className="tab-copy">
        <h3>A beautiful addition to your daily ritual</h3>
        <p>{product.description}</p>
        <p>
          Thoughtfully selected by Abaz Mart for its elegant texture, reliable
          performance, and ability to make everyday beauty feel effortless.
        </p>
      </div>
    ) : detailTab === "Ingredients" ? (
      <div className="tab-copy">
        <h3>Made with care</h3>
        <p>
          Aqua, glycerin, niacinamide, squalane, panthenol, vitamin E, botanical
          extracts, and skin-safe fragrance. Please refer to the product
          packaging for the most current full ingredient list.
        </p>
      </div>
    ) : detailTab === "How to Use" ? (
      <div className="tab-copy">
        <h3>Your daily ritual</h3>
        <p>
          Apply a small amount to clean skin or hair as appropriate. Massage in
          gently and allow the formula to absorb before layering your next
          product. Use morning or evening for best results.
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
          {reviewsList.map((review, idx) => (
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
          ))}
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
            label: product.category,
            href: `/shop?category=${product.category}`,
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
          <p className="detail-description">{product.description}</p>
          <div className="option-block">
            <strong>
              {product.category === "Makeup" ? "Shade" : "Size"}:{" "}
              <span>{option}</span>
            </strong>
            {product.category === "Makeup" ? (
              <div className="shade-list">
                {product.options.map((item, index) => (
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
                {product.options.map((item) => (
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
          <div className="stock-label">
            <i /> In stock — {product.stock} available
          </div>
          <div className="purchase-row">
            <div className="quantity">
              <Button
                variant="ghost"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus />
              </Button>
              <span>{quantity}</span>
              <Button variant="ghost" onClick={() => setQuantity(quantity + 1)}>
                <Plus />
              </Button>
            </div>
            <Button className="grow" onClick={handleAdd}>
              <ShoppingBag /> Add to Cart · {formatPrice(product.price * quantity)}
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
            onClick={() => {
              addToCart(product, quantity, option)
              navigate("/checkout")
            }}
          >
            Buy Now
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
