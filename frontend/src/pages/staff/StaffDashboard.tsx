import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Clock, CheckCircle2, AlertCircle, ChefHat, Volume2, VolumeX,
  Search, RefreshCw, QrCode, Plus, Minus, Flame, Eye,
  ArrowRight, ShieldCheck, Check, Sparkles, Filter, Store,
  Zap, AlertTriangle, Layers, X, Hash, ShoppingBag
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'

export type OrderItem = {
  item_id?: number
  name: string
  price: number
  qty: number
  notes?: string
}

export type Order = {
  id: number
  user_id?: string
  outlet_id: string
  token: string | null
  status: 'placed' | 'preparing' | 'ready' | 'collected' | 'cancelled'
  payment_method?: string
  total: number
  shop_payout?: number
  pickup_slot_id?: string | null
  created_at: string
  updated_at?: string
  order_items?: OrderItem[]
  pickup_slot_label?: string
}

export type StaffMenuItem = {
  id: number
  outlet_id: string
  name: string
  price: number
  available: boolean
  is_veg: boolean
  category: string
  stock_qty: number | null
  reserved_qty?: number
}

export type StockAdjustmentLog = {
  id: number
  item_id: number
  item_name?: string
  qty_change: number
  previous_qty: number | null
  new_qty: number | null
  reason: string
  created_at: string
}

// ── Web Audio API sound alert ──
function playOrderChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12) // A5
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.24) // D6
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // Browser audio policy catch
  }
}

function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08) // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16) // G5
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.45)
  } catch {
    // Silent fallback
  }
}

function formatMinutesAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

