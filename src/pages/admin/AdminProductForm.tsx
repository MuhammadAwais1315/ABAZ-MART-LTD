import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Check, Upload } from "lucide-react"
import { Button, Input, Select, Toast } from "../../components/ui"
import { categories, Product, products } from "../../data/products"

export default function AdminProductForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editing = products.find(
    (product) => product.id === Number(params.get("edit")),
  )
  const [uploadName, setUploadName] = useState("")
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: editing?.name || "",
    description: editing?.description || "",
    price: editing?.price.toString() || "",
    salePrice: editing?.oldPrice?.toString() || "",
    category: editing?.category || "Skincare",
    brand: editing?.brand || "",
    stock: editing?.stock.toString() || "",
    options: editing?.options.join(", ") || "",
  })

  return (
    <>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>{editing ? "Edit Product" : "Add Product"}</h1>
          <p>
            {editing
              ? "Update product details and inventory."
              : "Create a new product for your storefront."}
          </p>
        </div>
      </div>
      <form
        className="admin-product-form"
        onSubmit={(event) => {
          event.preventDefault()
          setSaved(true)
          window.setTimeout(() => navigate("/admin/products"), 900)
        }}
      >
        <section className="admin-panel">
          <h2>Product information</h2>
          <div className="form-grid">
            <Input
              className="full"
              label="Product name"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              required
            />
            <label className="field full">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                required
              />
            </label>
            <Input
              label="Price (£)"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(event) =>
                setForm({ ...form, price: event.target.value })
              }
              required
            />
            <Input
              label="Sale price (£)"
              type="number"
              step="0.01"
              value={form.salePrice}
              onChange={(event) =>
                setForm({ ...form, salePrice: event.target.value })
              }
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(event) =>
                setForm({
                  ...form,
                  category: event.target.value as Product["category"],
                })
              }
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
            <Input
              label="Brand"
              value={form.brand}
              onChange={(event) =>
                setForm({ ...form, brand: event.target.value })
              }
              required
            />
            <Input
              label="Stock"
              type="number"
              value={form.stock}
              onChange={(event) =>
                setForm({ ...form, stock: event.target.value })
              }
              required
            />
            <Input
              label="Shade / size options"
              value={form.options}
              onChange={(event) =>
                setForm({ ...form, options: event.target.value })
              }
              placeholder="30 ml, 50 ml"
            />
          </div>
        </section>
        <section className="admin-panel">
          <h2>Product images</h2>
          <label
            className="admin-dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              setUploadName(event.dataTransfer.files[0]?.name || "")
            }}
          >
            <Upload />
            <strong>{uploadName || "Drag and drop product images"}</strong>
            <span>or click to browse · PNG, JPG up to 10MB</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setUploadName(event.target.files?.[0]?.name || "")
              }
            />
          </label>
        </section>
        <div className="admin-form-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/products")}
          >
            Cancel
          </Button>
          <Button type="submit">
            {editing ? "Save Changes" : "Save Product"}
          </Button>
        </div>
      </form>
      {saved && (
        <Toast>
          <Check /> Product saved successfully
        </Toast>
      )}
    </>
  )
}
