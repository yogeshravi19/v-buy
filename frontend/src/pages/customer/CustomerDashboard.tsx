import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore, useWalletStore, useCartStore } from '../../store'
import {
  Wallet, ShoppingBag, History, LogOut, Plus, Minus, Search,
  Leaf, X, ChevronRight, ArrowUpRight, ArrowDownLeft, Loader2, Store, CheckCircle2, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import QRCode from 'qrcode'

// ─── Types ───────────────────────────────────────────────────────────────────
type Outlet = { id: string; name: string; location: string; is_event: boolean; is_open: boolean }
type MenuItem = {
  id: number; outlet_id: string; name: string; price: number
  available: boolean; is_veg: boolean; category: string
  available_from: string | null; available_to: string | null
  stock_qty: number | null; reserved_qty: number
}
type Order = {
  id: number; outlet_id: string; token: string | null
  status: string; payment_method: string
  total: number; shop_payout: number
  created_at: string; updated_at: string
  cancel_reason: string | null; expires_at: string | null
  order_items?: { name: string; price: number; qty: number }[]
}

// ─── Helper ───────────────────────────────────────────────────────────────────
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    payment_pending: 'Awaiting Payment', placed: 'Order Placed',
    preparing: 'Preparing', ready: 'Ready for Pickup!',
    collected: 'Collected', cancelled: 'Cancelled',
  }
  return <span className={`status-${status}`}>{labels[status] || status}</span>
}

// ─── Tab: Wallet ─────────────────────────────────────────────────────────────
function WalletTab() {
  const { user } = useAuthStore()
  const { balance, fetchBalance } = useWalletStore()
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupMethod, setTopupMethod] = useState<'upi' | 'card'>('upi')
  const [showTopup, setShowTopup] = useState(false)

  useEffect(() => {
    if (user) { fetchBalance(user.id); loadTxns() }
  }, [user])

  const loadTxns = async () => {
    const { data } = await supabase
      .from('wallet_txns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    setTxns(data || [])
  }

  const handleTopup = async () => {
    const amount = parseInt(topupAmount)
    if (!amount || amount < 10) { toast.error('Minimum top-up is ₹10'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/wallet/topup', { amount, method: topupMethod })
      window.open(data.checkout_url, '_blank')
      setShowTopup(false)
      toast.success('Redirecting to PhonePe…')
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  const quickAmounts = [100, 200, 500]

  return (
    <div className="p-4 space-y-5 pb-safe">
      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-orange-400 p-6 shadow-2xl shadow-brand-500/30">
        <div className="absolute inset-0 bg-hero-pattern opacity-20" />
        <div className="relative z-10">
          <p className="text-brand-100/70 text-sm font-medium mb-1">Wallet Balance</p>
          <div className="wallet-balance text-white">
            {balance === null ? (
              <Loader2 size={28} className="animate-spin" />
            ) : `₹${balance.toLocaleString('en-IN')}`}
          </div>
          <button
            id="topup-btn"
            onClick={() => setShowTopup(true)}
            className="mt-4 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all border border-white/20"
          >
            <Plus size={16} /> Add Money
          </button>
        </div>
      </div>

      {/* Top-up sheet */}
      {showTopup && (
        <div className="card p-5 animate-slide-up border border-brand-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Add Money</h3>
            <button onClick={() => setShowTopup(false)} className="btn-icon btn-sm"><X size={16} /></button>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 mb-4">
            {quickAmounts.map((a) => (
              <button
                key={a}
                id={`topup-quick-${a}`}
                onClick={() => setTopupAmount(String(a))}
                className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  topupAmount === String(a)
                    ? 'border-brand-500 bg-brand-500/20 text-brand-400'
                    : 'border-white/10 text-white/60 hover:border-white/30'
                }`}
              >₹{a}</button>
            ))}
          </div>

          <div className="mb-4">
            <label className="label">Custom Amount</label>
            <input
              id="topup-custom"
              className="input"
              type="number"
              placeholder="Enter amount"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              min={10}
            />
          </div>

          {/* Payment method */}
          <div className="mb-4">
            <label className="label">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {([['upi', 'UPI / RuPay', '0% fee'], ['card', 'Credit/Debit Card', '~2.36% fee']] as const).map(([m, label, fee]) => (
                <button
                  key={m}
                  id={`topup-method-${m}`}
                  onClick={() => setTopupMethod(m)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    topupMethod === m
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{label}</div>
                  <div className="text-xs text-white/40">{fee}</div>
                </button>
              ))}
            </div>
          </div>

          {topupAmount && topupMethod === 'card' && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
              You'll be charged ₹{Math.ceil(parseInt(topupAmount || '0') / 0.9765)} — wallet credited ₹{topupAmount}
            </div>
          )}

          <button
            id="topup-proceed"
            onClick={handleTopup}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : `Proceed to Pay ₹${topupAmount || '0'}`}
          </button>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Transaction History</h3>
        <div className="space-y-2">
          {txns.length === 0 && (
            <div className="card p-8 text-center text-white/30 text-sm">No transactions yet</div>
          )}
          {txns.map((txn) => (
            <div key={txn.id} className="card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                txn.amount > 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'
              }`}>
                {txn.amount > 0
                  ? <ArrowDownLeft size={18} className="text-emerald-400" />
                  : <ArrowUpRight size={18} className="text-red-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {txn.kind === 'topup' ? 'Wallet Top-up'
                    : txn.kind === 'order' ? 'Order Payment'
                    : txn.kind === 'refund' ? 'Refund'
                    : 'Admin Credit'}
                </p>
                <p className="text-xs text-white/40">{formatDate(txn.created_at)} · {formatTime(txn.created_at)}</p>
              </div>
              <span className={`font-bold text-sm ${txn.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                {txn.amount > 0 ? '+' : ''}₹{Math.abs(txn.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Menu / Browse ───────────────────────────────────────────────────────
function MenuTab() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [search, setSearch] = useState('')
  const [vegOnly, setVegOnly] = useState(false)
  const [under50, setUnder50] = useState(false)
  const { items: cartItems, addItem, updateQty, outlet_id: cartOutlet } = useCartStore()
  const [eventMode, setEventMode] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('event_mode').eq('id', 1).single()
      .then(({ data }) => setEventMode(data?.event_mode ?? false))
    supabase.from('outlets').select('*').then(({ data }) => setOutlets(data || []))
  }, [])

  const loadMenu = async (outlet: Outlet) => {
    setSelectedOutlet(outlet)
    const now = new Date()
    const nowTime = now.toTimeString().slice(0, 5)
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('outlet_id', outlet.id)
      .eq('available', true)
    // Filter by time window client-side (server proc already enforces on order)
    const filtered = (data || []).filter((item: MenuItem) => {
      if (item.available_from && item.available_to) {
        return nowTime >= item.available_from && nowTime <= item.available_to
      }
      return true
    })
    setItems(filtered)
  }

  const visibleItems = items.filter((i) => {
    if (vegOnly && !i.is_veg) return false
    if (under50 && i.price >= 50) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const categories = [...new Set(visibleItems.map((i) => i.category))]

  const cartQty = (id: number) => cartItems.find((i) => i.item_id === id)?.qty || 0

  if (!selectedOutlet) {
    return (
      <div className="p-4 pb-safe">
        <h2 className="text-lg font-bold text-white mb-4">
          {eventMode ? '🎉 Event Stalls' : 'Outlets'}
        </h2>
        <div className="space-y-3">
          {outlets
            .filter((o) => eventMode ? o.is_event : !o.is_event)
            .map((outlet) => (
              <button
                key={outlet.id}
                id={`outlet-${outlet.id}`}
                onClick={() => outlet.is_open && loadMenu(outlet)}
                className={`w-full card p-5 flex items-center gap-4 text-left transition-all hover:border-brand-500/30 ${
                  !outlet.is_open ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-500/20 flex items-center justify-center text-2xl">
                  {outlet.is_event ? '🎪' : '🍽️'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white">{outlet.name}</h3>
                    {!outlet.is_open && <span className="badge-red text-xs">Closed</span>}
                    {outlet.is_open && <span className="badge-green text-xs">Open</span>}
                  </div>
                  <p className="text-sm text-white/40">{outlet.location}</p>
                </div>
                <ChevronRight size={18} className="text-white/30" />
              </button>
            ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface-950/95 backdrop-blur-xl border-b border-white/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            id="back-to-outlets"
            onClick={() => setSelectedOutlet(null)}
            className="btn-icon btn-sm"
          >
            <ChevronRight size={16} className="rotate-180" />
          </button>
          <div>
            <h2 className="font-bold text-white">{selectedOutlet.name}</h2>
            <p className="text-xs text-white/40">{selectedOutlet.location}</p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            id="menu-search"
            className="input pl-10 py-2.5"
            placeholder="Search menu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {[['Veg Only', vegOnly, () => setVegOnly(!vegOnly)], ['Under ₹50', under50, () => setUnder50(!under50)]].map(
            ([label, active, toggle]: any) => (
              <button
                key={label as string}
                id={`filter-${(label as string).replace(/\s/g, '-').toLowerCase()}`}
                onClick={toggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  active ? 'border-brand-500 bg-brand-500/20 text-brand-400' : 'border-white/10 text-white/50 hover:border-white/20'
                }`}
              >
                {label === 'Veg Only' && <Leaf size={12} />} {label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Cart warning if different outlet */}
      {cartOutlet && cartOutlet !== selectedOutlet.id && cartItems.length > 0 && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          ⚠️ Adding items from here will clear your cart from another outlet
        </div>
      )}

      {/* Menu by category */}
      <div className="p-4 space-y-6">
        {categories.map((cat) => (
          <div key={cat}>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">{cat}</h3>
            <div className="space-y-2">
              {visibleItems.filter((i) => i.category === cat).map((item) => {
                const qty = cartQty(item.id)
                const effectiveStock = item.stock_qty !== null
                  ? item.stock_qty - item.reserved_qty
                  : null
                const soldOut = effectiveStock !== null && effectiveStock <= 0

                return (
                  <div
                    key={item.id}
                    className={`card p-4 flex items-center gap-4 transition-all ${soldOut ? 'opacity-50' : ''}`}
                  >
                    <div className="flex-shrink-0">
                      {item.is_veg ? <div className="veg-dot" /> : <div className="nonveg-dot" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{item.name}</p>
                      <p className="text-brand-400 font-bold text-sm">₹{item.price}</p>
                      {soldOut && <p className="text-xs text-red-400">Sold out</p>}
                    </div>
                    <div className="flex-shrink-0">
                      {soldOut ? (
                        <span className="badge-red text-xs">Sold Out</span>
                      ) : qty === 0 ? (
                        <button
                          id={`add-item-${item.id}`}
                          onClick={() => addItem({ item_id: item.id, name: item.name, price: item.price, qty: 1, is_veg: item.is_veg }, item.outlet_id)}
                          className="btn-primary btn-sm flex items-center gap-1"
                        >
                          <Plus size={14} /> Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-brand-500/20 rounded-xl px-2 py-1 border border-brand-500/30">
                          <button id={`dec-${item.id}`} onClick={() => updateQty(item.id, qty - 1)} className="text-brand-400 hover:text-brand-300">
                            <Minus size={14} />
                          </button>
                          <span className="text-white font-bold text-sm w-4 text-center">{qty}</span>
                          <button id={`inc-${item.id}`} onClick={() => updateQty(item.id, qty + 1)} className="text-brand-400 hover:text-brand-300">
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Cart Checkout Sheet ──────────────────────────────────────────────────────
function CartSheet({ onClose }: { onClose: () => void }) {
  const { items, outlet_id, clearCart, total } = useCartStore()
  const { balance } = useWalletStore()
  const [method, setMethod] = useState<'wallet' | 'gateway'>('wallet')
  const [loading, setLoading] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<{ id: number; token: string; qrUrl: string } | null>(null)
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null)

  const shopPayout = total()
  const orderTotal = Math.ceil(shopPayout * 1.05)
  const insufficientBalance = method === 'wallet' && (balance ?? 0) < orderTotal

  // Listen for Realtime on pending gateway order
  useEffect(() => {
    if (!pendingOrderId) return
    const ch = supabase.channel(`order-${pendingOrderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `id=eq.${pendingOrderId}`,
      }, async (payload) => {
        const updated = payload.new as any
        if (updated.status === 'placed' && updated.token) {
          const qrUrl = await QRCode.toDataURL(`cb:order:${pendingOrderId}`, { width: 200, margin: 1, color: { dark: '#f97316', light: '#0f172a' } })
          setPlacedOrder({ id: pendingOrderId, token: updated.token, qrUrl })
          setPendingOrderId(null)
          clearCart()
        } else if (updated.status === 'cancelled') {
          toast.error('Payment failed or expired. Please try again.')
          setPendingOrderId(null)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [pendingOrderId])

  const placeOrder = async () => {
    if (!outlet_id) return
    setLoading(true)
    try {
      const payload = { outlet_id, items: items.map(i => ({ item_id: i.item_id, qty: i.qty })), payment_method: method }
      const { data } = await api.post('/order/checkout', payload)

      if (method === 'wallet') {
        const qrUrl = await QRCode.toDataURL(`cb:order:${data.order_id}`, { width: 200, margin: 1, color: { dark: '#f97316', light: '#0f172a' } })
        setPlacedOrder({ id: data.order_id, token: data.token, qrUrl })
        clearCart()
      } else {
        // Gateway path — open PhonePe and wait for webhook
        window.open(data.checkout_url, '_blank')
        setPendingOrderId(data.order_id)
        toast('Complete payment in PhonePe…', { icon: '⏳' })
      }
    } catch (err: any) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  // ── Order confirmed screen ────────────────────────────────────────────────
  if (placedOrder) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
        <CheckCircle2 size={56} className="text-emerald-400 mb-4 animate-bounce-in" />
        <h2 className="text-2xl font-black text-white mb-1">Order Placed! 🎉</h2>
        <p className="text-white/50 text-sm mb-6">Show this QR or token at pickup</p>
        <div className="card p-6 w-full max-w-xs text-center space-y-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Your Token</p>
            <div className="text-6xl font-black text-brand-400 tracking-widest">{placedOrder.token}</div>
          </div>
          <div className="divider" />
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-3">QR Code</p>
            <img src={placedOrder.qrUrl} alt="QR" className="w-40 h-40 mx-auto rounded-xl" />
          </div>
        </div>
        <button id="order-done-btn" onClick={onClose} className="btn-primary mt-6">Done</button>
      </div>
    )
  }

  // ── Waiting for gateway ────────────────────────────────────────────────────
  if (pendingOrderId) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6">
        <Loader2 size={48} className="text-brand-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Confirming Payment…</h2>
        <p className="text-white/50 text-sm text-center">Complete payment in PhonePe. This page will update automatically.</p>
        <p className="text-white/30 text-xs mt-4">Order #{pendingOrderId}</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-surface-900 rounded-t-3xl border-t border-white/10 p-5 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Your Cart</h2>
          <button id="close-cart" onClick={onClose} className="btn-icon btn-sm"><X size={16} /></button>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-5">
          {items.map((item) => (
            <div key={item.item_id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.is_veg ? <div className="veg-dot" /> : <div className="nonveg-dot" />}
                <span className="text-sm text-white">{item.name} × {item.qty}</span>
              </div>
              <span className="text-sm font-semibold text-white">₹{item.price * item.qty}</span>
            </div>
          ))}
        </div>
        <div className="divider" />

        {/* Totals */}
        <div className="space-y-2 mb-5 text-sm">
          <div className="flex justify-between text-white/60">
            <span>Subtotal</span><span>₹{shopPayout}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Platform fee (5%)</span><span>₹{orderTotal - shopPayout}</span>
          </div>
          <div className="flex justify-between text-white font-bold text-base">
            <span>Total</span><span>₹{orderTotal}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="mb-5">
          <label className="label">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="pay-wallet"
              onClick={() => setMethod('wallet')}
              className={`p-3 rounded-xl border text-left transition-all ${method === 'wallet' ? 'border-brand-500 bg-brand-500/10' : 'border-white/10'}`}
            >
              <div className="text-sm font-semibold text-white flex items-center gap-1.5"><Wallet size={14} className="text-brand-400" /> Wallet</div>
              <div className="text-xs mt-0.5">
                {balance !== null ? (
                  <span className={balance < orderTotal ? 'text-red-400' : 'text-emerald-400'}>Balance: ₹{balance}</span>
                ) : <span className="text-white/30">Loading…</span>}
              </div>
            </button>
            <button
              id="pay-gateway"
              onClick={() => setMethod('gateway')}
              className={`p-3 rounded-xl border text-left transition-all ${method === 'gateway' ? 'border-brand-500 bg-brand-500/10' : 'border-white/10'}`}
            >
              <div className="text-sm font-semibold text-white">Pay via UPI</div>
              <div className="text-xs text-white/40 mt-0.5">PhonePe · No wallet needed</div>
            </button>
          </div>
        </div>

        {insufficientBalance && (
          <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
            <AlertCircle size={14} />
            Insufficient wallet balance. Add ₹{orderTotal - (balance ?? 0)} more or pay via UPI.
          </div>
        )}

        <button
          id="place-order-btn"
          onClick={placeOrder}
          disabled={loading || (method === 'wallet' && insufficientBalance)}
          className="btn-primary w-full"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : `Place Order · ₹${orderTotal}`}
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Order History ──────────────────────────────────────────────────────
function OrdersTab() {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [qrUrls, setQrUrls] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!user) return
    loadOrders()

    // Live updates
    const ch = supabase.channel('my-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        () => loadOrders())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user])

  const loadOrders = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(name, price, qty)')
      .order('created_at', { ascending: false })
      .limit(20)
    setOrders(data || [])
    setLoading(false)

    // Generate QRs for placed/ready orders
    for (const o of (data || [])) {
      if (['placed', 'preparing', 'ready'].includes(o.status) && o.token) {
        QRCode.toDataURL(`cb:order:${o.id}`, { width: 180, margin: 1, color: { dark: '#f97316', light: '#0f172a' } })
          .then(url => setQrUrls(prev => ({ ...prev, [o.id]: url })))
      }
    }
  }

  if (loading) {
    return <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div>
  }

  return (
    <div className="p-4 pb-safe space-y-3">
      <h2 className="text-lg font-bold text-white">Order History</h2>
      {orders.length === 0 && (
        <div className="card p-10 text-center text-white/30">
          <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
          <p>No orders yet</p>
        </div>
      )}
      {orders.map((order) => (
        <div key={order.id} className="card p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={order.status} />
                <span className="badge-gray">{order.payment_method === 'wallet' ? '💳 Wallet' : '📱 UPI'}</span>
              </div>
              <p className="text-xs text-white/40 mt-1">
                #{order.id} · {formatDate(order.created_at)} {formatTime(order.created_at)}
              </p>
            </div>
            <span className="font-bold text-white">₹{order.total}</span>
          </div>

          {/* Items */}
          <div className="text-sm text-white/60 space-y-0.5">
            {order.order_items?.map((oi, i) => (
              <div key={i}>{oi.name} × {oi.qty}</div>
            ))}
          </div>

          {/* Token + QR if active */}
          {order.token && ['placed', 'preparing', 'ready'].includes(order.status) && (
            <div className="flex items-center gap-4 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
              <div>
                <p className="text-xs text-brand-400/60 mb-0.5">Token</p>
                <div className="text-3xl font-black text-brand-400 tracking-widest">{order.token}</div>
              </div>
              {qrUrls[order.id] && (
                <img src={qrUrls[order.id]} alt="QR" className="w-16 h-16 rounded-lg" />
              )}
            </div>
          )}

          {order.cancel_reason && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2">{order.cancel_reason}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Customer Dashboard Root ──────────────────────────────────────────────────
export default function CustomerDashboard() {
  const [tab, setTab] = useState<'wallet' | 'menu' | 'orders'>('menu')
  const [showCart, setShowCart] = useState(false)
  const { signOut, profile } = useAuthStore()
  const { items } = useCartStore()
  const cartCount = items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#07070d]/95 backdrop-blur-2xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500/30 to-amber-500/10 border border-orange-500/30 flex items-center justify-center shadow-lg shadow-orange-500/10">
            <span className="text-lg">⚡</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold font-heading text-lg tracking-tight bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">V-BUY</h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/25">VITC</span>
            </div>
            <p className="text-[11px] text-white/40 leading-tight font-sans">{profile?.full_name || 'VIT Chennai Student'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cartCount > 0 && (
            <button
              id="cart-btn"
              onClick={() => setShowCart(true)}
              className="relative btn-primary btn-sm px-4 animate-bounce-in"
            >
              <ShoppingBag size={15} />
              <span className="hidden sm:inline">Cart</span>
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-orange-600 text-xs font-black rounded-full flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            </button>
          )}
          <button id="signout-btn" onClick={signOut} className="btn-icon btn-sm" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto">
        {tab === 'wallet' && <WalletTab />}
        {tab === 'menu' && <MenuTab />}
        {tab === 'orders' && <OrdersTab />}
      </main>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {([
          ['menu',   Store,      'Menu'],
          ['wallet', Wallet,     'Wallet'],
          ['orders', History,    'Orders'],
        ] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => setTab(id)}
            className={`bottom-nav-item ${tab === id ? 'active' : ''}`}
          >
            <Icon size={22} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>

      {/* Cart Sheet */}
      {showCart && <CartSheet onClose={() => setShowCart(false)} />}
    </div>
  )
}
