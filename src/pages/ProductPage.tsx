import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Heart, Minus, Package, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react"
import ProductCard from "../components/ProductCard"
import {
  Badge,
  Breadcrumb,
  Button,
  RatingStars,
  Skeleton,
  Tabs,
} from "../components/ui"
import { useStore } from "../context/StoreContext"
import { products } from "../data/products"
import { formatPrice } from "../utils/formatPrice"

export default function ProductPage() {
  const { id } = useParams()
  const product = products.find((item) => item.id === Number(id)) || products[0]
  const { addToCart, wishlist, toggleWishlist } = useStore()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [option, setOption] = useState(product.options[0])
  const [detailTab, setDetailTab] = useState("Description")
  const [activeImage, setActiveImage] = useState(product.image)
  const [productLoading, setProductLoading] = useState(true)

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

  const reviews = [
    {
      name: "Maya R.",
      date: "February 12, 2026",
      title: "My skin looks brighter",
      text: "This fits beautifully into my morning routine. The texture feels light, absorbs quickly, and leaves a healthy glow without any stickiness.",
    },
    {
      name: "Olivia K.",
      date: "February 3, 2026",
      title: "Beautiful formula",
      text: "I noticed a softer, smoother finish within the first week. It also layers perfectly under makeup and never pills.",
    },
    {
      name: "Samira D.",
      date: "January 24, 2026",
      title: "Worth every drop",
      text: "The packaging feels premium and the formula is even better. A little goes a long way, so it has become a daily essential.",
    },
    {
      name: "Chloe T.",
      date: "January 9, 2026",
      title: "Gentle and effective",
      text: "My sensitive skin has been very happy with this. It feels soothing, looks luminous, and has no overwhelming fragrance.",
    },
  ]

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
            <span>Based on {product.reviewCount} reviews</span>
            <Button>Write a review</Button>
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
          {reviews.map((review) => (
            <article key={review.name}>
              <div>
                <RatingStars rating={5} />
                <span>{review.date}</span>
              </div>
              <h3>{review.title}</h3>
              <p>{review.text}</p>
              <strong>{review.name} · Verified buyer</strong>
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
    </div>
  )
}
