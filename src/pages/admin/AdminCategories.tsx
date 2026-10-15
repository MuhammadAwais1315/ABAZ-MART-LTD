import { useEffect, useState } from "react"
import { Plus, Trash2, Edit, FolderTree } from "lucide-react"
import { Badge, Button, Input, Modal } from "../../components/ui"
import {
  AdminCategory,
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
} from "../../services/admin"

export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    displayOrder: 1,
  })
  const [saving, setSaving] = useState(false)

  const loadCategories = async () => {
    setLoading(true)
    const { data } = await getAdminCategories()
    setCategories(data)
    setLoading(false)
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const openAddModal = () => {
    setEditingId(null)
    setForm({
      name: "",
      description: "",
      displayOrder: categories.length + 1,
    })
    setModalOpen(true)
  }

  const openEditModal = (cat: AdminCategory) => {
    setEditingId(cat.id)
    setForm({
      name: cat.name,
      description: cat.description || "",
      displayOrder: cat.displayOrder,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    setSaving(true)
    if (editingId) {
      await updateAdminCategory(editingId, {
        name: form.name.trim(),
        description: form.description.trim(),
        displayOrder: Number(form.displayOrder) || 1,
      })
    } else {
      await createAdminCategory({
        name: form.name.trim(),
        description: form.description.trim(),
        displayOrder: Number(form.displayOrder) || 1,
      })
    }
    setSaving(false)
    setModalOpen(false)
    await loadCategories()
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete category "${name}"?`)) {
      await deleteAdminCategory(id)
      setCategories((current) => current.filter((c) => c.id !== id))
    }
  }

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Taxonomy</p>
          <h1>Categories</h1>
          <p>Organize products into curated departments and rituals.</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus /> Add Category
        </Button>
      </div>

      <section className="admin-panel admin-data-table">
        <div className="admin-table-toolbar">
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span>{loading ? "Loading..." : `${filtered.length} categories`}</span>
        </div>

        <div className="table-scroll">
          <table className="admin-table-element">
            <thead>
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Order</th>
                <th>Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading categories...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No categories found.
                  </td>
                </tr>
              ) : (
                filtered.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                          <FolderTree className="w-4 h-4" />
                        </div>
                        <strong>{cat.name}</strong>
                      </div>
                    </td>
                    <td>
                      <code className="text-xs bg-muted/40 px-2 py-0.5 rounded">
                        {cat.slug}
                      </code>
                    </td>
                    <td>
                      <span className="text-xs text-muted-foreground line-clamp-1 max-w-sm">
                        {cat.description || "—"}
                      </span>
                    </td>
                    <td>{cat.displayOrder}</td>
                    <td>
                      <Badge tone={cat.productCount && cat.productCount > 0 ? "rose" : "gold"}>
                        {cat.productCount || 0} products
                      </Badge>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button
                          variant="ghost"
                          onClick={() => openEditModal(cat)}
                          aria-label={`Edit ${cat.name}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(cat.id, cat.name)}
                          aria-label={`Delete ${cat.name}`}
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

      <Modal
        open={modalOpen}
        title={editingId ? "Edit Category" : "Add New Category"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Input
            label="Category Name"
            placeholder="e.g. Wellness & Bath"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <label className="field full block">
            <span className="block text-xs font-medium mb-1">Description</span>
            <textarea
              className="w-full min-h-[90px] border border-border rounded-xl p-3 text-sm focus:border-rose-500 focus:outline-none"
              placeholder="Brief description for category banner and SEO"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <Input
            label="Display Order (Numeric sequence)"
            type="number"
            value={form.displayOrder.toString()}
            onChange={(e) =>
              setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 1 })
            }
            required
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
