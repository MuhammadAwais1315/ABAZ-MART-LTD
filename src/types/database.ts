export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = "customer" | "admin"
export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
export type PaymentMethod = "card" | "cod" | "paypal"
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          avatar_url: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          email: string
          phone?: string | null
          avatar_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          avatar_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
      }
      store_settings: {
        Row: {
          id: number
          currency: string
          currency_symbol: string
          shipping_fee: number
          free_shipping_threshold: number
          tax_rate: number
          default_country: string
          updated_at: string
        }
        Insert: {
          id?: number
          currency?: string
          currency_symbol?: string
          shipping_fee?: number
          free_shipping_threshold?: number
          tax_rate?: number
          default_country?: string
          updated_at?: string
        }
        Update: {
          id?: number
          currency?: string
          currency_symbol?: string
          shipping_fee?: number
          free_shipping_threshold?: number
          tax_rate?: number
          default_country?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: number
          name: string
          slug: string
          image_url: string | null
          description: string | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          name: string
          slug: string
          image_url?: string | null
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          name?: string
          slug?: string
          image_url?: string | null
          description?: string | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      brands: {
        Row: {
          id: number
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: number
          name: string
          slug: string
          brand_id: number | null
          brand: string
          category_id: number
          category_name: string
          price: number
          old_price: number | null
          stock: number
          rating: number
          review_count: number
          description: string
          ingredients: string | null
          how_to_use: string | null
          options: string[]
          image: string
          additional_images: string[]
          badge: string | null
          skin_types: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
          brand_id?: number | null
          brand: string
          category_id: number
          category_name: string
          price: number
          old_price?: number | null
          stock?: number
          rating?: number
          review_count?: number
          description: string
          ingredients?: string | null
          how_to_use?: string | null
          options?: string[]
          image: string
          additional_images?: string[]
          badge?: string | null
          skin_types?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          brand_id?: number | null
          brand?: string
          category_id?: number
          category_name?: string
          price?: number
          old_price?: number | null
          stock?: number
          rating?: number
          review_count?: number
          description?: string
          ingredients?: string | null
          how_to_use?: string | null
          options?: string[]
          image?: string
          additional_images?: string[]
          badge?: string | null
          skin_types?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_addresses: {
        Row: {
          id: number
          user_id: string
          label: string
          full_name: string
          phone: string | null
          address_line: string
          city: string
          state: string | null
          postal_code: string
          country: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          user_id: string
          label?: string
          full_name: string
          phone?: string | null
          address_line: string
          city: string
          state?: string | null
          postal_code: string
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          user_id?: string
          label?: string
          full_name?: string
          phone?: string | null
          address_line?: string
          city?: string
          state?: string | null
          postal_code?: string
          country?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cart_items: {
        Row: {
          id: number
          user_id: string
          product_id: number
          quantity: number
          selected_option: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          user_id: string
          product_id: number
          quantity?: number
          selected_option: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          user_id?: string
          product_id?: number
          quantity?: number
          selected_option?: string
          created_at?: string
          updated_at?: string
        }
      }
      wishlist_items: {
        Row: {
          id: number
          user_id: string
          product_id: number
          created_at: string
        }
        Insert: {
          id?: never
          user_id: string
          product_id: number
          created_at?: string
        }
        Update: {
          id?: never
          user_id?: string
          product_id?: number
          created_at?: string
        }
      }
      coupons: {
        Row: {
          id: number
          code: string
          discount_percent: number
          min_spend: number
          max_discount: number | null
          is_active: boolean
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          code: string
          discount_percent: number
          min_spend?: number
          max_discount?: number | null
          is_active?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          code?: string
          discount_percent?: number
          min_spend?: number
          max_discount?: number | null
          is_active?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string
          status: OrderStatus
          subtotal: number
          shipping: number
          tax: number
          discount: number
          total: number
          coupon_id: number | null
          payment_method: PaymentMethod
          payment_status: PaymentStatus
          shipping_name: string
          shipping_phone: string
          shipping_address: string
          shipping_city: string
          shipping_postal_code: string
          shipping_country: string
          estimated_delivery_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          user_id: string
          status?: OrderStatus
          subtotal: number
          shipping?: number
          tax?: number
          discount?: number
          total: number
          coupon_id?: number | null
          payment_method?: PaymentMethod
          payment_status?: PaymentStatus
          shipping_name: string
          shipping_phone: string
          shipping_address: string
          shipping_city: string
          shipping_postal_code: string
          shipping_country?: string
          estimated_delivery_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          user_id?: string
          status?: OrderStatus
          subtotal?: number
          shipping?: number
          tax?: number
          discount?: number
          total?: number
          coupon_id?: number | null
          payment_method?: PaymentMethod
          payment_status?: PaymentStatus
          shipping_name?: string
          shipping_phone?: string
          shipping_address?: string
          shipping_city?: string
          shipping_postal_code?: string
          shipping_country?: string
          estimated_delivery_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: number
          order_id: string
          product_id: number | null
          product_name: string
          product_brand: string
          product_image: string
          selected_option: string
          unit_price: number
          quantity: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: never
          order_id: string
          product_id?: number | null
          product_name: string
          product_brand: string
          product_image: string
          selected_option: string
          unit_price: number
          quantity: number
          line_total: number
          created_at?: string
        }
        Update: {
          id?: never
          order_id?: string
          product_id?: number | null
          product_name?: string
          product_brand?: string
          product_image?: string
          selected_option?: string
          unit_price?: number
          quantity?: number
          line_total?: number
          created_at?: string
        }
      }
      order_status_history: {
        Row: {
          id: number
          order_id: string
          old_status: OrderStatus | null
          new_status: OrderStatus
          changed_by: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: never
          order_id: string
          old_status?: OrderStatus | null
          new_status: OrderStatus
          changed_by?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: never
          order_id?: string
          old_status?: OrderStatus | null
          new_status?: OrderStatus
          changed_by?: string | null
          note?: string | null
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: number
          product_id: number
          user_id: string
          reviewer_name: string
          rating: number
          title: string
          content: string
          is_verified_buyer: boolean
          is_approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          product_id: number
          user_id: string
          reviewer_name: string
          rating: number
          title: string
          content: string
          is_verified_buyer?: boolean
          is_approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          product_id?: number
          user_id?: string
          reviewer_name?: string
          rating?: number
          title?: string
          content?: string
          is_verified_buyer?: boolean
          is_approved?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      newsletter_subscribers: {
        Row: {
          id: number
          email: string
          subscribed_at: string
        }
        Insert: {
          id?: never
          email: string
          subscribed_at?: string
        }
        Update: {
          id?: never
          email?: string
          subscribed_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_coupon: {
        Args: {
          p_code: string
          p_subtotal: number
        }
        Returns: number
      }
      create_order_secure: {
        Args: {
          p_shipping_name: string
          p_shipping_phone: string
          p_shipping_address: string
          p_shipping_city: string
          p_shipping_postal_code: string
          p_shipping_country: string
          p_payment_method: PaymentMethod
          p_items: Json
          p_coupon_code?: string | null
        }
        Returns: {
          order_id: string
          order_number: string
          subtotal: number
          shipping: number
          tax: number
          discount: number
          total: number
          estimated_delivery: string
        }
      }
      cancel_order_secure: {
        Args: {
          p_order_id: string
        }
        Returns: boolean
      }
      submit_review_secure: {
        Args: {
          p_product_id: number
          p_rating: number
          p_title: string
          p_content: string
        }
        Returns: Database["public"]["Tables"]["reviews"]["Row"]
      }
    }
    Enums: {
      user_role: UserRole
      order_status: OrderStatus
      payment_method: PaymentMethod
      payment_status: PaymentStatus
    }
  }
}
