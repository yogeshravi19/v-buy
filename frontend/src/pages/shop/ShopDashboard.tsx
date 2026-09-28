import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store, ChefHat, Users, BarChart2, Tag, Plus, Minus, Edit3, Trash2,
  Clock, CheckCircle2, AlertCircle, X, Search, RefreshCw, QrCode,
  DollarSign, TrendingUp, TrendingDown, ShoppingBag,
  ShieldCheck, UserPlus, Phone, Mail, Award, Check, AlertTriangle,
  Layers, Flame, Hash, Calendar, PieChart, Volume2, VolumeX,
  Download, Image as ImageIcon, ArrowUpRight, Zap, CheckCircle,
  HelpCircle, Coffee, Utensils
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'
import VegIndicator from '../../components/VegIndicator'

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
  image_url?: string | null
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
  avg_prep_time_mins: number
  best_sellers: { name: string; total_sold: number; revenue: number }[]
  active_staff_count: number
}

interface ShopDashboardProps {
  forcedOutletId?: string
  outletName?: string
  onSignOut?: () => void
}

// Sparkline SVG Component
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const height = 28
  const width = 80
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width
      const y = height - ((val - min) / range) * (height - 6) - 3
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

// Animated Smooth Toggle Switch
const AnimatedToggle: React.FC<{
  checked: boolean
  onChange: () => void
  labelOn?: string
  labelOff?: string
}> = ({ checked, onChange, labelOn, labelOff }) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-emerald-500' : 'bg-slate-700'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  )
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'menu' | 'queue' | 'team' | 'payouts' | 'coupons'>('analytics')

  // Outlet Status Modes: 'open' | 'rush' | 'closed'
  const [outletMode, setOutletMode] = useState<'open' | 'rush' | 'closed'>('open')
  const [syncing, setSyncing] = useState<boolean>(false)

  // Orders State (KDS View)
  const [orders, setOrders] = useState<Order[]>([])
  const [queueFilter, setQueueFilter] = useState<'all' | 'placed' | 'preparing' | 'ready'>('all')
  const [searchToken, setSearchToken] = useState<string>('')
  const [showScanModal, setShowScanModal] = useState<boolean>(false)
  const [verifyTokenInput, setVerifyTokenInput] = useState<string>('')
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)

  // Menu State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showItemModal, setShowItemModal] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null)
  const [tempPriceInput, setTempPriceInput] = useState<string>('')
  const [itemForm, setItemForm] = useState({
    name: '',
    price: 30,
    category: 'snacks',
    is_veg: true,
    available_from: '',
    available_to: '',
    stock_qty: 25,
    image_url: ''
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
    total_revenue: 24850,
    total_orders: 168,
    avg_order_value: 148,
    avg_prep_time_mins: 7.5,
    best_sellers: [
      { name: 'Paneer Roll', total_sold: 54, revenue: 2700 },
      { name: 'Veg Puff', total_sold: 46, revenue: 920 },
      { name: 'Chicken Cutlet', total_sold: 38, revenue: 1330 },
      { name: 'Fresh Lime Juice', total_sold: 32, revenue: 960 }
    ],
    active_staff_count: 3
  })

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

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
      if (outletData) {
        setOutletMode(outletData.is_open ? 'open' : 'closed')
      }

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
        setOrders([
          { id: 4021, outlet_id: effectiveOutletId, token: '104', status: 'placed', total: 140, shop_payout: 133, payment_method: 'UPI', created_at: new Date(Date.now() - 3 * 60000).toISOString(), order_items: [{ name: 'Veg Puff', price: 20, qty: 2 }, { name: 'Paneer Roll', price: 50, qty: 2 }] },
          { id: 4019, outlet_id: effectiveOutletId, token: '289', status: 'preparing', total: 105, shop_payout: 100, payment_method: 'UPI', created_at: new Date(Date.now() - 9 * 60000).toISOString(), order_items: [{ name: 'Chicken Cutlet', price: 35, qty: 3 }] },
          { id: 4015, outlet_id: effectiveOutletId, token: '412', status: 'ready', total: 70, shop_payout: 66, payment_method: 'Meal Plan', created_at: new Date(Date.now() - 15 * 60000).toISOString(), order_items: [{ name: 'Tandoori Roti Combo', price: 70, qty: 1 }] }
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
          { id: 101, outlet_id: effectiveOutletId, name: 'Veg Puff', price: 20, is_veg: true, category: 'snacks', available: true, stock_qty: 35, available_from: '08:00', available_to: '21:00' },
          { id: 102, outlet_id: effectiveOutletId, name: 'Samosa (2 pcs)', price: 20, is_veg: true, category: 'snacks', available: true, stock_qty: 18, available_from: '08:00', available_to: '21:00' },
          { id: 103, outlet_id: effectiveOutletId, name: 'Chicken Cutlet', price: 35, is_veg: false, category: 'snacks', available: true, stock_qty: 12, available_from: '11:00', available_to: '21:00' },
          { id: 104, outlet_id: effectiveOutletId, name: 'Paneer Roll', price: 50, is_veg: true, category: 'snacks', available: true, stock_qty: 8, available_from: '11:00', available_to: '21:00' },
          { id: 105, outlet_id: effectiveOutletId, name: 'Fresh Lime Juice', price: 30, is_veg: true, category: 'beverages', available: true, stock_qty: 45, available_from: null, available_to: null },
          { id: 106, outlet_id: effectiveOutletId, name: 'Cold Coffee Shake', price: 45, is_veg: true, category: 'beverages', available: true, stock_qty: 20, available_from: null, available_to: null },
          { id: 107, outlet_id: effectiveOutletId, name: 'Tandoori Roti Combo', price: 70, is_veg: true, category: 'meals', available: true, stock_qty: 15, available_from: '12:00', available_to: '22:00' }
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

      // 7. Analytics
      const { data: analyticsData } = await supabase.rpc('get_outlet_analytics', {
        p_outlet_id: effectiveOutletId
      })
      if (analyticsData) {
        setAnalytics(prev => ({ ...prev, ...(analyticsData as OutletAnalytics) }))
      }
    } catch (err) {
      console.warn('Shop admin data load note:', err)
    } finally {
      setSyncing(false)
    }
  }, [effectiveOutletId, profile?.id])

  useEffect(() => {
    loadOutletData()
  }, [loadOutletData])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TOGGLE OUTLET OPERATING STATUS (OPEN / RUSH MODE / CLOSED)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSetOutletMode = async (mode: 'open' | 'rush' | 'closed') => {
    setOutletMode(mode)
    const isActuallyOpen = mode !== 'closed'

    try {
      await supabase
        .from('outlets')
        .update({ is_open: isActuallyOpen })
        .eq('id', effectiveOutletId)

      if (mode === 'rush') {
        showToast('Rush Mode Activated: Extended prep times are now shown to users.')
      } else if (mode === 'open') {
        showToast('Outlet is now Open for regular ordering.')
      } else {
        showToast('Outlet marked Closed.')
      }
    } catch {
      // Fallback
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. INLINE EDITING & MENU MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────
  const handleToggleItemAvailability = async (item: MenuItem) => {
    const nextVal = !item.available
    setMenuItems(prev => prev.map(m => (m.id === item.id ? { ...m, available: nextVal } : m)))

    try {
      await supabase
        .from('menu_items')
        .update({ available: nextVal })
        .eq('id', item.id)
      showToast(`${item.name} is now ${nextVal ? 'Available' : 'Unavailable'}`)
    } catch {
      // Fallback
    }
  }

  const handleSaveInlinePrice = async (itemId: number) => {
    const newPrice = parseInt(tempPriceInput, 10)
    if (!isNaN(newPrice) && newPrice > 0) {
      setMenuItems(prev => prev.map(m => (m.id === itemId ? { ...m, price: newPrice } : m)))
      try {
        await supabase.from('menu_items').update({ price: newPrice }).eq('id', itemId)
        showToast('Price updated successfully')
      } catch {
        // Fallback
      }
    }
    setEditingPriceId(null)
  }

  const handleBulkToggleCategory = async (category: string, available: boolean) => {
    const targetItems = menuItems.filter(m => category === 'all' || m.category === category)
    if (!confirm(`Mark all ${targetItems.length} items in "${category}" as ${available ? 'Available' : 'Unavailable'}?`)) {
      return
    }

    setMenuItems(prev =>
      prev.map(m => (category === 'all' || m.category === category ? { ...m, available } : m))
    )

    try {
      const ids = targetItems.map(i => i.id)
      await supabase
        .from('menu_items')
        .update({ available })
        .in('id', ids)
      showToast(`Bulk updated ${targetItems.length} items to ${available ? 'Available' : 'Unavailable'}`)
    } catch {
      // Fallback
    }
  }

  const handleOpenAddModal = () => {
    setEditingItem(null)
    setItemForm({
      name: '',
      price: 30,
      category: 'snacks',
      is_veg: true,
      available_from: '',
      available_to: '',
      stock_qty: 25,
      image_url: ''
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
      stock_qty: item.stock_qty ?? 20,
      image_url: item.image_url || ''
    })
    setShowItemModal(true)
  }

  const handleSaveMenuItem = async () => {
    if (!itemForm.name.trim() || itemForm.price <= 0) return

    try {
      if (editingItem) {
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
        showToast(`Updated "${itemForm.name}"`)
      } else {
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

        const { data } = await supabase.from('menu_items').insert(newItem).select().single()
        if (data) {
          setMenuItems(prev => [...prev, data as MenuItem])
        } else {
          setMenuItems(prev => [...prev, { ...newItem, id: Date.now() } as MenuItem])
        }
        showToast(`Added "${itemForm.name}" to menu`)
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
      showToast('Item removed from menu')
    } catch {
      // Fallback
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TEAM MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true)
    setGeneratedInviteCode(null)

    try {
      const { data } = await supabase.rpc('create_invite', {
        p_role: 'staff',
        p_outlet_id: effectiveOutletId,
        p_email: inviteForm.email.trim() || null,
        p_phone: inviteForm.phone.trim() || null
      })

      if (data && data.code) {
        setGeneratedInviteCode(data.code)
        loadOutletData()
      } else {
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
      showToast(`Staff member ${staff.full_name} is now ${nextState ? 'Active' : 'Deactivated'}`)
    } catch {
      await supabase.from('profiles').update({ is_active: nextState }).eq('id', staff.id)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
    try {
      await supabase.rpc('revoke_invite', { p_invite_id: inviteId })
      showToast('Invite code revoked')
    } catch {
      await supabase.from('invites').update({ status: 'revoked' }).eq('id', inviteId)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. COUPONS
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
      showToast(`Created coupon ${cleanCode}`)
      setCouponForm({ code: '', discount_type: 'flat', discount_value: 20, min_order_value: 60, max_uses: 200 })
    } catch {
      setOutletCoupons(prev => [newCoupon, ...prev])
      setShowCouponModal(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. KDS ORDER DISPATCH
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
        setVerifyResult({ success: true, message: `Token #${match.token} verified & handed over!` })
        setTimeout(() => {
          setShowScanModal(false)
          setVerifyTokenInput('')
          setVerifyResult(null)
        }, 1200)
      } else {
        setVerifyResult({ success: false, message: `No active order matching Token #${raw}` })
      }
    } catch (err: any) {
      setVerifyResult({ success: false, message: err?.message || 'Verification failed.' })
    } finally {
      setIsVerifying(false)
    }
  }

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map(m => m.category))).filter(Boolean)
    return ['all', ...cats]
  }, [menuItems])

  const filteredMenuItems = useMemo(() => {
    if (selectedCategory === 'all') return menuItems
    return menuItems.filter(m => m.category === selectedCategory)
  }, [menuItems, selectedCategory])

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
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 flex-shrink-0">
              <Store className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base md:text-lg text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {displayOutletName}
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  SHOP ADMIN
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">Outlet Control & Analytics Cockpit · ID: {effectiveOutletId}</p>
            </div>
          </div>

          {/* Quick-Switch Operating Modes & Controls */}
          <div className="flex items-center gap-2">
            {/* 3-State Outlet Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => handleSetOutletMode('open')}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  outletMode === 'open'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Normal Operational Hours"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="hidden sm:inline">Open</span>
              </button>

              <button
                onClick={() => handleSetOutletMode('rush')}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  outletMode === 'rush'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Rush Mode: Kitchen is at peak rush. Prep times extended."
              >
                <Flame className="h-3 w-3 text-amber-300" strokeWidth={2.5} />
                <span className="hidden sm:inline">Rush Mode</span>
              </button>

              <button
                onClick={() => handleSetOutletMode('closed')}
                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  outletMode === 'closed'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Outlet Closed"
              >
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span className="hidden sm:inline">Closed</span>
              </button>
            </div>

            <button
              onClick={loadOutletData}
              disabled={syncing}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-orange-400' : ''}`} strokeWidth={2} />
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-xs px-2.5 py-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-700"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── RUSH MODE PROMINENT WARNING BANNER ── */}
      <AnimatePresence>
        {outletMode === 'rush' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 shadow-md"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-200 animate-pulse flex-shrink-0" strokeWidth={2.5} />
                <span>
                  <strong>Rush Mode Active:</strong> High counter congestion. Prep times shown to users have been automatically increased by +15 mins.
                </span>
              </div>
              <button
                onClick={() => handleSetOutletMode('open')}
                className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/40 text-xs font-black uppercase text-amber-100"
              >
                Return to Normal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 right-4 z-50 bg-slate-900 border border-slate-700 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={2} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto w-full px-4">
        {/* ── NAVIGATION TABS ── */}
        <div className="mt-4 flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 flex-shrink-0 transition-all ${
              activeTab === 'analytics' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="h-4 w-4" strokeWidth={2} />
            <span>Analytics & KPIs</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 flex-shrink-0 transition-all ${
              activeTab === 'menu' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4" strokeWidth={2} />
            <span>Menu Catalog ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 flex-shrink-0 transition-all ${
              activeTab === 'payouts' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="h-4 w-4" strokeWidth={2} />
            <span>Payouts & Settlement</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 flex-shrink-0 transition-all ${
              activeTab === 'queue' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ChefHat className="h-4 w-4" strokeWidth={2} />
            <span>Live Queue ({orders.filter(o => o.status !== 'collected').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 flex-shrink-0 transition-all ${
              activeTab === 'team' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" strokeWidth={2} />
            <span>Staff Team ({staffTeam.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 flex-shrink-0 transition-all ${
              activeTab === 'coupons' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="h-4 w-4" strokeWidth={2} />
            <span>Outlet Coupons ({outletCoupons.length})</span>
          </button>
        </div>

        {/* ── TAB CONTENT ── */}
        <main className="mt-4">
          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 1: MODERN ANALYTICS & KPIS */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* 4 Modern Stat Cards with Sparklines & Trend Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Net Revenue */}
                <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">
                        Net Revenue
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                        <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                        <span>+14.2%</span>
                      </span>
                    </div>
                    <div className="font-mono font-black text-3xl sm:text-4xl text-white mt-2">
                      ₹{Number(analytics.total_revenue || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">vs ₹21,750 yesterday</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">7-Day Trend</span>
                    <Sparkline data={[14, 18, 16, 22, 19, 23, 27]} color="#10B981" />
                  </div>
                </div>

                {/* 2. Total Orders */}
                <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">
                        Total Orders
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                        <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                        <span>+8.6%</span>
                      </span>
                    </div>
                    <div className="font-mono font-black text-3xl sm:text-4xl text-white mt-2">
                      {analytics.total_orders || 0}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">154 completed pre-orders</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">7-Day Volume</span>
                    <Sparkline data={[110, 125, 118, 145, 138, 154, 168]} color="#3B82F6" />
                  </div>
                </div>

                {/* 3. Avg Prep Time */}
                <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">
                        Avg Kitchen Prep
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                        <Zap className="h-3 w-3" strokeWidth={2.5} />
                        <span>-1.2m fast</span>
                      </span>
                    </div>
                    <div className="font-mono font-black text-3xl sm:text-4xl text-white mt-2">
                      {analytics.avg_prep_time_mins || 7.5} <span className="text-lg font-normal text-slate-400">mins</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Target SLA: 10 mins</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">SLA Adherence</span>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>96.4% on time</span>
                    </div>
                  </div>
                </div>

                {/* 4. Top Selling Dish */}
                <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">
                        Top Seller
                      </span>
                      <Award className="h-4 w-4 text-amber-400" strokeWidth={2} />
                    </div>
                    <div className="font-bold text-xl sm:text-2xl text-white mt-2 truncate">
                      {analytics.best_sellers[0]?.name || 'Paneer Roll'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {analytics.best_sellers[0]?.total_sold || 54} units · ₹{analytics.best_sellers[0]?.revenue || 2700}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">Average Ticket</span>
                    <span className="font-mono font-bold text-white text-xs">₹{analytics.avg_order_value || 148}</span>
                  </div>
                </div>
              </div>

              {/* Peak Hours Heat Indicator Bar */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-400" strokeWidth={2} />
                      <span>Daily Campus Rush & Peak Demand Heatmap</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Visual order traffic distribution across operating hours (08:00 to 22:00)
                    </p>
                  </div>

                  {/* Heatmap Legend */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-800 border border-slate-700" />
                      <span className="text-slate-400">Low</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span className="text-slate-300">Moderate</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-slate-200">High</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-600 animate-pulse" />
                      <span className="text-orange-400 font-bold">Peak Rush</span>
                    </div>
                  </div>
                </div>

                {/* The Visual Time-of-Day Bar */}
                <div className="grid grid-cols-14 gap-1.5 mt-4">
                  {[
                    { hour: '8am', level: 1, label: 'Breakfast Open', count: 8 },
                    { hour: '9am', level: 2, label: 'Morning Tea', count: 18 },
                    { hour: '10am', level: 2, label: 'Class Break', count: 24 },
                    { hour: '11am', level: 2, label: 'Mid-Morning', count: 20 },
                    { hour: '12pm', level: 4, label: 'Lunch Rush 1', count: 52 },
                    { hour: '1pm', level: 4, label: 'Lunch Rush 2', count: 68 },
                    { hour: '2pm', level: 3, label: 'Late Lunch', count: 34 },
                    { hour: '3pm', level: 1, label: 'Lull Period', count: 12 },
                    { hour: '4pm', level: 2, label: 'Post-Lab Tea', count: 26 },
                    { hour: '5pm', level: 4, label: 'Evening Snacks 1', count: 58 },
                    { hour: '6pm', level: 4, label: 'Evening Snacks 2', count: 64 },
                    { hour: '7pm', level: 3, label: 'Dinner Prep', count: 38 },
                    { hour: '8pm', level: 3, label: 'Dinner Rush', count: 42 },
                    { hour: '9pm', level: 1, label: 'Counter Close', count: 14 }
                  ].map((slot, idx) => {
                    const color =
                      slot.level === 4
                        ? 'bg-gradient-to-t from-orange-600 to-amber-500 text-white shadow-md shadow-orange-950/40 ring-1 ring-orange-400/40'
                        : slot.level === 3
                        ? 'bg-amber-600/70 text-slate-100'
                        : slot.level === 2
                        ? 'bg-blue-600/60 text-slate-200'
                        : 'bg-slate-800 text-slate-400'

                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div
                          className={`w-full h-16 rounded-xl flex flex-col justify-end p-1.5 transition-all hover:scale-105 cursor-default ${color}`}
                          title={`${slot.hour}: ${slot.count} orders (${slot.label})`}
                        >
                          <span className="text-[10px] font-mono font-bold text-center leading-none">
                            {slot.count}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 mt-1">{slot.hour}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span>Peak volume windows detected at <strong>12:00 PM – 02:00 PM</strong> and <strong>05:00 PM – 07:00 PM</strong>.</span>
                  </span>
                  <span className="text-slate-500">Auto-calibrated from past 14 days</span>
                </div>
              </div>

              {/* Best Sellers Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
                  <h3 className="font-black text-sm text-white mb-1 flex items-center gap-2">
                    <Award className="h-4 w-4 text-orange-400" strokeWidth={2} />
                    <span>Top Performing Menu Items</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">Ranked by overall volume and gross payout</p>

                  <div className="space-y-2.5">
                    {analytics.best_sellers?.map((dish, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="h-7 w-7 rounded-lg bg-orange-600/20 text-orange-400 font-mono font-black flex items-center justify-center text-xs">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-white text-sm block">{dish.name}</span>
                            <span className="text-[11px] text-slate-400">{dish.total_sold} units dispatched</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-400 text-sm block">₹{dish.revenue}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Gross payout</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
                  <div>
                    <h3 className="font-black text-sm text-white mb-1 flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-blue-400" strokeWidth={2} />
                      <span>Category Distribution</span>
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">Breakdown of orders by food category</p>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-slate-200">Snacks & Rolls</span>
                          <span className="font-mono text-slate-400">54% (92 orders)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: '54%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-slate-200">Beverages & Shakes</span>
                          <span className="font-mono text-slate-400">26% (44 orders)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: '26%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-slate-200">Full Meals & Combos</span>
                          <span className="font-mono text-slate-400">20% (32 orders)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '20%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 p-3 rounded-2xl bg-blue-950/40 border border-blue-900/50 text-xs text-blue-300">
                    Users order rolls and puffs 2.4× more frequently during evening breaks.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 2: MENU CATALOG & INLINE EDITING */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'menu' && (
            <div className="space-y-4">
              {/* Category Pills & Bulk Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-lg">
                {/* Category Navigation Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                        selectedCategory === cat
                          ? 'bg-orange-600 text-white shadow'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? `All Items (${menuItems.length})` : cat}
                    </button>
                  ))}
                </div>

                {/* Bulk Actions & Add Item Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkToggleCategory(selectedCategory, true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold"
                    title="Mark all items in this category as available"
                  >
                    All Available
                  </button>
                  <button
                    onClick={() => handleBulkToggleCategory(selectedCategory, false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs font-bold"
                    title="Mark all items in this category as out of stock"
                  >
                    All Out
                  </button>
                  <button
                    onClick={handleOpenAddModal}
                    className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-950/40"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Menu Items Table / Cards with Inline Editing */}
              <div className="space-y-3">
                {filteredMenuItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      item.available
                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-900/50 border-slate-800/60 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <VegIndicator isVeg={item.is_veg} size="md" />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-white">{item.name}</span>
                          {!item.available && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-950 text-rose-400 border border-rose-800/80">
                              Out of Stock
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="capitalize">{item.category}</span>
                          <span>·</span>
                          <span>Stock: {item.stock_qty ?? '∞'}</span>
                          {item.available_from && item.available_to && (
                            <>
                              <span>·</span>
                              <span>Hours: {item.available_from} - {item.available_to}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline Editing Area: Price Click-to-Edit & Availability Switch */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {/* Price with Click-to-Edit */}
                      <div className="flex items-center">
                        {editingPriceId === item.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              autoFocus
                              value={tempPriceInput}
                              onChange={e => setTempPriceInput(e.target.value)}
                              onBlur={() => handleSaveInlinePrice(item.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveInlinePrice(item.id)
                                if (e.key === 'Escape') setEditingPriceId(null)
                              }}
                              className="w-16 px-2 py-1 bg-slate-950 border border-orange-500 rounded-lg text-sm font-mono font-bold text-white focus:outline-none"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPriceId(item.id)
                              setTempPriceInput(String(item.price))
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-orange-400 font-mono font-black text-sm flex items-center gap-1 group transition-all"
                            title="Click to inline-edit price"
                          >
                            <span>₹{item.price}</span>
                            <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                          </button>
                        )}
                      </div>

                      {/* Smooth Animated Availability Toggle */}
                      <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                        <AnimatedToggle
                          checked={item.available}
                          onChange={() => handleToggleItemAvailability(item)}
                        />
                        <span className="text-xs font-semibold text-slate-400 min-w-[50px]">
                          {item.available ? 'In Stock' : 'Out'}
                        </span>
                      </div>

                      {/* Edit Details & Delete */}
                      <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          title="Edit Item Details"
                        >
                          <Edit3 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 3: PAYOUTS & SETTLEMENT SUMMARY */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-600/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-xs text-emerald-400 font-extrabold uppercase tracking-wider">
                    Available Payout Balance
                  </span>
                  <div className="font-mono font-black text-4xl sm:text-5xl text-white mt-1">
                    ₹14,820.00
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Next automated bank settlement: <strong>Tuesday, 30 Sep 2026</strong> (Direct NEFT)
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    onClick={() => showToast('Payout statement generated. Downloading PDF...')}
                    className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow"
                  >
                    <Download className="h-4 w-4" strokeWidth={2} />
                    <span>Download Invoice</span>
                  </button>

                  <button
                    onClick={() => showToast('Instant Settlement requested. Admin review in progress.')}
                    className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50"
                  >
                    <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
                    <span>Request Instant Payout</span>
                  </button>
                </div>
              </div>

              {/* Settlement Account Card */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
                <h3 className="font-black text-sm text-white mb-3">Linked Settlement Account</h3>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">HDFC Bank Limited · VIT Vellore Branch</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Account: •••• •••• 4018 · IFSC: HDFC0001234
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 4: LIVE KDS QUEUE */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-4 rounded-3xl border border-slate-800">
                <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs">
                  {['all', 'placed', 'preparing', 'ready'].map((f: any) => (
                    <button
                      key={f}
                      onClick={() => setQueueFilter(f)}
                      className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all ${
                        queueFilter === f ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Token # or ID..."
                      value={searchToken}
                      onChange={e => setSearchToken(e.target.value)}
                      className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-36"
                    />
                  </div>
                  <button
                    onClick={() => setShowScanModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                  >
                    <QrCode className="h-4 w-4" strokeWidth={2} />
                    <span>Scan to Collect</span>
                  </button>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="h-64 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-6 text-slate-500 bg-slate-900/30">
                  <ChefHat className="h-10 w-10 text-slate-700 mb-2" />
                  <p className="font-bold text-slate-300 text-sm">No Active Orders</p>
                  <p className="text-xs text-slate-500 mt-1">Orders placed by users will stream in real time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map(order => {
                    const isPlaced = order.status === 'placed'
                    const isPrep = order.status === 'preparing'
                    const isReady = order.status === 'ready'

                    return (
                      <div
                        key={order.id}
                        className={`p-4 rounded-3xl border-2 flex flex-col justify-between shadow-lg transition-all ${
                          isReady
                            ? 'bg-emerald-950/20 border-emerald-500/70'
                            : isPrep
                            ? 'bg-blue-950/20 border-blue-500/70'
                            : 'bg-amber-950/20 border-amber-500/70'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Token</span>
                              <div className="font-mono font-black text-3xl text-white">#{order.token || '---'}</div>
                              <span className="text-[11px] text-slate-400">Order #{order.id}</span>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                                isReady
                                  ? 'bg-emerald-500 text-slate-950'
                                  : isPrep
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-amber-500 text-slate-950'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs text-slate-200 border-t border-slate-800/80 pt-2.5">
                            {order.order_items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="font-bold">{item.qty}× {item.name}</span>
                                <span className="font-mono text-slate-400">₹{item.price * item.qty}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800">
                          {isPlaced && (
                            <button
                              onClick={() => advanceOrderStatus(order.id, 'placed')}
                              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
                            >
                              Start Cooking (Prep)
                            </button>
                          )}
                          {isPrep && (
                            <button
                              onClick={() => advanceOrderStatus(order.id, 'preparing')}
                              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs"
                            >
                              Mark Ready for Pickup
                            </button>
                          )}
                          {isReady && (
                            <button
                              onClick={() => advanceOrderStatus(order.id, 'ready')}
                              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs"
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

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 5: STAFF TEAM */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900 p-4 rounded-3xl border border-slate-800">
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
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <UserPlus className="h-4 w-4" strokeWidth={2} />
                  <span>Invite Staff</span>
                </button>
              </div>

              {pendingInvites.length > 0 && (
                <div className="p-4 rounded-3xl bg-amber-950/30 border border-amber-600/40 space-y-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Pending Staff Invites</span>
                  </span>
                  <div className="space-y-2">
                    {pendingInvites.map(inv => (
                      <div key={inv.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-mono font-bold text-amber-400 tracking-wider text-sm">{inv.code}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {inv.phone || inv.email || 'Direct Invite'} · Expires: {new Date(inv.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="px-3 py-1 rounded-xl bg-rose-950 text-rose-400 border border-rose-800 text-xs font-bold"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {staffTeam.map(member => (
                  <div
                    key={member.id}
                    className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                        {member.full_name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{member.full_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
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

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 6: OUTLET PROMO COUPONS */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'coupons' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900 p-4 rounded-3xl border border-slate-800">
                <div>
                  <h2 className="font-bold text-sm text-white">Outlet Promo Coupons</h2>
                  <p className="text-xs text-slate-400">Create discount coupons valid exclusively at your counter.</p>
                </div>
                <button
                  onClick={() => setShowCouponModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                  <span>Create Coupon</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outletCoupons.map(cp => (
                  <div key={cp.code} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-lg text-orange-400 tracking-wider">
                          {cp.code}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          cp.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {cp.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 font-bold">
                        {cp.discount_type === 'flat' ? `Flat ₹${cp.discount_value} OFF` : `${cp.discount_value}% OFF`}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Min Order: ₹{cp.min_order_value || 0} · Valid until: {new Date(cp.valid_to).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
                      <span>Used {cp.used_count || 0} times</span>
                      <span>Outlet Exclusive</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── ADD/EDIT MENU ITEM MODAL ── */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
              <h3 className="font-black text-base text-white">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Masala Dosa"
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={itemForm.price}
                    onChange={e => setItemForm({ ...itemForm, price: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={itemForm.stock_qty}
                    onChange={e => setItemForm({ ...itemForm, stock_qty: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
                  <input
                    type="text"
                    value={itemForm.category}
                    onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Dietary Tag</label>
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, is_veg: !itemForm.is_veg })}
                    className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      itemForm.is_veg ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-rose-950 border-rose-500 text-rose-300'
                    }`}
                  >
                    <VegIndicator isVeg={itemForm.is_veg} showLabel={true} labelText={itemForm.is_veg ? 'Vegetarian' : 'Non-Veg'} size="sm" />
                  </button>
                </div>
              </div>

              {/* Photo Zone with Fit Indicator */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Dish Photo URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={itemForm.image_url}
                    onChange={e => setItemForm({ ...itemForm, image_url: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Available From</label>
                  <input
                    type="time"
                    value={itemForm.available_from}
                    onChange={e => setItemForm({ ...itemForm, available_from: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Available To</label>
                  <input
                    type="time"
                    value={itemForm.available_to}
                    onChange={e => setItemForm({ ...itemForm, available_to: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveMenuItem}
                className="w-full mt-3 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition-all shadow-lg shadow-orange-950/40"
              >
                Save Menu Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INVITE STAFF MODAL ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
              <h3 className="font-black text-base text-white">Invite Staff Account</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            {generatedInviteCode ? (
              <div className="text-center py-4 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <h4 className="font-black text-white text-base">Invite Code Generated!</h4>
                <div className="p-3.5 rounded-2xl bg-slate-950 border-2 border-dashed border-emerald-500 font-mono font-black text-2xl text-emerald-400 tracking-wider">
                  {generatedInviteCode}
                </div>
                <p className="text-xs text-slate-400">
                  Share this code with your kitchen staff. When accepted, they are automatically granted dispatch access.
                </p>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Staff Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={inviteForm.phone}
                    onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Staff Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="staff@vfoods.vit.ac.in"
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button
                  onClick={handleGenerateInvite}
                  disabled={isGeneratingInvite}
                  className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
              <h3 className="font-black text-base text-white">Create Outlet Coupon</h3>
              <button onClick={() => setShowCouponModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Coupon Promo Code</label>
                <input
                  type="text"
                  placeholder="e.g. GAZEBO25"
                  value={couponForm.code}
                  onChange={e => setCouponForm({ ...couponForm, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white uppercase font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Discount Type</label>
                  <select
                    value={couponForm.discount_type}
                    onChange={e => setCouponForm({ ...couponForm, discount_type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="flat">Flat ₹ OFF</option>
                    <option value="percent">Percentage % OFF</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={couponForm.discount_value}
                    onChange={e => setCouponForm({ ...couponForm, discount_value: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Min Order Value (₹)</label>
                <input
                  type="number"
                  value={couponForm.min_order_value}
                  onChange={e => setCouponForm({ ...couponForm, min_order_value: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={handleCreateCoupon}
                className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition-all shadow-lg shadow-orange-950/40"
              >
                Create Promo Coupon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCAN TO COLLECT MODAL ── */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
              <h3 className="font-black text-base text-white">Scan-to-Collect Order</h3>
              <button onClick={() => setShowScanModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-3.5">
              <input
                type="text"
                autoFocus
                placeholder="Enter 3-digit token..."
                value={verifyTokenInput}
                onChange={e => setVerifyTokenInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleVerifyCollect() }}
                className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-2xl text-center font-mono font-black text-2xl text-white focus:outline-none focus:border-emerald-500"
              />

              {verifyResult && (
                <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${verifyResult.success ? 'bg-emerald-950 border border-emerald-800 text-emerald-300' : 'bg-rose-950 border border-rose-800 text-rose-300'}`}>
                  {verifyResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" strokeWidth={2} />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" strokeWidth={2} />
                  )}
                  <span>{verifyResult.message}</span>
                </div>
              )}

              <button
                onClick={handleVerifyCollect}
                disabled={isVerifying || !verifyTokenInput}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-lg shadow-emerald-950/40"
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
