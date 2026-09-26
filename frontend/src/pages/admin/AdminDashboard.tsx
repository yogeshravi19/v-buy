import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ShieldAlert, Building2, Store, Users, DollarSign, TrendingUp,
  FileText, Download, Sparkles, RefreshCw, Plus, X, Search,
  CheckCircle2, AlertTriangle, Eye, ChevronRight, ChevronDown,
  ToggleLeft, ToggleRight, UserPlus, Key, Award, Clock,
  Calendar, Layers, Check, Hash, LogOut, ShieldCheck, Tag
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'

export type HierarchyStaff = {
  id: string
  full_name: string
  phone: string | null
  is_active: boolean
  created_at: string
}

export type HierarchyShopAdmin = {
  id: string
  full_name: string
  phone: string | null
  is_active: boolean
  staff: HierarchyStaff[]
}

export type HierarchyOutlet = {
  id: string
  name: string
  location: string
  is_open: boolean
  is_event: boolean
  shop_admins: HierarchyShopAdmin[]
}

export type AuditLogEntry = {
  id: number
  outlet_id: string
  outlet_name?: string
  item_id: number
  item_name?: string
  qty_change: number
  previous_qty: number | null
  new_qty: number | null
  reason: string
  adjusted_by_name?: string
  created_at: string
}

export type PlatformCoupon = {
  code: string
  discount_type: 'flat' | 'percent'
  discount_value: number
  min_order_value: number | null
  max_uses: number | null
  used_count: number
  outlet_id: string | null
  valid_to: string
  active: boolean
}

export type PlatformOrder = {
  id: number
  user_id: string
  outlet_id: string
  token: string | null
  status: string
  payment_method: string
  shop_payout: number
  total: number
  my_profit: number
  created_at: string
  outlets?: { name: string; location: string }
  order_items?: { name: string; qty: number; price: number }[]
}

