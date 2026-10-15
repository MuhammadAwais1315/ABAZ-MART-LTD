import { useEffect, useState } from "react"
import { Link } from "react-router"
import { Plus, Trash2 } from "lucide-react"
import { Badge, Button, Input, Select } from "../../components/ui"
import { categories, Product, products } from "../../data/products"
import { formatPrice } from "../../utils/formatPrice"
import { deleteAdminProduct, getAdminProducts } from "../../services/admin"

export default function AdminProducts() {
  const [catalog, setCatalog] = useState<Product[]>(products)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchProducts() {
      setLoading(true)
      const { data } = await getAdminProducts()
      if (mounted) {
        setCatalog(data)
        setLoading(false)
      }
    }
    fetchProducts()
    return () => {
      mounted = false
    }
  }, [])

  const handleDelete = async (productId: number, productName: string) => {
    if (window.confirm(`Are you sure you want to delete "${productName}" from the catalog?`)) {
      setDeletingId(productId)
      const { error } = await deleteAdminProduct(productId)
      setDeletingId(null)
      if (error) {
        alert(`Failed to delete product: ${error.message}`)
      } else {
        setCatalog((current) => current.filter((item) => item.id !== productId))
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
          <p>Manage your beauty catalog and inventory.</p>
        </div>
        <Link className="btn btn-primary" to="/admin/products/new">
          <Plus /> Add Product
        </Link>
      </div>
      <section className="admin-panel admin-data-table">
        <div className="admin-table-toolbar">
          <Input
            placeholder="Search products..."
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
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading catalog products...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
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
                      </span>
                    </td>
                    <td>{product.category}</td>
                    <td>{formatPrice(product.price)}</td>
                    <td>{product.stock}</td>
                    <td>
                      <Badge tone={product.stock < 10 ? "gold" : "green"}>
                        {product.stock < 10 ? "Low stock" : "Active"}
                      </Badge>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/admin/products/new?edit=${product.id}`}
                          className="btn btn-ghost"
                        >
                          Edit
                        </Link>
                        <Button
                          variant="ghost"
                          disabled={deletingId === product.id}
                          onClick={() => handleDelete(product.id, product.name)}
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 />
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
    </>
  )
}
