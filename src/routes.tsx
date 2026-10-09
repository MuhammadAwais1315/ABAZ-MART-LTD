import { createBrowserRouter } from "react-router"
import RootLayout from "./components/layout/RootLayout"
import Home from "./pages/Home"
import Shop from "./pages/Shop"
import ProductPage from "./pages/ProductPage"
import Cart from "./pages/Cart"
import Checkout from "./pages/Checkout"
import AuthPage from "./pages/AuthPage"
import Account from "./pages/Account"
import NotFound from "./pages/NotFound"
import AdminLayout from "./pages/admin/AdminLayout"
import AdminDashboard from "./pages/admin/AdminDashboard"
import AdminProducts from "./pages/admin/AdminProducts"
import AdminProductForm from "./pages/admin/AdminProductForm"
import AdminOrders from "./pages/admin/AdminOrders"
import AdminPlaceholder from "./pages/admin/AdminPlaceholder"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: "shop", Component: Shop },
      { path: "product/:id", Component: ProductPage },
      { path: "cart", Component: Cart },
      { path: "checkout", Component: Checkout },
      { path: "login", Component: () => <AuthPage /> },
      { path: "register", Component: () => <AuthPage mode="register" /> },
      {
        path: "forgot-password",
        Component: () => <AuthPage mode="forgot" />,
      },
      { path: "account", Component: Account },
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "products", Component: AdminProducts },
      { path: "products/new", Component: AdminProductForm },
      { path: "orders", Component: AdminOrders },
      {
        path: "categories",
        Component: () => <AdminPlaceholder title="Categories" />,
      },
      {
        path: "customers",
        Component: () => <AdminPlaceholder title="Customers" />,
      },
      {
        path: "settings",
        Component: () => <AdminPlaceholder title="Settings" />,
      },
      { path: "*", Component: NotFound },
    ],
  },
])
