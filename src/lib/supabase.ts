import { createClient } from "@supabase/supabase-js"
import { Database } from "../types/database"

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co"
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder"

export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return Boolean(
    url &&
      key &&
      !url.includes("placeholder-project") &&
      !key.includes("placeholder"),
  )
}

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
