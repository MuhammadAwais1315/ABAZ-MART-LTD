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
  ShoppingBag,
  Trash2,
  Upload,
} from "lucide-react"
import { Badge, Breadcrumb, Button, Input, Modal } from "../components/ui"
import { useStore } from "../context/StoreContext"
import { products } from "../data/products"
import { formatPrice } from "../utils/formatPrice"

const accountOrders = [
  {
    number: "ABZ-10842",
    date: "February 18, 2026",
    total: 126.4,
    status: "Delivered",
    items: [products[0], products[4]],
  },
  {
    number: "ABZ-10796",
    date: "February 2, 2026",
    total: 74,
    status: "Shipped",
    items: [products[15]],
  },
  {
    number: "ABZ-10751",
    date: "January 21, 2026",
    total: 58.75,
    status: "Pending",
    items: [products[8], products[19]],
  },
  {
    number: "ABZ-10688",
    date: "December 28, 2025",
    total: 39,
    status: "Cancelled",
    items: [products[21]],
  },
] as const

type SavedAddress = {
  id: number
  label: string
  name: string
  line: string
  city: string
}

export default function Account() {
  const { wishlist, toggleWishlist, addToCart, notify } = useStore()
  const navigate = useNavigate()
  const [accountParams] = useSearchParams()
  const accountTab = accountParams.get("tab")
  const [section, setSection] = useState(
    accountTab === "wishlist" ? "Wishlist" : "Profile",
  )
  const [selectedOrder, setSelectedOrder] =
    useState<typeof accountOrders[number] | null>(null)
  const [avatar, setAvatar] = useState(
    "https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?auto=format&fit=crop&w=240&q=85",
  )
  const [profile, setProfile] = useState({
    name: "Amara Williams",
    email: "amara.williams@example.com",
    phone: "+44 20 7946 0958",
    currentPassword: "",
    newPassword: "",
  })
  const [addresses, setAddresses] = useState<SavedAddress[]>([
    {
      id: 1,
      label: "Home",
      name: "Amara Williams",
      line: "123 Rose Street, Apt 4B",
      city: "London, SW1A 1AA",
    },
    {
      id: 2,
      label: "Work",
      name: "Amara Williams",
      line: "88 Regent Street, Floor 4",
      city: "London, W1B 5RS",
    },
  ])
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<number | null>(null)
  const [addressForm, setAddressForm] = useState({
    label: "",
    name: "",
    line: "",
    city: "",
  })

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

  const openAddressModal = (address?: SavedAddress) => {
    if (address) {
      setEditingAddress(address.id)
      setAddressForm({
        label: address.label,
        name: address.name,
        line: address.line,
        city: address.city,
      })
    } else {
      setEditingAddress(null)
      setAddressForm({ label: "", name: "", line: "", city: "" })
    }
    setAddressModalOpen(true)
  }

  const saveAddress = (event: FormEvent) => {
    event.preventDefault()
    if (
      !addressForm.label.trim() ||
      !addressForm.name.trim() ||
      !addressForm.line.trim() ||
      !addressForm.city.trim()
    )
      return
    if (editingAddress !== null) {
      setAddresses((current) =>
        current.map((address) =>
          address.id === editingAddress
            ? { ...address, ...addressForm }
            : address,
        ),
      )
    } else {
      setAddresses((current) => [
        ...current,
        { id: Date.now(), ...addressForm },
      ])
    }
    setAddressModalOpen(false)
    notify(
      editingAddress === null
        ? "New address added successfully"
        : "Address updated successfully",
    )
  }

  return (
    <div className="page shell account-page">
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "My account" }]}
      />
      <div className="account-header">
        <div>
          <p className="eyebrow">My account</p>
          <h1>Good morning, Amara.</h1>
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
            onClick={() => navigate("/login")}
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
                  <img src={avatar} alt="Amara Williams" />
                  <label className="btn btn-outline">
                    <Upload /> Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) setAvatar(URL.createObjectURL(file))
                      }}
                    />
                  </label>
                  <small>JPG or PNG, up to 5MB</small>
                </div>
                <form
                  className="profile-form"
                  onSubmit={(event) => {
                    event.preventDefault()
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
                      onChange={(event) =>
                        setProfile({ ...profile, email: event.target.value })
                      }
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
                {accountOrders.map((order) => (
                  <article key={order.number}>
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
                ))}
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
                {addresses.map((address, index) => (
                  <article key={address.id}>
                    <div>
                      <MapPin />
                      <Badge tone={index === 0 ? "rose" : "gold"}>
                        {index === 0 ? "Default" : address.label}
                      </Badge>
                    </div>
                    <h3>{address.label}</h3>
                    <p>
                      <strong>{address.name}</strong>
                      <br />
                      {address.line}
                      <br />
                      {address.city}
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
                        onClick={() => {
                          setAddresses((current) =>
                            current.filter((item) => item.id !== address.id),
                          )
                          notify("Address removed")
                        }}
                      >
                        <Trash2 /> Delete
                      </Button>
                    </div>
                  </article>
                ))}
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
              {selectedOrder.items.map((product) => (
                <div key={product.id}>
                  <img src={product.image} alt={product.name} />
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.options[0]}</small>
                  </span>
                  <b>{formatPrice(product.price)}</b>
                </div>
              ))}
            </div>
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
          </div>
        )}
      </Modal>
      <Modal
        open={addressModalOpen}
        title={editingAddress === null ? "Add New Address" : "Edit Address"}
        onClose={() => setAddressModalOpen(false)}
      >
        <form className="address-form" onSubmit={saveAddress}>
          <Input
            label="Label"
            placeholder="Home, Work..."
            value={addressForm.label}
            onChange={(event) =>
              setAddressForm({ ...addressForm, label: event.target.value })
            }
          />
          <Input
            label="Full name"
            value={addressForm.name}
            onChange={(event) =>
              setAddressForm({ ...addressForm, name: event.target.value })
            }
          />
          <Input
            label="Street address"
            value={addressForm.line}
            onChange={(event) =>
              setAddressForm({ ...addressForm, line: event.target.value })
            }
          />
          <Input
            label="City, state, and postal code"
            value={addressForm.city}
            onChange={(event) =>
              setAddressForm({ ...addressForm, city: event.target.value })
            }
          />
          <Button type="submit">
            {editingAddress === null ? "Add Address" : "Save Address"}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
