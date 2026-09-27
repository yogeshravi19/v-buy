import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Will be caught in App.tsx and shown as a setup screen
export const supabaseConfigured =
  supabaseUrl &&
  !supabaseUrl.includes('YOUR_PROJECT') &&
  supabaseAnon &&
  !supabaseAnon.includes('YOUR_ANON')

export const supabase = createClient(
  supabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseConfigured ? supabaseAnon : 'placeholder',
  { realtime: { params: { eventsPerSecond: 20 } } }
)


export type Database = {
  public: {
    Tables: {
      outlets: {
        Row: { id: string; name: string; location: string; is_event: boolean; is_open: boolean }
      }
      menu_items: {
        Row: {
          id: number; outlet_id: string; name: string; price: number
          available: boolean; is_veg: boolean; category: string
          available_from: string | null; available_to: string | null
          stock_qty: number | null; reserved_qty: number
        }
      }
      profiles: {
        Row: {
          id: string; full_name: string; role: 'student' | 'staff' | 'shop_admin' | 'super_admin'
          cust_type: 'student' | 'faculty' | 'outsider' | 'event_team'
          outlet_id: string | null; phone: string | null; created_at: string
          added_by?: string | null; is_active?: boolean
        }
      }
      wallets: {
        Row: { user_id: string; balance: number; updated_at: string }
      }
      wallet_txns: {
        Row: {
          id: number; user_id: string; amount: number
          kind: 'topup' | 'order' | 'refund' | 'admin_credit'
          ref: string; note: string | null; created_at: string
        }
      }
      orders: {
        Row: {
          id: number; user_id: string; outlet_id: string; token: string | null
          status: 'payment_pending'|'placed'|'preparing'|'ready'|'collected'|'cancelled'
          payment_method: 'wallet' | 'gateway'
          shop_payout: number; total: number; my_profit: number
          cancel_reason: string | null; expires_at: string | null
          pickup_slot_id?: string | null; group_id?: string | null
          created_at: string; updated_at: string
        }
      }
      order_items: {
        Row: { order_id: number; item_id: number; name: string; price: number; qty: number }
      }
      stock_adjustments: {
        Row: {
          id: number; outlet_id: string; item_id: number; adjusted_by: string | null
          qty_change: number; previous_qty: number | null; new_qty: number | null
          reason: 'manual_adjustment' | 'order_decrement' | 'counter_pos' | '86_sold_out' | 'restock'
          created_at: string
        }
      }
      invites: {
        Row: {
          id: string; code: string; email: string | null; phone: string | null
          role: 'staff' | 'shop_admin'; outlet_id: string; invited_by: string
          expires_at: string; status: 'pending' | 'accepted' | 'revoked' | 'expired'
          accepted_by: string | null; created_at: string
        }
      }
      pickup_slots: {
        Row: {
          id: string; outlet_id: string; slot_time: string; max_orders: number; current_orders: number
        }
      }
      coupons: {
        Row: {
          code: string; discount_type: 'flat' | 'percent'; discount_value: number
          min_order_value: number | null; max_uses: number | null; used_count: number
          outlet_id: string | null; valid_from: string; valid_to: string; active: boolean
        }
      }
      item_ratings: {
        Row: {
          id: string; order_id: number; item_id: number; user_id: string; rating: number
          review: string | null; created_at: string
        }
      }
      settings: {
        Row: { id: number; event_mode: boolean; updated_at?: string }
      }
    }
  }
}
