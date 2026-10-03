import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  LayoutDashboard,
  Clock,
  ChefHat,
  Boxes,
  BellRing,
  Calculator,
  ReceiptText,
  Search,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  LogOut,
  Store,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Filter,
  CreditCard,
  Banknote,
  QrCode,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Printer,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

export interface OrderItem {
  item_id?: number
  name: string
  price: number
  qty: number
  notes?: string
}

export interface Order {
  id: number
  user_id?: string
  customer_name?: string
  outlet_id: string
  token: string | null
  status: 'placed' | 'preparing' | 'ready' | 'collected' | 'cancelled'
  payment_method?: string
  payment_status?: string
  total: number
  shop_payout?: number
  pickup_slot_id?: string | null
  created_at: string
  updated_at?: string
  order_items?: OrderItem[]
  pickup_slot_label?: string
}

export interface MenuItem {
  id: number
  outlet_id: string
  name: string
  price: number
  available: boolean
  is_veg: boolean
  category: string
  stock_qty: number | null
  image_url?: string
}

interface ShopStaffDashboardProps {
  currentUser: any
  setCurrentUser?: (u: any) => void
  outlets?: any[]
  orders?: Order[]
  setOrders?: React.Dispatch<React.SetStateAction<any[]>>
  advanceOrderStatus?: (orderId: number) => void
  addAuditLog?: (actor: string, role: string, entity: string, action: string, details: string) => void
  handleSignOut?: () => void
  money?: (amount: number) => string
  forcedOutletId?: string
}

function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12) // A5
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.24) // D6
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // Ignore audio restrictions
  }
}

