import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Check, Upload, Image as ImageIcon } from "lucide-react"
import { Button, Input, Select, Toast } from "../../components/ui"
import { categories, Product, products } from "../../data/products"
import {
  createAdminProduct,
  getAdminProducts,
  updateAdminProduct,
  uploadProductImage,
} from "../../services/admin"

export default function AdminProductForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get("edit") ? Number(params.get("edit")) : null

  const [loading, setLoading] = useState(Boolean(editId))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    salePrice: "",
    category: "Skincare" as Product["category"],
    brand: "",
    stock: "",
    options: "",
    image: "",
  })

  // Load product if editing
  useEffect(() => {
    let mounted = true
    async function loadProduct() {
      if (!editId) {
        setLoading(false)
        return
      }

      setLoading(true)
      const { data } = await getAdminProducts()
      const found = data.find((p) => p.id === editId) || products.find((p) => p.id === editId)

      if (mounted && found) {
        setForm({
          name: found.name,
          description: found.description,
          price: found.price.toString(),
          salePrice: found.oldPrice?.toString() || "",
          category: found.category,
          brand: found.brand,
          stock: found.stock.toString(),
          options: found.options.join(", "),
          image: found.image,
        })
        setLoading(false)
      } else if (mounted) {
        setLoading(false)
      }
    }

    loadProduct()
    return () => {
      mounted = false
    }
  }, [editId])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setErrorMessage("")
    const { url, error } = await uploadProductImage(file)
    setUploading(false)
    if (error) {
      setErrorMessage(`Upload error: ${error.message}`)
    } else if (url) {
      setForm((prev) => ({ ...prev, image: url }))
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setErrorMessage("")

    const priceNum = parseFloat(form.price)
    const salePriceNum = form.salePrice ? parseFloat(form.salePrice) : null
    const stockNum = parseInt(form.stock, 10) || 0
    const parsedOptions = form.options
      ? form.options.split(",").map((s) => s.trim()).filter(Boolean)
      : ["Standard"]

    const fallbackImage =
      form.image ||
      "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80"

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category,
      price: priceNum,
      oldPrice: salePriceNum,
      stock: stockNum,
      description: form.description.trim(),
      options: parsedOptions,
      image: fallbackImage,
    }

    if (editId) {
      const { error } = await updateAdminProduct(editId, payload)
      setSaving(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
    } else {
      const { error } = await createAdminProduct(payload)
      setSaving(false)
      if (error) {
        setErrorMessage(error.message)
        return
      }
    }

    setSaved(true)
    window.setTimeout(() => navigate("/admin/products"), 900)
  }

  if (loading) {
    return (
      <div className="admin-page-head">
        <p className="text-muted-foreground py-12 text-center">Loading product details...</p>
      </div>
    )
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>{editId ? "Edit Product" : "Add Product"}</h1>
          <p>
            {editId
              ? "Update product details and inventory."
              : "Create a new product for your storefront."}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {errorMessage}
        </div>
      )}

      <form className="admin-product-form" onSubmit={handleSubmit}>
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
              label="Sale / Original price (£)"
              type="number"
              step="0.01"
              value={form.salePrice}
              placeholder="Optional"
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
              placeholder="e.g. 30 ml, 50 ml or Shade 01, Shade 02"
            />
          </div>
        </section>

        <section className="admin-panel">
          <h2>Product images</h2>
          {form.image && (
            <div className="mb-4 flex items-center gap-4 p-3 bg-muted/40 rounded-xl border border-border/50">
              <img
                src={form.image}
                alt="Product preview"
                className="w-16 h-16 object-cover rounded-lg border border-border/60"
              />
              <div className="text-xs text-muted-foreground truncate flex-1">
                <span className="font-medium text-foreground block">Current image:</span>
                <span className="truncate block">{form.image}</span>
              </div>
            </div>
          )}
          <label
            className="admin-dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files[0]
              if (file) handleFileUpload(file)
            }}
          >
            {uploading ? (
              <>
                <Upload className="animate-bounce" />
                <strong>Uploading image to Supabase Storage...</strong>
                <span>Please wait</span>
              </>
            ) : (
              <>
                <ImageIcon />
                <strong>
                  {form.image ? "Change product image" : "Drag and drop product image"}
                </strong>
                <span>or click to browse · PNG, JPG up to 10MB</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
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
          <Button type="submit" disabled={saving || uploading}>
            {saving ? "Saving..." : editId ? "Save Changes" : "Save Product"}
          </Button>
        </div>
      </form>

      {saved && (
        <Toast>
          <Check /> Product {editId ? "updated" : "created"} successfully
        </Toast>
      )}
    </>
  )
}
