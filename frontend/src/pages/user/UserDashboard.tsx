import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, ShoppingBag, History, LogOut, Plus, Minus, Search,
  Leaf, X, ChevronRight, ArrowUpRight, ArrowDownLeft, Loader2,
  Store, CheckCircle2, AlertCircle, Star, Clock, Flame, QrCode,
  Award, Users, Share2, Copy, Tag, RefreshCw, Send,
  ThumbsUp, Calendar, Zap, MessageSquare, ArrowRight, ShieldCheck,
  ChefHat, Bell, UtensilsCrossed, Receipt, ArrowLeft
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore, useWalletStore, useCartStore } from '../../store'
import QRCode from 'qrcode'
import { getFoodImage } from '../../lib/foodImages'
import { VegIndicator } from '../../components/VegIndicator'

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

const formatMoney = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN')}`

// ─── Humanized Subcomponents ──────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-dashed border-slate-800/90 bg-slate-900/40 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6"
    >
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
        <Icon className="w-8 h-8 text-orange-400" strokeWidth={1.75} />
      </div>
      <h3 className="font-extrabold text-base sm:text-lg text-white mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-xs leading-relaxed mb-6">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {actionLabel && onAction && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onAction}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-md shadow-orange-950/40 transition-all"
          >
            {actionLabel}
          </motion.button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onSecondaryAction}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
          >
            {secondaryActionLabel}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

function MenuCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden flex flex-col animate-pulse">
      <div className="h-44 sm:h-48 w-full bg-slate-800/70 relative">
        <div className="absolute top-3 left-3 h-5 w-16 bg-slate-700/60 rounded-lg" />
        <div className="absolute top-3 right-3 h-5 w-14 bg-slate-700/60 rounded-lg" />
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="h-5 w-3/4 bg-slate-800 rounded-md mb-2" />
          <div className="h-4 w-1/3 bg-slate-800/70 rounded-md" />
        </div>
        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <div className="h-3 w-16 bg-slate-800 rounded" />
          <div className="h-8 w-20 bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function OutletCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-3.5 flex-1">
        <div className="h-12 w-12 rounded-xl bg-slate-800 flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-1/2 bg-slate-800 rounded-md" />
          <div className="h-3 w-1/3 bg-slate-800/60 rounded-md" />
        </div>
      </div>
      <div className="h-4 w-4 bg-slate-800 rounded-full" />
    </div>
  )
}

function OrderCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <div className="h-3 w-16 bg-slate-800 rounded" />
          <div className="h-6 w-24 bg-slate-800 rounded-md" />
        </div>
        <div className="h-5 w-16 bg-slate-800 rounded" />
      </div>
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/60">
        <div className="h-7 bg-slate-800/70 rounded-lg" />
        <div className="h-7 bg-slate-800/70 rounded-lg" />
        <div className="h-7 bg-slate-800/70 rounded-lg" />
        <div className="h-7 bg-slate-800/70 rounded-lg" />
      </div>
    </div>
  )
}

// ─── Main UserDashboard Component ──────────────────────────────────────────

interface UserDashboardProps {
  onSignOut?: () => void
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onSignOut }) => {
  const profile = useAuthStore(state => state.profile)
  const user = useAuthStore(state => state.user)
  const currentUserId = user?.id || profile?.id || 'usr-customer'

  // Navigation tabs (Menu, Orders, Wallet)
  const [tab, setTab] = useState<'menu' | 'orders' | 'wallet'>('menu')
  const [showCart, setShowCart] = useState<boolean>(false)
  const [cartBouncing, setCartBouncing] = useState<boolean>(false)

  // Menu State
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [outletsLoading, setOutletsLoading] = useState<boolean>(true)
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState<boolean>(false)
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

  // Group Cart State
  const [activeGroupCart, setActiveGroupCart] = useState<{ code: string; is_host: boolean } | null>(null)
  const [groupJoinInput, setGroupJoinInput] = useState<string>('')
  const [groupCartMembers, setGroupCartMembers] = useState<string[]>(['You (Host)'])

  // Item Rating Modal
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null)
  const [ratingItemId, setRatingItemId] = useState<number | null>(null)
  const [ratingStars, setRatingStars] = useState<number>(5)
  const [ratingComment, setRatingComment] = useState<string>('')
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false)

  // Trigger cart bounce micro-interaction
  const triggerCartBounce = useCallback(() => {
    setCartBouncing(true)
    setTimeout(() => setCartBouncing(false), 450)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. INITIAL MOUNT & REALTIME DATA
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchOutlets = useCallback(async () => {
    setOutletsLoading(true)
    try {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      if (data && data.length > 0) {
        setOutlets(data as Outlet[])
      } else {
        // Fallback demo outlets
        setOutlets([
          { id: 'g1', name: 'Gazebo C1 — Snacks & Fast Food', location: 'Gazebo (Main Canteen)', is_event: false, is_open: true },
          { id: 'g2', name: 'Gazebo C2 — Desserts & Sweets', location: 'Gazebo (Main Canteen)', is_event: false, is_open: true },
          { id: 'g3', name: 'Gazebo C3 — Dakshin Chitra', location: 'Gazebo (Main Canteen)', is_event: false, is_open: true },
          { id: 'g4', name: 'Gazebo C4 — Lassi House & Shakes', location: 'Gazebo (Main Canteen)', is_event: false, is_open: true },
          { id: 'n1', name: 'North Square — Georgia Coffee & Maggie', location: 'North Square Canteen', is_event: false, is_open: true },
          { id: 'n2', name: 'North Square — Alpha Non-Veg & Biryani', location: 'North Square Canteen', is_event: false, is_open: true },
          { id: 'ab3', name: 'AB3 Food Court — Amphitheatre', location: 'Academic Blocks', is_event: false, is_open: true }
        ])
      }
    } catch {
      // Offline fallback
      setOutlets([
        { id: 'g1', name: 'Gazebo C1 — Snacks & Fast Food', location: 'Gazebo (Main Canteen)', is_event: false, is_open: true },
        { id: 'g2', name: 'Gazebo C2 — Desserts & Sweets', location: 'Gazebo (Main Canteen)', is_event: false, is_open: true },
        { id: 'g3', name: 'Gazebo C3 — Dakshin Chitra', location: 'Gazebo (Main Canteen)', is_event: false, is_open: true },
        { id: 'g4', name: 'Gazebo C4 — Lassi House & Shakes', location: 'Gazebo (Main Canteen)', is_event: false, is_open: true }
      ])
    } finally {
      setOutletsLoading(false)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, outlet_id, token, status, payment_method, total, shop_payout,
          pickup_slot_id, created_at, updated_at,
          order_items (name, price, qty, item_id),
          outlets (name, location)
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) {
        setOrders(data as Order[])
      }
    } catch {
      // Fallback past orders demo
      setOrders([
        {
          id: 4891,
          outlet_id: 'g1',
          token: '142',
          status: 'ready',
          payment_method: 'wallet',
          total: 80,
          shop_payout: 76,
          created_at: new Date(Date.now() - 15 * 60000).toISOString(),
          outlets: { name: 'Gazebo C1 — Snacks & Fast Food', location: 'Gazebo (Main Canteen)' },
          order_items: [
            { name: 'Paneer Roll', price: 50, qty: 1, item_id: 104 },
            { name: 'Fresh Lime Juice', price: 30, qty: 1, item_id: 105 }
          ]
        },
        {
          id: 4850,
          outlet_id: 'g2',
          token: '089',
          status: 'collected',
          payment_method: 'wallet',
          total: 40,
          shop_payout: 38,
          created_at: new Date(Date.now() - 120 * 60000).toISOString(),
          outlets: { name: 'Gazebo C2 — Desserts & Sweets', location: 'Gazebo (Main Canteen)' },
          order_items: [
            { name: 'Gulab Jamun (2 pcs)', price: 40, qty: 1, item_id: 107 }
          ]
        }
      ])
    } finally {
      setOrdersLoading(false)
    }
  }, [currentUserId])

  const fetchWallet = useCallback(async () => {
    try {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', currentUserId)
        .single()

      if (walletData) {
        setWalletBalance(Number(walletData.balance))
      }

      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (txns) setWalletTxns(txns)
    } catch {
      // Fallback
      setWalletTxns([
        { id: 1, kind: 'top_up', amount: 300, created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 2, kind: 'order_payment', amount: -80, created_at: new Date(Date.now() - 3600000).toISOString() }
      ])
    }
  }, [currentUserId])

  useEffect(() => {
    fetchOutlets()
    fetchOrders()
    fetchWallet()

    // Realtime channel for order status updates
    const channel = supabase
      .channel(`student_orders_${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${currentUserId}` },
        payload => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Order
            setOrders(prev => prev.map(o => (o.id === updated.id ? { ...o, ...updated } : o)))
          } else if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            setOrders(prev => [newOrder, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOutlets, fetchOrders, fetchWallet, currentUserId])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. OUTLET MENU LOADER
  // ─────────────────────────────────────────────────────────────────────────────
  const loadOutletMenu = async (outlet: Outlet) => {
    setSelectedOutlet(outlet)
    setMenuSearch('')
    setActiveCategory(null)
    setMenuLoading(true)

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
          { id: 105, outlet_id: outlet.id, name: 'Fresh Lime Juice', price: 30, is_veg: true, category: 'beverages', available: true, stock_qty: 40, reserved_qty: 0, available_from: null, available_to: null },
          { id: 106, outlet_id: outlet.id, name: 'Masala Dosa', price: 45, is_veg: true, category: 'breakfast', available: true, stock_qty: 20, reserved_qty: 0, available_from: null, available_to: null }
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
    } finally {
      // Short delay for visual polish so skeleton smoothly settles
      setTimeout(() => setMenuLoading(false), 200)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CART & CHECKOUT
  // ─────────────────────────────────────────────────────────────────────────────
  const cartSubtotal = getCartTotal()
  const discountAmount = appliedDiscount?.amount || 0
  const convenienceFee = cartSubtotal > 0 ? Math.round(cartSubtotal * 0.07) : 0
  const finalPayable = Math.max(0, cartSubtotal - discountAmount + convenienceFee)
  const cartCount = cartItems.reduce((acc, i) => acc + i.qty, 0)

  const handleAddToCart = (item: MenuItem) => {
    addItem({ item_id: item.id, name: item.name, price: item.price, qty: 1, is_veg: item.is_veg }, item.outlet_id)
    triggerCartBounce()
  }

  const handleApplyCoupon = async () => {
    const clean = couponCode.trim().toUpperCase()
    if (!clean) return

    try {
      const cartGrossTotal = getCartTotal()
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', clean)
        .eq('is_active', true)
        .lte('min_order_value', cartGrossTotal)
        .single()

      if (error || !coupon) {
        if (clean === 'CAMPUS50' && cartGrossTotal >= 100) {
          setAppliedDiscount({ code: 'CAMPUS50', amount: 50 })
          setCheckoutNotice('Coupon CAMPUS50 applied: Flat ₹50 OFF!')
          return
        }
        setCheckoutNotice('Invalid or inactive coupon code.')
        return
      }

      let disc = 0
      if (coupon.discount_type === 'flat') {
        disc = Math.min(cartGrossTotal, Number(coupon.discount_value))
      } else {
        disc = Math.min(cartGrossTotal, Math.round((cartGrossTotal * Number(coupon.discount_value)) / 100))
      }
      setAppliedDiscount({ code: clean, amount: disc })
      setCheckoutNotice(`Coupon ${clean} applied: ₹${disc} OFF!`)
    } catch {
      if (clean === 'CAMPUS50') {
        setAppliedDiscount({ code: 'CAMPUS50', amount: 50 })
        setCheckoutNotice('Coupon CAMPUS50 applied: Flat ₹50 OFF!')
      }
    }
  }

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 || !cartOutletId) return
    setIsPlacingOrder(true)
    setCheckoutNotice(null)

    if (checkoutMethod === 'wallet' && walletBalance < finalPayable) {
      setCheckoutNotice(`Insufficient wallet balance (₹${walletBalance}). Please top-up or choose UPI.`)
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
        p_payment_method: checkoutMethod,
        p_pickup_slot_id: selectedSlot?.id || null,
        p_discount_amount: discountAmount,
        p_coupon_code: appliedDiscount?.code || null
      })

      if (error) {
        // Fallback direct insert if RPC not present in test schema
        const token = String(Math.floor(100 + Math.random() * 900))
        const { data: newOrder, error: insErr } = await supabase
          .from('orders')
          .insert({
            user_id: currentUserId,
            outlet_id: cartOutletId,
            token,
            status: 'placed',
            payment_method: checkoutMethod,
            total: finalPayable,
            shop_payout: Math.round(finalPayable * 0.95),
            pickup_slot_id: selectedSlot?.id || null
          })
          .select()
          .single()

        if (insErr) throw insErr

        if (newOrder) {
          clearCart()
          setShowCart(false)
          fetchOrders()
          fetchWallet()
          setTab('orders')
          return
        }
      }

      clearCart()
      setShowCart(false)
      fetchOrders()
      fetchWallet()
      setTab('orders')
    } catch (err: any) {
      // Fallback local simulate order for seamless preview
      const token = String(Math.floor(100 + Math.random() * 900))
      const simulated: Order = {
        id: Math.floor(5000 + Math.random() * 5000),
        outlet_id: cartOutletId || 'g1',
        token,
        status: 'placed',
        payment_method: checkoutMethod,
        total: finalPayable,
        shop_payout: Math.round(finalPayable * 0.95),
        pickup_slot_id: selectedSlot?.id || null,
        created_at: new Date().toISOString(),
        outlets: {
          name: outlets.find(o => o.id === cartOutletId)?.name || 'Campus Canteen',
          location: outlets.find(o => o.id === cartOutletId)?.location || 'Campus Center'
        },
        order_items: cartItems.map(i => ({ name: i.name, price: i.price, qty: i.qty, item_id: i.item_id }))
      }

      setOrders(prev => [simulated, ...prev])
      setWalletBalance(prev => (checkoutMethod === 'wallet' ? Math.max(0, prev - finalPayable) : prev))
      clearCart()
      setShowCart(false)
      setTab('orders')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  // 1-Tap Reorder helper
  const handleReorder = (order: Order) => {
    if (!order.order_items || order.order_items.length === 0) return
    clearCart()
    order.order_items.forEach(item => {
      addItem({
        item_id: item.item_id || Math.floor(Math.random() * 900) + 100,
        name: item.name,
        price: item.price,
        qty: item.qty,
        is_veg: true
      }, order.outlet_id)
    })
    triggerCartBounce()
    setShowCart(true)
  }

  // Top-Up Wallet Simulation
  const handleTopup = async () => {
    const amt = parseInt(topupAmount, 10)
    if (!amt || amt <= 0) return
    setIsTopupLoading(true)

    try {
      await supabase.from('wallet_transactions').insert({
        user_id: currentUserId,
        amount: amt,
        kind: 'top_up'
      })
      setWalletBalance(prev => prev + amt)
      setWalletTxns(prev => [{ id: Date.now(), kind: 'top_up', amount: amt, created_at: new Date().toISOString() }, ...prev])
      setShowTopupModal(false)
    } catch {
      setWalletBalance(prev => prev + amt)
      setShowTopupModal(false)
    } finally {
      setIsTopupLoading(false)
    }
  }

  // QR Code generator for modal
  const openQrModal = async (order: Order) => {
    setQrModalOrder(order)
    try {
      const code = `VFOOD:${order.id}:${order.token}:${order.outlet_id}`
      const url = await QRCode.toDataURL(code, { width: 240, margin: 1, color: { dark: '#0F172A', light: '#FFFFFF' } })
      setQrDataUrl(url)
    } catch {
      // Fallback
    }
  }

  // Submit Rating
  const handleSubmitRating = async () => {
    if (!ratingOrder || !ratingItemId) return
    setIsSubmittingRating(true)
    try {
      await supabase.from('item_reviews').insert({
        order_id: ratingOrder.id,
        item_id: ratingItemId,
        user_id: currentUserId,
        rating: ratingStars,
        comment: ratingComment.trim() || null
      })
      setRatingOrder(null)
      setRatingComment('')
    } catch {
      setRatingOrder(null)
    } finally {
      setIsSubmittingRating(false)
    }
  }

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (vegOnly && !item.is_veg) return false
      if (activeCategory && item.category !== activeCategory) return false
      if (menuSearch.trim()) {
        const q = menuSearch.toLowerCase().trim()
        return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
      }
      return true
    })
  }, [menuItems, vegOnly, activeCategory, menuSearch])

  // Unique menu categories
  const categories = useMemo(() => {
    return [...new Set(menuItems.map(i => i.category))]
  }, [menuItems])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-24">
      {/* ── TOP APP BAR ── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <motion.div
            whileTap={{ scale: 0.92 }}
            className="h-9 w-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-extrabold text-base shadow-sm"
          >
            <Zap className="h-5 w-5 text-orange-400 fill-orange-400" strokeWidth={2} />
          </motion.div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                V-FOOD
              </span>
              <span className="text-[10px] font-extrabold bg-orange-950 border border-orange-800 text-orange-300 px-1.5 py-0.2 rounded-full uppercase">
                USER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {profile?.full_name || 'VIT Chennai User'}
            </p>
          </div>
        </div>

        {/* Quick balance badge & cart button with Micro-Interaction Bounce */}
        <div className="flex items-center gap-2">
          {/* Wallet Balance Pill */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setTab('wallet')}
            className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Wallet className="h-3.5 w-3.5" strokeWidth={2} />
            <span>{formatMoney(walletBalance)}</span>
          </motion.button>

          {/* Cart Icon with Add-Bounce Micro-interaction */}
          <motion.button
            animate={cartBouncing ? { scale: [1, 1.25, 0.92, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowCart(true)}
            className="relative p-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-md active:scale-95"
            aria-label="Open Cart Tray"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={2} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-white text-orange-600 font-black text-[11px] rounded-full flex items-center justify-center shadow-md ring-2 ring-slate-900"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {onSignOut && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onSignOut}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </motion.button>
          )}
        </div>
      </header>

      {/* ── EVENT MODE BANNER (IF ACTIVE) ── */}
      {eventMode && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-purple-200 text-xs font-bold px-4 py-2 flex items-center justify-between border-b border-purple-700/50">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-purple-300" strokeWidth={2} />
            <span>RIVIERA EVENT STALLS LIVE · 20+ Stalls Open</span>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT BY TAB ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-4 pb-28">
        {tab === 'menu' && (
          <div>
            {!selectedOutlet ? (
              /* Outlet Selection Grid */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                    <Store className="h-4 w-4 text-orange-400" strokeWidth={2} />
                    <span>Choose Campus Canteen / Stall</span>
                  </h2>
                  <span className="text-xs text-slate-400">{outlets.length} Outlets Open</span>
                </div>

                {outletsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {[1, 2, 3, 4].map(idx => (
                      <OutletCardSkeleton key={idx} />
                    ))}
                  </div>
                ) : outlets.length === 0 ? (
                  <EmptyState
                    icon={Store}
                    title="No campus canteens open"
                    description="Canteens are currently closed or updating their meal schedule. Please check back shortly."
                    actionLabel="Refresh Outlets"
                    onAction={fetchOutlets}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {outlets.map(outlet => (
                      <motion.div
                        key={outlet.id}
                        whileTap={{ scale: outlet.is_open ? 0.98 : 1 }}
                        whileHover={outlet.is_open ? { y: -2 } : {}}
                        onClick={() => { if (outlet.is_open) loadOutletMenu(outlet) }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          !outlet.is_open
                            ? 'opacity-50 bg-slate-900/40 border-slate-800 cursor-not-allowed'
                            : 'bg-slate-900 border-slate-800 hover:border-orange-500/50 hover:bg-slate-850 shadow-md active:scale-98'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="h-12 w-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 flex-shrink-0">
                            {outlet.is_event ? (
                              <Tag className="h-5 w-5 text-amber-400" strokeWidth={2} />
                            ) : (
                              <UtensilsCrossed className="h-5 w-5 text-orange-400" strokeWidth={2} />
                            )}
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
                        <ChevronRight className="h-4 w-4 text-slate-500" strokeWidth={2} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Outlet Menu Catalog with Food-First Cards */
              <div className="space-y-4">
                {/* Back to Outlets Navigation Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedOutlet(null)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all flex items-center gap-1 text-xs font-bold"
                    >
                      <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                      <span className="hidden sm:inline">All Canteens</span>
                    </motion.button>
                    <div>
                      <h2 className="font-extrabold text-sm md:text-base text-white">{selectedOutlet.name}</h2>
                      <p className="text-xs text-slate-400">{selectedOutlet.location}</p>
                    </div>
                  </div>
                </div>

                {/* Search & Veg toggle */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" strokeWidth={2} />
                    <input
                      type="text"
                      placeholder="Search dishes, rolls, biryani..."
                      value={menuSearch}
                      onChange={e => setMenuSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    {menuSearch && (
                      <button
                        onClick={() => setMenuSearch('')}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVegOnly(prev => !prev)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                      vegOnly
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Leaf className="h-3.5 w-3.5" strokeWidth={2} />
                    <span className="hidden sm:inline">Veg Only</span>
                    <span className="sm:hidden">Veg</span>
                  </motion.button>
                </div>

                {/* Category Pills Scroller */}
                {categories.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setActiveCategory(null)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 transition-all ${
                        activeCategory === null
                          ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      All Items
                    </motion.button>
                    {categories.map(cat => (
                      <motion.button
                        key={cat}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 transition-all ${
                          activeCategory === cat
                            ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="capitalize">{cat}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* ── Food-First Cards Grid ── */}
                {menuLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {[1, 2, 3, 4, 5, 6].map(idx => (
                      <MenuCardSkeleton key={idx} />
                    ))}
                  </div>
                ) : filteredMenuItems.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="No dishes found"
                    description={`We couldn't find any menu item matching "${menuSearch}". Try searching for popular items like Biryani, Dosa, Roll, or Juice.`}
                    actionLabel="Clear Search & Filters"
                    onAction={() => {
                      setMenuSearch('')
                      setVegOnly(false)
                      setActiveCategory(null)
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filteredMenuItems.map(item => {
                      const existingInCart = cartItems.find(c => c.item_id === item.id)
                      const qtyInCart = existingInCart?.qty || 0
                      const isSoldOut = (item.stock_qty !== null && item.stock_qty <= 0) || !item.available
                      const { url } = getFoodImage(item.name, item.category)

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25 }}
                          className={`group rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col ${
                            isSoldOut
                              ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                              : 'bg-slate-900/90 border-slate-800 hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/5'
                          }`}
                        >
                          {/* Large Hero Food Photo Container */}
                          <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-950 flex-shrink-0">
                            {url ? (
                              <img
                                src={url}
                                alt={item.name}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className="absolute inset-0 items-center justify-center bg-slate-900/80"
                              style={{ display: url ? 'none' : 'flex' }}
                            >
                              <UtensilsCrossed className="w-8 h-8 text-slate-600" strokeWidth={1.5} />
                            </div>

                            {/* Subtle gradient vignette at bottom of image for contrast */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

                            {/* Top Badges (Dietary FSSAI mark + Category) */}
                            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                              <div className="bg-slate-950/85 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-700/60 shadow-md">
                                <VegIndicator isVeg={item.is_veg} size="sm" showLabel={true} />
                              </div>
                              {item.category && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-950/85 backdrop-blur-md text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded-lg shadow-md">
                                  {item.category}
                                </span>
                              )}
                            </div>

                            {/* Floating Stock / Sold Out Badge on Photo */}
                            {item.stock_qty !== null && item.stock_qty > 0 && item.stock_qty <= 5 && !isSoldOut && (
                              <div className="absolute bottom-2.5 left-2.5">
                                <span className="text-[11px] font-extrabold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md shadow-md animate-pulse">
                                  Only {item.stock_qty} left!
                                </span>
                              </div>
                            )}
                            {isSoldOut && (
                              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center">
                                <span className="text-xs font-black uppercase tracking-widest text-rose-300 bg-rose-950/80 border border-rose-800 px-3 py-1 rounded-xl shadow-lg">
                                  Sold Out
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Card Details Body */}
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-bold text-base text-white group-hover:text-orange-400 transition-colors leading-snug line-clamp-1">
                                {item.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono font-black text-lg text-orange-400">
                                  ₹{item.price}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Pre-paid · Freshly Prepared
                                </span>
                              </div>
                            </div>

                            {/* Card Bottom: Add to Cart / Quantity Stepper Micro-Interaction */}
                            <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                              <span className="text-xs text-slate-500 font-medium">
                                {qtyInCart > 0 ? `${qtyInCart} in tray` : 'Quick Add'}
                              </span>

                              {isSoldOut ? (
                                <span className="text-xs text-slate-500 font-bold px-2 py-1">Unavailable</span>
                              ) : qtyInCart === 0 ? (
                                <motion.button
                                  whileTap={{ scale: 0.92 }}
                                  whileHover={{ scale: 1.03 }}
                                  onClick={() => handleAddToCart(item)}
                                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-orange-950/30 transition-all"
                                >
                                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                                  <span>Add</span>
                                </motion.button>
                              ) : (
                                <motion.div
                                  initial={{ scale: 0.9 }}
                                  animate={{ scale: 1 }}
                                  className="flex items-center gap-2.5 bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow-inner"
                                >
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => updateQty(item.id, qtyInCart - 1)}
                                    className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                                  </motion.button>
                                  <motion.span
                                    key={qtyInCart}
                                    initial={{ scale: 1.3, y: -2 }}
                                    animate={{ scale: 1, y: 0 }}
                                    className="font-mono font-black text-sm text-orange-400 px-1 min-w-[16px] text-center"
                                  >
                                    {qtyInCart}
                                  </motion.span>
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => updateQty(item.id, qtyInCart + 1)}
                                    className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                                  </motion.button>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'orders' && (
          /* Live Orders & Realtime Status Tracking with Smooth Steppers */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-400" strokeWidth={2} />
                <span>My Active & Recent Orders</span>
              </h2>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={fetchOrders}
                disabled={ordersLoading}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? 'animate-spin text-orange-400' : ''}`} strokeWidth={2} />
                <span>Refresh</span>
              </motion.button>
            </div>

            {ordersLoading ? (
              <div className="space-y-4">
                <OrderCardSkeleton />
                <OrderCardSkeleton />
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No orders yet"
                description="When you order a fresh meal or quick bite from campus canteens, your live status tracking and pickup pass will show up here."
                actionLabel="Explore Canteen Menus"
                onAction={() => setTab('menu')}
              />
            ) : (
              <div className="space-y-4">
                {orders.map(order => {
                  const isPlaced = order.status === 'placed'
                  const isPrep = order.status === 'preparing'
                  const isReady = order.status === 'ready'
                  const isCollected = order.status === 'collected'

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl border transition-all ${
                        isReady
                          ? 'bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/20'
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
                                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
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

                      {/* 4-Step Animated Visual Progress Stepper */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        {/* Animated progress track line */}
                        <div className="relative mb-2.5 px-3">
                          <div className="h-1 w-full bg-slate-800 rounded-full" />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: isCollected ? '100%' : isReady ? '75%' : isPrep ? '50%' : '25%'
                            }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className={`absolute top-0 left-3 h-1 rounded-full ${
                              isReady
                                ? 'bg-emerald-500 shadow-sm shadow-emerald-400/50'
                                : isPrep
                                ? 'bg-amber-500 shadow-sm shadow-amber-400/50'
                                : isCollected
                                ? 'bg-slate-600'
                                : 'bg-blue-500'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          <div
                            className={`py-1.5 px-0.5 rounded-xl text-[10px] font-extrabold tracking-tight inline-flex items-center justify-center gap-1 transition-all ${
                              isPlaced || isPrep || isReady || isCollected
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-800/60 text-slate-500'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" strokeWidth={2.5} />
                            <span>Placed</span>
                          </div>
                          <div
                            className={`py-1.5 px-0.5 rounded-xl text-[10px] font-extrabold tracking-tight inline-flex items-center justify-center gap-1 transition-all ${
                              isPrep || isReady || isCollected
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-slate-800/60 text-slate-500'
                            }`}
                          >
                            <ChefHat className="w-2.5 h-2.5" strokeWidth={2.5} />
                            <span>Cooking</span>
                          </div>
                          <div
                            className={`py-1.5 px-0.5 rounded-xl text-[10px] font-extrabold tracking-tight inline-flex items-center justify-center gap-1 transition-all ${
                              isReady || isCollected
                                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                : 'bg-slate-800/60 text-slate-500'
                            }`}
                          >
                            <Bell className="w-2.5 h-2.5" strokeWidth={2.5} />
                            <span>Ready</span>
                          </div>
                          <div
                            className={`py-1.5 px-0.5 rounded-xl text-[10px] font-extrabold tracking-tight inline-flex items-center justify-center gap-1 transition-all ${
                              isCollected
                                ? 'bg-slate-700 text-slate-200 shadow-sm'
                                : 'bg-slate-800/60 text-slate-500'
                            }`}
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={2.5} />
                            <span>Collected</span>
                          </div>
                        </div>
                      </div>

                      {/* Ready Alert Prompt */}
                      {isReady && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>Counter Ready! Collect Token #{order.token}</span>
                          </div>
                          <span className="text-[11px] underline cursor-pointer" onClick={() => openQrModal(order)}>
                            Show QR Pass →
                          </span>
                        </motion.div>
                      )}

                      {/* Order Items */}
                      <div className="mt-3 text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                        {order.order_items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="font-medium text-slate-200">{item.qty}× {item.name}</span>
                            <span className="font-mono text-slate-400 font-semibold">₹{item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action Bar: QR Modal, 1-Tap Reorder, Rate Items */}
                      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                        {/* QR Code Pass button for active orders */}
                        {['placed', 'preparing', 'ready'].includes(order.status) && (
                          <motion.button
                            whileTap={{ scale: 0.94 }}
                            onClick={() => openQrModal(order)}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <QrCode className="h-3.5 w-3.5 text-orange-400" strokeWidth={2} />
                            <span>View QR Pass</span>
                          </motion.button>
                        )}

                        {/* Post-pickup rating unlock */}
                        {isCollected && (
                          <motion.button
                            whileTap={{ scale: 0.94 }}
                            onClick={() => {
                              const firstItem = order.order_items?.[0]
                              setRatingOrder(order)
                              setRatingItemId(firstItem?.item_id || 101)
                            }}
                            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                          >
                            <Star className="h-3.5 w-3.5 fill-amber-400" strokeWidth={2} />
                            <span>Rate Food</span>
                          </motion.button>
                        )}

                        {/* 1-Tap Reorder */}
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => handleReorder(order)}
                          className="px-3.5 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 text-xs font-bold flex items-center gap-1.5 ml-auto transition-all"
                        >
                          <Zap className="h-3.5 w-3.5" strokeWidth={2} />
                          <span>Reorder (1-Tap)</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'wallet' && (
          /* Student Campus Dining Wallet */
          <div className="space-y-4">
            {/* Balance Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 text-white shadow-2xl shadow-orange-950/40"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-orange-100">
                  Campus Dining Wallet
                </span>
                <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full">
                  Pre-paid VIT Card
                </span>
              </div>
              <div className="font-mono font-black text-4xl tracking-tight">
                {formatMoney(walletBalance)}
              </div>
              <p className="text-xs text-orange-100/80 mt-1">Instant 1-tap checkout at all 13 canteens & festival stalls</p>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowTopupModal(true)}
                className="mt-5 px-5 py-2.5 rounded-xl bg-white text-orange-900 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-orange-950/20 transition-all hover:bg-orange-50"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                <span>Top-up Balance</span>
              </motion.button>
            </motion.div>

            {/* Transactions History */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <History className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Wallet Ledger (Passbook)</span>
              </h3>
              <div className="space-y-2">
                {walletTxns.length === 0 ? (
                  <EmptyState
                    icon={Wallet}
                    title="No wallet activity yet"
                    description="Your campus meal credits, online top-ups, and pre-paid deductions will be cataloged here."
                    actionLabel="Add Top-up Credit"
                    onAction={() => setShowTopupModal(true)}
                  />
                ) : (
                  walletTxns.map((t, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white capitalize">{t.kind.replace('_', ' ')}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                      </div>
                      <span className={`font-mono font-extrabold text-sm ${t.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.amount > 0 ? `+₹${t.amount}` : `-₹${Math.abs(t.amount)}`}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FLOATING TRAY BAR MICRO-INTERACTION ── */}
      <AnimatePresence>
        {cartCount > 0 && tab === 'menu' && !showCart && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-16 inset-x-4 max-w-lg mx-auto z-30 pointer-events-auto"
          >
            <div
              onClick={() => setShowCart(true)}
              className="cursor-pointer bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 p-3.5 rounded-2xl shadow-2xl shadow-orange-950/60 flex items-center justify-between text-white border border-white/20 active:scale-98 transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-sm">
                  {cartCount}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider font-extrabold opacity-85">Campus Tray</div>
                  <div className="font-mono font-black text-base leading-tight">
                    {formatMoney(finalPayable)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-xs bg-white text-orange-900 px-3.5 py-2 rounded-xl shadow-sm">
                <span>View Tray</span>
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOTTOM NAVIGATION DOCK (Mobile-First 3 Tabs) ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-4 py-2 flex items-center justify-around shadow-2xl">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setTab('menu')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl text-xs font-bold transition-all ${
            tab === 'menu' ? 'text-orange-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Store className="h-5 w-5" strokeWidth={2} />
          <span>Menu</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setTab('orders')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl text-xs font-bold transition-all relative ${
            tab === 'orders' ? 'text-orange-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-5 w-5" strokeWidth={2} />
          <span>Orders</span>
          {orders.some(o => ['placed', 'preparing', 'ready'].includes(o.status)) && (
            <span className="absolute top-0 right-1/3 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setTab('wallet')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl text-xs font-bold transition-all ${
            tab === 'wallet' ? 'text-orange-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="h-5 w-5" strokeWidth={2} />
          <span>Wallet</span>
        </motion.button>
      </nav>

      {/* ── CART & CHECKOUT SHEET WITH FRAMER MOTION ── */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Slide-in Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-5 shadow-2xl overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-orange-400" strokeWidth={2} />
                  <h3 className="font-extrabold text-base text-white">Your Tray ({cartCount} items)</h3>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowCart(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </motion.button>
              </div>

              {/* Cart Content: Items vs Empty State */}
              {cartItems.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="Your tray is feeling light"
                  description="Explore fresh meals, crunchy rolls, or cooling drinks from campus canteens to fill your tray."
                  actionLabel="Browse Canteen Menus"
                  onAction={() => {
                    setShowCart(false)
                    setTab('menu')
                  }}
                />
              ) : (
                <>
                  {/* Cart Items with Smooth Layout Transition */}
                  <div className="space-y-2.5 mb-4">
                    {cartItems.map(item => (
                      <motion.div
                        key={item.item_id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex-1 pr-3">
                          <div className="font-bold text-sm text-white line-clamp-1">{item.name}</div>
                          <div className="font-mono text-xs text-orange-400 font-semibold">₹{item.price} each</div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => updateQty(item.item_id, item.qty - 1)}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <Minus className="h-3 w-3" strokeWidth={2.5} />
                          </motion.button>
                          <span className="font-mono text-xs font-bold text-white min-w-[14px] text-center">{item.qty}</span>
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => updateQty(item.item_id, item.qty + 1)}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <Plus className="h-3 w-3" strokeWidth={2.5} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Scheduled Pickup Slot Picker */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-indigo-400" strokeWidth={2} />
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
                        const isSelected = selectedSlot?.id === slot.id
                        const isFull = slot.current_orders >= slot.max_orders
                        const timeStr = new Date(slot.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                        return (
                          <motion.button
                            key={slot.id}
                            whileTap={{ scale: isFull ? 1 : 0.98 }}
                            disabled={isFull}
                            onClick={() => setSelectedSlot(isSelected ? null : slot)}
                            className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                              isSelected
                                ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                                : isFull
                                ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" strokeWidth={2} />
                              <span>{timeStr}</span>
                            </div>
                            <span className="text-[10px]">
                              {isFull ? 'Slot Full' : `${slot.max_orders - slot.current_orders} slots left`}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Coupon Promo Box */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 mb-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
                        <input
                          type="text"
                          placeholder="Coupon code (e.g. CAMPUS50)"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={handleApplyCoupon}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                      >
                        Apply
                      </motion.button>
                    </div>
                    {appliedDiscount && (
                      <div className="mt-2 text-[11px] font-bold text-emerald-400 flex items-center justify-between">
                        <span>Promo {appliedDiscount.code} Applied</span>
                        <span>-₹{appliedDiscount.amount}</span>
                      </div>
                    )}
                  </div>

                  {/* Checkout Payment Method Selector */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 mb-4">
                    <div className="text-xs font-bold text-slate-400 mb-2">Select Payment Method</div>
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setCheckoutMethod('wallet')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                          checkoutMethod === 'wallet'
                            ? 'bg-orange-600/15 border-orange-500 text-orange-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <Wallet className="h-4 w-4" strokeWidth={2} />
                        <span>Wallet (₹{walletBalance})</span>
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setCheckoutMethod('gateway')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                          checkoutMethod === 'gateway'
                            ? 'bg-orange-600/15 border-orange-500 text-orange-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <CreditCard className="h-4 w-4" strokeWidth={2} />
                        <span>UPI / Card</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Bill Breakdown */}
                  <div className="space-y-1.5 text-xs text-slate-400 mb-4 px-1">
                    <div className="flex justify-between">
                      <span>Item Subtotal</span>
                      <span className="font-mono text-white">₹{cartSubtotal}</span>
                    </div>
                    {convenienceFee > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Convenience Fees</span>
                        <span className="font-mono text-white">₹{convenienceFee}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Promotional Discount</span>
                        <span className="font-mono">-₹{discountAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white font-extrabold text-sm pt-2 border-t border-slate-800">
                      <span>To Pay</span>
                      <span className="font-mono text-orange-400 text-base">{formatMoney(finalPayable)}</span>
                    </div>
                  </div>

                  {/* Feedback Notice */}
                  {checkoutNotice && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2.5 rounded-xl bg-slate-950 border border-orange-500/40 text-orange-300 text-xs font-bold mb-4 flex items-center justify-between"
                    >
                      <span>{checkoutNotice}</span>
                      <button onClick={() => setCheckoutNotice(null)}><X className="h-3.5 w-3.5" /></button>
                    </motion.div>
                  )}

                  {/* Pay & Place Order Button */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    disabled={isPlacingOrder}
                    onClick={handlePlaceOrder}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-orange-950/50 transition-all disabled:opacity-50"
                  >
                    {isPlacingOrder ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                        <span>Pay {formatMoney(finalPayable)} & Place Order</span>
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TOP-UP WALLET MODAL ── */}
      <AnimatePresence>
        {showTopupModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-orange-400" />
                  <span>Top-up Campus Wallet</span>
                </h3>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowTopupModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="space-y-3">
                <label className="text-xs text-slate-400 font-bold block">Select or Enter Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {['100', '200', '500'].map(amt => (
                    <motion.button
                      key={amt}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setTopupAmount(amt)}
                      className={`py-2 rounded-xl border text-xs font-bold ${
                        topupAmount === amt ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      ₹{amt}
                    </motion.button>
                  ))}
                </div>

                <input
                  type="number"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono font-bold text-lg text-white"
                />

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={isTopupLoading}
                  onClick={handleTopup}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
                >
                  {isTopupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Proceed to Pay ₹{topupAmount}</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TOKEN QR CODE PASS MODAL ── */}
      <AnimatePresence>
        {qrModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl text-center"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Campus Dining Pickup Pass
                </span>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setQrModalOrder(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="p-4 bg-white rounded-2xl inline-block shadow-xl my-2">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Token QR Pass" className="w-48 h-48 mx-auto" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-slate-100">
                    <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                  </div>
                )}
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-400 font-bold uppercase">Your Counter Token</div>
                <div className="font-mono font-black text-3xl text-orange-400 tracking-wider">
                  #{qrModalOrder.token}
                </div>
                <div className="text-xs text-slate-300 font-semibold mt-1">
                  Order #{qrModalOrder.id} · {qrModalOrder.outlets?.name || `Outlet ${qrModalOrder.outlet_id}`}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-4 px-2 leading-relaxed">
                Present this QR code or token number to the kitchen counter staff when status turns Ready.
              </p>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setQrModalOrder(null)}
                className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Close Pass
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── RATE FOOD ITEM MODAL ── */}
      <AnimatePresence>
        {ratingOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="font-extrabold text-base text-white">Rate Your Dining Experience</h3>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setRatingOrder(null)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              <div className="flex justify-center gap-2 py-3">
                {[1, 2, 3, 4, 5].map(star => (
                  <motion.button
                    key={star}
                    whileTap={{ scale: 1.25 }}
                    onClick={() => setRatingStars(star)}
                    className="p-1"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-7 h-7 ${star <= ratingStars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
                      strokeWidth={1.75}
                    />
                  </motion.button>
                ))}
              </div>

              <textarea
                placeholder="How was the taste, packaging, and hotness? (Optional)"
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                className="w-full h-20 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-3"
              />

              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={isSubmittingRating}
                onClick={handleSubmitRating}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-950/40"
              >
                {isSubmittingRating ? 'Recording...' : 'Submit Rating'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const StudentDashboard = UserDashboard
export default UserDashboard
