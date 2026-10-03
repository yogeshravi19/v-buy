import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LayoutDashboard,
  Clock,
  ChefHat,
  UtensilsCrossed,
  Boxes,
  Calculator,
  CalendarClock,
  Users,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Settings,
  Search,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Store,
  ChevronRight,
  X,
  Trash2,
  Edit,
  Download,
  Check,
  AlertTriangle,
  ArrowRight,
  Shield,
  CreditCard,
  Banknote,
  Percent,
  Sliders,
  Bell,
  FastForward,
  CheckCheck,
  Layers
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
}

export interface StaffMember {
  id: string
  full_name: string
  phone: string
  role: string
  is_active: boolean
  created_at: string
}

export interface PickupSlot {
  id: string
  slot_time: string
  max_orders: number
  booked_count: number
  is_active: boolean
}

export interface SettlementRecord {
  id: string
  date: string
  gross_sales: number
  commission: number
  net_payout: number
  status: 'transferred' | 'pending'
  reference_id: string
}

interface ShopAdminDashboardProps {
  currentUser: any
  setCurrentUser?: (u: any) => void
  outlets?: any[]
  setOutlets?: React.Dispatch<React.SetStateAction<any[]>>
  orders?: Order[]
  setOrders?: React.Dispatch<React.SetStateAction<any[]>>
  advanceOrderStatus?: (orderId: number) => void
  addAuditLog?: (actor: string, role: string, entity: string, action: string, details: string) => void
  handleSignOut?: () => void
  money?: (amount: number) => string
  forcedOutletId?: string
}

