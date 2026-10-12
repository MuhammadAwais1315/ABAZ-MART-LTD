import { ReactNode } from "react"
import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "../../context/AuthContext"

export default function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-12">
        <div
          className="w-8 h-8 rounded-full border-2 border-stone-800 border-t-transparent animate-spin"
          aria-label="Loading authentication state"
        />
      </div>
    )
  }

  if (!user) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search)
    return (
      <Navigate
        to={`/login?redirect=${redirectUrl}`}
        replace
        state={{ from: location }}
      />
    )
  }

  return children ? <>{children}</> : <Outlet />
}
