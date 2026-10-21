import { useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router"
import {
  ArrowRight,
  Bell,
  ChevronDown,
  LayoutDashboard,
  List,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Users,
  X,
} from "lucide-react"
import { Button } from "../../components/ui"
import { useScrollReveal } from "../../hooks/useScrollReveal"
import { useAuth } from "../../context/AuthContext"

export default function AdminLayout() {
  useScrollReveal()
  const navigate = useNavigate()
  const { profile, user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const adminMenu = [
    { label: "Dashboard", to: "/admin", icon: <LayoutDashboard />, end: true },
    { label: "Products", to: "/admin/products", icon: <ShoppingBag /> },
    { label: "Categories", to: "/admin/categories", icon: <List /> },
    { label: "Orders", to: "/admin/orders", icon: <Package /> },
    { label: "Customers", to: "/admin/customers", icon: <Users /> },
    { label: "Settings", to: "/admin/settings", icon: <Settings /> },
  ]

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="admin-logo">
          <Link to="/admin" className="block" aria-label="Abaz Mart Admin">
            <img
              src="/logo-horizontal-light.png"
              alt="Abaz Mart"
              style={{ height: "34px", width: "auto", objectFit: "contain" }}
            />
          </Link>
          <span>Administration</span>
        </div>
        <nav>
          {adminMenu.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/">
            <ArrowRight /> Back to store
          </Link>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <Button
            variant="ghost"
            className="admin-menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle admin menu"
          >
            {sidebarOpen ? <X /> : <Menu />}
          </Button>
          <div className="admin-search">
            <Search />
            <input placeholder="Search anything..." aria-label="Search admin" />
          </div>
          <div className="admin-top-actions">
            <Button
              variant="ghost"
              className="notification-button"
              aria-label="Notifications"
            >
              <Bell />
              <i />
            </Button>
            <div className="admin-profile">
              <Button
                variant="ghost"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <img
                  src={
                    profile?.avatar_url ||
                    "https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?auto=format&fit=crop&w=100&q=80"
                  }
                  alt={profile?.full_name || "Admin"}
                />
                <span>
                  <strong>
                    {profile?.full_name
                      ? profile.full_name.split(" ")[0]
                      : user?.email
                        ? user.email.split("@")[0]
                        : "Admin"}
                  </strong>
                  <small>Administrator</small>
                </span>
                <ChevronDown />
              </Button>
              {profileOpen && (
                <div className="admin-profile-menu">
                  <Link to="/account" onClick={() => setProfileOpen(false)}>
                    My profile
                  </Link>
                  <Link to="/" onClick={() => setProfileOpen(false)}>
                    View store
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileOpen(false)
                      await signOut()
                      navigate("/login")
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
