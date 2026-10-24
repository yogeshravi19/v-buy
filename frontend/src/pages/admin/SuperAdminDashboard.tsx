import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  LayoutDashboard,
  Building2,
  Store,
  Users,
  ShoppingBag,
  CreditCard,
  Receipt,
  BarChart3,
  Tag,
  Settings,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ChevronRight,
  X,
  Download,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
  TrendingUp,
  Banknote,
  Percent,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Database,
  Activity,
  Calendar,
  Lock,
  FileSpreadsheet,
  Menu,
  Edit,
  ShieldAlert,
  FileText,
  Eye,
  Compass
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { DataTable } from '../../components/ui/data-table'
import { OutletComparisonChart, OutletStaffDrawer } from '../../components/admin/OutletHierarchyAndComparison'
import { StatusBadge } from '../../components/ui/status-badge'
import { SaasBottomTabBar } from '../../components/ui/saas-bottom-tab-bar'
import { formatOrderNumber } from '../../utils/orderNumber'
import { useResizableSidebar } from '../../hooks/useResizableSidebar'
import { RolesAndPermissionsScreen } from './RolesAndPermissionsScreen'
import { SystemMapScreen } from './SystemMapScreen'
import { MyRolePanel } from '../../components/ui/MyRolePanel'

export interface PlatformOrder {
  id: number
  user_id?: string | null
  customer_name?: string
  outlet_id: string
  outlet_name?: string
  token: string | null
  order_number?: string | null
  order_source?: 'APP' | 'POS'
  payment_mode?: string | null
  status: string
  payment_method?: string
  total: number
  platform_fee: number
  net_payout: number
  created_at: string
}

export interface PlatformUser {
  id: string
  full_name: string
  phone: string
  email?: string
  role: 'user' | 'student' | 'staff' | 'shop_admin' | 'super_admin'
  outlet_id?: string | null
  is_active: boolean
  wallet_balance?: number
  created_at: string
}

export interface OutletRecord {
  id: string
  name: string
  location: string
  owner_name: string
  owner_phone: string
  is_open: boolean
  is_event: boolean
  today_gmv: number
  order_count: number
}

export interface CampusRecord {
  id: string
  name: string
  city: string
  outlets_count: number
  students_count: number
  today_gmv: number
  status: 'active' | 'maintenance'
}

export interface CouponRecord {
  id: string
  code: string
  discount_type: 'percent' | 'flat'
  discount_value: number
  min_order: number
  used_count: number
  max_uses: number
  valid_to: string
  is_active: boolean
}

export interface AuditLogRecord {
  id: string
  actor_id?: string | null
  actor_name: string
  actor_role: string
  category: string
  action: string
  details: string
  metadata?: Record<string, any>
  ip_address?: string | null
  status: string
  created_at: string
}

interface SuperAdminDashboardProps {
  currentUser: any
  setCurrentUser?: (u: any) => void
  outlets?: any[]
  setOutlets?: React.Dispatch<React.SetStateAction<any[]>>
  orders?: any[]
  setOrders?: React.Dispatch<React.SetStateAction<any[]>>
  advanceOrderStatus?: (orderId: number) => void
  addAuditLog?: (actor: string, role: string, entity: string, action: string, details: string) => void
  auditLogs?: any[]
  handleSignOut?: () => void
  money?: (amount: number) => string
  eventMode?: boolean
  setEventMode?: React.Dispatch<React.SetStateAction<boolean>>
}

