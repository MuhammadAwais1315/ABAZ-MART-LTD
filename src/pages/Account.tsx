import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import {
  Check,
  CircleUserRound,
  Heart,
  LogOut,
  MapPin,
  Package,
  Plus,
  Download,
  ShoppingBag,
  Trash2,
  Upload,
} from "lucide-react"
import { Badge, Breadcrumb, Button, Input, Modal } from "../components/ui"
import { useStore } from "../context/StoreContext"
import { useAuth } from "../context/AuthContext"
import { products } from "../data/products"
import { formatPrice } from "../utils/formatPrice"
import { OrderReceipt } from "../components/checkout/OrderReceipt"
import { PaymentMethod } from "../types/database"
import {
  getCustomerOrders,
  cancelOrder,
  getCustomerAddresses,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  CustomerOrder,
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
    accountTab === "wishlist" ? "Wishlist" : "Profile",
  )
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null)
  const [receiptModalOrder, setReceiptModalOrder] = useState<CustomerOrder | null>(null)
  const [avatar, setAvatar] = useState(
    authProfile?.avatar_url ||
      (user?.user_metadata?.avatar_url as string) ||
      (user?.user_metadata?.picture as string) ||
      "https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?auto=format&fit=crop&w=240&q=85",
  )
  const [profile, setProfile] = useState({
    name:
      authProfile?.full_name ||
      (user?.user_metadata?.full_name as string) ||
      (user?.user_metadata?.name as string) ||
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
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          prev.name,
      }))
      if (user.user_metadata?.avatar_url || user.user_metadata?.picture) {
        setAvatar(
          (user.user_metadata.avatar_url as string) ||
            (user.user_metadata.picture as string),
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

  const wishlistProducts = products.filter((product) =>
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

    if (editingAddress !== null) {
      const { error } = await updateCustomerAddress(editingAddress, {
        label: addressForm.label,
        name: addressForm.name,
        phone: addressForm.phone,
        line: addressForm.line,
        city: addressForm.city,
        postalCode: addressForm.postalCode,
        country: addressForm.country,
      })
      if (error) {
        notify(error.message)
        return
      }
      setAddresses((current) =>
        current.map((address) =>
          address.id === editingAddress
            ? { ...address, ...addressForm }
            : address,
        ),
      )
      notify("Address updated successfully")
    } else if (user) {
      const { data, error } = await addCustomerAddress(user.id, {
        label: addressForm.label,
        name: addressForm.name,
        phone: addressForm.phone,
        line: addressForm.line,
        city: addressForm.city,
        postalCode: addressForm.postalCode,
        country: addressForm.country,
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
              {item.label === "Wishlist" && wishlist.length > 0 && (
                <Badge>{wishlist.length}</Badge>
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
                      <Button
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View Details
                      </Button>
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
                        <Badge tone={index === 0 || address.isDefault ? "rose" : "gold"}>
                          {address.isDefault || index === 0 ? "Default" : address.label}
                        </Badge>
                      </div>
                      <h3>{address.label}</h3>
                      <p>
                        <strong>{address.name}</strong>
                        {address.phone && (
                          <>
                            <br />
                            <small className="text-muted-foreground">{address.phone}</small>
                          </>
                        )}
                        <br />
                        {address.line}
                        <br />
                        {address.city}, {address.postalCode}
                        <br />
                        <small className="text-muted-foreground">{address.country}</small>
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
                      <Link to={`/product/${product.id}`}>
                        <img src={product.image} alt={product.name} />
                      </Link>
                      <p className="eyebrow">{product.brand}</p>
                      <Link to={`/product/${product.id}`}>{product.name}</Link>
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
        onClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <div className="order-detail">
            <div className="order-detail-meta">
              <span>
                Ordered <strong>{selectedOrder.date}</strong>
              </span>
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
            </div>
            <div className="order-detail-items">
              {selectedOrder.items.map((item) => (
                <div key={item.id}>
                  <img src={item.image} alt={item.name} />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.brand ? `${item.brand} • ` : ""}
                      {item.option}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </small>
                  </span>
                  <b>{formatPrice(item.lineTotal || item.unitPrice * item.quantity)}</b>
                </div>
              ))}
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
                <span>{selectedOrder.shipping === 0 ? "Free" : formatPrice(selectedOrder.shipping)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground pt-1.5 border-t border-border/30">
                <span>Total:</span>
                <span>{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Delivery address info */}
            {selectedOrder.shippingAddress?.address && (
              <div className="mt-3 p-3 bg-muted/40 rounded-lg text-xs space-y-0.5">
                <span className="font-semibold block text-foreground mb-1">Delivery Address:</span>
                <div>{selectedOrder.shippingAddress.name}</div>
                <div>
                  {selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.city}{" "}
                  {selectedOrder.shippingAddress.postalCode}
                </div>
                {selectedOrder.shippingAddress.country && (
                  <div>{selectedOrder.shippingAddress.country}</div>
                )}
                {selectedOrder.shippingAddress.phone && (
                  <div className="text-muted-foreground">Phone: {selectedOrder.shippingAddress.phone}</div>
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
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
              <Button
                variant="outline"
                className="text-xs py-1 px-3 gap-1.5"
                onClick={() => setReceiptModalOrder(selectedOrder)}
              >
                <Download className="w-3.5 h-3.5" /> View / Download Receipt
              </Button>

              {selectedOrder.status === "Pending" && (
                <Button
                  variant="outline"
                  className="text-xs py-1 px-3 text-rose-600 hover:text-rose-700 hover:border-rose-300"
                  disabled={cancellingOrderId === selectedOrder.id}
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Are you sure you want to cancel this pending order? This will safely restock the reserved inventory.",
                      )
                    ) {
                      setCancellingOrderId(selectedOrder.id)
                      const { success, error } = await cancelOrder(selectedOrder.id)
                      setCancellingOrderId(null)
                      if (error) {
                        notify(error.message)
                      } else if (success) {
                        notify("Order cancelled successfully")
                        setSelectedOrder({ ...selectedOrder, status: "Cancelled" })
                        setOrders((current) =>
                          current.map((o) =>
                            o.id === selectedOrder.id
                              ? { ...o, status: "Cancelled" }
                              : o,
                          ),
                        )
                      }
                    }
                  }}
                >
                  {cancellingOrderId === selectedOrder.id
                    ? "Cancelling..."
                    : "Cancel Order"}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Official Receipt Modal */}
      {receiptModalOrder && (
        <Modal
          open={Boolean(receiptModalOrder)}
          title={`Order Receipt #${receiptModalOrder.number}`}
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
                postalCode:
                  receiptModalOrder.shippingAddress?.postalCode || "",
                country:
                  receiptModalOrder.shippingAddress?.country || "United Kingdom",
              }}
              paymentMethod={
                receiptModalOrder.paymentMethod || "card"
              }
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
              label="Postal code"
              placeholder="SW1A 1AA"
              value={addressForm.postalCode}
              onChange={(event) =>
                setAddressForm({ ...addressForm, postalCode: event.target.value })
              }
              required
            />
          </div>
          <Input
            label="Country"
            value={addressForm.country}
            onChange={(event) =>
              setAddressForm({ ...addressForm, country: event.target.value })
            }
            required
          />
          <Button type="submit">
            {editingAddress === null ? "Add Address" : "Save Address"}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
