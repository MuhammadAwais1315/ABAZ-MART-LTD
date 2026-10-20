import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { Session, User } from "@supabase/supabase-js"
import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { Database } from "../types/database"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: Error | null; user: User | null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updateProfile: (updates: {
    full_name?: string
    phone?: string | null
  }) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  uploadAvatar: (
    file: File,
  ) => Promise<{ url: string | null; error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEMO_STORAGE_KEY = "abaz_demo_user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const configured = isSupabaseConfigured()

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    if (!configured) return
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        console.warn("Could not load profile:", error.message)
        return
      }

      if (data) {
        setProfile(data)
      } else {
        // In case handle_new_user trigger has not fired yet, create a client profile row
        const newProfile: Partial<Profile> = {
          id: userId,
          email: userEmail || "",
          full_name: "",
          role: "customer",
        }
        const { data: created } = await supabase
          .from("profiles")
          .insert(newProfile as Profile)
          .select()
          .maybeSingle()
        if (created) setProfile(created)
      }
    } catch (err) {
      console.warn("Error fetching profile:", err)
    }
  }, [configured])

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    if (!configured) {
      // Demo mode fallback: restore demo session from localStorage if present
      try {
        const saved = window.localStorage.getItem(DEMO_STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          setUser(parsed.user)
          setProfile(parsed.profile)
        }
      } catch {
        // ignore
      }
      setLoading(false)
      return
    }

    // Live Supabase Auth
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id, session.user.email)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error retrieving session:", err)
        if (mounted) setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (newSession?.user) {
        await fetchProfile(newSession.user.id, newSession.user.email)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [configured, fetchProfile])

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email)
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!configured) {
      // Demo mode sign in
      const demoUser = {
        id: "demo-user-123",
        email,
        app_metadata: {},
        user_metadata: { full_name: "Amara Williams" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User
      const demoProfile: Profile = {
        id: "demo-user-123",
        email,
        full_name: "Amara Williams",
        phone: "+4402034322415",
        avatar_url:
          "https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?auto=format&fit=crop&w=240&q=85",
        role: email.toLowerCase().includes("admin") ? "admin" : "customer",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setUser(demoUser)
      setProfile(demoProfile)
      window.localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify({ user: demoUser, profile: demoProfile }),
      )
      return { error: null }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!configured) {
      // Demo mode sign up
      const demoUser = {
        id: `demo-${Date.now()}`,
        email,
        app_metadata: {},
        user_metadata: { full_name: fullName },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User
      const demoProfile: Profile = {
        id: demoUser.id,
        email,
        full_name: fullName,
        phone: null,
        avatar_url: null,
        role: "customer",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setUser(demoUser)
      setProfile(demoProfile)
      window.localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify({ user: demoUser, profile: demoProfile }),
      )

      try {
        const rawList = window.localStorage.getItem("abaz_registered_customers")
        const list = rawList ? JSON.parse(rawList) : []
        const customerEntry = {
          id: demoUser.id,
          email,
          fullName,
          phone: null,
          role: "customer",
          createdAt: new Date().toISOString(),
          ordersCount: 0,
        }
        const updated = [
          customerEntry,
          ...list.filter((c: any) => c.email.toLowerCase() !== email.toLowerCase()),
        ]
        window.localStorage.setItem("abaz_registered_customers", JSON.stringify(updated))
        window.dispatchEvent(new CustomEvent("abaz_customer_registered", { detail: customerEntry }))
      } catch {}

      return { error: null, user: demoUser }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          name: fullName,
        },
      },
    })

    if (!error && data.user) {
      try {
        const rawList = window.localStorage.getItem("abaz_registered_customers")
        const list = rawList ? JSON.parse(rawList) : []
        const customerEntry = {
          id: data.user.id,
          email: data.user.email || email,
          fullName,
          phone: null,
          role: "customer",
          createdAt: new Date().toISOString(),
          ordersCount: 0,
        }
        const updated = [
          customerEntry,
          ...list.filter((c: any) => c.email.toLowerCase() !== email.toLowerCase()),
        ]
        window.localStorage.setItem("abaz_registered_customers", JSON.stringify(updated))
        window.dispatchEvent(new CustomEvent("abaz_customer_registered", { detail: customerEntry }))
      } catch {}
    }

    return {
      error: error ? new Error(error.message) : null,
      user: data.user,
    }
  }

  const signOut = async () => {
    if (!configured) {
      setUser(null)
      setSession(null)
      setProfile(null)
      window.localStorage.removeItem(DEMO_STORAGE_KEY)
      return
    }

    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const signInWithGoogle = async () => {
    if (!configured) {
      return signIn("google.user@example.com", "demopassword")
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/account`,
      },
    })
    return { error: error ? new Error(error.message) : null }
  }

  const resetPassword = async (email: string) => {
    if (!configured) {
      return { error: null }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const updateProfile = async (updates: {
    full_name?: string
    phone?: string | null
  }) => {
    if (!user) return { error: new Error("Not authenticated") }

    if (!configured) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null))
      return { error: null }
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null))
    }

    return { error: error ? new Error(error.message) : null }
  }

  const updatePassword = async (newPassword: string) => {
    if (!user) return { error: new Error("Not authenticated") }

    if (!configured) {
      return { error: null }
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return { url: null, error: new Error("Not authenticated") }

    if (!configured) {
      const localUrl = URL.createObjectURL(file)
      setProfile((prev) => (prev ? { ...prev, avatar_url: localUrl } : null))
      return { url: localUrl, error: null }
    }

    try {
      const fileExt = file.name.split(".").pop() || "jpg"
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (uploadError) {
        return { url: null, error: new Error(uploadError.message) }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath)

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id)

      if (profileError) {
        return { url: null, error: new Error(profileError.message) }
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : null))
      return { url: publicUrl, error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload avatar"
      return { url: null, error: new Error(message) }
    }
  }

  const isAdmin =
    profile?.role === "admin" ||
    (user?.app_metadata as Record<string, unknown> | undefined)?.role === "admin" ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.role === "admin"

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        loading,
        isConfigured: configured,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        resetPassword,
        updateProfile,
        updatePassword,
        uploadAvatar,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
