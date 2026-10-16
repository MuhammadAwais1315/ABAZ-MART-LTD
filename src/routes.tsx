import { createBrowserRouter } from "react-router"
import RootLayout from "./components/layout/RootLayout"
import ProtectedRoute from "./components/auth/ProtectedRoute"
import AdminRoute from "./components/auth/AdminRoute"
import Home from "./pages/Home"
import Shop from "./pages/Shop"
import ProductPage from "./pages/ProductPage"
import Cart from "./pages/Cart"
import Checkout from "./pages/Checkout"
import AuthPage from "./pages/AuthPage"
import Account from "./pages/Account"
import NotFound from "./pages/NotFound"
import PrivacyPolicy from "./pages/PrivacyPolicy"
import TermsOfService from "./pages/TermsOfService"
import ShippingPolicy from "./pages/ShippingPolicy"
import ReturnsPolicy from "./pages/ReturnsPolicy"
import AdminLayout from "./pages/admin/AdminLayout"
import AdminDashboard from "./pages/admin/AdminDashboard"
import AdminProducts from "./pages/admin/AdminProducts"
import AdminProductForm from "./pages/admin/AdminProductForm"
import AdminOrders from "./pages/admin/AdminOrders"
import AdminCategories from "./pages/admin/AdminCategories"
import AdminCustomers from "./pages/admin/AdminCustomers"
import AdminSettings from "./pages/admin/AdminSettings"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: "shop", Component: Shop },
      { path: "product/:id", Component: ProductPage },
      { path: "cart", Component: Cart },
      {
        path: "checkout",
        Component: () => (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        ),
      },
      { path: "login", Component: () => <AuthPage /> },
      { path: "register", Component: () => <AuthPage mode="register" /> },
      {
        path: "forgot-password",
        Component: () => <AuthPage mode="forgot" />,
      },
      {
        path: "account",
        Component: () => (
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        ),
      },
      { path: "privacy", Component: PrivacyPolicy },
      { path: "terms", Component: TermsOfService },
      { path: "shipping", Component: ShippingPolicy },
      { path: "returns", Component: ReturnsPolicy },
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "/admin",
    Component: () => (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, Component: AdminDashboard },
      { path: "products", Component: AdminProducts },
      { path: "products/new", Component: AdminProductForm },
      { path: "orders", Component: AdminOrders },
      { path: "categories", Component: AdminCategories },
      { path: "customers", Component: AdminCustomers },
      { path: "settings", Component: AdminSettings },
      { path: "*", Component: NotFound },
    ],
  },
])
