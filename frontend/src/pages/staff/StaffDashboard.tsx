import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, CheckCircle2, AlertCircle, ChefHat, Volume2, VolumeX,
  Search, RefreshCw, QrCode, Plus, Minus, Flame, Eye,
  ArrowRight, ShieldCheck, Check, Sparkles, Filter, Store,
  Zap, AlertTriangle, Layers, X, Hash, ShoppingBag, Bell,
  Delete, Kanban, LayoutGrid, Camera, User, CreditCard,
  ArrowUpRight, ChevronRight, SlidersHorizontal
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'
import VegIndicator from '../../components/VegIndicator'

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

// ── Audio alerts ──
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
    // Audio policy fallback
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

// ── Multi-Box Auto-Advancing Digit OTP Input ──
interface DigitOtpInputProps {
  value: string
  onChange: (val: string) => void
  onComplete?: (val: string) => void
  length?: number
}

const DigitOtpInput: React.FC<DigitOtpInputProps> = ({
  value,
  onChange,
  onComplete,
  length = 3
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const digits = useMemo(() => {
    const arr = value.split('').slice(0, length)
    while (arr.length < length) arr.push('')
    return arr
  }, [value, length])

  const handleDigitChange = (index: number, char: string) => {
    const clean = char.replace(/[^0-9a-zA-Z]/g, '').slice(-1).toUpperCase()
    const newDigits = [...digits]
    newDigits[index] = clean
    const nextVal = newDigits.join('')
    onChange(nextVal)

    if (clean && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    if (nextVal.length === length && onComplete) {
      onComplete(nextVal)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^0-9a-zA-Z]/g, '').toUpperCase().slice(0, length)
    onChange(pasted)
    if (pasted.length === length && onComplete) {
      onComplete(pasted)
    }
    const targetIdx = Math.min(pasted.length, length - 1)
    inputRefs.current[targetIdx]?.focus()
  }

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3 my-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={el => { inputRefs.current[idx] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx] || ''}
          onChange={e => handleDigitChange(idx, e.target.value)}
          onKeyDown={e => handleKeyDown(idx, e)}
          className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-mono font-black rounded-xl border-2 transition-all outline-none ${
            digits[idx]
              ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-lg shadow-emerald-950/40 ring-2 ring-emerald-500/20'
              : 'border-slate-700 bg-slate-950 text-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
          }`}
          autoFocus={idx === 0}
        />
      ))}
    </div>
  )
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
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban')
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

  // Verification Modal State
  const [showScanModal, setShowScanModal] = useState<boolean>(false)
  const [verifyMode, setVerifyMode] = useState<'code' | 'viewfinder'>('code')
  const [verifyTokenInput, setVerifyTokenInput] = useState<string>('')
  const [selectedOrderForCollect, setSelectedOrderForCollect] = useState<Order | null>(null)
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)

  const prevActiveOrderCountRef = useRef<number>(0)

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchOutletData = useCallback(async () => {
    setSyncing(true)
    try {
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
          customer_name: `User #${o.id % 900 + 100}`,
          outlet_id: o.outlet_id,
          token: o.token,
          status: o.status,
          payment_method: o.payment_method || 'UPI (Online)',
          payment_status: 'paid',
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

        const activeCount = formatted.filter(o => o.status === 'placed').length
        if (activeCount > prevActiveOrderCountRef.current) {
          if (soundEnabled) playOrderChime()
          setBannerAlert(`New Order incoming! Token #${formatted.find(o => o.status === 'placed')?.token || '---'}`)
          setTimeout(() => setBannerAlert(null), 4500)
        }
        prevActiveOrderCountRef.current = activeCount
      }

      const { data: menuData, error: menuErr } = await supabase
        .from('menu_items')
        .select('id, outlet_id, name, price, available, is_veg, category, stock_qty, reserved_qty')
        .eq('outlet_id', effectiveOutletId)
        .order('name', { ascending: true })

      if (menuErr) throw menuErr
      if (menuData) setMenuItems(menuData as StaffMenuItem[])

      const { data: stockData } = await supabase
        .from('stock_adjustments')
        .select('id, item_id, qty_change, previous_qty, new_qty, reason, created_at')
        .eq('outlet_id', effectiveOutletId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (stockData) setStockLogs(stockData as StockAdjustmentLog[])
    } catch (err) {
      console.warn('Staff fetch fallback / offline mode:', err)
      // Realistic demo state for offline testing
      setOrders(prev => prev.length > 0 ? prev : [
        {
          id: 4021,
          customer_name: 'Rahul Sharma',
          outlet_id: effectiveOutletId,
          token: '104',
          status: 'placed',
          payment_method: 'UPI Online',
          payment_status: 'paid',
          total: 140,
          created_at: new Date(Date.now() - 2 * 60000).toISOString(),
          order_items: [
            { item_id: 101, name: 'Veg Puff', price: 20, qty: 2 },
            { item_id: 104, name: 'Paneer Roll', price: 50, qty: 2, notes: 'Less spicy' }
          ]
        },
        {
          id: 4019,
          customer_name: 'Priya Verma',
          outlet_id: effectiveOutletId,
          token: '289',
          status: 'preparing',
          payment_method: 'Meal Plan Card',
          payment_status: 'paid',
          total: 105,
          created_at: new Date(Date.now() - 7 * 60000).toISOString(),
          order_items: [
            { item_id: 103, name: 'Chicken Cutlet', price: 35, qty: 3 }
          ]
        },
        {
          id: 4015,
          customer_name: 'Aman Patel',
          outlet_id: effectiveOutletId,
          token: '412',
          status: 'ready',
          payment_method: 'UPI Online',
          payment_status: 'paid',
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

  useEffect(() => {
    fetchOutletData()
  }, [fetchOutletData])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. REALTIME SUBSCRIPTION
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
            newOrder.customer_name = `User #${newOrder.id % 900 + 100}`
            setOrders(prev => [newOrder, ...prev])
            if (soundEnabled) playOrderChime()
            setBannerAlert(`New Order! Token #${newOrder.token || '---'}`)
            setTimeout(() => setBannerAlert(null), 4500)
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
  // 3. ONE-TAP STATUS ADVANCE (48px+ Tap Target)
  // ─────────────────────────────────────────────────────────────────────────────
  const advanceOrderStatus = async (orderId: number, currentStatus: string) => {
    let nextStatus: 'preparing' | 'ready' | 'collected'
    if (currentStatus === 'placed') nextStatus = 'preparing'
    else if (currentStatus === 'preparing') nextStatus = 'ready'
    else if (currentStatus === 'ready') {
      const target = orders.find(o => o.id === orderId)
      setSelectedOrderForCollect(target || null)
      setVerifyTokenInput(target?.token || '')
      setVerifyResult(null)
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
  // 4. SCAN-TO-COLLECT / VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  const handleVerifyCollect = async (overrideToken?: string) => {
    const rawToken = (overrideToken || verifyTokenInput).trim().toUpperCase()
    if (!rawToken) {
      setVerifyResult({ success: false, message: 'Please enter a 3-digit token or scan QR code.' })
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
            setVerifyResult({ success: true, message: `Token #${parsedToken} collected and handed over!` })
          } else {
            throw error
          }
        } else {
          setOrders(prev => prev.map(o => (o.id === targetOrderId ? { ...o, status: 'collected' } : o)))
          playSuccessChime()
          setVerifyResult({ success: true, message: `Token #${parsedToken} verified & handed over!` })
        }
      } else {
        const match = orders.find(o => o.token === parsedToken && o.status !== 'collected' && o.status !== 'cancelled')
        if (!match) {
          setVerifyResult({ success: false, message: `No active order found for Token #${parsedToken}` })
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
        setVerifyResult({ success: true, message: `Order #${match.id} (Token #${match.token}) Collected!` })
      }

      setTimeout(() => {
        setShowScanModal(false)
        setSelectedOrderForCollect(null)
        setVerifyTokenInput('')
        setVerifyResult(null)
      }, 1600)
    } catch (err: any) {
      setVerifyResult({ success: false, message: err?.message || 'Verification failed. Please check token code.' })
    } finally {
      setIsVerifying(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. MANUAL STOCK ADJUSTMENTS
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

  const handleToggleAvailability = async (item: StaffMenuItem) => {
    const isCurrentlyOut = (item.stock_qty ?? 0) === 0 || !item.available
    const newQty = isCurrentlyOut ? 20 : 0
    const reason = isCurrentlyOut ? 'restock' : 'marked_unavailable'

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
  // COMPUTED COUNTS & FILTERED QUEUES
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
      list = list.filter(o =>
        o.token?.includes(q) ||
        String(o.id).includes(q) ||
        o.customer_name?.toUpperCase().includes(q) ||
        o.order_items?.some(i => i.name.toUpperCase().includes(q))
      )
    }

    return list
  }, [orders, activeTab, queueFilter, searchToken])

  const kanbanColumns = useMemo(() => {
    return {
      placed: filteredOrders.filter(o => o.status === 'placed'),
      preparing: filteredOrders.filter(o => o.status === 'preparing'),
      ready: filteredOrders.filter(o => o.status === 'ready')
    }
  }, [filteredOrders])

  const slotGroupedOrders = useMemo(() => {
    if (!slotGrouping) return null
    const groups: { [key: string]: Order[] } = {}
    filteredOrders.forEach(order => {
      const key = order.pickup_slot_label || 'Immediate Pickup'
      if (!groups[key]) groups[key] = []
      groups[key].push(order)
    })
    return groups
  }, [filteredOrders, slotGrouping])

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER INDIVIDUAL KANBAN ORDER CARD
  // ─────────────────────────────────────────────────────────────────────────────
  const renderCard = (order: Order) => {
    const isPlaced = order.status === 'placed'
    const isPrep = order.status === 'preparing'
    const isReady = order.status === 'ready'

    // V FOODS Color Palette Theming:
    // Placed: Warm Amber / Gold
    // Preparing: Royal Blue
    // Ready: Emerald Green
    const statusTheme = isPlaced
      ? {
          cardBg: 'bg-gradient-to-b from-amber-950/30 to-slate-900/90',
          border: 'border-amber-500/70',
          pill: 'bg-amber-500 text-slate-950',
          btnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/50',
          btnIcon: <Flame className="h-5 w-5" strokeWidth={2.5} />,
          btnText: 'Start Kitchen Prep',
          glow: 'shadow-amber-500/10'
        }
      : isPrep
      ? {
          cardBg: 'bg-gradient-to-b from-blue-950/30 to-slate-900/90',
          border: 'border-blue-500/70',
          pill: 'bg-blue-600 text-white',
          btnBg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50',
          btnIcon: <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />,
          btnText: 'Mark Ready for Pickup',
          glow: 'shadow-blue-500/10'
        }
      : {
          cardBg: 'bg-gradient-to-b from-emerald-950/30 to-slate-900/90',
          border: 'border-emerald-500/70',
          pill: 'bg-emerald-500 text-slate-950',
          btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50',
          btnIcon: <QrCode className="h-5 w-5" strokeWidth={2.5} />,
          btnText: 'Verify & Hand Over',
          glow: 'shadow-emerald-500/10'
        }

    return (
      <motion.div
        key={order.id}
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`rounded-2xl border-2 p-4 shadow-xl flex flex-col justify-between relative overflow-hidden transition-all ${statusTheme.cardBg} ${statusTheme.border} ${statusTheme.glow}`}
      >
        {/* Pulsing Beacon Ring for NEW / PLACED Orders */}
        {isPlaced && (
          <div className="absolute top-3 right-3 flex items-center justify-center">
            <span className="absolute h-5 w-5 rounded-full bg-amber-400 opacity-75 animate-ping" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-amber-400" />
          </div>
        )}

        <div>
          {/* Header Row: Big Legible Token & Live Status */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">
                Pickup Token
              </span>
              {/* Large Legible Token: Users look for this from 10 feet away */}
              <div className="font-mono font-black text-3xl sm:text-4xl tracking-tight text-white flex items-center gap-1.5">
                #{order.token || '---'}
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider ${statusTheme.pill}`}>
                {order.status}
              </span>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1 font-mono">
                <Clock className="h-3 w-3" strokeWidth={2} />
                <span>{formatMinutesAgo(order.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Customer & Payment Meta */}
          <div className="flex items-center justify-between text-xs text-slate-300 mt-3 pt-2.5 border-t border-slate-800">
            <div className="flex items-center gap-1.5 font-medium truncate max-w-[65%]">
              <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" strokeWidth={2} />
              <span className="truncate">{order.customer_name || `Order #${order.id}`}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-md">
              <CreditCard className="h-3 w-3" strokeWidth={2} />
              <span>{order.payment_method?.includes('Meal') ? 'Meal Plan' : 'UPI Paid'}</span>
            </div>
          </div>

          {/* Order Details & Items List */}
          <div className="mt-3.5 space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            {order.order_items?.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between text-sm py-0.5">
                <div className="font-semibold text-slate-100 flex items-start gap-2">
                  <span className="font-mono text-orange-400 font-black text-base leading-none">
                    {item.qty}×
                  </span>
                  <div>
                    <span className="text-slate-100 leading-tight">{item.name}</span>
                    {item.notes && (
                      <span className="text-[11px] text-amber-300 italic block mt-0.5 font-normal">
                        "{item.notes}"
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-400 ml-2">
                  ₹{item.price * item.qty}
                </span>
              </div>
            ))}

            {/* Total Row */}
            <div className="pt-2 mt-1 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Total bill</span>
              <span className="font-bold text-white text-sm">₹{order.total}</span>
            </div>
          </div>

          {/* Slot info if assigned */}
          {order.pickup_slot_label && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-900/50 px-2.5 py-1 rounded-lg">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Pickup Slot: <strong>{order.pickup_slot_label}</strong></span>
            </div>
          )}
        </div>

        {/* ── TACTILE ORDER ACTION BUTTON (48px+ Tap Target for kitchen staff) ── */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => advanceOrderStatus(order.id, order.status)}
            className={`w-full min-h-[52px] px-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all ${statusTheme.btnBg}`}
          >
            {statusTheme.btnIcon}
            <span>{statusTheme.btnText}</span>
          </motion.button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12">
      {/* ── TOP OPERATIONAL BAR ── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 flex-shrink-0">
              <ChefHat className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base md:text-lg tracking-wide text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {displayOutletName}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  KITCHEN LIVE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">Order Dispatch & Counter Cockpit · Outlet: {effectiveOutletId}</p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {/* Audio Chime Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSoundEnabled(prev => !prev)}
              title={soundEnabled ? 'Mute Order Chime' : 'Unmute Order Chime'}
              className={`p-2.5 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" strokeWidth={2} /> : <VolumeX className="h-4 w-4" strokeWidth={2} />}
              <span className="hidden md:inline">{soundEnabled ? 'Audio ON' : 'Muted'}</span>
            </motion.button>

            {/* Prominent Scan to Collect Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedOrderForCollect(null)
                setVerifyTokenInput('')
                setVerifyResult(null)
                setShowScanModal(true)
              }}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all border border-emerald-500/30"
            >
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
              <span>Verify & Collect</span>
            </motion.button>

            {/* Refresh sync */}
            <button
              onClick={fetchOutletData}
              disabled={syncing}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all disabled:opacity-50"
              title="Force Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-orange-400' : ''}`} strokeWidth={2} />
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-xs px-2.5 py-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors border border-transparent hover:border-slate-700"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── NOTIFICATION FLASH BANNER ── */}
      <AnimatePresence>
        {bannerAlert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 text-white font-bold text-sm px-4 py-2.5 flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-white flex-shrink-0 animate-bounce" strokeWidth={2.5} />
                <span>{bannerAlert}</span>
              </div>
              <button onClick={() => setBannerAlert(null)} className="p-1 hover:bg-white/20 rounded">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto w-full px-4">
        {/* ── METRICS SPEEDOMETER / STATUS COUNTERS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => { setActiveTab('queue'); setQueueFilter('placed') }}
            className={`cursor-pointer p-3.5 rounded-2xl border transition-all relative overflow-hidden ${
              activeTab === 'queue' && queueFilter === 'placed'
                ? 'bg-amber-950/50 border-amber-500 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-400 font-extrabold tracking-wider">
              <span>PLACED (NEW)</span>
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
            </div>
            <div className="text-3xl font-black text-white mt-1.5 font-mono">{counts.placed}</div>
            <div className="text-[11px] text-slate-400 mt-1">Waiting acceptance</div>
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => { setActiveTab('queue'); setQueueFilter('preparing') }}
            className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
              activeTab === 'queue' && queueFilter === 'preparing'
                ? 'bg-blue-950/50 border-blue-500 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/30'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-blue-400 font-extrabold tracking-wider">
              <span>IN KITCHEN</span>
              <Flame className="h-4 w-4 text-blue-400 animate-pulse" strokeWidth={2} />
            </div>
            <div className="text-3xl font-black text-white mt-1.5 font-mono">{counts.preparing}</div>
            <div className="text-[11px] text-slate-400 mt-1">Cooking on line</div>
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => { setActiveTab('queue'); setQueueFilter('ready') }}
            className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
              activeTab === 'queue' && queueFilter === 'ready'
                ? 'bg-emerald-950/50 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-emerald-400 font-extrabold tracking-wider">
              <span>READY AT COUNTER</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={2} />
            </div>
            <div className="text-3xl font-black text-white mt-1.5 font-mono">{counts.ready}</div>
            <div className="text-[11px] text-slate-400 mt-1">Awaiting pickup</div>
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('history')}
            className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
              activeTab === 'history'
                ? 'bg-purple-950/50 border-purple-500 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-purple-400 font-extrabold tracking-wider">
              <span>COLLECTED TODAY</span>
              <Check className="h-4 w-4 text-purple-400" strokeWidth={2.5} />
            </div>
            <div className="text-3xl font-black text-white mt-1.5 font-mono">{counts.collectedToday}</div>
            <div className="text-[11px] text-slate-400 mt-1">Successful dispatches</div>
          </motion.div>
        </div>

        {/* ── NAVIGATION TABS & SEARCH CONTROLS ── */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          {/* Main Tab Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'queue'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ChefHat className="h-4 w-4" strokeWidth={2} />
              <span>Live Queue ({counts.totalActive})</span>
            </button>

            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'stock'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-4 w-4" strokeWidth={2} />
              <span>Stock Stepper</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              <span>Collected History</span>
            </button>
          </div>

          {/* Queue View Controls: Search + Kanban / Grid toggle */}
          {activeTab === 'queue' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Kanban vs Grid Toggle */}
              <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Kanban Board View"
                >
                  <Kanban className="h-3.5 w-3.5" strokeWidth={2} />
                  <span className="hidden sm:inline">Kanban</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Compact Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
              </div>

              {/* Status Filter (Grid Mode) */}
              {viewMode === 'grid' && (
                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs">
                  <button
                    onClick={() => setQueueFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold ${queueFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setQueueFilter('placed')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold ${queueFilter === 'placed' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
                  >
                    Placed
                  </button>
                  <button
                    onClick={() => setQueueFilter('preparing')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold ${queueFilter === 'preparing' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                  >
                    Prep
                  </button>
                  <button
                    onClick={() => setQueueFilter('ready')}
                    className={`px-2.5 py-1.5 rounded-lg font-bold ${queueFilter === 'ready' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                  >
                    Ready
                  </button>
                </div>
              )}

              {/* Pickup Slot Grouping */}
              <button
                onClick={() => setSlotGrouping(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  slotGrouping
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">Group by Slot</span>
              </button>

              {/* Instant Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Token # or Name..."
                  value={searchToken}
                  onChange={e => setSearchToken(e.target.value)}
                  className="pl-9 pr-7 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 w-36 sm:w-48 transition-all"
                />
                {searchToken && (
                  <button onClick={() => setSearchToken('')} className="absolute right-2 top-2.5 text-slate-500 hover:text-white">
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <main className="mt-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-500" strokeWidth={2} />
              <p className="text-sm font-medium">Connecting to {displayOutletName} live stream...</p>
            </div>
          ) : activeTab === 'queue' ? (
            <div>
              {filteredOrders.length === 0 ? (
                <div className="h-72 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-500 bg-slate-900/30">
                  <div className="h-14 w-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
                    <ChefHat className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-extrabold text-slate-200 text-base">Kitchen Queue Clear</h3>
                  <p className="text-xs max-w-sm mt-1 text-slate-400">
                    Incoming user orders will appear automatically with an audible chime and live pulse alert.
                  </p>
                </div>
              ) : slotGrouping && slotGroupedOrders ? (
                <div className="space-y-6">
                  {Object.entries(slotGroupedOrders).map(([slotLabel, slotOrders]) => (
                    <div key={slotLabel} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-indigo-400" strokeWidth={2} />
                          <span className="font-bold text-sm text-indigo-300">{slotLabel}</span>
                          <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-800/60 px-2.5 py-0.5 rounded-full font-bold">
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
              ) : viewMode === 'kanban' ? (
                /* ── KANBAN COLUMNS VIEW ── */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4.5">
                  {/* Column 1: Placed / Needs Acceptance (Warm Amber) */}
                  <div className="bg-slate-900/40 rounded-2xl border border-amber-900/30 p-3.5 flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-amber-900/30 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                        <h3 className="font-black text-xs uppercase tracking-wider text-amber-300">
                          1. Placed (Needs Acceptance)
                        </h3>
                      </div>
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800/50">
                        {kanbanColumns.placed.length}
                      </span>
                    </div>

                    <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                      {kanbanColumns.placed.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                          No new incoming orders
                        </div>
                      ) : (
                        kanbanColumns.placed.map(order => renderCard(order))
                      )}
                    </div>
                  </div>

                  {/* Column 2: In Kitchen / Preparing (Royal Blue) */}
                  <div className="bg-slate-900/40 rounded-2xl border border-blue-900/30 p-3.5 flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-900/30 mb-3">
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-blue-400 animate-pulse" strokeWidth={2} />
                        <h3 className="font-black text-xs uppercase tracking-wider text-blue-300">
                          2. Cooking on Line (Prep)
                        </h3>
                      </div>
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-blue-950 text-blue-400 border border-blue-800/50">
                        {kanbanColumns.preparing.length}
                      </span>
                    </div>

                    <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                      {kanbanColumns.preparing.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                          Kitchen line idle
                        </div>
                      ) : (
                        kanbanColumns.preparing.map(order => renderCard(order))
                      )}
                    </div>
                  </div>

                  {/* Column 3: Ready for Counter Pickup (Emerald Green) */}
                  <div className="bg-slate-900/40 rounded-2xl border border-emerald-900/30 p-3.5 flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-900/30 mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                        <h3 className="font-black text-xs uppercase tracking-wider text-emerald-300">
                          3. Ready for Counter Pickup
                        </h3>
                      </div>
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                        {kanbanColumns.ready.length}
                      </span>
                    </div>

                    <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                      {kanbanColumns.ready.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                          No orders waiting at counter
                        </div>
                      ) : (
                        kanbanColumns.ready.map(order => renderCard(order))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── COMPACT GRID VIEW ── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredOrders.map(order => renderCard(order))}
                </div>
              )}
            </div>
          ) : activeTab === 'stock' ? (
            /* ── INVENTORY / STOCK QUICK-CONTROL ── */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                  <div>
                    <h2 className="font-bold text-sm text-white">Live Stock Stepper & Availability</h2>
                    <p className="text-xs text-slate-400">Quick +/- stepper logs directly to audit ledger and syncs user menu.</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {menuItems.length} catalog items
                  </span>
                </div>

                <div className="space-y-2.5">
                  {menuItems.map(item => {
                    const qty = item.stock_qty ?? 0
                    const isSoldOut = qty <= 0 || !item.available

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSoldOut
                            ? 'bg-rose-950/20 border-rose-900/40 opacity-80'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <VegIndicator isVeg={item.is_veg} size="sm" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{item.name}</span>
                              {isSoldOut && (
                                <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[10px] tracking-wider uppercase">
                                  SOLD OUT
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
                            className="h-9 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 active:scale-95"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleStockAdjust(item, -1)}
                            className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center active:scale-95"
                          >
                            <Minus className="h-4 w-4" strokeWidth={2} />
                          </button>

                          <div className="h-9 min-w-[54px] px-2 rounded-xl bg-slate-950 border border-slate-700 flex flex-col items-center justify-center">
                            <span className={`font-mono font-black text-sm ${isSoldOut ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {qty}
                            </span>
                          </div>

                          <button
                            onClick={() => handleStockAdjust(item, 1)}
                            className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center active:scale-95"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => handleStockAdjust(item, 5)}
                            className="h-9 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 active:scale-95"
                          >
                            +5
                          </button>

                          <button
                            onClick={() => handleToggleAvailability(item)}
                            className={`h-9 px-3.5 rounded-xl font-bold text-xs ml-2 transition-all active:scale-95 ${
                              isSoldOut
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-rose-600/80 hover:bg-rose-600 text-white'
                            }`}
                          >
                            {isSoldOut ? 'Restock' : 'Mark Out'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 h-fit">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                  <Layers className="h-4 w-4 text-orange-400" strokeWidth={2} />
                  <h3 className="font-bold text-sm text-white">Stock Adjustment History</h3>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  All counter adjustments and order decrements logged in <code className="text-orange-300">stock_adjustments</code>.
                </p>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {stockLogs.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-8">No recent stock events logged.</div>
                  ) : (
                    stockLogs.map(log => {
                      const isPositive = log.qty_change > 0
                      return (
                        <div key={log.id} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs flex items-center justify-between">
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
            /* ── COLLECTED ORDERS TODAY (HISTORY) ── */
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <h2 className="font-bold text-sm text-white">Dispatched & Handed Over Orders</h2>
                  <p className="text-xs text-slate-400">Tokens verified via QR code scan or 3-digit backup code.</p>
                </div>
                <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
                  {counts.collectedToday} Total Collected
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredOrders.map(order => (
                  <div key={order.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-black text-emerald-400 text-lg">
                        TOKEN #{order.token || '---'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        COLLECTED
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] mb-2 flex items-center justify-between">
                      <span>Order #{order.id}</span>
                      <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="space-y-1.5 border-t border-slate-800/80 pt-2">
                      {order.order_items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-300">
                          <span>{item.qty}× {item.name}</span>
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
      </div>

      {/* ── SCAN-TO-COLLECT / VERIFICATION MODAL ── */}
      <AnimatePresence>
        {showScanModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <QrCode className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Counter Handover & Verification</h3>
                    <p className="text-xs text-slate-400">Verify customer token before handing meal</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScanModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>

              {/* Mode Toggle: OTP Digit Boxes vs QR Viewfinder */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-4">
                <button
                  onClick={() => setVerifyMode('code')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    verifyMode === 'code'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Hash className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>3-Digit Token Code</span>
                </button>
                <button
                  onClick={() => setVerifyMode('viewfinder')}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    verifyMode === 'viewfinder'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>QR Viewfinder</span>
                </button>
              </div>

              {/* Target Order Preview if triggered from card */}
              {selectedOrderForCollect && (
                <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-slate-400">Order #{selectedOrderForCollect.id}</span>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {selectedOrderForCollect.order_items?.map(i => `${i.qty}× ${i.name}`).join(', ')}
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-black text-emerald-400">
                    #{selectedOrderForCollect.token}
                  </span>
                </div>
              )}

              {verifyMode === 'code' ? (
                /* ── OTP 3-DIGIT BOXES VIEW ── */
                <div className="space-y-4">
                  <div className="text-center">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Enter 3-Digit Token
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ask user for their screen token or enter manually
                    </p>
                  </div>

                  {/* Separate Digit Input Boxes */}
                  <DigitOtpInput
                    value={verifyTokenInput}
                    onChange={setVerifyTokenInput}
                    onComplete={handleVerifyCollect}
                    length={3}
                  />

                  {/* Tactile On-Screen Touch Keypad */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'del'].map(btn => (
                      <button
                        key={btn}
                        onClick={() => {
                          if (btn === 'C') setVerifyTokenInput('')
                          else if (btn === 'del') setVerifyTokenInput(prev => prev.slice(0, -1))
                          else setVerifyTokenInput(prev => (prev.length < 3 ? prev + btn : prev))
                        }}
                        className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 font-mono font-bold text-lg text-slate-200 border border-slate-700/80 transition-all flex items-center justify-center shadow-sm"
                      >
                        {btn === 'del' ? (
                          <Delete className="h-5 w-5 text-slate-300" strokeWidth={2} />
                        ) : btn === 'C' ? (
                          <span className="text-rose-400 font-bold text-sm">CLR</span>
                        ) : (
                          btn
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── QR SCANNER VIEWFINDER OVERLAY ── */
                <div className="space-y-4">
                  <div className="relative h-56 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-4">
                    {/* Viewfinder Reticles */}
                    <div className="relative w-44 h-44 rounded-xl border-2 border-emerald-500/40 flex items-center justify-center">
                      {/* Animated Laser Scanning Line */}
                      <motion.div
                        animate={{ y: [-75, 75, -75] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                        className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/50"
                      />

                      {/* Corner Target Markers */}
                      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 -mt-0.5 -ml-0.5 rounded-tl" />
                      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 -mt-0.5 -mr-0.5 rounded-tr" />
                      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 -mb-0.5 -ml-0.5 rounded-bl" />
                      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 -mb-0.5 -mr-0.5 rounded-br" />
                    </div>

                    <div className="mt-2 text-center">
                      <p className="text-xs text-slate-300 font-semibold">Hold user QR code within frame</p>
                      <p className="text-[10px] text-slate-500">Camera scanning active</p>
                    </div>
                  </div>

                  {/* Fallback Simulation QR Paste Input */}
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" strokeWidth={2} />
                    <input
                      type="text"
                      placeholder="Or paste QR payload: CB1.4021.104"
                      value={verifyTokenInput}
                      onChange={e => setVerifyTokenInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Result State with Success Checkmark Animation */}
              <AnimatePresence>
                {verifyResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`mt-3 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-3 ${
                      verifyResult.success
                        ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-200'
                        : 'bg-rose-950/80 border border-rose-600 text-rose-200'
                    }`}
                  >
                    {verifyResult.success ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.25, 1] }}
                        transition={{ duration: 0.35 }}
                        className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 flex-shrink-0"
                      >
                        <Check className="h-4 w-4 stroke-[3]" />
                      </motion.div>
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" strokeWidth={2} />
                    )}
                    <span>{verifyResult.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Button: Verify and Hand Over */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleVerifyCollect()}
                disabled={isVerifying || !verifyTokenInput.trim()}
                className="w-full mt-4 min-h-[52px] py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all border border-emerald-500/30"
              >
                {isVerifying ? (
                  <RefreshCw className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                ) : (
                  <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
                )}
                <span>Verify Token & Hand Over</span>
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default StaffDashboard
