import { ReactNode } from "react"
import { Link, Navigate, Outlet, useLocation } from "react-router"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { useAuth } from "../../context/AuthContext"

export default function AdminRoute({ children }: { children?: ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-12">
        <div
          className="w-8 h-8 rounded-full border-2 border-stone-800 border-t-transparent animate-spin"
          aria-label="Checking admin permissions"
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 tracking-tight mb-2">
          Administrator Access Required
        </h1>
        <p className="text-stone-600 max-w-md text-sm sm:text-base leading-relaxed mb-8">
          The portal at <code className="bg-stone-200/70 px-2 py-0.5 rounded text-xs">{location.pathname}</code> is
          restricted to store administrators. Your current account (<strong>{user.email}</strong>) does not have
          administrator credentials.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-md text-sm font-medium hover:bg-stone-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Store
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center px-5 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md text-sm font-medium hover:bg-stone-50 transition"
          >
            Switch Account
          </button>
        </div>
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}
