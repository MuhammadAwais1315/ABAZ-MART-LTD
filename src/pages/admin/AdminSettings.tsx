import { useEffect, useState } from "react"
import { Check, Mail, Plus, Settings2, Tag, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { Badge, Button, Input, Modal, Toast } from "../../components/ui"
import {
  AdminCoupon,
  AdminNewsletterSubscriber,
  AdminStoreSettings,
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCoupons,
  getAdminStoreSettings,
  getNewsletterSubscribers,
  toggleCouponActive,
  updateAdminStoreSettings,
} from "../../services/admin"

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<"store" | "coupons" | "newsletter">("store")
  const [toastMessage, setToastMessage] = useState("")

  // Store Settings State
  const [settings, setSettings] = useState<AdminStoreSettings>({
    id: 1,
    currency: "GBP",
    currencySymbol: "£",
    shippingFee: 6.0,
    freeShippingThreshold: 50.0,
    taxRate: 0.0,
    defaultCountry: "United Kingdom",
  })
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // Coupons State
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [loadingCoupons, setLoadingCoupons] = useState(true)
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountPercent: "15",
    minSpend: "0",
    maxDiscount: "",
  })
  const [savingCoupon, setSavingCoupon] = useState(false)

  // Newsletter State
  const [subscribers, setSubscribers] = useState<AdminNewsletterSubscriber[]>([])
  const [loadingSubscribers, setLoadingSubscribers] = useState(true)

  const notify = (msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(""), 3000)
  }

  // Load store settings
  useEffect(() => {
    async function loadSettings() {
      setLoadingSettings(true)
      const { data } = await getAdminStoreSettings()
      setSettings(data)
      setLoadingSettings(false)
    }
    loadSettings()
  }, [])

  // Load coupons when tab changes or on mount
  const loadCoupons = async () => {
    setLoadingCoupons(true)
    const { data } = await getAdminCoupons()
    setCoupons(data)
    setLoadingCoupons(false)
  }

  // Load subscribers
  const loadSubscribers = async () => {
    setLoadingSubscribers(true)
    const { data } = await getNewsletterSubscribers()
    setSubscribers(data)
    setLoadingSubscribers(false)
  }

  useEffect(() => {
    if (activeTab === "coupons") loadCoupons()
    if (activeTab === "newsletter") loadSubscribers()
  }, [activeTab])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    const { error } = await updateAdminStoreSettings({
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      shippingFee: Number(settings.shippingFee),
      freeShippingThreshold: Number(settings.freeShippingThreshold),
      taxRate: Number(settings.taxRate),
      defaultCountry: settings.defaultCountry,
    })
    setSavingSettings(false)
    if (error) {
      notify(`Error: ${error.message}`)
    } else {
      notify("Store settings updated successfully!")
    }
  }

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponForm.code.trim()) return

    setSavingCoupon(true)
    const { data, error } = await createAdminCoupon({
      code: couponForm.code.trim(),
      discountPercent: parseFloat(couponForm.discountPercent) || 10,
      minSpend: parseFloat(couponForm.minSpend) || 0,
      maxDiscount: couponForm.maxDiscount ? parseFloat(couponForm.maxDiscount) : undefined,
    })
    setSavingCoupon(false)

    if (error) {
      notify(error.message)
    } else if (data) {
      setCoupons((current) => [data, ...current])
      setCouponModalOpen(false)
      setCouponForm({ code: "", discountPercent: "15", minSpend: "0", maxDiscount: "" })
      notify(`Coupon "${data.code}" created!`)
    }
  }

  const handleToggleCoupon = async (id: number, currentActive: boolean) => {
    const next = !currentActive
    await toggleCouponActive(id, next)
    setCoupons((current) =>
      current.map((c) => (c.id === id ? { ...c, isActive: next } : c)),
    )
    notify(`Coupon ${next ? "activated" : "deactivated"}`)
  }

  const handleDeleteCoupon = async (id: number, code: string) => {
    if (window.confirm(`Delete coupon "${code}"?`)) {
      await deleteAdminCoupon(id)
      setCoupons((current) => current.filter((c) => c.id !== id))
      notify(`Coupon "${code}" deleted`)
    }
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Settings & Promotions</h1>
          <p>Configure storefront shipping rules, promotional coupons, and email subscribers.</p>
        </div>
      </div>

      <div className="tabs mb-6">
        <Button
          variant={activeTab === "store" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("store")}
        >
          <Settings2 className="w-4 h-4" /> Store Settings
        </Button>
        <Button
          variant={activeTab === "coupons" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("coupons")}
        >
          <Tag className="w-4 h-4" /> Coupons ({coupons.length})
        </Button>
        <Button
          variant={activeTab === "newsletter" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("newsletter")}
        >
          <Mail className="w-4 h-4" /> Newsletter ({subscribers.length})
        </Button>
      </div>

      {/* 1. STORE SETTINGS TAB */}
      {activeTab === "store" && (
        <section className="admin-panel max-w-3xl">
          <h2>Storefront Defaults & Logistics</h2>
          {loadingSettings ? (
            <p className="py-8 text-muted-foreground text-center">Loading settings...</p>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="form-grid">
                <Input
                  label="Currency Code"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  required
                />
                <Input
                  label="Currency Symbol"
                  value={settings.currencySymbol}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  required
                />
                <Input
                  label="Standard Shipping Fee (£)"
                  type="number"
                  step="0.01"
                  value={settings.shippingFee.toString()}
                  onChange={(e) =>
                    setSettings({ ...settings, shippingFee: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
                <Input
                  label="Free Shipping Spend Threshold (£)"
                  type="number"
                  step="0.01"
                  value={settings.freeShippingThreshold.toString()}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      freeShippingThreshold: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
                <Input
                  label="Tax Rate (e.g. 0.00 for 0%)"
                  type="number"
                  step="0.001"
                  value={settings.taxRate.toString()}
                  onChange={(e) =>
                    setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
                <Input
                  label="Default Country"
                  value={settings.defaultCountry}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultCountry: e.target.value })
                  }
                  required
                />
              </div>

              <div className="p-4 bg-blush/40 rounded-xl border border-blush text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Live Storefront Synchronization:</p>
                Adjusting the <strong>Free Shipping Threshold</strong> or <strong>Standard Shipping Fee</strong> automatically updates the dynamic free shipping progress bar across the cart drawer, checkout page, and order calculations for all visitors in real-time.
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingSettings}>
                  {savingSettings ? "Saving Settings..." : "Save Store Settings"}
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* 2. COUPONS TAB */}
      {activeTab === "coupons" && (
        <section className="admin-panel admin-data-table">
          <div className="admin-panel-head mb-4">
            <div>
              <h2>Active Promotional Coupons</h2>
              <p>Create and manage discount codes validated securely in the cart.</p>
            </div>
            <Button onClick={() => setCouponModalOpen(true)}>
              <Plus /> Create Coupon
            </Button>
          </div>

          <div className="table-scroll">
            <table className="admin-table-element">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min Spend</th>
                  <th>Max Cap</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingCoupons ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading promotional coupons...
                    </td>
                  </tr>
                ) : coupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No coupons created yet. Click "Create Coupon" above.
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td>
                        <strong className="tracking-wider font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {coupon.code}
                        </strong>
                      </td>
                      <td>
                        <span className="font-semibold">{coupon.discountPercent}% OFF</span>
                      </td>
                      <td>
                        <span className="text-xs text-muted-foreground">
                          {coupon.minSpend > 0 ? `£${coupon.minSpend.toFixed(2)}` : "No minimum"}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-muted-foreground">
                          {coupon.maxDiscount ? `£${coupon.maxDiscount.toFixed(2)}` : "None"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleCoupon(coupon.id, coupon.isActive)}
                          className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80"
                        >
                          {coupon.isActive ? (
                            <>
                              <ToggleRight className="w-5 h-5 text-emerald-600" />
                              <Badge tone="green">Active</Badge>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                              <Badge tone="rose">Disabled</Badge>
                            </>
                          )}
                        </button>
                      </td>
                      <td>
                        <div className="table-actions">
                          <Button
                            variant="ghost"
                            onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                            aria-label={`Delete ${coupon.code}`}
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
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
      )}

      {/* 3. NEWSLETTER TAB */}
      {activeTab === "newsletter" && (
        <section className="admin-panel admin-data-table">
          <div className="admin-panel-head mb-4">
            <div>
              <h2>Newsletter Subscribers</h2>
              <p>Customers subscribed to receive beauty rituals, launches, and private offers.</p>
            </div>
            <Badge tone="rose">{subscribers.length} Subscribers</Badge>
          </div>

          <div className="table-scroll">
            <table className="admin-table-element">
              <thead>
                <tr>
                  <th>Subscriber Email</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingSubscribers ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">
                      Loading subscriber list...
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">
                      No subscribers recorded yet.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-rose-600" />
                          <strong>{sub.email}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-muted-foreground">{sub.subscribedAt}</span>
                      </td>
                      <td>
                        <Badge tone="green">Subscribed</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal for Creating Coupon */}
      <Modal
        open={couponModalOpen}
        title="Create Promotional Coupon"
        onClose={() => setCouponModalOpen(false)}
      >
        <form onSubmit={handleCreateCoupon} className="space-y-4 pt-2">
          <Input
            label="Coupon Code"
            placeholder="e.g. VIP20 or GLOW25"
            value={couponForm.code}
            onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
            required
          />
          <div className="form-grid">
            <Input
              label="Discount Percentage (%)"
              type="number"
              min="1"
              max="100"
              value={couponForm.discountPercent}
              onChange={(e) =>
                setCouponForm({ ...couponForm, discountPercent: e.target.value })
              }
              required
            />
            <Input
              label="Minimum Order Spend (£)"
              type="number"
              step="0.01"
              value={couponForm.minSpend}
              onChange={(e) =>
                setCouponForm({ ...couponForm, minSpend: e.target.value })
              }
              placeholder="0 for none"
            />
          </div>
          <Input
            label="Max Discount Cap (£)"
            type="number"
            step="0.01"
            value={couponForm.maxDiscount}
            onChange={(e) =>
              setCouponForm({ ...couponForm, maxDiscount: e.target.value })
            }
            placeholder="Optional ceiling limit"
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCouponModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingCoupon}>
              {savingCoupon ? "Creating..." : "Save Coupon"}
            </Button>
          </div>
        </form>
      </Modal>

      {toastMessage && (
        <Toast>
          <Check /> {toastMessage}
        </Toast>
      )}
    </>
  )
}