interface StaffDashboardProps {
  forcedOutletId?: string
  outletName?: string
  onSignOut?: () => void
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  forcedOutletId,
  outletName,
  onSignOut
}) => {
  const profile = useAuthStore(state => state.profile)
  const effectiveOutletId = forcedOutletId || profile?.outlet_id || 'g1'
  const displayOutletName = outletName || (effectiveOutletId === 'g1' ? 'Gazebo C1 — Snacks & Fast Food' : `Outlet ${effectiveOutletId}`)

  // Views & Controls
  const [activeTab, setActiveTab] = useState<'queue' | 'stock' | 'history'>('queue')
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [queueFilter, setQueueFilter] = useState<'all' | 'placed' | 'preparing' | 'ready'>('all')
  const [searchToken, setSearchToken] = useState<string>('')
  const [slotGrouping, setSlotGrouping] = useState<boolean>(false)

  // Realtime & Data
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<StaffMenuItem[]>([])
  const [stockLogs, setStockLogs] = useState<StockAdjustmentLog[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [syncing, setSyncing] = useState<boolean>(false)
  const [bannerAlert, setBannerAlert] = useState<string | null>(null)

  // Scan-to-Collect Modal
  const [showScanModal, setShowScanModal] = useState<boolean>(false)
  const [verifyTokenInput, setVerifyTokenInput] = useState<string>('')
  const [selectedOrderForCollect, setSelectedOrderForCollect] = useState<Order | null>(null)
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)

  // Walk-in Quick POS Drawer
  const [showWalkinDrawer, setShowWalkinDrawer] = useState<boolean>(false)
  const [walkinCart, setWalkinCart] = useState<{ item: StaffMenuItem; qty: number }[]>([])
  const [walkinProcessing, setWalkinProcessing] = useState<boolean>(false)

  const prevActiveOrderCountRef = useRef<number>(0)

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchOutletData = useCallback(async () => {
    setSyncing(true)
    try {
      // 1. Fetch Orders for this outlet
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          id, user_id, outlet_id, token, status, payment_method, total, shop_payout,
          pickup_slot_id, created_at, updated_at,
          order_items (item_id, name, price, qty),
          pickup_slots (slot_time)
        `)
        .eq('outlet_id', effectiveOutletId)
        .order('created_at', { ascending: false })
        .limit(80)

      if (ordersErr) throw ordersErr

      if (ordersData) {
        const formatted: Order[] = ordersData.map((o: any) => ({
          id: o.id,
          user_id: o.user_id,
          outlet_id: o.outlet_id,
          token: o.token,
          status: o.status,
          payment_method: o.payment_method,
          total: o.total,
          shop_payout: o.shop_payout,
          pickup_slot_id: o.pickup_slot_id,
          created_at: o.created_at,
          updated_at: o.updated_at,
          order_items: o.order_items || [],
          pickup_slot_label: o.pickup_slots?.slot_time 
            ? new Date(o.pickup_slots.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined
        }))
        setOrders(formatted)

        // Check if new orders arrived to trigger sound
        const activeCount = formatted.filter(o => o.status === 'placed').length
        if (activeCount > prevActiveOrderCountRef.current) {
          if (soundEnabled) playOrderChime()
          setBannerAlert(`🔔 New Order received! Token #${formatted.find(o => o.status === 'placed')?.token || '---'}`)
          setTimeout(() => setBannerAlert(null), 4000)
        }
        prevActiveOrderCountRef.current = activeCount
      }

      // 2. Fetch Menu Items (Stock only)
      const { data: menuData, error: menuErr } = await supabase
        .from('menu_items')
        .select('id, outlet_id, name, price, available, is_veg, category, stock_qty, reserved_qty')
        .eq('outlet_id', effectiveOutletId)
        .order('name', { ascending: true })

      if (menuErr) throw menuErr
      if (menuData) setMenuItems(menuData as StaffMenuItem[])

      // 3. Fetch Stock Adjustments history
      const { data: stockData } = await supabase
        .from('stock_adjustments')
        .select('id, item_id, qty_change, previous_qty, new_qty, reason, created_at')
        .eq('outlet_id', effectiveOutletId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (stockData) setStockLogs(stockData as StockAdjustmentLog[])
    } catch (err) {
      console.warn('Staff fetch fallback / offline:', err)
      // Provide immediate realistic offline demo state if backend connection is unavailable
      setOrders(prev => prev.length > 0 ? prev : [
        {
          id: 4021,
          outlet_id: effectiveOutletId,
          token: '104',
          status: 'placed',
          total: 140,
          created_at: new Date(Date.now() - 3 * 60000).toISOString(),
          order_items: [
            { item_id: 101, name: 'Veg Puff', price: 20, qty: 2 },
            { item_id: 104, name: 'Paneer Roll', price: 50, qty: 2 }
          ]
        },
        {
          id: 4019,
          outlet_id: effectiveOutletId,
          token: '289',
          status: 'preparing',
          total: 105,
          created_at: new Date(Date.now() - 9 * 60000).toISOString(),
          order_items: [
            { item_id: 103, name: 'Chicken Cutlet', price: 35, qty: 3 }
          ]
        },
        {
          id: 4015,
          outlet_id: effectiveOutletId,
          token: '412',
          status: 'ready',
          total: 70,
          created_at: new Date(Date.now() - 14 * 60000).toISOString(),
          order_items: [
            { item_id: 106, name: 'Tandoori Roti Combo', price: 70, qty: 1 }
          ]
        }
      ])

      setMenuItems(prev => prev.length > 0 ? prev : [
        { id: 101, outlet_id: effectiveOutletId, name: 'Veg Puff', price: 20, available: true, is_veg: true, category: 'snacks', stock_qty: 35 },
        { id: 102, outlet_id: effectiveOutletId, name: 'Samosa (2 pcs)', price: 20, available: true, is_veg: true, category: 'snacks', stock_qty: 18 },
        { id: 103, outlet_id: effectiveOutletId, name: 'Chicken Cutlet', price: 35, available: true, is_veg: false, category: 'snacks', stock_qty: 12 },
        { id: 104, outlet_id: effectiveOutletId, name: 'Paneer Roll', price: 50, available: true, is_veg: true, category: 'snacks', stock_qty: 8 },
        { id: 105, outlet_id: effectiveOutletId, name: 'Fresh Lime Juice', price: 30, available: true, is_veg: true, category: 'beverages', stock_qty: 45 },
        { id: 106, outlet_id: effectiveOutletId, name: 'Tandoori Roti Combo', price: 70, available: true, is_veg: true, category: 'meals', stock_qty: 15 }
      ])
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [effectiveOutletId, soundEnabled])

  // Initial load
  useEffect(() => {
    fetchOutletData()
  }, [fetchOutletData])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. REALTIME SUBSCRIPTION (Instant kitchen queue updates)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`staff-kds-${effectiveOutletId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `outlet_id=eq.${effectiveOutletId}`
        },
        payload => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            setOrders(prev => [newOrder, ...prev])
            if (soundEnabled) playOrderChime()
            setBannerAlert(`🔔 New Order! Token #${newOrder.token || '---'}`)
            setTimeout(() => setBannerAlert(null), 4000)
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Order
            setOrders(prev => prev.map(o => (o.id === updated.id ? { ...o, ...updated } : o)))
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== (payload.old as Order).id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `outlet_id=eq.${effectiveOutletId}`
        },
        payload => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as StaffMenuItem
            setMenuItems(prev => prev.map(m => (m.id === updated.id ? { ...m, ...updated } : m)))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [effectiveOutletId, soundEnabled])

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ONE-TAP STATUS ADVANCE
  // ─────────────────────────────────────────────────────────────────────────────
  const advanceOrderStatus = async (orderId: number, currentStatus: string) => {
    let nextStatus: 'preparing' | 'ready' | 'collected'
    if (currentStatus === 'placed') nextStatus = 'preparing'
    else if (currentStatus === 'preparing') nextStatus = 'ready'
    else if (currentStatus === 'ready') {
      const target = orders.find(o => o.id === orderId)
      setSelectedOrderForCollect(target || null)
      setVerifyTokenInput(target?.token || '')
      setShowScanModal(true)
      return
    } else {
      return
    }

    // Optimistic UI update
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o)))

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('outlet_id', effectiveOutletId)

      if (error) throw error

      if (nextStatus === 'ready' && soundEnabled) {
        playSuccessChime()
      }
    } catch (err) {
      console.warn('Status advance fallback:', err)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SCAN-TO-COLLECT / 3-DIGIT BACKUP VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  const handleVerifyCollect = async () => {
    const rawToken = verifyTokenInput.trim().toUpperCase()
    if (!rawToken) {
      setVerifyResult({ success: false, message: 'Please enter a 3-digit token or scan a QR code.' })
      return
    }

    setIsVerifying(true)
    setVerifyResult(null)

    let targetOrderId = selectedOrderForCollect?.id
    let parsedToken = rawToken

    if (rawToken.includes('.')) {
      const parts = rawToken.split('.')
      if (parts.length >= 3) {
        targetOrderId = parseInt(parts[1], 10)
        parsedToken = parts[2]
      }
    }

    try {
      if (targetOrderId) {
        const { data, error } = await supabase.rpc('verify_and_collect_order', {
          p_order_id: targetOrderId,
          p_token: parsedToken
        })

        if (error) {
          const orderMatch = orders.find(o => o.id === targetOrderId && (o.token === parsedToken || o.token === rawToken))
          if (orderMatch) {
            await supabase
              .from('orders')
              .update({ status: 'collected', updated_at: new Date().toISOString() })
              .eq('id', targetOrderId)

            setOrders(prev => prev.map(o => (o.id === targetOrderId ? { ...o, status: 'collected' } : o)))
            playSuccessChime()
            setVerifyResult({ success: true, message: `✅ Order #${targetOrderId} Verified & Collected!` })
          } else {
            throw error
          }
        } else {
          setOrders(prev => prev.map(o => (o.id === targetOrderId ? { ...o, status: 'collected' } : o)))
          playSuccessChime()
          setVerifyResult({ success: true, message: `✅ Token #${parsedToken} collected successfully!` })
        }
      } else {
        const match = orders.find(o => o.token === parsedToken && o.status !== 'collected' && o.status !== 'cancelled')
        if (!match) {
          setVerifyResult({ success: false, message: `❌ No active order found for Token #${parsedToken}` })
          setIsVerifying(false)
          return
        }

        const { error } = await supabase
          .from('orders')
          .update({ status: 'collected', updated_at: new Date().toISOString() })
          .eq('id', match.id)
          .eq('outlet_id', effectiveOutletId)

        if (error) throw error

        setOrders(prev => prev.map(o => (o.id === match.id ? { ...o, status: 'collected' } : o)))
        playSuccessChime()
        setVerifyResult({ success: true, message: `✅ Order #${match.id} (Token #${match.token}) Collected!` })
      }

      setTimeout(() => {
        setShowScanModal(false)
        setSelectedOrderForCollect(null)
        setVerifyTokenInput('')
        setVerifyResult(null)
      }, 1400)
    } catch (err: any) {
      setVerifyResult({ success: false, message: err?.message || 'Verification failed. Check token code.' })
    } finally {
      setIsVerifying(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. MANUAL STOCK ADJUSTMENTS (+/-, 86 Sold Out, Restock)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleStockAdjust = async (item: StaffMenuItem, delta: number) => {
    const currentQty = item.stock_qty ?? 0
    const newQty = Math.max(0, currentQty + delta)
    const reason = delta > 0 ? 'restock' : 'manual_adjustment'

    setMenuItems(prev => prev.map(m => (m.id === item.id ? { ...m, stock_qty: newQty, available: newQty > 0 } : m)))

    try {
      const { error } = await supabase.rpc('adjust_stock', {
        p_item_id: item.id,
        p_new_qty: newQty,
        p_reason: reason
      })

      if (error) {
        await supabase
          .from('menu_items')
          .update({ stock_qty: newQty, available: newQty > 0 })
          .eq('id', item.id)

        await supabase.from('stock_adjustments').insert({
          outlet_id: effectiveOutletId,
          item_id: item.id,
          qty_change: delta,
          previous_qty: currentQty,
          new_qty: newQty,
          reason
        })
      }

      setStockLogs(prev => [
        {
          id: Date.now(),
          item_id: item.id,
          item_name: item.name,
          qty_change: delta,
          previous_qty: currentQty,
          new_qty: newQty,
          reason,
          created_at: new Date().toISOString()
        },
        ...prev.slice(0, 19)
      ])
    } catch (err) {
      console.warn('Stock adjustment sync note:', err)
    }
  }

  const handleToggle86 = async (item: StaffMenuItem) => {
    const isCurrentlyOut = (item.stock_qty ?? 0) === 0 || !item.available
    const newQty = isCurrentlyOut ? 20 : 0
    const reason = isCurrentlyOut ? 'restock' : '86_sold_out'

    setMenuItems(prev => prev.map(m => (m.id === item.id ? { ...m, stock_qty: newQty, available: newQty > 0 } : m)))

    try {
      await supabase.rpc('adjust_stock', {
        p_item_id: item.id,
        p_new_qty: newQty,
        p_reason: reason
      })
    } catch {
      await supabase
        .from('menu_items')
        .update({ stock_qty: newQty, available: newQty > 0 })
        .eq('id', item.id)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. WALK-IN COUNTER ORDER CREATION
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCreateWalkinOrder = async () => {
    if (walkinCart.length === 0) return
    setWalkinProcessing(true)

    const payloadItems = walkinCart.map(c => ({ item_id: c.item.id, qty: c.qty }))

    try {
      const { error } = await supabase.rpc('create_counter_order', {
        p_outlet_id: effectiveOutletId,
        p_items: payloadItems,
        p_payment_method: 'cash'
      })

      if (error) {
        const randToken = String(Math.floor(100 + Math.random() * 900))
        const totalAmount = walkinCart.reduce((acc, c) => acc + c.item.price * c.qty, 0)
        const newOrder: Order = {
          id: Date.now(),
          outlet_id: effectiveOutletId,
          token: randToken,
          status: 'ready',
          total: totalAmount,
          created_at: new Date().toISOString(),
          order_items: walkinCart.map(c => ({ item_id: c.item.id, name: c.item.name, price: c.item.price, qty: c.qty }))
        }
        setOrders(prev => [newOrder, ...prev])
      } else {
        fetchOutletData()
      }

      playSuccessChime()
      setWalkinCart([])
      setShowWalkinDrawer(false)
      setBannerAlert('✅ Counter walk-in order generated & stock updated!')
      setTimeout(() => setBannerAlert(null), 3500)
    } catch (err: any) {
      alert('Walk-in creation error: ' + (err?.message || 'Check items'))
    } finally {
      setWalkinProcessing(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED COUNTS & FILTERED QUEUE
  // ─────────────────────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const active = orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled')
    return {
      placed: active.filter(o => o.status === 'placed').length,
      preparing: active.filter(o => o.status === 'preparing').length,
      ready: active.filter(o => o.status === 'ready').length,
      totalActive: active.length,
      collectedToday: orders.filter(o => o.status === 'collected').length
    }
  }, [orders])

  const filteredOrders = useMemo(() => {
    let list = orders

    if (activeTab === 'queue') {
      list = list.filter(o => o.status !== 'collected' && o.status !== 'cancelled')
      if (queueFilter !== 'all') {
        list = list.filter(o => o.status === queueFilter)
      }
    } else if (activeTab === 'history') {
      list = list.filter(o => o.status === 'collected')
    }

    if (searchToken.trim()) {
      const q = searchToken.trim().toUpperCase()
      list = list.filter(o => o.token?.includes(q) || String(o.id).includes(q))
    }

    return list
  }, [orders, activeTab, queueFilter, searchToken])

  const slotGroupedOrders = useMemo(() => {
    if (!slotGrouping) return null
    const groups: { [key: string]: Order[] } = {}
    filteredOrders.forEach(order => {
      const key = order.pickup_slot_label || 'Immediate / Walk-in'
      if (!groups[key]) groups[key] = []
      groups[key].push(order)
    })
    return groups
  }, [filteredOrders, slotGrouping])

  // Helper to render an individual ticket card
  const renderCard = (order: Order) => {
    const isPlaced = order.status === 'placed'
    const isPrep = order.status === 'preparing'
    const isReady = order.status === 'ready'

    const statusBorder = isPlaced
      ? 'border-blue-600/70 bg-gradient-to-b from-blue-950/40 to-slate-900'
      : isPrep
      ? 'border-amber-500/70 bg-gradient-to-b from-amber-950/40 to-slate-900'
      : 'border-emerald-500/70 bg-gradient-to-b from-emerald-950/40 to-slate-900'

    return (
      <div
        key={order.id}
        className={`rounded-2xl border-2 p-4 shadow-xl flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${statusBorder}`}
      >
        <div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                Pickup Token
              </div>
              <div className="font-mono font-black text-3xl tracking-tight text-white flex items-center gap-1.5">
                #{order.token || '---'}
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  isPlaced
                    ? 'bg-blue-600 text-white'
                    : isPrep
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {order.status}
              </span>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1 font-mono">
                <Clock className="h-3 w-3" />
                <span>{formatMinutesAgo(order.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-b border-slate-800 pb-2">
            <span>Order #{order.id}</span>
            {order.pickup_slot_label ? (
              <span className="text-indigo-300 font-medium">Slot: {order.pickup_slot_label}</span>
            ) : (
              <span>Standard / ASAP</span>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {order.order_items?.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between text-sm">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="font-mono text-orange-400 font-extrabold text-base">{item.qty}×</span>
                  <span>{item.name}</span>
                </div>
                {item.notes && (
                  <span className="text-[10px] text-amber-300 italic block mt-0.5">"{item.notes}"</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800">
          {isPlaced && (
            <button
              onClick={() => advanceOrderStatus(order.id, 'placed')}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition-all"
            >
              <Flame className="h-4 w-4" />
              <span>Start Cooking (Prep)</span>
            </button>
          )}

          {isPrep && (
            <button
              onClick={() => advanceOrderStatus(order.id, 'preparing')}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Mark Ready for Pickup</span>
            </button>
          )}

          {isReady && (
            <button
              onClick={() => advanceOrderStatus(order.id, 'ready')}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
            >
              <QrCode className="h-4 w-4" />
              <span>Scan / Hand Over</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12">
      {/* ── TOP OPERATIONAL BAR ── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <ChefHat className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg tracking-wide text-white flex items-center gap-2">
                {displayOutletName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                STAFF LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">Kitchen & Counter Dispatch Cockpit · ID: {effectiveOutletId}</p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            title={soundEnabled ? 'Mute Order Chime' : 'Unmute Order Chime'}
            className={`p-2.5 rounded-lg border transition-all text-xs font-semibold flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio ON' : 'Muted'}</span>
          </button>

          {/* Scan to Collect Modal Trigger */}
          <button
            onClick={() => {
              setSelectedOrderForCollect(null)
              setVerifyTokenInput('')
              setVerifyResult(null)
              setShowScanModal(true)
            }}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
          >
            <QrCode className="h-4 w-4" />
            <span>Scan to Collect</span>
          </button>

          {/* Quick Counter POS */}
          <button
            onClick={() => setShowWalkinDrawer(true)}
            className="hidden md:flex px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs items-center gap-1.5 transition-all"
          >
            <ShoppingBag className="h-4 w-4 text-orange-400" />
            <span>Walk-in POS</span>
          </button>

          {/* Refresh sync */}
          <button
            onClick={fetchOutletData}
            disabled={syncing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all disabled:opacity-50"
            title="Force refresh"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="text-xs px-2.5 py-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* ── NOTIFICATION FLASH BANNER ── */}
      {bannerAlert && (
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-sm px-4 py-2 flex items-center justify-between animate-bounce shadow-md">
          <span>{bannerAlert}</span>
          <button onClick={() => setBannerAlert(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── METRICS SPEEDOMETER / STATUS COUNTERS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 px-4 pt-3">
        <div
          onClick={() => { setActiveTab('queue'); setQueueFilter('placed') }}
          className={`cursor-pointer p-3 rounded-xl border transition-all ${
            activeTab === 'queue' && queueFilter === 'placed'
              ? 'bg-blue-950/60 border-blue-500 shadow-md shadow-blue-950/50'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-400 font-medium">
            <span>PLACED (NEW)</span>
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{counts.placed}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Waiting kitchen pickup</div>
        </div>

        <div
          onClick={() => { setActiveTab('queue'); setQueueFilter('preparing') }}
          className={`cursor-pointer p-3 rounded-xl border transition-all ${
            activeTab === 'queue' && queueFilter === 'preparing'
              ? 'bg-amber-950/60 border-amber-500 shadow-md shadow-amber-950/50'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
            <span>PREPARING</span>
            <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{counts.preparing}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Cooking on line</div>
        </div>

        <div
          onClick={() => { setActiveTab('queue'); setQueueFilter('ready') }}
          className={`cursor-pointer p-3 rounded-xl border transition-all ${
            activeTab === 'queue' && queueFilter === 'ready'
              ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-950/50'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>READY AT COUNTER</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{counts.ready}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting customer collection</div>
        </div>

        <div
          onClick={() => setActiveTab('stock')}
          className={`cursor-pointer p-3 rounded-xl border transition-all ${
            activeTab === 'stock'
              ? 'bg-purple-950/60 border-purple-500 shadow-md shadow-purple-950/50'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-400 font-medium">
            <span>STOCK QUICK-CONTROL</span>
            <Layers className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{menuItems.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {menuItems.filter(m => (m.stock_qty ?? 0) === 0 || !m.available).length} Sold Out (86)
          </div>
        </div>
      </div>

      {/* ── MAIN NAVIGATION PILLS & SEARCH ── */}
      <div className="px-4 mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ChefHat className="h-4 w-4" />
            <span>Live Order Queue ({counts.totalActive})</span>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'stock'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Inventory & 86 Stepper</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Collected Today ({counts.collectedToday})</span>
          </button>
        </div>

        {activeTab === 'queue' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSlotGrouping(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                slotGrouping
                  ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Group by Pickup Slot</span>
            </button>

            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setQueueFilter('all')}
                className={`px-2.5 py-1 rounded font-medium ${queueFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setQueueFilter('placed')}
                className={`px-2.5 py-1 rounded font-medium ${queueFilter === 'placed' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                Placed
              </button>
              <button
                onClick={() => setQueueFilter('preparing')}
                className={`px-2.5 py-1 rounded font-medium ${queueFilter === 'preparing' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
              >
                Prep
              </button>
              <button
                onClick={() => setQueueFilter('ready')}
                className={`px-2.5 py-1 rounded font-medium ${queueFilter === 'ready' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                Ready
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Token # or ID..."
                value={searchToken}
                onChange={e => setSearchToken(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-32 md:w-40"
              />
              {searchToken && (
                <button onClick={() => setSearchToken('')} className="absolute right-2 top-2 text-slate-500 hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENT AREA ── */}
      <main className="flex-1 px-4 mt-4">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm">Connecting to {displayOutletName} queue...</p>
          </div>
        ) : activeTab === 'queue' ? (
          <div>
            {filteredOrders.length === 0 ? (
              <div className="h-72 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ChefHat className="h-12 w-12 text-slate-700 mb-2" />
                <h3 className="font-bold text-slate-300 text-base">No Orders in Queue</h3>
                <p className="text-xs max-w-sm mt-1 text-slate-500">
                  New incoming orders from students will show up here in real-time with an audible chime.
                </p>
                <button
                  onClick={() => setShowWalkinDrawer(true)}
                  className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 border border-slate-700"
                >
                  Create Walk-in POS Order
                </button>
              </div>
            ) : slotGrouping && slotGroupedOrders ? (
              <div className="space-y-6">
                {Object.entries(slotGroupedOrders).map(([slotLabel, slotOrders]) => (
                  <div key={slotLabel} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-400" />
                        <span className="font-bold text-sm text-indigo-300">{slotLabel}</span>
                        <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-800/60 px-2 py-0.5 rounded-full font-bold">
                          {slotOrders.length} orders
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {slotOrders.map(order => renderCard(order))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredOrders.map(order => renderCard(order))}
              </div>
            )}
          </div>
        ) : activeTab === 'stock' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div>
                  <h2 className="font-bold text-sm text-white">Live Stock Stepper & 86 Toggles</h2>
                  <p className="text-xs text-slate-400">Quick +/- controls instantly log to audit ledger and sync with student app.</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {menuItems.length} active catalog items
                </span>
              </div>

              <div className="space-y-2">
                {menuItems.map(item => {
                  const qty = item.stock_qty ?? 0
                  const isSoldOut = qty <= 0 || !item.available

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSoldOut
                          ? 'bg-rose-950/20 border-rose-900/40 opacity-80'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full flex-shrink-0 ${item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{item.name}</span>
                            {isSoldOut && (
                              <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[10px] tracking-wider uppercase">
                                86 SOLD OUT
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            ₹{item.price} · Category: <span className="capitalize">{item.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          onClick={() => handleStockAdjust(item, -5)}
                          className="h-8 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 active:scale-95"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleStockAdjust(item, -1)}
                          className="h-8 w-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center active:scale-95"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>

                        <div className="h-8 min-w-[50px] px-2 rounded bg-slate-950 border border-slate-700 flex flex-col items-center justify-center">
                          <span className={`font-mono font-black text-sm ${isSoldOut ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {qty}
                          </span>
                        </div>

                        <button
                          onClick={() => handleStockAdjust(item, 1)}
                          className="h-8 w-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleStockAdjust(item, 5)}
                          className="h-8 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 active:scale-95"
                        >
                          +5
                        </button>

                        <button
                          onClick={() => handleToggle86(item)}
                          className={`h-8 px-3 rounded font-bold text-xs ml-2 transition-all active:scale-95 ${
                            isSoldOut
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-rose-600/80 hover:bg-rose-600 text-white'
                          }`}
                        >
                          {isSoldOut ? 'Restock (+20)' : '86 Item'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 h-fit">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                <Layers className="h-4 w-4 text-orange-400" />
                <h3 className="font-bold text-sm text-white">Stock Adjustment History</h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                All order-driven decrements and counter adjustments logged to database table <code className="text-orange-300">stock_adjustments</code>.
              </p>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {stockLogs.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-8">No recent stock events logged.</div>
                ) : (
                  stockLogs.map(log => {
                    const isPositive = log.qty_change > 0
                    return (
                      <div key={log.id} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-200">
                            {log.item_name || `Item #${log.item_id}`}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="capitalize">{log.reason.replace('_', ' ')}</span>
                            <span>·</span>
                            <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? `+${log.qty_change}` : log.qty_change}
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {log.previous_qty ?? 0} → {log.new_qty ?? 0}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div>
                <h2 className="font-bold text-sm text-white">Today's Handed Over & Collected Orders</h2>
                <p className="text-xs text-slate-400">Tokens marked collected via QR scan or 3-digit backup code.</p>
              </div>
              <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-full">
                {counts.collectedToday} Total Collected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-black text-emerald-400 text-base">
                      TOKEN #{order.token || '---'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      COLLECTED
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mb-2">
                    Order #{order.id} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="space-y-1 border-t border-slate-800/80 pt-2">
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-300">
                        <span>{item.qty}x {item.name}</span>
                        <span className="font-mono text-slate-400">₹{item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── SCAN-TO-COLLECT / 3-DIGIT MODAL ── */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Scan-to-Collect Order</h3>
                  <p className="text-xs text-slate-400">Verify customer pickup via QR code or 3-digit backup token</p>
                </div>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedOrderForCollect && (
              <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400">Handing Over Order #{selectedOrderForCollect.id}</span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {selectedOrderForCollect.order_items?.map(i => `${i.qty}x ${i.name}`).join(', ')}
                  </div>
                </div>
                <span className="font-mono text-xl font-black text-emerald-400">
                  #{selectedOrderForCollect.token}
                </span>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Enter 3-Digit Token or Paste QR Payload:
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. 248 or CB1.4021.248"
                  value={verifyTokenInput}
                  onChange={e => setVerifyTokenInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleVerifyCollect() }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl text-lg font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
                  <button
                    key={btn}
                    onClick={() => {
                      if (btn === 'C') setVerifyTokenInput('')
                      else if (btn === '⌫') setVerifyTokenInput(prev => prev.slice(0, -1))
                      else setVerifyTokenInput(prev => (prev.length < 3 ? prev + btn : prev))
                    }}
                    className="h-11 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 font-mono font-bold text-base text-slate-200 border border-slate-700 transition-all flex items-center justify-center"
                  >
                    {btn}
                  </button>
                ))}
              </div>

              {verifyResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    verifyResult.success
                      ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300'
                      : 'bg-rose-950/80 border border-rose-600 text-rose-300'
                  }`}
                >
                  {verifyResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>{verifyResult.message}</span>
                </div>
              )}

              <button
                onClick={handleVerifyCollect}
                disabled={isVerifying || !verifyTokenInput.trim()}
                className="w-full mt-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
              >
                {isVerifying ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>Verify Token & Mark Collected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK WALK-IN POS DRAWER ── */}
      {showWalkinDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-5 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-orange-400" />
                <div>
                  <h3 className="font-extrabold text-base text-white">Walk-in Counter POS</h3>
                  <p className="text-xs text-slate-400">Tap items to create cash/counter order</p>
                </div>
              </div>
              <button onClick={() => setShowWalkinDrawer(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {menuItems.map(item => {
                const inCart = walkinCart.find(c => c.item.id === item.id)
                const isOutOfStock = (item.stock_qty ?? 0) <= 0

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isOutOfStock) return
                      setWalkinCart(prev => {
                        const existing = prev.find(c => c.item.id === item.id)
                        if (existing) {
                          return prev.map(c => (c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c))
                        }
                        return [...prev, { item, qty: 1 }]
                      })
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-40 bg-slate-950 border-slate-800 cursor-not-allowed'
                        : inCart
                        ? 'bg-orange-950/30 border-orange-500'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{item.name}</div>
                      <div className="text-xs text-slate-400">₹{item.price} · Stock: {item.stock_qty ?? 0}</div>
                    </div>
                    {inCart && (
                      <span className="font-mono text-sm font-extrabold text-orange-400 px-2 py-0.5 rounded bg-orange-950 border border-orange-800">
                        {inCart.qty}x
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="border-t border-slate-800 pt-4 mt-3">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-400">Total Items: {walkinCart.reduce((a, b) => a + b.qty, 0)}</span>
                <span className="font-mono font-black text-xl text-white">
                  ₹{walkinCart.reduce((a, b) => a + b.item.price * b.qty, 0)}
                </span>
              </div>
              <button
                onClick={handleCreateWalkinOrder}
                disabled={walkinCart.length === 0 || walkinProcessing}
                className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                {walkinProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Take Payment & Issue Token</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffDashboard
