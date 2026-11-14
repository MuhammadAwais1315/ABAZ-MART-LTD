import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import {
  Check,
  CircleUserRound,
  Copy,
  Download,
  ExternalLink,
  Heart,
  LogOut,
  MapPin,
  Package,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
  Upload,
} from "lucide-react"
import { Badge, Breadcrumb, Button, Input, Modal } from "../components/ui"
import { useStore } from "../context/StoreContext"
import { useAuth } from "../context/AuthContext"
import { products } from "../data/products"
import { formatPrice } from "../utils/formatPrice"
import { getProductUrl } from "../utils/slugify"
import { OrderReceipt } from "../components/checkout/OrderReceipt"
import { OrderStatus, PaymentMethod } from "../types/database"
import { formatUKPostcode, isValidUKPostcode } from "../utils/ukPostcode"
import { getEffectiveProducts, submitProductReview } from "../services/products"
import {
  getCustomerOrders,
  cancelOrder,
  getCustomerAddresses,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  CustomerOrder,
  CustomerOrderItem,
  AddressItem,
} from "../services/account"

export default function Account() {
  const { wishlist, toggleWishlist, addToCart, notify } = useStore()
  const {
    user,
    profile: authProfile,
    signOut,
    updateProfile,
    updatePassword,
    uploadAvatar,
  } = useAuth()
  const navigate = useNavigate()
  const [accountParams] = useSearchParams()
  const accountTab = accountParams.get("tab")
  const [section, setSection] = useState(
    accountTab === "wishlist"
      ? "Wishlist"
      : accountTab === "orders"
        ? "Orders"
        : "Profile",
  )
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  )
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null)
  const [receiptModalOrder, setReceiptModalOrder] =
    useState<CustomerOrder | null>(null)

  // Direct Review State for Delivered Orders
  const effectiveCatalog = getEffectiveProducts(products)
  const [reviewedKeys, setReviewedKeys] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const raw = localStorage.getItem("abaz_reviewed_items")
      if (raw) return new Set(JSON.parse(raw))
    } catch {}
    return new Set()
  })
  const [reviewModalItem, setReviewModalItem] = useState<{
    productId: number
    name: string
    brand: string
    image: string
    orderNumber?: string
  } | null>(null)
  const [reviewOrderPicker, setReviewOrderPicker] =
    useState<CustomerOrder | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState("")
  const [reviewContent, setReviewContent] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const handleOpenReviewModalForItem = (
    item: CustomerOrderItem,
    order?: CustomerOrder,
  ) => {
    let prodId = item.productId
    if (!prodId) {
      const match = effectiveCatalog.find(
        (p) => p.name.toLowerCase() === item.name.toLowerCase(),
      )
      prodId = match ? match.id : 1
    }
    setReviewModalItem({
      productId: prodId,
      name: item.name,
      brand: item.brand,
      image: item.image,
      orderNumber: order?.number,
    })
    setReviewRating(5)
    setReviewTitle("")
    setReviewContent("")
    setReviewError(null)
  }

  const handleOpenReviewForOrder = (order: CustomerOrder) => {
    if (!order.items || order.items.length === 0) return
    if (order.items.length === 1) {
      handleOpenReviewModalForItem(order.items[0], order)
    } else {
      setReviewOrderPicker(order)
    }
  }

  const handleSubmitAccountReview = async (e: FormEvent) => {
    e.preventDefault()
    if (!reviewModalItem) return
    if (!reviewTitle.trim() || !reviewContent.trim()) {
      setReviewError("Please provide both a title and review comments.")
      return
    }

    setSubmittingReview(true)
    setReviewError(null)

    const res = await submitProductReview(
      reviewModalItem.productId,
      reviewRating,
      reviewTitle,
      reviewContent,
    )

    setSubmittingReview(false)

    if (res.error) {
      setReviewError(res.error.message)
    } else {
      notify(
        `Thank you! Your review for "${reviewModalItem.name}" has been published.`,
      )
      const key = `${reviewModalItem.orderNumber || ""}_${reviewModalItem.name}`
      setReviewedKeys((prev) => {
        const next = new Set(prev).add(key)
        try {
          localStorage.setItem(
            "abaz_reviewed_items",
            JSON.stringify(Array.from(next)),
          )
        } catch {}
        return next
      })
      setReviewModalItem(null)
      setReviewOrderPicker(null)
    }
  }
  const [avatar, setAvatar] = useState(
    authProfile?.avatar_url ||
      user?.user_metadata?.avatar_url as string ||
      user?.user_metadata?.picture as string ||
      "https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?auto=format&fit=crop&w=240&q=85",
  )
  const [profile, setProfile] = useState({
    name:
      authProfile?.full_name ||
      user?.user_metadata?.full_name as string ||
      user?.user_metadata?.name as string ||
      "",
    email: authProfile?.email || user?.email || "",
    phone: authProfile?.phone || "",
    currentPassword: "",
    newPassword: "",
  })

  useEffect(() => {
    if (authProfile) {
      setProfile((prev) => ({
        ...prev,
        name: authProfile.full_name || prev.name,
        email: authProfile.email || prev.email,
        phone: authProfile.phone || prev.phone,
      }))
      if (authProfile.avatar_url) {
        setAvatar(authProfile.avatar_url)
      }
    } else if (user) {
      setProfile((prev) => ({
        ...prev,
        email: user.email || prev.email,
        name:
          user.user_metadata?.full_name as string ||
          user.user_metadata?.name as string ||
          prev.name,
      }))
      if (user.user_metadata?.avatar_url || user.user_metadata?.picture) {
        setAvatar(
          user.user_metadata.avatar_url as string ||
            user.user_metadata.picture as string,
        )
      }
    }
  }, [authProfile, user])

  const [addresses, setAddresses] = useState<AddressItem[]>([])
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<number | null>(null)
  const [addressForm, setAddressForm] = useState({
    label: "",
    name: "",
    phone: "",
    line: "",
    city: "",
    postalCode: "",
    country: "United Kingdom",
  })

  // Fetch orders and addresses for authenticated user
  useEffect(() => {
    let mounted = true
    async function loadAccountData() {
      if (!user?.id) {
        setOrdersLoading(false)
        setAddressesLoading(false)
        return
      }
      setOrdersLoading(true)
      setAddressesLoading(true)

      const [ordersRes, addressesRes] = await Promise.all([
        getCustomerOrders(user.id),
        getCustomerAddresses(user.id),
      ])

      if (mounted) {
        setOrders(ordersRes.data)
        setOrdersLoading(false)
        setAddresses(addressesRes.data)
        setAddressesLoading(false)
      }
    }
    loadAccountData()
    return () => {
      mounted = false
    }
  }, [user?.id])

  // Support direct review links (e.g. ?tab=orders&review=true&order=1004)
  useEffect(() => {
    if (accountTab === "orders") {
      setSection("Orders")
      const orderNum = accountParams.get("order")
      const shouldReview = accountParams.get("review") === "true"
      if (shouldReview && orders.length > 0) {
        const target = orderNum
          ? orders.find((o) => o.number === orderNum || o.id === orderNum)
          : orders.find((o) => o.status === "Delivered")
        if (target) {
          handleOpenReviewForOrder(target)
        }
      }
    }
  }, [accountTab, accountParams, orders])

  // Listen for order status changes across the system
  useEffect(() => {
    const handleStatusSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail
      if (detail?.orderId && detail?.status) {
        setOrders((current) =>
          current.map((o) =>
            o.id === detail.orderId
              ? { ...o, status: detail.status as OrderStatus }
              : o,
          ),
        )
        setSelectedOrder((prev) =>
          prev && prev.id === detail.orderId
            ? { ...prev, status: detail.status as OrderStatus }
            : prev,
        )
      }
    }
    window.addEventListener("abaz_order_status_changed", handleStatusSync)
    return () => {
      window.removeEventListener("abaz_order_status_changed", handleStatusSync)
    }
  }, [])

  const handleCancelOrder = async (orderId: string) => {
    if (
      window.confirm(
        "Are you sure you want to cancel this order? This will cancel shipment and restock reserved items.",
      )
    ) {
      setCancellingOrderId(orderId)
      const { success, error } = await cancelOrder(orderId)
      setCancellingOrderId(null)
      if (error) {
        notify(error.message)
      } else if (success) {
        notify("Order has been cancelled successfully")
        setOrders((current) =>
          current.map((o) =>
            o.id === orderId ? { ...o, status: "Cancelled" as OrderStatus } : o,
          ),
        )
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({
            ...selectedOrder,
            status: "Cancelled" as OrderStatus,
          })
        }
      }
    }
  }

  const wishlistProducts = getEffectiveProducts(products).filter((product) =>
    wishlist.includes(product.id),
  )

  const accountSections = [
    { label: "Profile", icon: <CircleUserRound /> },
    { label: "My Orders", icon: <Package /> },
    { label: "Saved Addresses", icon: <MapPin /> },
    { label: "Wishlist", icon: <Heart /> },
  ]

  useEffect(() => {
    setSection(accountTab === "wishlist" ? "Wishlist" : "Profile")
  }, [accountTab])

  const openAddressModal = (address?: AddressItem) => {
    if (address) {
      setEditingAddress(address.id)
      setAddressForm({
        label: address.label,
        name: address.name,
        phone: address.phone || "",
        line: address.line,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country || "United Kingdom",
      })
    } else {
      setEditingAddress(null)
      setAddressForm({
        label: "",
        name: profile.name || "",
        phone: profile.phone || "",
        line: "",
        city: "",
        postalCode: "",
        country: "United Kingdom",
      })
    }
    setAddressModalOpen(true)
  }

  const saveAddress = async (event: FormEvent) => {
    event.preventDefault()
    if (
      !addressForm.label.trim() ||
      !addressForm.name.trim() ||
      !addressForm.line.trim() ||
      !addressForm.city.trim() ||
      !addressForm.postalCode.trim()
    ) {
      notify("Please fill in all required address fields")
      return
    }

    const formattedPostcode = formatUKPostcode(addressForm.postalCode)
    if (!isValidUKPostcode(formattedPostcode)) {
      notify("Please enter a valid UK postal code (e.g. SW1A 1AA, M1 1AE)")
      return
    }

    const cleanForm = {
      ...addressForm,
      postalCode: formattedPostcode,
      country: "United Kingdom",
    }

    if (editingAddress !== null) {
      const { error } = await updateCustomerAddress(editingAddress, {
        label: cleanForm.label,
        name: cleanForm.name,
        phone: cleanForm.phone,
        line: cleanForm.line,
        city: cleanForm.city,
        postalCode: cleanForm.postalCode,
        country: "United Kingdom",
      })
      if (error) {
        notify(error.message)
        return
      }
      setAddresses((current) =>
        current.map((address) =>
          address.id === editingAddress
            ? { ...address, ...cleanForm }
            : address,
        ),
      )
      notify("Address updated successfully")
    } else if (user) {
      const { data, error } = await addCustomerAddress(user.id, {
        label: cleanForm.label,
        name: cleanForm.name,
        phone: cleanForm.phone,
        line: cleanForm.line,
        city: cleanForm.city,
        postalCode: cleanForm.postalCode,
        country: "United Kingdom",
        isDefault: addresses.length === 0,
      })
      if (error) {
        notify(error.message)
        return
      }
      if (data) {
        setAddresses((current) => [...current, data])
      }
      notify("New address added successfully")
    }
    setAddressModalOpen(false)
  }

  const handleDeleteAddress = async (id: number) => {
    const { error } = await deleteCustomerAddress(id)
    if (error) {
      notify(error.message)
      return
    }
    setAddresses((current) => current.filter((item) => item.id !== id))
    notify("Address removed")
  }

  return (
    <div className="page shell account-page">
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "My account" }]}
      />
      <div className="account-header">
        <div>
          <p className="eyebrow">My account</p>
          <h1>
            Good morning,{" "}
            {profile.name.trim().split(" ")[0] ||
              (user?.email ? user.email.split("@")[0] : "there")}
            .
          </h1>
          <p>Manage your profile, orders, addresses, and beauty favorites.</p>
        </div>
      </div>
      <div className="account-grid">
        <aside className="account-nav">
          {accountSections.map((item) => (
            <Button
              key={item.label}
              variant={section === item.label ? "secondary" : "ghost"}
              onClick={() => setSection(item.label)}
            >
              {item.icon} {item.label}
              {item.label === "Wishlist" && wishlistProducts.length > 0 && (
                <Badge>{wishlistProducts.length}</Badge>
              )}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="logout-button"
            onClick={async () => {
              await signOut()
              notify("Signed out successfully")
              navigate("/login")
            }}
          >
            <LogOut /> Logout
          </Button>
        </aside>
        <div className="account-content">
          {section === "Profile" && (
            <section className="account-section">
              <div className="account-section-head">
                <div>
                  <p className="eyebrow">Personal details</p>
                  <h2>Profile</h2>
                  <p>Keep your contact information and password up to date.</p>
                </div>
              </div>
              <div className="profile-layout">
                <div className="avatar-editor">
                  <img src={avatar} alt={profile.name} />
                  <label className="btn btn-outline">
                    <Upload /> Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          const { url, error } = await uploadAvatar(file)
                          if (error) {
                            notify(error.message)
                          } else if (url) {
                            setAvatar(url)
                            notify("Avatar updated successfully")
                          }
                        }
                      }}
                    />
                  </label>
                  <small>JPG or PNG, up to 5MB</small>
                </div>
                <form
                  className="profile-form"
                  onSubmit={async (event) => {
                    event.preventDefault()
                    const { error } = await updateProfile({
                      full_name: profile.name,
                      phone: profile.phone,
                    })
                    if (error) {
                      notify(error.message)
                      return
                    }

                    if (profile.newPassword) {
                      const { error: passError } = await updatePassword(
                        profile.newPassword,
                      )
                      if (passError) {
                        notify(passError.message)
                        return
                      }
                      setProfile((prev) => ({
                        ...prev,
                        currentPassword: "",
                        newPassword: "",
                      }))
                    }

                    notify("Profile changes saved")
                  }}
                >
                  <div className="form-grid">
                    <Input
                      className="full"
                      label="Full name"
                      value={profile.name}
                      onChange={(event) =>
                        setProfile({ ...profile, name: event.target.value })
                      }
                    />
                    <Input
                      label="Email address"
                      type="email"
                      value={profile.email}
                      disabled
                      title="Email is managed via authentication"
                    />
                    <Input
                      label="Phone number"
                      type="tel"
                      value={profile.phone}
                      onChange={(event) =>
                        setProfile({ ...profile, phone: event.target.value })
                      }
                    />
                  </div>
                  <div className="password-change">
                    <h3>Change password</h3>
                    <div className="form-grid">
                      <Input
                        label="Current password"
                        type="password"
                        placeholder="••••••••"
                        value={profile.currentPassword}
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            currentPassword: event.target.value,
                          })
                        }
                      />
                      <Input
                        label="New password"
                        type="password"
                        placeholder="At least 8 characters"
                        value={profile.newPassword}
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            newPassword: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button type="submit">Save changes</Button>
                </form>
              </div>
            </section>
          )}
          {section === "My Orders" && (
            <section className="account-section">
              <div className="account-section-head">
                <div>
                  <p className="eyebrow">Your purchases</p>
                  <h2>My Orders</h2>
                  <p>Track current orders and revisit past beauty finds.</p>
                </div>
              </div>
              <div className="orders-list">
                <div className="orders-header">
                  <span>Order</span>
                  <span>Date</span>
                  <span>Total</span>
                  <span>Status</span>
                  <span />
                </div>
                {ordersLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading your orders...
                  </div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="mb-3">You have not placed any orders yet.</p>
                    <Link to="/shop" className="btn btn-outline btn-sm">
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  orders.map((order) => (
                    <article key={order.id}>
                      <strong>{order.number}</strong>
                      <span>{order.date}</span>
                      <span>{formatPrice(order.total)}</span>
                      <Badge
                        tone={
                          order.status === "Delivered"
                            ? "green"
                            : order.status === "Pending"
                              ? "gold"
                              : "rose"
                        }
                      >
                        {order.status}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {order.status === "Delivered" && (
                          <Button
                            variant="outline"
                            className="text-xs px-2.5 py-1 gap-1 text-amber-700 bg-amber-50/70 hover:bg-amber-100 border-amber-300"
                            onClick={() => handleOpenReviewForOrder(order)}
                            title="Review items from this delivered order"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />{" "}
                            Review Order
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => setSelectedOrder(order)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          className="text-xs px-2.5 py-1 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setReceiptModalOrder(order)}
                          title="Official Receipt"
                        >
                          <Download className="w-3.5 h-3.5" /> Receipt
                        </Button>
                        {(order.status === "Pending" ||
                          order.status === "Processing") && (
                          <Button
                            variant="outline"
                            className="text-xs px-2.5 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            disabled={cancellingOrderId === order.id}
                            onClick={() => handleCancelOrder(order.id)}
                            title="Cancel Order"
                          >
                            {cancellingOrderId === order.id
                              ? "Cancelling..."
                              : "Cancel"}
                          </Button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}
          {section === "Saved Addresses" && (
            <section className="account-section">
              <div className="account-section-head">
                <div>
                  <p className="eyebrow">Delivery details</p>
                  <h2>Saved Addresses</h2>
                  <p>Make checkout faster with your favorite destinations.</p>
                </div>
                <Button onClick={() => openAddressModal()}>
                  <Plus /> Add New Address
                </Button>
              </div>
              <div className="address-grid">
                {addressesLoading ? (
                  <div className="p-8 text-center text-muted-foreground col-span-full">
                    Loading saved addresses...
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground col-span-full">
                    <p className="mb-3">You have no saved addresses yet.</p>
                    <Button onClick={() => openAddressModal()}>
                      <Plus /> Add an address
                    </Button>
                  </div>
                ) : (
                  addresses.map((address, index) => (
                    <article key={address.id}>
                      <div>
                        <MapPin />
                        <Badge
                          tone={
                            index === 0 || address.isDefault ? "rose" : "gold"
                          }
                        >
                          {address.isDefault || index === 0
                            ? "Default"
                            : address.label}
                        </Badge>
                      </div>
                      <h3>{address.label}</h3>
                      <p>
                        <strong>{address.name}</strong>
                        {address.phone && (
                          <>
                            <br />
                            <small className="text-muted-foreground">
                              {address.phone}
                            </small>
                          </>
                        )}
                        <br />
                        {address.line}
                        <br />
                        {address.city}, {address.postalCode}
                        <br />
                        <small className="text-muted-foreground">
                          {address.country}
                        </small>
                      </p>
                      <div>
                        <Button
                          variant="outline"
                          onClick={() => openAddressModal(address)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDeleteAddress(address.id)}
                        >
                          <Trash2 /> Delete
                        </Button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}
          {section === "Wishlist" && (
            <section className="account-section">
              <div className="account-section-head">
                <div>
                  <p className="eyebrow">Saved for later</p>
                  <h2>Wishlist</h2>
                  <p>Your personal edit of products worth remembering.</p>
                </div>
              </div>
              {wishlistProducts.length ? (
                <div className="account-wishlist-grid">
                  {wishlistProducts.map((product) => (
                    <article className="wishlist-product" key={product.id}>
                      <Link to={getProductUrl(product)}>
                        <img src={product.image} alt={product.name} />
                      </Link>
                      <p className="eyebrow">{product.brand}</p>
                      <Link to={getProductUrl(product)}>{product.name}</Link>
                      <strong>{formatPrice(product.price)}</strong>
                      <div>
                        <Button onClick={() => addToCart(product)}>
                          <ShoppingBag /> Add to Cart
                        </Button>
                        <Button
                          variant="ghost"
                          aria-label={`Remove ${product.name} from wishlist`}
                          onClick={() => toggleWishlist(product)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="account-empty">
                  <Heart />
                  <h3>Your wishlist is waiting</h3>
                  <p>Save products you love and find them here anytime.</p>
                  <Link to="/shop" className="btn btn-primary">
                    Explore products
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      <Modal
        open={selectedOrder !== null}
        title={`Order ${selectedOrder?.number || ""}`}
        size="md"
        onClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <div className="order-detail">
            <div className="order-detail-meta">
              <div>
                <span>
                  Ordered on <strong>{selectedOrder.date}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  tone={
                    selectedOrder.status === "Delivered"
                      ? "green"
                      : selectedOrder.status === "Pending"
                        ? "gold"
                        : "rose"
                  }
                >
                  {selectedOrder.status}
                </Badge>
                <Button
                  variant="outline"
                  className="text-xs py-1 px-2.5 gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => setReceiptModalOrder(selectedOrder)}
                >
                  <Download className="w-3.5 h-3.5" /> Official Receipt
                </Button>
              </div>
            </div>

            {selectedOrder.status === "Delivered" && (
              <div className="p-3.5 bg-gradient-to-r from-amber-50 via-rose-50/40 to-amber-50/60 border border-amber-200/90 rounded-xl flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink">
                      Order Delivered!
                    </p>
                    <p className="text-[11px] text-muted">
                      How was your experience? Leave a review directly on your
                      items.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="text-xs py-1 px-3 shrink-0 gap-1"
                  onClick={() => handleOpenReviewForOrder(selectedOrder)}
                >
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-200" />{" "}
                  Review Items
                </Button>
              </div>
            )}

            <div className="order-detail-items">
              {selectedOrder.items.map((item) => {
                const itemKey = `${selectedOrder.number}_${item.name}`
                const isReviewed = reviewedKeys.has(itemKey)
                return (
                  <div key={item.id} className="flex-col !items-stretch gap-2">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} />
                        <span>
                          <strong>{item.name}</strong>
                          <small>
                            {item.brand ? `${item.brand} • ` : ""}
                            {item.option}
                            {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                          </small>
                        </span>
                      </div>
                      <b>
                        {formatPrice(
                          item.lineTotal || item.unitPrice * item.quantity,
                        )}
                      </b>
                    </div>
                    {selectedOrder.status === "Delivered" && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/20">
                        <span className="text-[11px] text-muted">
                          Verified delivered purchase
                        </span>
                        {isReviewed ? (
                          <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <Check className="w-3.5 h-3.5" /> Reviewed
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-2.5 gap-1 text-rose hover:bg-rose-50 border-rose-200"
                            onClick={() =>
                              handleOpenReviewModalForItem(item, selectedOrder)
                            }
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                            <span>Write Review</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Order financial breakdown */}
            <div className="border-t border-border/40 pt-3 mt-3 text-sm space-y-1.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{formatPrice(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>
                  {selectedOrder.shipping === 0
                    ? "Free"
                    : formatPrice(selectedOrder.shipping)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-foreground pt-1.5 border-t border-border/30">
                <span>Total:</span>
                <span>{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Delivery address info */}
            {selectedOrder.shippingAddress?.address && (
              <div className="mt-3 p-3 bg-muted/40 rounded-lg text-xs space-y-0.5">
                <span className="font-semibold block text-foreground mb-1">
                  Delivery Address:
                </span>
                <div>{selectedOrder.shippingAddress.name}</div>
                <div>
                  {selectedOrder.shippingAddress.address},{" "}
                  {selectedOrder.shippingAddress.city}{" "}
                  {selectedOrder.shippingAddress.postalCode}
                </div>
                {selectedOrder.shippingAddress.country && (
                  <div>{selectedOrder.shippingAddress.country}</div>
                )}
                {selectedOrder.shippingAddress.phone && (
                  <div className="text-muted-foreground">
                    Phone: {selectedOrder.shippingAddress.phone}
                  </div>
                )}
              </div>
            )}

            {/* Tracking & Carrier Banner */}
            {(selectedOrder.carrier || selectedOrder.trackingNumber) && (
              <div className="mt-3 p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-rose-700 shrink-0" />
                    <span className="font-semibold text-foreground">
                      Dispatched via {selectedOrder.carrier || "Courier"}
                    </span>
                  </div>
                  {selectedOrder.trackingUrl && (
                    <a
                      href={selectedOrder.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:underline"
                    >
                      Track Package <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {selectedOrder.trackingNumber && (
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px] flex-wrap">
                    <span>Tracking Number:</span>
                    <code className="bg-white px-2 py-0.5 rounded border border-rose-200 font-mono font-semibold text-foreground">
                      {selectedOrder.trackingNumber}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          selectedOrder.trackingNumber!,
                        )
                        notify("Tracking number copied to clipboard")
                      }}
                      className="text-rose-600 hover:text-rose-800 underline ml-1 cursor-pointer"
                      title="Copy tracking number"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="tracking-timeline">
              {[
                "Order placed",
                "Payment confirmed",
                "Shipped",
                selectedOrder.status === "Cancelled"
                  ? "Order cancelled"
                  : "Delivered",
              ].map((event, index) => {
                const reached =
                  selectedOrder.status === "Delivered" ||
                  (selectedOrder.status === "Shipped" && index < 3) ||
                  (selectedOrder.status === "Pending" && index < 2) ||
                  (selectedOrder.status === "Cancelled" &&
                    (index === 0 || index === 3))
                return (
                  <div className={reached ? "is-complete" : ""} key={event}>
                    <i>{reached && <Check />}</i>
                    <span>
                      <strong>{event}</strong>
                      <small>{reached ? "Completed" : "Awaiting update"}</small>
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Modal actions: Download Receipt & Cancel Order */}
            <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
              <Button
                variant="outline"
                className="text-xs py-1.5 px-3 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                onClick={() => setReceiptModalOrder(selectedOrder)}
              >
                <Download className="w-3.5 h-3.5" /> View / Download Official
                Receipt
              </Button>

              <div className="flex items-center gap-2">
                {(selectedOrder.status === "Pending" ||
                  selectedOrder.status === "Processing") && (
                  <Button
                    variant="outline"
                    className="text-xs py-1.5 px-3 text-red-600 hover:text-red-700 hover:border-red-300"
                    disabled={cancellingOrderId === selectedOrder.id}
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                  >
                    {cancellingOrderId === selectedOrder.id
                      ? "Cancelling..."
                      : "Cancel Order"}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  className="text-xs py-1.5 px-3"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Official Receipt Modal */}
      {receiptModalOrder && (
        <Modal
          open={Boolean(receiptModalOrder)}
          title={`Official Receipt #${receiptModalOrder.number}`}
          size="lg"
          onClose={() => setReceiptModalOrder(null)}
        >
          <div className="max-h-[80vh] overflow-y-auto pr-1">
            <OrderReceipt
              order={{
                order_id: receiptModalOrder.id,
                order_number: receiptModalOrder.number,
                subtotal: receiptModalOrder.subtotal ?? receiptModalOrder.total,
                shipping: receiptModalOrder.shipping ?? 0,
                tax: receiptModalOrder.tax ?? 0,
                discount: receiptModalOrder.discount ?? 0,
                total: receiptModalOrder.total,
                estimated_delivery:
                  receiptModalOrder.status === "Delivered"
                    ? "Delivered"
                    : "Within 5 business days",
              }}
              items={receiptModalOrder.items.map((it) => ({
                id: it.id,
                name: it.name,
                brand: it.brand,
                option: it.option,
                price: it.unitPrice,
                quantity: it.quantity,
              }))}
              customer={{
                fullName:
                  receiptModalOrder.shippingAddress?.name ||
                  authProfile?.full_name ||
                  profile.name ||
                  "Customer",
                phone:
                  receiptModalOrder.shippingAddress?.phone ||
                  profile.phone ||
                  "",
                address: receiptModalOrder.shippingAddress?.address || "",
                city: receiptModalOrder.shippingAddress?.city || "",
                postalCode: receiptModalOrder.shippingAddress?.postalCode || "",
                country:
                  receiptModalOrder.shippingAddress?.country ||
                  "United Kingdom",
                email: authProfile?.email || profile.email || user?.email || "",
              }}
              paymentMethod={receiptModalOrder.paymentMethod || "card"}
            />
          </div>
        </Modal>
      )}
      <Modal
        open={addressModalOpen}
        title={editingAddress === null ? "Add New Address" : "Edit Address"}
        onClose={() => setAddressModalOpen(false)}
      >
        <form className="address-form" onSubmit={saveAddress}>
          <Input
            label="Label (e.g. Home, Work)"
            placeholder="Home"
            value={addressForm.label}
            onChange={(event) =>
              setAddressForm({ ...addressForm, label: event.target.value })
            }
            required
          />
          <Input
            label="Full name"
            value={addressForm.name}
            onChange={(event) =>
              setAddressForm({ ...addressForm, name: event.target.value })
            }
            required
          />
          <Input
            label="Phone number"
            type="tel"
            value={addressForm.phone}
            onChange={(event) =>
              setAddressForm({ ...addressForm, phone: event.target.value })
            }
          />
          <Input
            label="Street address"
            placeholder="123 Rose Street, Apt 4B"
            value={addressForm.line}
            onChange={(event) =>
              setAddressForm({ ...addressForm, line: event.target.value })
            }
            required
          />
          <div className="form-grid">
            <Input
              label="City"
              placeholder="London"
              value={addressForm.city}
              onChange={(event) =>
                setAddressForm({ ...addressForm, city: event.target.value })
              }
              required
            />
            <Input
              label="UK Postal code"
              placeholder="SW1A 1AA"
              value={addressForm.postalCode}
              onChange={(event) =>
                setAddressForm({
                  ...addressForm,
                  postalCode: event.target.value.toUpperCase(),
                })
              }
              onBlur={() => {
                if (addressForm.postalCode) {
                  setAddressForm({
                    ...addressForm,
                    postalCode: formatUKPostcode(addressForm.postalCode),
                  })
                }
              }}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Delivery Territory
            </label>
            <div className="p-2.5 rounded-lg border border-border bg-neutral-50 text-xs font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>🇬🇧</span> United Kingdom (UK Domestic Delivery Only)
              </span>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded uppercase">
                Active
              </span>
            </div>
          </div>
          <Button type="submit">
            {editingAddress === null ? "Add Address" : "Save Address"}
          </Button>
        </form>
      </Modal>

      {/* Review Picker Modal for Delivered Orders with multiple items */}
      <Modal
        open={Boolean(reviewOrderPicker)}
        title={`Review Items from Order #${reviewOrderPicker?.number || ""}`}
        size="md"
        onClose={() => setReviewOrderPicker(null)}
      >
        {reviewOrderPicker && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Select any item from this delivered order to write your verified
              review:
            </p>
            <div className="space-y-2">
              {reviewOrderPicker.items.map((item) => {
                const key = `${reviewOrderPicker.number}_${item.name}`
                const isReviewed = reviewedKeys.has(key)
                return (
                  <div
                    key={item.id}
                    className="p-3 border border-border/50 rounded-xl flex items-center justify-between gap-3 bg-white hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg border border-border shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted">{item.brand}</p>
                      </div>
                    </div>
                    {isReviewed ? (
                      <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1 shrink-0 bg-emerald-50 px-2 py-1 rounded-md">
                        <Check className="w-3.5 h-3.5" /> Reviewed
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        className="text-xs py-1 px-3 shrink-0 gap-1"
                        onClick={() => {
                          setReviewOrderPicker(null)
                          handleOpenReviewModalForItem(item, reviewOrderPicker)
                        }}
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-200" />{" "}
                        Review
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Direct Review Modal */}
      <Modal
        open={Boolean(reviewModalItem)}
        title="Leave a Product Review"
        size="md"
        onClose={() => setReviewModalItem(null)}
      >
        {reviewModalItem && (
          <form onSubmit={handleSubmitAccountReview} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/40">
              <img
                src={reviewModalItem.image}
                alt={reviewModalItem.name}
                className="w-14 h-14 object-cover rounded-lg border border-border shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose block">
                  {reviewModalItem.brand || "Abaz Mart"}
                </span>
                <p className="text-sm font-semibold text-ink line-clamp-1">
                  {reviewModalItem.name}
                </p>
                {reviewModalItem.orderNumber && (
                  <span className="text-[11px] text-muted block mt-0.5">
                    Verified Purchase · Order #{reviewModalItem.orderNumber}
                  </span>
                )}
              </div>
            </div>

            {reviewError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {reviewError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Your Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= reviewRating
                          ? "fill-amber-400 text-amber-500"
                          : "text-neutral-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-medium text-muted ml-2">
                  {reviewRating === 5
                    ? "Excellent"
                    : reviewRating === 4
                      ? "Very Good"
                      : reviewRating === 3
                        ? "Average"
                        : reviewRating === 2
                          ? "Below Average"
                          : "Poor"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Review Headline
              </label>
              <Input
                placeholder="e.g. Visible results within a week, highly recommended!"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Your Experience &amp; Feedback
              </label>
              <textarea
                className="w-full min-h-[110px] p-3 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-rose/20 focus:border-rose transition-colors bg-white text-ink"
                placeholder="Share texture, effectiveness, delivery experience, or tips for other customers..."
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewModalItem(null)}
                disabled={submittingReview}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="secondary"
                disabled={submittingReview}
                className="gap-1.5"
              >
                {submittingReview ? "Publishing..." : "Submit Review"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