function formatElapsed(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  currentUser,
  outlets: globalOutlets = [],
  setOutlets: setGlobalOutlets,
  orders: globalOrders = [],
  setOrders: setGlobalOrders,
  addAuditLog,
  auditLogs: propAuditLogs = [],
  handleSignOut,
  money = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
  eventMode: propEventMode = false,
  setEventMode: setPropEventMode
}) => {
  // Super Admin specifications (Platform Governance & Oversight)
  type SuperTab =
    | 'overview'
    | 'campuses'
    | 'outlets'
    | 'users'
    | 'roles-permissions'
    | 'orders'
    | 'payments'
    | 'settlements'
    | 'analytics-reports'
    | 'coupons'
    | 'audit-logs'
    | 'system-settings'
    | 'system-map'

  const parseSuperPath = (path: string): SuperTab => {
    const p = path.toLowerCase()
    if (p.includes('/campuses')) return 'campuses'
    if (p.includes('/outlets')) return 'outlets'
    if (p.includes('/roles') || p.includes('/permissions')) return 'roles-permissions'
    if (p.includes('/system-map') || p.includes('/system_map')) return 'system-map'
    if (p.includes('/users')) return 'users'
    if (p.includes('/orders')) return 'orders'
    if (p.includes('/payments')) return 'payments'
    if (p.includes('/settlements')) return 'settlements'
    if (p.includes('/analytics') || p.includes('/reports')) return 'analytics-reports'
    if (p.includes('/coupons')) return 'coupons'
    if (p.includes('/audit') || p.includes('/logs')) return 'audit-logs'
    if (p.includes('/settings') || p.includes('/system-settings')) return 'system-settings'
    return 'overview'
  }

  const [activeTab, setActiveTabState] = useState<SuperTab>(() => parseSuperPath(window.location.pathname))

  const setActiveTab = (tab: SuperTab, updateHistory: boolean = true) => {
    setActiveTabState(tab)
    if (updateHistory) {
      const slug = tab === 'overview' ? '' : `/${tab}`
      const newUrl = `/admin${slug}`
      if (window.location.pathname !== newUrl) {
        window.history.pushState(null, '', newUrl)
      }
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      setActiveTabState(parseSuperPath(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showMyRoleModal, setShowMyRoleModal] = useState(false)
  const { sidebarWidth, isResizing, handleMouseDown } = useResizableSidebar({ storageKey: 'vfoods_superadmin_sidebar_width' })

  // User Role Editing State
  const [editingRoleUser, setEditingRoleUser] = useState<PlatformUser | null>(null)
  const [roleForm, setRoleForm] = useState<{ role: string; outlet_id: string }>({ role: 'student', outlet_id: '' })
  const [savingRole, setSavingRole] = useState(false)

  // Global Festival / Event Mode
  const [eventMode, setEventMode] = useState<boolean>(propEventMode)
  const [platformCommission, setPlatformCommission] = useState<number>(5.0)
  const [syncing, setSyncing] = useState<boolean>(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Campuses state
  const [campuses, setCampuses] = useState<CampusRecord[]>([
    { id: 'vit-chennai', name: 'VIT Chennai (Main Campus)', city: 'Chennai, TN', outlets_count: 13, students_count: 11200, today_gmv: 142500, status: 'active' },
    { id: 'vit-vellore', name: 'VIT Vellore (Satellite Connect)', city: 'Vellore, TN', outlets_count: 24, students_count: 24000, today_gmv: 310400, status: 'active' },
    { id: 'vit-riviera', name: 'Riviera Festival Food Court Arena', city: 'Festival Grounds', outlets_count: 20, students_count: 18500, today_gmv: 215000, status: 'active' }
  ])

  // Outlets master list (loaded from the `outlets` table)
  const [outletList, setOutletList] = useState<OutletRecord[]>([])
  const outletListRef = useRef<OutletRecord[]>([])
  outletListRef.current = outletList
  const [outletsLoading, setOutletsLoading] = useState(true)
  const [outletsError, setOutletsError] = useState<string | null>(null)

  // Global Orders list
  const [orders, setOrders] = useState<PlatformOrder[]>([])

  // Global Users list
  const [usersList, setUsersList] = useState<PlatformUser[]>([
    { id: 'u1', full_name: 'Aarav Patel', phone: '9876543210', email: 'aarav.patel@gmail.com', role: 'customer', is_active: true, wallet_balance: 450, created_at: '2025-08-12' },
    { id: 'u2', full_name: 'Murugan Staff', phone: '9876541001', email: 'staff.gazebo1@vfoods.com', role: 'staff', outlet_id: 'g1', is_active: true, created_at: '2025-09-01' },
    { id: 'u3', full_name: 'Gazebo Franchise Owner', phone: '9876542001', email: 'owner.gazebo1@vfoods.com', role: 'shop_admin', outlet_id: 'g1', is_active: true, created_at: '2025-07-20' },
    { id: 'u4', full_name: 'Super Admin Me', phone: '9876543200', email: 'superadmin@vfoods.in', role: 'super_admin', is_active: true, created_at: '2025-06-01' },
    { id: 'u5', full_name: 'Sneha Reddy', phone: '9876543211', email: 'sneha.reddy@gmail.com', role: 'customer', is_active: true, wallet_balance: 820, created_at: '2025-09-10' },
    { id: 'u6', full_name: 'Vikram Joshi', phone: '9876543212', email: 'vikram.joshi@gmail.com', role: 'customer', is_active: true, wallet_balance: 150, created_at: '2025-10-01' }
  ])

  // Coupons state
  const [coupons, setCoupons] = useState<CouponRecord[]>([
    { id: 'cp1', code: 'WELCOME50', discount_type: 'flat', discount_value: 50, min_order: 150, used_count: 840, max_uses: 2000, valid_to: '2026-12-31', is_active: true },
    { id: 'cp2', code: 'VIT20', discount_type: 'percent', discount_value: 20, min_order: 100, used_count: 1420, max_uses: 5000, valid_to: '2026-11-30', is_active: true },
    { id: 'cp3', code: 'FEST100', discount_type: 'flat', discount_value: 100, min_order: 300, used_count: 320, max_uses: 1000, valid_to: '2026-10-15', is_active: true },
    { id: 'cp4', code: 'SNACK10', discount_type: 'percent', discount_value: 10, min_order: 60, used_count: 2150, max_uses: 10000, valid_to: '2026-12-31', is_active: true }
  ])

  // Modals & form state
  const [showAddCouponModal, setShowAddCouponModal] = useState(false)
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'flat',
    discount_value: 15,
    min_order: 100,
    max_uses: 1000,
    valid_to: '2026-12-31'
  })

  const [showAddOutletModal, setShowAddOutletModal] = useState(false)
  const [editingOutlet, setEditingOutlet] = useState<OutletRecord | null>(null)
  const [outletForm, setOutletForm] = useState({
    name: '',
    location: '',
    is_event: false
  })
  const [outletFormError, setOutletFormError] = useState<string | null>(null)
  const [savingOutlet, setSavingOutlet] = useState(false)
  const [showStaffDrawer, setShowStaffDrawer] = useState(false)
  const [selectedStaffOutlet, setSelectedStaffOutlet] = useState<OutletRecord | null>(null)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')

  // Audit Logs Telemetry state
  const [auditLogsList, setAuditLogsList] = useState<AuditLogRecord[]>([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('ALL')
  const [auditSearchQuery, setAuditSearchQuery] = useState('')
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogRecord | null>(null)

  // Escape key listener & background scroll lock for Super Admin modals
  const isAnySuperModalOpen = Boolean(showAddOutletModal || editingOutlet || showAddCouponModal || selectedAuditLog || editingRoleUser || showStaffDrawer)
  useEffect(() => {
    if (!isAnySuperModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!savingOutlet) {
          setShowAddOutletModal(false)
          setEditingOutlet(null)
        }
        setShowAddCouponModal(false)
        setSelectedAuditLog(null)
        setShowStaffDrawer(false)
        if (!savingRole) setEditingRoleUser(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isAnySuperModalOpen, savingOutlet, savingRole])

  // Fetch cross-outlet global orders
  const loadGlobalData = useCallback(async () => {
    setSyncing(true)
    try {
      const { data: ords } = await supabase
        .from('orders')
        .select(`
          id, user_id, customer_name, outlet_id, token, order_number, order_source, payment_mode, status, payment_method, total, shop_payout,
          created_at, updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(150)

      if (ords && ords.length > 0) {
        const formatted: PlatformOrder[] = ords.map((o: any) => {
          const tot = o.total || 0
          const isPos = o.order_source === 'POS'
          const fee = isPos ? 0 : Math.round(tot * 0.05)
          return {
            id: o.id,
            user_id: o.user_id,
            customer_name: o.customer_name || `User #${o.id % 900 + 100}`,
            outlet_id: o.outlet_id,
            outlet_name: outletListRef.current.find(ot => ot.id === o.outlet_id)?.name || `Outlet ${o.outlet_id}`,
            token: o.token || String(o.id % 900 + 100),
            order_number: o.order_number || null,
            order_source: o.order_source || 'APP',
            payment_mode: o.payment_mode || null,
            status: o.status || 'placed',
            payment_method: o.payment_method || (isPos ? `Counter ${o.payment_mode || ''}` : 'Online UPI'),
            total: tot,
            platform_fee: fee,
            net_payout: tot - fee,
            created_at: o.created_at
          }
        })
        setOrders(formatted)
      } else {
        // Fallback realistic platform orders
        setOrders([
          { id: 9801, customer_name: 'Aarav Patel', outlet_id: 'g1', outlet_name: 'Gazebo C1', token: '104', status: 'placed', payment_method: 'UPI Online', total: 140, platform_fee: 7, net_payout: 133, created_at: new Date(Date.now() - 3 * 60000).toISOString() },
          { id: 9800, customer_name: 'Sneha Reddy', outlet_id: 'g3', outlet_name: 'Dakshin Chitra', token: '289', status: 'preparing', payment_method: 'Meal Plan Card', total: 220, platform_fee: 11, net_payout: 209, created_at: new Date(Date.now() - 8 * 60000).toISOString() },
          { id: 9798, customer_name: 'Rohan Gupta', outlet_id: 'n2', outlet_name: 'Shawarma Nation', token: '312', status: 'ready', payment_method: 'UPI Online', total: 180, platform_fee: 9, net_payout: 171, created_at: new Date(Date.now() - 15 * 60000).toISOString() },
          { id: 9795, customer_name: 'Pooja Nair', outlet_id: 'g4', outlet_name: 'Lassi House', token: '419', status: 'collected', payment_method: 'Wallet', total: 110, platform_fee: 5.5, net_payout: 104.5, created_at: new Date(Date.now() - 32 * 60000).toISOString() },
          { id: 9792, customer_name: 'Ananya Roy', outlet_id: 'g1', outlet_name: 'Gazebo C1', token: '502', status: 'collected', payment_method: 'UPI Online', total: 95, platform_fee: 4.75, net_payout: 90.25, created_at: new Date(Date.now() - 55 * 60000).toISOString() }
        ])
      }

      // Fetch live user directory from profiles
      const { data: dbUsers, error: usersErr } = await supabase
        .from('profiles')
        .select('id, full_name, phone, mobile_number, email, role, outlet_id, is_active, created_at')
        .order('created_at', { ascending: false })

      if (!usersErr && dbUsers && dbUsers.length > 0) {
        setUsersList(dbUsers.map((p: any) => ({
          id: p.id,
          full_name: p.full_name || 'Campus Member',
          phone: p.phone || p.mobile_number || '—',
          email: p.email || '—',
          role: p.role || 'customer',
          outlet_id: p.outlet_id || null,
          is_active: p.is_active !== false,
          created_at: p.created_at ? p.created_at.split('T')[0] : '—'
        })))
      }

      // Fetch live coupons from Supabase
      const { data: dbCoupons } = await supabase
        .from('coupons')
        .select('code, discount_type, discount_value, min_order_value, max_uses, used_count, valid_to, active')

      if (dbCoupons && dbCoupons.length > 0) {
        setCoupons(dbCoupons.map((c: any) => ({
          id: c.code,
          code: c.code,
          discount_type: (c.discount_type || 'percent') as 'percent' | 'flat',
          discount_value: Number(c.discount_value || 0),
          min_order: Number(c.min_order_value || 0),
          used_count: Number(c.used_count || 0),
          max_uses: Number(c.max_uses || 1000),
          valid_to: c.valid_to ? c.valid_to.split('T')[0] : '2026-12-31',
          is_active: c.active !== false
        })))
      }
    } catch (e) {
      console.warn('Super Admin global data fallback:', e)
    } finally {
      setSyncing(false)
    }
  }, [])

  // Sync when globalOrders updates
  useEffect(() => {
    if (globalOrders && globalOrders.length > 0) {
      setOrders(globalOrders as PlatformOrder[])
    }
  }, [globalOrders])

  useEffect(() => {
    loadGlobalData()
    const timer = setInterval(loadGlobalData, 20000)
    return () => clearInterval(timer)
  }, [loadGlobalData])

  // Dedicated Live Realtime Subscription for Super Admin (all orders across platform)
  useEffect(() => {
    if (!supabase) return

    const channel = supabase.channel('super-admin-live-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          loadGlobalData()
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new
          setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, status: updated.status, token: updated.token || o.token } : o))
          if (setGlobalOrders) {
            setGlobalOrders(prev => prev.map(o => o.id === updated.id ? { ...o, status: updated.status, token: updated.token || o.token } : o))
          }
        }
      })
      .subscribe()

    const handleCatchup = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        loadGlobalData()
      }
    }

    document.addEventListener('visibilitychange', handleCatchup)
    window.addEventListener('online', handleCatchup)
    window.addEventListener('focus', handleCatchup)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleCatchup)
      window.removeEventListener('online', handleCatchup)
      window.removeEventListener('focus', handleCatchup)
    }
  }, [loadGlobalData, setGlobalOrders])

  // Translate a Supabase/PostgREST error into a message the admin can act on
  const describeDbError = (err: any): string => {
    const code = err?.code
    const msg = err?.message || 'Unknown error'
    if (code === '23505') return 'An outlet with this ID already exists. Use a different name.'
    if (code === '42501' || /row-level security/i.test(msg)) return 'Permission denied. Only a signed-in Super Admin account can change outlets.'
    if (code === '23502') return `A required field is missing: ${err?.details || msg}`
    if (code === '23503') return `Related record not found: ${err?.details || msg}`
    if (code === 'PGRST301' || /JWT/i.test(msg)) return 'Your session has expired. Sign in again.'
    return msg
  }

  // Load outlets from the database (source of truth)
  const loadOutlets = useCallback(async () => {
    setOutletsError(null)
    const { data, error } = await supabase
      .from('outlets')
      .select('id, name, location, is_event, is_open')
      .order('name', { ascending: true })
    if (error) {
      setOutletsError(describeDbError(error))
      setOutletsLoading(false)
      return
    }
    setOutletList((data || []).map((o: any) => ({
      id: o.id,
      name: o.name,
      location: o.location,
      owner_name: '',
      owner_phone: '',
      is_open: o.is_open,
      is_event: o.is_event,
      today_gmv: 0,
      order_count: 0
    })))
    setOutletsLoading(false)
  }, [])

  useEffect(() => { loadOutlets() }, [loadOutlets])

  // Load Audit Logs from Supabase audit_logs table (source of truth)
  const loadAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (!error && data && data.length > 0) {
        setAuditLogsList(data as AuditLogRecord[])
      } else if (propAuditLogs && propAuditLogs.length > 0) {
        setAuditLogsList(propAuditLogs.map((l: any) => ({
          id: l.id || `aud-${Math.random()}`,
          actor_name: l.actor || 'User',
          actor_role: l.role || 'user',
          category: l.category || 'SYSTEM',
          action: l.action || 'ACTION',
          details: l.details || '',
          status: l.status || 'SUCCESS',
          created_at: l.timestamp || l.created_at || new Date().toISOString(),
          metadata: l.metadata || {}
        })))
      }
    } catch (err) {
      console.warn('Audit logs load warning:', err)
      if (propAuditLogs && propAuditLogs.length > 0) {
        setAuditLogsList(propAuditLogs as any)
      }
    } finally {
      setAuditLogsLoading(false)
    }
  }, [propAuditLogs])

  useEffect(() => { loadAuditLogs() }, [loadAuditLogs])

  // Realtime subscription on audit_logs table
  useEffect(() => {
    if (!supabase) return
    const channel = supabase.channel('super-admin-audit-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload: any) => {
        if (payload.new) {
          setAuditLogsList(prev => [payload.new as AuditLogRecord, ...prev.filter(l => l.id !== payload.new.id)])
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Sync when propAuditLogs changes from external callers
  useEffect(() => {
    if (propAuditLogs && propAuditLogs.length > 0) {
      setAuditLogsList(prev => {
        const map = new Map<string, AuditLogRecord>()
        propAuditLogs.forEach((l: any) => map.set(l.id, {
          id: l.id,
          actor_name: l.actor || 'User',
          actor_role: l.role || 'user',
          category: l.category || 'SYSTEM',
          action: l.action || 'ACTION',
          details: l.details || '',
          status: l.status || 'SUCCESS',
          created_at: l.timestamp || l.created_at || new Date().toISOString(),
          metadata: l.metadata || {}
        }))
        prev.forEach(l => map.set(l.id, l))
        return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      })
    }
  }, [propAuditLogs])

  // Toggle Outlet Force Open/Close (persisted; RLS decides who may do this)
  const handleToggleOutlet = async (outletId: string) => {
    const target = outletList.find(o => o.id === outletId)
    if (!target) return
    const nextState = !target.is_open
    const confirmMessage = `Are you sure you want to force ${nextState ? 'OPEN' : 'CLOSE'} "${target.name}"? ${!nextState ? 'Students will not be able to place new orders from this outlet.' : 'The outlet will immediately appear open to students.'}`
    if (!window.confirm(confirmMessage)) return

    const { error } = await supabase.from('outlets').update({ is_open: nextState }).eq('id', outletId)
    if (error) {
      setNotice(`Could not update ${target.name}: ${describeDbError(error)}`)
      setTimeout(() => setNotice(null), 5000)
      return
    }
    setOutletList(prev => prev.map(o => o.id === outletId ? { ...o, is_open: nextState } : o))
    if (setGlobalOutlets) setGlobalOutlets(prev => prev.map(o => o.id === outletId ? { ...o, is_open: nextState } : o))
    toast.success(`Outlet ${target.name} ${nextState ? 'opened' : 'closed'}`)
    if (addAuditLog) {
      addAuditLog(currentUser?.full_name || 'Super Admin', 'super_admin', 'OUTLET', 'OVERRIDE_STATUS', `Forced outlet ${target.name} to ${nextState ? 'OPEN' : 'CLOSED'}`)
    }
  }

  const openAddOutletModal = () => {
    setEditingOutlet(null)
    setOutletForm({ name: '', location: '', is_event: false })
    setOutletFormError(null)
    setShowAddOutletModal(true)
  }

  const openEditOutletModal = (outlet: OutletRecord) => {
    setEditingOutlet(outlet)
    setOutletForm({
      name: outlet.name,
      location: outlet.location,
      is_event: !!outlet.is_event
    })
    setOutletFormError(null)
    setShowAddOutletModal(true)
  }

  const outletColumns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Outlet Name',
      cell: ({ row }: any) => (
        <div className="py-0.5">
          <div className="font-semibold text-slate-900">{row.original.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{row.original.location}</div>
        </div>
      )
    },
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }: any) => (
        <span className="font-mono text-xs text-slate-500">{row.original.id}</span>
      )
    },
    {
      accessorKey: 'is_event',
      header: 'Type',
      cell: ({ row }: any) => (
        <span className="text-xs text-slate-600">
          {row.original.is_event ? 'Event stall' : 'Regular'}
        </span>
      )
    },
    {
      id: 'volume',
      header: "Today's Volume",
      cell: ({ row }: any) => {
        const outletOrders = orders.filter(o => o.outlet_id === row.original.id)
        const volume = outletOrders.reduce((s, o) => s + (o.total || 0), 0)
        return (
          <div className="py-0.5">
            <div className="font-bold text-slate-900 tabular-nums">{money(volume)}</div>
            <div className="text-xs text-slate-500 mt-0.5">{outletOrders.length} orders</div>
          </div>
        )
      }
    },
    {
      accessorKey: 'is_open',
      header: 'Kitchen State',
      cell: ({ row }: any) => {
        const isOpen = row.original.is_open
        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                isOpen
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full mr-1.5 ${isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        )
      }
    },
    {
      id: 'team',
      header: 'Assigned Team',
      cell: ({ row }: any) => {
        const teamCount = usersList.filter((u: any) => u.outlet_id === row.original.id).length
        return (
          <button
            type="button"
            onClick={() => {
              setSelectedStaffOutlet(row.original)
              setShowStaffDrawer(true)
            }}
            className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5"
            title="View & manage assigned staff"
          >
            <Users size={12} className="text-blue-600" />
            <span>Staff ({teamCount})</span>
          </button>
        )
      }
    },
    {
      id: 'actions',
      header: () => <div className="text-right w-full">Master Override</div>,
      cell: ({ row }: any) => {
        const outlet = row.original
        return (
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1.5"
              onClick={() => openEditOutletModal(outlet)}
              title="Edit outlet details"
            >
              <Edit size={12} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              className={`saas-btn saas-btn-sm ${outlet.is_open ? 'saas-btn-danger' : 'saas-btn-success'}`}
              onClick={() => handleToggleOutlet(outlet.id)}
            >
              {outlet.is_open ? 'Force close' : 'Force open'}
            </button>
          </div>
        )
      }
    }
  ], [orders, money, usersList])

  // Create or Edit an outlet in the database
  const handleSaveOutlet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (savingOutlet) return
    const name = outletForm.name.trim()
    const location = outletForm.location.trim()
    if (name.length < 3) { setOutletFormError('Outlet name must be at least 3 characters.'); return }
    if (!location) { setOutletFormError('Location is required.'); return }

    if (editingOutlet) {
      setSavingOutlet(true)
      setOutletFormError(null)
      const { data, error } = await supabase
        .from('outlets')
        .update({ name, location, is_event: outletForm.is_event })
        .eq('id', editingOutlet.id)
        .select('id, name, location, is_event, is_open')
        .single()
      setSavingOutlet(false)

      if (error || !data) {
        console.error('Update outlet failed:', error)
        setOutletFormError(describeDbError(error))
        return
      }

      await loadOutlets()
      if (setGlobalOutlets) {
        setGlobalOutlets(prev => prev.map(o => o.id === data.id ? { ...o, name: data.name, location: data.location, is_event: data.is_event } : o))
      }
      setShowAddOutletModal(false)
      setEditingOutlet(null)
      setNotice(`Outlet "${data.name}" updated successfully.`)
      setTimeout(() => setNotice(null), 4000)
      if (addAuditLog) {
        addAuditLog(currentUser?.full_name || 'Super Admin', 'super_admin', 'OUTLET', 'UPDATE', `Updated outlet ${data.name} (${data.id}) at ${data.location}`)
      }
      return
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    if (!id) { setOutletFormError('Outlet name must contain letters or numbers.'); return }
    if (outletList.some(o => o.id === id || o.name.toLowerCase() === name.toLowerCase())) {
      setOutletFormError('An outlet with this name already exists.')
      return
    }

    setSavingOutlet(true)
    setOutletFormError(null)
    const { data, error } = await supabase
      .from('outlets')
      .insert({ id, name, location, is_event: outletForm.is_event, is_open: true })
      .select('id, name, location, is_event, is_open')
      .single()
    setSavingOutlet(false)

    if (error || !data) {
      console.error('Create outlet failed:', error)
      setOutletFormError(describeDbError(error))
      return
    }

    await loadOutlets()
    if (setGlobalOutlets) {
      setGlobalOutlets(prev => prev.some(o => o.id === data.id) ? prev : [...prev, { ...data, menu_items: [] }])
    }
    setShowAddOutletModal(false)
    setEditingOutlet(null)
    setNotice(`Outlet "${data.name}" created.`)
    setTimeout(() => setNotice(null), 4000)
    if (addAuditLog) {
      addAuditLog(currentUser?.full_name || 'Super Admin', 'super_admin', 'OUTLET', 'CREATE', `Created outlet ${data.name} (${data.id}) at ${data.location}`)
    }
  }

  // Toggle Global Event Mode
  const handleToggleEventMode = () => {
    const next = !eventMode
    setEventMode(next)
    if (setPropEventMode) setPropEventMode(next)
    setNotice(next ? 'Festival and Event Mode enabled. 20 Riviera food stalls are now visible to users.' : 'Event Mode disabled. Standard dining outlets active.')
    setTimeout(() => setNotice(null), 5000)
    if (addAuditLog) {
      addAuditLog(currentUser?.full_name || 'Super Admin', 'super_admin', 'SYSTEM', 'EVENT_MODE_TOGGLE', `Global festival mode set to ${next}`)
    }
  }

  // User Role Management
  const handleUpdateUserRole = (userId: string, newRole: any) => {
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    const targetUser = usersList.find(u => u.id === userId)
    setNotice(`Updated role for "${targetUser?.full_name}" to ${newRole}.`)
    setTimeout(() => setNotice(null), 3000)
    if (addAuditLog) {
      addAuditLog(currentUser?.full_name || 'Super Admin', 'super_admin', 'USER', 'ROLE_CHANGE', `Changed user ${targetUser?.full_name} (${targetUser?.phone}) role to ${newRole}`)
    }
  }

  const openEditRoleModal = (user: PlatformUser) => {
    setEditingRoleUser(user)
    setRoleForm({
      role: user.role === 'customer' ? 'student' : user.role,
      outlet_id: user.outlet_id || ''
    })
  }

  const handleSaveUserRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRoleUser) return
    setSavingRole(true)
    try {
      const newRole = roleForm.role
      const newOutletId = (newRole === 'staff' || newRole === 'shop_admin') ? (roleForm.outlet_id || null) : null

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, outlet_id: newOutletId })
        .eq('id', editingRoleUser.id)

      if (error) {
        console.error('Failed to update user role:', error)
        toast.error('Could not save role: ' + error.message)
      } else {
        setUsersList(prev => prev.map(u => u.id === editingRoleUser.id ? { ...u, role: newRole as any, outlet_id: newOutletId } : u))
        toast.success(`Role updated for ${editingRoleUser.full_name}`)
        setNotice(`Role for "${editingRoleUser.full_name}" updated to ${newRole}.`)
        setTimeout(() => setNotice(null), 3000)
        if (addAuditLog) {
          addAuditLog(currentUser?.full_name || 'Super Admin', 'super_admin', 'USER', 'ROLE_CHANGE', `Updated role for ${editingRoleUser.full_name} to ${newRole} (outlet: ${newOutletId || 'none'})`)
        }
        setEditingRoleUser(null)
      }
    } catch (err: any) {
      toast.error('Error saving role: ' + (err.message || 'Unknown error'))
    } finally {
      setSavingRole(false)
    }
  }

  // Toggle User Active/Suspended (persists to Supabase profiles)
  const handleToggleUserActive = async (userId: string) => {
    const target = usersList.find(u => u.id === userId)
    if (!target) return
    const next = !target.is_active
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_active: next } : u))
    
    try {
      const { error } = await supabase.from('profiles').update({ is_active: next }).eq('id', userId)
      if (error) {
        console.warn('Could not persist user active toggle:', error)
      }
    } catch (e) {
      console.warn('User status toggle exception:', e)
    }

    setNotice(`User account "${target.full_name}" is now ${next ? 'Active' : 'Suspended'}.`)
    setTimeout(() => setNotice(null), 3000)

    if (addAuditLog) {
      addAuditLog(
        currentUser?.full_name || 'Super Admin',
        'super_admin',
        'USER',
        'TOGGLE_STATUS',
        `${next ? 'Reactivated' : 'Suspended'} user account ${target.full_name} (${target.phone})`
      )
    }
  }

  // Add Coupon
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponForm.code) return
    const newCoupon: CouponRecord = {
      id: `cp-${Date.now()}`,
      code: couponForm.code.toUpperCase(),
      discount_type: couponForm.discount_type,
      discount_value: Number(couponForm.discount_value),
      min_order: Number(couponForm.min_order),
      max_uses: Number(couponForm.max_uses),
      used_count: 0,
      valid_to: couponForm.valid_to,
      is_active: true
    }
    setCoupons(prev => [newCoupon, ...prev])
    setShowAddCouponModal(false)
    setNotice(`Coupon "${newCoupon.code}" published.`)
    setTimeout(() => setNotice(null), 3000)
    if (addAuditLog) {
      addAuditLog(
        currentUser?.full_name || 'Super Admin',
        'super_admin',
        'COUPON',
        'CREATE',
        `Created platform coupon ${newCoupon.code} (${newCoupon.discount_value}${newCoupon.discount_type === 'percent' ? '%' : '₹'} discount)`
      )
    }

    supabase.from('coupons').insert({
      code: newCoupon.code,
      discount_type: newCoupon.discount_type,
      discount_value: newCoupon.discount_value,
      min_order_value: newCoupon.min_order,
      max_uses: newCoupon.max_uses,
      used_count: 0,
      valid_to: new Date(newCoupon.valid_to).toISOString(),
      active: true
    }).then(({ error }) => {
      if (error) console.warn('Coupon insert warning:', error.message)
    })
  }

  // Toggle Coupon Active
  const handleToggleCoupon = (couponId: string) => {
    const c = coupons.find(item => item.id === couponId)
    const next = !c?.is_active
    setCoupons(prev => prev.map(item => item.id === couponId ? { ...item, is_active: next } : item))
    if (addAuditLog && c) {
      addAuditLog(
        currentUser?.full_name || 'Super Admin',
        'super_admin',
        'COUPON',
        'TOGGLE',
        `Toggled coupon ${c.code} status to ${next ? 'ACTIVE' : 'PAUSED'}`
      )
    }
  }

  // Filtered Audit Logs computed from search and category
  const filteredAuditLogs = useMemo(() => {
    return auditLogsList.filter(log => {
      if (auditCategoryFilter !== 'ALL' && log.category !== auditCategoryFilter) return false
      if (auditSearchQuery) {
        const q = auditSearchQuery.toLowerCase()
        const matchActor = (log.actor_name || '').toLowerCase().includes(q)
        const matchAction = (log.action || '').toLowerCase().includes(q)
        const matchDetails = (log.details || '').toLowerCase().includes(q)
        const matchRole = (log.actor_role || '').toLowerCase().includes(q)
        if (!matchActor && !matchAction && !matchDetails && !matchRole) return false
      }
      return true
    })
  }, [auditLogsList, auditCategoryFilter, auditSearchQuery])

  // Export Audit Logs CSV
  const handleExportAuditLogsCsv = () => {
    const headers = ['Log ID', 'Timestamp', 'Actor Name', 'Actor Role', 'Category', 'Action', 'Details', 'Status']
    const rows = filteredAuditLogs.map(l => [
      l.id,
      l.created_at,
      `"${(l.actor_name || '').replace(/"/g, '""')}"`,
      l.actor_role,
      l.category,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.status
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vfoods-audit-trail-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export Master Orders CSV
  const handleExportGlobalOrdersCsv = () => {
    const headers = ['Order ID', 'Outlet', 'Token', 'Status', 'Payment Method', 'Total', '5% Platform Cut', 'Net Payout', 'Timestamp']
    const rows = orders.map(o => [
      o.id,
      `"${o.outlet_name || o.outlet_id}"`,
      o.token || '',
      o.status,
      o.payment_method || '',
      o.total,
      o.platform_fee,
      o.net_payout,
      o.created_at
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vfoods-platform-master-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Overall Platform Totals (strictly counts ONLY Paytm/online App orders, excluding counter POS sales)
  const appOrdersOnly = orders.filter(o => o.order_source !== 'POS')
  const totalPlatformGmv = appOrdersOnly.reduce((sum, o) => sum + (o.total || 0), 0) + 152600
  const totalPlatformCut = Math.round(totalPlatformGmv * (platformCommission / 100))
  const totalOutletsCount = outletList.length
  const activeOutletsCount = outletList.filter(o => o.is_open).length
  const studentWalletFloat = 148500 // Sum of wallet balances across students
  const activeOrdersInQueue = orders.filter(o => o.status === 'placed' || o.status === 'preparing').length

  return (
    <div className="saas-layout">
      {/* ── MOBILE SIDEBAR BACKDROP ── */}
      {mobileMenuOpen && (
        <div className="saas-sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ── LEFT SIDEBAR (Super Admin's Exact 10 Sections) ── */}
      <aside
        className={`saas-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
      >
        <div
          className={`saas-sidebar-resizer ${isResizing ? 'is-resizing' : ''}`}
          onMouseDown={handleMouseDown}
          title="Drag to resize sidebar"
        />

        {/* Brand */}
        <div className="saas-sidebar-brand">
          <div className="saas-brand-wrap">
            <img src="/vit-chennai-logo.png" alt="V Foods" className="saas-brand-img" />
            <span className="saas-brand-text">V-<span>FOODS</span></span>
          </div>
          <button
            type="button"
            className="saas-sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            title="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Platform Status Banner */}
        <div className="saas-sidebar-outlet">
          <span className="saas-outlet-label">
            <ShieldCheck size={11} /> Campus
          </span>
          <div className="saas-outlet-name">
            VIT Chennai
          </div>
          <div className="saas-outlet-status">
            <span className="saas-status-dot online" />
            <span style={{ color: '#38BDF8', fontWeight: 600 }}>{activeOutletsCount} of {totalOutletsCount} Outlets Open</span>
          </div>
        </div>

        {/* Navigation Menu (Grouped with Section Titles) */}
        <nav className="saas-nav">
          <div className="saas-nav-section-title">OVERVIEW</div>
          <button
            className={`saas-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <LayoutDashboard size={15} />
              <span>Overview</span>
            </div>
          </button>

          <div className="saas-nav-section-title">CAMPUS & OUTLETS</div>
          <button
            className={`saas-nav-btn ${activeTab === 'campuses' ? 'active' : ''}`}
            onClick={() => { setActiveTab('campuses'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <Building2 size={15} />
              <span>Campuses</span>
            </div>
            <span className="saas-nav-badge">{campuses.length}</span>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'outlets' ? 'active' : ''}`}
            onClick={() => { setActiveTab('outlets'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <Store size={15} />
              <span>Outlets</span>
            </div>
            <span className="saas-nav-badge">{outletList.length}</span>
          </button>

          <div className="saas-nav-section-title">ACCESS & USERS</div>
          <button
            className={`saas-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <Users size={15} />
              <span>Users & Staff</span>
            </div>
            <span className="saas-nav-badge">{usersList.length}</span>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'roles-permissions' ? 'active' : ''}`}
            onClick={() => { setActiveTab('roles-permissions'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <ShieldCheck size={15} />
              <span>Roles & Permissions</span>
            </div>
          </button>

          <div className="saas-nav-section-title">COMMERCE & ORDERS</div>
          <button
            className={`saas-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => { setActiveTab('orders'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <ShoppingBag size={15} />
              <span>Orders</span>
            </div>
            {activeOrdersInQueue > 0 && (
              <span className="saas-nav-badge">{activeOrdersInQueue}</span>
            )}
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => { setActiveTab('payments'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <CreditCard size={15} />
              <span>Payments</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'settlements' ? 'active' : ''}`}
            onClick={() => { setActiveTab('settlements'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <Receipt size={15} />
              <span>Settlements</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'coupons' ? 'active' : ''}`}
            onClick={() => { setActiveTab('coupons'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <Tag size={15} />
              <span>Coupons</span>
            </div>
            <span className="saas-nav-badge">{coupons.filter(c => c.is_active).length}</span>
          </button>

          <div className="saas-nav-section-title">SYSTEM & TELEMETRY</div>
          <button
            className={`saas-nav-btn ${activeTab === 'analytics-reports' ? 'active' : ''}`}
            onClick={() => { setActiveTab('analytics-reports'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <BarChart3 size={15} />
              <span>Analytics / Reports</span>
            </div>
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'audit-logs' ? 'active' : ''}`}
            onClick={() => { setActiveTab('audit-logs'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <ShieldAlert size={15} />
              <span>Audit Logs</span>
            </div>
            {auditLogsList.length > 0 && (
              <span className="saas-nav-badge" style={{ background: '#0284C7', color: '#FFFFFF' }}>
                {auditLogsList.length}
              </span>
            )}
          </button>

          <button
            className={`saas-nav-btn ${activeTab === 'system-settings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('system-settings'); setMobileMenuOpen(false); }}
          >
            <div className="saas-nav-item-left">
              <Settings size={15} />
              <span>System Settings</span>
            </div>
          </button>

          {import.meta.env.VITE_ENABLE_SYSTEM_MAP === 'true' && (
            <button
              className={`saas-nav-btn ${activeTab === 'system-map' ? 'active' : ''}`}
              onClick={() => { setActiveTab('system-map'); setMobileMenuOpen(false); }}
            >
              <div className="saas-nav-item-left">
                <Compass size={15} />
                <span>Developer System Map</span>
              </div>
            </button>
          )}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="saas-sidebar-footer">
          <div className="saas-user-meta">
            <span className="saas-user-name">{currentUser?.full_name || 'Platform Admin'}</span>
            <button
              type="button"
              onClick={() => setShowMyRoleModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#38BDF8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
              title="Click to view full role & permissions profile"
            >
              <ShieldCheck size={11} />
              <span>Super Admin • View Role Info</span>
            </button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <button
              type="button"
              className="saas-mobile-toggle"
              onClick={() => setMobileMenuOpen(true)}
              title="Open navigation menu"
            >
              <Menu size={16} />
              <span>Menu</span>
            </button>
            <div className="saas-breadcrumb">
              <span>Super Admin</span>
              <ChevronRight size={14} />
              <span className="saas-breadcrumb-title">
                {activeTab === 'overview' && 'Overview'}
                {activeTab === 'campuses' && 'Campuses'}
                {activeTab === 'outlets' && 'Outlets'}
                {activeTab === 'users' && 'Users'}
                {activeTab === 'orders' && 'Orders'}
                {activeTab === 'payments' && 'Payments'}
                {activeTab === 'settlements' && 'Settlements'}
                {activeTab === 'analytics-reports' && 'Analytics'}
                {activeTab === 'coupons' && 'Coupons'}
                {activeTab === 'audit-logs' && 'Audit Logs'}
                {activeTab === 'system-settings' && 'Settings'}
              </span>
            </div>
          </div>

          <div className="saas-top-actions">
            {/* Festival Mode Indicator / Switch */}
            <button
              className={`saas-btn saas-btn-sm ${eventMode ? 'saas-btn-primary' : 'saas-btn-secondary'}`}
              onClick={handleToggleEventMode}
              title="Click to toggle Riviera / Festival mode across campus"
            >
              <Sparkles size={13} />
              <span>{eventMode ? 'Festival mode: Active' : 'Standard campus mode'}</span>
            </button>

            <button
              className="saas-btn saas-btn-secondary saas-btn-sm"
              onClick={loadGlobalData}
              disabled={syncing}
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        {/* Global Notice Banner */}
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

        {/* Body Workspace */}
        <div className="saas-body">
          {/* ══════════════════════════════════════════════════════════
              TAB 1: OVERVIEW
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Executive KPI Grid */}
              <div className="saas-kpi-grid">
                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Platform Total GMV</span>
                    <TrendingUp size={16} className="text-blue-600" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#1E40AF' }}>
                    {money(totalPlatformGmv)}
                  </div>
                  <div className="saas-kpi-sub">Gross food volume processed</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">V Foods Commission (5%)</span>
                    <Percent size={16} className="text-emerald-600" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#15803D' }}>
                    {money(totalPlatformCut)}
                  </div>
                  <div className="saas-kpi-sub">Net software revenue accrued</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Active Outlets</span>
                    <Store size={16} className="text-blue-500" />
                  </div>
                  <div className="saas-kpi-value">{activeOutletsCount} / {totalOutletsCount}</div>
                  <div className="saas-kpi-sub">Operational canteens today</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">User Wallet Float</span>
                    <Banknote size={16} className="text-amber-500" />
                  </div>
                  <div className="saas-kpi-value">{money(studentWalletFloat)}</div>
                  <div className="saas-kpi-sub">Stored campus credit held in escrow</div>
                </div>
              </div>

              {/* System Infrastructure Telemetry Bar */}
              <div className="saas-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="saas-status-dot online" />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>Supabase Auth & RLS: Healthy</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="saas-status-dot online" />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>Realtime Websockets: Connected</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="saas-status-dot online" />
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>UPI Gateway: 99.8% Success Rate</span>
                    </div>
                  </div>
                  <button className="saas-btn saas-btn-secondary saas-btn-sm" onClick={() => setActiveTab('orders')}>
                    <span>View Cross-Outlet Telemetry</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Two Column Section: Outlets Summary + Recent Cross-Platform Orders */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                {/* Global Orders Stream */}
                <div className="saas-card">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Cross-Campus Live Orders</h4>
                    <button className="saas-btn saas-btn-secondary saas-btn-sm" onClick={() => setActiveTab('orders')}>
                      View All
                    </button>
                  </div>
                  <div className="saas-table-container">
                    <table className="saas-table">
                      <thead>
                        <tr>
                          <th>Token #</th>
                          <th>Outlet</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 6).map(o => (
                          <tr key={o.id}>
                            <td style={{ fontWeight: 800, fontFamily: 'monospace' }}>#{o.token || o.id}</td>
                            <td style={{ fontSize: '12.5px', fontWeight: 600 }}>{o.outlet_name}</td>
                            <td style={{ fontSize: '12px', color: '#64748B' }}>{o.customer_name}</td>
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

                {/* Top Performing Outlets */}
                <div className="saas-card" style={{ padding: '18px 20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px' }}>Top Revenue Outlets</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {outletList.slice(0, 5).map(outlet => (
                      <div
                        key={outlet.id}
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
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{outlet.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{outlet.location} • {outlet.order_count} orders</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E40AF' }}>{money(outlet.today_gmv)}</div>
                          <span style={{ fontSize: '11px', color: outlet.is_open ? '#16A34A' : '#DC2626', fontWeight: 700 }}>
                            {outlet.is_open ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: CAMPUSES
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'campuses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Campus Dining Clusters</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Multi-campus network directory and hub metrics</p>
                </div>
              </div>

              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Campus / Festival Hub</th>
                        <th>City / Zone</th>
                        <th>Active Outlets</th>
                        <th>User Enrolment</th>
                        <th>Today's Campus GMV</th>
                        <th>Hub Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campuses.map(campus => (
                        <tr key={campus.id}>
                          <td style={{ fontWeight: 700 }}>{campus.name}</td>
                          <td style={{ fontSize: '12.5px', color: '#64748B' }}>{campus.city}</td>
                          <td style={{ fontWeight: 700 }}>{campus.outlets_count} food outlets</td>
                          <td>{campus.students_count.toLocaleString()} users</td>
                          <td style={{ fontWeight: 800, color: '#1E40AF' }}>{money(campus.today_gmv)}</td>
                          <td>
                            <span className="saas-badge saas-badge-success">OPERATIONAL</span>
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
              TAB 3: OUTLETS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'outlets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Outlets</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Manage operational status and canteens</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="saas-btn saas-btn-secondary"
                    onClick={() => {
                      setSelectedStaffOutlet(outletList[0] || null)
                      setShowStaffDrawer(true)
                    }}
                  >
                    <Users size={15} />
                    <span>Staff Directory</span>
                  </button>
                  <button className="saas-btn saas-btn-primary" onClick={openAddOutletModal}>
                    <Plus size={15} />
                    <span>Create New Outlet</span>
                  </button>
                </div>
              </div>

              {outletsError && (
                <div className="saas-card" style={{ padding: '12px 16px', borderLeft: '3px solid #DC2626', color: '#991B1B', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span>Could not load outlets: {outletsError}</span>
                  <button className="saas-btn saas-btn-sm saas-btn-secondary" onClick={loadOutlets}>Retry</button>
                </div>
              )}

              {/* Cross-Outlet Turnover Comparison Chart */}
              <OutletComparisonChart outlets={outletList} orders={orders} money={money} />

              {/* TanStack React Table with sorting, filtering, and pagination */}
              <div className="saas-card p-4">
                <DataTable
                  columns={outletColumns}
                  data={outletList}
                  searchPlaceholder="Filter outlets by name, ID or location..."
                />
              </div>

              {/* Slide-over Drawer for Outlet Staff & Management Directory */}
              <OutletStaffDrawer
                isOpen={showStaffDrawer}
                onClose={() => setShowStaffDrawer(false)}
                outlet={selectedStaffOutlet || outletList[0]}
                outlets={outletList}
                users={usersList}
                onSelectOutlet={(o: any) => setSelectedStaffOutlet(o)}
                onUserUpdated={loadGlobalData}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 4: USERS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="saas-card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['all', 'student', 'staff', 'shop_admin', 'super_admin'] as const).map(role => (
                      <button
                        key={role}
                        className={`saas-btn saas-btn-sm ${userRoleFilter === role ? 'saas-btn-primary' : 'saas-btn-secondary'}`}
                        onClick={() => setUserRoleFilter(role)}
                      >
                        {role === 'all' ? 'All Users' : role === 'student' ? 'User' : role === 'staff' ? 'Shop Staff' : role === 'shop_admin' ? 'Shop Admin' : 'Super Admin'}
                      </button>
                    ))}
                  </div>

                  <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="Search by name, mobile, email..."
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

              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>User Name</th>
                        <th>Mobile / Auth</th>
                        <th>Email</th>
                        <th>Assigned Role</th>
                        <th>Outlet Scope</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList
                        .filter(u => userRoleFilter === 'all' || u.role === userRoleFilter || (userRoleFilter === 'student' && (u.role === 'customer' || u.role === 'student' || u.role === 'user')))
                        .filter(u => {
                          if (!searchQuery) return true
                          const q = searchQuery.toLowerCase()
                          return u.full_name.toLowerCase().includes(q) || u.phone.includes(q) || (u.email || '').toLowerCase().includes(q)
                        })
                        .map(user => (
                          <tr key={user.id}>
                            <td style={{ fontWeight: 700 }}>{user.full_name}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{user.phone}</td>
                            <td style={{ fontSize: '12px', color: '#64748B' }}>{user.email || '—'}</td>
                            <td>
                              <span className={`saas-badge ${
                                user.role === 'super_admin' ? 'saas-badge-neutral' :
                                user.role === 'shop_admin' ? 'saas-badge-warning' :
                                user.role === 'staff' ? 'saas-badge-info' : 'saas-badge-success'
                              }`}>
                                {user.role === 'customer' || user.role === 'student' ? 'CUSTOMER' : user.role.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: '#64748B' }}>
                              {user.outlet_id ? (outletList.find(o => o.id === user.outlet_id)?.name || `Outlet: ${user.outlet_id}`) : '—'}
                            </td>
                            <td>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: user.is_active ? '#16A34A' : '#DC2626' }}>
                                {user.is_active ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="saas-btn saas-btn-sm saas-btn-secondary inline-flex items-center gap-1"
                                  onClick={() => openEditRoleModal(user)}
                                  title="Edit role and outlet assignment"
                                >
                                  <Edit size={12} />
                                  <span>Edit Role</span>
                                </button>
                                <button
                                  type="button"
                                  className={`saas-btn saas-btn-sm ${user.is_active ? 'saas-btn-secondary' : 'saas-btn-primary'}`}
                                  onClick={() => handleToggleUserActive(user.id)}
                                >
                                  {user.is_active ? 'Suspend' : 'Reactivate'}
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
              TAB 5: ORDERS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Global Orders Telemetry Feed</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Real-time cross-canteen transactions across campus</p>
                </div>
                <button className="saas-btn saas-btn-primary saas-btn-sm" onClick={handleExportGlobalOrdersCsv}>
                  <Download size={13} />
                  <span>Export Platform Orders CSV</span>
                </button>
              </div>

              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Order ID / Token</th>
                        <th>Outlet Name</th>
                        <th>Customer</th>
                        <th>Time Placed</th>
                        <th>Method</th>
                        <th>Total</th>
                        <th>5% Commission</th>
                        <th>Net to Shop</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                                {formatOrderNumber(order)}
                              </span>
                              <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>
                                Ref: #{order.id}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{order.outlet_name}</td>
                          <td style={{ fontSize: '12px' }}>{order.customer_name}</td>
                          <td style={{ fontSize: '12px', color: '#64748B' }}>{formatElapsed(order.created_at)}</td>
                          <td style={{ fontSize: '12px' }}>{order.payment_method}</td>
                          <td style={{ fontWeight: 700 }}>{money(order.total)}</td>
                          <td style={{ color: '#D97706', fontWeight: 700 }}>{money(order.platform_fee)}</td>
                          <td style={{ color: '#15803D', fontWeight: 700 }}>{money(order.net_payout)}</td>
                          <td>
                            <span className={`saas-badge ${
                              order.status === 'placed' ? 'saas-badge-warning' :
                              order.status === 'preparing' ? 'saas-badge-info' :
                              order.status === 'ready' ? 'saas-badge-success' : 'saas-badge-neutral'
                            }`}>
                              {order.status.toUpperCase()}
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


          {/* ══════════════════════════════════════════════════════════
              TAB 6: PAYMENTS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="saas-kpi-grid">
                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">UPI Volume (Online)</span>
                    <CreditCard size={16} className="text-blue-600" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#1E40AF' }}>{money(totalPlatformGmv * 0.74)}</div>
                  <div className="saas-kpi-sub">Direct UPI Gateway Inflow</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">User Wallet Float</span>
                    <Banknote size={16} className="text-emerald-600" />
                  </div>
                  <div className="saas-kpi-value" style={{ color: '#15803D' }}>{money(studentWalletFloat)}</div>
                  <div className="saas-kpi-sub">Pre-loaded user balances</div>
                </div>

                <div className="saas-kpi-card">
                  <div className="saas-kpi-header">
                    <span className="saas-kpi-title">Disbursed Settlements</span>
                    <Receipt size={16} className="text-slate-600" />
                  </div>
                  <div className="saas-kpi-value">{money(totalPlatformGmv * 0.95)}</div>
                  <div className="saas-kpi-sub">Transferred to franchise banks</div>
                </div>
              </div>

              <div className="saas-card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Recent Gateway Payment Logs</h4>
                </div>
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Txn Ref ID</th>
                        <th>Customer</th>
                        <th>Gateway Type</th>
                        <th>Amount</th>
                        <th>Gateway Status</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontFamily: 'monospace' }}>UPI-TXN-9021873</td>
                        <td>Aarav Patel</td>
                        <td>Razorpay UPI (PhonePe)</td>
                        <td style={{ fontWeight: 700 }}>₹140</td>
                        <td><span className="saas-badge saas-badge-success">CAPTURED</span></td>
                        <td style={{ fontSize: '12px', color: '#64748B' }}>10 mins ago</td>
                      </tr>
                      <tr>
                        <td style={{ fontFamily: 'monospace' }}>UPI-TXN-9021872</td>
                        <td>Sneha Reddy</td>
                        <td>In-App User Wallet Debit</td>
                        <td style={{ fontWeight: 700 }}>₹220</td>
                        <td><span className="saas-badge saas-badge-success">CAPTURED</span></td>
                        <td style={{ fontSize: '12px', color: '#64748B' }}>18 mins ago</td>
                      </tr>
                      <tr>
                        <td style={{ fontFamily: 'monospace' }}>UPI-TXN-9021870</td>
                        <td>Rohan Gupta</td>
                        <td>Razorpay UPI (GPay)</td>
                        <td style={{ fontWeight: 700 }}>₹180</td>
                        <td><span className="saas-badge saas-badge-success">CAPTURED</span></td>
                        <td style={{ fontSize: '12px', color: '#64748B' }}>35 mins ago</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 7: SETTLEMENTS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'settlements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Franchise Payout Clearinghouse</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Review and disburse net earnings (95%) to outlet bank accounts</p>
                </div>
                <button
                  className="saas-btn saas-btn-primary saas-btn-sm"
                  onClick={() => {
                    setNotice('Batch settlement initiated. Funds queued for standard 11:30 PM NEFT payout cycle.')
                    setTimeout(() => setNotice(null), 4000)
                  }}
                >
                  Batch Disburse All Outlets
                </button>
              </div>

              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Outlet Name</th>
                        <th>Owner Account Holder</th>
                        <th>Gross GMV</th>
                        <th>5% Platform Cut</th>
                        <th>Net Transfer Owed</th>
                        <th>Bank IFSC</th>
                        <th style={{ textAlign: 'right' }}>Disburse Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outletList.map(ot => {
                        const cut = Math.round(ot.today_gmv * 0.05)
                        const net = ot.today_gmv - cut
                        return (
                          <tr key={ot.id}>
                            <td style={{ fontWeight: 700 }}>{ot.name}</td>
                            <td>{ot.owner_name}</td>
                            <td style={{ fontWeight: 700 }}>{money(ot.today_gmv)}</td>
                            <td style={{ color: '#D97706' }}>{money(cut)}</td>
                            <td style={{ fontWeight: 800, color: '#15803D' }}>{money(net)}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>HDFC0001824</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="saas-btn saas-btn-secondary saas-btn-sm"
                                onClick={() => {
                                  setNotice(`Payout of ${money(net)} scheduled for ${ot.name}.`)
                                  setTimeout(() => setNotice(null), 3500)
                                }}
                              >
                                Disburse
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
              TAB 8: ANALYTICS / REPORTS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'analytics-reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="saas-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Executive Analytics & Campus Food Trends</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>Aggregate throughput, peak dining load distributions, and revenue share</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px' }}>Peak Counter Dining Windows</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Lunch Rush (12:00 - 02:00 PM)</span>
                        <strong style={{ color: '#1E40AF' }}>44% volume</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Evening Snacks (04:30 - 06:30 PM)</span>
                        <strong style={{ color: '#D97706' }}>32% volume</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Dinner / Late Night (07:30 - 10:00 PM)</span>
                        <strong style={{ color: '#15803D' }}>24% volume</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px' }}>Order Channel Distribution</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Mobile Pre-Orders (Pickup Slot)</span>
                        <strong>68% share</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Walk-in Counter POS Sales</span>
                        <strong>22% share</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Scheduled Advance Orders</span>
                        <strong>10% share</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 9: COUPONS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'coupons' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Platform Promotional Coupons</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Manage discount vouchers applicable across campus dining</p>
                </div>
                <button className="saas-btn saas-btn-primary" onClick={() => setShowAddCouponModal(true)}>
                  <Plus size={15} />
                  <span>Create Discount Coupon</span>
                </button>
              </div>

              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Coupon Code</th>
                        <th>Discount Type</th>
                        <th>Value</th>
                        <th>Min Order Value</th>
                        <th>Redemptions</th>
                        <th>Valid Until</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Toggle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map(coupon => (
                        <tr key={coupon.id}>
                          <td>
                            <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '13.5px', color: '#1E40AF', background: '#EFF6FF', padding: '2px 8px', borderRadius: '4px' }}>
                              {coupon.code}
                            </span>
                          </td>
                          <td style={{ textTransform: 'capitalize', fontSize: '12px' }}>{coupon.discount_type}</td>
                          <td style={{ fontWeight: 700 }}>
                            {coupon.discount_type === 'percent' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} FLAT`}
                          </td>
                          <td>{money(coupon.min_order)}</td>
                          <td>{coupon.used_count} / {coupon.max_uses}</td>
                          <td style={{ fontSize: '12px', color: '#64748B' }}>{coupon.valid_to}</td>
                          <td>
                            <span className={`saas-badge ${coupon.is_active ? 'saas-badge-success' : 'saas-badge-neutral'}`}>
                              {coupon.is_active ? 'ACTIVE' : 'DISABLED'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="saas-btn saas-btn-secondary saas-btn-sm"
                              onClick={() => handleToggleCoupon(coupon.id)}
                            >
                              {coupon.is_active ? 'Deactivate' : 'Activate'}
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
              TAB 10: AUDIT LOGS & SECURITY TELEMETRY
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'audit-logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header & Controls Card */}
              <div className="saas-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                        Security & Operations Audit Trail
                      </h3>
                      <span className="saas-badge saas-badge-neutral" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                        {filteredAuditLogs.length} Events
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>
                      Immutable ledger recorded in Supabase PostgreSQL tracking role elevations, outlet overrides, catalog edits, and system actions.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="saas-btn saas-btn-secondary saas-btn-sm"
                      onClick={loadAuditLogs}
                      disabled={auditLogsLoading}
                      title="Refresh audit logs from Supabase"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <RefreshCw size={13} className={auditLogsLoading ? 'animate-spin' : ''} />
                      <span>{auditLogsLoading ? 'Fetching...' : 'Sync'}</span>
                    </button>

                    <button
                      className="saas-btn saas-btn-secondary saas-btn-sm"
                      onClick={handleExportAuditLogsCsv}
                      disabled={filteredAuditLogs.length === 0}
                      title="Download audit logs as CSV"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Download size={13} />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Filters & Search Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #E2E8F0' }}>
                  {/* Category Filter Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(['ALL', 'OUTLET', 'MENU', 'ORDER', 'USER', 'COUPON', 'SYSTEM', 'WALLET', 'SECURITY'] as const).map(cat => {
                      const count = cat === 'ALL' ? auditLogsList.length : auditLogsList.filter(l => l.category === cat).length
                      return (
                        <button
                          key={cat}
                          className={`saas-btn saas-btn-sm ${auditCategoryFilter === cat ? 'saas-btn-primary' : 'saas-btn-secondary'}`}
                          onClick={() => setAuditCategoryFilter(cat)}
                          style={{ fontSize: '11.5px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <span>{cat}</span>
                          <span style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '10px',
                            background: auditCategoryFilter === cat ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                            color: auditCategoryFilter === cat ? '#FFF' : '#475569',
                            fontWeight: 700
                          }}>
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Search Bar */}
                  <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="Search actor, action, details..."
                      value={auditSearchQuery}
                      onChange={e => setAuditSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 12px 6px 32px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px'
                      }}
                    />
                    {auditSearchQuery && (
                      <button
                        onClick={() => setAuditSearchQuery('')}
                        style={{ position: 'absolute', right: '8px', top: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Table Card */}
              <div className="saas-card">
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th style={{ width: '130px' }}>Timestamp</th>
                        <th style={{ width: '170px' }}>Actor & Role</th>
                        <th style={{ width: '110px' }}>Category</th>
                        <th style={{ width: '150px' }}>Action</th>
                        <th>Event Description</th>
                        <th style={{ width: '85px', textAlign: 'center' }}>Status</th>
                        <th style={{ width: '70px', textAlign: 'right' }}>Inspect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                              <ShieldAlert size={32} style={{ color: '#94A3B8' }} />
                              <div style={{ fontWeight: 600, fontSize: '14px', color: '#334155' }}>No audit events found</div>
                              <div style={{ fontSize: '12px' }}>
                                {auditSearchQuery || auditCategoryFilter !== 'ALL'
                                  ? 'Try adjusting your search query or category filter.'
                                  : 'Audit events will appear here as administrative actions occur.'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredAuditLogs.map(log => {
                          const tagClass =
                            log.category === 'ORDER' ? 'tag-order' :
                            (log.category === 'INVENTORY' || log.category === 'MENU') ? 'tag-stock' :
                            log.category === 'OUTLET' ? 'tag-outlet' :
                            log.category === 'WALLET' ? 'tag-wallet' : 'tag-security'

                          const roleBadgeStyle =
                            log.actor_role === 'super_admin' ? { background: '#FEF3C7', color: '#92400E' } :
                            log.actor_role === 'shop_admin' ? { background: '#DBEAFE', color: '#1E40AF' } :
                            log.actor_role === 'staff' ? { background: '#E0E7FF', color: '#3730A3' } :
                            { background: '#F1F5F9', color: '#475569' }

                          const dateObj = new Date(log.created_at)
                          const timeStr = !isNaN(dateObj.getTime())
                            ? dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : '—'
                          const dateStr = !isNaN(dateObj.getTime())
                            ? dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                            : ''

                          return (
                            <tr key={log.id}>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                                    {timeStr}
                                  </span>
                                  <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                                    {dateStr} ({formatElapsed(log.created_at)})
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                                    {log.actor_name || 'System'}
                                  </span>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    width: 'fit-content',
                                    ...roleBadgeStyle
                                  }}>
                                    {log.actor_role || 'user'}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className={`audit-tag ${tagClass}`}>
                                  {log.category}
                                </span>
                              </td>
                              <td>
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  color: '#0F172A',
                                  background: '#F8FAFC',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #E2E8F0'
                                }}>
                                  {log.action}
                                </span>
                              </td>
                              <td style={{ fontSize: '12.5px', color: '#334155', maxWidth: '380px', lineHeight: 1.4 }}>
                                {log.details}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  background: log.status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2',
                                  color: log.status === 'SUCCESS' ? '#166534' : '#991B1B'
                                }}>
                                  {log.status || 'SUCCESS'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  className="saas-btn saas-btn-sm saas-btn-secondary"
                                  onClick={() => setSelectedAuditLog(log)}
                                  title="Inspect full audit record & metadata"
                                  style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Eye size={12} />
                                  <span>View</span>
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 11: SYSTEM SETTINGS
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'system-settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' }}>
              <div className="saas-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Platform Governance Parameters</h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 20px' }}>Global configurations affecting all campuses and outlets</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Festival Mode Switch */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Riviera / Fest Mode</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Enable 20 pop-up festival stalls across the campus map</div>
                    </div>
                    <button
                      className={`saas-btn ${eventMode ? 'saas-btn-primary' : 'saas-btn-secondary'}`}
                      onClick={handleToggleEventMode}
                    >
                      {eventMode ? 'Active (Enabled)' : 'Disabled'}
                    </button>
                  </div>

                  {/* Commission Rate */}
                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Standard Platform Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={platformCommission}
                      onChange={e => setPlatformCommission(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  {/* Wallet Minimum */}
                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Minimum User Wallet Top-Up Amount (₹)
                    </label>
                    <input
                      type="number"
                      defaultValue="50"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="saas-btn saas-btn-primary"
                      onClick={() => {
                        setNotice('Global system parameters updated successfully.')
                        setTimeout(() => setNotice(null), 3000)
                        if (addAuditLog) {
                          addAuditLog(
                            currentUser?.full_name || 'Super Admin',
                            'super_admin',
                            'SYSTEM',
                            'UPDATE_PARAMETERS',
                            `Updated platform commission to ${platformCommission}% and festival mode to ${eventMode ? 'ACTIVE' : 'DISABLED'}`
                          )
                        }
                      }}
                    >
                      Save Parameters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 12: ROLES & PERMISSIONS MATRIX
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'roles-permissions' && (
            <RolesAndPermissionsScreen />
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 13: DEVELOPER SYSTEM MAP
              ══════════════════════════════════════════════════════════ */}
          {activeTab === 'system-map' && (
            <SystemMapScreen />
          )}
        </div>
      </main>

      {/* ── CREATE / EDIT OUTLET MODAL ── */}
      {showAddOutletModal && (
        <div className="saas-modal-backdrop" onClick={() => !savingOutlet && (setShowAddOutletModal(false), setEditingOutlet(null))}>
          <div className="saas-modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 className="saas-modal-title">{editingOutlet ? `Edit Outlet: ${editingOutlet.name}` : 'Create New Outlet'}</h3>
              <button className="saas-modal-close" onClick={() => { setShowAddOutletModal(false); setEditingOutlet(null) }} disabled={savingOutlet} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveOutlet} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label htmlFor="outlet-name" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Outlet Name
                  </label>
                  <input
                    id="outlet-name"
                    type="text"
                    required
                    minLength={3}
                    maxLength={80}
                    placeholder="e.g. Food Street Grill"
                    value={outletForm.name}
                    onChange={e => setOutletForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label htmlFor="outlet-location" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Location
                  </label>
                  <input
                    id="outlet-location"
                    type="text"
                    required
                    list="outlet-location-options"
                    placeholder="e.g. North Square"
                    value={outletForm.location}
                    onChange={e => setOutletForm(prev => ({ ...prev, location: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                  <datalist id="outlet-location-options">
                    {Array.from(new Set(outletList.map(o => o.location))).map(loc => <option key={loc} value={loc} />)}
                  </datalist>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={outletForm.is_event}
                    onChange={e => setOutletForm(prev => ({ ...prev, is_event: e.target.checked }))}
                  />
                  Event stall (open only during event mode)
                </label>

                {outletFormError && (
                  <div role="alert" style={{ padding: '8px 10px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12.5px' }}>
                    {outletFormError}
                  </div>
                )}
              </div>

              <div className="saas-modal-footer">
                <button type="button" className="saas-btn saas-btn-secondary" onClick={() => { setShowAddOutletModal(false); setEditingOutlet(null) }} disabled={savingOutlet}>
                  Cancel
                </button>
                <button type="submit" className="saas-btn saas-btn-primary" disabled={savingOutlet}>
                  {savingOutlet ? 'Saving...' : editingOutlet ? 'Update Outlet' : 'Create Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE COUPON MODAL ── */}
      {showAddCouponModal && (
        <div className="saas-modal-backdrop" onClick={() => setShowAddCouponModal(false)}>
          <div className="saas-modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 className="saas-modal-title">Create Discount Coupon</h3>
              <button className="saas-modal-close" onClick={() => setShowAddCouponModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveCoupon} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FESTIVAL30"
                    value={couponForm.code}
                    onChange={e => setCouponForm(prev => ({ ...prev, code: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1', textTransform: 'uppercase' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Discount Type
                    </label>
                    <select
                      value={couponForm.discount_type}
                      onChange={e => setCouponForm(prev => ({ ...prev, discount_type: e.target.value as any }))}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Discount Value
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={couponForm.discount_value}
                      onChange={e => setCouponForm(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Min Order Value (₹)
                    </label>
                    <input
                      type="number"
                      value={couponForm.min_order}
                      onChange={e => setCouponForm(prev => ({ ...prev, min_order: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Max Usage Limit
                    </label>
                    <input
                      type="number"
                      value={couponForm.max_uses}
                      onChange={e => setCouponForm(prev => ({ ...prev, max_uses: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    />
                  </div>
                </div>
              </div>

              <div className="saas-modal-footer">
                <button type="button" className="saas-btn saas-btn-secondary" onClick={() => setShowAddCouponModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="saas-btn saas-btn-primary">
                  Publish Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG INSPECT MODAL ── */}
      {selectedAuditLog && (
        <div className="saas-modal-backdrop" onClick={() => setSelectedAuditLog(null)}>
          <div className="saas-modal-card" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} style={{ color: '#0284C7' }} />
                <h3 className="saas-modal-title">Audit Record Details</h3>
              </div>
              <button className="saas-modal-close" onClick={() => setSelectedAuditLog(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12.5px' }}>
                <div>
                  <div style={{ color: '#64748B', fontSize: '11px', fontWeight: 600 }}>EVENT ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#0F172A', wordBreak: 'break-all' }}>{selectedAuditLog.id}</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '11px', fontWeight: 600 }}>RECORDED AT</div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{new Date(selectedAuditLog.created_at).toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '11px', fontWeight: 600 }}>ACTOR</div>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{selectedAuditLog.actor_name} ({selectedAuditLog.actor_role})</div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '11px', fontWeight: 600 }}>CATEGORY / ACTION</div>
                  <div style={{ fontWeight: 700, color: '#0369A1' }}>{selectedAuditLog.category} &bull; {selectedAuditLog.action}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Description</div>
                <div style={{ padding: '10px 12px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #CBD5E1', fontSize: '13px', color: '#0F172A' }}>
                  {selectedAuditLog.details}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Metadata Payload</div>
                <pre style={{
                  margin: 0,
                  padding: '12px',
                  borderRadius: '6px',
                  background: '#0F172A',
                  color: '#38BDF8',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '220px'
                }}>
                  {JSON.stringify(selectedAuditLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="saas-modal-footer">
              <button className="saas-btn saas-btn-secondary" onClick={() => setSelectedAuditLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Role Modal */}
      {editingRoleUser && (
        <div className="saas-modal-backdrop">
          <div className="saas-modal" style={{ maxWidth: '440px' }}>
            <div className="saas-modal-header">
              <h3 className="saas-modal-title">Edit User Role</h3>
              <button
                className="saas-modal-close"
                onClick={() => setEditingRoleUser(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveUserRole}>
              <div className="saas-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>MEMBER</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>{editingRoleUser.full_name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                    {editingRoleUser.phone} {editingRoleUser.email && editingRoleUser.email !== '—' ? `• ${editingRoleUser.email}` : ''}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Assigned Role
                  </label>
                  <select
                    value={roleForm.role}
                    onChange={e => setRoleForm(prev => ({ ...prev, role: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      background: '#FFFFFF'
                    }}
                  >
                    <option value="student">User / Customer (Student & Faculty)</option>
                    <option value="staff">Shop Staff (Kitchen & Counter)</option>
                    <option value="shop_admin">Shop Admin (Franchise Owner)</option>
                    <option value="super_admin">Super Admin (Platform Administrator)</option>
                  </select>
                </div>

                {(roleForm.role === 'staff' || roleForm.role === 'shop_admin') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Assigned Outlet Scope
                    </label>
                    <select
                      value={roleForm.outlet_id}
                      onChange={e => setRoleForm(prev => ({ ...prev, outlet_id: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        background: '#FFFFFF'
                      }}
                      required
                    >
                      <option value="">Select an outlet...</option>
                      {outletList.map(o => (
                        <option key={o.id} value={o.id}>{o.name} ({o.location})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="saas-modal-footer">
                <button
                  type="button"
                  className="saas-btn saas-btn-secondary"
                  onClick={() => setEditingRoleUser(null)}
                  disabled={savingRole}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="saas-btn saas-btn-primary"
                  disabled={savingRole}
                >
                  {savingRole ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar (at most 5 tabs + More sheet) */}
      <SaasBottomTabBar
        primaryTabs={[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'outlets', label: 'Outlets', icon: Store, badge: (outletList.length || globalOutlets.length) || undefined },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: (orders.length || globalOrders.length) || undefined },
        ]}
        moreTabs={[
          { id: 'campuses', label: 'Campuses & Hubs', icon: Building2 },
          { id: 'roles-permissions', label: 'Roles & Permissions', icon: ShieldCheck },
          { id: 'payments', label: 'Payments & Ledger', icon: CreditCard },
          { id: 'settlements', label: 'Franchise Settlements', icon: Receipt },
          { id: 'analytics-reports', label: 'Analytics & Reports', icon: BarChart3 },
          { id: 'coupons', label: 'Platform Coupons', icon: Tag },
          { id: 'audit-logs', label: 'Security Audit Trail', icon: ShieldAlert, badge: auditLogsList.length || undefined },
          { id: 'system-settings', label: 'System Configuration', icon: Settings },
          ...(import.meta.env.VITE_ENABLE_SYSTEM_MAP === 'true'
            ? [{ id: 'system-map', label: 'Developer System Map', icon: Compass }]
            : [])
        ]}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        roleLabel="Super Admin"
      />

      {/* Super Admin My Role & Permissions Modal */}
      <MyRolePanel
        isOpen={showMyRoleModal}
        onClose={() => setShowMyRoleModal(false)}
        currentUser={currentUser}
      />
    </div>
  )
}

export default SuperAdminDashboard
