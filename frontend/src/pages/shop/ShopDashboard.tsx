import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Store, ChefHat, Users, BarChart2, Tag, Plus, Minus, Edit3, Trash2,
  Clock, CheckCircle2, AlertCircle, X, Search, RefreshCw, QrCode,
  DollarSign, TrendingUp, ShoppingBag, ToggleLeft, ToggleRight,
  ShieldCheck, UserPlus, Phone, Mail, Award, Check, AlertTriangle,
  Layers, Flame, Hash, Calendar, PieChart, Volume2, VolumeX
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'

export type OrderItem = { item_id?: number; name: string; price: number; qty: number; notes?: string }
export type Order = {
  id: number
  outlet_id: string
  token: string | null
  status: 'placed' | 'preparing' | 'ready' | 'collected' | 'cancelled'
  payment_method: string
  total: number
  shop_payout: number
  pickup_slot_id?: string | null
  created_at: string
  order_items?: OrderItem[]
}

export type MenuItem = {
  id: number
  outlet_id: string
  name: string
  price: number
  available: boolean
  is_veg: boolean
  category: string
  available_from: string | null
  available_to: string | null
  stock_qty: number | null
  reserved_qty?: number
}

export type StaffMember = {
  id: string
  full_name: string
  phone: string | null
  role: string
  outlet_id: string | null
  added_by: string | null
  is_active: boolean
  created_at: string
}

export type Invite = {
  id: string
  code: string
  email: string | null
  phone: string | null
  role: string
  outlet_id: string
  invited_by: string
  expires_at: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  created_at: string
}

