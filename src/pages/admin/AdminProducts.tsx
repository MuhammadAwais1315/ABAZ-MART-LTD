import { useEffect, useState } from "react"
import { Link } from "react-router"
import {
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Check,
  Package,
  Sparkles,
} from "lucide-react"
import { Badge, Button, Input, Modal, Select, Toast } from "../../components/ui"
import { categories, Product, products } from "../../data/products"
import { formatPrice } from "../../utils/formatPrice"
import {
  clearAllAdminProducts,
  deleteAdminProduct,
  getAdminProducts,
  syncLocalProductsToSupabase,
  updateAdminProduct,
} from "../../services/admin"

export default function AdminProducts() {
  const [catalog, setCatalog] = useState<Product[]>(products)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [localPendingCount, setLocalPendingCount] = useState(0)
  const [toastMessage, setToastMessage] = useState("")

  // Quick Edit State
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    brand: "",
    category: "Skincare" as Product["category"],
    price: "",
    oldPrice: "",
    stock: "",
    badge: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(""), 3500)
  }

  useEffect(() => {
    let mounted = true
    async function fetchProducts() {
      const { data } = await getAdminProducts()
      if (mounted) {
        setCatalog(data)
        setLoading(false)
      }
    }
    fetchProducts()

    const handleStockOrOrderUpdate = () => {
      fetchProducts()
    }

    window.addEventListener("abaz_stock_updated", handleStockOrOrderUpdate)
    window.addEventListener("abaz_order_placed", handleStockOrOrderUpdate)
    window.addEventListener("abaz_catalog_updated", handleStockOrOrderUpdate)
    window.addEventListener("storage", handleStockOrOrderUpdate)

    return () => {
      mounted = false
      window.removeEventListener("abaz_stock_updated", handleStockOrOrderUpdate)
      window.removeEventListener("abaz_order_placed", handleStockOrOrderUpdate)
      window.removeEventListener("abaz_catalog_updated", handleStockOrOrderUpdate)
      window.removeEventListener("storage", handleStockOrOrderUpdate)
    }
  }, [])

  const checkPendingLocal = () => {
    try {
      const raw = localStorage.getItem("abaz_custom_created_products")
      if (raw) {
        const parsed = JSON.parse(raw)
        setLocalPendingCount(Array.isArray(parsed) ? parsed.length : 0)
      } else {
        setLocalPendingCount(0)
      }
    } catch {
      setLocalPendingCount(0)
    }
  }

  useEffect(() => {
    checkPendingLocal()
  }, [catalog])

  const handleSyncToLive = async () => {
    setSyncing(true)
    const { synced, error } = await syncLocalProductsToSupabase()
    setSyncing(false)
    if (error) {
      alert(`Supabase live publish error: ${error.message}`)
    } else {
      showToast(`${synced} product(s) successfully published live to your cloud store!`)
      checkPendingLocal()
      const { data } = await getAdminProducts()
      setCatalog(data)
    }
  }

  const openQuickEdit = (p: Product) => {
    setQuickEditProduct(p)
    setEditForm({
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price.toString(),
      oldPrice: p.oldPrice ? p.oldPrice.toString() : "",
      stock: p.stock.toString(),
      badge: p.badge || "",
    })
  }

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickEditProduct) return

    const priceNum = parseFloat(editForm.price)
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please provide a valid price")
      return
    }

    setSavingEdit(true)
    const payload = {
      name: editForm.name.trim(),
      brand: editForm.brand.trim(),
      category: editForm.category,
      price: priceNum,
      oldPrice: editForm.oldPrice ? parseFloat(editForm.oldPrice) : null,
      stock: parseInt(editForm.stock, 10) || 0,
      badge: editForm.badge.trim() || null,
    }

    const { error } = await updateAdminProduct(quickEditProduct.id, payload)
    setSavingEdit(false)

    if (error) {
      alert(`Failed to update product: ${error.message}`)
      return
    }

    setCatalog((current) =>
      current.map((item) =>
        item.id === quickEditProduct.id
          ? {
              ...item,
              name: payload.name,
              brand: payload.brand,
              category: payload.category,
              price: payload.price,
              oldPrice: payload.oldPrice ?? undefined,
              stock: payload.stock,
              badge: payload.badge ?? undefined,
            }
          : item,
      ),
    )

    showToast(`"${payload.name}" updated successfully!`)
    setQuickEditProduct(null)
  }

  const handleDelete = async (productId: number, productName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${productName}" from the catalog?`,
      )
    ) {
      setDeletingId(productId)
      const { error, archived } = await deleteAdminProduct(productId)
      setDeletingId(null)
      if (error) {
        alert(`Failed to delete product: ${error.message}`)
      } else {
        setCatalog((current) => current.filter((item) => item.id !== productId))
        showToast(
          archived
            ? `"${productName}" archived from store (historical customer invoices preserved).`
            : `"${productName}" successfully deleted from catalog.`,
        )
      }
    }
  }

  const handleClearAllProducts = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete ALL products and clear the catalog? This will remove all demo products from both the store and the database.",
      )
    ) {
      setClearingAll(true)
      const { error } = await clearAllAdminProducts()
      setClearingAll(false)
      if (error) {
        alert(`Failed to clear products: ${error.message}`)
      } else {
        setCatalog([])
        showToast("All products and demo items have been successfully removed.")
      }
    }
  }

  const visible = catalog.filter(
    (product) =>
      (category === "All" || product.category === category) &&
      `${product.name} ${product.brand}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )

  return (
    <>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Products</h1>
          <p>Manage your beauty catalog, instant pricing, and inventory.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {catalog.length > 0 && (
            <Button
              variant="outline"
              style={{ color: "#dc2626", borderColor: "#fca5a5" }}
              onClick={handleClearAllProducts}
              disabled={clearingAll}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {clearingAll ? "Clearing Catalog..." : "Clear All Products"}
            </Button>
          )}
          <Link className="btn btn-primary" to="/admin/products/new">
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
      </div>

      {localPendingCount > 0 && (
        <div style={{
          backgroundColor: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          color: "#92400e"
        }}>
          <div>
            <strong style={{ display: "block", fontSize: "0.95rem" }}>
              Action Needed: {localPendingCount} product(s) saved in local draft only
            </strong>
            <span style={{ fontSize: "0.82rem", color: "#b45309" }}>
              Click Publish to push this product to your live Supabase cloud database so customers can see it.
            </span>
          </div>
          <Button
            style={{ backgroundColor: "#d97768", color: "#fff", whiteSpace: "nowrap" }}
            onClick={handleSyncToLive}
            disabled={syncing}
          >
            {syncing ? "Publishing to Live Store..." : "Publish to Live Store"}
          </Button>
        </div>
      )}

      <section className="admin-panel admin-data-table">
        <div className="admin-table-toolbar">
          <Input
            placeholder="Search products by title or brand..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option>All</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <span>
            {loading ? "Loading..." : `${visible.length} products`}
          </span>
        </div>
        <div className="table-scroll">
          <table className="admin-table-element products-admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading catalog products...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                visible.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <img src={product.image} alt={product.name} />
                      <span>
                        <strong>{product.name}</strong>
                        <small>{product.brand}</small>
                        {product.badge && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                            {product.badge}
                          </span>
                        )}
                      </span>
                    </td>
                    <td>{product.category}</td>
                    <td>
                      <div>
                        <strong>{formatPrice(product.price)}</strong>
                        {product.oldPrice && (
                          <span className="text-xs text-muted-foreground line-through block">
                            {formatPrice(product.oldPrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          product.stock < 10
                            ? "font-bold text-amber-700"
                            : "text-foreground"
                        }
                      >
                        {product.stock} units
                      </span>
                    </td>
                    <td>
                      <Badge
                        tone={
                          product.stock <= 0
                            ? "rose"
                            : product.stock < 10
                              ? "gold"
                              : "green"
                        }
                      >
                        {product.stock <= 0
                          ? "Out of stock"
                          : product.stock < 10
                            ? "Low stock"
                            : "Active"}
                      </Badge>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button
                          variant="ghost"
                          onClick={() => openQuickEdit(product)}
                          className="text-xs flex items-center gap-1"
                          title="Quick edit price & stock"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Quick Edit</span>
                        </Button>
                        <Link
                          to={`/admin/products/new?edit=${product.id}`}
                          className="btn btn-ghost text-xs"
                          title="Full product editor"
                        >
                          Full
                        </Link>
                        <Button
                          variant="ghost"
                          disabled={deletingId === product.id}
                          onClick={() => handleDelete(product.id, product.name)}
                          aria-label={`Delete ${product.name}`}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Edit Modal */}
      {quickEditProduct && (
        <Modal
          open={Boolean(quickEditProduct)}
          size="md"
          title={`Quick Edit: ${quickEditProduct.name}`}
          onClose={() => setQuickEditProduct(null)}
        >
          <form onSubmit={handleSaveQuickEdit} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-light/70 rounded-xl border border-border">
              <img
                src={quickEditProduct.image}
                alt={quickEditProduct.name}
                className="w-12 h-14 object-cover rounded-lg border border-border"
              />
              <div className="text-xs">
                <p className="font-semibold text-ink">{quickEditProduct.name}</p>
                <p className="text-muted">{quickEditProduct.brand}</p>
                <Link
                  to={`/admin/products/new?edit=${quickEditProduct.id}`}
                  className="text-rose hover:underline inline-flex items-center gap-1 mt-1 font-medium"
                >
                  <span>Open Full Editor (Images, Description, Options)</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <Input
                  label="Product Title"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Input
                  label="Brand Name"
                  value={editForm.brand}
                  onChange={(e) =>
                    setEditForm({ ...editForm, brand: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Category
                </label>
                <Select
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      category: e.target.value as Product["category"],
                    })
                  }
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Input
                  label="Selling Price (£)"
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm({ ...editForm, price: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Input
                  label="Original / Was Price (£)"
                  type="number"
                  step="0.01"
                  placeholder="Optional strike-through"
                  value={editForm.oldPrice}
                  onChange={(e) =>
                    setEditForm({ ...editForm, oldPrice: e.target.value })
                  }
                />
              </div>

              <div>
                <Input
                  label="Stock Inventory (units)"
                  type="number"
                  step="1"
                  value={editForm.stock}
                  onChange={(e) =>
                    setEditForm({ ...editForm, stock: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Input
                  label="Badge Tag (e.g. Bestseller, New)"
                  placeholder="Leave empty for none"
                  value={editForm.badge}
                  onChange={(e) =>
                    setEditForm({ ...editForm, badge: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setQuickEditProduct(null)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={savingEdit}>
                {savingEdit ? "Saving Changes..." : "Save Product"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {toastMessage && (
        <Toast>
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </Toast>
      )}
    </>
  )
}
