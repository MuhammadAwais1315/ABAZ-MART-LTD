import { useState } from "react"
import { Link } from "react-router"
import { Plus, Trash2 } from "lucide-react"
import { Badge, Button, Input, Select } from "../../components/ui"
import { categories, products } from "../../data/products"
import { formatPrice } from "../../utils/formatPrice"

export default function AdminProducts() {
  const [catalog, setCatalog] = useState(products)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")

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
          <span>{visible.length} products</span>
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
              {visible.map((product) => (
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
                        onClick={() =>
                          setCatalog((current) =>
                            current.filter((item) => item.id !== product.id),
                          )
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
