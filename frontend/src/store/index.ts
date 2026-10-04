import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'customer' | 'staff' | 'shop_admin' | 'super_admin' | 'admin'

export type Profile = {
  id: string
  full_name: string
  role: UserRole
  outlet_id: string | null
  phone: string | null
  added_by?: string | null
  is_active?: boolean
  created_at?: string
}

type AuthState = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  setSession: (session: Session | null) => void
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => {
    set({ session, user: session?.user ?? null, loading: false })
  },

  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) set({ profile: data as Profile })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },
}))

// Wallet store
type WalletState = {
  balance: number | null
  loading: boolean
  fetchBalance: (userId: string) => Promise<void>
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: null,
  loading: false,
  fetchBalance: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single()
    set({ balance: data?.balance ?? null, loading: false })
  },
}))

// Cart store (per outlet)
type CartItem = { item_id: number; name: string; price: number; qty: number; is_veg: boolean }
type CartState = {
  items: CartItem[]
  outlet_id: string | null
  addItem: (item: CartItem, outlet_id: string) => void
  removeItem: (item_id: number) => void
  updateQty: (item_id: number, qty: number) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  outlet_id: null,

  addItem: (item, outlet_id) => {
    const current = get()
    // If adding from different outlet, clear existing cart
    if (current.outlet_id && current.outlet_id !== outlet_id) {
      set({ items: [{ ...item, qty: 1 }], outlet_id })
      return
    }
    const existing = current.items.find((i) => i.item_id === item.item_id)
    if (existing) {
      set({ items: current.items.map((i) => i.item_id === item.item_id ? { ...i, qty: i.qty + 1 } : i) })
    } else {
      set({ items: [...current.items, { ...item, qty: 1 }], outlet_id })
    }
  },

  removeItem: (item_id) => {
    const items = get().items.filter((i) => i.item_id !== item_id)
    set({ items, outlet_id: items.length === 0 ? null : get().outlet_id })
  },

  updateQty: (item_id, qty) => {
    if (qty <= 0) { get().removeItem(item_id); return }
    set({ items: get().items.map((i) => i.item_id === item_id ? { ...i, qty } : i) })
  },

  clearCart: () => set({ items: [], outlet_id: null }),

  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
}))
