import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'
import {
  LayoutDashboard, Users, ShoppingBag, Settings,
  LogOut, TrendingUp, DollarSign, ToggleLeft, ToggleRight,
  Download, Search, Loader2, Plus, X, Wallet,
  Store, ChevronRight, Shield, UserCheck, Edit3,
  Hash, Package, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

// ─── Animated Stat Card ───────────────────────────────────────────────────────
function StatCard({ label, value, Icon, color, bg, delay = 0 }: any) {
  return (
    <div
      className="card p-4"
      style={{ animation: `slideInUp 0.35s ${delay}s cubic-bezier(0.34,1.56,0.64,1) both` }}
    >
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon size={20} className={color} />
      </div>
      <div className="text-xl font-black text-white">{value}</div>
      <div className="text-xs text-white/40 mt-0.5">{label}</div>
    </div>
  )
}

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

    const [{ data: orders }, { data: walletData }, { data: userCount }] = await Promise.all([
      supabase.from('orders').select('id,total,shop_payout,my_profit,payment_method,outlet_id,status').gte('created_at', from),
      supabase.from('wallets').select('balance'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ])

    const completed = (orders || []).filter((o: any) => !['payment_pending','cancelled'].includes(o.status))
    const totalRevenue = completed.reduce((s: number, o: any) => s + o.shop_payout, 0)
    const totalProfit  = completed.reduce((s: number, o: any) => s + o.my_profit, 0)
    const walletFloat  = (walletData || []).reduce((s: number, w: any) => s + w.balance, 0)

    const outletMap: Record<string, any> = {}
    completed.forEach((o: any) => {
      if (!outletMap[o.outlet_id]) outletMap[o.outlet_id] = { outlet_id: o.outlet_id, orders: 0, revenue: 0, profit: 0 }
      outletMap[o.outlet_id].orders++
      outletMap[o.outlet_id].revenue += o.shop_payout
      outletMap[o.outlet_id].profit  += o.my_profit
    })
    setByOutlet(Object.values(outletMap).sort((a, b) => b.revenue - a.revenue))
    setStats({ orders: completed.length, totalRevenue, totalProfit, walletFloat, users: userCount })
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
            <button key={r} id={`range-${r}`} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range===r?'bg-brand-500 text-white':'text-white/40 hover:text-white/70'}`}>
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Orders" value={stats.orders} Icon={ShoppingBag} color="text-blue-400" bg="bg-blue-500/10" delay={0} />
        <StatCard label="Revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} Icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/10" delay={0.05} />
        <StatCard label="Platform Profit" value={`₹${stats.totalProfit.toLocaleString('en-IN')}`} Icon={TrendingUp} color="text-brand-400" bg="bg-brand-500/10" delay={0.1} />
        <StatCard label="Wallet Float" value={`₹${stats.walletFloat.toLocaleString('en-IN')}`} Icon={Wallet} color="text-purple-400" bg="bg-purple-500/10" delay={0.15} />
      </div>

      {/* Per-outlet */}
      <div className="card p-4">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <Store size={15} className="text-brand-400" /> Per Outlet
        </h3>
        {byOutlet.length === 0 && <p className="text-white/30 text-sm">No data for this period</p>}
        {byOutlet.map((o, i) => (
          <div key={o.outlet_id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-white/20 text-xs font-mono w-4">{i+1}</span>
              <div>
                <p className="text-sm font-semibold text-white capitalize">{o.outlet_id}</p>
                <p className="text-xs text-white/40">{o.orders} orders</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">₹{o.revenue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-brand-400">+₹{o.profit} profit</p>
            </div>
          </div>
        ))}
      </div>

      <button id="export-csv" onClick={exportCSV} className="btn-secondary w-full">
        <Download size={16} /> Export Full CSV
      </button>
    </div>
  )
}

// ─── Tab: All Orders ──────────────────────────────────────────────────────────
function AllOrdersTab() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(name, qty), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(200)
    setOrders(data || [])
    setLoading(false)
  }

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (!search) return true
    return String(o.id).includes(search) ||
      o.outlet_id.includes(search) ||
      o.token?.includes(search) ||
      o.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) return <div className="p-4 space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="skeleton h-20"/>)}</div>

  return (
    <div className="p-4 pb-safe space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input id="order-search" className="input pl-10" placeholder="Search by ID, outlet, token, student name…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['all','placed','preparing','ready','collected','cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              statusFilter === s ? 'border-brand-500 bg-brand-500/20 text-brand-400' : 'border-white/10 text-white/40 hover:border-white/20'
            }`}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/30">{filtered.length} orders</p>

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
                <p className="text-xs text-white/40 mt-0.5">
                  {o.profiles?.full_name || o.user_id.slice(0,8)} · {o.outlet_id} · {new Date(o.created_at).toLocaleDateString('en-IN')} {new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
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
  const [outlets, setOutlets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [creditModal, setCreditModal] = useState<{ userId: string; name: string } | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [crediting, setCrediting] = useState(false)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [userOrders, setUserOrders] = useState<Record<string, any[]>>({})

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*, wallets(balance)').order('created_at', { ascending: false }),
      supabase.from('outlets').select('id, name').order('name'),
    ]).then(([{ data: u }, { data: o }]) => {
      setUsers(u || [])
      setOutlets(o || [])
      setLoading(false)
    })
  }, [])

  const updateRole = async (userId: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
    toast.success('Role updated')
  }

  const updateOutlet = async (userId: string, outletId: string | null) => {
    await supabase.from('profiles').update({ outlet_id: outletId || null }).eq('id', userId)
    setUsers(users.map(u => u.id === userId ? { ...u, outlet_id: outletId } : u))
    toast.success('Outlet assigned')
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
      const { data } = await supabase.from('profiles').select('*, wallets(balance)').order('created_at', { ascending: false })
      setUsers(data || [])
    } catch (err: any) { toast.error(err.message) }
    setCrediting(false)
  }

  const loadUserOrders = async (userId: string) => {
    if (userOrders[userId]) { setExpandedUser(expandedUser === userId ? null : userId); return }
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, outlet_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    setUserOrders(prev => ({ ...prev, [userId]: data || [] }))
    setExpandedUser(userId)
  }

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (!search) return true
    return u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search)
  })

  if (loading) return <div className="p-4 space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-20"/>)}</div>

  const roleColors: Record<string, string> = {
    admin:    'text-brand-400 bg-brand-500/10 border-brand-500/30',
    staff:    'text-blue-400 bg-blue-500/10 border-blue-500/30',
    customer: 'text-white/40 bg-white/5 border-white/10',
  }

  return (
    <div className="p-4 pb-safe space-y-3">
      {/* Credit modal */}
      {creditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="card p-5 w-full max-w-sm space-y-4" style={{ animation: 'slideInUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2"><Wallet size={16} className="text-brand-400" /> Credit Wallet</h3>
              <button onClick={() => setCreditModal(null)} className="btn-icon btn-sm"><X size={16} /></button>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-white/40">Crediting to</p>
              <p className="font-semibold text-white">{creditModal.name}</p>
            </div>
            <div>
              <label className="label">Amount (₹)</label>
              <input id="credit-amount" className="input text-lg font-bold" type="number" placeholder="e.g. 500" value={creditAmount} onChange={e=>setCreditAmount(e.target.value)} autoFocus />
            </div>
            <div className="flex gap-2">
              {[50, 100, 200, 500].map(a => (
                <button key={a} onClick={() => setCreditAmount(String(a))}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${creditAmount === String(a) ? 'border-brand-500 bg-brand-500/20 text-brand-400' : 'border-white/10 text-white/40'}`}>
                  ₹{a}
                </button>
              ))}
            </div>
            <button id="credit-submit" onClick={creditWallet} disabled={crediting} className="btn-primary w-full">
              {crediting ? <Loader2 size={16} className="animate-spin"/> : `Credit ₹${creditAmount || '0'}`}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input id="user-search" className="input pl-10" placeholder="Search by name or ID…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      <div className="flex gap-1.5">
        {['all','customer','staff','admin'].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              roleFilter === r ? 'border-brand-500 bg-brand-500/20 text-brand-400' : 'border-white/10 text-white/40'
            }`}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
      <p className="text-xs text-white/30">{filtered.length} users</p>

      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 border ${roleColors[u.role]}`}>
                  {u.role === 'admin' ? '👑' : u.role === 'staff' ? '👨‍🍳' : (u.full_name?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{u.full_name || 'Unnamed'}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${roleColors[u.role]}`}>{u.role}</span>
                  </div>
                  <p className="text-xs text-white/40">
                    Wallet: <span className="text-white/60 font-semibold">₹{u.wallets?.[0]?.balance ?? 0}</span>
                    {u.outlet_id && <span className="ml-2 text-blue-400">· {u.outlet_id}</span>}
                  </p>
                </div>
              </div>

              {/* Actions row */}
              <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2">
                {/* Role selector */}
                <select
                  id={`role-${u.id}`}
                  value={u.role}
                  onChange={e => updateRole(u.id, e.target.value)}
                  className="input py-1.5 text-xs col-span-1"
                >
                  <option value="customer">Customer</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>

                {/* Outlet selector (only for staff) */}
                {u.role === 'staff' ? (
                  <select
                    id={`outlet-${u.id}`}
                    value={u.outlet_id || ''}
                    onChange={e => updateOutlet(u.id, e.target.value || null)}
                    className="input py-1.5 text-xs col-span-1"
                  >
                    <option value="">No outlet</option>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                ) : (
                  <div className="col-span-1" />
                )}

                {/* Credit + History buttons */}
                <div className="flex gap-1.5 justify-end">
                  <button
                    id={`credit-${u.id}`}
                    onClick={() => setCreditModal({ userId: u.id, name: u.full_name })}
                    className="btn-primary btn-sm px-3"
                    title="Credit wallet"
                  >
                    <Plus size={13} /> ₹
                  </button>
                  <button
                    id={`history-${u.id}`}
                    onClick={() => loadUserOrders(u.id)}
                    className="btn-secondary btn-sm px-2"
                    title="View orders"
                  >
                    <ChevronRight size={13} className={`transition-transform duration-200 ${expandedUser === u.id ? 'rotate-90' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded order history */}
            {expandedUser === u.id && (
              <div className="border-t border-white/5 bg-white/3 p-3 space-y-1.5" style={{ animation: 'slideInUp 0.2s ease both' }}>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Recent Orders</p>
                {(userOrders[u.id] || []).length === 0 && <p className="text-xs text-white/20">No orders yet</p>}
                {(userOrders[u.id] || []).map(o => (
                  <div key={o.id} className="flex items-center justify-between text-xs">
                    <span className="text-white/50">#{o.id} · {o.outlet_id}</span>
                    <div className="flex items-center gap-2">
                      <span className={`status-${o.status} text-[10px]`}>{o.status}</span>
                      <span className="text-white/70 font-semibold">₹{o.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Settings / Outlets ──────────────────────────────────────────────────
function SettingsTab() {
  const [eventMode, setEventMode] = useState(false)
  const [outlets, setOutlets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newOutlet, setNewOutlet] = useState({ id: '', name: '', location: '', is_event: false })
  const [showAddOutlet, setShowAddOutlet] = useState(false)
  const [saving, setSaving] = useState(false)

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
    toast.success(`${id} is now ${!isOpen ? 'Open' : 'Closed'}`)
  }

  const addOutlet = async () => {
    if (!newOutlet.id || !newOutlet.name || !newOutlet.location) {
      toast.error('Fill all fields'); return
    }
    setSaving(true)
    const { error } = await supabase.from('outlets').insert({
      id: newOutlet.id.toLowerCase().replace(/\s+/g, '_'),
      name: newOutlet.name,
      location: newOutlet.location,
      is_event: newOutlet.is_event,
      is_open: true,
    })
    if (error) toast.error(error.message)
    else {
      toast.success(`${newOutlet.name} added!`)
      setShowAddOutlet(false)
      setNewOutlet({ id: '', name: '', location: '', is_event: false })
      const { data } = await supabase.from('outlets').select('*').order('name')
      setOutlets(data || [])
    }
    setSaving(false)
  }

  if (loading) return <div className="p-4"><div className="skeleton h-64"/></div>

  return (
    <div className="p-4 pb-safe space-y-4">

      {/* Event mode */}
      <div className="card p-5 border border-brand-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">🎉 Event Mode</h3>
            <p className="text-xs text-white/40 mt-0.5">Shows only event stalls (Riviera / GraVITas)</p>
          </div>
          <button
            id="event-mode-toggle"
            onClick={toggleEventMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all duration-300 ${
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

      {/* Outlets management */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white flex items-center gap-2"><Store size={15} className="text-brand-400" /> Outlets ({outlets.length})</h3>
          <button id="add-outlet-btn" onClick={() => setShowAddOutlet(!showAddOutlet)} className="btn-primary btn-sm">
            <Plus size={13} /> Add
          </button>
        </div>

        {/* Add outlet form */}
        {showAddOutlet && (
          <div className="mb-4 p-4 rounded-xl border border-brand-500/20 bg-brand-500/5 space-y-3" style={{ animation: 'slideInUp 0.25s ease both' }}>
            <p className="text-sm font-bold text-white">New Outlet</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Short ID</label>
                <input className="input text-sm" placeholder="e.g. gazebo" value={newOutlet.id} onChange={e => setNewOutlet({...newOutlet, id: e.target.value})} />
              </div>
              <div>
                <label className="label">Name</label>
                <input className="input text-sm" placeholder="e.g. Gazebo" value={newOutlet.name} onChange={e => setNewOutlet({...newOutlet, name: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input text-sm" placeholder="e.g. Ground Floor, Block A" value={newOutlet.location} onChange={e => setNewOutlet({...newOutlet, location: e.target.value})} />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNewOutlet({...newOutlet, is_event: !newOutlet.is_event})}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  newOutlet.is_event ? 'border-brand-500/40 bg-brand-500/20 text-brand-400' : 'border-white/10 text-white/40'
                }`}
              >
                {newOutlet.is_event ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>} Event Stall
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={addOutlet} disabled={saving} className="btn-primary btn-sm flex-1">
                {saving ? <Loader2 size={13} className="animate-spin"/> : <><Plus size={13}/> Save Outlet</>}
              </button>
              <button onClick={() => setShowAddOutlet(false)} className="btn-secondary btn-sm"><X size={13}/></button>
            </div>
          </div>
        )}

        {outlets.map((outlet) => (
          <div key={outlet.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
            <div>
              <p className="text-sm font-semibold text-white">{outlet.name}</p>
              <p className="text-xs text-white/40">{outlet.location} {outlet.is_event && '· 🎪 Event'}</p>
            </div>
            <button
              id={`outlet-toggle-${outlet.id}`}
              onClick={() => toggleOutlet(outlet.id, outlet.is_open)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 ${
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
          <div className="w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-500/20 flex items-center justify-center">👑</div>
          <div>
            <h1 className="font-bold text-white text-sm">Admin Panel</h1>
            <p className="text-xs text-white/30">{profile?.full_name} · Main Admin</p>
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
          ['settings', Settings,       'Outlets'],
        ] as const).map(([id, Icon, label]) => (
          <button key={id} id={`admin-nav-${id}`} onClick={() => setTab(id)} className={`bottom-nav-item ${tab === id ? 'active' : ''}`}>
            <Icon size={22} /><span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