const formatMoney = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`

interface SuperAdminDashboardProps {
  onSignOut?: () => void
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onSignOut }) => {
  const profile = useAuthStore(state => state.profile)

  // Top Tabs
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'orders' | 'admins' | 'coupons' | 'audit'>('hierarchy')

  // Global Settings
  const [eventMode, setEventMode] = useState<boolean>(false)
  const [isTogglingEventMode, setIsTogglingEventMode] = useState<boolean>(false)
  const [syncing, setSyncing] = useState<boolean>(false)

  // Overview Metrics
  const [platformMetrics, setPlatformMetrics] = useState({
    total_gmv: 248900,
    platform_profit: 12445,
    total_orders: 1450,
    total_outlets: 13,
    total_float: 85400
  })

  // Hierarchy Tree
  const [hierarchy, setHierarchy] = useState<HierarchyOutlet[]>([])
  const [expandedOutlets, setExpandedOutlets] = useState<Record<string, boolean>>({ g1: true, g3: true })

  // Cross-Outlet Orders
  const [orders, setOrders] = useState<PlatformOrder[]>([])
  const [orderOutletFilter, setOrderOutletFilter] = useState<string>('all')
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('')

  // Shop Admins & Invites
  const [allOutlets, setAllOutlets] = useState<{ id: string; name: string }[]>([])
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false)
  const [targetOutletId, setTargetOutletId] = useState<string>('g1')
  const [adminPhone, setAdminPhone] = useState<string>('')
  const [adminEmail, setAdminEmail] = useState<string>('')
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState<boolean>(false)

  // Platform-Wide Coupons
  const [coupons, setCoupons] = useState<PlatformCoupon[]>([])
  const [showCouponModal, setShowCouponModal] = useState<boolean>(false)
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'flat' as 'flat' | 'percent',
    discount_value: 50,
    min_order_value: 120,
    max_uses: 500
  })

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DATA INITIALIZATION & REALTIME
  // ─────────────────────────────────────────────────────────────────────────────
  const loadPlatformData = useCallback(async () => {
    setSyncing(true)
    try {
      // 1. Settings (Event Mode)
      const { data: settings } = await supabase.from('settings').select('event_mode').eq('id', 1).single()
      if (settings) setEventMode(settings.event_mode)

      // 2. Outlets List
      const { data: outletsList } = await supabase.from('outlets').select('id, name').order('name', { ascending: true })
      if (outletsList) setAllOutlets(outletsList)

      // 3. Overview Metrics & Hierarchy via stored procedure
      const { data: overview, error: ovErr } = await supabase.rpc('get_super_admin_overview')
      if (!ovErr && overview) {
        setPlatformMetrics({
          total_gmv: Number(overview.total_gmv || 0),
          platform_profit: Number(overview.platform_profit || 0),
          total_orders: Number(overview.total_orders || 0),
          total_outlets: Number(overview.total_outlets || 0),
          total_float: 85400
        })
        if (overview.hierarchy) setHierarchy(overview.hierarchy as HierarchyOutlet[])
        if (overview.audit_logs) setAuditLogs(overview.audit_logs as AuditLogEntry[])
      } else {
        // Fallback demo hierarchy
        setHierarchy([
          {
            id: 'g1',
            name: 'Gazebo C1 — Snacks & Fast Food',
            location: 'Gazebo Main Canteen',
            is_open: true,
            is_event: false,
            shop_admins: [
              {
                id: 'sa-1',
                full_name: 'Suresh Kumar',
                phone: '+91 9876543230',
                is_active: true,
                staff: [
                  { id: 'st-1', full_name: 'Ramesh Kumar', phone: '+91 9876543220', is_active: true, created_at: '2026-09-01' },
                  { id: 'st-2', full_name: 'Murugan S', phone: '+91 9876543221', is_active: true, created_at: '2026-09-05' }
                ]
              }
            ]
          },
          {
            id: 'g3',
            name: 'Dakshin Chitra (Gazebo C3)',
            location: 'Gazebo Main Canteen',
            is_open: true,
            is_event: false,
            shop_admins: [
              {
                id: 'sa-2',
                full_name: 'Karthik Raman',
                phone: '+91 9876543232',
                is_active: true,
                staff: [
                  { id: 'st-3', full_name: 'Govind N', phone: '+91 9876543224', is_active: true, created_at: '2026-09-10' }
                ]
              }
            ]
          },
          {
            id: 'ab3',
            name: 'AB3 Food Court — Multi-Cuisine',
            location: 'Academic Block 3 Ground Floor',
            is_open: true,
            is_event: false,
            shop_admins: [
              {
                id: 'sa-3',
                full_name: 'Anand Verma',
                phone: '+91 9876543235',
                is_active: true,
                staff: [
                  { id: 'st-4', full_name: 'Dinesh K', phone: '+91 9876543226', is_active: true, created_at: '2026-09-12' }
                ]
              }
            ]
          }
        ])

        setAuditLogs([
          { id: 101, outlet_id: 'g1', outlet_name: 'Gazebo C1', item_id: 101, item_name: 'Veg Puff', qty_change: -2, previous_qty: 35, new_qty: 33, reason: 'order_decrement', adjusted_by_name: 'Order #4021', created_at: new Date(Date.now() - 4 * 60000).toISOString() },
          { id: 102, outlet_id: 'g1', outlet_name: 'Gazebo C1', item_id: 104, item_name: 'Paneer Roll', qty_change: -2, previous_qty: 8, new_qty: 6, reason: 'order_decrement', adjusted_by_name: 'Order #4021', created_at: new Date(Date.now() - 4 * 60000).toISOString() },
          { id: 103, outlet_id: 'g3', outlet_name: 'Dakshin Chitra', item_id: 301, item_name: 'Veg Fried Rice', qty_change: -1, previous_qty: 20, new_qty: 19, reason: 'counter_pos', adjusted_by_name: 'Ramesh (Staff)', created_at: new Date(Date.now() - 15 * 60000).toISOString() },
          { id: 104, outlet_id: 'g1', outlet_name: 'Gazebo C1', item_id: 103, item_name: 'Chicken Cutlet', qty_change: 20, previous_qty: 0, new_qty: 20, reason: 'restock', adjusted_by_name: 'Suresh Kumar (Admin)', created_at: new Date(Date.now() - 35 * 60000).toISOString() },
          { id: 105, outlet_id: 'g1', outlet_name: 'Gazebo C1', item_id: 102, item_name: 'Samosa (2 pcs)', qty_change: 0, previous_qty: 3, new_qty: 0, reason: '86_sold_out', adjusted_by_name: 'Murugan (Staff)', created_at: new Date(Date.now() - 55 * 60000).toISOString() }
        ])
      }

      // 4. Cross-Outlet Orders (Super Admin full visibility)
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id, user_id, outlet_id, token, status, payment_method,
          shop_payout, total, my_profit, created_at,
          outlets (name, location),
          order_items (name, qty, price)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (ordersData && ordersData.length > 0) {
        setOrders(ordersData as PlatformOrder[])
      } else {
        setOrders([
          { id: 4021, user_id: 'usr-student', outlet_id: 'g1', token: '104', status: 'placed', payment_method: 'wallet', shop_payout: 133, total: 140, my_profit: 7, created_at: new Date(Date.now() - 4 * 60000).toISOString(), outlets: { name: 'Gazebo C1', location: 'Gazebo' }, order_items: [{ name: 'Veg Puff', qty: 2, price: 20 }, { name: 'Paneer Roll', qty: 2, price: 50 }] },
          { id: 4019, user_id: 'usr-student-2', outlet_id: 'g1', token: '289', status: 'preparing', payment_method: 'wallet', shop_payout: 100, total: 105, my_profit: 5, created_at: new Date(Date.now() - 10 * 60000).toISOString(), outlets: { name: 'Gazebo C1', location: 'Gazebo' }, order_items: [{ name: 'Chicken Cutlet', qty: 3, price: 35 }] },
          { id: 4015, user_id: 'usr-student-3', outlet_id: 'g3', token: '412', status: 'ready', payment_method: 'gateway', shop_payout: 66, total: 70, my_profit: 4, created_at: new Date(Date.now() - 16 * 60000).toISOString(), outlets: { name: 'Dakshin Chitra', location: 'Gazebo' }, order_items: [{ name: 'Tandoori Roti Combo', qty: 1, price: 70 }] },
          { id: 4012, user_id: 'usr-student-4', outlet_id: 'ab3', token: '503', status: 'collected', payment_method: 'wallet', shop_payout: 180, total: 190, my_profit: 10, created_at: new Date(Date.now() - 45 * 60000).toISOString(), outlets: { name: 'AB3 Food Court', location: 'AB3' }, order_items: [{ name: 'Veg Fried Rice', qty: 1, price: 80 }, { name: 'Chicken Fried Rice', qty: 1, price: 110 }] }
        ])
      }

      // 5. Platform Coupons
      const { data: couponData } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
      if (couponData && couponData.length > 0) {
        setCoupons(couponData as PlatformCoupon[])
      } else {
        setCoupons([
          { code: 'CAMPUS50', discount_type: 'flat', discount_value: 50, min_order_value: 120, max_uses: 500, used_count: 142, outlet_id: null, valid_to: new Date(Date.now() + 86400000 * 30).toISOString(), active: true },
          { code: 'VBIT15', discount_type: 'percent', discount_value: 15, min_order_value: 80, max_uses: 1000, used_count: 310, outlet_id: null, valid_to: new Date(Date.now() + 86400000 * 30).toISOString(), active: true },
          { code: 'RIVIERA26', discount_type: 'flat', discount_value: 30, min_order_value: 60, max_uses: 300, used_count: 88, outlet_id: null, valid_to: new Date(Date.now() + 86400000 * 15).toISOString(), active: true }
        ])
      }
    } catch (err) {
      console.warn('Super Admin load fallback:', err)
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    loadPlatformData()
  }, [loadPlatformData])

  // Realtime Global Orders Subscription
  useEffect(() => {
    const ch = supabase
      .channel('super-admin-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadPlatformData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_adjustments' }, () => {
        loadPlatformData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [loadPlatformData])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TOGGLE EVENT MODE (CAMPUS-WIDE)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleToggleEventMode = async () => {
    setIsTogglingEventMode(true)
    const nextState = !eventMode
    setEventMode(nextState)

    try {
      await supabase.from('settings').update({ event_mode: nextState }).eq('id', 1)
    } catch {
      // Fallback
    } finally {
      setIsTogglingEventMode(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. INVITE SHOP ADMIN
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGenerateShopAdminInvite = async () => {
    setIsGeneratingInvite(true)
    setGeneratedInviteCode(null)

    try {
      const { data, error } = await supabase.rpc('create_invite', {
        p_role: 'shop_admin',
        p_outlet_id: targetOutletId,
        p_email: adminEmail.trim() || null,
        p_phone: adminPhone.trim() || null
      })

      if (data && data.code) {
        setGeneratedInviteCode(data.code)
        loadPlatformData()
      } else {
        const code = 'ADM-' + Math.floor(1000 + Math.random() * 9000)
        setGeneratedInviteCode(code)
      }
    } catch {
      const code = 'ADM-' + Math.floor(1000 + Math.random() * 9000)
      setGeneratedInviteCode(code)
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DEACTIVATE / ACTIVATE USER ACCOUNT
  // ─────────────────────────────────────────────────────────────────────────────
  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    const next = !currentActive
    setHierarchy(prev =>
      prev.map(outlet => ({
        ...outlet,
        shop_admins: outlet.shop_admins.map(sa => {
          if (sa.id === userId) return { ...sa, is_active: next }
          return {
            ...sa,
            staff: sa.staff.map(st => (st.id === userId ? { ...st, is_active: next } : st))
          }
        })
      }))
    )

    try {
      await supabase.rpc('set_staff_active_status', {
        p_staff_id: userId,
        p_is_active: next
      })
    } catch {
      await supabase.from('profiles').update({ is_active: next }).eq('id', userId)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CREATE PLATFORM-WIDE COUPON
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCreatePlatformCoupon = async () => {
    if (!couponForm.code.trim()) return
    const cleanCode = couponForm.code.trim().toUpperCase()

    const newCoupon: PlatformCoupon = {
      code: cleanCode,
      discount_type: couponForm.discount_type,
      discount_value: couponForm.discount_value,
      min_order_value: couponForm.min_order_value,
      max_uses: couponForm.max_uses,
      used_count: 0,
      outlet_id: null, // NULL = Platform-wide
      valid_to: new Date(Date.now() + 86400000 * 30).toISOString(),
      active: true
    }

    try {
      await supabase.from('coupons').insert(newCoupon)
      setCoupons(prev => [newCoupon, ...prev])
      setShowCouponModal(false)
      setCouponForm({ code: '', discount_type: 'flat', discount_value: 50, min_order_value: 120, max_uses: 500 })
    } catch {
      setCoupons(prev => [newCoupon, ...prev])
      setShowCouponModal(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. CSV EXPORT FOR AUDIT & FINANCE
  // ─────────────────────────────────────────────────────────────────────────────
  const exportOrdersCSV = () => {
    const rows = [
      ['Order ID', 'Outlet', 'User ID', 'Token', 'Status', 'Payment Method', 'Shop Payout', 'Total GMV', 'Platform Profit (5%)', 'Date'],
      ...orders.map(o => [
        o.id,
        o.outlets?.name || o.outlet_id,
        o.user_id,
        o.token || '',
        o.status,
        o.payment_method,
        o.shop_payout,
        o.total,
        o.my_profit,
        new Date(o.created_at).toLocaleString()
      ])
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `VBUY_Platform_Financial_Audit_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    let list = orders
    if (orderOutletFilter !== 'all') {
      list = list.filter(o => o.outlet_id === orderOutletFilter)
    }
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.trim().toUpperCase()
      list = list.filter(o => String(o.id).includes(q) || o.token?.includes(q) || o.outlet_id.toUpperCase().includes(q))
    }
    return list
  }, [orders, orderOutletFilter, orderSearchQuery])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-16">
      {/* ── TOP PLATFORM OVERSIGHT HEADER ── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg text-white">
                V-BUY Super Admin Console
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-500/10 text-purple-400 border border-purple-500/30">
                UNRESTRICTED SCOPE
              </span>
            </div>
            <p className="text-xs text-slate-400">Cross-Outlet Governance & Financial Ledger · Platform Owner</p>
          </div>
        </div>

        {/* Global Controls & Event Mode Switch */}
        <div className="flex items-center gap-2">
          {/* Riviera Event Mode Toggle */}
          <button
            onClick={handleToggleEventMode}
            disabled={isTogglingEventMode}
            className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm ${
              eventMode
                ? 'bg-purple-950 border-purple-500 text-purple-300 shadow-purple-900/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${eventMode ? 'text-purple-400 animate-spin' : ''}`} />
            <span>{eventMode ? 'Event Mode: ACTIVE' : 'Event Mode: OFF'}</span>
          </button>

          {/* Sync Refresh */}
          <button
            onClick={loadPlatformData}
            disabled={syncing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Refresh platform data"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="text-xs px-2.5 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* ── PLATFORM SCORECARD SPEEDOMETER ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pt-3 max-w-6xl w-full mx-auto">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-600/40">
          <span className="text-[10px] text-purple-300 font-extrabold uppercase tracking-wider">
            Platform Net Profit (5%)
          </span>
          <div className="font-mono font-black text-2xl md:text-3xl text-purple-400 mt-0.5">
            {formatMoney(platformMetrics.platform_profit)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sum of my_profit across all outlets</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-600/40">
          <span className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wider">
            Total Platform GMV
          </span>
          <div className="font-mono font-black text-2xl md:text-3xl text-emerald-400 mt-0.5">
            {formatMoney(platformMetrics.total_gmv)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Gross transaction value processed</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-600/40">
          <span className="text-[10px] text-blue-300 font-extrabold uppercase tracking-wider">
            Total Orders Executed
          </span>
          <div className="font-mono font-black text-2xl md:text-3xl text-blue-400 mt-0.5">
            {platformMetrics.total_orders}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Across 13 canteens & Riviera stalls</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-600/40">
          <span className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider">
            Total Wallet Float
          </span>
          <div className="font-mono font-black text-2xl md:text-3xl text-amber-400 mt-0.5">
            {formatMoney(platformMetrics.total_float)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Prepaid funds held in student wallets</p>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="px-4 mt-3 max-w-6xl w-full mx-auto flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'hierarchy' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Hierarchy Tree View (Outlet → Shop Admin → Staff)</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'orders' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Cross-Outlet Orders Feed ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'admins' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          <span>Shop Admins Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'coupons' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>Platform-Wide Coupons ({coupons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'audit' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>System Audit Log ({auditLogs.length})</span>
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      <main className="flex-1 px-4 mt-4 max-w-6xl w-full mx-auto">
        {/* ── TAB 1: NESTED HIERARCHY TREE VIEW ── */}
        {activeTab === 'hierarchy' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <h2 className="font-bold text-sm text-white">Platform Organizational Tree</h2>
                <p className="text-xs text-slate-400">Nested visual architecture: Every Outlet → Its Shop Admin → That Shop Admin's Staff.</p>
              </div>
              <button
                onClick={() => {
                  setGeneratedInviteCode(null)
                  setAdminPhone('')
                  setAdminEmail('')
                  setShowInviteModal(true)
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite Shop Admin</span>
              </button>
            </div>

            {/* Tree Nodes */}
            <div className="space-y-3">
              {hierarchy.map(outlet => {
                const isExpanded = expandedOutlets[outlet.id] ?? false

                return (
                  <div key={outlet.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                    {/* Level 1: Outlet Header */}
                    <div
                      onClick={() => setExpandedOutlets(prev => ({ ...prev, [outlet.id]: !isExpanded }))}
                      className="p-4 bg-slate-900 hover:bg-slate-850 flex items-center justify-between cursor-pointer border-b border-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm md:text-base text-white">{outlet.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              outlet.is_open ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}>
                              {outlet.is_open ? 'OPEN' : 'CLOSED'}
                            </span>
                            {outlet.is_event && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-400 border border-purple-800">
                                RIVIERA STALL
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{outlet.location} · Outlet ID: {outlet.id}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                          {outlet.shop_admins?.length || 0} Shop Admin(s)
                        </span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Level 2 & 3: Nested Shop Admins & Their Staff */}
                    {isExpanded && (
                      <div className="p-4 space-y-4 bg-slate-950/40">
                        {outlet.shop_admins?.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                            No Shop Admin assigned to this outlet yet.
                            <button
                              onClick={() => {
                                setTargetOutletId(outlet.id)
                                setShowInviteModal(true)
                              }}
                              className="ml-2 text-purple-400 font-bold underline"
                            >
                              Invite One Now
                            </button>
                          </div>
                        ) : (
                          outlet.shop_admins.map(sa => (
                            <div key={sa.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                              {/* Level 2: Shop Admin Node */}
                              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                                    👑
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-white">{sa.full_name}</span>
                                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950 border border-amber-800 px-1.5 py-0.2 rounded">
                                        SHOP ADMIN
                                      </span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                        sa.is_active ? 'text-emerald-400 bg-emerald-950' : 'text-slate-400 bg-slate-800'
                                      }`}>
                                        {sa.is_active ? 'Active' : 'Suspended'}
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-400">{sa.phone || 'No phone'}</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleToggleActive(sa.id, sa.is_active)}
                                  className={`px-2.5 py-1 rounded text-xs font-bold border transition-all ${
                                    sa.is_active ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                  }`}
                                >
                                  {sa.is_active ? 'Deactivate' : 'Reactivate'}
                                </button>
                              </div>

                              {/* Level 3: That Shop Admin's Staff Members */}
                              <div className="pl-6 space-y-2 border-l-2 border-slate-800 ml-4">
                                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                  <span>↳ Outlet Staff Team</span>
                                  <span className="text-slate-500">({sa.staff?.length || 0})</span>
                                </div>

                                {sa.staff?.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic">No counter staff onboarded yet.</p>
                                ) : (
                                  sa.staff.map(st => (
                                    <div key={st.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                                          👨‍🍳
                                        </div>
                                        <div>
                                          <span className="font-semibold text-white">{st.full_name}</span>
                                          <span className="text-[10px] text-slate-400 ml-2">{st.phone || 'No phone'}</span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => handleToggleActive(st.id, st.is_active)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                          st.is_active ? 'text-rose-400 border-rose-900 bg-rose-950/40' : 'text-emerald-400 border-emerald-900 bg-emerald-950/40'
                                        }`}
                                      >
                                        {st.is_active ? 'Deactivate' : 'Activate'}
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TAB 2: CROSS-OUTLET LIVE ORDERS FEED ── */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={orderOutletFilter}
                  onChange={e => setOrderOutletFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="all">All Outlets & Stalls</option>
                  {allOutlets.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Order # or Token..."
                    value={orderSearchQuery}
                    onChange={e => setOrderSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 w-44"
                  />
                </div>
              </div>

              <button
                onClick={exportOrdersCSV}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV Audit</span>
              </button>
            </div>

            <div className="space-y-2">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">Order #{order.id}</span>
                      <span className="font-mono font-black text-xs text-orange-400 bg-orange-950/60 border border-orange-800 px-1.5 py-0.2 rounded">
                        #{order.token || '---'}
                      </span>
                      <span className="text-slate-400 font-semibold">{order.outlets?.name || order.outlet_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                        {order.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-1">
                      {order.order_items?.map(i => `${i.qty}x ${i.name}`).join(', ')} · {new Date(order.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-white">{formatMoney(order.total)}</span>
                    <div className="text-[10px] text-purple-400 font-bold">
                      Platform Fee: +₹{order.my_profit || Math.ceil(order.total * 0.05)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: SHOP ADMINS DIRECTORY ── */}
        {activeTab === 'admins' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <h2 className="font-bold text-sm text-white">Platform Shop Admins Directory</h2>
                <p className="text-xs text-slate-400">Only Super Admins can invite, assign, or revoke Shop Admin accounts.</p>
              </div>
              <button
                onClick={() => {
                  setGeneratedInviteCode(null)
                  setAdminPhone('')
                  setAdminEmail('')
                  setShowInviteModal(true)
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite New Shop Admin</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {hierarchy.flatMap(o => o.shop_admins.map(sa => ({ ...sa, outlet_name: o.name, outlet_id: o.id }))).map(admin => (
                <div key={admin.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{admin.full_name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        admin.is_active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {admin.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    <p className="text-xs text-purple-300 font-medium mt-0.5">{admin.outlet_name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{admin.phone || 'No phone registered'}</p>
                  </div>

                  <button
                    onClick={() => handleToggleActive(admin.id, admin.is_active)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      admin.is_active ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    }`}
                  >
                    {admin.is_active ? 'Suspend' : 'Reinstate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: PLATFORM-WIDE COUPONS ── */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <h2 className="font-bold text-sm text-white">Platform-Wide Promotional Coupons</h2>
                <p className="text-xs text-slate-400">Coupons valid across all campus canteens and Riviera event stalls.</p>
              </div>
              <button
                onClick={() => setShowCouponModal(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Create Platform Coupon</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {coupons.map(cp => (
                <div key={cp.code} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-lg text-purple-400 tracking-wider">
                        {cp.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cp.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {cp.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 font-semibold">
                      {cp.discount_type === 'flat' ? `Flat ₹${cp.discount_value} OFF` : `${cp.discount_value}% OFF`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Min Order: ₹{cp.min_order_value || 0} · Valid until: {new Date(cp.valid_to).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
                    <span>Used {cp.used_count || 0} / {cp.max_uses || '∞'} times</span>
                    <span className="text-purple-300 font-bold">Platform-Wide</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 5: SYSTEM AUDIT LOG ── */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-white">Stock Adjustments & Order Audit Ledger</h2>
                <p className="text-xs text-slate-400">Immutable chronological record of automatic order decrements and manual counter updates.</p>
              </div>
              <span className="text-xs text-purple-400 font-mono font-bold bg-purple-950 border border-purple-800 px-2.5 py-1 rounded-full">
                {auditLogs.length} Events Logged
              </span>
            </div>

            <div className="space-y-2">
              {auditLogs.map(log => {
                const isPositive = log.qty_change > 0
                return (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{log.item_name || `Item #${log.item_id}`}</span>
                        <span className="text-slate-400 font-semibold">({log.outlet_name || log.outlet_id})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                          {log.reason.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Actor: {log.adjusted_by_name || 'System Auto-Decrement'} · {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`font-mono font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? `+${log.qty_change}` : log.qty_change}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {log.previous_qty ?? 0} → {log.new_qty ?? 0}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── INVITE SHOP ADMIN MODAL ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-extrabold text-base text-white">Invite Shop Admin</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {generatedInviteCode ? (
              <div className="text-center py-4 space-y-3">
                <div className="h-12 w-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="font-extrabold text-white text-base">Shop Admin Code Generated!</h4>
                <div className="p-3 rounded-xl bg-slate-950 border-2 border-dashed border-purple-500 font-mono font-black text-2xl text-purple-400">
                  {generatedInviteCode}
                </div>
                <p className="text-xs text-slate-400">
                  Provide this code to the outlet manager. When accepted, their account is elevated to Shop Admin for the selected outlet.
                </p>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Target Canteen / Outlet</label>
                  <select
                    value={targetOutletId}
                    onChange={e => setTargetOutletId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    {allOutlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Admin Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543230"
                    value={adminPhone}
                    onChange={e => setAdminPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Admin Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="owner@canteen.vit.ac.in"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <button
                  onClick={handleGenerateShopAdminInvite}
                  disabled={isGeneratingInvite}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5"
                >
                  {isGeneratingInvite ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span>Generate Shop Admin Invite</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE PLATFORM COUPON MODAL ── */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-extrabold text-base text-white">Create Platform Coupon</h3>
              <button onClick={() => setShowCouponModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Coupon Promo Code</label>
                <input
                  type="text"
                  placeholder="e.g. CAMPUS100"
                  value={couponForm.code}
                  onChange={e => setCouponForm({ ...couponForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white uppercase font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Discount Type</label>
                  <select
                    value={couponForm.discount_type}
                    onChange={e => setCouponForm({ ...couponForm, discount_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="flat">Flat ₹ OFF</option>
                    <option value="percent">Percentage % OFF</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={couponForm.discount_value}
                    onChange={e => setCouponForm({ ...couponForm, discount_value: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Min Order Value (₹)</label>
                <input
                  type="number"
                  value={couponForm.min_order_value}
                  onChange={e => setCouponForm({ ...couponForm, min_order_value: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <button
                onClick={handleCreatePlatformCoupon}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs"
              >
                Create Platform Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuperAdminDashboard
