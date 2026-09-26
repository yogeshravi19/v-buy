import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'
import {
  ClipboardList, Package, BarChart2, LogOut,
  CheckCircle, Clock, Loader2, ScanLine, X,
  TrendingUp, DollarSign, ShoppingCart, ToggleLeft, ToggleRight,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

type Order = {
  id: number; user_id: string; token: string | null; status: string
  payment_method: string; total: number; shop_payout: number
  created_at: string; updated_at: string; cancel_reason: string | null
  order_items?: { name: string; price: number; qty: number }[]
}
type MenuItem = {
  id: number; name: string; price: number; available: boolean
  is_veg: boolean; category: string
  available_from: string | null; available_to: string | null; stock_qty: number | null
}

const STATUS_ORDER = ['placed', 'preparing', 'ready', 'collected']

function statusLabel(s: string) {
  return { placed: 'Placed', preparing: 'Preparing', ready: 'Ready', collected: 'Collected', cancelled: 'Cancelled' }[s] || s
}

// ─── KOT Card ─────────────────────────────────────────────────────────────────
function KOTCard({ order, onAdvance, onCancel }: {
  order: Order
  onAdvance: (id: number) => void
  onCancel: (id: number) => void
}) {
  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(order.status) + 1]
  const isActive = ['placed', 'preparing', 'ready'].includes(order.status)

  const statusColors: Record<string, string> = {
    placed: 'border-blue-500/30 bg-blue-500/5',
    preparing: 'border-orange-500/30 bg-orange-500/5',
    ready: 'border-emerald-500/30 bg-emerald-500/5',
    collected: 'border-white/5',
  }

  return (
    <div className={`card border ${statusColors[order.status] || 'border-white/5'} p-4 animate-slide-up`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-black tracking-widest ${
              order.status === 'ready' ? 'text-emerald-400' : 'text-brand-400'
            }`}>
              #{order.token || '—'}
            </div>
            <span className={`status-${order.status}`}>{statusLabel(order.status)}</span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            Order #{order.id} · {order.payment_method === 'wallet' ? '💳' : '📱'} ·{' '}
            {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </p>
        </div>
        <span className="font-bold text-white">₹{order.shop_payout}</span>
      </div>

      {/* Items — KOT view (no pricing) */}
      <div className="border-t border-white/5 pt-3 mb-3 space-y-1">
        {order.order_items?.map((oi, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-white font-medium">{oi.name}</span>
            <span className="text-white/60 font-bold">× {oi.qty}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {isActive && (
        <div className="flex gap-2">
          {nextStatus && nextStatus !== 'collected' && (
            <button
              id={`advance-${order.id}`}
              onClick={() => onAdvance(order.id)}
              className="btn-primary btn-sm flex-1"
            >
              <CheckCircle size={14} />
              {nextStatus === 'preparing' ? 'Start Preparing' : 'Mark Ready'}
            </button>
          )}
          {order.status !== 'placed' && (
            <button
              id={`cancel-${order.id}`}
              onClick={() => onCancel(order.id)}
              className="btn-danger btn-sm"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Live Queue ──────────────────────────────────────────────────────────
function QueueTab({ outletId }: { outletId: string }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showScan, setShowScan] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevCountRef = useRef(0)

  useEffect(() => {
    loadOrders()
    const ch = supabase.channel(`outlet-orders-${outletId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `outlet_id=eq.${outletId}`,
      }, () => loadOrders())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [outletId])

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(name, price, qty)')
      .eq('outlet_id', outletId)
      .in('status', ['placed', 'preparing', 'ready'])
      .order('created_at', { ascending: true })
    const newOrders = data || []

    // Sound alert on new order
    if (newOrders.length > prevCountRef.current && prevCountRef.current !== 0) {
      audioRef.current?.play().catch(() => {})
      toast('🔔 New order received!', { duration: 3000, icon: '🍽️' })
    }
    prevCountRef.current = newOrders.length
    setOrders(newOrders)
    setLoading(false)
  }

  const advance = async (orderId: number) => {
    try {
      await api.post(`/staff/order/${orderId}/advance`)
      toast.success('Status updated')
    } catch (err: any) { toast.error(err.message) }
  }

  const cancel = async (orderId: number) => {
    const reason = prompt('Reason for cancellation?')
    if (!reason) return
    try {
      await api.post(`/staff/order/${orderId}/cancel`, { reason })
      toast.success('Order cancelled, customer refunded')
    } catch (err: any) { toast.error(err.message) }
  }

  const handleScan = async () => {
    if (!tokenInput.trim()) return
    try {
      const { data } = await api.post('/staff/scan', { token: tokenInput.trim(), outlet_id: outletId })
      toast.success(`Order #${data.order_id} collected!`)
      setTokenInput('')
      setShowScan(false)
    } catch (err: any) { toast.error(err.message) }
  }

  if (loading) return <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-32" />)}</div>

  return (
    <div className="p-4 pb-safe space-y-4">
      {/* Silent audio alert */}
      <audio ref={audioRef} src="/bell.mp3" preload="auto" />

      {/* Scan / collect */}
      <div className="card p-4 border border-brand-500/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white flex items-center gap-2"><ScanLine size={18} className="text-brand-400" /> Collect Order</h3>
          <button id="toggle-scan" onClick={() => setShowScan(!showScan)} className="btn-secondary btn-sm">
            {showScan ? 'Close' : 'Scan / Token'}
          </button>
        </div>
        {showScan && (
          <div className="flex gap-2">
            <input
              id="token-input"
              className="input flex-1"
              placeholder="Enter 3-digit token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              maxLength={3}
            />
            <button id="collect-btn" onClick={handleScan} className="btn-primary btn-sm px-4">Collect</button>
          </div>
        )}
      </div>

      {/* Order count */}
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <Clock size={14} />
        <span>{orders.length} active order{orders.length !== 1 ? 's' : ''}</span>
      </div>

      {orders.length === 0 && (
        <div className="card p-12 text-center text-white/30">
          <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
          <p>No active orders</p>
        </div>
      )}

      {orders.map((o) => (
        <KOTCard key={o.id} order={o} onAdvance={advance} onCancel={cancel} />
      ))}
    </div>
  )
}

// ─── Tab: Menu Management ─────────────────────────────────────────────────────
function MenuMgmtTab({ outletId }: { outletId: string }) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [outlet, setOutlet] = useState<{ is_open: boolean; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [outletId])

  const loadData = async () => {
    const [{ data: menuData }, { data: outletData }] = await Promise.all([
      supabase.from('menu_items').select('*').eq('outlet_id', outletId).order('category'),
      supabase.from('outlets').select('name, is_open').eq('id', outletId).single(),
    ])
    setItems(menuData || [])
    setOutlet(outletData)
    setLoading(false)
  }

  const toggleOutlet = async () => {
    if (!outlet) return
    const newOpen = !outlet.is_open
    await supabase.from('outlets').update({ is_open: newOpen }).eq('id', outletId)
    setOutlet({ ...outlet, is_open: newOpen })
    toast.success(newOpen ? 'Outlet is now Open' : 'Outlet is now Closed')
  }

  const toggleAvailable = async (item: MenuItem) => {
    const newAvail = !item.available
    await supabase.from('menu_items').update({ available: newAvail }).eq('id', item.id)
    setItems(items.map(i => i.id === item.id ? { ...i, available: newAvail } : i))
    toast.success(`${item.name} marked as ${newAvail ? 'available' : 'sold out'}`)
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase.from('menu_items').update({
      name: editing.name,
      price: editing.price,
      available_from: editing.available_from || null,
      available_to: editing.available_to || null,
      stock_qty: editing.stock_qty,
    }).eq('id', editing.id)
    if (error) toast.error(error.message)
    else { toast.success('Item updated'); setEditing(null); loadData() }
    setSaving(false)
  }

  if (loading) return <div className="p-4 space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-16" />)}</div>

  return (
    <div className="p-4 pb-safe space-y-4">
      {/* Outlet open/close toggle */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white">{outlet?.name}</h3>
          <p className="text-xs text-white/40">Outlet status</p>
        </div>
        <button
          id="toggle-outlet"
          onClick={toggleOutlet}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm transition-all ${
            outlet?.is_open
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {outlet?.is_open ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          {outlet?.is_open ? 'Open' : 'Closed'}
        </button>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
          <div className="bg-surface-900 rounded-t-3xl border-t border-white/10 p-5 w-full max-w-lg animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Edit Item</h3>
              <button onClick={() => setEditing(null)} className="btn-icon btn-sm"><X size={16} /></button>
            </div>
            <div>
              <label className="label">Name</label>
              <input id="edit-name" className="input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Price (₹)</label>
              <input id="edit-price" className="input" type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Available From</label>
                <input id="edit-from" className="input" type="time" value={editing.available_from || ''} onChange={e => setEditing({ ...editing, available_from: e.target.value })} />
              </div>
              <div>
                <label className="label">Available To</label>
                <input id="edit-to" className="input" type="time" value={editing.available_to || ''} onChange={e => setEditing({ ...editing, available_to: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Stock Qty (blank = unlimited)</label>
              <input id="edit-stock" className="input" type="number" value={editing.stock_qty ?? ''} placeholder="Unlimited" onChange={e => setEditing({ ...editing, stock_qty: e.target.value ? parseInt(e.target.value) : null })} />
            </div>
            <button id="save-item" onClick={saveEdit} disabled={saving} className="btn-primary w-full">
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="card p-4 flex items-center gap-3">
            <div>{item.is_veg ? <div className="veg-dot" /> : <div className="nonveg-dot" />}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{item.name}</p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span>₹{item.price}</span>
                {item.stock_qty !== null && <span>Stock: {item.stock_qty}</span>}
                {item.available_from && <span>{item.available_from}–{item.available_to}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                id={`avail-${item.id}`}
                onClick={() => toggleAvailable(item)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  item.available
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500/30 bg-red-500/10 text-red-400'
                }`}
              >
                {item.available ? 'Available' : 'Sold Out'}
              </button>
              <button id={`edit-item-${item.id}`} onClick={() => setEditing(item)} className="btn-secondary btn-sm">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Daily Summary ───────────────────────────────────────────────────────
function SummaryTab({ outletId }: { outletId: string }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [outletId])

  const loadStats = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('orders')
      .select('id, total, shop_payout, payment_method, status, order_items(name, qty)')
      .eq('outlet_id', outletId)
      .gte('created_at', today)

    const orders = data || []
    const completed = orders.filter(o => !['payment_pending', 'cancelled'].includes(o.status))
    const revenue = completed.reduce((s: number, o: any) => s + o.shop_payout, 0)
    const walletOrders = completed.filter((o: any) => o.payment_method === 'wallet').length
    const gatewayOrders = completed.filter((o: any) => o.payment_method === 'gateway').length

    // Best sellers
    const itemCounts: Record<string, number> = {}
    completed.forEach((o: any) => o.order_items?.forEach((oi: any) => {
      itemCounts[oi.name] = (itemCounts[oi.name] || 0) + oi.qty
    }))
    const bestSellers = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

    setStats({ count: completed.length, revenue, walletOrders, gatewayOrders, bestSellers })
    setLoading(false)
  }

  if (loading) return <div className="p-4"><div className="skeleton h-64" /></div>

  return (
    <div className="p-4 pb-safe space-y-4">
      <h2 className="text-lg font-bold text-white">Today's Summary</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Orders', stats.count, ShoppingCart, 'text-blue-400', 'bg-blue-500/10'],
          ['Revenue', `₹${stats.revenue}`, DollarSign, 'text-emerald-400', 'bg-emerald-500/10'],
          ['Wallet', stats.walletOrders, ClipboardList, 'text-brand-400', 'bg-brand-500/10'],
          ['UPI', stats.gatewayOrders, TrendingUp, 'text-purple-400', 'bg-purple-500/10'],
        ].map(([label, value, Icon, color, bg]: any) => (
          <div key={label} className="card p-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-xs text-white/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-brand-400" /> Best Sellers
        </h3>
        {stats.bestSellers.length === 0 && <p className="text-white/30 text-sm">No orders yet today</p>}
        {stats.bestSellers.map(([name, qty]: [string, number], i: number) => (
          <div key={name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs w-4">{i + 1}</span>
              <span className="text-sm text-white">{name}</span>
            </div>
            <span className="text-sm font-bold text-brand-400">{qty} sold</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shop Dashboard Root ──────────────────────────────────────────────────────
export default function ShopDashboard() {
  const [tab, setTab] = useState<'queue' | 'menu' | 'summary'>('queue')
  const { profile, signOut } = useAuthStore()
  const outletId = profile?.outlet_id || 'gazebo'

  if (!outletId) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center text-center p-6">
        <div>
          <AlertTriangle size={48} className="text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No outlet assigned</h2>
          <p className="text-white/50 text-sm">Ask an admin to assign you to an outlet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <header className="sticky top-0 z-30 bg-surface-900/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center text-base">👨‍🍳</div>
          <div>
            <h1 className="font-bold text-white text-sm">Staff Panel</h1>
            <p className="text-xs text-white/30">{profile?.full_name}</p>
          </div>
        </div>
        <button id="staff-signout" onClick={signOut} className="btn-icon btn-sm"><LogOut size={16} /></button>
      </header>

      <main className="max-w-2xl mx-auto">
        {tab === 'queue'   && <QueueTab outletId={outletId} />}
        {tab === 'menu'    && <MenuMgmtTab outletId={outletId} />}
        {tab === 'summary' && <SummaryTab outletId={outletId} />}
      </main>

      <nav className="bottom-nav">
        {([
          ['queue',   ClipboardList, 'Queue'],
          ['menu',    Package,       'Menu'],
          ['summary', BarChart2,     'Summary'],
        ] as const).map(([id, Icon, label]) => (
          <button key={id} id={`staff-nav-${id}`} onClick={() => setTab(id)} className={`bottom-nav-item ${tab === id ? 'active' : ''}`}>
            <Icon size={22} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
