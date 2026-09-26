import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'
import {
  LayoutDashboard, Users, ShoppingBag, Wallet, Settings,
  LogOut, TrendingUp, DollarSign, ToggleLeft, ToggleRight,
  Download, Search, Loader2, Plus, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

// ─── Tab: Overview / Analytics ────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState<any>(null)
  const [byOutlet, setByOutlet] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<'today' | '7d' | '30d'>('today')

  useEffect(() => { loadStats() }, [range])

  const loadStats = async () => {
    setLoading(true)
    const from = range === 'today'
      ? new Date().toISOString().slice(0, 10)
      : range === '7d'
        ? new Date(Date.now() - 7 * 86400000).toISOString()
        : new Date(Date.now() - 30 * 86400000).toISOString()

    const [{ data: orders }, { data: walletData }] = await Promise.all([
      supabase.from('orders').select('id,total,shop_payout,my_profit,payment_method,outlet_id,status').gte('created_at', from),
      supabase.from('wallets').select('balance'),
    ])

    const completed = (orders || []).filter((o: any) => !['payment_pending','cancelled'].includes(o.status))
    const totalRevenue = completed.reduce((s: number, o: any) => s + o.shop_payout, 0)
    const totalProfit  = completed.reduce((s: number, o: any) => s + o.my_profit, 0)
    const walletFloat  = (walletData || []).reduce((s: number, w: any) => s + w.balance, 0)

    // Per-outlet breakdown
    const outletMap: Record<string, any> = {}
    completed.forEach((o: any) => {
      if (!outletMap[o.outlet_id]) outletMap[o.outlet_id] = { outlet_id: o.outlet_id, orders: 0, revenue: 0, profit: 0 }
      outletMap[o.outlet_id].orders++
      outletMap[o.outlet_id].revenue += o.shop_payout
      outletMap[o.outlet_id].profit  += o.my_profit
    })
    setByOutlet(Object.values(outletMap))
    setStats({ orders: completed.length, totalRevenue, totalProfit, walletFloat })
    setLoading(false)
  }

  const exportCSV = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id,user_id,outlet_id,token,status,payment_method,shop_payout,total,my_profit,created_at')
      .order('created_at', { ascending: false })
    if (!data) return

    const header = 'Order ID,User,Outlet,Token,Status,Method,Shop Payout,Total,Profit,Date\n'
    const rows = data.map((o: any) =>
      `${o.id},${o.user_id},${o.outlet_id},${o.token || ''},${o.status},${o.payment_method},${o.shop_payout},${o.total},${o.my_profit},${o.created_at}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'campusbite_orders.csv'; a.click()
    toast.success('CSV exported')
  }

  if (loading) return <div className="p-4 space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-24"/>)}</div>

  return (
    <div className="p-4 pb-safe space-y-5">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Analytics</h2>
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
          {(['today','7d','30d'] as const).map(r => (
            <button key={r} id={`range-${r}`} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range===r?'bg-brand-500 text-white':'text-white/40 hover:text-white/70'}`}>
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Orders', stats.orders, ShoppingBag, 'text-blue-400', 'bg-blue-500/10'],
          ['Revenue', `₹${stats.totalRevenue.toLocaleString('en-IN')}`, DollarSign, 'text-emerald-400', 'bg-emerald-500/10'],
          ['Platform Profit', `₹${stats.totalProfit.toLocaleString('en-IN')}`, TrendingUp, 'text-brand-400', 'bg-brand-500/10'],
          ['Wallet Float', `₹${stats.walletFloat.toLocaleString('en-IN')}`, Wallet, 'text-purple-400', 'bg-purple-500/10'],
        ].map(([label, val, Icon, color, bg]: any) => (
          <div key={label} className="card p-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon size={20} className={color} /></div>
            <div className="text-xl font-black text-white">{val}</div>
            <div className="text-xs text-white/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Per-outlet breakdown */}
      <div className="card p-4">
        <h3 className="font-bold text-white mb-3">Per Outlet</h3>
        {byOutlet.length === 0 && <p className="text-white/30 text-sm">No data</p>}
        {byOutlet.map((o) => (
          <div key={o.outlet_id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
            <div>
              <p className="text-sm font-semibold text-white">{o.outlet_id}</p>
              <p className="text-xs text-white/40">{o.orders} orders</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">₹{o.revenue}</p>
              <p className="text-xs text-brand-400">+₹{o.profit} profit</p>
            </div>
          </div>
        ))}
      </div>

      <button id="export-csv" onClick={exportCSV} className="btn-secondary w-full">
        <Download size={16} /> Export CSV
      </button>
    </div>
  )
}

// ─── Tab: All Orders ──────────────────────────────────────────────────────────
function AllOrdersTab() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(name, qty)')
      .order('created_at', { ascending: false })
      .limit(100)
    setOrders(data || [])
    setLoading(false)
  }

  const filtered = orders.filter(o =>
    !search || String(o.id).includes(search) || o.outlet_id.includes(search) || o.token?.includes(search)
  )

  if (loading) return <div className="p-4 space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="skeleton h-20"/>)}</div>

  return (
    <div className="p-4 pb-safe">
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input id="order-search" className="input pl-10" placeholder="Search by ID, outlet, token…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">
        {filtered.map((o) => (
          <div key={o.id} className="card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm">#{o.id}</span>
                  <span className={`status-${o.status}`}>{o.status}</span>
                  <span className="badge-gray text-xs">{o.payment_method}</span>
                </div>
                <p className="text-xs text-white/40">{o.outlet_id} · {new Date(o.created_at).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">₹{o.total}</p>
                <p className="text-xs text-brand-400">+₹{o.my_profit} profit</p>
              </div>
            </div>
            <div className="text-xs text-white/40 flex gap-2 flex-wrap">
              {o.order_items?.map((oi: any, i: number) => <span key={i}>{oi.name}×{oi.qty}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: User Management ─────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creditModal, setCreditModal] = useState<{ userId: string; name: string } | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [crediting, setCrediting] = useState(false)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, wallets(balance)')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const updateRole = async (userId: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
    toast.success('Role updated')
  }

  const creditWallet = async () => {
    if (!creditModal || !creditAmount) return
    setCrediting(true)
    try {
      await api.post('/admin/credit-wallet', {
        user_id: creditModal.userId,
        amount: parseInt(creditAmount),
        note: 'Admin credit',
      })
      toast.success(`₹${creditAmount} credited to ${creditModal.name}`)
      setCreditModal(null); setCreditAmount('')
      loadUsers()
    } catch (err: any) { toast.error(err.message) }
    setCrediting(false)
  }

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.id.includes(search)
  )

  if (loading) return <div className="p-4 space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-20"/>)}</div>

  return (
    <div className="p-4 pb-safe">
      {/* Credit modal */}
      {creditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card p-5 w-full max-w-sm animate-bounce-in space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Credit Wallet</h3>
              <button onClick={() => setCreditModal(null)} className="btn-icon btn-sm"><X size={16} /></button>
            </div>
            <p className="text-sm text-white/60">To: <span className="text-white font-semibold">{creditModal.name}</span></p>
            <div>
              <label className="label">Amount (₹)</label>
              <input id="credit-amount" className="input" type="number" placeholder="Enter amount" value={creditAmount} onChange={e=>setCreditAmount(e.target.value)} />
            </div>
            <button id="credit-submit" onClick={creditWallet} disabled={crediting} className="btn-primary w-full">
              {crediting ? <Loader2 size={16} className="animate-spin"/> : 'Credit Wallet'}
            </button>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input id="user-search" className="input pl-10" placeholder="Search users…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-lg font-bold text-brand-400">
                {(u.full_name?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{u.full_name || 'Unnamed'}</p>
                <p className="text-xs text-white/40">{u.role} · Balance: ₹{u.wallets?.[0]?.balance ?? 0}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  id={`role-${u.id}`}
                  value={u.role}
                  onChange={e => updateRole(u.id, e.target.value)}
                  className="input py-1.5 text-xs w-28"
                >
                  <option value="customer">Customer</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  id={`credit-${u.id}`}
                  onClick={() => setCreditModal({ userId: u.id, name: u.full_name })}
                  className="btn-secondary btn-sm"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Event & Settings ────────────────────────────────────────────────────
function SettingsTab() {
  const [eventMode, setEventMode] = useState(false)
  const [outlets, setOutlets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('settings').select('event_mode').eq('id', 1).single(),
      supabase.from('outlets').select('*').order('name'),
    ]).then(([{ data: s }, { data: o }]) => {
      setEventMode(s?.event_mode ?? false)
      setOutlets(o || [])
      setLoading(false)
    })
  }, [])

  const toggleEventMode = async () => {
    const newVal = !eventMode
    await supabase.from('settings').update({ event_mode: newVal }).eq('id', 1)
    setEventMode(newVal)
    toast.success(newVal ? '🎉 Event mode ON — only event stalls visible' : 'Event mode OFF — regular outlets restored')
  }

  const toggleOutlet = async (id: string, isOpen: boolean) => {
    await supabase.from('outlets').update({ is_open: !isOpen }).eq('id', id)
    setOutlets(outlets.map(o => o.id === id ? { ...o, is_open: !isOpen } : o))
  }

  if (loading) return <div className="p-4"><div className="skeleton h-64"/></div>

  return (
    <div className="p-4 pb-safe space-y-4">
      {/* Event mode toggle */}
      <div className="card p-5 border border-brand-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">Event Mode</h3>
            <p className="text-xs text-white/40 mt-0.5">Switches all orders to event stalls only</p>
          </div>
          <button
            id="event-mode-toggle"
            onClick={toggleEventMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
              eventMode
                ? 'border-brand-500/40 bg-brand-500/20 text-brand-400'
                : 'border-white/10 text-white/50 hover:border-white/20'
            }`}
          >
            {eventMode ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            {eventMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Outlets */}
      <div className="card p-4">
        <h3 className="font-bold text-white mb-3">All Outlets</h3>
        {outlets.map((outlet) => (
          <div key={outlet.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
            <div>
              <p className="text-sm font-semibold text-white">{outlet.name}</p>
              <p className="text-xs text-white/40">{outlet.location} {outlet.is_event && '· 🎪 Event stall'}</p>
            </div>
            <button
              id={`outlet-toggle-${outlet.id}`}
              onClick={() => toggleOutlet(outlet.id, outlet.is_open)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                outlet.is_open
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}
            >
              {outlet.is_open ? 'Open' : 'Closed'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Admin Dashboard Root ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState<'overview' | 'orders' | 'users' | 'settings'>('overview')
  const { profile, signOut } = useAuthStore()

  return (
    <div className="min-h-screen bg-surface-950">
      <header className="sticky top-0 z-30 bg-surface-900/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center">🔑</div>
          <div>
            <h1 className="font-bold text-white text-sm">Admin</h1>
            <p className="text-xs text-white/30">{profile?.full_name}</p>
          </div>
        </div>
        <button id="admin-signout" onClick={signOut} className="btn-icon btn-sm"><LogOut size={16} /></button>
      </header>

      <main className="max-w-3xl mx-auto">
        {tab === 'overview'  && <OverviewTab />}
        {tab === 'orders'    && <AllOrdersTab />}
        {tab === 'users'     && <UsersTab />}
        {tab === 'settings'  && <SettingsTab />}
      </main>

      <nav className="bottom-nav">
        {([
          ['overview', LayoutDashboard, 'Overview'],
          ['orders',   ShoppingBag,    'Orders'],
          ['users',    Users,          'Users'],
          ['settings', Settings,       'Settings'],
        ] as const).map(([id, Icon, label]) => (
          <button key={id} id={`admin-nav-${id}`} onClick={() => setTab(id)} className={`bottom-nav-item ${tab === id ? 'active' : ''}`}>
            <Icon size={22} /><span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