function formatElapsed(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

export const ShopStaffDashboard: React.FC<ShopStaffDashboardProps> = ({
  currentUser,
  outlets = [],
  orders: globalOrders = [],
  setOrders: setGlobalOrders,
  advanceOrderStatus,
  addAuditLog,
  handleSignOut,
  money = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  forcedOutletId
}) => {
  // Active Sidebar Nav Tab (Staff's 7 mandatory sections)
  type StaffTab = 'overview' | 'live-orders' | 'kds' | 'stock' | 'pickup-queue' | 'pos' | 'shift-billing'
  const [activeTab, setActiveTab] = useState<StaffTab>('overview')

  // Outlet context
  const activeOutletId = forcedOutletId || currentUser?.outlet_id || 'g1'
  const currentOutlet = outlets.find(o => o.id === activeOutletId) || {
    id: activeOutletId,
    name: currentUser?.outlet_name || 'Gazebo C1 — Snacks & Fast Food',
    location: 'Gazebo (Main Canteen)',
    is_open: true
  }

  // Local state
  const [localOrders, setLocalOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [orderFilter, setOrderFilter] = useState<'all' | 'placed' | 'preparing' | 'ready'>('all')
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all')
  const [syncing, setSyncing] = useState(false)
  const [bannerNotice, setBannerNotice] = useState<string | null>(null)

  // Figma-inspired Kitchen Rush Management & Ticket Accordion
  const [delayBuffers, setDelayBuffers] = useState<Record<number, number>>({})
  const [collapsedTickets, setCollapsedTickets] = useState<Record<number, boolean>>({})

  const handleApplyDelayBuffer = (orderId: number, minutes: number) => {
    setDelayBuffers(prev => {
      const next = (prev[orderId] === minutes) ? 0 : minutes
      return { ...prev, [orderId]: next }
    })
    setBannerNotice(`Updated prep buffer for ticket #${orderId} (+${minutes}m rush buffer)`)
    setTimeout(() => setBannerNotice(null), 3500)
  }

  const toggleTicketCollapse = (orderId: number) => {
    setCollapsedTickets(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  // Pickup Verification Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [verifyStatus, setVerifyStatus] = useState<{ success?: boolean; message?: string } | null>(null)

  // POS State
  const [posCart, setPosCart] = useState<{ [itemId: number]: number }>({})
  const [posCustomerName, setPosCustomerName] = useState('')
  const [posPaymentMode, setPosPaymentMode] = useState<'upi' | 'cash' | 'wallet'>('upi')
  const [posSuccessNotice, setPosSuccessNotice] = useState<string | null>(null)

  // Add Item Modal
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    price: 30,
    category: 'snacks',
    is_veg: true,
    stock_qty: 30
  })

  // Audio trigger ref
  const prevPlacedCountRef = useRef(0)

  // Shift Billing state
  const [shiftStartTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

  // Load and subscribe to orders
  const loadData = useCallback(async () => {
    setSyncing(true)
    try {
      // 1. Fetch Orders for this outlet
      const { data: ords, error: ordErr } = await supabase
        .from('orders')
        .select(`
          id, user_id, outlet_id, token, status, payment_method, total, shop_payout,
          created_at, updated_at,
          order_items (item_id, name, price, qty)
        `)
        .eq('outlet_id', activeOutletId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (ordErr) throw ordErr

      if (ords && ords.length > 0) {
        const formatted: Order[] = ords.map((o: any) => ({
          id: o.id,
          user_id: o.user_id,
          customer_name: `Customer #${o.id % 900 + 100}`,
          outlet_id: o.outlet_id,
          token: o.token || String(o.id % 900 + 100),
          status: o.status || 'placed',
          payment_method: o.payment_method || 'Online UPI',
          payment_status: 'paid',
          total: o.total || 0,
          created_at: o.created_at,
          order_items: o.order_items || []
        }))
        setLocalOrders(formatted)

        // Audio chime on new placed orders
        const placedCount = formatted.filter(o => o.status === 'placed').length
        if (placedCount > prevPlacedCountRef.current && prevPlacedCountRef.current !== 0) {
          if (soundEnabled) playNotificationChime()
          setBannerNotice('New order received')
          setTimeout(() => setBannerNotice(null), 4000)
        }
        prevPlacedCountRef.current = placedCount
      } else {
        // Fallback demo orders for Gazebo counter
        setLocalOrders([
          {
            id: 8011,
            outlet_id: activeOutletId,
            token: '104',
            status: 'placed',
            payment_method: 'UPI Online',
            total: 140,
            created_at: new Date(Date.now() - 3 * 60000).toISOString(),
            order_items: [
              { name: 'Veg Puff', price: 20, qty: 2 },
              { name: 'Paneer Roll', price: 50, qty: 2, notes: 'Extra crispy' }
            ]
          },
          {
            id: 8009,
            outlet_id: activeOutletId,
            token: '289',
            status: 'preparing',
            payment_method: 'Meal Plan Card',
            total: 105,
            created_at: new Date(Date.now() - 8 * 60000).toISOString(),
            order_items: [
              { name: 'Chicken Cutlet', price: 35, qty: 3 }
            ]
          },
          {
            id: 8005,
            outlet_id: activeOutletId,
            token: '312',
            status: 'ready',
            payment_method: 'UPI Online',
            total: 60,
            created_at: new Date(Date.now() - 14 * 60000).toISOString(),
            order_items: [
              { name: 'Samosa (2 pcs)', price: 20, qty: 2 },
              { name: 'Veg Puff', price: 20, qty: 1 }
            ]
          }
        ])
      }

      // 2. Fetch Menu Items for this outlet
      const { data: mData, error: mErr } = await supabase
        .from('menu_items')
        .select('id, outlet_id, name, price, available, is_veg, category, stock_qty')
        .eq('outlet_id', activeOutletId)
        .order('name', { ascending: true })

      if (!mErr && mData && mData.length > 0) {
        setMenuItems(mData as MenuItem[])
      } else {
        // Fallback demo items
        setMenuItems([
          { id: 101, outlet_id: activeOutletId, name: 'Veg Puff', price: 20, is_veg: true, category: 'snacks', available: true, stock_qty: 45 },
          { id: 102, outlet_id: activeOutletId, name: 'Samosa (2 pcs)', price: 20, is_veg: true, category: 'snacks', available: true, stock_qty: 30 },
          { id: 103, outlet_id: activeOutletId, name: 'Chicken Cutlet', price: 35, is_veg: false, category: 'snacks', available: true, stock_qty: 18 },
          { id: 104, outlet_id: activeOutletId, name: 'Paneer Roll', price: 50, is_veg: true, category: 'snacks', available: true, stock_qty: 12 },
          { id: 105, outlet_id: activeOutletId, name: 'Fresh Lime Juice', price: 30, is_veg: true, category: 'beverages', available: true, stock_qty: 50 },
          { id: 106, outlet_id: activeOutletId, name: 'Cold Coffee', price: 40, is_veg: true, category: 'beverages', available: true, stock_qty: 24 }
        ])
      }
    } catch (e) {
      console.warn('Staff dashboard fetch warning:', e)
    } finally {
      setSyncing(false)
    }
  }, [activeOutletId, soundEnabled])

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 20000)
    return () => clearInterval(timer)
  }, [loadData])

  // Advance Order Status Helper
  const handleAdvanceStatus = async (orderId: number, currentStatus: string) => {
    const nextMap: Record<string, 'preparing' | 'ready' | 'collected'> = {
      placed: 'preparing',
      preparing: 'ready',
      ready: 'collected'
    }
    const nextStatus = nextMap[currentStatus]
    if (!nextStatus) return

    setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
    if (setGlobalOrders) {
      setGlobalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
    }

    try {
      await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId)
      if (addAuditLog) {
        addAuditLog(currentUser?.full_name || 'Shop Staff', 'staff', 'ORDER', 'STATUS_ADVANCE', `Order #${orderId} moved to ${nextStatus}`)
      }
    } catch (err) {
      console.error('Error updating order:', err)
    }
  }

  // Stock Adjustment (+1 / -1 / Availability)
  const handleUpdateStock = async (itemId: number, delta: number) => {
    setMenuItems(prev =>
      prev.map(i => {
        if (i.id !== itemId) return i
        const cur = i.stock_qty ?? 10
        const updated = Math.max(0, cur + delta)
        return { ...i, stock_qty: updated, available: updated > 0 }
      })
    )

    const item = menuItems.find(i => i.id === itemId)
    const newQty = Math.max(0, (item?.stock_qty ?? 10) + delta)
    try {
      await supabase
        .from('menu_items')
        .update({ stock_qty: newQty, available: newQty > 0 })
        .eq('id', itemId)
    } catch (e) {
      console.error('Stock update failed:', e)
    }
  }

  const handleToggleItemAvailability = async (itemId: number, current: boolean) => {
    const next = !current
    setMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, available: next } : i))
    try {
      await supabase.from('menu_items').update({ available: next }).eq('id', itemId)
    } catch (e) {
      console.error('Availability toggle failed:', e)
    }
  }

  // Add Item to Menu
  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemForm.name) return

    const newItem: MenuItem = {
      id: Date.now(),
      outlet_id: activeOutletId,
      name: newItemForm.name,
      price: Number(newItemForm.price),
      category: newItemForm.category,
      is_veg: newItemForm.is_veg,
      stock_qty: Number(newItemForm.stock_qty),
      available: true
    }

    setMenuItems(prev => [newItem, ...prev])
    setShowAddItemModal(false)

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          outlet_id: activeOutletId,
          name: newItemForm.name,
          price: Number(newItemForm.price),
          category: newItemForm.category,
          is_veg: newItemForm.is_veg,
          stock_qty: Number(newItemForm.stock_qty),
          available: true
        })
        .select()
        .single()

      if (!error && data) {
        setMenuItems(prev => prev.map(i => i.id === newItem.id ? (data as MenuItem) : i))
      }
      setBannerNotice(`Added "${newItemForm.name}" to menu successfully`)
      setTimeout(() => setBannerNotice(null), 3000)
    } catch (err) {
      console.error('Error inserting item:', err)
    }
  }

  // Token Verification
  const handleVerifyPickup = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanToken = tokenInput.trim().toUpperCase()
    if (!cleanToken) return

    const match = localOrders.find(
      o => (o.token === cleanToken || String(o.id) === cleanToken) && o.status !== 'collected'
    )

    if (match) {
      setVerifyStatus({ success: true, message: `Token #${match.token} Verified! Order Ready for Handover.` })
      await handleAdvanceStatus(match.id, 'ready')
      setTimeout(() => {
        handleAdvanceStatus(match.id, 'ready') // Marks collected
        setVerifyStatus(null)
        setTokenInput('')
        setShowVerifyModal(false)
      }, 1400)
    } else {
      setVerifyStatus({ success: false, message: `No active order found for token #${cleanToken}` })
    }
  }

  // POS Punch Order
  const handlePunchPosOrder = async () => {
    const itemIds = Object.keys(posCart).map(Number)
    if (itemIds.length === 0) return

    const itemsToOrder: OrderItem[] = itemIds.map(id => {
      const item = menuItems.find(m => m.id === id)
      return {
        item_id: id,
        name: item?.name || 'Counter Item',
        price: item?.price || 0,
        qty: posCart[id]
      }
    })

    const total = itemsToOrder.reduce((sum, i) => sum + i.price * i.qty, 0)
    const token = String(Math.floor(100 + Math.random() * 900))

    const newOrder: Order = {
      id: Date.now(),
      outlet_id: activeOutletId,
      customer_name: posCustomerName.trim() || 'Walk-in Counter',
      token,
      status: 'placed',
      payment_method: `POS (${posPaymentMode.toUpperCase()})`,
      total,
      created_at: new Date().toISOString(),
      order_items: itemsToOrder
    }

    setLocalOrders(prev => [newOrder, ...prev])
    setPosCart({})
    setPosCustomerName('')
    setPosSuccessNotice(`Order punched! Token #${token} generated.`)
    setTimeout(() => setPosSuccessNotice(null), 4000)

    try {
      await supabase.from('orders').insert({
        outlet_id: activeOutletId,
        token,
        status: 'placed',
        payment_method: `pos_${posPaymentMode}`,
        total
      })
    } catch (e) {
      console.warn('POS order insert fallback:', e)
    }
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return localOrders.filter(o => {
      if (orderFilter !== 'all' && o.status !== orderFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchToken = (o.token || '').toLowerCase().includes(q)
        const matchCust = (o.customer_name || '').toLowerCase().includes(q)
        const matchItem = (o.order_items || []).some(i => i.name.toLowerCase().includes(q))
        return matchToken || matchCust || matchItem
      }
      return true
    })
  }, [localOrders, orderFilter, searchQuery])

  // Calculated Shift Stats
  const activeOrdersCount = localOrders.filter(o => o.status === 'placed' || o.status === 'preparing').length
  const readyOrdersCount = localOrders.filter(o => o.status === 'ready').length
  const completedTodayCount = localOrders.filter(o => o.status === 'collected').length
  const lowStockCount = menuItems.filter(i => (i.stock_qty ?? 10) <= 5).length
  const shiftRevenue = localOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0)

  return (
    <div className="saas-layout">
      {/* ── LEFT SIDEBAR (Shop Staff's Exact 7 Sections) ── */}
      <aside className="saas-sidebar">
        {/* Brand */}
        <div className="saas-sidebar-brand">
          <div className="saas-brand-wrap">
            <img src="/vit-chennai-logo.png" alt="V Foods" className="saas-brand-img" />
            <span className="saas-brand-text">V-<span>FOODS</span></span>
          </div>
          <span className="saas-role-badge saas-role-staff">Shop Staff</span>
        </div>

        {/* Current Outlet Badge */}
        <div className="saas-sidebar-outlet">
          <span className="saas-outlet-label">
            <Store size={11} /> Counter Station
          </span>
          <div className="saas-outlet-name" title={currentOutlet.name}>
            {currentOutlet.name}
          </div>
          <div className="saas-outlet-status">
            <span className="saas-status-dot online" />
            <span style={{ color: '#22C55E', fontWeight: 600 }}>Active Online</span>
          </div>
        </div>

        {/* Navigation Menu (7 sections strictly matching spec) */}
        <nav className="saas-nav">
          <button
            className={`saas-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <div className="saas-nav-item-left">
              <LayoutDashboard size={16} />
              <span>Overview</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'live-orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('live-orders')}
          >
            <div className="saas-nav-item-left">
              <Clock size={16} />
              <span>Live Orders</span>
            </div>
            {activeOrdersCount > 0 && (
              <span className="saas-nav-badge">{activeOrdersCount}</span>
            )}
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'kds' ? 'active' : ''}`}
            onClick={() => setActiveTab('kds')}
          >
            <div className="saas-nav-item-left">
              <ChefHat size={16} />
              <span>KDS / Kitchen</span>
            </div>
            {activeOrdersCount > 0 && (
              <span className="saas-nav-badge">{activeOrdersCount}</span>
            )}
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            <div className="saas-nav-item-left">
              <Boxes size={16} />
              <span>Stock</span>
            </div>
            {lowStockCount > 0 && (
              <span className="saas-nav-badge" style={{ background: '#DC2626', color: '#FFF' }}>
                {lowStockCount} low
              </span>
            )}
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'pickup-queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('pickup-queue')}
          >
            <div className="saas-nav-item-left">
              <BellRing size={16} />
              <span>Pickup Queue</span>
            </div>
            {readyOrdersCount > 0 && (
              <span className="saas-nav-badge" style={{ background: '#16A34A', color: '#FFF' }}>
                {readyOrdersCount}
              </span>
            )}
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <div className="saas-nav-item-left">
              <Calculator size={16} />
              <span>POS Counter</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'shift-billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('shift-billing')}
          >
            <div className="saas-nav-item-left">
              <ReceiptText size={16} />
              <span>Shift Billing</span>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="saas-sidebar-footer">
          <div className="saas-user-meta">
            <span className="saas-user-name">{currentUser?.full_name || 'Staff User'}</span>
            <span className="saas-user-role-label">Shop Staff</span>
          </div>
          <button
            className="saas-logout-btn"
            onClick={handleSignOut}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="saas-main">
        {/* Topbar */}
        <header className="saas-topbar">
          <div className="saas-breadcrumb">
            <span>Staff Console</span>
            <ChevronRight size={14} />
            <span className="saas-breadcrumb-title">
              {activeTab === 'overview' && 'Overview'}
              {activeTab === 'live-orders' && 'Live Orders'}
              {activeTab === 'kds' && 'KDS / Kitchen Display'}
              {activeTab === 'stock' && 'Stock & Inventory'}
              {activeTab === 'pickup-queue' && 'Pickup & Token Queue'}
              {activeTab === 'pos' && 'Counter POS Terminal'}
              {activeTab === 'shift-billing' && 'Shift Billing & Reconciliation'}
            </span>
          </div>

          <div className="saas-top-actions">
            <button
              className="saas-btn saas-btn-secondary saas-btn-sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
            >
              {soundEnabled ? <Volume2 size={14} className="text-emerald-600" /> : <VolumeX size={14} />}
              <span>{soundEnabled ? 'Chime On' : 'Chime Off'}</span>
            </button>

            <button
              className="saas-btn saas-btn-secondary saas-btn-sm"
              onClick={loadData}
              disabled={syncing}
              title="Refresh live orders"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <button
              className="saas-btn saas-btn-primary saas-btn-sm"
              onClick={() => setShowVerifyModal(true)}
            >
              <CheckCircle2 size={14} />
              <span>Verify Token</span>
            </button>
          </div>
        </header>

        {/* Global Banner Notification */}
        {bannerNotice && (
          <div style={{
            background: '#1E40AF',
            color: '#FFFFFF',
            padding: '10px 28px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{bannerNotice}</span>
            <button
              onClick={() => setBannerNotice(null)}
              style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body Container */}
        <div className="saas-body">
          {/* ══════════════════════════════════════════════════════════
              TAB 1: OVERVIEW
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* KPI Cards */}
              <div className="saas-kpi-grid">
                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Active Orders</span>
                    <Clock size={16} className="text-blue-600" />
                  </div>
                  <div className="saas-kpi-value">{activeOrdersCount}</div>
                  <div className="saas-kpi-sub" style={{ color: activeOrdersCount > 5 ? '#D97706' : '#64748B' }}>
                    {activeOrdersCount > 5 ? 'High counter load' : 'Normal queue'}
                  </div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Ready for Pickup</span>
                    <BellRing size={16} className="text-emerald-600" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#16A34A' }}>{readyOrdersCount}</div>
                  <div className="saas-kpi-sub">Awaiting customer collection</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Completed Today</span>
                    <CheckCircle2 size={16} className="text-slate-600" />
                  </div>
                  <div className="saas-kpi-value">{completedTodayCount}</div>
                  <div className="saas-kpi-sub">Total handed over</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Low Stock Items</span>
                    <AlertTriangle size={16} className="text-amber-500" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: lowStockCount > 0 ? '#DC2626' : '#0F172A' }}>
                    {lowStockCount}
                  </div>
                  <div className="saas-kpi-sub">Below 5 items left</div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="saas-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Fast Operational Actions</h3>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0' }}>One-tap shortcuts for quick service</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="saas-btn saas-btn-primary" onClick={() => setActiveTab('pos')}>
                      <Calculator size={15} />
                      <span>Open POS Register</span>
                    </button>
                    <button className="saas-btn saas-btn-secondary" onClick={() => setShowVerifyModal(true)}>
                      <QrCode size={15} />
                      <span>Verify Handover Token</span>
                    </button>
                    <button className="saas-btn saas-btn-secondary" onClick={() => setActiveTab('stock')}>
                      <Boxes size={15} />
                      <span>Manage Stock</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Orders Quick Table */}
              <div className="saas-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} className="text-blue-600" />
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Urgent Kitchen Orders</h3>
                  </div>
                  <button
                    className="saas-btn saas-btn-secondary saas-btn-sm"
                    onClick={() => setActiveTab('kds')}
                  >
                    <span>Open Full KDS</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>Items</th>
                        <th>Time</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Quick Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localOrders.filter(o => o.status !== 'collected' && o.status !== 'cancelled').slice(0, 6).map(order => (
                        <tr key={order.id}>
                          <td>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '14px',
                              fontFamily: 'monospace',
                              padding: '2px 8px',
                              background: '#F1F5F9',
                              borderRadius: '4px',
                              color: '#0F172A'
                            }}>
                              #{order.token || order.id}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>
                              {(order.order_items || []).map(i => `${i.name} × ${i.qty}`).join(', ') || 'No item details'}
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748B' }}>
                            {formatElapsed(order.created_at)}
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {money(order.total)}
                          </td>
                          <td>
                            <span className={`saas-badge ${
                              order.status === 'placed' ? 'saas-badge-warning' :
                              order.status === 'preparing' ? 'saas-badge-info' :
                              order.status === 'ready' ? 'saas-badge-success' : 'saas-badge-neutral'
                            }`}>
                              {order.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {order.status === 'placed' && (
                              <button
                                className="saas-btn saas-btn-primary saas-btn-sm"
                                onClick={() => handleAdvanceStatus(order.id, 'placed')}
                              >
                                <span>Start Prep</span>
                              </button>
                            )}
                            {order.status === 'preparing' && (
                              <button
                                className="saas-btn saas-btn-success saas-btn-sm"
                                onClick={() => handleAdvanceStatus(order.id, 'preparing')}
                              >
                                <span>Mark Ready</span>
                              </button>
                            )}
                            {order.status === 'ready' && (
                              <button
                                className="saas-btn saas-btn-secondary saas-btn-sm"
                                onClick={() => handleAdvanceStatus(order.id, 'ready')}
                              >
                                <span>Deliver</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {localOrders.filter(o => o.status !== 'collected').length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                            No pending orders in queue. All caught up!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: LIVE ORDERS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'live-orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Filter and Search Bar */}
              <div className="saas-card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  {/* Status Pills */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['all', 'placed', 'preparing', 'ready'] as const).map(st => (
                      <button
                        key={st}
                        className={`saas-btn saas-btn-sm ${orderFilter === st ? 'saas-btn-primary' : 'saas-btn-secondary'}`}
                        onClick={() => setOrderFilter(st)}
                      >
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                        {st !== 'all' && (
                          <span style={{ opacity: 0.8, marginLeft: '4px' }}>
                            ({localOrders.filter(o => o.status === st).length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Search Box */}
                  <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="Search token or item..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 12px 6px 32px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Orders Table */}
              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Token #</th>
                        <th>Customer / Items</th>
                        <th>Time Elapsed</th>
                        <th>Payment</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Workflow Step</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(order => (
                        <tr key={order.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontWeight: 800,
                                fontSize: '15px',
                                fontFamily: 'monospace',
                                color: '#0F172A',
                                background: '#F1F5F9',
                                padding: '3px 8px',
                                borderRadius: '4px'
                              }}>
                                #{order.token || order.id}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>
                              {order.customer_name || `Customer #${order.id % 900}`}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                              {(order.order_items || []).map(i => `${i.name} (×${i.qty})`).join(' • ')}
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748B' }}>
                            {formatElapsed(order.created_at)}
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: '#475569' }}>
                              {order.payment_method || 'Online'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>
                            {money(order.total)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span className={`saas-badge ${
                                order.status === 'placed' ? 'saas-badge-warning' :
                                order.status === 'preparing' ? 'saas-badge-info' :
                                order.status === 'ready' ? 'saas-badge-success' : 'saas-badge-neutral'
                              }`}>
                                {order.status.toUpperCase()}
                              </span>
                              {delayBuffers[order.id] > 0 && (
                                <span style={{ fontSize: '10.5px', color: '#C2410C', background: '#FFF7ED', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={10} /> +{delayBuffers[order.id]}m buffer
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {order.status === 'placed' && (
                              <button
                                className="saas-btn saas-btn-primary saas-btn-sm"
                                onClick={() => handleAdvanceStatus(order.id, 'placed')}
                              >
                                <span>Start Prep</span>
                              </button>
                            )}
                            {order.status === 'preparing' && (
                              <button
                                className="saas-btn saas-btn-success saas-btn-sm"
                                onClick={() => handleAdvanceStatus(order.id, 'preparing')}
                              >
                                <span>Mark Ready</span>
                              </button>
                            )}
                            {order.status === 'ready' && (
                              <button
                                className="saas-btn saas-btn-secondary saas-btn-sm"
                                onClick={() => handleAdvanceStatus(order.id, 'ready')}
                              >
                                <span>Handover</span>
                              </button>
                            )}
                            {order.status === 'collected' && (
                              <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
                                Delivered
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                            No orders found matching this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 3: KDS / KITCHEN
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'kds' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Kitchen Display Kanban</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Real-time ticket progression for cook station</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="saas-btn saas-btn-secondary saas-btn-sm" onClick={loadData}>
                    <RefreshCw size={13} />
                    <span>Auto-sync Active</span>
                  </button>
                </div>
              </div>

              {/* 3-Column KDS Board */}
              <div className="saas-kds-grid">
                {/* 1. PLACED / NEW TICKETS */}
                <div className="saas-kds-col">
                  <div className="saas-kds-col-header" style={{ borderLeft: '4px solid #F59E0B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} className="text-amber-500" />
                      <span style={{ fontWeight: 700 }}>New Placed Orders</span>
                    </div>
                    <span className="saas-badge saas-badge-warning">
                      {localOrders.filter(o => o.status === 'placed').length}
                    </span>
                  </div>

                  <div className="saas-kds-list">
                    {localOrders.filter(o => o.status === 'placed').map(order => (
                      <div key={order.id} className="saas-ticket">
                        <div className="saas-ticket-header">
                          <span className="saas-ticket-token">#{order.token || order.id}</span>
                          <span className="saas-ticket-time">{formatElapsed(order.created_at)}</span>
                        </div>

                        {/* Collapsible Ticket Items */}
                        <div 
                          onClick={() => toggleTicketCollapse(order.id)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            margin: '6px 0 4px', 
                            padding: '4px 6px',
                            borderRadius: '4px',
                            background: '#F8FAFC',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                            {(order.order_items || []).length} {(order.order_items || []).length === 1 ? 'item' : 'items'}
                          </span>
                          <ChevronDown 
                            size={13} 
                            style={{ 
                              color: '#64748B', 
                              transform: collapsedTickets[order.id] ? 'rotate(-90deg)' : 'none', 
                              transition: 'transform 0.15s ease' 
                            }} 
                          />
                        </div>

                        {!collapsedTickets[order.id] && (
                          <div className="saas-ticket-items">
                            {(order.order_items || []).map((item, idx) => (
                              <div key={idx} className="saas-ticket-item-row">
                                <span className="saas-ticket-item-name">{item.name}</span>
                                <span className="saas-ticket-item-qty">×{item.qty}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Figma-style Kitchen Rush Buffer Chips */}
                        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Rush Buffer:</span>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {[5, 10, 15].map(mins => {
                              const isSelected = delayBuffers[order.id] === mins
                              return (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleApplyDelayBuffer(order.id, mins); }}
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: isSelected ? '1px solid #EA580C' : '1px solid #CBD5E1',
                                    background: isSelected ? '#EA580C' : '#FFFFFF',
                                    color: isSelected ? '#FFFFFF' : '#475569',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title={`Add ${mins}m rush buffer`}
                                >
                                  +{mins}m
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {delayBuffers[order.id] > 0 && (
                          <div style={{ marginTop: '6px', fontSize: '10.5px', color: '#C2410C', background: '#FFF7ED', padding: '3px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <Clock size={10} /> +{delayBuffers[order.id]}m buffer applied
                          </div>
                        )}

                        <div style={{ marginTop: '10px' }}>
                          <button
                            className="saas-btn saas-btn-primary saas-btn-sm"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => handleAdvanceStatus(order.id, 'placed')}
                          >
                            <span>Start Cooking →</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {localOrders.filter(o => o.status === 'placed').length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8', fontSize: '13px' }}>
                        No new orders pending
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. PREPARING / COOKING */}
                <div className="saas-kds-col">
                  <div className="saas-kds-col-header" style={{ borderLeft: '4px solid #3B82F6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ChefHat size={15} className="text-blue-500" />
                      <span style={{ fontWeight: 700 }}>In Kitchen / Cooking</span>
                    </div>
                    <span className="saas-badge saas-badge-info">
                      {localOrders.filter(o => o.status === 'preparing').length}
                    </span>
                  </div>

                  <div className="saas-kds-list">
                    {localOrders.filter(o => o.status === 'preparing').map(order => (
                      <div key={order.id} className="saas-ticket">
                        <div className="saas-ticket-header">
                          <span className="saas-ticket-token">#{order.token || order.id}</span>
                          <span className="saas-ticket-time">{formatElapsed(order.created_at)}</span>
                        </div>

                        {/* Collapsible Ticket Items */}
                        <div 
                          onClick={() => toggleTicketCollapse(order.id)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            margin: '6px 0 4px', 
                            padding: '4px 6px',
                            borderRadius: '4px',
                            background: '#F8FAFC',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                            {(order.order_items || []).length} {(order.order_items || []).length === 1 ? 'item' : 'items'}
                          </span>
                          <ChevronDown 
                            size={13} 
                            style={{ 
                              color: '#64748B', 
                              transform: collapsedTickets[order.id] ? 'rotate(-90deg)' : 'none', 
                              transition: 'transform 0.15s ease' 
                            }} 
                          />
                        </div>

                        {!collapsedTickets[order.id] && (
                          <div className="saas-ticket-items">
                            {(order.order_items || []).map((item, idx) => (
                              <div key={idx} className="saas-ticket-item-row">
                                <span className="saas-ticket-item-name">{item.name}</span>
                                <span className="saas-ticket-item-qty">×{item.qty}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Figma-style Kitchen Rush Buffer Chips */}
                        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Rush Buffer:</span>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {[5, 10, 15].map(mins => {
                              const isSelected = delayBuffers[order.id] === mins
                              return (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleApplyDelayBuffer(order.id, mins); }}
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: isSelected ? '1px solid #EA580C' : '1px solid #CBD5E1',
                                    background: isSelected ? '#EA580C' : '#FFFFFF',
                                    color: isSelected ? '#FFFFFF' : '#475569',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title={`Add ${mins}m rush buffer`}
                                >
                                  +{mins}m
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {delayBuffers[order.id] > 0 && (
                          <div style={{ marginTop: '6px', fontSize: '10.5px', color: '#C2410C', background: '#FFF7ED', padding: '3px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <Clock size={10} /> +{delayBuffers[order.id]}m buffer applied
                          </div>
                        )}

                        <div style={{ marginTop: '10px' }}>
                          <button
                            className="saas-btn saas-btn-success saas-btn-sm"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => handleAdvanceStatus(order.id, 'preparing')}
                          >
                            <span>Mark as Ready →</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {localOrders.filter(o => o.status === 'preparing').length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8', fontSize: '13px' }}>
                        Kitchen is clear
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. READY FOR PICKUP */}
                <div className="saas-kds-col">
                  <div className="saas-kds-col-header" style={{ borderLeft: '4px solid #10B981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BellRing size={15} className="text-emerald-500" />
                      <span style={{ fontWeight: 700 }}>Ready at Counter</span>
                    </div>
                    <span className="saas-badge saas-badge-success">
                      {localOrders.filter(o => o.status === 'ready').length}
                    </span>
                  </div>

                  <div className="saas-kds-list">
                    {localOrders.filter(o => o.status === 'ready').map(order => (
                      <div key={order.id} className="saas-ticket">
                        <div className="saas-ticket-header">
                          <span className="saas-ticket-token" style={{ color: '#16A34A' }}>
                            #{order.token || order.id}
                          </span>
                          <span className="saas-ticket-time">{formatElapsed(order.created_at)}</span>
                        </div>

                        {/* Collapsible Ticket Items */}
                        <div 
                          onClick={() => toggleTicketCollapse(order.id)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            margin: '6px 0 4px', 
                            padding: '4px 6px',
                            borderRadius: '4px',
                            background: '#F8FAFC',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                            {(order.order_items || []).length} {(order.order_items || []).length === 1 ? 'item' : 'items'}
                          </span>
                          <ChevronDown 
                            size={13} 
                            style={{ 
                              color: '#64748B', 
                              transform: collapsedTickets[order.id] ? 'rotate(-90deg)' : 'none', 
                              transition: 'transform 0.15s ease' 
                            }} 
                          />
                        </div>

                        {!collapsedTickets[order.id] && (
                          <div className="saas-ticket-items">
                            {(order.order_items || []).map((item, idx) => (
                              <div key={idx} className="saas-ticket-item-row">
                                <span className="saas-ticket-item-name">{item.name}</span>
                                <span className="saas-ticket-item-qty">×{item.qty}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: '12px' }}>
                          <button
                            className="saas-btn saas-btn-secondary saas-btn-sm"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => handleAdvanceStatus(order.id, 'ready')}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              Handed Over <Check size={14} />
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {localOrders.filter(o => o.status === 'ready').length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8', fontSize: '13px' }}>
                        No orders waiting for pickup
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 4: STOCK
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'stock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Counter Stock Levels</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Adjust quantities in 1 tap to reflect live shelf count</p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="saas-btn saas-btn-primary saas-btn-sm"
                    onClick={() => setShowAddItemModal(true)}
                  >
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Stock Items Table */}
              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Price</th>
                        <th>Live Count</th>
                        <th>Availability</th>
                        <th style={{ textAlign: 'right' }}>Quick Adjust</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuItems.map(item => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>
                              {item.name}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: '#64748B', textTransform: 'capitalize' }}>
                              {item.category}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: item.is_veg ? '#DCFCE7' : '#FEE2E2',
                              color: item.is_veg ? '#166534' : '#991B1B'
                            }}>
                              {item.is_veg ? 'VEG' : 'NON-VEG'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {money(item.price)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontWeight: 800,
                                fontSize: '14px',
                                color: (item.stock_qty ?? 10) <= 5 ? '#DC2626' : '#0F172A'
                              }}>
                                {item.stock_qty ?? 10}
                              </span>
                              {(item.stock_qty ?? 10) <= 5 && (
                                <span className="saas-badge saas-badge-danger" style={{ fontSize: '10px' }}>
                                  Low
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              onClick={() => handleToggleItemAvailability(item.id, item.available)}
                              style={{
                                border: 'none',
                                background: item.available ? '#DCFCE7' : '#F1F5F9',
                                color: item.available ? '#166534' : '#64748B',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {item.available ? 'In Stock' : 'Sold Out'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                className="saas-btn saas-btn-secondary saas-btn-sm"
                                onClick={() => handleUpdateStock(item.id, -1)}
                                title="Decrease stock by 1"
                              >
                                <Minus size={12} />
                              </button>
                              <button
                                className="saas-btn saas-btn-secondary saas-btn-sm"
                                onClick={() => handleUpdateStock(item.id, 5)}
                                title="Add 5 to stock"
                              >
                                +5
                              </button>
                              <button
                                className="saas-btn saas-btn-secondary saas-btn-sm"
                                onClick={() => handleUpdateStock(item.id, 10)}
                                title="Add 10 to stock"
                              >
                                +10
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 5: PICKUP QUEUE
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'pickup-queue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Pickup Collection Desk</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Display ready orders to students & verify token on handover</p>
                </div>
                <button className="saas-btn saas-btn-primary" onClick={() => setShowVerifyModal(true)}>
                  <QrCode size={15} />
                  <span>Verify Customer Token</span>
                </button>
              </div>

              {/* Ready Tokens Grid */}
              <div className="saas-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BellRing size={16} /> READY FOR IMMEDIATE COLLECTION ({readyOrdersCount})
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                  {localOrders.filter(o => o.status === 'ready').map(order => (
                    <div
                      key={order.id}
                      style={{
                        border: '2px solid #86EFAC',
                        background: '#F0FDF4',
                        borderRadius: '8px',
                        padding: '14px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'monospace', color: '#15803D' }}>
                        #{order.token || order.id}
                      </span>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                        {(order.order_items || []).length} items
                      </span>
                      <button
                        className="saas-btn saas-btn-success saas-btn-sm"
                        style={{ marginTop: '6px', justifyContent: 'center' }}
                        onClick={() => handleAdvanceStatus(order.id, 'ready')}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Hand Over <Check size={14} />
                        </span>
                      </button>
                    </div>
                  ))}
                  {localOrders.filter(o => o.status === 'ready').length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                      No orders currently waiting at the collection counter.
                    </div>
                  )}
                </div>
              </div>

              {/* Preparing Next Section */}
              <div className="saas-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px', color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> CURRENTLY PREPARING (NEXT UP)
                </h4>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {localOrders.filter(o => o.status === 'preparing').map(order => (
                    <div
                      key={order.id}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '6px',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '16px', fontFamily: 'monospace', color: '#1D4ED8' }}>
                        #{order.token || order.id}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        {formatElapsed(order.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 6: POS COUNTER
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'pos' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
              {/* Left Column: Menu Items to Add */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="saas-card" style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Walk-In Item Selector</h3>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>Click any item to add to register</span>
                  </div>
                </div>

                {posSuccessNotice && (
                  <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
                    {posSuccessNotice}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {menuItems.filter(i => i.available).map(item => {
                    const inCartQty = posCart[item.id] || 0
                    return (
                      <div
                        key={item.id}
                        className="saas-card"
                        style={{
                          padding: '14px',
                          cursor: 'pointer',
                          border: inCartQty > 0 ? '2px solid #1E40AF' : '1px solid #E2E8F0',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setPosCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: item.is_veg ? '#DCFCE7' : '#FEE2E2',
                            color: item.is_veg ? '#166534' : '#991B1B'
                          }}>
                            {item.is_veg ? 'VEG' : 'NON-VEG'}
                          </span>
                          {inCartQty > 0 && (
                            <span style={{ background: '#1E40AF', color: '#FFF', fontSize: '11px', fontWeight: 800, padding: '1px 6px', borderRadius: '10px' }}>
                              {inCartQty} in cart
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, margin: '8px 0 4px', color: '#0F172A' }}>
                          {item.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E40AF' }}>
                            {money(item.price)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            Stock: {item.stock_qty ?? 10}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right Column: POS Order Cart & Checkout */}
              <div className="saas-card" style={{ padding: '18px', height: 'fit-content' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  Current Order Punch
                </h3>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Customer Name / Token Ref (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Walk-in student..."
                    value={posCustomerName}
                    onChange={e => setPosCustomerName(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                {/* Cart Items List */}
                <div style={{ minHeight: '140px', maxHeight: '240px', overflowY: 'auto', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  {Object.keys(posCart).map(idStr => {
                    const id = Number(idStr)
                    const item = menuItems.find(m => m.id === id)
                    const qty = posCart[id]
                    if (qty <= 0) return null
                    return (
                      <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{item?.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{money(item?.price || 0)} each</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="saas-btn saas-btn-secondary saas-btn-sm"
                            style={{ padding: '2px 6px' }}
                            onClick={() => setPosCart(prev => {
                              const next = { ...prev }
                              if (next[id] > 1) next[id] -= 1
                              else delete next[id]
                              return next
                            })}
                          >
                            <Minus size={10} />
                          </button>
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{qty}</span>
                          <button
                            className="saas-btn saas-btn-secondary saas-btn-sm"
                            style={{ padding: '2px 6px' }}
                            onClick={() => setPosCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))}
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(posCart).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8', fontSize: '12.5px' }}>
                      Register is empty. Tap items to add.
                    </div>
                  )}
                </div>

                {/* Subtotal & Mode */}
                <div style={{ padding: '12px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800 }}>
                    <span>Total Amount</span>
                    <span style={{ color: '#1E40AF' }}>
                      {money(
                        Object.keys(posCart).reduce((sum, id) => {
                          const item = menuItems.find(m => m.id === Number(id))
                          return sum + (item?.price || 0) * (posCart[Number(id)] || 0)
                        }, 0)
                      )}
                    </span>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Payment Method Received
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      {(['upi', 'cash', 'wallet'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          className={`saas-btn saas-btn-sm ${posPaymentMode === mode ? 'saas-btn-primary' : 'saas-btn-secondary'}`}
                          style={{ justifyContent: 'center', textTransform: 'uppercase', fontSize: '11px' }}
                          onClick={() => setPosPaymentMode(mode)}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Punch Order Button */}
                <button
                  className="saas-btn saas-btn-success"
                  style={{ width: '100%', marginTop: '14px', justifyContent: 'center', padding: '10px' }}
                  disabled={Object.keys(posCart).length === 0}
                  onClick={handlePunchPosOrder}
                >
                  <ReceiptText size={16} />
                  <span>Print & Punch Order</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 7: SHIFT BILLING
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'shift-billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Shift Billing & Cash Reconciliation</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Track till totals and register transactions for current shift</p>
                </div>
                <button className="saas-btn saas-btn-secondary" onClick={() => window.print()}>
                  <Printer size={15} />
                  <span>Print Shift Summary</span>
                </button>
              </div>

              {/* Shift Key Figures */}
              <div className="saas-kpi-grid">
                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Shift Started</span>
                    <Clock size={16} className="text-slate-500" />
                  </div>
                  <div className="saas-kpi-value">{shiftStartTime}</div>
                  <div className="saas-kpi-sub">Today's active session</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Shift Revenue</span>
                    <TrendingUp size={16} className="text-blue-600" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#1E40AF' }}>
                    {money(shiftRevenue)}
                  </div>
                  <div className="saas-kpi-sub">Across all payment channels</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Orders Handled</span>
                    <ReceiptText size={16} className="text-emerald-600" />
                  </div>
                  <div className="saas-kpi-value">{localOrders.length}</div>
                  <div className="saas-kpi-sub">Registered transactions</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Active Register Till</span>
                    <Banknote size={16} className="text-emerald-500" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#15803D' }}>
                    {money(localOrders.filter(o => (o.payment_method || '').toLowerCase().includes('cash')).reduce((s, o) => s + o.total, 0))}
                  </div>
                  <div className="saas-kpi-sub">Cash on counter</div>
                </div>
              </div>

              {/* Shift Ledger */}
              <div className="saas-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Shift Transaction Log</h4>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Showing recent transactions</span>
                </div>

                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Order Token</th>
                        <th>Timestamp</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localOrders.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>#{o.token || o.id}</td>
                          <td style={{ fontSize: '12px', color: '#64748B' }}>
                            {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ fontSize: '12px' }}>{o.payment_method || 'Online'}</td>
                          <td style={{ fontWeight: 700 }}>{money(o.total)}</td>
                          <td>
                            <span className={`saas-badge ${o.status === 'collected' ? 'saas-badge-success' : 'saas-badge-info'}`}>
                              {o.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── VERIFY TOKEN MODAL ── */}
      {showVerifyModal && (
        <div className="saas-modal-backdrop" onClick={() => setShowVerifyModal(false)}>
          <div className="saas-modal-card" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 className="saas-modal-title">Verify Pickup Token</h3>
              <button className="saas-modal-close" onClick={() => setShowVerifyModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleVerifyPickup} style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
                Enter the customer's 3-digit order token displayed on their phone.
              </p>

              <input
                type="text"
                placeholder="e.g. 104"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  fontSize: '24px',
                  fontWeight: 800,
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  letterSpacing: '4px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #CBD5E1',
                  marginBottom: '16px'
                }}
              />

              {verifyStatus && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '14px',
                  background: verifyStatus.success ? '#DCFCE7' : '#FEE2E2',
                  color: verifyStatus.success ? '#166534' : '#991B1B'
                }}>
                  {verifyStatus.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="saas-btn saas-btn-secondary"
                  onClick={() => setShowVerifyModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="saas-btn saas-btn-primary"
                  disabled={!tokenInput.trim()}
                >
                  Confirm Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD ITEM MODAL ── */}
      {showAddItemModal && (
        <div className="saas-modal-backdrop" onClick={() => setShowAddItemModal(false)}>
          <div className="saas-modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 className="saas-modal-title">Add Menu Item</h3>
              <button className="saas-modal-close" onClick={() => setShowAddItemModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masala Dosa"
                  value={newItemForm.name}
                  onChange={e => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newItemForm.price}
                    onChange={e => setNewItemForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={newItemForm.category}
                    onChange={e => setNewItemForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  >
                    <option value="snacks">Snacks</option>
                    <option value="meals">Meals</option>
                    <option value="beverages">Beverages</option>
                    <option value="desserts">Desserts</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Dietary Type
                  </label>
                  <select
                    value={newItemForm.is_veg ? 'veg' : 'non-veg'}
                    onChange={e => setNewItemForm(prev => ({ ...prev, is_veg: e.target.value === 'veg' }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemForm.stock_qty}
                    onChange={e => setNewItemForm(prev => ({ ...prev, stock_qty: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="saas-btn saas-btn-secondary"
                  onClick={() => setShowAddItemModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="saas-btn saas-btn-primary"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShopStaffDashboard
