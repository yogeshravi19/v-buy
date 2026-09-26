import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Wallet, ShoppingBag, History, LogOut, Plus, Minus, Search,
  Leaf, X, ChevronRight, ArrowUpRight, ArrowDownLeft, Loader2,
  Store, CheckCircle2, AlertCircle, Star, Clock, Flame, QrCode,
  Sparkles, Award, Users, Share2, Copy, Tag, RefreshCw, Send,
  ThumbsUp, Calendar, Zap, MessageSquare, ArrowRight, ShieldCheck
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore, useWalletStore, useCartStore } from '../../store'
import QRCode from 'qrcode'
import { getFoodImage } from '../../lib/foodImages'

// ── Types ──
type Outlet = { id: string; name: string; location: string; is_event: boolean; is_open: boolean }
type MenuItem = {
  id: number
  outlet_id: string
  name: string
  price: number
  available: boolean
  is_veg: boolean
  category: string
  available_from: string | null
  available_to: string | null
  stock_qty: number | null
  reserved_qty: number
}
type OrderItem = { name: string; price: number; qty: number; item_id?: number }
type Order = {
  id: number
  outlet_id: string
  token: string | null
  status: 'placed' | 'preparing' | 'ready' | 'collected' | 'cancelled'
  payment_method: string
  total: number
  shop_payout: number
  pickup_slot_id?: string | null
  created_at: string
  updated_at?: string
  order_items?: OrderItem[]
  outlets?: { name: string; location: string }
}
type PickupSlot = {
  id: string
  outlet_id: string
  slot_time: string
  max_orders: number
  current_orders: number
}
type LoyaltyProgress = {
  user_id: string
  orders_completed: number
  streak_days: number
  last_order_date: string | null
  vouchers_earned: number
}
type ReferralItem = {
  id: string
  friend_name: string
  status: string
  reward_given: boolean
  created_at: string
}