export type Coupon = {
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

export type OutletAnalytics = {
  total_revenue: number
  total_orders: number
  avg_order_value: number
  best_sellers: { name: string; total_sold: number; revenue: number }[]
  active_staff_count: number
}

interface ShopDashboardProps {
  forcedOutletId?: string
  outletName?: string
  onSignOut?: () => void
}

export const ShopDashboard: React.FC<ShopDashboardProps> = ({
  forcedOutletId,
  outletName,
  onSignOut
}) => {
  const profile = useAuthStore(state => state.profile)
  const effectiveOutletId = forcedOutletId || profile?.outlet_id || 'g1'
  const displayOutletName = outletName || (effectiveOutletId === 'g1' ? 'Gazebo C1 — Snacks & Fast Food' : `Outlet ${effectiveOutletId}`)

  // Top navigation tabs
  const [activeTab, setActiveTab] = useState<'queue' | 'menu' | 'team' | 'analytics' | 'coupons'>('queue')

  // Outlet Status
  const [isOpen, setIsOpen] = useState<boolean>(true)
  const [syncing, setSyncing] = useState<boolean>(false)

  // Orders State (Staff KDS View)
  const [orders, setOrders] = useState<Order[]>([])
  const [queueFilter, setQueueFilter] = useState<'all' | 'placed' | 'preparing' | 'ready'>('all')
  const [searchToken, setSearchToken] = useState<string>('')
  const [showScanModal, setShowScanModal] = useState<boolean>(false)
  const [verifyTokenInput, setVerifyTokenInput] = useState<string>('')
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)

  // Menu State (Catalog CRUD)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [showItemModal, setShowItemModal] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [itemForm, setItemForm] = useState({
    name: '',
    price: 30,
    category: 'snacks',
    is_veg: true,
    available_from: '',
    available_to: '',
    stock_qty: 25
  })

  // Team State
  const [staffTeam, setStaffTeam] = useState<StaffMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([])
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false)
  const [inviteForm, setInviteForm] = useState({ phone: '', email: '' })
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState<boolean>(false)

  // Coupons State
  const [outletCoupons, setOutletCoupons] = useState<Coupon[]>([])
  const [showCouponModal, setShowCouponModal] = useState<boolean>(false)
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'flat' as 'flat' | 'percent',
    discount_value: 20,
    min_order_value: 60,
    max_uses: 200
  })

  // Analytics State
  const [analytics, setAnalytics] = useState<OutletAnalytics>({
    total_revenue: 18450,
    total_orders: 142,
    avg_order_value: 130,
    best_sellers: [
      { name: 'Paneer Roll', total_sold: 48, revenue: 2400 },
      { name: 'Veg Puff', total_sold: 42, revenue: 840 },
      { name: 'Chicken Cutlet', total_sold: 36, revenue: 1260 },
      { name: 'Fresh Lime Juice', total_sold: 30, revenue: 900 }
    ],
    active_staff_count: 3
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DATA REFRESH & REALTIME
  // ─────────────────────────────────────────────────────────────────────────────
  const loadOutletData = useCallback(async () => {
    setSyncing(true)
    try {
      // 1. Outlet Status
      const { data: outletData } = await supabase
        .from('outlets')
        .select('is_open')
        .eq('id', effectiveOutletId)
        .single()
      if (outletData) setIsOpen(outletData.is_open)

      // 2. Orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id, outlet_id, token, status, payment_method, total, shop_payout,
          pickup_slot_id, created_at,
          order_items (item_id, name, price, qty)
        `)
        .eq('outlet_id', effectiveOutletId)
        .order('created_at', { ascending: false })
        .limit(60)

      if (ordersData && ordersData.length > 0) {
        setOrders(ordersData as Order[])
      } else {
        // Fallback demo queue
        setOrders([
          { id: 4021, outlet_id: effectiveOutletId, token: '104', status: 'placed', total: 140, shop_payout: 133, payment_method: 'wallet', created_at: new Date(Date.now() - 4 * 60000).toISOString(), order_items: [{ name: 'Veg Puff', price: 20, qty: 2 }, { name: 'Paneer Roll', price: 50, qty: 2 }] },
          { id: 4019, outlet_id: effectiveOutletId, token: '289', status: 'preparing', total: 105, shop_payout: 100, payment_method: 'wallet', created_at: new Date(Date.now() - 10 * 60000).toISOString(), order_items: [{ name: 'Chicken Cutlet', price: 35, qty: 3 }] },
          { id: 4015, outlet_id: effectiveOutletId, token: '412', status: 'ready', total: 70, shop_payout: 66, payment_method: 'wallet', created_at: new Date(Date.now() - 16 * 60000).toISOString(), order_items: [{ name: 'Tandoori Roti Combo', price: 70, qty: 1 }] }
        ])
      }

      // 3. Menu Items
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('outlet_id', effectiveOutletId)
        .order('name', { ascending: true })

      if (menuData && menuData.length > 0) {
        setMenuItems(menuData as MenuItem[])
      } else {
        setMenuItems([
          { id: 101, outlet_id: effectiveOutletId, name: 'Veg Puff', price: 20, is_veg: true, category: 'snacks', available: true, stock_qty: 35, reserved_qty: 0, available_from: '08:00', available_to: '21:00' },
          { id: 102, outlet_id: effectiveOutletId, name: 'Samosa (2 pcs)', price: 20, is_veg: true, category: 'snacks', available: true, stock_qty: 18, reserved_qty: 0, available_from: '08:00', available_to: '21:00' },
          { id: 103, outlet_id: effectiveOutletId, name: 'Chicken Cutlet', price: 35, is_veg: false, category: 'snacks', available: true, stock_qty: 12, reserved_qty: 0, available_from: '11:00', available_to: '21:00' },
          { id: 104, outlet_id: effectiveOutletId, name: 'Paneer Roll', price: 50, is_veg: true, category: 'snacks', available: true, stock_qty: 8, reserved_qty: 0, available_from: '11:00', available_to: '21:00' },
          { id: 105, outlet_id: effectiveOutletId, name: 'Fresh Lime Juice', price: 30, is_veg: true, category: 'beverages', available: true, stock_qty: 45, reserved_qty: 0, available_from: null, available_to: null }
        ])
      }

      // 4. Staff Team
      const { data: teamData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, role, outlet_id, added_by, is_active, created_at')
        .eq('outlet_id', effectiveOutletId)
        .eq('role', 'staff')

      if (teamData && teamData.length > 0) {
        setStaffTeam(teamData as StaffMember[])
      } else {
        setStaffTeam([
          { id: 'usr-staff-1', full_name: 'Ramesh Kumar', phone: '+91 9876543220', role: 'staff', outlet_id: effectiveOutletId, added_by: profile?.id || null, is_active: true, created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
          { id: 'usr-staff-2', full_name: 'Murugan S', phone: '+91 9876543221', role: 'staff', outlet_id: effectiveOutletId, added_by: profile?.id || null, is_active: true, created_at: new Date(Date.now() - 86400000 * 10).toISOString() }
        ])
      }

      // 5. Invites
      const { data: inviteData } = await supabase
        .from('invites')
        .select('*')
        .eq('outlet_id', effectiveOutletId)
        .eq('status', 'pending')

      if (inviteData && inviteData.length > 0) {
        setPendingInvites(inviteData as Invite[])
      }

      // 6. Outlet Coupons
      const { data: couponData } = await supabase
        .from('coupons')
        .select('*')
        .eq('outlet_id', effectiveOutletId)

      if (couponData && couponData.length > 0) {
        setOutletCoupons(couponData as Coupon[])
      } else {
        setOutletCoupons([
          { code: 'GAZEBO20', discount_type: 'flat', discount_value: 20, min_order_value: 80, max_uses: 200, used_count: 48, outlet_id: effectiveOutletId, valid_to: new Date(Date.now() + 86400000 * 30).toISOString(), active: true }
        ])
      }

      // 7. Outlet Analytics
      const { data: analyticsData, error: anErr } = await supabase.rpc('get_outlet_analytics', {
        p_outlet_id: effectiveOutletId
      })
      if (!anErr && analyticsData) {
        setAnalytics(analyticsData as OutletAnalytics)
      }
    } catch (err) {
      console.warn('Shop admin data load fallback:', err)
    } finally {
      setSyncing(false)
    }
  }, [effectiveOutletId, profile?.id])

  useEffect(() => {
    loadOutletData()
  }, [loadOutletData])

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel(`shop-admin-${effectiveOutletId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${effectiveOutletId}` }, () => {
        loadOutletData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${effectiveOutletId}` }, () => {
        loadOutletData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [effectiveOutletId, loadOutletData])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TOGGLE OUTLET OPERATING HOURS (OPEN/CLOSED)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleToggleOperatingStatus = async () => {
    const nextState = !isOpen
    setIsOpen(nextState)

    try {
      await supabase
        .from('outlets')
        .update({ is_open: nextState })
        .eq('id', effectiveOutletId)
    } catch {
      // Fallback
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. MENU MANAGEMENT (ADD / EDIT / DELETE)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenAddModal = () => {
    setEditingItem(null)
    setItemForm({
      name: '',
      price: 30,
      category: 'snacks',
      is_veg: true,
      available_from: '',
      available_to: '',
      stock_qty: 25
    })
    setShowItemModal(true)
  }

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      price: item.price,
      category: item.category,
      is_veg: item.is_veg,
      available_from: item.available_from || '',
      available_to: item.available_to || '',
      stock_qty: item.stock_qty ?? 20
    })
    setShowItemModal(true)
  }

  const handleSaveMenuItem = async () => {
    if (!itemForm.name.trim() || itemForm.price <= 0) return

    try {
      if (editingItem) {
        // Update
        const updated = {
          name: itemForm.name.trim(),
          price: itemForm.price,
          category: itemForm.category,
          is_veg: itemForm.is_veg,
          available_from: itemForm.available_from || null,
          available_to: itemForm.available_to || null,
          stock_qty: itemForm.stock_qty,
          available: (itemForm.stock_qty ?? 1) > 0
        }

        await supabase.from('menu_items').update(updated).eq('id', editingItem.id)

        setMenuItems(prev => prev.map(m => (m.id === editingItem.id ? { ...m, ...updated } : m)))
      } else {
        // Insert
        const newItem = {
          outlet_id: effectiveOutletId,
          name: itemForm.name.trim(),
          price: itemForm.price,
          category: itemForm.category,
          is_veg: itemForm.is_veg,
          available_from: itemForm.available_from || null,
          available_to: itemForm.available_to || null,
          stock_qty: itemForm.stock_qty,
          reserved_qty: 0,
          available: (itemForm.stock_qty ?? 1) > 0
        }

        const { data, error } = await supabase.from('menu_items').insert(newItem).select().single()
        if (data) {
          setMenuItems(prev => [...prev, data as MenuItem])
        } else {
          setMenuItems(prev => [...prev, { ...newItem, id: Date.now() } as MenuItem])
        }
      }

      setShowItemModal(false)
    } catch {
      setShowItemModal(false)
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to remove this item from your menu?')) return
    setMenuItems(prev => prev.filter(i => i.id !== itemId))
    try {
      await supabase.from('menu_items').delete().eq('id', itemId).eq('outlet_id', effectiveOutletId)
    } catch {
      // Fallback
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TEAM MANAGEMENT & INVITES
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true)
    setGeneratedInviteCode(null)

    try {
      const { data, error } = await supabase.rpc('create_invite', {
        p_role: 'staff',
        p_outlet_id: effectiveOutletId,
        p_email: inviteForm.email.trim() || null,
        p_phone: inviteForm.phone.trim() || null
      })

      if (data && data.code) {
        setGeneratedInviteCode(data.code)
        loadOutletData()
      } else {
        // Fallback local code
        const fallbackCode = 'STF-' + Math.floor(1000 + Math.random() * 9000)
        setGeneratedInviteCode(fallbackCode)
        setPendingInvites(prev => [
          {
            id: `inv-${Date.now()}`,
            code: fallbackCode,
            email: inviteForm.email || null,
            phone: inviteForm.phone || null,
            role: 'staff',
            outlet_id: effectiveOutletId,
            invited_by: profile?.id || 'admin',
            expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
            status: 'pending',
            created_at: new Date().toISOString()
          },
          ...prev
        ])
      }
    } catch {
      const fallbackCode = 'STF-' + Math.floor(1000 + Math.random() * 9000)
      setGeneratedInviteCode(fallbackCode)
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  const handleToggleStaffActive = async (staff: StaffMember) => {
    const nextState = !staff.is_active
    setStaffTeam(prev => prev.map(s => (s.id === staff.id ? { ...s, is_active: nextState } : s)))

    try {
      await supabase.rpc('set_staff_active_status', {
        p_staff_id: staff.id,
        p_is_active: nextState
      })
    } catch {
      await supabase.from('profiles').update({ is_active: nextState }).eq('id', staff.id)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
    try {
      await supabase.rpc('revoke_invite', { p_invite_id: inviteId })
    } catch {
      await supabase.from('invites').update({ status: 'revoked' }).eq('id', inviteId)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. OUTLET-SPECIFIC COUPONS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCreateCoupon = async () => {
    if (!couponForm.code.trim()) return
    const cleanCode = couponForm.code.trim().toUpperCase()

    const newCoupon: Coupon = {
      code: cleanCode,
      discount_type: couponForm.discount_type,
      discount_value: couponForm.discount_value,
      min_order_value: couponForm.min_order_value,
      max_uses: couponForm.max_uses,
      used_count: 0,
      outlet_id: effectiveOutletId,
      valid_to: new Date(Date.now() + 86400000 * 30).toISOString(),
      active: true
    }

    try {
      await supabase.from('coupons').insert(newCoupon)
      setOutletCoupons(prev => [newCoupon, ...prev])
      setShowCouponModal(false)
      setCouponForm({ code: '', discount_type: 'flat', discount_value: 20, min_order_value: 60, max_uses: 200 })
    } catch {
      setOutletCoupons(prev => [newCoupon, ...prev])
      setShowCouponModal(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. KDS STATUS ADVANCE & SCAN-TO-COLLECT
  // ─────────────────────────────────────────────────────────────────────────────
  const advanceOrderStatus = async (orderId: number, currentStatus: string) => {
    let nextStatus: 'preparing' | 'ready' | 'collected'
    if (currentStatus === 'placed') nextStatus = 'preparing'
    else if (currentStatus === 'preparing') nextStatus = 'ready'
    else if (currentStatus === 'ready') {
      const match = orders.find(o => o.id === orderId)
      setVerifyTokenInput(match?.token || '')
      setShowScanModal(true)
      return
    } else return

    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o)))

    try {
      await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId)
    } catch {
      // Fallback
    }
  }

  const handleVerifyCollect = async () => {
    const raw = verifyTokenInput.trim().toUpperCase()
    if (!raw) return
    setIsVerifying(true)
    setVerifyResult(null)

    try {
      const match = orders.find(o => o.token === raw && o.status !== 'collected')
      if (match) {
        await supabase.from('orders').update({ status: 'collected' }).eq('id', match.id)
        setOrders(prev => prev.map(o => (o.id === match.id ? { ...o, status: 'collected' } : o)))
        setVerifyResult({ success: true, message: `✅ Order #${match.id} (Token #${match.token}) collected!` })
        setTimeout(() => {
          setShowScanModal(false)
          setVerifyTokenInput('')
          setVerifyResult(null)
        }, 1200)
      } else {
        setVerifyResult({ success: false, message: `❌ No active order matching Token #${raw}` })
      }
    } catch (err: any) {
      setVerifyResult({ success: false, message: err?.message || 'Verification failed.' })
    } finally {
      setIsVerifying(false)
    }
  }

  const filteredOrders = useMemo(() => {
    let list = orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled')
    if (queueFilter !== 'all') list = list.filter(o => o.status === queueFilter)
    if (searchToken.trim()) {
      const q = searchToken.trim().toUpperCase()
      list = list.filter(o => o.token?.includes(q) || String(o.id).includes(q))
    }
    return list
  }, [orders, queueFilter, searchToken])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-16">
      {/* ── TOP OUTLET MANAGEMENT HEADER ── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg text-white">
                {displayOutletName}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                SHOP ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400">Owner Console · ID: {effectiveOutletId}</p>
          </div>
        </div>

        {/* Operating status toggle & Global actions */}
        <div className="flex items-center gap-2">
          {/* Operating Hours Open/Closed Toggle */}
          <button
            onClick={handleToggleOperatingStatus}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              isOpen
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500 text-rose-300'
            }`}
          >
            {isOpen ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            <span>{isOpen ? 'Outlet Open' : 'Outlet Closed'}</span>
          </button>

          <button
            onClick={loadOutletData}
            disabled={syncing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Refresh outlet data"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-orange-400' : ''}`} />
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

      {/* ── SHOP ADMIN NAVIGATION TABS ── */}
      <div className="px-4 mt-3 flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'queue' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ChefHat className="h-4 w-4" />
          <span>KDS Queue ({orders.filter(o => o.status !== 'collected').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'menu' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Menu Catalog ({menuItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'team' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>My Team ({staffTeam.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'analytics' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          <span>Outlet Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
            activeTab === 'coupons' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>Coupons & Promos ({outletCoupons.length})</span>
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      <main className="flex-1 px-4 mt-4 max-w-6xl w-full mx-auto">
        {/* ── TAB 1: KITCHEN OPERATIONS (KDS QUEUE) ── */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs">
                {['all', 'placed', 'preparing', 'ready'].map((f: any) => (
                  <button
                    key={f}
                    onClick={() => setQueueFilter(f)}
                    className={`px-3 py-1 rounded font-bold capitalize transition-all ${
                      queueFilter === f ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Token # or ID..."
                    value={searchToken}
                    onChange={e => setSearchToken(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-36"
                  />
                </div>
                <button
                  onClick={() => setShowScanModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Scan to Collect</span>
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ChefHat className="h-10 w-10 text-slate-700 mb-2" />
                <p className="font-bold text-slate-300 text-sm">No Active Orders</p>
                <p className="text-xs text-slate-500 mt-1">Orders placed by students will appear in real time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredOrders.map(order => {
                  const isPlaced = order.status === 'placed'
                  const isPrep = order.status === 'preparing'
                  const isReady = order.status === 'ready'

                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between shadow-lg transition-all ${
                        isReady
                          ? 'bg-emerald-950/20 border-emerald-500'
                          : isPrep
                          ? 'bg-amber-950/20 border-amber-500'
                          : 'bg-blue-950/20 border-blue-600'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Token</span>
                            <div className="font-mono font-black text-2xl text-white">#{order.token || '---'}</div>
                            <span className="text-[11px] text-slate-400">Order #{order.id}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isReady ? 'bg-emerald-500 text-slate-950' : isPrep ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-slate-200 border-t border-slate-800/80 pt-2">
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="font-bold">{item.qty}x {item.name}</span>
                              <span className="font-mono text-slate-400">₹{item.price * item.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-800">
                        {isPlaced && (
                          <button
                            onClick={() => advanceOrderStatus(order.id, 'placed')}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                          >
                            Start Cooking (Prep)
                          </button>
                        )}
                        {isPrep && (
                          <button
                            onClick={() => advanceOrderStatus(order.id, 'preparing')}
                            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                          >
                            Mark Ready
                          </button>
                        )}
                        {isReady && (
                          <button
                            onClick={() => advanceOrderStatus(order.id, 'ready')}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                          >
                            Hand Over / Collect
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MENU CATALOG MANAGEMENT (CRUD) ── */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <h2 className="font-bold text-sm text-white">Menu Catalog & Pricing</h2>
                <p className="text-xs text-slate-400">Add, edit pricing, time-window availability, or delete items.</p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Menu Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {menuItems.map(item => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.is_veg ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{item.name}</span>
                        <span className="font-mono font-bold text-xs text-orange-400">₹{item.price}</span>
                        {!item.available && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-400 border border-rose-800 font-bold uppercase">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Category: <span className="capitalize">{item.category}</span> · Stock: {item.stock_qty ?? '∞'}
                        {item.available_from && item.available_to && (
                          <span> · Window: {item.available_from} - {item.available_to}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
                      title="Edit item"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-800 text-xs"
                      title="Delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: MY TEAM (STAFF MANAGEMENT) ── */}
        {activeTab === 'team' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <h2 className="font-bold text-sm text-white">Counter & Kitchen Staff Team</h2>
                <p className="text-xs text-slate-400">Invite new team members, manage account activation, or revoke pending codes.</p>
              </div>
              <button
                onClick={() => {
                  setGeneratedInviteCode(null)
                  setInviteForm({ phone: '', email: '' })
                  setShowInviteModal(true)
                }}
                className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite Staff</span>
              </button>
            </div>

            {/* Pending Invites Section */}
            {pendingInvites.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 space-y-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Pending Staff Invites</span>
                </span>
                <div className="space-y-2">
                  {pendingInvites.map(inv => (
                    <div key={inv.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-amber-400 tracking-wider">{inv.code}</div>
                        <div className="text-[10px] text-slate-400">
                          {inv.phone || inv.email || 'Open invite link'} · Expires: {new Date(inv.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="px-2.5 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[11px] font-bold"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Staff List */}
            <div className="space-y-2">
              {staffTeam.map(member => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                      {member.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{member.full_name}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          member.is_active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {member.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {member.phone || 'No phone'} · Joined: {new Date(member.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStaffActive(member)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      member.is_active
                        ? 'bg-rose-950/60 border-rose-800 text-rose-300 hover:bg-rose-900'
                        : 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                    }`}
                  >
                    {member.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: OUTLET ANALYTICS & METRICS ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            {/* Top Scorecard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-600/40">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Total Outlet Revenue</span>
                <div className="font-mono font-black text-3xl text-white mt-1">
                  ₹{Number(analytics.total_revenue || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Net shop payout from completed orders</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-600/40">
                <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Total Orders</span>
                <div className="font-mono font-black text-3xl text-white mt-1">
                  {analytics.total_orders || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Completed student pre-orders</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-600/40">
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Average Ticket Size</span>
                <div className="font-mono font-black text-3xl text-white mt-1">
                  ₹{analytics.avg_order_value || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Average revenue per transaction</p>
              </div>
            </div>

            {/* Best Sellers Breakdown */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                <Award className="h-4 w-4 text-orange-400" />
                <span>Top Selling Dishes</span>
              </h3>
              <p className="text-xs text-slate-400 mb-3">Highest demand items by quantity sold</p>

              <div className="space-y-2">
                {analytics.best_sellers?.map((dish, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-md bg-orange-600/20 text-orange-400 font-mono font-black flex items-center justify-center text-xs">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-white text-sm">{dish.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400 font-mono">₹{dish.revenue}</span>
                      <div className="text-[10px] text-slate-400">{dish.total_sold} units sold</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: COUPONS & PROMOS (OUTLET SCOPED) ── */}
        {activeTab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <h2 className="font-bold text-sm text-white">Outlet Promo Coupons</h2>
                <p className="text-xs text-slate-400">Create discount promo codes valid exclusively at your canteen counter.</p>
              </div>
              <button
                onClick={() => setShowCouponModal(true)}
                className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Create Coupon</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {outletCoupons.map(cp => (
                <div key={cp.code} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-base text-orange-400 tracking-wider">
                        {cp.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cp.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {cp.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-semibold">
                      {cp.discount_type === 'flat' ? `Flat ₹${cp.discount_value} OFF` : `${cp.discount_value}% OFF`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Min Order: ₹{cp.min_order_value || 0} · Valid until: {new Date(cp.valid_to).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
                    <span>Used {cp.used_count || 0} times</span>
                    <span>Outlet Exclusive</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── ADD/EDIT MENU ITEM MODAL ── */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-extrabold text-base text-white">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Masala Dosa"
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={itemForm.price}
                    onChange={e => setItemForm({ ...itemForm, price: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={itemForm.stock_qty}
                    onChange={e => setItemForm({ ...itemForm, stock_qty: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Category</label>
                  <input
                    type="text"
                    value={itemForm.category}
                    onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Dietary Tag</label>
                  <button
                    onClick={() => setItemForm({ ...itemForm, is_veg: !itemForm.is_veg })}
                    className={`w-full py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      itemForm.is_veg ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-rose-950 border-rose-500 text-rose-300'
                    }`}
                  >
                    <span>{itemForm.is_veg ? '🌱 Vegetarian' : '🍗 Non-Veg'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Available From (Time)</label>
                  <input
                    type="time"
                    value={itemForm.available_from}
                    onChange={e => setItemForm({ ...itemForm, available_from: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Available To (Time)</label>
                  <input
                    type="time"
                    value={itemForm.available_to}
                    onChange={e => setItemForm({ ...itemForm, available_to: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveMenuItem}
                className="w-full mt-2 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs"
              >
                Save Menu Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INVITE STAFF MODAL ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-extrabold text-base text-white">Invite Staff Account</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {generatedInviteCode ? (
              <div className="text-center py-4 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="font-extrabold text-white text-base">Invite Code Generated!</h4>
                <div className="p-3 rounded-xl bg-slate-950 border-2 border-dashed border-emerald-500 font-mono font-black text-2xl text-emerald-400">
                  {generatedInviteCode}
                </div>
                <p className="text-xs text-slate-400">
                  Share this code with your staff. When they accept, their account is automatically provisioned for {displayOutletName}.
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
                  <label className="text-xs font-bold text-slate-400 block mb-1">Staff Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={inviteForm.phone}
                    onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Staff Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="staff@campusbite.vit.ac.in"
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <button
                  onClick={handleGenerateInvite}
                  disabled={isGeneratingInvite}
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5"
                >
                  {isGeneratingInvite ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span>Generate Staff Invite Code</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE OUTLET COUPON MODAL ── */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-extrabold text-base text-white">Create Outlet Coupon</h3>
              <button onClick={() => setShowCouponModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Coupon Promo Code</label>
                <input
                  type="text"
                  placeholder="e.g. GAZEBO25"
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
                onClick={handleCreateCoupon}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs"
              >
                Create Promo Coupon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCAN TO COLLECT MODAL ── */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-extrabold text-base text-white">Scan-to-Collect Order</h3>
              <button onClick={() => setShowScanModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="Enter 3-digit token..."
                value={verifyTokenInput}
                onChange={e => setVerifyTokenInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleVerifyCollect() }}
                className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl text-center font-mono font-bold text-xl text-white"
              />

              {verifyResult && (
                <div className={`p-2.5 rounded-xl text-xs font-bold ${verifyResult.success ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                  {verifyResult.message}
                </div>
              )}

              <button
                onClick={handleVerifyCollect}
                disabled={isVerifying || !verifyTokenInput}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Verify & Hand Over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShopDashboard
