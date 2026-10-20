import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useSearchParams } from "react-router"
import {
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import ProductCard from "../components/ProductCard"
import {
  Badge,
  Breadcrumb,
  Button,
  Checkbox,
  RatingStars,
  Select,
  Skeleton,
} from "../components/ui"
import { useStore } from "../context/StoreContext"
import { Product, products as initialProducts } from "../data/products"
import { formatPrice } from "../utils/formatPrice"
import { useBrands, useCategories } from "../hooks/useProducts"
import { getEffectiveProducts, getProducts } from "../services/products"

export default function Shop() {
  const { addToCart, wishlist, toggleWishlist } = useStore()
  const [params, setParams] = useSearchParams()
  const categoryParam = params.get("category")
  const sortParam = params.get("sort")
  const query = (params.get("q") || "").toLowerCase()
  const [sort, setSort] = useState(sortParam || "featured")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [catalog, setCatalog] = useState<Product[]>(() => getEffectiveProducts(initialProducts))
  const { categories } = useCategories()
  const { brands: fetchedBrands } = useBrands()
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryParam ? [categoryParam] : [],
  )
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<string[]>([])
  const [maxPrice, setMaxPrice] = useState(1000)
  const [minimumRating, setMinimumRating] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (catalog.length > 0) {
      const highestPrice = Math.max(...catalog.map((p) => p.price))
      if (highestPrice > maxPrice) {
        setMaxPrice(Math.ceil(highestPrice / 100) * 100)
      }
    }
  }, [catalog, maxPrice])

  useEffect(() => {
    let mounted = true
    const loadProducts = () => {
      getProducts({ limit: 100 })
        .then((res) => {
          if (mounted && res.data) {
            setCatalog(res.data)
          }
        })
        .finally(() => {
          if (mounted) setLoading(false)
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

  useEffect(() => {
    if (sortParam) {
      setSort(sortParam)
    }
  }, [sortParam])

  const brands = useMemo(() => {
    if (fetchedBrands && fetchedBrands.length > 0) return fetchedBrands
    return Array.from(new Set(catalog.map((product) => product.brand))).sort()
  }, [fetchedBrands, catalog])

  const skinTypes = ["Oily", "Dry", "Combination", "Sensitive"]
  const productSkinType = (product: Product) =>
    skinTypes[(product.id - 1) % skinTypes.length]

  const toggleValue = (
    value: string,
    setter: Dispatch<SetStateAction<string[]>>,
  ) =>
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    )

  useEffect(() => {
    setSelectedCategories(categoryParam ? [categoryParam] : [])
  }, [categoryParam])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    const timer = window.setTimeout(() => setLoading(false), 280)
    return () => window.clearTimeout(timer)
  }, [
    query,
    sort,
    selectedCategories,
    selectedBrands,
    selectedSkinTypes,
    maxPrice,
    minimumRating,
  ])

  const filtered = useMemo(
    () =>
      catalog
        .filter(
          (product) =>
            selectedCategories.length === 0 ||
            selectedCategories.includes(product.category),
        )
        .filter(
          (product) =>
            selectedBrands.length === 0 ||
            selectedBrands.includes(product.brand),
        )
        .filter(
          (product) =>
            selectedSkinTypes.length === 0 ||
            selectedSkinTypes.includes(productSkinType(product)),
        )
        .filter(
          (product) =>
            product.price <= maxPrice && product.rating >= minimumRating,
        )
        .filter(
          (product) =>
            !query ||
            `${product.name} ${product.brand} ${product.category}`
              .toLowerCase()
              .includes(query),
        )
        .filter((product) =>
          sort === "sale"
            ? Boolean(product.oldPrice && product.oldPrice > product.price)
            : true,
        )
        .sort((a, b) =>
          sort === "low" || sort === "price-asc"
            ? a.price - b.price
            : sort === "high" || sort === "price-desc"
              ? b.price - a.price
              : sort === "newest" || sort === "new"
                ? b.id - a.id
                : sort === "rated" || sort === "rating"
                  ? b.rating - a.rating
                  : sort === "sale"
                    ? (b.oldPrice ? b.oldPrice - b.price : 0) -
                      (a.oldPrice ? a.oldPrice - a.price : 0)
                    : Number(Boolean(b.badge)) - Number(Boolean(a.badge)),
        ),
    [
      catalog,
      maxPrice,
      minimumRating,
      query,
      selectedBrands,
      selectedCategories,
      selectedSkinTypes,
      sort,
    ],
  )

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedBrands([])
    setSelectedSkinTypes([])
    setMaxPrice(200)
    setMinimumRating(0)
    setParams({})
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / 12))
  const visibleProducts = filtered.slice((page - 1) * 12, page * 12)
  const activeFilterCount =
    selectedCategories.length +
    selectedBrands.length +
    selectedSkinTypes.length +
    (maxPrice < 200 ? 1 : 0) +
    (minimumRating > 0 ? 1 : 0)

  const filterContent = (
    <>
      <div className="filter-heading">
        <h2>Filters</h2>
        <Button variant="ghost" onClick={clearFilters}>
          Clear All
        </Button>
      </div>
      <div className="filter-group">
        <h3>Category</h3>
        {categories.map((category) => (
          <Checkbox
            key={category}
            label={category}
            checked={selectedCategories.includes(category)}
            onChange={() => toggleValue(category, setSelectedCategories)}
          />
        ))}
      </div>
      <div className="filter-group">
        <h3>Brand</h3>
        <div className="brand-filter-list">
          {brands.map((brand) => (
            <Checkbox
              key={brand}
              label={brand}
              checked={selectedBrands.includes(brand)}
              onChange={() => toggleValue(brand, setSelectedBrands)}
            />
          ))}
        </div>
      </div>
      <div className="filter-group">
        <div className="range-label">
          <h3>Price range</h3>
          <span>£0 — {formatPrice(maxPrice)}</span>
        </div>
        <input
          className="price-range"
          type="range"
          min="0"
          max="1000"
          step="10"
          value={maxPrice}
          onChange={(event) => setMaxPrice(Number(event.target.value))}
          aria-label="Maximum price"
        />
        <div className="range-bounds">
          <span>£0</span>
          <span>£1,000</span>
        </div>
      </div>
      <div className="filter-group">
        <h3>Skin Type</h3>
        {skinTypes.map((skinType) => (
          <Checkbox
            key={skinType}
            label={skinType}
            checked={selectedSkinTypes.includes(skinType)}
            onChange={() => toggleValue(skinType, setSelectedSkinTypes)}
          />
        ))}
      </div>
      <div className="filter-group">
        <h3>Rating</h3>
        <div className="rating-filter">
          {[4.5, 4, 3].map((rating) => (
            <Button
              key={rating}
              variant={minimumRating === rating ? "secondary" : "ghost"}
              onClick={() =>
                setMinimumRating(minimumRating === rating ? 0 : rating)
              }
            >
              <RatingStars rating={rating} /> & up
            </Button>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <div className="page shell shop-page">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
      <div className="shop-heading">
        <div>
          <p className="eyebrow">The beauty edit</p>
          <h1>Shop All Products</h1>
          <p>
            Discover considered beauty essentials for every part of your ritual.
          </p>
        </div>
      </div>
      <div className="shop-layout">
        <aside className="shop-filters desktop-filters">{filterContent}</aside>
        <div className="shop-results">
          <div className="results-toolbar">
            <div>
              <Button
                variant="outline"
                className="mobile-filter-button"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal /> Filters
                {activeFilterCount > 0 && <Badge>{activeFilterCount}</Badge>}
              </Button>
              <p>
                <strong>{filtered.length}</strong> products
                {query && ` for “${params.get("q")}”`}
              </p>
            </div>
            <div className="toolbar-actions">
              <Select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                aria-label="Sort products"
              >
                <option value="featured">Featured</option>
                <option value="sale">On Sale</option>
                <option value="low">Price Low to High</option>
                <option value="high">Price High to Low</option>
                <option value="newest">Newest</option>
                <option value="rated">Top Rated</option>
              </Select>
              <div className="view-toggle" aria-label="Product view">
                <Button
                  variant={view === "grid" ? "secondary" : "ghost"}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid />
                </Button>
                <Button
                  variant={view === "list" ? "secondary" : "ghost"}
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <List />
                </Button>
              </div>
            </div>
          </div>
          {loading ? (
            <div
              className={`shop-skeletons ${view === "list" ? "is-list" : ""}`}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <div className="product-skeleton" key={index}>
                  <Skeleton className="skeleton-image" />
                  <Skeleton className="skeleton-line short" />
                  <Skeleton className="skeleton-line" />
                  <Skeleton className="skeleton-line price" />
                </div>
              ))}
            </div>
          ) : visibleProducts.length ? (
            <div
              className={`product-grid shop-grid ${
                view === "list" ? "is-list" : ""
              }`}
            >
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={addToCart}
                  onWishlist={toggleWishlist}
                  isWishlisted={wishlist.includes(product.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty">
              <Search />
              <h2>No products available</h2>
              <p>
                {catalog.length === 0
                  ? "Our boutique catalog is currently being updated with real inventory. Items added via the Admin Portal will appear here automatically."
                  : "Try adjusting your filters or search for something else."}
              </p>
              {catalog.length > 0 && <Button onClick={clearFilters}>Reset filters</Button>}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div className="pagination" aria-label="Pagination">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={page === pageNumber ? "primary" : "ghost"}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                disabled={page === pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
      {filtersOpen && (
        <div
          className="mobile-filter-backdrop"
          onClick={() => setFiltersOpen(false)}
        >
          <aside
            className="mobile-filter-panel"
            aria-label="Product filters"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="filter-sheet-handle" />
            <Button
              variant="ghost"
              className="filter-close"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
            >
              <X />
            </Button>
            <div className="mobile-filter-scroll">{filterContent}</div>
            <Button
              className="apply-filters"
              onClick={() => setFiltersOpen(false)}
            >
              Show {filtered.length} products
            </Button>
          </aside>
        </div>
      )}
    </div>
  )
}