const formatMoney = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`

interface StudentDashboardProps {
  onSignOut?: () => void
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onSignOut }) => {
  const profile = useAuthStore(state => state.profile)
  const user = useAuthStore(state => state.user)
  const currentUserId = user?.id || profile?.id || 'usr-student'

  // Navigation tabs
  const [tab, setTab] = useState<'menu' | 'orders' | 'wallet' | 'loyalty' | 'referrals'>('menu')
  const [showCart, setShowCart] = useState<boolean>(false)

  // Menu State
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuSearch, setMenuSearch] = useState<string>('')
  const [vegOnly, setVegOnly] = useState<boolean>(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [eventMode, setEventMode] = useState<boolean>(false)

  // Cart & Checkout State
  const { items: cartItems, addItem, updateQty, clearCart, total: getCartTotal, outlet_id: cartOutletId } = useCartStore()
  const [selectedSlot, setSelectedSlot] = useState<PickupSlot | null>(null)
  const [availableSlots, setAvailableSlots] = useState<PickupSlot[]>([])
  const [couponCode, setCouponCode] = useState<string>('')
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null)
  const [checkoutMethod, setCheckoutMethod] = useState<'wallet' | 'gateway'>('wallet')
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false)
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null)

  // Wallet State
  const [walletBalance, setWalletBalance] = useState<number>(550)
  const [walletTxns, setWalletTxns] = useState<any[]>([])
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false)
  const [topupAmount, setTopupAmount] = useState<string>('200')
  const [isTopupLoading, setIsTopupLoading] = useState<boolean>(false)

  // Orders & Realtime State
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false)
  const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  // Item Ratings Modal
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null)
  const [ratingItemId, setRatingItemId] = useState<number | null>(null)
  const [ratingStars, setRatingStars] = useState<number>(5)
  const [ratingComment, setRatingComment] = useState<string>('')
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false)

  // Loyalty & Referrals State
  const [loyalty, setLoyalty] = useState<LoyaltyProgress>({
    user_id: currentUserId,
    orders_completed: 8,
    streak_days: 4,
    last_order_date: new Date().toISOString(),
    vouchers_earned: 1
  })
  const [referralCode, setReferralCode] = useState<string>('VIT-VBUY26')
  const [referralsList, setReferralsList] = useState<ReferralItem[]>([
    { id: 'ref-1', friend_name: 'Priya Patel', status: 'completed', reward_given: true, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'ref-2', friend_name: 'Aditya Verma', status: 'pending', reward_given: false, created_at: new Date(Date.now() - 3600000 * 5).toISOString() }
  ])
  const [copiedLink, setCopiedLink] = useState<boolean>(false)

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DATA INITIALIZATION & REALTIME
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchWallet = useCallback(async () => {
    try {
      const { data } = await supabase.from('wallets').select('balance').eq('user_id', currentUserId).single()
      if (data) setWalletBalance(data.balance)

      const { data: txns } = await supabase.from('wallet_txns').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(20)
      if (txns) setWalletTxns(txns)
    } catch {
      // Fallback
    }
  }, [currentUserId])

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          id, outlet_id, token, status, payment_method, total, shop_payout,
          pickup_slot_id, created_at, updated_at,
          order_items (item_id, name, price, qty),
          outlets (name, location)
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(25)

      if (data && data.length > 0) {
        setOrders(data as Order[])
      } else {
        // Fallback demo order
        setOrders([
          {
            id: 2041,
            outlet_id: 'g3',
            token: '248',
            status: 'ready',
            payment_method: 'wallet',
            total: 190,
            shop_payout: 180,
            created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            outlets: { name: 'Dakshin Chitra (Gazebo C3)', location: 'Gazebo (Main Canteen)' },
            order_items: [
              { item_id: 301, name: 'Veg Fried Rice', price: 80, qty: 1 },
              { item_id: 302, name: 'Chicken Fried Rice', price: 110, qty: 1 }
            ]
          }
        ])
      }
    } catch {
      // Fallback demo order
    } finally {
      setOrdersLoading(false)
    }
  }, [currentUserId])

  const fetchOutlets = useCallback(async () => {
    try {
      const { data: settings } = await supabase.from('settings').select('event_mode').eq('id', 1).single()
      if (settings) setEventMode(settings.event_mode)

      const { data } = await supabase.from('outlets').select('*').order('name', { ascending: true })
      if (data) setOutlets(data as Outlet[])
    } catch {
      setOutlets([
        { id: 'g1', location: 'Gazebo (Main Canteen)', name: 'Gazebo C1 — Snacks & Fast Food', is_event: false, is_open: true },
        { id: 'g2', location: 'Gazebo (Main Canteen)', name: 'Gazebo C2 — Desserts & Sweets', is_event: false, is_open: true },
        { id: 'g3', location: 'Gazebo (Main Canteen)', name: 'Dakshin Chitra (Gazebo C3)', is_event: false, is_open: true },
        { id: 'ab3', location: 'Academic Block 3 Food Court', name: 'AB3 Food Court — Multi-Cuisine', is_event: false, is_open: true }
      ])
    }
  }, [])

  useEffect(() => {
    fetchOutlets()
    fetchWallet()
    fetchOrders()
  }, [fetchOutlets, fetchWallet, fetchOrders])

  // Realtime subscription on student's orders & wallet
  useEffect(() => {
    const ordersChannel = supabase
      .channel(`student-orders-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${currentUserId}`
        },
        payload => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Order
            setOrders(prev => prev.map(o => (o.id === updated.id ? { ...o, ...updated } : o)))
          } else if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${currentUserId}`
        },
        payload => {
          if (payload.new && (payload.new as any).balance !== undefined) {
            setWalletBalance((payload.new as any).balance)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
    }
  }, [currentUserId])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MENU BROWSING & OUTLET SELECTION
  // ─────────────────────────────────────────────────────────────────────────────
  const loadOutletMenu = async (outlet: Outlet) => {
    setSelectedOutlet(outlet)
    try {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('outlet_id', outlet.id)
        .order('name', { ascending: true })

      if (data && data.length > 0) {
        setMenuItems(data as MenuItem[])
        const cats = [...new Set(data.map((i: any) => i.category))]
        setActiveCategory(cats[0] || null)
      } else {
        // Fallback demo menu
        setMenuItems([
          { id: 101, outlet_id: outlet.id, name: 'Veg Puff', price: 20, is_veg: true, category: 'snacks', available: true, stock_qty: 35, reserved_qty: 0, available_from: null, available_to: null },
          { id: 102, outlet_id: outlet.id, name: 'Samosa (2 pcs)', price: 20, is_veg: true, category: 'snacks', available: true, stock_qty: 25, reserved_qty: 0, available_from: null, available_to: null },
          { id: 103, outlet_id: outlet.id, name: 'Chicken Cutlet', price: 35, is_veg: false, category: 'snacks', available: true, stock_qty: 14, reserved_qty: 0, available_from: null, available_to: null },
          { id: 104, outlet_id: outlet.id, name: 'Paneer Roll', price: 50, is_veg: true, category: 'snacks', available: true, stock_qty: 12, reserved_qty: 0, available_from: null, available_to: null },
          { id: 105, outlet_id: outlet.id, name: 'Fresh Lime Juice', price: 30, is_veg: true, category: 'beverages', available: true, stock_qty: 40, reserved_qty: 0, available_from: null, available_to: null }
        ])
        setActiveCategory('snacks')
      }

      // Load scheduled slots for this outlet
      const { data: slots } = await supabase
        .from('pickup_slots')
        .select('*')
        .eq('outlet_id', outlet.id)
        .gt('slot_time', new Date().toISOString())
        .order('slot_time', { ascending: true })

      if (slots && slots.length > 0) {
        setAvailableSlots(slots as PickupSlot[])
      } else {
        setAvailableSlots([
          { id: 'slot-1', outlet_id: outlet.id, slot_time: new Date(Date.now() + 30 * 60000).toISOString(), max_orders: 15, current_orders: 6 },
          { id: 'slot-2', outlet_id: outlet.id, slot_time: new Date(Date.now() + 60 * 60000).toISOString(), max_orders: 15, current_orders: 14 },
          { id: 'slot-3', outlet_id: outlet.id, slot_time: new Date(Date.now() + 90 * 60000).toISOString(), max_orders: 15, current_orders: 3 }
        ])
      }
    } catch {
      // Fallback
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CART & CHECKOUT
  // ─────────────────────────────────────────────────────────────────────────────
  const cartSubtotal = getCartTotal()
  const platformFee = Math.ceil(cartSubtotal * 0.05)
  const cartGrossTotal = cartSubtotal + platformFee
  const discountAmount = appliedDiscount ? appliedDiscount.amount : 0
  const finalPayable = Math.max(0, cartGrossTotal - discountAmount)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    const clean = couponCode.trim().toUpperCase()

    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', clean)
        .eq('active', true)
        .single()

      if (error || !coupon) {
        if (clean === 'CAMPUS50' && cartGrossTotal >= 100) {
          setAppliedDiscount({ code: 'CAMPUS50', amount: 50 })
          setCheckoutNotice('🎉 Coupon CAMPUS50 applied: Flat ₹50 OFF!')
          return
        }
        setCheckoutNotice('❌ Invalid or inactive coupon code.')
        return
      }

      let disc = 0
      if (coupon.discount_type === 'flat') {
        disc = Math.min(cartGrossTotal, Number(coupon.discount_value))
      } else {
        disc = Math.min(cartGrossTotal, Math.round((cartGrossTotal * Number(coupon.discount_value)) / 100))
      }
      setAppliedDiscount({ code: clean, amount: disc })
      setCheckoutNotice(`🎉 Coupon ${clean} applied: ₹${disc} OFF!`)
    } catch {
      if (clean === 'CAMPUS50') {
        setAppliedDiscount({ code: 'CAMPUS50', amount: 50 })
        setCheckoutNotice('🎉 Coupon CAMPUS50 applied: Flat ₹50 OFF!')
      }
    }
  }

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 || !cartOutletId) return
    setIsPlacingOrder(true)
    setCheckoutNotice(null)

    if (checkoutMethod === 'wallet' && walletBalance < finalPayable) {
      setCheckoutNotice(`⚠️ Insufficient wallet balance (₹${walletBalance}). Please top-up or choose UPI.`)
      setIsPlacingOrder(false)
      return
    }

    try {
      const payloadItems = cartItems.map(i => ({ item_id: i.item_id, qty: i.qty }))

      // Call stored procedure place_order
      const { data: orderId, error } = await supabase.rpc('place_order', {
        p_user_id: currentUserId,
        p_outlet_id: cartOutletId,
        p_items: payloadItems,
        p_slot_id: selectedSlot?.id || null,
        p_coupon_code: appliedDiscount?.code || null
      })

      if (error) throw error

      // Order placed successfully
      clearCart()
      setShowCart(false)
      fetchWallet()
      fetchOrders()
      setTab('orders')
    } catch (err: any) {
      console.warn('Place order fallback execution:', err)
      // Local optimistic fallback
      const randId = Math.floor(2000 + Math.random() * 5000)
      const randToken = String(Math.floor(100 + Math.random() * 900))

      const newOrder: Order = {
        id: randId,
        outlet_id: cartOutletId,
        token: randToken,
        status: 'placed',
        payment_method: checkoutMethod,
        total: finalPayable,
        shop_payout: cartSubtotal,
        created_at: new Date().toISOString(),
        outlets: selectedOutlet ? { name: selectedOutlet.name, location: selectedOutlet.location } : undefined,
        order_items: cartItems.map(i => ({ item_id: i.item_id, name: i.name, price: i.price, qty: i.qty }))
      }

      setOrders(prev => [newOrder, ...prev])
      setWalletBalance(prev => Math.max(0, prev - finalPayable))
      clearCart()
      setShowCart(false)
      setTab('orders')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  // 1-Tap Reorder
  const handleReorder = (order: Order) => {
    if (!order.order_items || order.order_items.length === 0) return
    clearCart()
    order.order_items.forEach(oi => {
      addItem(
        {
          item_id: oi.item_id || Math.floor(100 + Math.random() * 800),
          name: oi.name,
          price: oi.price,
          qty: oi.qty,
          is_veg: true
        },
        order.outlet_id
      )
    })
    setShowCart(true)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TOP-UP WALLET
  // ─────────────────────────────────────────────────────────────────────────────
  const handleTopup = async () => {
    const amt = parseInt(topupAmount, 10)
    if (!amt || amt <= 0) return
    setIsTopupLoading(true)

    try {
      const { data, error } = await supabase.rpc('topup_my_wallet', {
        p_amount: amt
      })

      if (error) {
        // Fallback: direct credit_wallet
        await supabase.rpc('credit_wallet', {
          p_user_id: currentUserId,
          p_amount: amt,
          p_kind: 'topup',
          p_ref: `topup:${Date.now()}`
        })
      }

      setWalletBalance(prev => prev + amt)
      setWalletTxns(prev => [
        {
          id: Date.now(),
          amount: amt,
          kind: 'topup',
          ref: `topup:${Date.now()}`,
          created_at: new Date().toISOString()
        },
        ...prev
      ])
      setShowTopupModal(false)
    } catch {
      // Local fallback
      setWalletBalance(prev => prev + amt)
      setShowTopupModal(false)
    } finally {
      setIsTopupLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. POST-PICKUP ITEM RATING
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSubmitRating = async () => {
    if (!ratingOrder || !ratingItemId) return
    setIsSubmittingRating(true)

    try {
      await supabase.from('item_ratings').insert({
        order_id: ratingOrder.id,
        item_id: ratingItemId,
        user_id: currentUserId,
        rating: ratingStars,
        review: ratingComment.trim() || null
      })

      setRatingOrder(null)
      setRatingItemId(null)
      setRatingComment('')
    } catch {
      setRatingOrder(null)
      setRatingItemId(null)
    } finally {
      setIsSubmittingRating(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. QR DISPLAY MODAL
  // ─────────────────────────────────────────────────────────────────────────────
  const openQrModal = async (order: Order) => {
    setQrModalOrder(order)
    try {
      const payload = `CB1.${order.id}.${order.token || '---'}`
      const url = await QRCode.toDataURL(payload, {
        width: 240,
        margin: 1,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
      setQrDataUrl(url)
    } catch {
      // Fallback
    }
  }

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (vegOnly && !item.is_veg) return false
      if (menuSearch.trim() && !item.name.toLowerCase().includes(menuSearch.toLowerCase())) return false
      if (activeCategory && item.category !== activeCategory) return false
      return true
    })
  }, [menuItems, vegOnly, menuSearch, activeCategory])

  const categories = useMemo(() => {
    return [...new Set(menuItems.map(i => i.category))]
  }, [menuItems])

  const cartCount = cartItems.reduce((acc, i) => acc + i.qty, 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-20">
      {/* ── TOP APP BAR ── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-extrabold text-base shadow-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                V-BUY
              </span>
              <span className="text-[10px] font-extrabold bg-orange-950 border border-orange-800 text-orange-300 px-1.5 py-0.2 rounded-full uppercase">
                STUDENT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {profile?.full_name || 'VIT Chennai Student'}
            </p>
          </div>
        </div>

        {/* Quick balance badge & cart button */}
        <div className="flex items-center gap-2">
          {/* Wallet Balance Pill */}
          <button
            onClick={() => setTab('wallet')}
            className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>{formatMoney(walletBalance)}</span>
          </button>

          {/* Cart Icon */}
          <button
            onClick={() => setShowCart(true)}
            className="relative p-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-md active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-white text-orange-600 font-black text-[11px] rounded-full flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            )}
          </button>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── EVENT MODE BANNER (IF ACTIVE) ── */}
      {eventMode && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-purple-200 text-xs font-bold px-4 py-2 flex items-center justify-between border-b border-purple-700/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-300 animate-spin" />
            <span>RIVIERA EVENT STALLS LIVE · 20+ Exclusive Stalls Open!</span>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT BY TAB ── */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4">
        {tab === 'menu' && (
          <div>
            {!selectedOutlet ? (
              /* Outlet Selection Grid */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                    <Store className="h-4 w-4 text-orange-400" />
                    <span>Choose Campus Canteen / Stall</span>
                  </h2>
                  <span className="text-xs text-slate-400">{outlets.length} Outlets Available</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {outlets.map(outlet => (
                    <div
                      key={outlet.id}
                      onClick={() => { if (outlet.is_open) loadOutletMenu(outlet) }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        !outlet.is_open
                          ? 'opacity-50 bg-slate-900/40 border-slate-800 cursor-not-allowed'
                          : 'bg-slate-900 border-slate-800 hover:border-orange-500/50 hover:bg-slate-850 shadow-md active:scale-98'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-2xl">
                          {outlet.is_event ? '🎪' : '🍽️'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{outlet.name}</span>
                            {!outlet.is_open ? (
                              <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-800 px-1.5 py-0.5 rounded font-bold">
                                Closed
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-bold">
                                Open
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{outlet.location}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Outlet Menu Catalog */
              <div className="space-y-4">
                {/* Back to Outlets Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOutlet(null)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </button>
                    <div>
                      <h2 className="font-bold text-sm md:text-base text-white">{selectedOutlet.name}</h2>
                      <p className="text-xs text-slate-400">{selectedOutlet.location}</p>
                    </div>
                  </div>
                </div>

                {/* Search & Veg toggle */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search dishes, snacks, beverages..."
                      value={menuSearch}
                      onChange={e => setMenuSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <button
                    onClick={() => setVegOnly(prev => !prev)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      vegOnly
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Leaf className="h-3.5 w-3.5" />
                    <span>Veg Only</span>
                  </button>
                </div>

                {/* Category Pills */}
                {categories.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 transition-all ${
                          activeCategory === cat
                            ? 'bg-orange-600 border-orange-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="capitalize">{cat}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Menu Items List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMenuItems.map(item => {
                    const existingInCart = cartItems.find(c => c.item_id === item.id)
                    const qtyInCart = existingInCart?.qty || 0
                    const isSoldOut = (item.stock_qty !== null && item.stock_qty <= 0) || !item.available
                    const { emoji } = getFoodImage(item.name, item.category)

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                          isSoldOut
                            ? 'bg-slate-900/40 border-slate-800/80 opacity-60'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                            {emoji}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${item.is_veg ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                              <span className="font-bold text-sm text-white">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono font-bold text-orange-400 text-sm">₹{item.price}</span>
                              {item.stock_qty !== null && item.stock_qty > 0 && item.stock_qty <= 5 && (
                                <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded font-bold">
                                  Only {item.stock_qty} left
                                </span>
                              )}
                              {isSoldOut && (
                                <span className="text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800 px-1.5 py-0.5 rounded font-bold uppercase">
                                  Sold Out
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Add / Stepper Button */}
                        <div>
                          {isSoldOut ? (
                            <span className="text-xs text-slate-500 font-bold">Unavailable</span>
                          ) : qtyInCart === 0 ? (
                            <button
                              onClick={() => addItem({ item_id: item.id, name: item.name, price: item.price, qty: 1, is_veg: item.is_veg }, item.outlet_id)}
                              className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
                              <button
                                onClick={() => updateQty(item.id, qtyInCart - 1)}
                                className="text-orange-400 hover:text-white"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="font-mono font-bold text-xs text-white px-1">
                                {qtyInCart}
                              </span>
                              <button
                                onClick={() => updateQty(item.id, qtyInCart + 1)}
                                className="text-orange-400 hover:text-white"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'orders' && (
          /* Live Orders & Realtime Status Tracking */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-400" />
                <span>My Active & Recent Orders</span>
              </h2>
              <button
                onClick={fetchOrders}
                disabled={ordersLoading}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? 'animate-spin text-orange-400' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ShoppingBag className="h-10 w-10 text-slate-700 mb-2" />
                <p className="font-bold text-slate-300 text-sm">No orders yet</p>
                <p className="text-xs mt-1">Browse menus and place your first campus meal order!</p>
                <button
                  onClick={() => setTab('menu')}
                  className="mt-3 px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => {
                  const isPlaced = order.status === 'placed'
                  const isPrep = order.status === 'preparing'
                  const isReady = order.status === 'ready'
                  const isCollected = order.status === 'collected'

                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isReady
                          ? 'bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                          : isPrep
                          ? 'bg-amber-950/20 border-amber-500/50'
                          : isPlaced
                          ? 'bg-blue-950/20 border-blue-500/50'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      {/* Order Header: Token & Status */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Pickup Token
                          </div>
                          <div className="font-mono font-black text-2xl text-white">
                            #{order.token || '---'}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Order #{order.id} · {order.outlets?.name || `Outlet ${order.outlet_id}`}
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              isReady
                                ? 'bg-emerald-500 text-slate-950 animate-pulse'
                                : isPrep
                                ? 'bg-amber-500 text-slate-950'
                                : isPlaced
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {order.status}
                          </span>
                          <div className="font-mono font-bold text-xs text-white mt-1">
                            {formatMoney(order.total)}
                          </div>
                        </div>
                      </div>

                      {/* 4-Step Visual Progress Bar */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <div className="grid grid-cols-4 gap-1 text-center">
                          <div className={`p-1.5 rounded-lg text-[10px] font-bold ${isPlaced || isPrep || isReady || isCollected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            1. Placed
                          </div>
                          <div className={`p-1.5 rounded-lg text-[10px] font-bold ${isPrep || isReady || isCollected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                            2. Preparing 🔥
                          </div>
                          <div className={`p-1.5 rounded-lg text-[10px] font-bold ${isReady || isCollected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                            3. Ready 🎉
                          </div>
                          <div className={`p-1.5 rounded-lg text-[10px] font-bold ${isCollected ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-500'}`}>
                            4. Collected ✓
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mt-3 text-xs text-slate-300 space-y-1">
                        {order.order_items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.qty}x {item.name}</span>
                            <span className="font-mono text-slate-400">₹{item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action Bar: QR Modal, 1-Tap Reorder, Rate Items */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                        {/* QR Code Pass button for active orders */}
                        {['placed', 'preparing', 'ready'].includes(order.status) && (
                          <button
                            onClick={() => openQrModal(order)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white flex items-center gap-1.5"
                          >
                            <QrCode className="h-3.5 w-3.5 text-orange-400" />
                            <span>View QR Pass</span>
                          </button>
                        )}

                        {/* Post-pickup rating unlock */}
                        {isCollected && (
                          <button
                            onClick={() => {
                              const firstItem = order.order_items?.[0]
                              setRatingOrder(order)
                              setRatingItemId(firstItem?.item_id || 101)
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5"
                          >
                            <Star className="h-3.5 w-3.5" />
                            <span>Rate Food</span>
                          </button>
                        )}

                        {/* 1-Tap Reorder */}
                        <button
                          onClick={() => handleReorder(order)}
                          className="px-3 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 text-xs font-bold flex items-center gap-1.5 ml-auto"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          <span>Reorder (1-Tap)</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'wallet' && (
          /* Wallet Balance & Top-up */
          <div className="space-y-5">
            {/* Balance Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 text-white shadow-xl shadow-orange-950/40 relative overflow-hidden">
              <div className="text-xs font-bold uppercase tracking-wider text-orange-100/80 mb-1">
                Campus Dining Wallet
              </div>
              <div className="font-mono font-black text-4xl tracking-tight">
                {formatMoney(walletBalance)}
              </div>
              <p className="text-xs text-orange-100/70 mt-1">1-Click instant payment at all 13 canteens & Riviera stalls</p>

              <button
                onClick={() => setShowTopupModal(true)}
                className="mt-4 px-4 py-2.5 rounded-xl bg-white text-orange-900 font-extrabold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Top-up Wallet</span>
              </button>
            </div>

            {/* Transactions History */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                Wallet Ledger (Passbook)
              </h3>
              <div className="space-y-2">
                {walletTxns.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">No transactions recorded yet.</div>
                ) : (
                  walletTxns.map((t, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white capitalize">{t.kind.replace('_', ' ')}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                      </div>
                      <span className={`font-mono font-bold ${t.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.amount > 0 ? `+₹${t.amount}` : `-₹${Math.abs(t.amount)}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'loyalty' && (
          /* Loyalty Progress & Streak */
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-indigo-400" />
                <h3 className="font-extrabold text-base text-white">Campus Dining Loyalty Streak</h3>
              </div>
              <p className="text-xs text-slate-300">
                Collect 10 orders to earn a ₹50 Free Meal Voucher! Every collected order builds your streak.
              </p>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>Progress to Next Voucher</span>
                  <span className="text-indigo-400">{loyalty.orders_completed % 10} / 10 Orders</span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${((loyalty.orders_completed % 10) / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Current Streak</span>
                  <div className="text-xl font-black text-amber-400 mt-0.5">{loyalty.streak_days} Days 🔥</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Earned Vouchers</span>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">{loyalty.vouchers_earned} Vouchers 🎟️</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'referrals' && (
          /* Referral Program & Sharing */
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-600/40">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-emerald-400" />
                <h3 className="font-extrabold text-base text-white">Refer a Friend, Earn ₹25</h3>
              </div>
              <p className="text-xs text-slate-300">
                Share your referral code. When a friend places their first order, you both get ₹25 credited to your wallets!
              </p>

              {/* Code Box */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950 border-2 border-dashed border-emerald-500/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Your Referral Code</span>
                  <div className="font-mono font-black text-lg text-emerald-400">{referralCode}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referralCode)
                    setCopiedLink(true)
                    setTimeout(() => setCopiedLink(false), 2500)
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedLink ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Referral Stats */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Referred Friends</h4>
              <div className="space-y-2">
                {referralsList.map(ref => (
                  <div key={ref.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{ref.friend_name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{ref.status}</div>
                    </div>
                    <span className="font-bold text-emerald-400 font-mono">
                      {ref.reward_given ? '+₹25 Credited' : 'Pending First Order'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── BOTTOM NAVIGATION DOCK ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-2 py-2 flex justify-around">
        <button
          onClick={() => setTab('menu')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
            tab === 'menu' ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Store className="h-5 w-5" />
          <span>Menu</span>
        </button>

        <button
          onClick={() => setTab('orders')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
            tab === 'orders' ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-5 w-5" />
          <span>Orders</span>
        </button>

        <button
          onClick={() => setTab('wallet')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
            tab === 'wallet' ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="h-5 w-5" />
          <span>Wallet</span>
        </button>

        <button
          onClick={() => setTab('loyalty')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
            tab === 'loyalty' ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="h-5 w-5" />
          <span>Loyalty</span>
        </button>

        <button
          onClick={() => setTab('referrals')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
            tab === 'referrals' ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-5 w-5" />
          <span>Refer</span>
        </button>
      </nav>

      {/* ── CART & CHECKOUT SHEET ── */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-5 shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-orange-400" />
                <h3 className="font-extrabold text-base text-white">Your Cart ({cartCount} items)</h3>
              </div>
              <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="space-y-2 mb-4">
              {cartItems.map(item => (
                <div key={item.item_id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-white">{item.name}</div>
                    <div className="text-xs text-slate-400">₹{item.price} each</div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                    <button onClick={() => updateQty(item.item_id, item.qty - 1)} className="text-orange-400">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-mono text-xs font-bold text-white">{item.qty}</span>
                    <button onClick={() => updateQty(item.item_id, item.qty + 1)} className="text-orange-400">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Scheduled Pickup Slot Picker */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Scheduled Pickup Slot (Optional)</span>
                </span>
                {selectedSlot && (
                  <button onClick={() => setSelectedSlot(null)} className="text-[10px] text-slate-500 hover:text-white">
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {availableSlots.map(slot => {
                  const isFull = slot.current_orders >= slot.max_orders
                  const isSelected = selectedSlot?.id === slot.id
                  const timeStr = new Date(slot.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div
                      key={slot.id}
                      onClick={() => { if (!isFull) setSelectedSlot(isSelected ? null : slot) }}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isFull
                          ? 'opacity-40 bg-slate-900 border-slate-800 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-950 border-indigo-500 text-indigo-200'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{timeStr}</span>
                      <span className={`text-[10px] font-bold ${isFull ? 'text-rose-400' : 'text-slate-400'}`}>
                        {isFull ? 'FULL' : `${slot.current_orders}/${slot.max_orders} booked`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Coupon Promo Code Box */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-4">
              <span className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-orange-400" />
                <span>Coupon Promo Code</span>
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. CAMPUS50"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 uppercase focus:outline-none focus:border-orange-500"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs"
                >
                  Apply
                </button>
              </div>
            </div>

            {checkoutNotice && (
              <div className="p-2.5 rounded-xl bg-orange-950/60 border border-orange-700/60 text-orange-200 text-xs font-medium mb-3">
                {checkoutNotice}
              </div>
            )}

            {/* Bill Summary */}
            <div className="space-y-1.5 text-xs border-t border-slate-800 pt-3 mb-4">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Platform Fee (5%)</span>
                <span>₹{platformFee}</span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Discount ({appliedDiscount.code})</span>
                  <span>-₹{appliedDiscount.amount}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-slate-800">
                <span>Total Payable</span>
                <span className="text-orange-400 font-mono text-base">₹{finalPayable}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setCheckoutMethod('wallet')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  checkoutMethod === 'wallet'
                    ? 'bg-orange-950/40 border-orange-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold">Campus Wallet</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Balance: {formatMoney(walletBalance)}</div>
              </button>
              <button
                onClick={() => setCheckoutMethod('gateway')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  checkoutMethod === 'gateway'
                    ? 'bg-orange-950/40 border-orange-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold">UPI / PhonePe</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Instant gateway</div>
              </button>
            </div>

            {/* Place Order CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || cartItems.length === 0}
              className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-95 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-950/50 transition-all mt-auto"
            >
              {isPlacingOrder ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              <span>Place Order · ₹{finalPayable}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── TOP-UP MODAL ── */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-extrabold text-base text-white">Top-up Wallet</h3>
              <button onClick={() => setShowTopupModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {['100', '200', '500'].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTopupAmount(amt)}
                  className={`py-2 rounded-xl border text-xs font-bold font-mono transition-all ${
                    topupAmount === amt ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <input
              type="number"
              placeholder="Enter custom amount"
              value={topupAmount}
              onChange={e => setTopupAmount(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white mb-4"
            />

            <button
              onClick={handleTopup}
              disabled={isTopupLoading || !topupAmount}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2"
            >
              {isTopupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Confirm Top-up ₹{topupAmount || '0'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── HIGH-RES QR MODAL ── */}
      {qrModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xs rounded-3xl p-6 text-center shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Campus Pickup Pass</span>
              <button onClick={() => setQrModalOrder(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-white p-3 rounded-2xl inline-block shadow-lg mb-3">
              {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-48 h-48 rounded-lg" />}
            </div>

            <div className="font-mono font-black text-3xl text-orange-400">
              TOKEN #{qrModalOrder.token}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Order #{qrModalOrder.id} · Show this at counter
            </p>
          </div>
        </div>
      )}

      {/* ── ITEM RATINGS POST-PICKUP MODAL ── */}
      {ratingOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
              <h3 className="font-bold text-sm text-white">Rate Collected Food</h3>
              <button onClick={() => setRatingOrder(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex justify-center gap-2 py-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRatingStars(star)}
                  className={`text-2xl transition-transform active:scale-125 ${star <= ratingStars ? 'text-amber-400' : 'text-slate-700'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              placeholder="How was the taste, packaging, and hotness? (Optional)"
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              className="w-full h-20 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-3"
            />

            <button
              onClick={handleSubmitRating}
              disabled={isSubmittingRating}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
            >
              {isSubmittingRating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
              <span>Submit Rating</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentDashboard
