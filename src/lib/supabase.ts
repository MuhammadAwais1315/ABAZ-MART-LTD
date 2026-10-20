import { createClient } from "@supabase/supabase-js"
import { Database } from "../types/database"

/**
 * Resolves the Supabase URL.
 * By default, routes requests through the custom reverse proxy (/db-gateway)
 * so that the raw Supabase URL (twstiotnaaglptizaxkm.supabase.co) is completely
 * masked behind your domain (abazmart.co.uk/db-gateway) in browser traffic.
 */
function resolveSupabaseUrl(): string {
  const customUrl = import.meta.env.VITE_SUPABASE_URL

  // If explicitly disabled via VITE_USE_DB_PROXY="false" and a direct URL was provided
  if (
    import.meta.env.VITE_USE_DB_PROXY === "false" &&
    customUrl &&
    customUrl.startsWith("http")
  ) {
    return customUrl
  }

  // Masked reverse proxy in browser runtime
  if (typeof window !== "undefined") {
    return `${window.location.origin}/db-gateway`
  }

  // SSR / build-time fallback
  return customUrl || "https://www.abazmart.co.uk/db-gateway"
}

const supabaseUrl = resolveSupabaseUrl()

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder"

export const isSupabaseConfigured = (): boolean => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  const url = import.meta.env.VITE_SUPABASE_URL

  if (!key || key.includes("placeholder") || key.trim().length < 20) {
    return false
  }

  if (url && url.includes("placeholder-project")) {
    return false
  }

  return true
}

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
