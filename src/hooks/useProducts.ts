import { useEffect, useState, useCallback } from "react"
import { Product } from "../data/products"
import {
  getBrands,
  getCategories,
  getProducts,
  ProductQueryParams,
} from "../services/products"

export interface UseProductsOptions extends ProductQueryParams {
  page?: number
  pageSize?: number
}

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const {
    category,
    categories,
    brands,
    skinTypes,
    query,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    sort,
    page = 1,
    pageSize = 12,
  } = options

  const fetchCatalog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const offset = (page - 1) * pageSize
      const result = await getProducts({
        category,
        categories,
        brands,
        skinTypes,
        query,
        minPrice,
        maxPrice,
        minRating,
        inStockOnly,
        sort,
        limit: pageSize,
        offset,
      })
      if (result.error) {
        setError(result.error)
      }
      setProducts(result.data)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load products"))
    } finally {
      setLoading(false)
    }
  }, [
    category,
    categories?.join(","),
    brands?.join(","),
    skinTypes?.join(","),
    query,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    sort,
    page,
    pageSize,
  ])

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return {
    products,
    total,
    totalPages,
    loading,
    error,
    refetch: fetchCatalog,
  }
}

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getCategories()
      .then((data) => {
        if (mounted) setCategories(data)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return { categories, loading }
}

export function useBrands() {
  const [brands, setBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getBrands()
      .then((data) => {
        if (mounted) setBrands(data)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return { brands, loading }
}
