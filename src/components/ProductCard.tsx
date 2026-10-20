import { Heart, ShoppingBag } from "lucide-react"
import { Link } from "react-router"
import { Product } from "../data/products"
import { Badge, Button, RatingStars } from "./ui"
import { formatPrice } from "../utils/formatPrice"

export default function ProductCard({
  product,
  onAdd,
  onWishlist,
  isWishlisted = false,
}: {
  product: Product
  onAdd: (product: Product) => void
  onWishlist?: (product: Product) => void
  isWishlisted?: boolean
}) {
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Link to={`/product/${product.id}`}>
          <img
            src={product.image}
            alt={product.name}
            className="product-image"
          />
        </Link>
        {(discount > 0 || product.badge) && (
          <Badge tone={product.badge === "Sale" ? "gold" : "rose"}>
            {discount > 0 ? `-${discount}%` : product.badge}
          </Badge>
        )}
        <Button
          variant="ghost"
          className={`heart-button ${isWishlisted ? "is-active" : ""}`}
          aria-label={`${isWishlisted ? "Remove" : "Add"} ${product.name} ${
            isWishlisted ? "from" : "to"
          } wishlist`}
          aria-pressed={isWishlisted}
          onClick={() => onWishlist?.(product)}
        >
          <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
        </Button>
      </div>
      <div className="product-info">
        <p className="eyebrow">{product.brand}</p>
        <Link to={`/product/${product.id}`} className="product-name">
          {product.name}
        </Link>
        <RatingStars
          rating={product.rating}
          count={product.reviewCount}
          compact
        />
        <div className="price-row">
          <strong>{formatPrice(product.price)}</strong>
          {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
        </div>
        {product.stock !== undefined && product.stock <= 0 ? (
          <Button
            variant="secondary"
            className="add-card opacity-60 cursor-not-allowed"
            disabled
          >
            Out of Stock
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="add-card"
            onClick={() => onAdd(product)}
          >
            <ShoppingBag size={16} /> Add to Cart
          </Button>
        )}
      </div>
    </article>
  )
}
