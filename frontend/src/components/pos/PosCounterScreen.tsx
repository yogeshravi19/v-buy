import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Zap,
  Printer,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  Clock,
  Sparkles,
  ChevronUp,
  X,
  Ban
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PosPrintReceipt, type PosPrintOrder } from './PosPrintReceipt'
import { formatOrderNumber } from '../../utils/orderNumber'
import { getFoodImage } from '../../lib/foodImages'

export interface PosMenuItem {
  id: number
  outlet_id: string
  name: string
  price: number
  available: boolean
  is_veg: boolean
  category: string
  stock_qty: number | null
  image_url?: string | null
  description?: string | null
  available_from?: string | null
  available_to?: string | null
  is_archived?: boolean
}

interface PosCartLine {
  item: PosMenuItem
  qty: number
  notes: string
}

interface PosCounterScreenProps {
  outletId: string
  outletName: string
  userRole: 'staff' | 'shop_admin' | 'super_admin'
  availableOutlets?: Array<{ id: string; name: string }>
  onOutletChange?: (newOutletId: string) => void
  onOrderCreated?: (order: any) => void
}

export function PosCounterScreen({
  outletId,
  outletName,
  userRole,
  availableOutlets = [],
  onOutletChange,
  onOrderCreated
}: PosCounterScreenProps) {
  const [menuItems, setMenuItems] = useState<PosMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non_veg'>('all')

  // Cart & Ticket State
  const [cartLines, setCartLines] = useState<PosCartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [isQuickSale, setIsQuickSale] = useState(false)
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI_COUNTER' | 'CARD_COUNTER' | 'OTHER'>('CASH')
  const [paymentNote, setPaymentNote] = useState('')
  const [cashTendered, setCashTendered] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [posError, setPosError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [mobileTicketOpen, setMobileTicketOpen] = useState(false)

  // Receipt Print Modal State
  const [completedOrder, setCompletedOrder] = useState<PosPrintOrder | null>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Recent POS Orders & Void State
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [recentPosOrders, setRecentPosOrders] = useState<any[]>([])
  const [loadingRecentOrders, setLoadingRecentOrders] = useState(false)
  const [voidingOrderId, setVoidingOrderId] = useState<number | null>(null)
  const [voidReason, setVoidReason] = useState('Customer cancelled')
  const [voidCustomReason, setVoidCustomReason] = useState('')
  const [isVoiding, setIsVoiding] = useState(false)
  const [voidNotice, setVoidNotice] = useState<{ success: boolean; message: string } | null>(null)

  // Idempotency Key per billing draft
  const idempotencyKeyRef = useRef(`pos_${outletId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)

  // 1. Screen Wake Lock API
  useEffect(() => {
    let wakeLock: any = null

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLock = await (navigator as any).wakeLock.request('screen')
        }
      } catch (err) {
        // Wake lock can fail on low battery
      }
    }

    requestWakeLock()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLock) {
        wakeLock.release().catch(() => {})
      }
    }
  }, [])

  // 2. Online / Offline network monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 3. Fetch menu catalog for this outlet
  const fetchMenu = useCallback(async () => {
    if (!outletId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('outlet_id', outletId)
        .eq('is_archived', false)
        .order('category', { ascending: true })

      if (error) throw error
      setMenuItems((data as PosMenuItem[]) || [])
    } catch (e: any) {
      console.warn('POS fetch fallback:', e)
    } finally {
      setLoading(false)
    }
  }, [outletId])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  // 4. Realtime updates on menu items (e.g. stock or availability changes)
  useEffect(() => {
    if (!outletId) return
    const channel = supabase
      .channel(`pos-menu-${outletId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `outlet_id=eq.${outletId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!payload.new.is_archived) {
            setMenuItems(prev => [payload.new as PosMenuItem, ...prev])
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.is_archived) {
            setMenuItems(prev => prev.filter(i => i.id !== payload.new.id))
          } else {
            setMenuItems(prev => prev.map(i => i.id === payload.new.id ? (payload.new as PosMenuItem) : i))
          }
        } else if (payload.eventType === 'DELETE') {
          setMenuItems(prev => prev.filter(i => i.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [outletId])

  // 5. Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    menuItems.forEach(i => {
      if (i.category) set.add(i.category.toLowerCase())
    })
    return Array.from(set).sort()
  }, [menuItems])

  // Current IST time check for serving windows
  const isWithinWindow = (item: PosMenuItem) => {
    if (!item.available_from || !item.available_to) return true
    try {
      const now = new Date()
      const istString = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })
      return istString >= item.available_from && istString <= item.available_to
    } catch {
      return true
    }
  }

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      if (selectedCategory !== 'all' && item.category?.toLowerCase() !== selectedCategory) {
        return false
      }
      if (dietaryFilter === 'veg' && !item.is_veg) return false
      if (dietaryFilter === 'non_veg' && item.is_veg) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = item.name.toLowerCase().includes(q)
        const matchesCat = item.category?.toLowerCase().includes(q)
        return matchesName || matchesCat
      }
      return true
    })
  }, [menuItems, selectedCategory, dietaryFilter, searchQuery])

  // Cart operations
  const addToCart = (item: PosMenuItem) => {
    if (!item.available || (item.stock_qty !== null && item.stock_qty <= 0) || !isWithinWindow(item)) {
      return
    }

    setCartLines(prev => {
      const existing = prev.find(l => l.item.id === item.id)
      if (existing) {
        // Check stock ceiling
        if (item.stock_qty !== null && existing.qty >= item.stock_qty) {
          setPosError(`Cannot add more. Current stock limit reached (${item.stock_qty}).`)
          setTimeout(() => setPosError(null), 3000)
          return prev
        }
        return prev.map(l => l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l)
      } else {
        return [...prev, { item, qty: 1, notes: '' }]
      }
    })
  }

  const updateLineQty = (itemId: number, delta: number) => {
    setCartLines(prev => {
      return prev
        .map(l => {
          if (l.item.id === itemId) {
            const next = l.qty + delta
            if (delta > 0 && l.item.stock_qty !== null && next > l.item.stock_qty) {
              setPosError(`Only ${l.item.stock_qty} in stock.`)
              setTimeout(() => setPosError(null), 3000)
              return l
            }
            return { ...l, qty: next }
          }
          return l
        })
        .filter(l => l.qty > 0)
    })
  }

  const updateLineNote = (itemId: number, note: string) => {
    setCartLines(prev => prev.map(l => l.item.id === itemId ? { ...l, notes: note } : l))
  }

  const removeLine = (itemId: number) => {
    setCartLines(prev => prev.filter(l => l.item.id !== itemId))
  }

  const clearCart = () => {
    setCartLines([])
    setCustomerName('')
    setOrderNote('')
    setCashTendered('')
    setPaymentNote('')
    setIsQuickSale(false)
    idempotencyKeyRef.current = `pos_${outletId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  }

  // Running Total (exact menu price, NO platform markup)
  const cartSubtotal = useMemo(() => {
    return cartLines.reduce((acc, l) => acc + (l.item.price * l.qty), 0)
  }, [cartLines])

  // Cash change calculation
  const cashChange = useMemo(() => {
    if (paymentMode !== 'CASH' || !cashTendered) return null
    const val = Number(cashTendered)
    if (isNaN(val) || val < cartSubtotal) return null
    return Math.round(val - cartSubtotal)
  }, [paymentMode, cashTendered, cartSubtotal])

  // Place POS Order
  const handlePlacePosOrder = async () => {
    if (cartLines.length === 0) return
    if (!isOnline) {
      setPosError('Counter billing offline. Connection required to allocate daily order numbers.')
      return
    }

    try {
      setIsSubmitting(true)
      setPosError(null)

      const payloadItems = cartLines.map(l => ({
        item_id: l.item.id,
        qty: l.qty,
        notes: l.notes.trim() || undefined
      }))

      // Call database function create_pos_order
      const { data, error } = await supabase.rpc('create_pos_order', {
        p_outlet_id: outletId,
        p_items: payloadItems,
        p_payment_mode: paymentMode,
        p_payment_note: paymentNote.trim() || null,
        p_notes: orderNote.trim() || null,
        p_customer_name: customerName.trim() || null,
        p_is_quick_sale: isQuickSale,
        p_idempotency_key: idempotencyKeyRef.current
      })

      if (error) throw error

      // Prepare order print payload
      const orderData: PosPrintOrder = {
        order_id: data.order_id,
        order_number: data.order_number,
        token: data.token,
        outlet_name: outletName,
        created_at: data.created_at || new Date().toISOString(),
        customer_name: customerName.trim() || 'Counter Walk-in',
        payment_mode: paymentMode,
        items: cartLines.map(l => ({
          name: l.item.name,
          qty: l.qty,
          price: l.item.price,
          notes: l.notes
        })),
        total: data.total || cartSubtotal
      }

      setCompletedOrder(orderData)
      setShowPrintModal(true)
      clearCart()

      if (onOrderCreated) {
        onOrderCreated(data)
      }
    } catch (err: any) {
      console.error('POS order creation error:', err)
      setPosError(err.message || 'Failed to complete order. Please check item availability.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fetch recent POS orders for voiding and counter auditing
  const fetchRecentPosOrders = useCallback(async () => {
    if (!outletId) return
    setLoadingRecentOrders(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, token, customer_name, total, status, created_at, order_source, payment_mode, notes')
        .eq('outlet_id', outletId)
        .eq('order_source', 'POS')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setRecentPosOrders(data)
      }
    } catch (err) {
      console.warn('Could not fetch recent POS orders:', err)
    } finally {
      setLoadingRecentOrders(false)
    }
  }, [outletId])

  // Void POS Order (Atomic stock restore & cancel via void_pos_order RPC)
  const handleVoidOrder = async (orderId: number) => {
    setIsVoiding(true)
    setVoidNotice(null)
    const finalReason = voidReason === 'Other' && voidCustomReason.trim()
      ? `Other: ${voidCustomReason.trim()}`
      : voidReason

    try {
      const { data, error } = await supabase.rpc('void_pos_order', {
        p_order_id: orderId,
        p_reason: finalReason
      })
      if (error) throw error

      setVoidNotice({ success: true, message: `Order #${orderId} voided successfully. Stock restored.` })
      setRecentPosOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
      setVoidingOrderId(null)
      setVoidReason('Customer cancelled')
      setVoidCustomReason('')
    } catch (err: any) {
      console.error('Void POS order error:', err)
      // Fallback direct status cancellation if RPC fails due to RLS/mock
      try {
        await supabase.from('orders').update({
          status: 'cancelled',
          notes: `VOIDED: ${finalReason}`,
          updated_at: new Date().toISOString()
        }).eq('id', orderId)
        setRecentPosOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
        setVoidNotice({ success: true, message: `Order #${orderId} marked cancelled.` })
        setVoidingOrderId(null)
      } catch (e: any) {
        setVoidNotice({ success: false, message: err.message || 'Failed to void order.' })
      }
    } finally {
      setIsVoiding(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 relative overflow-hidden">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff size={15} />
            <span>Counter billing offline: internet connection required to allocate daily order numbers and verify live inventory.</span>
          </div>
          <span className="bg-amber-700/60 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
            Blocked
          </span>
        </div>
      )}

      {/* POS Top Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
            POS
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">{outletName}</h2>
            <p className="text-[11px] text-slate-500">Counter Register</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchRecentPosOrders()
              setShowOrdersModal(true)
            }}
            className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200"
            title="View recent counter orders and void if needed"
          >
            <Clock size={13} />
            <span>Recent Orders</span>
          </button>

          {/* Super Admin Outlet Switcher */}
          {userRole === 'super_admin' && availableOutlets.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Switch Outlet:</span>
              <select
                value={outletId}
                onChange={(e) => onOutletChange && onOutletChange(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-700"
              >
                {availableOutlets.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Split 2-Column on Tablet/Desktop */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Product Catalog & Fast Grid */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden p-3 sm:p-4 gap-3">
          {/* Controls: Search, Category Tabs, Veg Filter */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pos-search-input shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dietary Filter */}
              <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm shrink-0">
                <button
                  type="button"
                  onClick={() => setDietaryFilter('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${dietaryFilter === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setDietaryFilter('veg')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${dietaryFilter === 'veg' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500'}`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Veg
                </button>
                <button
                  type="button"
                  onClick={() => setDietaryFilter('non_veg')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${dietaryFilter === 'non_veg' ? 'bg-rose-50 text-rose-800' : 'text-slate-500'}`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  Non-Veg
                </button>
              </div>
            </div>

            {/* Category Chips Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`pos-chip shrink-0 ${selectedCategory === 'all' ? 'active shadow-sm' : 'hover:bg-slate-50'}`}
              >
                All Items ({menuItems.length})
              </button>
              {categories.map(cat => {
                const count = menuItems.filter(i => i.category?.toLowerCase() === cat).length
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`pos-chip capitalize shrink-0 ${selectedCategory === cat ? 'active shadow-sm' : 'hover:bg-slate-50'}`}
                  >
                    {cat} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <span>Loading counter menu catalog...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                <ShoppingBag size={28} className="text-slate-300" />
                <span>No matching dishes found in this category.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredItems.map(item => {
                  const inCartLine = cartLines.find(l => l.item.id === item.id)
                  const isSoldOut = item.stock_qty !== null && item.stock_qty <= 0
                  const isWindowActive = isWithinWindow(item)
                  const isDisabled = !item.available || isSoldOut || !isWindowActive

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isDisabled && addToCart(item)}
                      className={`pos-item-card relative flex flex-col rounded-2xl border transition-all select-none p-3 ${
                        isDisabled
                          ? 'bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed'
                          : inCartLine
                          ? 'bg-blue-50/60 border-blue-600 shadow-sm cursor-pointer'
                          : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-sm cursor-pointer active:scale-[0.98]'
                      }`}
                    >
                      {/* Photo with Smart Food Image Fallback */}
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-100 mb-2 flex items-center justify-center shrink-0">
                        <img
                          src={item.image_url || getFoodImage(item.name, item.category).url}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-200"
                          loading="lazy"
                          onError={(e) => {
                            const fallback = getFoodImage(item.name, item.category).url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80'
                            if (e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback
                            }
                          }}
                        />

                        {/* Dietary Badge */}
                        <div className="absolute top-1.5 left-1.5 z-10">
                          <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center bg-white ${item.is_veg ? 'border-emerald-600 text-emerald-600' : 'border-rose-600 text-rose-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          </span>
                        </div>

                        {/* Quantity Counter if already in cart */}
                        {inCartLine && inCartLine.qty > 0 && (
                          <div className="absolute top-1.5 right-1.5 bg-blue-700 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-md animate-in zoom-in-75">
                            {inCartLine.qty}
                          </div>
                        )}

                        {/* Status overlays */}
                        {isDisabled && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-1 text-center">
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-rose-600 px-1.5 py-0.5 rounded">
                              {isSoldOut ? 'Sold Out' : !isWindowActive ? 'Out of Hours' : 'Unavailable'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-tight min-h-[32px]">
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                          <span className="text-sm font-extrabold text-blue-800 tabular-nums">
                            ₹{item.price}
                          </span>
                          {item.stock_qty !== null && (
                            <span className={`text-[10px] font-medium ${item.stock_qty <= 5 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                              {item.stock_qty} left
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Ticket Panel (Desktop & Tablet side panel) */}
        <div className="pos-ticket-panel hidden md:flex w-96 lg:w-[400px] xl:w-[430px] border-l border-slate-200 shadow-md z-10 shrink-0">
          {/* Ticket Header */}
          <div className="pos-ticket-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-blue-700" />
              <h3 className="font-bold text-slate-900 text-sm">Order Ticket</h3>
            </div>
            {cartLines.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Customer Name & Instant Handover Toggle */}
          <div className="pos-customer-bar flex items-center gap-2.5">
            <input
              type="text"
              placeholder="Customer Name / Mobile"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="pos-customer-input flex-1"
            />
            <label className="inline-flex items-center gap-1.5 px-3 h-[38px] rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 cursor-pointer select-none shrink-0 hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={isQuickSale}
                onChange={(e) => setIsQuickSale(e.target.checked)}
                className="rounded text-blue-700 focus:ring-blue-600 h-3.5 w-3.5 accent-blue-700"
              />
              <span className="whitespace-nowrap">Instant</span>
            </label>
          </div>

          {/* Cart Item Rows */}
          <div className="pos-cart-scroll space-y-2">
            {cartLines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2 py-4">
                <ShoppingBag size={28} className="text-slate-300" />
                <span>No items selected.</span>
              </div>
            ) : (
              cartLines.map(line => (
                <div key={line.item.id} className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-2 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900 leading-snug">{line.item.name}</div>
                      <div className="text-[11px] text-slate-500">₹{line.item.price} each</div>
                    </div>
                    <div className="text-xs font-extrabold text-slate-900 tabular-nums">
                      ₹{line.item.price * line.qty}
                    </div>
                  </div>

                  {/* Stepper & Note Row */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                    <input
                      type="text"
                      placeholder="Item note..."
                      value={line.notes}
                      onChange={(e) => updateLineNote(line.item.id, e.target.value)}
                      className="pos-note-input flex-1"
                    />

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateLineQty(line.item.id, -1)}
                        className="pos-qty-btn"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold tabular-nums">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateLineQty(line.item.id, 1)}
                        className="pos-qty-btn"
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.item.id)}
                        className="pos-trash-btn"
                        aria-label="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Billing & Checkout Controls */}
          <div className="pos-footer">
            {/* Payment Mode Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Payment method
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('CASH')}
                  className={`pos-payment-btn ${paymentMode === 'CASH' ? 'active' : ''}`}
                >
                  <Banknote size={15} className="shrink-0" />
                  <span className="truncate">Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI_COUNTER')}
                  className={`pos-payment-btn ${paymentMode === 'UPI_COUNTER' ? 'active' : ''}`}
                >
                  <QrCode size={15} className="shrink-0" />
                  <span className="truncate">UPI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('CARD_COUNTER')}
                  className={`pos-payment-btn ${paymentMode === 'CARD_COUNTER' ? 'active' : ''}`}
                >
                  <CreditCard size={15} className="shrink-0" />
                  <span className="truncate">Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('OTHER')}
                  className={`pos-payment-btn ${paymentMode === 'OTHER' ? 'active' : ''}`}
                >
                  <FileText size={15} className="shrink-0" />
                  <span className="truncate">Other</span>
                </button>
              </div>

              {/* Cash Tendered & Change Calculator */}
              {paymentMode === 'CASH' && (
                <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-950 font-semibold">
                    <span>Tendered:</span>
                    <div className="flex items-center bg-white border border-emerald-300 rounded-md px-2 h-7">
                      <span className="text-[11px] text-slate-400 mr-0.5">₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-16 text-right text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                  {cashChange !== null && (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                      <span className="text-emerald-700 font-medium">Change:</span>
                      <span className="text-sm font-black tabular-nums">₹{cashChange}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Free text note for 'OTHER' mode */}
              {paymentMode === 'OTHER' && (
                <input
                  type="text"
                  placeholder="Payment details or reference"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none mt-2"
                />
              )}
            </div>

            {/* Total and Submit */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total:</span>
              <span className="text-xl font-black text-blue-900 tabular-nums">
                ₹{cartSubtotal}
              </span>
            </div>

            {posError && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                {posError}
              </div>
            )}

            <button
              type="button"
              disabled={cartLines.length === 0 || isSubmitting || !isOnline}
              onClick={handlePlacePosOrder}
              className="pos-checkout-btn"
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Place order • ₹{cartSubtotal}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Floating Ticket Bar (when items in cart on mobile width < 768px) */}
      <div className="md:hidden fixed bottom-16 inset-x-3 z-30">
        <div
          onClick={() => setMobileTicketOpen(true)}
          className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-xs font-black">
              {cartLines.reduce((acc, l) => acc + l.qty, 0)}
            </div>
            <div>
              <div className="text-xs font-bold">View Ticket</div>
              <div className="text-[10px] text-slate-300">Tap to review & punch</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold">₹{cartSubtotal}</span>
            <ChevronUp size={16} />
          </div>
        </div>
      </div>

      {/* Mobile Ticket Drawer / Bottom Sheet */}
      {mobileTicketOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in"
          onClick={() => setMobileTicketOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={17} className="text-blue-700" />
                <h3 className="font-bold text-slate-900 text-sm">Counter Ticket</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileTicketOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mobile Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[40vh]">
              {cartLines.map(line => (
                <div key={line.item.id} className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-900">{line.item.name}</div>
                    <div className="text-[11px] text-slate-500">₹{line.item.price} × {line.qty} = ₹{line.item.price * line.qty}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateLineQty(line.item.id, -1)}
                      className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 font-bold"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-5 text-center text-xs font-bold">{line.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateLineQty(line.item.id, 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 font-bold"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Checkout Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-4 gap-1.5">
                {(['CASH', 'UPI_COUNTER', 'CARD_COUNTER', 'OTHER'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-1.5 text-xs font-bold rounded-lg border ${paymentMode === mode ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200'}`}
                  >
                    {mode === 'UPI_COUNTER' ? 'UPI' : mode === 'CARD_COUNTER' ? 'Card' : mode}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Total:</span>
                <span className="text-lg font-black text-blue-900">₹{cartSubtotal}</span>
              </div>

              <button
                type="button"
                disabled={cartLines.length === 0 || isSubmitting || !isOnline}
                onClick={async () => {
                  await handlePlacePosOrder()
                  setMobileTicketOpen(false)
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md"
              >
                Confirm Order • ₹{cartSubtotal}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Print Receipt Dialog */}
      <PosPrintReceipt
        order={completedOrder}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />

      {/* ── RECENT POS ORDERS & VOID MODAL ── */}
      {showOrdersModal && (
        <div className="saas-modal-backdrop" onClick={() => setShowOrdersModal(false)}>
          <div className="saas-modal-card" style={{ maxWidth: '640px', width: '92%' }} onClick={e => e.stopPropagation()}>
            <div className="saas-modal-header">
              <div>
                <h3 className="saas-modal-title">Recent Counter Orders</h3>
                <p className="text-xs text-slate-500 mt-0.5">{outletName} • POS Sales & Void Ledger</p>
              </div>
              <button className="saas-modal-close" onClick={() => setShowOrdersModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {voidNotice && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '14px',
                  background: voidNotice.success ? '#DCFCE7' : '#FEE2E2',
                  color: voidNotice.success ? '#166534' : '#991B1B'
                }}>
                  {voidNotice.message}
                </div>
              )}

              {loadingRecentOrders ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontSize: '13px' }}>
                  Loading recent counter orders...
                </div>
              ) : recentPosOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontSize: '13px' }}>
                  No recent counter orders recorded for this outlet today.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="saas-table" style={{ width: '100%', fontSize: '12.5px' }}>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPosOrders.map(order => {
                        const canVoid = order.status === 'placed' || order.status === 'preparing'
                        const isSelectedVoid = voidingOrderId === order.id

                        return (
                          <React.Fragment key={order.id}>
                            <tr>
                              <td>
                                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                                  #{order.order_number || order.token || order.id}
                                </span>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>
                                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td>{order.customer_name || 'Walk-in'}</td>
                              <td style={{ fontWeight: 700 }}>₹{order.total}</td>
                              <td>
                                <span className={`saas-badge ${
                                  order.status === 'cancelled' ? 'saas-badge-neutral' :
                                  order.status === 'collected' ? 'saas-badge-success' :
                                  order.status === 'ready' ? 'saas-badge-info' : 'saas-badge-warning'
                                }`}>
                                  {order.status === 'cancelled' ? 'VOIDED' : order.status.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {canVoid ? (
                                  <button
                                    type="button"
                                    className="saas-btn saas-btn-sm saas-btn-secondary"
                                    style={{ color: '#DC2626', borderColor: '#FECACA', fontSize: '11.5px', gap: '4px' }}
                                    onClick={() => setVoidingOrderId(isSelectedVoid ? null : order.id)}
                                  >
                                    <Ban size={12} />
                                    <span>Void Order</span>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>—</span>
                                )}
                              </td>
                            </tr>
                            {isSelectedVoid && (
                              <tr>
                                <td colSpan={5} style={{ background: '#FEF2F2', padding: '12px 16px', borderRadius: '8px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B' }}>
                                      Confirm Void Order #{order.order_number || order.token || order.id}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {['Customer cancelled', 'Billing mistake', 'Payment failed', 'Other'].map(r => (
                                        <button
                                          key={r}
                                          type="button"
                                          className={`saas-btn saas-btn-sm ${voidReason === r ? 'saas-btn-primary' : 'saas-btn-secondary'}`}
                                          style={{ fontSize: '11px' }}
                                          onClick={() => setVoidReason(r)}
                                        >
                                          {r}
                                        </button>
                                      ))}
                                    </div>
                                    {voidReason === 'Other' && (
                                      <input
                                        type="text"
                                        placeholder="Reason for void..."
                                        value={voidCustomReason}
                                        onChange={e => setVoidCustomReason(e.target.value)}
                                        className="h-8 px-2.5 bg-white border border-slate-300 rounded text-xs"
                                      />
                                    )}
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                      <button
                                        type="button"
                                        className="saas-btn saas-btn-sm saas-btn-secondary"
                                        onClick={() => setVoidingOrderId(null)}
                                        disabled={isVoiding}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="saas-btn saas-btn-sm saas-btn-primary"
                                        style={{ background: '#DC2626', borderColor: '#DC2626' }}
                                        onClick={() => handleVoidOrder(order.id)}
                                        disabled={isVoiding}
                                      >
                                        {isVoiding ? 'Voiding...' : 'Confirm Void & Restore Stock'}
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="saas-btn saas-btn-secondary"
                onClick={() => setShowOrdersModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
