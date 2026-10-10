import React, { useState } from 'react'
import {
  Database, Table, Key, ArrowRight, ShieldCheck,
  RefreshCw, Layers, CheckCircle2, Zap, Server
} from 'lucide-react'

interface TableField {
  name: string
  type: string
  isPrimary?: boolean
  isForeign?: boolean
  description: string
}

interface SchemaTable {
  id: string
  name: string
  badge: string
  summary: string
  rlsPolicy: string
  realtime: boolean
  fields: TableField[]
}

const SCHEMA_TABLES: SchemaTable[] = [
  {
    id: 'orders',
    name: 'public.orders',
    badge: 'Core Ledger • Realtime',
    summary: 'The central transaction stream powering live status updates across user phones and kitchen displays.',
    rlsPolicy: 'Users can only read their own orders; Shop Staff/Admin can view orders belonging to their outlet_id; Super Admin has global read.',
    realtime: true,
    fields: [
      { name: 'id', type: 'uuid', isPrimary: true, description: 'Unique order identifier' },
      { name: 'token_no', type: 'varchar(6)', description: '3 or 4-digit pickup token shown on customer pass' },
      { name: 'customer_id', type: 'uuid', isForeign: true, description: 'References profiles.id (authenticated user)' },
      { name: 'outlet_id', type: 'uuid', isForeign: true, description: 'References outlets.id (canteen location)' },
      { name: 'status', type: 'order_status_enum', description: "'placed' | 'preparing' | 'ready' | 'collected'" },
      { name: 'total_amount', type: 'numeric(10,2)', description: 'Final bill computed server-side' },
      { name: 'pickup_slot', type: 'varchar(30)', description: '15-minute scheduled window (e.g. 12:30 PM)' },
      { name: 'payment_method', type: 'varchar(20)', description: "'wallet' | 'upi_phonepe'" },
      { name: 'created_at', type: 'timestamptz', description: 'Order submission timestamp' },
    ]
  },
  {
    id: 'outlets',
    name: 'public.outlets',
    badge: 'Campus Dining • 13 Canteens',
    summary: 'Master registry of dining locations including Gazebo C1/C2/C3, North Square, Food Park, and fest stalls.',
    rlsPolicy: 'Publicly readable by all authenticated users; writable exclusively by Shop Admin (assigned outlet) and Super Admin.',
    realtime: true,
    fields: [
      { name: 'id', type: 'uuid', isPrimary: true, description: 'Primary key for dining outlet' },
      { name: 'name', type: 'varchar(100)', description: 'Outlet name (e.g., Gazebo C1 - Snacks & Rolls)' },
      { name: 'campus_location', type: 'varchar(100)', description: 'Physical landmark on campus' },
      { name: 'is_active', type: 'boolean', description: 'Outlet open/closed master switch' },
      { name: 'slot_interval_minutes', type: 'integer', description: 'Slot window (default 15 minutes)' },
      { name: 'max_orders_per_slot', type: 'integer', description: 'Capacity throttle per 15-minute batch' },
      { name: 'is_fest_stall', type: 'boolean', description: 'Flag for Riviera / Gravitas temporary popups' },
    ]
  },
  {
    id: 'menu_items',
    name: 'public.menu_items',
    badge: 'Live Catalog • 86 Stock',
    summary: 'Food items mapped to outlets with pricing, dietary flags, prep duration, and instant out-of-stock toggles.',
    rlsPolicy: 'Publicly readable; only assigned Shop Admin and Staff can toggle availability or edit catalog records.',
    realtime: true,
    fields: [
      { name: 'id', type: 'uuid', isPrimary: true, description: 'Unique menu item identifier' },
      { name: 'outlet_id', type: 'uuid', isForeign: true, description: 'References outlets.id' },
      { name: 'name', type: 'varchar(120)', description: 'Item title (e.g., Paneer Kathi Roll)' },
      { name: 'price', type: 'numeric(10,2)', description: 'Official menu price in INR (verified on server)' },
      { name: 'is_veg', type: 'boolean', description: 'Pure vegetarian dietary classification flag' },
      { name: 'is_available', type: 'boolean', description: "Real-time '86' stock toggle (instant sync)" },
      { name: 'prep_time_minutes', type: 'integer', description: 'Expected kitchen assembly duration' },
      { name: 'category', type: 'varchar(50)', description: "'Snacks' | 'Meals' | 'Beverages' | 'Desserts'" },
    ]
  },
  {
    id: 'profiles',
    name: 'public.profiles',
    badge: 'RBAC • 4 Strict Roles',
    summary: 'Stores user credentials, role permissions, daily loyalty streaks, and referral invite metadata.',
    rlsPolicy: 'Users can read and update their own profile; Super Admin has elevated permission to manage all role assignments.',
    realtime: false,
    fields: [
      { name: 'id', type: 'uuid', isPrimary: true, description: 'References auth.users.id from Supabase Auth' },
      { name: 'email', type: 'varchar(255)', description: 'University or personal email address' },
      { name: 'full_name', type: 'varchar(120)', description: 'User or staff display name' },
      { name: 'role', type: 'user_role_enum', description: "'user' | 'staff' | 'shop_admin' | 'super_admin'" },
      { name: 'outlet_id', type: 'uuid', isForeign: true, description: 'Assigned canteen for staff and shop_admin' },
      { name: 'loyalty_streak', type: 'integer', description: 'Consecutive daily ordering streak count' },
      { name: 'referral_code', type: 'varchar(20)', description: 'Personal invite code for campus referral bonuses' },
    ]
  },
  {
    id: 'wallets',
    name: 'public.wallets & transactions',
    badge: 'PhonePe UPI • Double-Entry',
    summary: 'In-app campus wallet supporting sub-second 1-tap checkout, zero PG wait times, and immutable ledger logging.',
    rlsPolicy: 'Strict isolation: a user can only query their own balance. Transactions are created exclusively by verified server webhooks.',
    realtime: true,
    fields: [
      { name: 'wallet_id', type: 'uuid', isPrimary: true, description: 'Unique user wallet account' },
      { name: 'user_id', type: 'uuid', isForeign: true, description: 'References profiles.id (1:1 relationship)' },
      { name: 'balance', type: 'numeric(10,2)', description: 'Current available balance in INR' },
      { name: 'txn_type', type: 'varchar(20)', description: "'credit' (top-up) | 'debit' (order checkout)" },
      { name: 'reference_order_id', type: 'uuid', isForeign: true, description: 'References orders.id on debits' },
      { name: 'phonepe_transaction_id', type: 'varchar(100)', description: 'Bank transaction ID verified via SHA-256 HMAC' },
    ]
  },
  {
    id: 'features',
    name: 'public.coupons & group_carts',
    badge: 'Discounts • Peer Ordering',
    summary: 'Campus event promo codes, multi-user group ordering rooms, and post-order item review ratings.',
    rlsPolicy: 'Group cart members have collaborative access to shared room codes; coupon validation occurs atomically at checkout.',
    realtime: true,
    fields: [
      { name: 'coupon_code', type: 'varchar(30)', isPrimary: true, description: 'Promo code (e.g. WELCOME50, RIVIERA20)' },
      { name: 'discount_value', type: 'numeric(10,2)', description: 'Flat INR amount or percentage discount' },
      { name: 'group_cart_code', type: 'varchar(10)', description: '6-digit peer room code for shared canteen carts' },
      { name: 'host_student_id', type: 'uuid', isForeign: true, description: 'References profiles.id (room creator)' },
      { name: 'item_ratings', type: 'integer (1-5)', description: 'Verified post-meal user review scores' },
    ]
  }
]

export const DatabaseSchemaArchitecture: React.FC = () => {
  const [activeTableId, setActiveTableId] = useState<string>('orders')
  const activeTable = SCHEMA_TABLES.find(t => t.id === activeTableId) || SCHEMA_TABLES[0]

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 mb-3">
          <Database className="w-3.5 h-3.5" />
          <span>PRODUCTION DATABASE ARCHITECTURE</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Built on Supabase &amp; PostgreSQL
        </h3>
        <p className="text-slate-600 text-sm sm:text-base mt-2">
          Explore the exact PostgreSQL relational tables, Row Level Security (RLS) boundaries, and real-time WebSocket channels powering V Foods.
        </p>
      </div>

      {/* Main Interactive Schema Viewer */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl shadow-slate-200/40">
        {/* Table Selector Tabs */}
        <div className="flex flex-wrap gap-2 pb-6 border-b border-slate-100">
          {SCHEMA_TABLES.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTableId(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTableId === tab.id
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{tab.name.replace('public.', '')}</span>
            </button>
          ))}
        </div>

        {/* Selected Table Detail */}
        <div className="pt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h4 className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900">
                  {activeTable.name}
                </h4>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  {activeTable.badge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                {activeTable.summary}
              </p>
            </div>

            {activeTable.realtime && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start sm:self-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Realtime WebSockets Active</span>
              </div>
            )}
          </div>

          {/* RLS Policy Notice */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-slate-900 block mb-0.5">PostgreSQL Row Level Security (RLS) Policy:</span>
              <p className="text-slate-600 leading-relaxed">{activeTable.rlsPolicy}</p>
            </div>
          </div>

          {/* Schema Fields Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Column Name</th>
                  <th className="px-4 py-3">PostgreSQL Type</th>
                  <th className="px-4 py-3">Key Attribute</th>
                  <th className="px-4 py-3">System Purpose &amp; Logic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {activeTable.fields.map(field => (
                  <tr key={field.name} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      {field.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-orange-600 font-medium">
                      {field.type}
                    </td>
                    <td className="px-4 py-3">
                      {field.isPrimary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[10px]">
                          <Key className="w-3 h-3 text-amber-600" /> PK
                        </span>
                      )}
                      {field.isForeign && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold text-[10px]">
                          FK
                        </span>
                      )}
                      {!field.isPrimary && !field.isForeign && (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 leading-relaxed">
                      {field.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Realtime Dataflow Architecture Strip */}
      <div className="grid sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-900 mb-1">Instant Order Dispatch</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              When an order is created, PostgreSQL fires a CDC replication event over WebSockets to kitchen staff within 120ms.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-900 mb-1">Sub-Second Status Sync</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Staff clicking "Accept" or "Mark Ready" publishes status transitions straight to the user's active order tracking view.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-900 mb-1">Atomic 15-Min Slots</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Database transactions strictly prevent slot over-subscription during peak campus lunch and dinner hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
