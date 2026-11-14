import { RouterProvider } from "react-router"
import { router } from "./routes"
import { AuthProvider } from "./context/AuthContext"
import { useEffect } from "react"

function VercelAnalytics() {
  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
      const script = document.createElement("script")
      script.src = "/_vercel/insights/script.js"
      script.defer = true
      document.head.appendChild(script)
    }
  }, [])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <VercelAnalytics />
    </AuthProvider>
  )
}