function formatElapsed(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

export const ShopAdminDashboard: React.FC<ShopAdminDashboardProps> = ({
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
  // Required 12 tabs strictly matching Shop Admin specifications
  type AdminTab =
    | 'overview'
    | 'live-orders'
    | 'kds'
    | 'menu-items'
    | 'inventory'
    | 'pos'
    | 'pickup-slots'
    | 'staff'
    | 'sales-revenue'
    | 'settlements'
    | 'reports'
    | 'shop-settings'

  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  // Active Outlet identification
  const activeOutletId = forcedOutletId || currentUser?.outlet_id || 'g1'
  const currentOutlet = outlets.find(o => o.id === activeOutletId) || {
    id: activeOutletId,
    name: currentUser?.outlet_name || 'Gazebo C1 — Snacks & Fast Food',
    location: 'Gazebo (Main Canteen)',
    is_open: true
  }

  // Core Data States
  const [localOrders, setLocalOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [staffList, setStaffList] = useState<StaffMember[]>([
    { id: 'st1', full_name: 'Murugan K', phone: '9876541001', role: 'Kitchen Lead', is_active: true, created_at: '2026-01-10' },
    { id: 'st2', full_name: 'Anand R', phone: '9876541002', role: 'Counter Cashier', is_active: true, created_at: '2026-02-04' },
    { id: 'st3', full_name: 'Suresh P', phone: '9876541003', role: 'Prep Cook', is_active: true, created_at: '2026-03-01' }
  ])
  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([
    { id: 'sl1', slot_time: '12:00 PM - 12:15 PM', max_orders: 25, booked_count: 14, is_active: true },
    { id: 'sl2', slot_time: '12:15 PM - 12:30 PM', max_orders: 25, booked_count: 22, is_active: true },
    { id: 'sl3', slot_time: '12:30 PM - 12:45 PM', max_orders: 25, booked_count: 25, is_active: true },
    { id: 'sl4', slot_time: '12:45 PM - 01:00 PM', max_orders: 25, booked_count: 18, is_active: true },
    { id: 'sl5', slot_time: '01:00 PM - 01:15 PM', max_orders: 25, booked_count: 11, is_active: true },
    { id: 'sl6', slot_time: '01:15 PM - 01:30 PM', max_orders: 25, booked_count: 8, is_active: true }
  ])
  const [settlements, setSettlements] = useState<SettlementRecord[]>([
    { id: 'set-101', date: '2026-10-01', gross_sales: 18450, commission: 922.5, net_payout: 17527.5, status: 'transferred', reference_id: 'HDFC98218731' },
    { id: 'set-100', date: '2026-09-30', gross_sales: 22100, commission: 1105.0, net_payout: 20995.0, status: 'transferred', reference_id: 'HDFC98190022' },
    { id: 'set-099', date: '2026-09-29', gross_sales: 19800, commission: 990.0, net_payout: 18810.0, status: 'transferred', reference_id: 'HDFC98165510' },
    { id: 'set-098', date: '2026-09-28', gross_sales: 24300, commission: 1215.0, net_payout: 23085.0, status: 'transferred', reference_id: 'HDFC98144299' },
    { id: 'set-102', date: '2026-10-02 (Today)', gross_sales: 14200, commission: 710.0, net_payout: 13490.0, status: 'pending', reference_id: 'Processing at 11:30 PM' }
  ])

  // Outlet operational mode: 'open' | 'rush' | 'paused'
  const [outletStatus, setOutletStatus] = useState<'open' | 'rush' | 'paused'>('open')
  const [syncing, setSyncing] = useState(false)
  // Rush Hour Batch Optimization States
  const [autoAcceptRushMode, setAutoAcceptRushMode] = useState<boolean>(false)

  // Aggregated quantities across all currently active tickets (placed + preparing)
  const activePrepItems = useMemo(() => {
    const active = localOrders.filter(o => o.status === 'placed' || o.status === 'preparing')
    const itemMap = new Map<string, number>()
    active.forEach(order => {
      (order.order_items || []).forEach(item => {
        const name = item.name || 'Custom Item'
        const count = item.qty || 1
        itemMap.set(name, (itemMap.get(name) || 0) + count)
      })
    })
    return Array.from(itemMap.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
  }, [localOrders])

  // Filters & search
  const [searchOrderQuery, setSearchOrderQuery] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all')
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('all')

  // Modals
  const [showAddMenuModal, setShowAddMenuModal] = useState(false)
  const [menuForm, setMenuForm] = useState({
    name: '',
    price: 35,
    category: 'snacks',
    is_veg: true,
    stock_qty: 30
  })

  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    phone: '',
    role: 'Counter Cashier'
  })

  // POS State
  const [posCart, setPosCart] = useState<{ [id: number]: number }>({})
  const [posCustomerName, setPosCustomerName] = useState('')
  const [posPaymentMode, setPosPaymentMode] = useState<'upi' | 'cash' | 'wallet'>('upi')

  // Fetch outlet data
  const loadData = useCallback(async () => {
    setSyncing(true)
    try {
      // 1. Fetch Orders
      const { data: ords } = await supabase
        .from('orders')
        .select(`
          id, user_id, outlet_id, token, status, payment_method, total, shop_payout,
          created_at, updated_at,
          order_items (item_id, name, price, qty)
        `)
        .eq('outlet_id', activeOutletId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (ords && ords.length > 0) {
        setLocalOrders(
          ords.map((o: any) => ({
            id: o.id,
            user_id: o.user_id,
            customer_name: `Student #${o.id % 900 + 100}`,
            outlet_id: o.outlet_id,
            token: o.token || String(o.id % 900 + 100),
            status: o.status || 'placed',
            payment_method: o.payment_method || 'Online UPI',
            payment_status: 'paid',
            total: o.total || 0,
            created_at: o.created_at,
            order_items: o.order_items || []
          }))
        )
      } else {
        // Fallback realistic orders
        setLocalOrders([
          {
            id: 9101,
            outlet_id: activeOutletId,
            token: '104',
            status: 'placed',
            payment_method: 'UPI Online',
            total: 140,
            created_at: new Date(Date.now() - 4 * 60000).toISOString(),
            order_items: [
              { name: 'Veg Puff', price: 20, qty: 2 },
              { name: 'Paneer Roll', price: 50, qty: 2 }
            ]
          },
          {
            id: 9099,
            outlet_id: activeOutletId,
            token: '289',
            status: 'preparing',
            payment_method: 'Meal Plan Card',
            total: 105,
            created_at: new Date(Date.now() - 9 * 60000).toISOString(),
            order_items: [
              { name: 'Chicken Cutlet', price: 35, qty: 3 }
            ]
          },
          {
            id: 9095,
            outlet_id: activeOutletId,
            token: '312',
            status: 'ready',
            payment_method: 'UPI Online',
            total: 60,
            created_at: new Date(Date.now() - 15 * 60000).toISOString(),
            order_items: [
              { name: 'Samosa (2 pcs)', price: 20, qty: 2 },
              { name: 'Veg Puff', price: 20, qty: 1 }
            ]
          },
          {
            id: 9088,
            outlet_id: activeOutletId,
            token: '419',
            status: 'collected',
            payment_method: 'Wallet',
            total: 120,
            created_at: new Date(Date.now() - 42 * 60000).toISOString(),
            order_items: [
              { name: 'Fresh Lime Juice', price: 30, qty: 2 },
              { name: 'Paneer Roll', price: 50, qty: 1 },
              { name: 'Veg Puff', price: 20, qty: 1 }
            ]
          }
        ])
      }

      // 2. Fetch Menu Items
      const { data: mData } = await supabase
        .from('menu_items')
        .select('id, outlet_id, name, price, available, is_veg, category, stock_qty')
        .eq('outlet_id', activeOutletId)
        .order('name', { ascending: true })

      if (mData && mData.length > 0) {
        setMenuItems(mData as MenuItem[])
      } else {
        setMenuItems([
          { id: 101, outlet_id: activeOutletId, name: 'Veg Puff', price: 20, is_veg: true, category: 'snacks', available: true, stock_qty: 45 },
          { id: 102, outlet_id: activeOutletId, name: 'Samosa (2 pcs)', price: 20, is_veg: true, category: 'snacks', available: true, stock_qty: 30 },
          { id: 103, outlet_id: activeOutletId, name: 'Chicken Cutlet', price: 35, is_veg: false, category: 'snacks', available: true, stock_qty: 18 },
          { id: 104, outlet_id: activeOutletId, name: 'Paneer Roll', price: 50, is_veg: true, category: 'snacks', available: true, stock_qty: 12 },
          { id: 105, outlet_id: activeOutletId, name: 'Fresh Lime Juice', price: 30, is_veg: true, category: 'beverages', available: true, stock_qty: 50 },
          { id: 106, outlet_id: activeOutletId, name: 'Tandoori Roti Combo', price: 70, is_veg: true, category: 'meals', available: true, stock_qty: 25 },
          { id: 107, outlet_id: activeOutletId, name: 'Gulab Jamun (2 pcs)', price: 30, is_veg: true, category: 'desserts', available: true, stock_qty: 40 }
        ])
      }
    } catch (e) {
      console.warn('Shop Admin fetch fallback:', e)
    } finally {
      setSyncing(false)
    }
  }, [activeOutletId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Order status advancement
  const handleAdvanceStatus = async (orderId: number, currentStatus: string) => {
    const nextMap: Record<string, 'preparing' | 'ready' | 'collected'> = {
      placed: 'preparing',
      preparing: 'ready',
      ready: 'collected'
    }
    const nextStatus = nextMap[currentStatus]
    if (!nextStatus) return

    setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
    try {
      await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId)
      if (addAuditLog) {
        addAuditLog(currentUser?.full_name || 'Shop Admin', 'shop_admin', 'ORDER', 'STATUS_ADVANCE', `Order #${orderId} moved to ${nextStatus}`)
      }
    } catch (e) {
      console.error('Failed to advance order status:', e)
    }
  }

  // Batch 1: Move all 'placed' orders to 'preparing' (Start Cooking All)
  const handleStartCookingAll = async () => {
    const placedOrders = localOrders.filter(o => o.status === 'placed')
    if (placedOrders.length === 0) return

    setLocalOrders(prev => prev.map(o => o.status === 'placed' ? { ...o, status: 'preparing' } : o))

    try {
      const orderIds = placedOrders.map(o => o.id)
      await supabase.from('orders').update({ status: 'preparing' }).in('id', orderIds)
      if (addAuditLog) {
        addAuditLog(currentUser?.full_name || 'Shop Admin', 'shop_admin', 'ORDER', 'BATCH_START_COOKING', `Batch started cooking for ${orderIds.length} orders`)
      }
    } catch (e) {
      console.error('Failed to batch start cooking:', e)
    }
  }

  // Batch 2: Move all 'preparing' orders to 'ready' (Mark All Ready)
  const handleMarkAllCookingReady = async () => {
    const prepOrders = localOrders.filter(o => o.status === 'preparing')
    if (prepOrders.length === 0) return

    setLocalOrders(prev => prev.map(o => o.status === 'preparing' ? { ...o, status: 'ready' } : o))

    try {
      const orderIds = prepOrders.map(o => o.id)
      await supabase.from('orders').update({ status: 'ready' }).in('id', orderIds)
      if (addAuditLog) {
        addAuditLog(currentUser?.full_name || 'Shop Admin', 'shop_admin', 'ORDER', 'BATCH_READY', `Batch marked ${orderIds.length} orders ready`)
      }
    } catch (e) {
      console.error('Failed to batch mark ready:', e)
    }
  }

  // Auto-Accept Rush Mode Hook
  useEffect(() => {
    if (!autoAcceptRushMode) return
    const placed = localOrders.filter(o => o.status === 'placed')
    if (placed.length > 0) {
      const timer = setTimeout(() => {
        handleStartCookingAll()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [autoAcceptRushMode, localOrders])

  // Cancel order
  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm(`Are you sure you want to cancel and refund Order #${orderId}?`)) return
    setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
    try {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
    } catch (e) {
      console.error('Failed to cancel order:', e)
    }
  }

  // Toggle item availability
  const handleToggleAvailability = async (itemId: number, current: boolean) => {
    const next = !current
    setMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, available: next } : i))
    try {
      await supabase.from('menu_items').update({ available: next }).eq('id', itemId)
    } catch (e) {
      console.error('Menu availability update failed:', e)
    }
  }

  // Restock item
  const handleRestock = async (itemId: number, amount: number) => {
    setMenuItems(prev =>
      prev.map(i => {
        if (i.id !== itemId) return i
        const newStock = Math.max(0, (i.stock_qty ?? 0) + amount)
        return { ...i, stock_qty: newStock, available: newStock > 0 }
      })
    )
    const item = menuItems.find(i => i.id === itemId)
    const updatedQty = Math.max(0, (item?.stock_qty ?? 0) + amount)
    try {
      await supabase.from('menu_items').update({ stock_qty: updatedQty, available: updatedQty > 0 }).eq('id', itemId)
    } catch (e) {
      console.error('Restock failed:', e)
    }
  }

  // Add Menu Item
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!menuForm.name) return

    const item: MenuItem = {
      id: Date.now(),
      outlet_id: activeOutletId,
      name: menuForm.name,
      price: Number(menuForm.price),
      category: menuForm.category,
      is_veg: menuForm.is_veg,
      stock_qty: Number(menuForm.stock_qty),
      available: true
    }

    setMenuItems(prev => [item, ...prev])
    setShowAddMenuModal(false)

    try {
      await supabase.from('menu_items').insert({
        outlet_id: activeOutletId,
        name: menuForm.name,
        price: Number(menuForm.price),
        category: menuForm.category,
        is_veg: menuForm.is_veg,
        stock_qty: Number(menuForm.stock_qty),
        available: true
      })
      setNotice(`Added "${menuForm.name}" to menu catalog.`)
      setTimeout(() => setNotice(null), 3500)
    } catch (e) {
      console.error('Failed to insert menu item:', e)
    }
  }

  // Delete Menu Item
  const handleDeleteMenuItem = async (itemId: number, name: string) => {
    if (!window.confirm(`Delete "${name}" from outlet menu?`)) return
    setMenuItems(prev => prev.filter(i => i.id !== itemId))
    try {
      await supabase.from('menu_items').delete().eq('id', itemId)
    } catch (e) {
      console.error('Failed to delete item:', e)
    }
  }

  // Add Staff Member
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffForm.full_name || !staffForm.phone) return
    const newStaff: StaffMember = {
      id: `st-${Date.now()}`,
      full_name: staffForm.full_name,
      phone: staffForm.phone,
      role: staffForm.role,
      is_active: true,
      created_at: new Date().toISOString().split('T')[0]
    }
    setStaffList(prev => [...prev, newStaff])
    setShowAddStaffModal(false)
    setStaffForm({ full_name: '', phone: '', role: 'Counter Cashier' })
    setNotice(`Staff member "${newStaff.full_name}" registered.`)
    setTimeout(() => setNotice(null), 3000)
  }

  // Toggle Staff Active
  const handleToggleStaff = (staffId: string) => {
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, is_active: !s.is_active } : s))
  }

  // Toggle Slot Active
  const handleToggleSlot = (slotId: string) => {
    setPickupSlots(prev => prev.map(s => s.id === slotId ? { ...s, is_active: !s.is_active } : s))
  }

  // Punch POS Order
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
      customer_name: posCustomerName.trim() || 'Admin Walk-in',
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
    setNotice(`POS Order punched! Token #${token} generated.`)
    setTimeout(() => setNotice(null), 3500)

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

  // Export CSV Helper
  const handleExportOrdersCsv = () => {
    const headers = ['Order ID', 'Token', 'Status', 'Payment Method', 'Total', 'Time']
    const rows = localOrders.map(o => [
      o.id,
      o.token || '',
      o.status,
      o.payment_method || '',
      o.total,
      new Date(o.created_at).toLocaleString('en-IN')
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vfoods-outlet-${activeOutletId}-orders.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Calculated Metrics
  const totalRevenue = localOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0)
  const platformFee = Math.round(totalRevenue * 0.05)
  const netEarnings = totalRevenue - platformFee
  const activeKitchenCount = localOrders.filter(o => o.status === 'placed' || o.status === 'preparing').length
  const completedCount = localOrders.filter(o => o.status === 'collected').length
  const lowStockCount = menuItems.filter(i => (i.stock_qty ?? 10) <= 5).length

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return localOrders.filter(o => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false
      if (searchOrderQuery) {
        const q = searchOrderQuery.toLowerCase()
        const matchToken = (o.token || '').toLowerCase().includes(q)
        const matchId = String(o.id).includes(q)
        const matchCust = (o.customer_name || '').toLowerCase().includes(q)
        return matchToken || matchId || matchCust
      }
      return true
    })
  }, [localOrders, orderStatusFilter, searchOrderQuery])

  return (
    <div className="saas-layout">
      {/* ── LEFT SIDEBAR (Shop Admin's Exact 12 Sections) ── */}
      <aside className="saas-sidebar">
        {/* Brand */}
        <div className="saas-sidebar-brand">
          <div className="saas-brand-wrap">
            <img src="/vit-chennai-logo.png" alt="V Foods" className="saas-brand-img" />
            <span className="saas-brand-text">V-<span>FOODS</span></span>
          </div>
          <span className="saas-role-badge saas-role-owner">Shop Admin</span>
        </div>

        {/* Current Outlet & Operational Status */}
        <div className="saas-sidebar-outlet">
          <span className="saas-outlet-label">
            <Store size={11} /> Franchise Outlet
          </span>
          <div className="saas-outlet-name" title={currentOutlet.name}>
            {currentOutlet.name}
          </div>
          <div className="saas-outlet-status">
            <span className={`saas-status-dot ${outletStatus === 'open' ? 'online' : outletStatus === 'rush' ? 'rush' : 'paused'}`} />
            <span style={{
              color: outletStatus === 'open' ? '#22C55E' : outletStatus === 'rush' ? '#F59E0B' : '#EF4444',
              fontWeight: 600
            }}>
              {outletStatus === 'open' ? 'Kitchen Open' : outletStatus === 'rush' ? 'Rush Buffer (+10m)' : 'Store Paused'}
            </span>
          </div>
        </div>

        {/* Navigation Menu (12 Sections Strictly Matching Specification) */}
        <nav className="saas-nav">
          <button
            className={`saas-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <div className="saas-nav-item-left">
              <LayoutDashboard size={15} />
              <span>Overview</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'live-orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('live-orders')}
          >
            <div className="saas-nav-item-left">
              <Clock size={15} />
              <span>Live Orders</span>
            </div>
            {activeKitchenCount > 0 && (
              <span className="saas-nav-badge">{activeKitchenCount}</span>
            )}
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'kds' ? 'active' : ''}`}
            onClick={() => setActiveTab('kds')}
          >
            <div className="saas-nav-item-left">
              <ChefHat size={15} />
              <span>KDS / Kitchen</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'menu-items' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu-items')}
          >
            <div className="saas-nav-item-left">
              <UtensilsCrossed size={15} />
              <span>Menu & Items</span>
            </div>
            <span className="saas-nav-badge">{menuItems.length}</span>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <div className="saas-nav-item-left">
              <Boxes size={15} />
              <span>Inventory</span>
            </div>
            {lowStockCount > 0 && (
              <span className="saas-nav-badge" style={{ background: '#DC2626', color: '#FFF' }}>
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <div className="saas-nav-item-left">
              <Calculator size={15} />
              <span>POS Counter</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'pickup-slots' ? 'active' : ''}`}
            onClick={() => setActiveTab('pickup-slots')}
          >
            <div className="saas-nav-item-left">
              <CalendarClock size={15} />
              <span>Pickup Slots</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            <div className="saas-nav-item-left">
              <Users size={15} />
              <span>Staff</span>
            </div>
            <span className="saas-nav-badge">{staffList.filter(s => s.is_active).length}</span>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'sales-revenue' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales-revenue')}
          >
            <div className="saas-nav-item-left">
              <TrendingUp size={15} />
              <span>Sales & Revenue</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'settlements' ? 'active' : ''}`}
            onClick={() => setActiveTab('settlements')}
          >
            <div className="saas-nav-item-left">
              <Receipt size={15} />
              <span>Settlements</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <div className="saas-nav-item-left">
              <FileSpreadsheet size={15} />
              <span>Reports</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'shop-settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop-settings')}
          >
            <div className="saas-nav-item-left">
              <Settings size={15} />
              <span>Shop Settings</span>
            </div>
          </button>
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="saas-sidebar-footer">
          <div className="saas-user-meta">
            <span className="saas-user-name">{currentUser?.full_name || 'Outlet Admin'}</span>
            <span className="saas-user-role-label">Shop Admin</span>
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

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <main className="saas-main">
        {/* Topbar */}
        <header className="saas-topbar">
          <div className="saas-breadcrumb">
            <span>Shop Admin Portal</span>
            <ChevronRight size={14} />
            <span className="saas-breadcrumb-title">
              {activeTab === 'overview' && 'Franchise Overview'}
              {activeTab === 'live-orders' && 'Live Kitchen & Online Orders'}
              {activeTab === 'kds' && 'KDS / Kitchen Workflow'}
              {activeTab === 'menu-items' && 'Menu Catalog & Pricing'}
              {activeTab === 'inventory' && 'Inventory & Stock Management'}
              {activeTab === 'pos' && 'Manager POS Register'}
              {activeTab === 'pickup-slots' && 'Pickup Slots & Capacity Limits'}
              {activeTab === 'staff' && 'Outlet Staff Roster & Shifts'}
              {activeTab === 'sales-revenue' && 'Revenue & Sales Metrics'}
              {activeTab === 'settlements' && 'Bank Settlements & Payouts'}
              {activeTab === 'reports' && 'Exportable Business Reports'}
              {activeTab === 'shop-settings' && 'Outlet Hours & Operational Parameters'}
            </span>
          </div>

          <div className="saas-top-actions">
            {/* Quick Kitchen Status Mode */}
            <select
              value={outletStatus}
              onChange={e => setOutletStatus(e.target.value as any)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
                fontWeight: 600,
                background: '#FFFFFF'
              }}
            >
              <option value="open">Operational (Normal)</option>
              <option value="rush">Rush Hour (+10m Buffer)</option>
              <option value="paused">Kitchen Paused</option>
            </select>

            <button
              className="saas-btn saas-btn-secondary saas-btn-sm"
              onClick={loadData}
              disabled={syncing}
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        {/* Notice Banner */}
        {notice && (
          <div style={{
            background: '#1E40AF',
            color: '#FFFFFF',
            padding: '10px 28px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="saas-body">
          {/* ══════════════════════════════════════════════════════════
              TAB 1: OVERVIEW
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Executive KPI Grid (Figma Restaurant Dashboard Style) */}
              <div className="saas-kpi-grid">
                <div className="saas-kpi-card" style={{ padding: '20px' }}>
                  <div className="saas-kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="saas-kpi-title" style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Gross Sales Today</span>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp size={18} className="text-blue-600" />
                    </div>
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#0F172A', fontSize: '26px', fontWeight: 800, margin: '8px 0 6px' }}>
                    {money(totalRevenue)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: '12px' }}>
                      <TrendingUp size={11} /> +9.6% vs yesterday
                    </span>
                    <span className="saas-kpi-sub" style={{ fontSize: '11.5px', color: '#64748B' }}>All payment channels</span>
                  </div>
                </div>

                <div className="saas-kpi-card" style={{ padding: '20px' }}>
                  <div className="saas-kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="saas-kpi-title" style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Net Payout (95%)</span>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Banknote size={18} className="text-emerald-600" />
                    </div>
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#0F172A', fontSize: '26px', fontWeight: 800, margin: '8px 0 6px' }}>
                    {money(netEarnings)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: '12px' }}>
                      <TrendingUp size={11} /> +9.6% net yield
                    </span>
                    <span className="saas-kpi-sub" style={{ fontSize: '11.5px', color: '#64748B' }}>After 5% platform fee</span>
                  </div>
                </div>

                <div className="saas-kpi-card" style={{ padding: '20px' }}>
                  <div className="saas-kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="saas-kpi-title" style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Active Kitchen Load</span>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChefHat size={18} className="text-amber-600" />
                    </div>
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#0F172A', fontSize: '26px', fontWeight: 800, margin: '8px 0 6px' }}>
                    {activeKitchenCount}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: '#C2410C', background: '#FFEDD5', padding: '2px 8px', borderRadius: '12px' }}>
                      <Clock size={11} /> Live Prep Queue
                    </span>
                    <span className="saas-kpi-sub" style={{ fontSize: '11.5px', color: '#64748B' }}>Currently in kitchen</span>
                  </div>
                </div>

                <div className="saas-kpi-card" style={{ padding: '20px' }}>
                  <div className="saas-kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="saas-kpi-title" style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Completed Orders</span>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={18} className="text-slate-700" />
                    </div>
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#0F172A', fontSize: '26px', fontWeight: 800, margin: '8px 0 6px' }}>
                    {completedCount}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: '12px' }}>
                      <TrendingUp size={11} /> +8.6% completion
                    </span>
                    <span className="saas-kpi-sub" style={{ fontSize: '11.5px', color: '#64748B' }}>Fulfilled today</span>
                  </div>
                </div>
              </div>

              {/* Operations Banner */}
              <div className="saas-card" style={{ padding: '18px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Franchise Kitchen Control</h3>
                    <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0' }}>
                      Current status: <strong>{outletStatus === 'open' ? 'Accepting Online Orders' : outletStatus === 'rush' ? 'Rush Hour +10m prep notice active' : 'Online ordering paused'}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="saas-btn saas-btn-primary" onClick={() => setActiveTab('menu-items')}>
                      <UtensilsCrossed size={15} />
                      <span>Manage Menu</span>
                    </button>
                    <button className="saas-btn saas-btn-secondary" onClick={() => setActiveTab('live-orders')}>
                      <Clock size={15} />
                      <span>Live Order Feed</span>
                    </button>
                    <button className="saas-btn saas-btn-secondary" onClick={() => setActiveTab('settlements')}>
                      <Receipt size={15} />
                      <span>Settlements Ledger</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Savvy HRMS: Kitchen Batch Prep & Demand Forecast */}
              <div className="saas-card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ChefHat size={18} className="text-orange-600" />
                      <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                        Kitchen Batch Prep & Demand Forecast
                      </h3>
                      <span style={{ fontSize: '11px', color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        Waste Prevention Target: -22%
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0' }}>
                      Calculated from current running tickets, pre-order reservations, and historical cafeteria peak demand.
                    </p>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#475569', background: '#F1F5F9', padding: '6px 12px', borderRadius: '6px', fontWeight: 600 }}>
                    Active Meal Window: <strong>Lunch (11:30 AM – 3:00 PM)</strong>
                  </div>
                </div>

                {/* Batch Forecast Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="saas-table" style={{ fontSize: '12.5px' }}>
                    <thead>
                      <tr>
                        <th>Item & Station</th>
                        <th>Meal Window</th>
                        <th>Live Demand</th>
                        <th>Recommended Prep Batch</th>
                        <th>Station Guidance</th>
                        <th>Waste Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>Veg Puff & Samosa</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Snack Fryer Station</div>
                        </td>
                        <td><span className="saas-badge saas-badge-neutral">Snack / Lunch</span></td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{Math.max(12, activeKitchenCount * 3)} units</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#1E40AF' }}>Prep batch of 25 units</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11.5px', color: '#166534', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Optimal Warm Holding
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11.5px', color: '#15803D', fontWeight: 600 }}>Low (High turnover)</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>Special Chicken Biryani</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Dum Rice Station</div>
                        </td>
                        <td><span className="saas-badge saas-badge-info">Lunch Peak</span></td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{Math.max(18, activeKitchenCount * 4)} portions</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#1E40AF' }}>Prep 1 pot (35 portions)</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11.5px', color: '#C2410C', background: '#FFEDD5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Stage 1 Pot by 12:15 PM
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11.5px', color: '#B45309', fontWeight: 600 }}>Controlled via tokens</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>Paneer Butter Masala Combo</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Curry & Gravy Station</div>
                        </td>
                        <td><span className="saas-badge saas-badge-info">Lunch Peak</span></td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{Math.max(10, activeKitchenCount * 2)} portions</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#1E40AF' }}>Prep 15 portions buffer</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11.5px', color: '#166534', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Base gravy ready
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11.5px', color: '#15803D', fontWeight: 600 }}>Low (Re-usable base)</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>Cold Beverages & Juices</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Beverage Counter</div>
                        </td>
                        <td><span className="saas-badge saas-badge-neutral">All-Day</span></td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{Math.max(22, completedCount + 5)} cups</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#1E40AF' }}>Continuous on-demand</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11.5px', color: '#1E40AF', background: '#DBEAFE', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Pre-chill pulp & syrups
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11.5px', color: '#15803D', fontWeight: 600 }}>Near Zero</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Best Sellers and Live Activity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                {/* Recent Orders Stream */}
                <div className="saas-card">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Live Active Queue</h4>
                    <button className="saas-btn saas-btn-secondary saas-btn-sm" onClick={() => setActiveTab('live-orders')}>
                      View All
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
                        </tr>
                      </thead>
                      <tbody>
                        {localOrders.slice(0, 5).map(o => (
                          <tr key={o.id}>
                            <td style={{ fontWeight: 800, fontFamily: 'monospace' }}>#{o.token || o.id}</td>
                            <td style={{ fontSize: '12.5px', color: '#334155' }}>
                              {(o.order_items || []).map(i => `${i.name}×${i.qty}`).join(', ') || 'Walk-in'}
                            </td>
                            <td style={{ fontSize: '12px', color: '#64748B' }}>{formatElapsed(o.created_at)}</td>
                            <td style={{ fontWeight: 700 }}>{money(o.total)}</td>
                            <td>
                              <span className={`saas-badge ${
                                o.status === 'placed' ? 'saas-badge-warning' :
                                o.status === 'preparing' ? 'saas-badge-info' :
                                o.status === 'ready' ? 'saas-badge-success' : 'saas-badge-neutral'
                              }`}>
                                {o.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Best Selling Items */}
                <div className="saas-card" style={{ padding: '18px 20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px' }}>Top Selling Items (Today)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {menuItems.slice(0, 5).map((item, idx) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', width: '16px' }}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{money(item.price)} • In stock: {item.stock_qty ?? 10}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#16A34A' }}>
                          {item.available ? 'In Stock' : 'Sold Out'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: LIVE ORDERS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'live-orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="saas-card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['all', 'placed', 'preparing', 'ready', 'collected', 'cancelled'] as const).map(st => (
                      <button
                        key={st}
                        className={`saas-btn saas-btn-sm ${orderStatusFilter === st ? 'saas-btn-primary' : 'saas-btn-secondary'}`}
                        onClick={() => setOrderStatusFilter(st)}
                      >
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="Search token or student..."
                      value={searchOrderQuery}
                      onChange={e => setSearchOrderQuery(e.target.value)}
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

              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Token #</th>
                        <th>Student / Items</th>
                        <th>Placed</th>
                        <th>Method</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(order => (
                        <tr key={order.id}>
                          <td>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '14px',
                              fontFamily: 'monospace',
                              padding: '3px 8px',
                              background: '#F1F5F9',
                              borderRadius: '4px',
                              color: '#0F172A'
                            }}>
                              #{order.token || order.id}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{order.customer_name}</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              {(order.order_items || []).map(i => `${i.name} (×${i.qty})`).join(', ') || 'Counter Order'}
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748B' }}>{formatElapsed(order.created_at)}</td>
                          <td style={{ fontSize: '12px' }}>{order.payment_method || 'Online UPI'}</td>
                          <td style={{ fontWeight: 700 }}>{money(order.total)}</td>
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
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {order.status === 'placed' && (
                                <button className="saas-btn saas-btn-primary saas-btn-sm" onClick={() => handleAdvanceStatus(order.id, 'placed')}>
                                  Prep
                                </button>
                              )}
                              {order.status === 'preparing' && (
                                <button className="saas-btn saas-btn-success saas-btn-sm" onClick={() => handleAdvanceStatus(order.id, 'preparing')}>
                                  Ready
                                </button>
                              )}
                              {order.status === 'ready' && (
                                <button className="saas-btn saas-btn-secondary saas-btn-sm" onClick={() => handleAdvanceStatus(order.id, 'ready')}>
                                  Deliver
                                </button>
                              )}
                              {order.status !== 'cancelled' && order.status !== 'collected' && (
                                <button
                                  className="saas-btn saas-btn-danger saas-btn-sm"
                                  onClick={() => handleCancelOrder(order.id)}
                                  title="Cancel and refund"
                                >
                                  Cancel
                                </button>
                              )}
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
              TAB 3: KDS / KITCHEN
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'kds' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Kitchen Display System (KDS)</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Live cook line order tickets & timers</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setAutoAcceptRushMode(!autoAcceptRushMode)}
                    className={`saas-btn saas-btn-sm ${autoAcceptRushMode ? 'saas-btn-primary' : 'saas-btn-secondary'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: autoAcceptRushMode ? '#2563EB' : '#FFFFFF',
                      borderColor: autoAcceptRushMode ? '#1D4ED8' : '#CBD5E1',
                      color: autoAcceptRushMode ? '#FFFFFF' : '#475569'
                    }}
                    title="Automatically accept and move new placed orders to cooking during rush periods"
                  >
                    <FastForward size={13} />
                    <span>Auto-Accept Rush: {autoAcceptRushMode ? 'Active' : 'Off'}</span>
                  </button>
                  <button className="saas-btn saas-btn-secondary saas-btn-sm" onClick={loadData}>
                    <RefreshCw size={13} />
                    <span>Sync Tickets</span>
                  </button>
                </div>
              </div>

              {/* Live Batch Prep Summary Bar (Aggregated Cook Queue) */}
              {activePrepItems.length > 0 && (
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={14} style={{ color: '#2563EB' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Live Batch Prep Aggregator ({activePrepItems.reduce((acc, i) => acc + i.qty, 0)} total units across active orders)
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Cook in batches to clear peak line bottlenecks
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activePrepItems.map((item, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#0F172A'
                        }}
                      >
                        <span style={{ color: '#2563EB', fontWeight: 800 }}>{item.qty}×</span>
                        <span>{item.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="saas-kds-grid">
                {/* Placed */}
                <div className="saas-kds-col">
                  <div className="saas-kds-col-header" style={{ borderLeft: '4px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} className="text-amber-500" />
                      <span style={{ fontWeight: 700 }}>1. Placed / New Orders</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="saas-badge saas-badge-warning">{localOrders.filter(o => o.status === 'placed').length}</span>
                      {localOrders.filter(o => o.status === 'placed').length > 1 && (
                        <button
                          type="button"
                          onClick={handleStartCookingAll}
                          className="saas-btn saas-btn-sm"
                          style={{
                            background: '#F59E0B',
                            borderColor: '#D97706',
                            color: '#FFFFFF',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: '4px'
                          }}
                          title="Move all new orders to cooking in one click"
                        >
                          <FastForward size={11} />
                          <span>Start All ({localOrders.filter(o => o.status === 'placed').length})</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="saas-kds-list">
                    {localOrders.filter(o => o.status === 'placed').map(o => (
                      <div key={o.id} className="saas-ticket">
                        <div className="saas-ticket-header">
                          <span className="saas-ticket-token">#{o.token || o.id}</span>
                          <span className="saas-ticket-time">{formatElapsed(o.created_at)}</span>
                        </div>
                        <div className="saas-ticket-items">
                          {(o.order_items || []).map((item, idx) => (
                            <div key={idx} className="saas-ticket-item-row">
                              <span className="saas-ticket-item-name">{item.name}</span>
                              <span className="saas-ticket-item-qty">×{item.qty}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          className="saas-btn saas-btn-primary saas-btn-sm"
                          style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
                          onClick={() => handleAdvanceStatus(o.id, 'placed')}
                        >
                          Start Cooking →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preparing */}
                <div className="saas-kds-col">
                  <div className="saas-kds-col-header" style={{ borderLeft: '4px solid #3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ChefHat size={15} className="text-blue-500" />
                      <span style={{ fontWeight: 700 }}>2. In Prep / Cooking</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="saas-badge saas-badge-info">{localOrders.filter(o => o.status === 'preparing').length}</span>
                      {localOrders.filter(o => o.status === 'preparing').length > 1 && (
                        <button
                          type="button"
                          onClick={handleMarkAllCookingReady}
                          className="saas-btn saas-btn-sm"
                          style={{
                            background: '#10B981',
                            borderColor: '#059669',
                            color: '#FFFFFF',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            borderRadius: '4px'
                          }}
                          title="Mark all active cooking orders as ready for pickup"
                        >
                          <CheckCheck size={11} />
                          <span>Ready All ({localOrders.filter(o => o.status === 'preparing').length})</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="saas-kds-list">
                    {localOrders.filter(o => o.status === 'preparing').map(o => (
                      <div key={o.id} className="saas-ticket">
                        <div className="saas-ticket-header">
                          <span className="saas-ticket-token">#{o.token || o.id}</span>
                          <span className="saas-ticket-time">{formatElapsed(o.created_at)}</span>
                        </div>
                        <div className="saas-ticket-items">
                          {(o.order_items || []).map((item, idx) => (
                            <div key={idx} className="saas-ticket-item-row">
                              <span className="saas-ticket-item-name">{item.name}</span>
                              <span className="saas-ticket-item-qty">×{item.qty}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          className="saas-btn saas-btn-success saas-btn-sm"
                          style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
                          onClick={() => handleAdvanceStatus(o.id, 'preparing')}
                        >
                          Mark Ready →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ready */}
                <div className="saas-kds-col">
                  <div className="saas-kds-col-header" style={{ borderLeft: '4px solid #10B981' }}>
                    <span style={{ fontWeight: 700 }}>3. Ready for Collection</span>
                    <span className="saas-badge saas-badge-success">{localOrders.filter(o => o.status === 'ready').length}</span>
                  </div>
                  <div className="saas-kds-list">
                    {localOrders.filter(o => o.status === 'ready').map(o => (
                      <div key={o.id} className="saas-ticket">
                        <div className="saas-ticket-header">
                          <span className="saas-ticket-token" style={{ color: '#16A34A' }}>#{o.token || o.id}</span>
                          <span className="saas-ticket-time">{formatElapsed(o.created_at)}</span>
                        </div>
                        <div className="saas-ticket-items">
                          {(o.order_items || []).map((item, idx) => (
                            <div key={idx} className="saas-ticket-item-row">
                              <span className="saas-ticket-item-name">{item.name}</span>
                              <span className="saas-ticket-item-qty">×{item.qty}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          className="saas-btn saas-btn-secondary saas-btn-sm"
                          style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
                          onClick={() => handleAdvanceStatus(o.id, 'ready')}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Confirm Handover <Check size={14} />
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 4: MENU & ITEMS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'menu-items' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Outlet Menu Catalog</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Manage prices, category categorization, and availability</p>
                </div>
                <button className="saas-btn saas-btn-primary" onClick={() => setShowAddMenuModal(true)}>
                  <Plus size={15} />
                  <span>Add New Menu Item</span>
                </button>
              </div>

              {/* Menu Table */}
              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Dietary</th>
                        <th>Price</th>
                        <th>Stock Qty</th>
                        <th>Online Availability</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuItems.map(item => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>{item.name}</div>
                          </td>
                          <td style={{ textTransform: 'capitalize', fontSize: '12px' }}>{item.category}</td>
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
                          <td style={{ fontWeight: 700 }}>{money(item.price)}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: (item.stock_qty ?? 10) <= 5 ? '#DC2626' : '#0F172A' }}>
                              {item.stock_qty ?? 10}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => handleToggleAvailability(item.id, item.available)}
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
                              {item.available ? 'Available' : 'Disabled'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="saas-btn saas-btn-danger saas-btn-sm"
                              onClick={() => handleDeleteMenuItem(item.id, item.name)}
                              title="Delete from menu"
                            >
                              <Trash2 size={13} />
                            </button>
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
              TAB 5: INVENTORY
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'inventory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Inventory & Stock Control</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Track batch replenishments and stock depletion</p>
                </div>
              </div>

              {lowStockCount > 0 && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} />
                  <span><strong>{lowStockCount} items</strong> are critically low on stock (≤ 5 remaining). Please restock below.</span>
                </div>
              )}

              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Current Count</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Quick Restock Additions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuItems.map(item => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 700 }}>{item.name}</td>
                          <td style={{ textTransform: 'capitalize', fontSize: '12px' }}>{item.category}</td>
                          <td style={{ fontWeight: 800, fontSize: '14px' }}>{item.stock_qty ?? 10}</td>
                          <td>
                            {(item.stock_qty ?? 10) <= 0 ? (
                              <span className="saas-badge saas-badge-danger">Out of Stock</span>
                            ) : (item.stock_qty ?? 10) <= 5 ? (
                              <span className="saas-badge saas-badge-warning">Low Stock</span>
                            ) : (
                              <span className="saas-badge saas-badge-success">Healthy</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button className="saas-btn saas-btn-secondary saas-btn-sm" onClick={() => handleRestock(item.id, 10)}>
                                +10
                              </button>
                              <button className="saas-btn saas-btn-secondary saas-btn-sm" onClick={() => handleRestock(item.id, 25)}>
                                +25
                              </button>
                              <button className="saas-btn saas-btn-secondary saas-btn-sm" onClick={() => handleRestock(item.id, 50)}>
                                +50
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
              TAB 6: POS COUNTER
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'pos' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
              <div>
                <div className="saas-card" style={{ padding: '14px 18px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Manager Walk-In Register</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Tap any item to punch walk-in counter sales</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {menuItems.filter(i => i.available).map(item => {
                    const inCart = posCart[item.id] || 0
                    return (
                      <div
                        key={item.id}
                        className="saas-card"
                        style={{
                          padding: '14px',
                          cursor: 'pointer',
                          border: inCart > 0 ? '2px solid #1E40AF' : '1px solid #E2E8F0'
                        }}
                        onClick={() => setPosCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E40AF' }}>{money(item.price)}</span>
                          {inCart > 0 && (
                            <span style={{ background: '#1E40AF', color: '#FFF', fontSize: '11px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>
                              ×{inCart}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* POS Cart Sidebar */}
              <div className="saas-card" style={{ padding: '18px', height: 'fit-content' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  Walk-in Order Cart
                </h4>

                <input
                  type="text"
                  placeholder="Customer Name / Roll (Optional)"
                  value={posCustomerName}
                  onChange={e => setPosCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', marginBottom: '12px' }}
                />

                <div style={{ minHeight: '120px', maxHeight: '220px', overflowY: 'auto', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  {Object.keys(posCart).map(idStr => {
                    const id = Number(idStr)
                    const item = menuItems.find(m => m.id === id)
                    const qty = posCart[id]
                    if (qty <= 0) return null
                    return (
                      <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{item?.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{money(item?.price || 0)}</div>
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
                            -
                          </button>
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{qty}</span>
                          <button
                            className="saas-btn saas-btn-secondary saas-btn-sm"
                            style={{ padding: '2px 6px' }}
                            onClick={() => setPosCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(posCart).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: '12.5px' }}>
                      Tap items on the left to add.
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px 0' }}>
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

                  <div style={{ marginTop: '10px' }}>
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

                <button
                  className="saas-btn saas-btn-success"
                  style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                  disabled={Object.keys(posCart).length === 0}
                  onClick={handlePunchPosOrder}
                >
                  Punch Walk-In Order
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 7: PICKUP SLOTS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'pickup-slots' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Pickup Time Slots & Throttling</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Limit scheduled orders per 15-minute slot to prevent counter congestion</p>
                </div>
              </div>

              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Time Window</th>
                        <th>Max Capacity</th>
                        <th>Booked / Allocated</th>
                        <th>Load %</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Toggle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickupSlots.map(slot => {
                        const pct = Math.round((slot.booked_count / slot.max_orders) * 100)
                        return (
                          <tr key={slot.id}>
                            <td style={{ fontWeight: 700 }}>{slot.slot_time}</td>
                            <td>{slot.max_orders} orders max</td>
                            <td style={{ fontWeight: 700 }}>{slot.booked_count} orders</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '80px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? '#DC2626' : pct >= 70 ? '#F59E0B' : '#16A34A' }} />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 600 }}>{pct}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`saas-badge ${slot.is_active ? 'saas-badge-success' : 'saas-badge-neutral'}`}>
                                {slot.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="saas-btn saas-btn-secondary saas-btn-sm"
                                onClick={() => handleToggleSlot(slot.id)}
                              >
                                {slot.is_active ? 'Disable' : 'Enable'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 8: STAFF
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'staff' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Outlet Staff Directory</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Manage assigned counter operators, cooks, and credentials</p>
                </div>
                <button className="saas-btn saas-btn-primary" onClick={() => setShowAddStaffModal(true)}>
                  <Plus size={15} />
                  <span>Add Staff Member</span>
                </button>
              </div>

              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Staff Name</th>
                        <th>Mobile Number</th>
                        <th>Assigned Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map(st => (
                        <tr key={st.id}>
                          <td style={{ fontWeight: 700 }}>{st.full_name}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{st.phone}</td>
                          <td>
                            <span style={{ fontSize: '12px', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                              {st.role}
                            </span>
                          </td>
                          <td>
                            <span className={`saas-badge ${st.is_active ? 'saas-badge-success' : 'saas-badge-neutral'}`}>
                              {st.is_active ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748B' }}>{st.created_at}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="saas-btn saas-btn-secondary saas-btn-sm"
                              onClick={() => handleToggleStaff(st.id)}
                            >
                              {st.is_active ? 'Deactivate' : 'Activate'}
                            </button>
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
              TAB 9: SALES & REVENUE
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'sales-revenue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="saas-kpi-grid">
                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Gross Revenue Today</span>
                    <TrendingUp size={16} className="text-blue-600" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#1E40AF' }}>{money(totalRevenue)}</div>
                  <div className="saas-kpi-sub">Total billed to customers</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Platform Fee (5%)</span>
                    <Percent size={16} className="text-amber-500" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#D97706' }}>{money(platformFee)}</div>
                  <div className="saas-kpi-sub">V Foods infrastructure charge</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Net Franchise Earnings</span>
                    <Banknote size={16} className="text-emerald-600" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#15803D' }}>{money(netEarnings)}</div>
                  <div className="saas-kpi-sub">Disbursed to your registered account</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Average Order Value</span>
                    <Calculator size={16} className="text-slate-600" />
                  </div>
                  <div className="saas-kpi-value">
                    {money(localOrders.length > 0 ? Math.round(totalRevenue / localOrders.length) : 0)}
                  </div>
                  <div className="saas-kpi-sub">Per ticket average</div>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="saas-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px' }}>Revenue by Payment Channel</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '14px', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>Online UPI (QR / Apps)</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0' }}>{money(Math.round(totalRevenue * 0.72))}</div>
                    <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>72% share</span>
                  </div>

                  <div style={{ padding: '14px', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>Student Meal Wallet</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0' }}>{money(Math.round(totalRevenue * 0.20))}</div>
                    <span style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 700 }}>20% share</span>
                  </div>

                  <div style={{ padding: '14px', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>Counter Cash / POS</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0' }}>{money(Math.round(totalRevenue * 0.08))}</div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>8% share</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 10: SETTLEMENTS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'settlements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Daily Bank Settlements</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Automated T+1 NEFT/IMPS transfers to franchise bank account</p>
                </div>
                <button className="saas-btn saas-btn-primary saas-btn-sm" onClick={() => {
                  setNotice('Payout request received. Next disbursement cycle runs at 11:30 PM.')
                  setTimeout(() => setNotice(null), 4000)
                }}>
                  Request On-Demand Settlement
                </button>
              </div>

              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Gross Sales</th>
                        <th>Platform Fee (5%)</th>
                        <th>Net Payout</th>
                        <th>Disbursement Status</th>
                        <th>Bank UTR / Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map(set => (
                        <tr key={set.id}>
                          <td style={{ fontWeight: 700 }}>{set.date}</td>
                          <td>{money(set.gross_sales)}</td>
                          <td style={{ color: '#D97706' }}>-{money(set.commission)}</td>
                          <td style={{ fontWeight: 800, color: '#15803D' }}>{money(set.net_payout)}</td>
                          <td>
                            <span className={`saas-badge ${set.status === 'transferred' ? 'saas-badge-success' : 'saas-badge-warning'}`}>
                              {set.status === 'transferred' ? 'DISBURSED' : 'PENDING'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748B' }}>{set.reference_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 11: REPORTS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="saas-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Exportable Operations & Tax Reports</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>Generate clean CSV and Excel files for accounting and inventory audits</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>Orders & Revenue Summary</h4>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px' }}>Contains order ID, token, status, items list, and billing total.</p>
                    <button className="saas-btn saas-btn-primary saas-btn-sm" onClick={handleExportOrdersCsv}>
                      <Download size={13} />
                      <span>Download Orders CSV</span>
                    </button>
                  </div>

                  <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>Menu & Stock Inventory Report</h4>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px' }}>Catalog list with retail prices, category breakdown, and current stock.</p>
                    <button className="saas-btn saas-btn-secondary saas-btn-sm" onClick={() => {
                      const csv = ['Item,Category,Price,Stock', ...menuItems.map(i => `"${i.name}","${i.category}",${i.price},${i.stock_qty ?? 10}`)].join('\n')
                      const blob = new Blob([csv], { type: 'text/csv' })
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = `vfoods-menu-${activeOutletId}.csv`
                      a.click()
                    }}>
                      <Download size={13} />
                      <span>Download Menu CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 12: SHOP SETTINGS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'shop-settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="saas-card" style={{ padding: '24px', maxWidth: '680px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Franchise Operational Parameters</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 20px' }}>Configure hours, prep delay buffers, and outlet information</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Outlet Display Name
                    </label>
                    <input
                      type="text"
                      defaultValue={currentOutlet.name}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Opening Time
                      </label>
                      <input
                        type="time"
                        defaultValue="08:30"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Closing Time
                      </label>
                      <input
                        type="time"
                        defaultValue="22:30"
                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Standard Prep Time Buffer (Mins)
                    </label>
                    <input
                      type="number"
                      defaultValue="12"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="saas-btn saas-btn-primary"
                      onClick={() => {
                        setNotice('Shop parameters saved successfully.')
                        setTimeout(() => setNotice(null), 3000)
                      }}
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── ADD MENU ITEM MODAL ── */}
      {showAddMenuModal && (
        <div className="saas-modal-backdrop" onClick={() => setShowAddMenuModal(false)}>
          <div className="saas-modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 className="saas-modal-title">Add Menu Item</h3>
              <button className="saas-modal-close" onClick={() => setShowAddMenuModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveMenuItem} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masala Dosa"
                  value={menuForm.name}
                  onChange={e => setMenuForm(prev => ({ ...prev, name: e.target.value }))}
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
                    value={menuForm.price}
                    onChange={e => setMenuForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={menuForm.category}
                    onChange={e => setMenuForm(prev => ({ ...prev, category: e.target.value }))}
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
                    Dietary Classification
                  </label>
                  <select
                    value={menuForm.is_veg ? 'veg' : 'non-veg'}
                    onChange={e => setMenuForm(prev => ({ ...prev, is_veg: e.target.value === 'veg' }))}
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
                    value={menuForm.stock_qty}
                    onChange={e => setMenuForm(prev => ({ ...prev, stock_qty: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="saas-btn saas-btn-secondary" onClick={() => setShowAddMenuModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="saas-btn saas-btn-primary">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD STAFF MODAL ── */}
      {showAddStaffModal && (
        <div className="saas-modal-backdrop" onClick={() => setShowAddStaffModal(false)}>
          <div className="saas-modal-card" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 className="saas-modal-title">Add Staff Member</h3>
              <button className="saas-modal-close" onClick={() => setShowAddStaffModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveStaff} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={staffForm.full_name}
                  onChange={e => setStaffForm(prev => ({ ...prev, full_name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876541004"
                  value={staffForm.phone}
                  onChange={e => setStaffForm(prev => ({ ...prev, phone: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Role Assignment
                </label>
                <select
                  value={staffForm.role}
                  onChange={e => setStaffForm(prev => ({ ...prev, role: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                >
                  <option value="Counter Cashier">Counter Cashier</option>
                  <option value="Kitchen Lead">Kitchen Lead</option>
                  <option value="Prep Cook">Prep Cook</option>
                  <option value="Delivery Dispatcher">Delivery Dispatcher</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="saas-btn saas-btn-secondary" onClick={() => setShowAddStaffModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="saas-btn saas-btn-primary">
                  Register Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShopAdminDashboard
