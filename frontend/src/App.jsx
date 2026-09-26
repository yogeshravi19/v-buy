import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowRight, Banknote, Check, Clock3, CreditCard, LogOut, Package, Plus, Minus,
  QrCode, Search, ShoppingBag, Store, X, ShieldAlert, Sparkles, User, Filter,
  CheckCircle2, RefreshCw, AlertCircle, Award, Coffee, UtensilsCrossed, Repeat,
  Bell, Edit, Save, Lock, UserPlus, LogIn, PieChart, TrendingUp, Leaf, Zap,
  Volume2, Monitor, Download, Users, ChevronDown, ChevronUp, Star, Clock,
  MapPin, BarChart2, FileText, Settings, Moon, Wifi, WifiOff, MessageSquare
} from 'lucide-react'
import './styles.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wahftohnwfoepuszvzrx.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sFtEv2kLNn0vcmFNGzsEYg_Vx2yjHd5'

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR-PROJECT'))
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

const statuses = ['placed', 'preparing', 'ready', 'collected']
const money = v => `₹${Number(v || 0).toLocaleString('en-IN')}`
const headers = token => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

// AB3 time-of-day menu categorization
function getAB3TimeSlot() {
  const h = new Date().getHours()
  if (h >= 6 && h < 11) return 'breakfast'
  if (h >= 11 && h < 15) return 'lunch'
  if (h >= 15 && h < 19) return 'snacks'
  return 'dinner'
}

// Sound alert using Web Audio API (no file needed)
function playNewOrderChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch (e) { /* silent fail if no audio ctx */ }
}

// CSV export helper
function exportOrdersCSV(orders) {
  const rows = [
    ['Order ID', 'Outlet', 'Total', 'Status', 'Token', 'Items', 'Date'],
    ...orders.map(o => [
      o.id,
      o.outlets?.name || o.outlet_id,
      o.total,
      o.status,
      o.token || '',
      (o.order_items || []).map(i => `${i.name}×${i.qty}`).join(' | '),
      new Date(o.created_at).toLocaleString('en-IN')
    ])
  ]
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vbuy-orders-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA  (all 13 outlets + 20 Riviera stalls)
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_OUTLETS = [
  {
    id: 'g1', location: 'Gazebo (Main Canteen)', name: 'Gazebo C1 — Snacks & Fast Food',
    is_event: false, is_open: true,
    menu_items: [
      { id: 101, name: 'Veg Puff', price: 20, is_veg: true, category: 'snacks', available: true },
      { id: 102, name: 'Samosa (2 pcs)', price: 20, is_veg: true, category: 'snacks', available: true },
      { id: 103, name: 'Chicken Cutlet', price: 35, is_veg: false, category: 'snacks', available: true },
      { id: 104, name: 'Paneer Roll', price: 50, is_veg: true, category: 'snacks', available: true },
      { id: 105, name: 'Fresh Lime Juice', price: 30, is_veg: true, category: 'beverages', available: true },
      { id: 106, name: 'Tandoori Roti Combo', price: 70, is_veg: true, category: 'meals', available: true },
    ]
  },
  {
    id: 'g2', location: 'Gazebo (Main Canteen)', name: 'Gazebo C2 — Desserts & Sweets',
    is_event: false, is_open: true,
    menu_items: [
      { id: 201, name: 'Gulab Jamun (2 pcs)', price: 30, is_veg: true, category: 'desserts', available: true },
      { id: 202, name: 'Rasgulla', price: 30, is_veg: true, category: 'desserts', available: true },
      { id: 203, name: 'Fruit Salad + Ice Cream', price: 65, is_veg: true, category: 'desserts', available: true },
      { id: 204, name: 'Watermelon Juice', price: 30, is_veg: true, category: 'beverages', available: true },
      { id: 205, name: 'Pineapple Juice', price: 35, is_veg: true, category: 'beverages', available: true },
    ]
  },
  {
    id: 'g3', location: 'Gazebo (Main Canteen)', name: 'Dakshin Chitra (Gazebo C3)',
    is_event: false, is_open: true,
    menu_items: [
      { id: 301, name: 'Veg Fried Rice', price: 80, is_veg: true, category: 'meals', available: true },
      { id: 302, name: 'Chicken Fried Rice', price: 110, is_veg: false, category: 'meals', available: true },
      { id: 303, name: 'Egg Noodles', price: 90, is_veg: false, category: 'meals', available: true },
      { id: 304, name: 'Chilli Chicken', price: 120, is_veg: false, category: 'starters', available: true },
      { id: 305, name: 'Schezwan Veg Noodles', price: 85, is_veg: true, category: 'meals', available: true },
      { id: 306, name: 'Gobi Manchurian', price: 90, is_veg: true, category: 'starters', available: true },
    ]
  },
  {
    id: 'g4', location: 'Gazebo (Main Canteen)', name: 'Lassi House (Gazebo C4)',
    is_event: false, is_open: true,
    menu_items: [
      { id: 401, name: 'Sweet Lassi', price: 45, is_veg: true, category: 'beverages', available: true },
      { id: 402, name: 'Mango Lassi', price: 55, is_veg: true, category: 'beverages', available: true },
      { id: 403, name: 'Oreo Milkshake', price: 70, is_veg: true, category: 'beverages', available: true },
      { id: 404, name: 'Cold Coffee + Ice Cream', price: 70, is_veg: true, category: 'beverages', available: true },
      { id: 405, name: 'Chocolate Sundae', price: 90, is_veg: true, category: 'desserts', available: true },
    ]
  },
  {
    id: 'n1', location: 'North Square', name: 'Georgia (North Square C1)',
    is_event: false, is_open: true,
    menu_items: [
      { id: 501, name: 'Masala Tea', price: 15, is_veg: true, category: 'beverages', available: true },
      { id: 502, name: 'Filter Coffee', price: 18, is_veg: true, category: 'beverages', available: true },
      { id: 503, name: 'Plain Maggi', price: 35, is_veg: true, category: 'snacks', available: true },
      { id: 504, name: 'Cheese Maggi', price: 50, is_veg: true, category: 'snacks', available: true },
      { id: 505, name: 'Schezwan Maggi', price: 45, is_veg: true, category: 'snacks', available: true },
    ]
  },
  {
    id: 'n2', location: 'North Square', name: 'Alpha Non-Veg (North Square C2)',
    is_event: false, is_open: true,
    menu_items: [
      { id: 601, name: 'Chicken 65', price: 100, is_veg: false, category: 'starters', available: true },
      { id: 602, name: 'Egg Biryani', price: 90, is_veg: false, category: 'meals', available: true },
      { id: 603, name: 'Chicken Biryani', price: 130, is_veg: false, category: 'meals', available: true },
      { id: 604, name: 'Chicken Shawarma Roll', price: 90, is_veg: false, category: 'snacks', available: true },
    ]
  },
  {
    id: 'n3', location: 'North Square', name: "Sri's (North Square C3)",
    is_event: false, is_open: true,
    menu_items: [
      { id: 701, name: 'Paneer Butter Masala + Naan', price: 110, is_veg: true, category: 'meals', available: true },
      { id: 702, name: 'White Sauce Pasta', price: 95, is_veg: true, category: 'meals', available: true },
      { id: 703, name: 'Red Sauce Pasta', price: 90, is_veg: true, category: 'meals', available: true },
      { id: 704, name: 'Chole Bhature', price: 85, is_veg: true, category: 'meals', available: true },
      { id: 705, name: 'Softy Ice Cream Cone', price: 30, is_veg: true, category: 'desserts', available: true },
    ]
  },
  {
    id: 'n4', location: 'North Square', name: 'Juice & Rice Corner (North Square C4)',
    is_event: false, is_open: true,
    menu_items: [
      { id: 801, name: 'Mosambi Juice', price: 35, is_veg: true, category: 'beverages', available: true },
      { id: 802, name: 'Fresh Orange Juice', price: 40, is_veg: true, category: 'beverages', available: true },
      { id: 803, name: 'Curd Rice + Pickle', price: 50, is_veg: true, category: 'meals', available: true },
      { id: 804, name: 'Lemon Rice', price: 50, is_veg: true, category: 'meals', available: true },
    ]
  },
  {
    id: 'ab3', location: 'AB3 Amphitheatre', name: 'AB3 Amphitheatre Kitchen',
    is_event: false, is_open: true,
    menu_items: [
      { id: 901, name: 'Idli (3 pcs) + Vada', price: 45, is_veg: true, category: 'breakfast', available: true },
      { id: 902, name: 'Masala Dosa', price: 55, is_veg: true, category: 'breakfast', available: true },
      { id: 903, name: 'Full South Indian Veg Meal', price: 90, is_veg: true, category: 'lunch', available: true },
      { id: 904, name: 'Veg Chapathi Combo (3 pcs)', price: 55, is_veg: true, category: 'snacks', available: true },
      { id: 905, name: 'Ice Cream Cup', price: 30, is_veg: true, category: 'snacks', available: true },
      { id: 906, name: 'Special Veg Dinner Thali', price: 99, is_veg: true, category: 'dinner', available: true },
    ]
  },
  {
    id: 'ab1', location: 'Academic Blocks', name: 'AB1 Canteen',
    is_event: false, is_open: true,
    menu_items: [
      { id: 1001, name: 'Veg Club Sandwich', price: 40, is_veg: true, category: 'snacks', available: true },
      { id: 1002, name: 'Grilled Cheese Sandwich', price: 55, is_veg: true, category: 'snacks', available: true },
      { id: 1003, name: 'Hot Samosa (2 pcs)', price: 30, is_veg: true, category: 'snacks', available: true },
      { id: 1004, name: 'Masala Tea', price: 15, is_veg: true, category: 'beverages', available: true },
    ]
  },
  {
    id: 'ab2', location: 'Academic Blocks', name: 'AB2 Georgia Canteen',
    is_event: false, is_open: true,
    menu_items: [
      { id: 1101, name: 'Veg Puff', price: 20, is_veg: true, category: 'snacks', available: true },
      { id: 1102, name: 'Egg Puff', price: 25, is_veg: false, category: 'snacks', available: true },
      { id: 1103, name: 'Hot Filter Coffee', price: 18, is_veg: true, category: 'beverages', available: true },
      { id: 1104, name: 'Blueberry Muffin', price: 35, is_veg: true, category: 'snacks', available: true },
    ]
  },
  {
    id: 'av', location: 'Campus Outlets & Stores', name: 'Aavin Centre',
    is_event: false, is_open: true,
    menu_items: [
      { id: 1201, name: 'Flavored Milk (Pista/Badam)', price: 35, is_veg: true, category: 'beverages', available: true },
      { id: 1202, name: 'Chocolate Milkshake', price: 45, is_veg: true, category: 'beverages', available: true },
      { id: 1203, name: 'Mango Lassi Pouch', price: 30, is_veg: true, category: 'beverages', available: true },
      { id: 1204, name: 'Aavin Kulfi Bar', price: 25, is_veg: true, category: 'desserts', available: true },
    ]
  },
  {
    id: 'vm', location: 'Campus Outlets & Stores', name: 'V Mart Provisional Store',
    is_event: false, is_open: true,
    menu_items: [
      { id: 1301, name: 'Unibic Butter Cookies', price: 25, is_veg: true, category: 'store', available: true },
      { id: 1302, name: "Lay's Chips", price: 20, is_veg: true, category: 'store', available: true },
      { id: 1303, name: 'Classmate Notebook (200pg)', price: 60, is_veg: true, category: 'store', available: true },
      { id: 1304, name: '1L Mineral Water', price: 20, is_veg: true, category: 'store', available: true },
    ]
  },
  // 20 Riviera Event Stalls
  { id: 'e1', location: 'Riviera Event Stalls', name: 'Momo Point (Stall 01)', is_event: true, is_open: true, menu_items: [{ id: 1401, name: 'Steamed Veg Momos', price: 60, is_veg: true, category: 'event', available: true }, { id: 1402, name: 'Fried Chicken Momos', price: 80, is_veg: false, category: 'event', available: true }] },
  { id: 'e2', location: 'Riviera Event Stalls', name: 'Pizza Craze (Stall 02)', is_event: true, is_open: true, menu_items: [{ id: 1501, name: 'Margherita Slice', price: 50, is_veg: true, category: 'event', available: true }, { id: 1502, name: 'Loaded Chicken Pizza Slice', price: 75, is_veg: false, category: 'event', available: true }] },
  { id: 'e3', location: 'Riviera Event Stalls', name: 'Chill & Freeze Mocktails (Stall 03)', is_event: true, is_open: true, menu_items: [{ id: 1601, name: 'Watermelon Refresher', price: 30, is_veg: true, category: 'event', available: true }, { id: 1602, name: 'Virgin Mint Mojito', price: 45, is_veg: true, category: 'event', available: true }] },
  { id: 'e4', location: 'Riviera Event Stalls', name: 'Shawarma Hub (Stall 04)', is_event: true, is_open: true, menu_items: [{ id: 1701, name: 'Classic Chicken Shawarma', price: 90, is_veg: false, category: 'event', available: true }, { id: 1702, name: 'Jumbo Cheese Shawarma', price: 110, is_veg: false, category: 'event', available: true }] },
  { id: 'e5', location: 'Riviera Event Stalls', name: 'Waffle World (Stall 05)', is_event: true, is_open: true, menu_items: [{ id: 1801, name: 'Belgian Chocolate Waffle', price: 90, is_veg: true, category: 'event', available: true }] },
  { id: 'e6', location: 'Riviera Event Stalls', name: 'Taco Fiesta (Stall 06)', is_event: true, is_open: true, menu_items: [{ id: 1901, name: 'Crispy Veg Tacos (2)', price: 75, is_veg: true, category: 'event', available: true }] },
  { id: 'e7', location: 'Riviera Event Stalls', name: 'Churros & Ice Cream (Stall 07)', is_event: true, is_open: true, menu_items: [{ id: 2001, name: 'Cinnamon Churros + Dip', price: 70, is_veg: true, category: 'event', available: true }] },
  { id: 'e8', location: 'Riviera Event Stalls', name: 'Biryani Express (Stall 08)', is_event: true, is_open: true, menu_items: [{ id: 2101, name: 'Mini Chicken Biryani', price: 99, is_veg: false, category: 'event', available: true }] },
  { id: 'e9', location: 'Riviera Event Stalls', name: 'Kebab Corner (Stall 09)', is_event: true, is_open: true, menu_items: [{ id: 2201, name: 'Chicken Seekh Kebab', price: 110, is_veg: false, category: 'event', available: true }] },
  { id: 'e10', location: 'Riviera Event Stalls', name: 'Bubble Tea Haven (Stall 10)', is_event: true, is_open: true, menu_items: [{ id: 2301, name: 'Taro Milk Bubble Tea', price: 95, is_veg: true, category: 'event', available: true }] },
  { id: 'e11', location: 'Riviera Event Stalls', name: 'Twister Potato & Spirals (Stall 11)', is_event: true, is_open: true, menu_items: [{ id: 2401, name: 'Peri Peri Potato Spiral', price: 50, is_veg: true, category: 'event', available: true }] },
  { id: 'e12', location: 'Riviera Event Stalls', name: 'Bombay Frankie Station (Stall 12)', is_event: true, is_open: true, menu_items: [{ id: 2501, name: 'Aloo Cheese Frankie', price: 45, is_veg: true, category: 'event', available: true }] },
  { id: 'e13', location: 'Riviera Event Stalls', name: 'Gourmet Burger Joint (Stall 13)', is_event: true, is_open: true, menu_items: [{ id: 2601, name: 'Crispy Chicken Burger', price: 90, is_veg: false, category: 'event', available: true }] },
  { id: 'e14', location: 'Riviera Event Stalls', name: 'Artisan Pasta Point (Stall 14)', is_event: true, is_open: true, menu_items: [{ id: 2701, name: 'Creamy Alfredo Penne', price: 85, is_veg: true, category: 'event', available: true }] },
  { id: 'e15', location: 'Riviera Event Stalls', name: 'Spot Dosa Express (Stall 15)', is_event: true, is_open: true, menu_items: [{ id: 2801, name: 'Cheese Burst Dosa', price: 65, is_veg: true, category: 'event', available: true }] },
  { id: 'e16', location: 'Riviera Event Stalls', name: 'Delhi Chaat Bazaar (Stall 16)', is_event: true, is_open: true, menu_items: [{ id: 2901, name: 'Pani Puri (8 pcs)', price: 35, is_veg: true, category: 'event', available: true }] },
  { id: 'e17', location: 'Riviera Event Stalls', name: 'Dessert Studio (Stall 17)', is_event: true, is_open: true, menu_items: [{ id: 3001, name: 'Sizzling Brownie + Ice Cream', price: 120, is_veg: true, category: 'event', available: true }] },
  { id: 'e18', location: 'Riviera Event Stalls', name: 'Grilled Sandwich Craft (Stall 18)', is_event: true, is_open: true, menu_items: [{ id: 3101, name: 'Paneer Corn Cheese Sandwich', price: 60, is_veg: true, category: 'event', available: true }] },
  { id: 'e19', location: 'Riviera Event Stalls', name: 'Loaded Fries Factory (Stall 19)', is_event: true, is_open: true, menu_items: [{ id: 3201, name: 'Cheesy Loaded Fries', price: 65, is_veg: true, category: 'event', available: true }] },
  { id: 'e20', location: 'Riviera Event Stalls', name: 'Tropical Juice Land (Stall 20)', is_event: true, is_open: true, menu_items: [{ id: 3301, name: 'Fresh Mango Shake', price: 50, is_veg: true, category: 'event', available: true }] },
]

const TEST_USERS = [
  { full_name: 'Rahul Sharma', email: 'rahul.s@vitstudent.ac.in', password: 'password123', role: 'customer', cust_type: 'student', balance: 550 },
  { full_name: 'Dr. Ananth Kumar', email: 'ananth.k@vit.ac.in', password: 'password123', role: 'customer', cust_type: 'faculty', balance: 1400 },
  { full_name: 'Priya V (Event Crew)', email: 'event.priya@vitstudent.ac.in', password: 'password123', role: 'customer', cust_type: 'event_team', balance: 500 },
  { full_name: 'Dakshin Chitra Staff', email: 'staff.dakshin@gazebo.vit.ac.in', password: 'password123', role: 'staff', outlet_id: 'g3', balance: 200 },
  { full_name: 'Georgia Staff', email: 'staff.georgia@northsquare.vit.ac.in', password: 'password123', role: 'staff', outlet_id: 'n1', balance: 200 },
  { full_name: 'Campus Admin', email: 'admin.management@vit.ac.in', password: 'password123', role: 'admin', balance: 10000 },
]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [session, setSession]         = useState(null)
  const [outlets, setOutlets]         = useState(DEMO_OUTLETS)
  const [eventMode, setEventMode]     = useState(false)
  const [orders, setOrders]           = useState([
    {
      id: 2041, user_id: 'usr-1', outlet_id: 'g3',
      outlets: { name: 'Dakshin Chitra (Gazebo C3)', location: 'Gazebo (Main Canteen)' },
      token: '248', status: 'ready', total: 190,
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      order_items: [
        { item_id: 301, name: 'Veg Fried Rice', price: 80, qty: 1, notes: '' },
        { item_id: 302, name: 'Chicken Fried Rice', price: 110, qty: 1, notes: 'extra spicy' },
      ]
    }
  ])
  const [wallet, setWallet] = useState({
    balance: 550,
    transactions: [
      { id: 1, amount: 740, kind: 'Razorpay UPI Topup', ref: 'pay_Nzk3817', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 2, amount: -190, kind: 'Order #2041 — Dakshin Chitra', ref: 'ord_2041', created_at: new Date(Date.now() - 900000).toISOString() },
    ]
  })

  const [cart, setCart]               = useState({ outlet: null, items: [] })
  const [tab, setTab]                 = useState('browse')
  const [locationFilter, setLocationFilter] = useState('All')
  const [query, setQuery]             = useState('')
  const [notice, setNotice]           = useState('')
  const [busy, setBusy]               = useState(false)
  const [vegOnly, setVegOnly]         = useState(false)
  const [priceFilter, setPriceFilter] = useState('All')  // 'All' | 'u50' | 'u100' | 'u200'
  const [isOnline, setIsOnline]       = useState(navigator.onLine)
  const [ab3Slot, setAb3Slot]         = useState(getAB3TimeSlot())
  const prevOrderCountRef             = useRef(0)

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  // Update AB3 time slot every minute
  useEffect(() => {
    const t = setInterval(() => setAb3Slot(getAB3TimeSlot()), 60000)
    return () => clearInterval(t)
  }, [])

  // Supabase Auth
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) loadProfile(nextSession.user.id)
      else setCurrentUser(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    if (!supabase) return
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (p) {
        setCurrentUser(p)
        if (p.role === 'staff' || p.role === 'admin') setTab('ops')
      }
    } catch (e) { console.warn('Profile fetch fallback:', e) }
  }

  // Realtime subscription + new-order sound alert for staff
  useEffect(() => {
    if (!supabase || !session) return
    const channel = supabase.channel('vbuy-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.new?.status === 'ready' && Notification.permission === 'granted') {
          new Notification('V-BUY — Order Ready! 🎉', {
            body: `Order #${payload.new.id} (Token #${payload.new.token}) is ready for pickup!`,
            icon: '/vit-chennai-logo.png'
          })
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session])

  // Staff: chime when new active orders arrive (demo mode)
  const activeOrderCount = orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled').length
  useEffect(() => {
    if (currentUser?.role === 'staff' && activeOrderCount > prevOrderCountRef.current) {
      playNewOrderChime()
    }
    prevOrderCountRef.current = activeOrderCount
  }, [activeOrderCount, currentUser])

  // Notification permission request
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // ── PWA Installation Prompt Handler ───────────────────────────────────────
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIosPrompt, setShowIosPrompt] = useState(false)

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setNotice('🎉 CampusBite App installed successfully!')
      }
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
      if (isIos) {
        setShowIosPrompt(true)
      } else {
        setNotice('📱 To install on Desktop or Mobile: look for the Install icon in your browser address bar, or use browser menu > Install App.')
      }
    }
  }

  // ── Computed visible outlets ──────────────────────────────────────────────
  const visibleOutlets = useMemo(() => {
    return outlets.filter(o => {
      if (eventMode ? !o.is_event : o.is_event) return false
      if (locationFilter !== 'All' && !o.location.includes(locationFilter)) return false
      if (query) {
        const q = query.toLowerCase()
        const nameMatch = o.name.toLowerCase().includes(q)
        const locMatch = o.location.toLowerCase().includes(q)
        const itemMatch = (o.menu_items || []).some(i => i.name.toLowerCase().includes(q))
        if (!nameMatch && !locMatch && !itemMatch) return false
      }
      return true
    })
  }, [outlets, eventMode, locationFilter, query])

  // ── Cart operations ────────────────────────────────────────────────────────
  function addToCart(outlet, item) {
    if (!item.available) return
    if (cart.outlet && cart.outlet.id !== outlet.id) {
      return setNotice(`Cart has items from ${cart.outlet.name}. Clear cart first to order from ${outlet.name}.`)
    }
    const existing = cart.items.find(i => i.id === item.id)
    setCart({
      outlet,
      items: existing
        ? cart.items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
        : [...cart.items, { ...item, qty: 1, notes: '' }]
    })
  }

  function removeFromCart(itemId) {
    const existing = cart.items.find(i => i.id === itemId)
    if (!existing) return
    if (existing.qty === 1) {
      const newItems = cart.items.filter(i => i.id !== itemId)
      setCart({ outlet: newItems.length ? cart.outlet : null, items: newItems })
    } else {
      setCart({ ...cart, items: cart.items.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i) })
    }
  }

  function updateCartItemNotes(itemId, notes) {
    setCart({ ...cart, items: cart.items.map(i => i.id === itemId ? { ...i, notes } : i) })
  }

  function repeatOrder(order) {
    const targetOutlet = outlets.find(o => o.id === order.outlet_id) || {
      id: order.outlet_id, name: order.outlets?.name || 'Campus Outlet', location: 'VIT Campus'
    }
    setCart({
      outlet: targetOutlet,
      items: (order.order_items || []).map(i => ({ id: i.item_id, name: i.name, price: i.price, qty: i.qty, available: true, notes: '' }))
    })
    setTab('browse')
    setNotice(`♻️ Loaded ${order.order_items.length} items from Order #${order.id} into cart!`)
  }

  async function placeOrder() {
    if (!cart.items.length) return
    const total = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0)
    if (wallet.balance < total) {
      return setNotice(`Insufficient balance (${money(wallet.balance)}). Top up ${money(total - wallet.balance)} to continue.`)
    }
    setBusy(true)
    const newId = Math.floor(2000 + Math.random() * 8000)
    const token = Math.floor(100 + Math.random() * 900).toString()
    setTimeout(() => {
      const newOrder = {
        id: newId, user_id: currentUser?.id || 'usr-1',
        outlet_id: cart.outlet.id,
        outlets: { name: cart.outlet.name, location: cart.outlet.location },
        token, status: 'placed', total,
        created_at: new Date().toISOString(),
        order_items: cart.items.map(i => ({ item_id: i.id, name: i.name, price: i.price, qty: i.qty, notes: i.notes || '' }))
      }
      setOrders(prev => [newOrder, ...prev])
      setWallet(w => ({
        balance: w.balance - total,
        transactions: [
          { id: Date.now(), amount: -total, kind: `Order #${newId} — ${cart.outlet.name}`, ref: `ord_${newId}`, created_at: new Date().toISOString() },
          ...w.transactions
        ]
      }))
      setCart({ outlet: null, items: [] })
      setBusy(false)
      setTab('orders')
      setNotice(`🎉 Order #${newId} placed! Pickup Token: #${token}`)
    }, 700)
  }

  async function topUp(amount) {
    setBusy(true)
    if (window.Razorpay) {
      try {
        const rzp = new window.Razorpay({
          key: 'rzp_test_demo_key',
          amount: amount * 100,
          currency: 'INR',
          name: 'VIT Chennai V-BUY',
          description: 'Campus Wallet Top-Up',
          handler: () => creditWalletBalance(amount),
          modal: { ondismiss: () => creditWalletBalance(amount) }
        })
        rzp.open()
        setBusy(false)
        return
      } catch (err) { console.warn('Razorpay fallback', err) }
    }
    creditWalletBalance(amount)
  }

  function creditWalletBalance(amount) {
    const ref = `pay_rzp_${Math.random().toString(36).substr(2, 8)}`
    setWallet(w => ({
      balance: w.balance + amount,
      transactions: [
        { id: Date.now(), amount, kind: 'Razorpay UPI Topup', ref, created_at: new Date().toISOString() },
        ...w.transactions
      ]
    }))
    setBusy(false)
    setNotice(`✅ Added ${money(amount)} to wallet! New balance: ${money(wallet.balance + amount)}`)
  }

  function toggleItemAvailability(outletId, itemId) {
    setOutlets(outs => outs.map(o => o.id !== outletId ? o : {
      ...o, menu_items: (o.menu_items || []).map(i => i.id === itemId ? { ...i, available: !i.available } : i)
    }))
  }

  function toggleOutletOpen(outletId) {
    setOutlets(outs => outs.map(o => o.id === outletId ? { ...o, is_open: !o.is_open } : o))
  }

  function advanceOrderStatus(orderId) {
    setOrders(ords => ords.map(o => {
      if (o.id !== orderId) return o
      const idx = statuses.indexOf(o.status)
      return idx < statuses.length - 1 ? { ...o, status: statuses[idx + 1] } : o
    }))
  }

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
    setCurrentUser(null)
    setSession(null)
    setTab('browse')
  }

  if (!currentUser) return <AuthScreen onLoginUser={setCurrentUser} />

  const role      = currentUser.role || 'customer'
  const isCustomer = role === 'customer'
  const isStaff   = role === 'staff'
  const isAdmin   = role === 'admin'

  return (
    <div className="app-shell">
      {/* iOS PWA Install Guide Modal */}
      {showIosPrompt && (
        <div className="ios-modal-overlay" onClick={() => setShowIosPrompt(false)}>
          <div className="ios-modal-card" onClick={e => e.stopPropagation()}>
            <div className="ios-modal-header">
              <h3>📱 Install CampusBite on iOS</h3>
              <button className="close-btn" onClick={() => setShowIosPrompt(false)}><X size={18} /></button>
            </div>
            <div className="ios-modal-steps">
              <div className="ios-step">
                <span className="ios-step-num">1</span>
                <p>Tap the <strong>Share</strong> button (📤) at the bottom of Safari.</p>
              </div>
              <div className="ios-step">
                <span className="ios-step-num">2</span>
                <p>Scroll down and select <strong>"Add to Home Screen"</strong> (➕).</p>
              </div>
              <div className="ios-step">
                <span className="ios-step-num">3</span>
                <p>Tap <strong>"Add"</strong> in the top right. CampusBite will launch full-screen as a native app!</p>
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }} onClick={() => setShowIosPrompt(false)}>
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="topbar">
        <a href="#" className="brand-wrapper" onClick={e => { e.preventDefault(); if (isCustomer) setTab('browse') }}>
          <img src="/vit-chennai-logo.png" alt="VIT Chennai" className="vit-logo-img" />
          <span className="brand-title">Campus<span>Bite</span></span>
        </a>
        <div className="top-actions">
          {!isOnline && (
            <span className="offline-badge"><WifiOff size={13} /> Offline</span>
          )}
          <button className="install-app-btn" onClick={handleInstallClick} title="Install CampusBite as Mobile or Desktop App">
            <Download size={13} />
            <span>Install App</span>
          </button>
          <span className="role-tag-badge">{currentUser.cust_type || currentUser.role}</span>
          {isCustomer && (
            <div className="wallet-badge-top" onClick={() => setTab('wallet')}>
              <Banknote size={16} />
              <span>{money(wallet.balance)}</span>
            </div>
          )}
          <button className="icon-button" onClick={handleSignOut} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Event Mode Banner */}
      {eventMode && (
        <div className="event-banner">
          <span className="event-banner-tag">RIVIERA EVENT MODE</span>
          <span>Event Stalls are LIVE! 20+ stalls accepting orders now.</span>
        </div>
      )}

      <main className="content">
        {/* Hero */}
        <section className="hero-card">
          <div>
            <p className="eyebrow">VIT CHENNAI CAMPUS · {currentUser.full_name}</p>
            <h1>
              {isCustomer && <><span style={{color:'#60A5FA'}}>What's your next order,</span><br /><em>{currentUser.full_name.split(' ')[0]}?</em></>}
              {isStaff    && <>Kitchen Operations Console<br /><em>Outlet: {currentUser.outlet_id || 'Gazebo Counter'}</em></>}
              {isAdmin    && <>Campus Management &<br /><em>Analytics Dashboard</em></>}
            </h1>
          </div>
          <div className="hero-stats">
            {isCustomer && (
              <>
                <div className="stat-pill">
                  <strong>{visibleOutlets.filter(o => o.is_open).length}</strong>
                  <small>{eventMode ? 'Stalls Open' : 'Outlets Open'}</small>
                </div>
                <div className="stat-pill">
                  <strong>{money(wallet.balance)}</strong>
                  <small>Wallet</small>
                </div>
                <div className="stat-pill">
                  <strong>{orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled').length}</strong>
                  <small>Active Orders</small>
                </div>
              </>
            )}
            {isStaff && (
              <>
                <div className="stat-pill">
                  <strong>{orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled').length}</strong>
                  <small>Queue</small>
                </div>
                <div className="stat-pill">
                  <strong>{orders.filter(o => o.status === 'ready').length}</strong>
                  <small>Ready</small>
                </div>
              </>
            )}
            {isAdmin && (
              <>
                <div className="stat-pill">
                  <strong>{money(orders.reduce((s, o) => s + o.total, 0))}</strong>
                  <small>Revenue</small>
                </div>
                <div className="stat-pill">
                  <strong>{orders.length}</strong>
                  <small>Total Orders</small>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Nav tabs (customer) */}
        {isCustomer && (
          <nav className="nav-tabs">
            <button className={tab === 'browse' ? 'active' : ''} onClick={() => setTab('browse')}>
              <Store size={18} /> Browse
            </button>
            <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
              <Package size={18} /> My Orders
              {orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled').length > 0 && (
                <span className="nav-badge">{orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled').length}</span>
              )}
            </button>
            <button className={tab === 'wallet' ? 'active' : ''} onClick={() => setTab('wallet')}>
              <CreditCard size={18} /> Wallet
            </button>
          </nav>
        )}

        {/* Notice toast */}
        {notice && (
          <div className="notice-toast">
            <span>{notice}</span>
            <button onClick={() => setNotice('')}><X size={16} /></button>
          </div>
        )}

        {/* ── BROWSE TAB ── */}
        {isCustomer && tab === 'browse' && (
          <BrowseTab
            outlets={outlets}
            visibleOutlets={visibleOutlets}
            eventMode={eventMode}
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
            query={query}
            setQuery={setQuery}
            vegOnly={vegOnly}
            setVegOnly={setVegOnly}
            priceFilter={priceFilter}
            setPriceFilter={setPriceFilter}
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            ab3Slot={ab3Slot}
          />
        )}

        {/* ── ORDERS TAB ── */}
        {isCustomer && tab === 'orders' && (
          <OrdersView orders={orders} repeatOrder={repeatOrder} />
        )}

        {/* ── WALLET TAB ── */}
        {isCustomer && tab === 'wallet' && (
          <WalletView wallet={wallet} topUp={topUp} busy={busy} currentUser={currentUser} />
        )}

        {/* ── STAFF / ADMIN CONSOLES ── */}
        {(isStaff || isAdmin) && (
          <StaffAdminConsole
            profile={currentUser}
            orders={orders}
            outlets={outlets}
            eventMode={eventMode}
            setEventMode={setEventMode}
            advanceOrderStatus={advanceOrderStatus}
            toggleItemAvailability={toggleItemAvailability}
            toggleOutletOpen={toggleOutletOpen}
            setOrders={setOrders}
            wallet={wallet}
            setWallet={setWallet}
            setNotice={setNotice}
          />
        )}
      </main>

      {/* Cart dock */}
      {isCustomer && cart.items.length > 0 && (
        <CartDock cart={cart} wallet={wallet} busy={busy} placeOrder={placeOrder}
          addToCart={addToCart} removeFromCart={removeFromCart} updateCartItemNotes={updateCartItemNotes}
          setCart={setCart} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BROWSE TAB (with veg filter, price filter, AB3 time slot)
// ─────────────────────────────────────────────────────────────────────────────
function BrowseTab({ outlets, visibleOutlets, eventMode, locationFilter, setLocationFilter,
  query, setQuery, vegOnly, setVegOnly, priceFilter, setPriceFilter, cart, addToCart, removeFromCart, ab3Slot }) {

  const LOCATIONS = ['All', 'Gazebo', 'North Square', 'AB3 Amphitheatre', 'Academic Blocks', 'Campus Outlets & Stores']
  const PRICE_OPTS = [{ label: 'All Prices', val: 'All' }, { label: 'Under ₹50', val: 'u50' }, { label: 'Under ₹100', val: 'u100' }, { label: 'Under ₹200', val: 'u200' }]

  // Apply local item-level filters to each outlet
  const filteredOutlets = useMemo(() => visibleOutlets.map(o => {
    let items = o.menu_items || []
    // AB3 time-of-day filter
    if (o.id === 'ab3') {
      const timeItems = items.filter(i => i.category === ab3Slot)
      if (timeItems.length > 0) items = timeItems
    }
    if (vegOnly) items = items.filter(i => i.is_veg !== false)
    if (priceFilter === 'u50')  items = items.filter(i => i.price < 50)
    if (priceFilter === 'u100') items = items.filter(i => i.price < 100)
    if (priceFilter === 'u200') items = items.filter(i => i.price < 200)
    return { ...o, menu_items: items }
  }).filter(o => o.menu_items.length > 0), [visibleOutlets, vegOnly, priceFilter, ab3Slot])

  return (
    <>
      <div className="controls-bar">
        <div className="search-box">
          <Search size={20} color="var(--text-muted)" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search outlets, items (e.g. Dosa, Maggi, Biryani)..." />
          {query && <X size={18} style={{ cursor: 'pointer' }} onClick={() => setQuery('')} />}
        </div>

        {/* Location filter pills */}
        <div className="filter-pills">
          {LOCATIONS.map(loc => (
            <button key={loc} className={`filter-pill ${locationFilter === loc ? 'active' : ''}`}
              onClick={() => setLocationFilter(loc)}>{loc}</button>
          ))}
        </div>

        {/* Advanced filter row */}
        <div className="filter-row-advanced">
          {/* Veg Only toggle */}
          <button
            className={`filter-toggle-btn ${vegOnly ? 'active-veg' : ''}`}
            onClick={() => setVegOnly(v => !v)}
          >
            <Leaf size={15} />
            Veg Only
          </button>

          {/* Price filters */}
          {PRICE_OPTS.map(p => (
            <button key={p.val}
              className={`filter-pill ${priceFilter === p.val ? 'active' : ''}`}
              onClick={() => setPriceFilter(p.val)}
            >{p.label}</button>
          ))}
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>{eventMode ? 'Riviera Event Stalls' : 'Campus Canteens & Outlets'}</h2>
          {!eventMode && outlets.find(o => o.id === 'ab3') && (
            <p className="ab3-slot-tag">
              <Clock size={13} /> AB3 showing: <strong>{ab3Slot}</strong> menu
            </p>
          )}
        </div>
        <span>{filteredOutlets.length} {filteredOutlets.length === 1 ? 'counter' : 'counters'}</span>
      </div>

      {!filteredOutlets.length ? (
        <div className="empty-state">
          <UtensilsCrossed size={36} />
          <h3>No outlets match your filters</h3>
          <p>Try removing the veg filter or adjusting the price range.</p>
        </div>
      ) : (
        <div className="outlet-grid">
          {filteredOutlets.map(outlet => (
            <OutletCard
              key={outlet.id}
              outlet={outlet}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              cart={cart}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CANTEEN METADATA & THEMES (Rich visualization per canteen system)
// ─────────────────────────────────────────────────────────────────────────────
function getCanteenMeta(outlet) {
  const id = outlet.id || ''
  const name = outlet.name || ''

  if (id === 'g1' || name.includes('Gazebo C1')) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #B45309 100%)',
      accentColor: '#F59E0B',
      emoji: '🍔',
      tagline: 'Hot Snacks, Rolls & Combos',
      rating: 4.8,
      reviews: 342,
      tags: ['Snacks', 'Rolls', 'Combos'],
      wait: '4-6 min',
      badge: 'Bestseller'
    }
  }
  if (id === 'g2' || name.includes('Gazebo C2') || name.includes('Dessert')) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #BE185D 100%)',
      accentColor: '#F472B6',
      emoji: '🍦',
      tagline: 'Desserts, Sweets & Juices',
      rating: 4.9,
      reviews: 218,
      tags: ['Sweets', 'Fresh Juices', 'Ice Cream'],
      wait: '3-5 min',
      badge: 'Top Rated'
    }
  }
  if (id === 'g3' || name.includes('Dakshin Chitra') || name.includes('C3')) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #C2410C 100%)',
      accentColor: '#FB923C',
      emoji: '🍲',
      tagline: 'Fried Rice, Noodles & Starters',
      rating: 4.7,
      reviews: 489,
      tags: ['South Indian', 'Chinese', 'Noodles'],
      wait: '7-10 min',
      badge: 'Crowd Favorite'
    }
  }
  if (id === 'g4' || name.includes('Lassi House') || name.includes('C4')) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #0369A1 100%)',
      accentColor: '#38BDF8',
      emoji: '🥤',
      tagline: 'Cold Shakes, Lassi & Sundaes',
      rating: 4.9,
      reviews: 312,
      tags: ['Thick Shakes', 'Sweet Lassi', 'Cold Coffee'],
      wait: '3-5 min',
      badge: 'Refreshing'
    }
  }
  if (id === 'n1' || name.includes('Georgia')) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #854D0E 100%)',
      accentColor: '#FBBF24',
      emoji: '☕',
      tagline: 'Chai, Coffee & Hot Maggi',
      rating: 4.8,
      reviews: 640,
      tags: ['Filter Coffee', 'Masala Tea', 'Maggi'],
      wait: '3-6 min',
      badge: 'Student Hangout'
    }
  }
  if (id === 'n2' || name.includes('Alpha')) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #B91C1C 100%)',
      accentColor: '#F87171',
      emoji: '🍗',
      tagline: 'Dum Biryani, Shawarma & 65',
      rating: 4.7,
      reviews: 531,
      tags: ['Biryani', 'Shawarma', 'Chicken 65'],
      wait: '6-9 min',
      badge: 'Spicy Non-Veg'
    }
  }
  if (id === 'n3' || name.includes("Sri's") || name.includes('Sris')) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #047857 100%)',
      accentColor: '#34D399',
      emoji: '🍛',
      tagline: 'North Indian Combos & Pastas',
      rating: 4.6,
      reviews: 395,
      tags: ['Paneer Naan', 'Pastas', 'Chole Bhature'],
      wait: '8-12 min',
      badge: 'Hearty Meals'
    }
  }
  if (id === 'n4' || name.includes('Juice & Rice')) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #4D7C0F 100%)',
      accentColor: '#A3E635',
      emoji: '🍹',
      tagline: 'Fresh Citrus Juices & Meal Bowls',
      rating: 4.7,
      reviews: 184,
      tags: ['Fresh Juices', 'Rice Bowls', 'Healthy'],
      wait: '3-5 min',
      badge: 'Fresh & Healthy'
    }
  }
  if (id === 'ab3' || name.includes('AB3')) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #4338CA 100%)',
      accentColor: '#A5B4FC',
      emoji: '🎪',
      tagline: 'Amphitheatre All-Day Food Bar',
      rating: 4.8,
      reviews: 420,
      tags: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
      wait: '5-7 min',
      badge: 'Rotating Menu'
    }
  }
  if (outlet.is_event) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #BE123C 100%)',
      accentColor: '#FB7185',
      emoji: '✨',
      tagline: 'Riviera Fest 2026 Special Stall',
      rating: 4.9,
      reviews: 95,
      tags: ['Riviera Fest', 'Street Food', 'Special'],
      wait: '4-7 min',
      badge: 'Fest Exclusive'
    }
  }
  return {
    gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 55%, #1E40AF 100%)',
    accentColor: '#60A5FA',
    emoji: '🍽️',
    tagline: 'VIT Campus Canteen Counter',
    rating: 4.6,
    reviews: 140,
    tags: ['Campus Special', 'Fresh Food'],
    wait: '5-8 min',
    badge: 'Popular'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTLET CARD — REDESIGNED WITH DYNAMIC CANTEEN SYSTEM VISUALIZATION
// ─────────────────────────────────────────────────────────────────────────────
function OutletCard({ outlet, addToCart, removeFromCart, cart }) {
  const [expanded, setExpanded] = useState(true)
  const meta = useMemo(() => getCanteenMeta(outlet), [outlet])

  // Items from this outlet in customer's cart
  const outletCartItems = (cart?.outlet?.id === outlet.id ? cart.items : [])
  const itemsInCartCount = outletCartItems.reduce((s, i) => s + i.qty, 0)
  const itemsInCartTotal = outletCartItems.reduce((s, i) => s + (i.price * i.qty), 0)

  return (
    <article className="outlet-card" style={{ '--canteen-accent': meta.accentColor }}>
      {/* ── Canteen Visual Banner ── */}
      <div className="outlet-card-banner" style={{ background: meta.gradient }}>
        <div className="outlet-banner-top-row">
          <span className="outlet-location-chip">
            <MapPin size={11} /> {outlet.location}
          </span>
          <span className={`status-beacon ${outlet.is_open ? 'open' : 'closed'}`}>
            <span className="beacon-dot" />
            {outlet.is_open ? 'OPEN NOW' : 'CLOSED'}
          </span>
        </div>

        <div className="outlet-banner-main-row">
          <div className="canteen-avatar-circle">
            <span>{meta.emoji}</span>
          </div>
          <div className="canteen-title-block">
            <div className="canteen-name-row">
              <h3>{outlet.name}</h3>
              {meta.badge && <span className="canteen-badge-pill">{meta.badge}</span>}
            </div>
            <p className="canteen-tagline">{meta.tagline}</p>
          </div>
        </div>

        {/* Banner Quick Stats Bar */}
        <div className="canteen-stats-ribbon">
          <div className="canteen-stat-item">
            <Star size={12} fill="#FBBF24" color="#FBBF24" />
            <strong>{meta.rating}</strong>
            <small>({meta.reviews})</small>
          </div>
          <div className="canteen-stat-divider" />
          <div className="canteen-stat-item">
            <Clock size={12} />
            <span>{meta.wait}</span>
          </div>
          <div className="canteen-stat-divider" />
          <div className="canteen-stat-item">
            <UtensilsCrossed size={12} />
            <span>{(outlet.menu_items || []).length} items</span>
          </div>
        </div>
      </div>

      {/* ── Card Body / Quick Tag Ribbon ── */}
      <div className="outlet-card-body">
        <div className="cuisine-tags">
          {(meta.tags || []).map((t, idx) => (
            <span key={idx} className="cuisine-tag">{t}</span>
          ))}
        </div>

        {/* In-cart banner highlight if customer has selected items from this outlet */}
        {itemsInCartCount > 0 && (
          <div className="canteen-cart-highlight">
            <ShoppingBag size={14} />
            <span><strong>{itemsInCartCount}</strong> {itemsInCartCount === 1 ? 'item' : 'items'} in cart ({money(itemsInCartTotal)})</span>
          </div>
        )}
      </div>

      {/* ── Transition Box Toggle Row ── */}
      <div className="outlet-toggle-row" onClick={() => setExpanded(e => !e)}>
        <span className="outlet-toggle-label">
          <UtensilsCrossed size={13} />
          {expanded ? 'Hide Menu' : `View Menu (${(outlet.menu_items || []).length} items)`}
        </span>
        <div className={`collapse-chevron ${expanded ? 'open' : ''}`}>
          <ChevronDown size={17} />
        </div>
      </div>

      {/* ── Animated Menu Transition Box ── */}
      {expanded && (
        <div className="menu-list">
          {(outlet.menu_items || []).map(item => {
            const inCart = outletCartItems.find(i => i.id === item.id)
            return (
              <div className="menu-row" key={item.id}>
                <div className="item-info">
                  <span
                    className={item.is_veg !== false ? 'veg-icon' : 'nonveg-icon'}
                    title={item.is_veg !== false ? 'Vegetarian' : 'Non-Vegetarian'}
                  />
                  <div className="item-details">
                    <strong>{item.name}</strong>
                    <div className="item-sub-meta">
                      <span className="item-cat-pill">{item.category}</span>
                      {item.available === false && (
                        <span className="sold-out-pill">Sold Out</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="menu-action">
                  <span className="item-price">{money(item.price)}</span>
                  {item.available === false || !outlet.is_open ? (
                    <span className="unavailable-btn">Closed</span>
                  ) : inCart ? (
                    <div className="item-stepper">
                      <button onClick={() => removeFromCart(item.id)} title="Decrease quantity">
                        <Minus size={13} />
                      </button>
                      <span>{inCart.qty}</span>
                      <button onClick={() => addToCart(outlet, item)} title="Increase quantity">
                        <Plus size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="add-btn-pill"
                      onClick={() => addToCart(outlet, item)}
                    >
                      <Plus size={14} /> Add
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CART DOCK (expanded with notes)
// ─────────────────────────────────────────────────────────────────────────────
function CartDock({ cart, wallet, busy, placeOrder, addToCart, removeFromCart, updateCartItemNotes, setCart }) {
  const [expanded, setExpanded] = useState(false)
  const total = cart.items.reduce((s, i) => s + i.price * i.qty, 0)
  const qty   = cart.items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className={`cart-dock ${expanded ? 'cart-dock-expanded' : ''}`}>
      {expanded && (
        <div className="cart-expanded-body">
          <div className="cart-expanded-header">
            <span><strong>{cart.outlet?.name}</strong></span>
            <button className="cart-clear-btn" onClick={() => { setCart({ outlet: null, items: [] }); setExpanded(false) }}>
              Clear Cart
            </button>
          </div>
          {cart.items.map(item => (
            <div className="cart-item-row" key={item.id}>
              <div className="cart-item-left">
                <div className="cart-qty-control">
                  <button onClick={() => removeFromCart(item.id)}><Minus size={13} /></button>
                  <span>{item.qty}</span>
                  <button onClick={() => addToCart(cart.outlet, item)}><Plus size={13} /></button>
                </div>
                <div>
                  <span className="cart-item-name">{item.name}</span>
                  <input
                    className="cart-notes-input"
                    placeholder="Add note (e.g. less spicy)..."
                    value={item.notes || ''}
                    onChange={e => updateCartItemNotes(item.id, e.target.value)}
                  />
                </div>
              </div>
              <span className="cart-item-price">{money(item.price * item.qty)}</span>
            </div>
          ))}
          {wallet.balance < total && (
            <p className="cart-balance-warn">
              <AlertCircle size={14} /> Balance {money(wallet.balance)} — need {money(total - wallet.balance)} more
            </p>
          )}
        </div>
      )}

      <div className="cart-dock-bar">
        <button className="cart-expand-btn" onClick={() => setExpanded(e => !e)}>
          <strong>{qty} Items</strong>
          <small>{cart.outlet?.name}</small>
        </button>
        <div className="cart-dock-total">{money(total)}</div>
        <button className="btn-primary" onClick={placeOrder} disabled={busy || wallet.balance < total}>
          {busy ? 'Placing...' : 'Place Order'} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function OrdersView({ orders, repeatOrder }) {
  const active   = orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled')
  const past     = orders.filter(o => o.status === 'collected' || o.status === 'cancelled')

  return (
    <section>
      {active.length > 0 && (
        <>
          <div className="section-heading"><div><h2>Active Orders</h2></div><span>{active.length} in progress</span></div>
          {active.map(order => <OrderCard key={order.id} order={order} repeatOrder={repeatOrder} />)}
        </>
      )}

      <div className="section-heading"><div><h2>Past Orders</h2></div><span>{past.length} completed</span></div>
      {!past.length && !active.length ? (
        <div className="empty-state">
          <ShoppingBag size={36} />
          <h3>No orders yet</h3>
          <p>Browse Gazebo, North Square, AB3 or Event Stalls to place your first order!</p>
        </div>
      ) : (
        past.map(order => <OrderCard key={order.id} order={order} repeatOrder={repeatOrder} />)
      )}
    </section>
  )
}

function OrderCard({ order, repeatOrder }) {
  const stepIndex = statuses.indexOf(order.status)
  const isReady   = order.status === 'ready'
  const isCancelled = order.status === 'cancelled'

  return (
    <article className={`order-card ${isCancelled ? 'order-cancelled' : ''}`}>
      <div className="order-head">
        <div>
          <span className="location-tag">ORDER #{order.id} · {order.outlets?.name || order.outlet_id}</span>
          <h3>{money(order.total)}</h3>
          <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            {new Date(order.created_at).toLocaleString('en-IN')}
          </small>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className={`status-badge ${order.status}`}>{order.status}</span>
          {!isCancelled && (
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => repeatOrder(order)}>
              <Repeat size={14} /> Repeat
            </button>
          )}
        </div>
      </div>

      {!isCancelled && (
        <div className="timeline">
          {statuses.slice(0, 4).map((st, i) => (
            <div key={st} className={`timeline-step ${i <= stepIndex ? 'done' : ''}`}>
              <div className="timeline-dot" />
              <span className="timeline-label">{st}</span>
            </div>
          ))}
        </div>
      )}

      <div className="order-items-list">
        {(order.order_items || []).map((item, idx) => (
          <div key={idx} className="item-chip-wrap">
            <span className="item-chip">{item.name} × {item.qty}</span>
            {item.notes && <span className="item-notes-chip">📝 {item.notes}</span>}
          </div>
        ))}
      </div>

      {isReady && (
        <div className="pickup-box">
          <div>
            <h4>READY FOR PICKUP! 🎉</h4>
            <p style={{ color: '#047857', fontSize: '13px' }}>Show token or QR at the counter.</p>
            <div className="token-badge">TOKEN #{order.token}</div>
          </div>
          <div className="qr-container">
            <SvgQrCode value={`CB1.${order.id}.${order.token}`} size={90} />
            <small style={{ marginTop: '4px', fontWeight: '700', fontSize: '10px', color: '#475569' }}>Scan at Counter</small>
          </div>
        </div>
      )}
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WALLET VIEW
// ─────────────────────────────────────────────────────────────────────────────
function WalletView({ wallet, topUp, busy, currentUser }) {
  const income  = wallet.transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const spent   = wallet.transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)

  return (
    <section>
      <div className="wallet-card">
        <p className="eyebrow"><Banknote size={14} /> CAMPUS PREPAID WALLET · {currentUser.full_name}</p>
        <h2>{money(wallet.balance)}</h2>

        <div className="wallet-meta-row">
          <div className="wallet-meta-stat">
            <TrendingUp size={14} color="#34D399" />
            <span style={{ color: '#34D399' }}>Topped up: {money(income)}</span>
          </div>
          <div className="wallet-meta-stat">
            <ShoppingBag size={14} color="#94A3B8" />
            <span style={{ color: '#94A3B8' }}>Spent: {money(Math.abs(spent))}</span>
          </div>
        </div>

        <p style={{ marginBottom: '14px', color: '#94A3B8', fontSize: '13px' }}>Instant UPI / Card / Netbanking top-up:</p>
        <div className="topup-grid">
          {[100, 200, 500, 1000, 2000].map(amt => (
            <button className="topup-btn" key={amt} onClick={() => topUp(amt)} disabled={busy}>
              <Plus size={16} /> {money(amt)}
            </button>
          ))}
        </div>
      </div>

      <div className="section-heading">
        <div><h2>Transaction Ledger</h2></div>
        <span>{wallet.transactions.length} transactions</span>
      </div>

      <div className="transaction-list">
        {(wallet.transactions || []).map(tx => {
          const isPos = tx.amount > 0
          return (
            <div className="transaction-row" key={tx.id}>
              <div className={`txn-icon ${isPos ? 'txn-in' : 'txn-out'}`}>
                {isPos ? <TrendingUp size={16} /> : <ShoppingBag size={16} />}
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '14px' }}>{tx.kind}</strong>
                <small style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>
                  {new Date(tx.created_at || Date.now()).toLocaleString('en-IN')} · {tx.ref}
                </small>
              </div>
              <div className="txn-amount" style={{ color: isPos ? '#059669' : 'var(--text-main)' }}>
                {isPos ? '+' : ''}{money(tx.amount)}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF & ADMIN CONSOLES
// ─────────────────────────────────────────────────────────────────────────────
function StaffAdminConsole({ profile, orders, outlets, eventMode, setEventMode,
  advanceOrderStatus, toggleItemAvailability, toggleOutletOpen, setOrders, wallet, setWallet, setNotice }) {

  const [scanInput, setScanInput]         = useState('')
  const [creditUserEmail, setCreditUserEmail] = useState('event.priya@vitstudent.ac.in')
  const [creditAmount, setCreditAmount]   = useState('500')
  const [tvMode, setTvMode]               = useState(false)
  const [staffTab, setStaffTab]           = useState('queue') // 'queue' | 'menu' | 'summary' | 'tv'

  const isStaff = profile.role === 'staff'
  const isAdmin = profile.role === 'admin'
  const myOutlet = outlets.find(o => o.id === profile.outlet_id) || outlets[0]

  // Staff: only their outlet's active orders, sorted oldest-first
  const myOrders = (isAdmin ? orders : orders.filter(o => o.outlet_id === myOutlet?.id))
    .filter(o => o.status !== 'collected' && o.status !== 'cancelled')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0)
  const readyCount = myOrders.filter(o => o.status === 'ready').length

  // TV mode: full-screen ready tokens display
  if (tvMode) {
    return (
      <div className="tv-screen">
        <div className="tv-header">
          <img src="/vit-chennai-logo.png" alt="VIT" style={{ height: 56 }} />
          <h1>NOW SERVING</h1>
          <button onClick={() => setTvMode(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 0, color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
            Exit TV Mode
          </button>
        </div>
        <div className="tv-tokens">
          {myOrders.filter(o => o.status === 'ready').map(o => (
            <div key={o.id} className="tv-token-card">
              <div className="tv-token-num">#{o.token}</div>
              <div className="tv-token-outlet">{o.outlets?.name || o.outlet_id}</div>
            </div>
          ))}
          {myOrders.filter(o => o.status === 'ready').length === 0 && (
            <div className="tv-empty">No orders ready yet</div>
          )}
        </div>
        <div className="tv-preparing">
          <h3>PREPARING</h3>
          <div className="tv-prep-tokens">
            {myOrders.filter(o => o.status === 'preparing').map(o => (
              <span key={o.id} className="tv-prep-token">#{o.token}</span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function handleScanSubmit(e) {
    e.preventDefault()
    if (!scanInput.trim()) return
    const match = orders.find(o =>
      o.token === scanInput.trim() ||
      scanInput.includes(o.token) ||
      scanInput.includes(o.id.toString())
    )
    if (!match) return setNotice(`❌ Invalid QR or token "${scanInput}"`)
    if (match.status === 'collected') return setNotice(`⚠️ Order #${match.id} was ALREADY collected!`)
    setOrders(ords => ords.map(o => o.id === match.id ? { ...o, status: 'collected' } : o))
    setScanInput('')
    setNotice(`✅ Order #${match.id} (Token #${match.token}) — marked COLLECTED!`)
  }

  function handleAdminCredit(e) {
    e.preventDefault()
    const amt = parseInt(creditAmount, 10)
    if (!amt) return
    setNotice(`✅ Transferred ${money(amt)} event allowance to ${creditUserEmail}`)
  }

  // Per-outlet revenue breakdown (admin)
  const outletRevenues = outlets.filter(o => !o.is_event).map(o => {
    const outletOrders = orders.filter(ord => ord.outlet_id === o.id)
    return {
      outlet: o,
      count: outletOrders.length,
      revenue: outletOrders.reduce((s, ord) => s + ord.total, 0),
    }
  }).sort((a, b) => b.revenue - a.revenue)

  return (
    <section>
      {/* Staff console tabs */}
      {isStaff && (
        <nav className="nav-tabs" style={{ marginBottom: '24px' }}>
          {[
            { key: 'queue', label: 'Live Queue', icon: <Clock3 size={16} /> },
            { key: 'menu', label: 'Menu Control', icon: <Edit size={16} /> },
            { key: 'summary', label: 'Daily Summary', icon: <BarChart2 size={16} /> },
            { key: 'tv', label: 'TV Screen', icon: <Monitor size={16} /> },
          ].map(t => (
            <button key={t.key}
              className={staffTab === t.key ? 'active' : ''}
              onClick={() => t.key === 'tv' ? setTvMode(true) : setStaffTab(t.key)}
            >
              {t.icon} {t.label}
              {t.key === 'queue' && readyCount > 0 && <span className="nav-badge">{readyCount}</span>}
            </button>
          ))}
        </nav>
      )}

      {/* ── STAFF QUEUE TAB ── */}
      {(isStaff && staffTab === 'queue' || isAdmin) && (
        <>
          {/* QR / Token scanner */}
          <div className="admin-card">
            <h3><QrCode size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Scan QR or Enter Token to Collect</h3>
            <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
              <input
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                placeholder="Scan QR string or type 3-digit token (e.g. 248)..."
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 0, fontFamily: 'var(--font-body)' }}
              />
              <button type="submit" className="btn-primary">Verify & Collect</button>
            </form>
          </div>

          {/* Queue summary bar */}
          <div className="queue-summary-bar">
            <div className="queue-stat"><span className="qs-num">{myOrders.filter(o => o.status === 'placed').length}</span><span>Placed</span></div>
            <div className="queue-stat"><span className="qs-num qs-prep">{myOrders.filter(o => o.status === 'preparing').length}</span><span>Preparing</span></div>
            <div className="queue-stat"><span className="qs-num qs-ready">{myOrders.filter(o => o.status === 'ready').length}</span><span>Ready</span></div>
            <button className="tv-btn" onClick={() => setTvMode(true)}><Monitor size={15} /> Counter TV</button>
          </div>

          {/* Active order KOT cards */}
          <h3 style={{ fontSize: '20px', margin: '20px 0 14px', fontFamily: 'var(--font-heading)' }}>
            Kitchen Order Tickets (oldest first)
          </h3>
          {!myOrders.length ? (
            <div className="empty-state"><CheckCircle2 size={36} /><h3>All clear!</h3><p>No active orders in queue.</p></div>
          ) : (
            myOrders.map(order => (
              <div className={`kot-card kot-${order.status}`} key={order.id}>
                <div className="kot-header">
                  <div>
                    <strong className="kot-token">TOKEN #{order.token}</strong>
                    <span className="kot-orderid">Order #{order.id}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 8 }}>
                      <Clock size={11} /> {Math.round((Date.now() - new Date(order.created_at)) / 60000)} min ago
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 800 }}>{money(order.total)}</span>
                    <span className={`status-badge ${order.status}`}>{order.status}</span>
                  </div>
                </div>
                <div className="kot-items">
                  {(order.order_items || []).map((item, idx) => (
                    <div key={idx} className="kot-item-row">
                      <span className="kot-qty">{item.qty}×</span>
                      <span className="kot-item-name">{item.name}</span>
                      {item.notes && <span className="kot-notes">📝 {item.notes}</span>}
                    </div>
                  ))}
                </div>
                {order.status !== 'ready' && (
                  <button className="btn-primary" style={{ marginTop: '14px' }}
                    onClick={() => advanceOrderStatus(order.id)}>
                    Mark as {order.status === 'placed' ? '🔥 Preparing' : '✅ Ready'}
                  </button>
                )}
                {order.status === 'ready' && (
                  <div className="kot-ready-label">✅ READY — waiting for pickup</div>
                )}
              </div>
            ))
          )}
        </>
      )}

      {/* ── STAFF MENU TAB ── */}
      {isStaff && staffTab === 'menu' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3>{myOutlet.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Toggle item availability and counter status</p>
            </div>
            <button
              className={`btn-primary ${!myOutlet.is_open ? '' : ''}`}
              style={{ background: myOutlet.is_open ? '#059669' : '#DC2626' }}
              onClick={() => toggleOutletOpen(myOutlet.id)}
            >
              {myOutlet.is_open ? '🟢 Counter Open' : '🔴 Counter Closed'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {(myOutlet.menu_items || []).map(item => (
              <div key={item.id} style={{ padding: '12px 16px', background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className={item.is_veg !== false ? 'veg-icon' : 'nonveg-icon'} />
                  <strong style={{ fontSize: '13px', marginLeft: 8 }}>{item.name}</strong>
                  <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>{money(item.price)}</small>
                </div>
                <button
                  className={`toggle-avail-btn ${item.available !== false ? 'avail-in' : 'avail-out'}`}
                  onClick={() => toggleItemAvailability(myOutlet.id, item.id)}
                >
                  {item.available !== false ? '✅ In Stock' : '❌ Sold Out'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STAFF DAILY SUMMARY TAB ── */}
      {isStaff && staffTab === 'summary' && (
        <div className="admin-card">
          <h3><BarChart2 size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Today's Summary — {myOutlet.name}</h3>
          <div className="sales-grid" style={{ marginTop: '20px' }}>
            <div className="sales-stat-box">
              <h4>Revenue Today</h4>
              <p>{money(todayRevenue)}</p>
            </div>
            <div className="sales-stat-box">
              <h4>Orders Today</h4>
              <p>{todayOrders.length}</p>
            </div>
            <div className="sales-stat-box">
              <h4>Active Queue</h4>
              <p>{myOrders.length}</p>
            </div>
            <div className="sales-stat-box">
              <h4>Avg Order Value</h4>
              <p>{todayOrders.length ? money(Math.round(todayRevenue / todayOrders.length)) : '—'}</p>
            </div>
          </div>

          <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '15px' }}>Top Items Ordered Today</h4>
          {(() => {
            const freq = {}
            todayOrders.forEach(o => (o.order_items || []).forEach(i => {
              freq[i.name] = (freq[i.name] || 0) + i.qty
            }))
            return Object.entries(freq)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([name, count]) => (
                <div key={name} className="top-item-row">
                  <span>{name}</span>
                  <div className="top-item-bar-wrap">
                    <div className="top-item-bar" style={{ width: `${Math.min(100, (count / Math.max(...Object.values(freq))) * 100)}%` }} />
                  </div>
                  <span className="top-item-count">{count}× sold</span>
                </div>
              ))
          })()}
        </div>
      )}

      {/* ── ADMIN CONSOLE ── */}
      {isAdmin && (
        <>
          {/* Event Mode */}
          <div className="admin-card">
            <h3><Zap size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Riviera Event Mode Control</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
              Enabling Event Mode closes all 13 campus canteens and activates 20+ Riviera stalls.
            </p>
            <button
              className="btn-primary"
              style={{ background: eventMode ? '#DC2626' : '#059669' }}
              onClick={() => {
                setEventMode(m => !m)
                setNotice(eventMode ? '📣 Regular canteens OPEN — Event Mode off.' : '🎪 Riviera Event Mode ACTIVE! 20 stalls open.')
              }}
            >
              {eventMode ? '🔴 Disable Event Mode' : '🟢 Activate Riviera Event Mode'}
            </button>
          </div>

          {/* Per-outlet revenue breakdown */}
          <div className="admin-card">
            <h3><BarChart2 size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Revenue by Outlet</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {outletRevenues.filter(r => r.count > 0 || r.revenue > 0).map(({ outlet, count, revenue }) => {
                const maxRev = Math.max(...outletRevenues.map(r => r.revenue), 1)
                return (
                  <div key={outlet.id} className="outlet-revenue-row">
                    <div className="outlet-rev-name">{outlet.name}</div>
                    <div className="outlet-rev-bar-wrap">
                      <div className="outlet-rev-bar" style={{ width: `${(revenue / maxRev) * 100}%` }} />
                    </div>
                    <div className="outlet-rev-stats">{count} orders · {money(revenue)}</div>
                  </div>
                )
              })}
              {outletRevenues.every(r => r.count === 0) && (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No orders placed yet. Place demo orders to see revenue data.</p>
              )}
            </div>
          </div>

          {/* Admin credit event team wallet */}
          <div className="admin-card">
            <h3><Users size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Event Team Wallet Credit Tool</h3>
            <form onSubmit={handleAdminCredit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
              <input
                type="email" value={creditUserEmail}
                onChange={e => setCreditUserEmail(e.target.value)}
                placeholder="Student/Event Crew Email"
                style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 0 }}
              />
              <input
                type="number" value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)}
                placeholder="Amount (₹)"
                style={{ width: '120px', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 0 }}
              />
              <button type="submit" className="btn-primary">Transfer Allowance</button>
            </form>
          </div>

          {/* Overall analytics */}
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3><PieChart size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Campus Analytics Overview</h3>
              <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => exportOrdersCSV(orders)}>
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="sales-grid" style={{ marginTop: '20px' }}>
              <div className="sales-stat-box">
                <h4>Total Revenue</h4>
                <p>{money(orders.reduce((s, o) => s + o.total, 0))}</p>
              </div>
              <div className="sales-stat-box">
                <h4>Total Orders</h4>
                <p>{orders.length}</p>
              </div>
              <div className="sales-stat-box">
                <h4>Active Orders</h4>
                <p>{orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled').length}</p>
              </div>
              <div className="sales-stat-box">
                <h4>Event Mode</h4>
                <p style={{ color: eventMode ? '#059669' : '#DC2626' }}>{eventMode ? 'ACTIVE' : 'OFF'}</p>
              </div>
              <div className="sales-stat-box">
                <h4>Avg Order Value</h4>
                <p>{orders.length ? money(Math.round(orders.reduce((s, o) => s + o.total, 0) / orders.length)) : '—'}</p>
              </div>
              <div className="sales-stat-box">
                <h4>Outlets Open</h4>
                <p>{outlets.filter(o => !o.is_event && o.is_open).length} / {outlets.filter(o => !o.is_event).length}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({ onLoginUser }) {
  const [isSignUp, setIsSignUp]   = useState(false)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [fullName, setFullName]   = useState('')
  const [role, setRole]           = useState('customer')
  const [custType, setCustType]   = useState('student')
  const [error, setError]         = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (supabase) {
      if (isSignUp) {
        const { data, error: authErr } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, role, cust_type: custType } }
        })
        if (authErr) return setError(authErr.message)
        onLoginUser({ id: data.user.id, full_name: fullName, email, role, cust_type: custType, balance: 500 })
      } else {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
        if (authErr) {
          const matched = TEST_USERS.find(u => u.email === email && u.password === password)
          if (matched) return onLoginUser(matched)
          return setError(authErr.message)
        }
        onLoginUser({ id: data.user.id, email, full_name: email.split('@')[0], role: 'customer', cust_type: 'student', balance: 500 })
      }
    } else {
      const matched = TEST_USERS.find(u => u.email === email)
      if (matched) onLoginUser(matched)
      else onLoginUser({ id: 'usr-new', full_name: fullName || email.split('@')[0], email, role, cust_type: custType, balance: 500 })
    }
  }

  return (
    <div className="login-container">
      <div className="login-art">
        <div className="login-art-top">
          <img src="/vit-chennai-logo.png" alt="VIT Chennai" className="vit-logo-img" />
          <span style={{ fontSize: '26px', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>V-BUY</span>
        </div>
        <div>
          <h1>Unified Food<br />Ordering, Prepaid<br /><span>Wallet & Riviera</span></h1>
          <p style={{ marginTop: '16px', color: '#94A3B8', fontSize: '15px', lineHeight: 1.6 }}>
            Skip the queue. Order ahead. Pay smart.
            <br />VIT Chennai Campus — CampusBite System.
          </p>
        </div>
        <small style={{ color: '#64748B' }}>© 2026 VIT Chennai · V-BUY Campus System</small>
      </div>

      <div className="login-form-wrapper">
        <div className="login-card-inner">
          <h2>{isSignUp ? 'Create Campus Account' : 'Sign in to V-BUY'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            {isSignUp ? 'Register with your college email' : 'Use your VIT credentials to access wallet & orders'}
          </p>

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="form-group">
                <label>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Rahul Sharma" required />
              </div>
            )}
            <div className="form-group">
              <label>College Email ID</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@vitstudent.ac.in" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {isSignUp && (
              <>
                <div className="form-group">
                  <label>Account Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)}>
                    <option value="customer">Student / Faculty / Outsider</option>
                    <option value="staff">Kitchen Staff / Shop Manager</option>
                    <option value="admin">Campus Management Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Customer Type</label>
                  <select value={custType} onChange={e => setCustType(e.target.value)}>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="outsider">Outsider / Guest</option>
                    <option value="event_team">Riviera Event Team</option>
                  </select>
                </div>
              </>
            )}
            {error && <p style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px' }}>{error}</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
              {isSignUp ? 'Create Account' : 'Sign In'} <ArrowRight size={16} />
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '14px', color: 'var(--text-muted)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <a href="#" style={{ color: 'var(--blue-primary)', fontWeight: '700' }}
              onClick={e => { e.preventDefault(); setIsSignUp(s => !s) }}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </a>
          </p>

          <div className="quick-test-box">
            <p>Quick Login — Test Profiles</p>
            <div className="quick-chip-grid">
              {TEST_USERS.map((u, i) => (
                <button key={i} className="quick-chip" onClick={() => onLoginUser(u)}>
                  {u.full_name.split(' ')[0]} <span style={{ opacity: 0.7 }}>({u.role})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG QR CODE (HMAC-seeded deterministic pattern)
// ─────────────────────────────────────────────────────────────────────────────
function SvgQrCode({ value, size = 90 }) {
  const matrixSize = 21
  const cells = []
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash << 5) - hash + value.charCodeAt(i)
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const isTopLeft    = r < 7 && c < 7
      const isTopRight   = r < 7 && c >= matrixSize - 7
      const isBottomLeft = r >= matrixSize - 7 && c < 7
      if (isTopLeft || isTopRight || isBottomLeft) {
        const localR = isBottomLeft ? r - (matrixSize - 7) : r
        const localC = isTopRight  ? c - (matrixSize - 7) : c
        const isBorder = localR === 0 || localR === 6 || localC === 0 || localC === 6
        const isCenter = localR >= 2 && localR <= 4 && localC >= 2 && localC <= 4
        if (isBorder || isCenter) cells.push({ r, c })
      } else {
        if (Math.sin(hash + r * 13 + c * 7) > 0.1) cells.push({ r, c })
      }
    }
  }
  const cs = size / matrixSize
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="#FFFFFF" />
      {cells.map((cell, idx) => (
        <rect key={idx} x={cell.c * cs} y={cell.r * cs} width={cs + 0.3} height={cs + 0.3} fill="#0F172A" />
      ))}
    </svg>
  )
}

export default App