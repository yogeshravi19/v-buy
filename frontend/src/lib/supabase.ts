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
          id: string; full_name: string; role: 'customer' | 'staff' | 'admin'
          cust_type: 'student' | 'faculty' | 'outsider' | 'event_team'
          outlet_id: string | null; phone: string | null; created_at: string
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
          created_at: string; updated_at: string
        }
      }
      order_items: {
        Row: { order_id: number; item_id: number; name: string; price: number; qty: number }
      }
      payments: {
        Row: {
          phonepe_txn_id: string; user_id: string; order_id: number | null
          amount: number; purpose: 'topup' | 'order_payment'
          status: 'created' | 'PENDING' | 'SUCCESS' | 'FAILED'
          created_at: string; updated_at: string
        }
      }
      settings: {
        Row: { id: number; event_mode: boolean }
      }
    }
  }
}
