import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface MenuItem {
  id: number
  outlet_id?: string
  name: string
  price: number
  available: boolean
  is_veg: boolean
  category: string
  stock_qty?: number
  image_url?: string
}

export interface Outlet {
  id: string
  name: string
  location: string
  is_open: boolean
  is_event: boolean
  menu_items?: MenuItem[]
}

export const fetchOutlets = async (): Promise<Outlet[]> => {
  if (!supabase) return []
  const { data, error } = await supabase.from('outlets').select(`
    id, name, location, is_open, is_event,
    menu_items (id, name, price, available, is_veg, category, stock_qty, image_url)
  `)

  if (error) {
    console.warn('Failed to fetch outlets from Supabase:', error)
    return []
  }

  return (data || []).map((o: any) => ({
    ...o,
    menu_items: o.menu_items || [],
  }))
}

export const useOutletsQuery = () => {
  const queryClient = useQueryClient()

  const query = useQuery<Outlet[]>({
    queryKey: ['outlets'],
    queryFn: fetchOutlets,
    staleTime: 1000 * 60 * 2, // 2 minutes stale time for high-traffic caching
    refetchOnWindowFocus: true,
  })

  const invalidateOutlets = () => {
    queryClient.invalidateQueries({ queryKey: ['outlets'] })
  }

  return {
    outlets: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidateOutlets,
  }
}
