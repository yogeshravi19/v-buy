import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowRight, Banknote, Check, Clock3, CreditCard, LogOut, Package, Plus, Minus,
  QrCode, Search, ShoppingBag, Store, X, ShieldAlert, Sparkles, User, Filter,
  CheckCircle2, RefreshCw, AlertCircle, Award, Coffee, UtensilsCrossed, Repeat,
  Bell, Edit, Save, Lock, UserPlus, LogIn, PieChart, TrendingUp, Leaf, Zap,
  Volume2, VolumeX, Monitor, Download, Users, ChevronDown, ChevronUp, Star, Clock,
  MapPin, BarChart2, FileText, Settings, Moon, Wifi, WifiOff, MessageSquare, Maximize2, Receipt, Trash2,
  ChefHat, Tag, Printer, Sandwich, Soup, GlassWater, Cake, Utensils, Flame, Shield, ChevronRight, Headphones, Home
} from 'lucide-react'
import { VegIndicator } from './components/VegIndicator'
import './styles.css'
import { getFoodImage } from './lib/foodImages'
import QRCode from 'qrcode'
import StaffDashboard from './pages/staff/StaffDashboard'
import UserDashboard from './pages/user/UserDashboard'
import ShopDashboard from './pages/shop/ShopDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import ShopStaffDashboard from './pages/staff/ShopStaffDashboard'
import ShopAdminDashboard from './pages/shop/ShopAdminDashboard'
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard'
import VFoodsUserDashboard from './components/VFoodsUserDashboard'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wahftohnwfoepuszvzrx.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sFtEv2kLNn0vcmFNGzsEYg_Vx2yjHd5'

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR-PROJECT'))
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

const statuses = ['placed', 'preparing', 'ready', 'collected']
const money = v => `₹${Number(Number(v || 0).toFixed(2)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
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
  a.download = `vfoods-orders-${new Date().toISOString().split('T')[0]}.csv`
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

]

export const CANTEEN_STAFF_OWNER_MAP = [
  { id: 'g1',  name: 'Gazebo C1 — Snacks & Fast Food', location: 'Gazebo (Main Canteen)', staffPhone: '9876541001', ownerPhone: '9876542001', staffEmail: 'staff.g1@vfood.vit.ac.in', ownerEmail: 'owner.g1@vfood.vit.ac.in', staffId: 'd96f9dab-bc74-42fc-8a6d-8ebf66493fcb', ownerId: '8d6db64d-a863-4cf6-b3d2-f994c93e608c' },
  { id: 'g2',  name: 'Gazebo C2 — Desserts & Sweets', location: 'Gazebo (Main Canteen)', staffPhone: '9876541002', ownerPhone: '9876542002', staffEmail: 'staff.g2@vfood.vit.ac.in', ownerEmail: 'owner.g2@vfood.vit.ac.in', staffId: 'c029e58a-44f1-ac1b-8039ee9e1448', ownerId: 'bba8a8f7-43c0-4f96-9a9e-06e2dd42eac5' },
  { id: 'g3',  name: 'Dakshin Chitra (Gazebo C3)', location: 'Gazebo (Main Canteen)', staffPhone: '9876541003', ownerPhone: '9876542003', staffEmail: 'staff.g3@vfood.vit.ac.in', ownerEmail: 'owner.g3@vfood.vit.ac.in', staffId: 'b14a9e0c-2480-4950-bd40-a69254ef44b4', ownerId: '373b76d1-32d4-4189-a51b-c46fa5714e27' },
  { id: 'g4',  name: 'Lassi House (Gazebo C4)', location: 'Gazebo (Main Canteen)', staffPhone: '9876541004', ownerPhone: '9876542004', staffEmail: 'staff.g4@vfood.vit.ac.in', ownerEmail: 'owner.g4@vfood.vit.ac.in', staffId: '7a415480-2ea8-4b9b-977e-d59d0a98c28d', ownerId: '13f65525-3627-41a6-9aa5-4a7ce5609a8a' },
  { id: 'n1',  name: 'Georgia (North Square C1)', location: 'North Square', staffPhone: '9876541005', ownerPhone: '9876542005', staffEmail: 'staff.n1@vfood.vit.ac.in', ownerEmail: 'owner.n1@vfood.vit.ac.in', staffId: 'eb111346-c24a-462c-ba7f-dfa8b3452c82', ownerId: '0c32a788-80af-434b-bd34-c0d15c026561' },
  { id: 'n2',  name: 'Alpha Non-Veg (North Square C2)', location: 'North Square', staffPhone: '9876541006', ownerPhone: '9876542006', staffEmail: 'staff.n2@vfood.vit.ac.in', ownerEmail: 'owner.n2@vfood.vit.ac.in', staffId: 'd04cef55-b8b9-4b3e-a34e-08c682ad8702', ownerId: '44197aa2-2d27-4cb7-9541-751baba83872' },
  { id: 'n3',  name: "Sri's (North Square C3)", location: 'North Square', staffPhone: '9876541007', ownerPhone: '9876542007', staffEmail: 'staff.n3@vfood.vit.ac.in', ownerEmail: 'owner.n3@vfood.vit.ac.in', staffId: '7f3caebf-161a-4f78-90fb-6e0971ce48e3', ownerId: '126bf63c-9594-4f6c-91cd-41e42bcd44a7' },
  { id: 'n4',  name: 'Juice & Rice Corner (North Square C4)', location: 'North Square', staffPhone: '9876541008', ownerPhone: '9876542008', staffEmail: 'staff.n4@vfood.vit.ac.in', ownerEmail: 'owner.n4@vfood.vit.ac.in', staffId: 'cd50aa66-45a2-44fe-8975-e95435145e10', ownerId: 'd3090bcb-1e86-4ec5-b7d7-36eef04324dc' },
  { id: 'ab3', name: 'AB3 Amphitheatre Kitchen', location: 'AB3 Amphitheatre', staffPhone: '9876541009', ownerPhone: '9876542009', staffEmail: 'staff.ab3@vfood.vit.ac.in', ownerEmail: 'owner.ab3@vfood.vit.ac.in', staffId: '1a93e26f-0b74-45cb-996c-3c3b6d779127', ownerId: 'd6f7440f-afe9-4388-a005-a7e670d794e5' },
  { id: 'ab1', name: 'AB1 Canteen', location: 'Academic Blocks', staffPhone: '9876541010', ownerPhone: '9876542010', staffEmail: 'staff.ab1@vfood.vit.ac.in', ownerEmail: 'owner.ab1@vfood.vit.ac.in', staffId: 'cb5ea0b3-de99-48b4-860e-24a2bd61d68e', ownerId: 'fbe945bd-7409-477b-8087-71227f028db2' },
  { id: 'ab2', name: 'AB2 Georgia Canteen', location: 'Academic Blocks', staffPhone: '9876541011', ownerPhone: '9876542011', staffEmail: 'staff.ab2@vfood.vit.ac.in', ownerEmail: 'owner.ab2@vfood.vit.ac.in', staffId: 'abe97dd7-d51f-434c-ac9a-f334d9c49c73', ownerId: '1d6854e5-0e24-4e79-87c3-f2a4a69c1e95' },
  { id: 'av',  name: 'Aavin Centre', location: 'Campus Outlets & Stores', staffPhone: '9876541012', ownerPhone: '9876542012', staffEmail: 'staff.av@vfood.vit.ac.in', ownerEmail: 'owner.av@vfood.vit.ac.in', staffId: '614971d3-173f-4c0a-8500-bb8832588bee', ownerId: '1ccd71aa-6207-4f1d-8c9a-09bc1de332db' },
  { id: 'vm',  name: 'V Mart Provisional Store', location: 'Campus Outlets & Stores', staffPhone: '9876541013', ownerPhone: '9876542013', staffEmail: 'staff.vm@vfood.vit.ac.in', ownerEmail: 'owner.vm@vfood.vit.ac.in', staffId: '0565cf51-3748-4ee0-a833-56eb671ea54a', ownerId: '9be32dfa-7962-4cab-a22b-e84d083b7802' },
]

export const MIND_CATEGORIES = [
  { id: 'all',       label: 'All Items',             Icon: Sparkles },
  { id: 'snacks',    label: 'Snacks & Rolls',        Icon: Sandwich },
  { id: 'biryani',   label: 'Biryani & Meals',       Icon: UtensilsCrossed },
  { id: 'noodles',   label: 'Noodles & Pasta',       Icon: Soup },
  { id: 'juices',    label: 'Fresh Juices & Lassi',  Icon: GlassWater },
  { id: 'beverages', label: 'Chai & Coffee',         Icon: Coffee },
  { id: 'desserts',  label: 'Sweets & Desserts',     Icon: Cake },
  { id: 'breakfast', label: 'South Indian & Dosa',   Icon: Utensils },
  { id: 'starters',  label: 'Crispy Starters',       Icon: Flame },
]

export function matchesMindCategory(item, catId) {
  if (!catId || catId === 'all') return true
  const name = (item.name || '').toLowerCase()
  const cat = (item.category || '').toLowerCase()

  switch (catId) {
    case 'snacks':
      return cat === 'snacks' || /(roll|puff|samosa|cutlet|sandwich|maggi|muffin|chips|cookies|snack)/i.test(name)
    case 'biryani':
      return ['meals', 'lunch', 'dinner'].includes(cat) || /(biryani|meal|thali|rice|combo|paneer butter|chole|naan)/i.test(name)
    case 'noodles':
      return /(noodle|pasta|schezwan|fried rice|manchurian)/i.test(name)
    case 'juices':
      return /(juice|lassi|shake|milkshake|lime|orange|watermelon|pineapple|mosambi)/i.test(name)
    case 'beverages':
      return cat === 'beverages' || /(tea|chai|coffee|milk)/i.test(name)
    case 'desserts':
      return cat === 'desserts' || /(ice cream|sundae|jamun|rasgulla|kulfi|dessert)/i.test(name)
    case 'breakfast':
      return cat === 'breakfast' || /(dosa|idli|vada)/i.test(name)
    case 'starters':
      return cat === 'starters' || /(65|chilli|chicken 65|starter|manchurian)/i.test(name)
    default:
      return true
  }
}

const TEST_USERS = [
  { id: 'a6d778ae-5174-4bbf-8e68-00ef619a1ced', full_name: 'Rahul Sharma', phone: '9876543210', email: 'user.test@gmail.com', password: 'Password@123', role: 'user', balance: 2500 },
  { id: 'c9d6fc7a-019d-48c6-ae85-ad63fa2b06df', full_name: 'Super Admin (Me)', phone: '9876543200', email: 'admin@vfood.vit.ac.in', password: 'Password@123', role: 'super_admin', is_superadmin: true, balance: 0 },
  ...CANTEEN_STAFF_OWNER_MAP.flatMap(c => [
    {
      id: c.staffId,
      full_name: `Staff — ${c.name}`,
      phone: c.staffPhone,
      email: c.staffEmail,
      password: 'Password@123',
      role: 'staff',
      outlet_id: c.id,
      outlet_name: c.name,
      balance: 0
    },
    {
      id: c.ownerId,
      full_name: `Owner — ${c.name}`,
      phone: c.ownerPhone,
      email: c.ownerEmail,
      password: 'Password@123',
      role: 'shop_admin',
      outlet_id: c.id,
      outlet_name: c.name,
      balance: 0
    }
  ])
]


// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [session, setSession]         = useState(null)
  const [outlets, setOutlets]         = useState(DEMO_OUTLETS)
  const [eventMode, setEventMode]     = useState(false)
  const [orders, setOrders]           = useState([])
  const [wallet, setWallet]           = useState({
    balance: 0,
    transactions: []
  })

  // Sync wallet balance whenever active user changes
  useEffect(() => {
    if (currentUser) {
      setWallet({
        balance: Number(currentUser.balance || 0),
        transactions: []
      })
    }
  }, [currentUser])

  // Live Audit Log System Telemetry (Starts clean and records live user interactions)
  const [auditLogs, setAuditLogs] = useState([])

  const addAuditLog = useCallback((actor, role, category, action, details) => {
    setAuditLogs(prev => [
      {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        actor: actor || 'User',
        role: role || 'user',
        category,
        action,
        details,
        status: 'SUCCESS'
      },
      ...prev
    ])
  }, [])

  // Item Ratings (Starts clean for live rating submissions)
  const [itemRatings, setItemRatings] = useState([])

  const getItemRatingStats = useCallback((itemId) => {
    const matching = itemRatings.filter(r => r.item_id === itemId)
    if (!matching.length) {
      // Deterministic baseline so every campus dish displays realistic rating
      const base = 4.4 + ((itemId % 6) * 0.1)
      return { avg: Number(base.toFixed(1)), count: 18 + (itemId % 25) }
    }
    const sum = matching.reduce((s, r) => s + r.rating, 0)
    return {
      avg: Number((sum / matching.length).toFixed(1)),
      count: matching.length
    }
  }, [itemRatings])

  async function submitItemRating(orderId, itemId, rating, comment) {
    const order = orders.find(o => o.id === orderId)
    if (!order || order.status !== 'collected') {
      setNotice('Ratings can only be submitted for completed/collected orders.')
      return false
    }

    const cleanRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 5))
    const newRating = {
      id: Date.now(),
      order_id: orderId,
      item_id: itemId,
      user_id: currentUser?.id || 'usr-student',
      rating: cleanRating,
      comment: comment || '',
      created_at: new Date().toISOString()
    }

    setItemRatings(prev => [newRating, ...prev])

    if (supabase) {
      try {
        await supabase.from('item_ratings').insert({
          order_id: orderId,
          item_id: itemId,
          user_id: currentUser?.id,
          rating: cleanRating,
          comment: comment || ''
        })
      } catch (err) {
        console.warn('item_ratings sync error:', err)
      }
    }

    addAuditLog(currentUser?.full_name || 'User', currentUser?.role || 'student', 'ORDER', 'ITEM_RATED', `Rated item #${itemId} (${cleanRating} stars) on Order #${orderId}`)
    setNotice(`Thank you! Your ${cleanRating}-star rating was recorded.`)
    return true
  }

  const [cart, setCart]               = useState({ outlet: null, items: [] })
  const [tab, setTab]                 = useState('browse')
  const [locationFilter, setLocationFilter] = useState('All')
  const [walletPrefill, setWalletPrefill] = useState(null)
  const [query, setQuery]             = useState('')
  const [notice, setNotice]           = useState('')
  const [busy, setBusy]               = useState(false)
  const [vegOnly, setVegOnly]         = useState(false)
  const [priceFilter, setPriceFilter] = useState('All')  // 'All' | 'u50' | 'u100' | 'u200'
  const [isOnline, setIsOnline]       = useState(navigator.onLine)
  const [ab3Slot, setAb3Slot]         = useState(getAB3TimeSlot())
  const prevOrderCountRef             = useRef(0)

  // ── Feature 5: Group Ordering ──
  const [activeGroup, setActiveGroup] = useState(null)
  const [showGroupModal, setShowGroupModal] = useState(false)

  // ── Feature 7: Scheduled Pickup Slots ──
  const [pickupSlots, setPickupSlots] = useState([
    { id: 'slot-1', outlet_id: 'g1', time_label: '12:45 PM - 01:00 PM', max_orders: 15, current_orders: 6 },
    { id: 'slot-2', outlet_id: 'g1', time_label: '01:00 PM - 01:15 PM', max_orders: 15, current_orders: 15 }, // FULL
    { id: 'slot-3', outlet_id: 'g1', time_label: '01:15 PM - 01:30 PM', max_orders: 15, current_orders: 4 },
    { id: 'slot-4', outlet_id: 'g1', time_label: '01:30 PM - 01:45 PM', max_orders: 15, current_orders: 2 },
    { id: 'slot-5', outlet_id: 'g1', time_label: '01:45 PM - 02:00 PM', max_orders: 15, current_orders: 0 },
    { id: 'slot-6', outlet_id: 'g1', time_label: '05:00 PM - 05:15 PM', max_orders: 15, current_orders: 1 },
    { id: 'slot-7', outlet_id: 'g1', time_label: '05:15 PM - 05:30 PM', max_orders: 15, current_orders: 3 }
  ])
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [isScheduled, setIsScheduled] = useState(false)

  // ── Feature 8: Coupons & Promo Codes ──
  const [availableCoupons, setAvailableCoupons] = useState([
    { code: 'CAMPUS50', discount_type: 'flat', discount_value: 50, min_order_value: 120, max_uses: 500, used_count: 142, description: '₹50 Flat OFF on orders above ₹120' },
    { code: 'VBIT15', discount_type: 'percent', discount_value: 15, min_order_value: 80, max_uses: 1000, used_count: 310, description: '15% OFF on orders above ₹80' },
    { code: 'VFOODS30', discount_type: 'flat', discount_value: 30, min_order_value: 60, max_uses: 300, used_count: 88, description: 'Campus Special: ₹30 Flat OFF' }
  ])
  const [appliedCoupon, setAppliedCoupon] = useState(null)

  function startGroupCart() {
    const code = 'VFOODS-' + Math.floor(10 + Math.random() * 90)
    setActiveGroup({
      id: 'grp-' + Date.now(),
      code,
      creatorName: currentUser?.full_name || 'Rahul Sharma',
      members: [currentUser?.full_name ? `${currentUser.full_name} (Host)` : 'You (Host)'],
      items: []
    })
    setShowGroupModal(false)
    setNotice(`Group Cart #${code} created! Share this join code with your friends.`)
    addAuditLog(currentUser?.full_name || 'Rahul Sharma', currentUser?.role || 'student', 'ORDER', 'GROUP_CREATED', `Created group cart #${code}`)
  }

  function joinGroupCart(code) {
    if (!code || !code.trim()) return
    setActiveGroup({
      id: 'grp-joined',
      code: code.trim().toUpperCase(),
      creatorName: 'Friend',
      members: ['Host', `${currentUser?.full_name || 'You'} (Joined)`],
      items: []
    })
    setShowGroupModal(false)
    setNotice(`Joined Group Cart #${code.trim().toUpperCase()}!`)
  }

  function leaveGroupCart() {
    setActiveGroup(null)
    setShowGroupModal(false)
    setNotice('Exited group cart.')
  }

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

  async function loadUserWallet(userId) {
    if (!supabase || !userId) return
    try {
      const { data: w } = await supabase.from('wallets').select('balance').eq('user_id', userId).single()
      const { data: txns } = await supabase.from('wallet_txns').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      if (w) {
        setWallet({
          balance: Number(w.balance || 0),
          transactions: (txns || []).map(t => ({
            id: t.id,
            amount: t.amount,
            kind: t.note || t.kind || 'Wallet Transaction',
            ref: t.ref,
            created_at: t.created_at
          }))
        })
      }
    } catch (err) {
      console.warn('Wallet fetch fallback:', err)
    }
  }

  async function loadUserOrders(user) {
    if (!supabase || !user) return
    try {
      let query = supabase.from('orders').select(`
        id, user_id, outlet_id, token, status, payment_method, total, shop_payout,
        pickup_slot_id, group_id, is_group_payer, created_at, updated_at,
        order_items (item_id, name, price, qty),
        outlets (name, location)
      `).order('created_at', { ascending: false }).limit(100)

      const r = user.role || 'student'
      if (r === 'user' || r === 'student' || r === 'customer') {
        query = query.eq('user_id', user.id)
      } else if (r === 'staff' || r === 'shop_admin' || r === 'owner') {
        if (user.outlet_id) query = query.eq('outlet_id', user.outlet_id)
      }

      const { data: ords } = await query
      if (ords && ords.length > 0) {
        setOrders(ords.map(o => ({
          id: o.id,
          user_id: o.user_id,
          outlet_id: o.outlet_id,
          outlets: o.outlets || { name: o.outlet_id, location: 'Campus' },
          token: o.token || String(o.id % 900 + 100),
          status: o.status || 'placed',
          payment_method: o.payment_method || 'wallet',
          total: o.total || 0,
          created_at: o.created_at,
          order_items: (o.order_items || []).map(i => ({
            item_id: i.item_id,
            name: i.name,
            price: i.price,
            qty: i.qty
          }))
        })))
      }
    } catch (err) {
      console.warn('Orders fetch fallback:', err)
    }
  }

  async function loadProfile(userId) {
    if (!supabase) return
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (p) {
        if (p.outlet_id) {
          const match = CANTEEN_STAFF_OWNER_MAP.find(c => c.id === p.outlet_id) || DEMO_OUTLETS.find(o => o.id === p.outlet_id)
          if (match) p.outlet_name = match.name
        }
        // Detect if Google OAuth user requires profile completion (mobile + password)
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        const isOAuth = user?.app_metadata?.provider === 'google' || user?.identities?.some(i => i.provider === 'google')
        if (isOAuth && (!p.mobile_number || !p.profile_completed || !p.has_password)) {
          p.requiresProfileCompletion = true
        } else {
          p.requiresProfileCompletion = false
        }
        setCurrentUser(p)
        loadUserWallet(userId)
        loadUserOrders(p)
        if (p.role === 'staff' || p.role === 'admin' || p.role === 'shop_admin') setTab('ops')
      } else {
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (user) {
          const isOAuth = user.app_metadata?.provider === 'google' || user.identities?.some(i => i.provider === 'google')
          const fallbackUser = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
            role: 'customer',
            mobile_number: null,
            phone: null,
            has_password: false,
            profile_completed: false,
            requiresProfileCompletion: isOAuth
          }
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: fallbackUser.full_name,
            role: 'customer',
            has_password: false,
            profile_completed: false
          })
          await supabase.from('wallets').upsert({ user_id: user.id, balance: 0 }).select()
          setCurrentUser(fallbackUser)
          loadUserWallet(user.id)
        }
      }
    } catch (e) { console.warn('Profile fetch fallback:', e) }
  }

  // Load live outlets & menu_items from database on startup
  useEffect(() => {
    if (!supabase) return
    async function fetchDbOutlets() {
      try {
        const { data: dbOutlets } = await supabase.from('outlets').select(`
          id, name, location, is_open, is_event,
          menu_items (id, name, price, available, is_veg, category, stock_qty)
        `)
        if (dbOutlets && dbOutlets.length > 0) {
          setOutlets(prev => {
            return prev.map(p => {
              const matched = dbOutlets.find(o => o.id === p.id)
              if (!matched) return p
              return {
                ...p,
                name: matched.name || p.name,
                location: matched.location || p.location,
                is_open: matched.is_open !== undefined ? matched.is_open : p.is_open,
                is_event: matched.is_event !== undefined ? matched.is_event : p.is_event,
                menu_items: matched.menu_items && matched.menu_items.length > 0 ? matched.menu_items : p.menu_items
              }
            })
          })
        }
      } catch (e) {
        console.warn('DB outlets fetch fallback:', e)
      }
    }
    fetchDbOutlets()
  }, [])

  // Realtime subscription + live multi-role sync with automatic reconnect & catch-up
  useEffect(() => {
    if (!supabase || !currentUser) return

    const r = currentUser.role || 'student'
    let channelName = `vfoods-user-${currentUser.id}`
    let changeFilter = {}

    if (r === 'user' || r === 'student' || r === 'customer') {
      channelName = `vfoods-student-${currentUser.id}`
      changeFilter = { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${currentUser.id}` }
    } else if (r === 'staff' || r === 'shop_admin' || r === 'owner') {
      const oid = currentUser.outlet_id || 'g1'
      channelName = `vfoods-outlet-${oid}`
      changeFilter = { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${oid}` }
    } else if (r === 'admin' || r === 'superadmin' || r === 'super_admin') {
      channelName = 'vfoods-superadmin-all'
      changeFilter = { event: '*', schema: 'public', table: 'orders' }
    } else {
      channelName = `vfoods-general-${currentUser.id}`
      changeFilter = { event: '*', schema: 'public', table: 'orders' }
    }

    const channel = supabase.channel(channelName)
      .on('postgres_changes', changeFilter, payload => {
        if (payload.eventType === 'INSERT') {
          // Immediately reload orders so full relationships (items, outlet name) are populated
          loadUserOrders(currentUser)
          if (r === 'staff' || r === 'shop_admin' || r === 'owner') {
            playNewOrderChime()
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new
          setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, status: updated.status, token: updated.token || o.token } : o))
          if (updated.status === 'ready') {
            playNewOrderChime()
            if (Notification.permission === 'granted') {
              new Notification('V FOODS — Order Ready!', {
                body: `Order #${updated.id} (Token #${updated.token}) is ready for pickup!`,
                icon: '/vit-chennai-logo.png'
              })
            }
          }
        }
      })
      .subscribe((status, err) => {
        if (err) console.warn(`[Realtime] Subscription warning on ${channelName}:`, err)
      })

    // Auto-reconnect & catch-up handler when screen unlocks, tab gains focus, or network returns
    const handleSyncCatchup = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        loadUserOrders(currentUser)
      }
    }

    document.addEventListener('visibilitychange', handleSyncCatchup)
    window.addEventListener('online', handleSyncCatchup)
    window.addEventListener('focus', handleSyncCatchup)

    // Periodic safety sync (every 15s) in case WebSocket was suspended by mobile OS
    const safetyPoll = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadUserOrders(currentUser)
      }
    }, 15000)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleSyncCatchup)
      window.removeEventListener('online', handleSyncCatchup)
      window.removeEventListener('focus', handleSyncCatchup)
      clearInterval(safetyPoll)
    }
  }, [currentUser])

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
        setNotice('V FOODS App installed successfully!')
      }
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
      if (isIos) {
        setShowIosPrompt(true)
      } else {
        setNotice('To install on Desktop or Mobile: look for the Install icon in your browser address bar, or use browser menu > Install App.')
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
        const itemMatch = (o.menu_items || []).some(i => i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q))
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
      id: order.outlet_id, name: order.outlets?.name || 'Campus Outlet', location: 'VIT Campus',
      menu_items: []
    }

    // Flag (don't silently drop) any item that's since gone unavailable
    const itemsToLoad = (order.order_items || []).map(orderItem => {
      const currentItem = (targetOutlet.menu_items || []).find(
        m => m.id === orderItem.item_id || m.name?.toLowerCase().trim() === orderItem.name?.toLowerCase().trim()
      )

      let isAvailable = true
      let unavailableReason = null

      if (!currentItem) {
        isAvailable = false
        unavailableReason = 'Item no longer offered on menu'
      } else if (currentItem.available === false || (currentItem.stock_qty !== undefined && currentItem.stock_qty <= 0)) {
        isAvailable = false
        unavailableReason = 'Sold Out'
      }

      return {
        id: currentItem ? currentItem.id : (orderItem.item_id || Math.floor(Math.random() * 90000)),
        name: orderItem.name,
        price: currentItem ? currentItem.price : orderItem.price,
        qty: orderItem.qty,
        available: isAvailable,
        unavailableReason,
        notes: orderItem.notes || ''
      }
    })

    setCart({
      outlet: targetOutlet,
      items: itemsToLoad
    })
    setTab('browse')

    const unavailableList = itemsToLoad.filter(i => !i.available)
    if (unavailableList.length > 0) {
      setNotice(`Reorder ("My Usual") loaded! Note: ${unavailableList.map(i => i.name).join(', ')} is currently unavailable and flagged in your cart.`)
    } else {
      setNotice(`Reorder ("My Usual") loaded! All ${itemsToLoad.length} items from Order #${order.id} added to cart.`)
    }
  }

  function handleTopUpDeficit(amount) {
    setWalletPrefill(amount)
    setTab('wallet')
    setNotice(`Deficit auto-filled: ₹${amount} needed to checkout. Click 'Add Money' to top up!`)
  }

  async function placeOrder(paymentMethod = 'wallet', gatewayDetails = null) {
    if (!cart.items.length) return
    if (cart.items.some(i => !i.available)) {
      return setNotice('Your cart contains unavailable or out-of-stock items. Please remove them before checkout.')
    }

    const baseTotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0)
    let discount = 0

    // Feature 8: Validate and calculate coupon discount
    if (appliedCoupon) {
      if (appliedCoupon.min_order_value && baseTotal < appliedCoupon.min_order_value) {
        return setNotice(`Coupon ${appliedCoupon.code} requires a minimum order of ${money(appliedCoupon.min_order_value)}.`)
      }
      if (appliedCoupon.discount_type === 'flat') {
        discount = Math.min(baseTotal, appliedCoupon.discount_value)
      } else if (appliedCoupon.discount_type === 'percent') {
        discount = Math.min(baseTotal, Math.round((baseTotal * appliedCoupon.discount_value) / 100))
      }
    }

    const studentDebit = Math.max(0, baseTotal - discount)
    const isGateway = paymentMethod === 'instant_gateway' || paymentMethod === 'gateway'

    if (!isGateway && wallet.balance < studentDebit) {
      return setNotice(`Insufficient balance (${money(wallet.balance)}). Top up ${money(studentDebit - wallet.balance)} or use Instant Payment Gateway (PhonePe/Paytm).`)
    }

    // Feature 7: Validate scheduled pickup slot
    if (isScheduled && selectedSlotId) {
      const slot = pickupSlots.find(s => s.id === selectedSlotId)
      if (slot && slot.current_orders >= slot.max_orders) {
        return setNotice('This pickup slot is full! Please choose another slot or Order Now.')
      }
    }

    setBusy(true)
    const newId = Math.floor(2000 + Math.random() * 8000)
    const token = Math.floor(100 + Math.random() * 900).toString()

    setTimeout(() => {
      const selectedSlot = isScheduled ? pickupSlots.find(s => s.id === selectedSlotId) : null
      const paymentProviderName = isGateway ? (gatewayDetails?.provider || 'PhonePe / Paytm UPI') : 'V FOODS Campus Wallet'
      const gatewayTxn = isGateway ? (gatewayDetails?.txnId || `UPI-${Date.now().toString().slice(-8)}`) : null

      const newOrder = {
        id: newId,
        user_id: currentUser?.id || 'usr-1',
        outlet_id: cart.outlet.id,
        outlets: { name: cart.outlet.name, location: cart.outlet.location },
        token,
        status: 'placed',
        payment_method: isGateway ? 'gateway' : 'wallet',
        payment_provider: paymentProviderName,
        gateway_txn_id: gatewayTxn,
        total: baseTotal,           // shop_payout & platform 5% margin preserved on unmodified total
        student_paid: studentDebit,
        discount,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        pickup_slot_id: selectedSlot?.id || null,
        pickup_slot_time: selectedSlot?.time_label || null,
        group_id: activeGroup ? activeGroup.id : null,
        is_group_payer: activeGroup ? true : false,
        created_at: new Date().toISOString(),
        order_items: cart.items.map(i => ({ item_id: i.id, name: i.name, price: i.price, qty: i.qty, notes: i.notes || '' }))
      }

      setOrders(prev => [newOrder, ...prev])

      // Atomic wallet debit: Only studentDebit is deducted if paid with wallet
      if (!isGateway) {
        setWallet(w => ({
          balance: w.balance - studentDebit,
          transactions: [
            {
              id: Date.now(),
              amount: -studentDebit,
              kind: `Order #${newId} — ${cart.outlet.name}${appliedCoupon ? ` (Promo ${appliedCoupon.code} -₹${discount})` : ''}${selectedSlot ? ' [Scheduled]' : ''}`,
              ref: `ord_${newId}`,
              created_at: new Date().toISOString()
            },
            ...w.transactions
          ]
        }))
      }

      // Increment slot usage
      if (selectedSlot) {
        setPickupSlots(slots => slots.map(s => s.id === selectedSlot.id ? { ...s, current_orders: s.current_orders + 1 } : s))
      }

      // Increment coupon usage
      if (appliedCoupon) {
        setAvailableCoupons(coups => coups.map(c => c.code === appliedCoupon.code ? { ...c, used_count: c.used_count + 1 } : c))
      }

      // Numerically decrement stock in real time
      setOutlets(outs => outs.map(o => {
        if (o.id !== cart.outlet.id) return o
        return {
          ...o,
          menu_items: (o.menu_items || []).map(item => {
            const ordered = cart.items.find(ci => ci.id === item.id)
            if (!ordered) return item
            const currentStock = item.stock_qty !== undefined ? item.stock_qty : 30
            const nextStock = Math.max(0, currentStock - ordered.qty)
            return {
              ...item,
              stock_qty: nextStock,
              available: nextStock > 0
            }
          })
        }
      }))

      setCart({ outlet: null, items: [] })
      setAppliedCoupon(null)
      setIsScheduled(false)
      setSelectedSlotId(null)
      if (activeGroup) setActiveGroup(null)
      setBusy(false)
      setTab('orders')
      const paymentMsg = isGateway ? `Paid via ${paymentProviderName}` : 'Paid from Campus Wallet'
      setNotice(`Order #${newId} placed! (${paymentMsg}) Pickup Token: #${token}${selectedSlot ? ` · Scheduled for ${selectedSlot.time_label}` : ''}`)
      addAuditLog(currentUser?.full_name || 'Rahul Sharma', currentUser?.role || 'student', 'ORDER', 'ORDER_PLACED', `Order #${newId} placed at ${cart.outlet.name} (${money(studentDebit)}${discount > 0 ? `, saved ₹${discount}` : ''}) via ${paymentProviderName}`)

      // Persist order to Supabase
      if (supabase && currentUser?.id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const dbUserId = uuidRegex.test(currentUser.id) ? currentUser.id : 'a6d778ae-5174-4bbf-8e68-00ef619a1ced'
        const payloadItems = cart.items.map(i => ({ item_id: i.id, qty: i.qty }))

        if (isGateway) {
          supabase.from('orders').insert({
            user_id: dbUserId,
            outlet_id: cart.outlet.id,
            token: token,
            status: 'placed',
            payment_method: 'gateway',
            total: baseTotal,
            shop_payout: baseTotal,
            created_at: new Date().toISOString()
          }).select().single().then(async ({ data: dbOrder, error }) => {
            if (!error && dbOrder) {
              const orderItemsPayload = cart.items.map(i => ({
                order_id: dbOrder.id,
                item_id: i.id,
                name: i.name,
                price: i.price,
                qty: i.qty
              }))
              await supabase.from('order_items').insert(orderItemsPayload)
              setOrders(ords => ords.map(o => o.id === newId ? { ...o, id: Number(dbOrder.id), token: dbOrder.token || token } : o))
              loadUserOrders(currentUser)
            } else if (error) {
              console.warn('Supabase gateway order insert error:', error)
            }
          }).catch(err => console.warn('Supabase gateway order insert error:', err))
        } else {
          supabase.rpc('place_order', {
            p_user_id: dbUserId,
            p_outlet_id: cart.outlet.id,
            p_items: payloadItems,
            p_payment_method: 'wallet',
            p_pickup_slot_id: selectedSlot?.id || null,
            p_discount_amount: discount,
            p_coupon_code: appliedCoupon?.code || null
          }).then(({ data: dbOrderId, error }) => {
            if (!error && dbOrderId) {
              setOrders(ords => ords.map(o => o.id === newId ? { ...o, id: Number(dbOrderId) } : o))
              loadUserWallet(dbUserId)
              loadUserOrders(currentUser)
            } else if (error) {
              console.warn('Supabase place_order RPC error:', error)
            }
          }).catch(err => console.warn('Supabase place_order sync error:', err))
        }
      }
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
          name: 'VIT Chennai V-FOOD',
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
    setNotice(`Added ${money(amount)} to wallet! New balance: ${money(wallet.balance + amount)}`)
    addAuditLog(currentUser?.full_name || 'Rahul Sharma', currentUser?.role || 'student', 'WALLET', 'WALLET_TOPUP', `Credited ${money(amount)} via Razorpay UPI (${ref})`)

    if (supabase && currentUser?.id && currentUser.id.length > 20) {
      supabase.rpc('topup_my_wallet', { p_amount: amount, p_payment_ref: ref }).then(({ data, error }) => {
        if (!error && data) {
          setWallet(w => ({ ...w, balance: data.new_balance }))
        }
      }).catch(err => console.warn('Supabase topup sync:', err))
    }
  }

  function toggleItemAvailability(outletId, itemId) {
    setOutlets(outs => outs.map(o => o.id !== outletId ? o : {
      ...o, menu_items: (o.menu_items || []).map(i => {
        if (i.id !== itemId) return i
        const isAvail = i.available !== false
        const nextAvail = !isAvail
        const nextQty = nextAvail ? (i.stock_qty && i.stock_qty > 0 ? i.stock_qty : 30) : 0
        return { ...i, available: nextAvail, stock_qty: nextQty }
      })
    }))
    addAuditLog(currentUser?.full_name || 'Staff Member', currentUser?.role || 'staff', 'AVAILABILITY', 'AVAILABILITY_TOGGLE', `Marked item #${itemId} ${!isAvail ? 'available' : 'unavailable'} in outlet ${outletId}`)
  }

  function updateItemStockQty(outletId, itemId, newQty) {
    const qty = Math.max(0, parseInt(newQty, 10) || 0)
    setOutlets(outs => outs.map(o => o.id !== outletId ? o : {
      ...o, menu_items: (o.menu_items || []).map(i => i.id === itemId ? {
        ...i,
        stock_qty: qty,
        available: qty > 0
      } : i)
    }))
    addAuditLog(currentUser?.full_name || 'Staff Member', currentUser?.role || 'staff', 'INVENTORY', 'STOCK_UPDATE', `Updated stock for item #${itemId} to ${qty} units in outlet ${outletId}`)
  }

  function addMenuItem(outletId, itemData) {
    const name = (itemData.name || '').trim()
    if (!name) {
      setNotice('Please enter a food item name.')
      return false
    }
    const price = parseFloat(itemData.price)
    if (isNaN(price) || price < 0) {
      setNotice('Please enter a valid price.')
      return false
    }
    const stockQty = Math.max(0, parseInt(itemData.stock_qty, 10) || 0)
    const available = itemData.available !== undefined ? Boolean(itemData.available) : stockQty > 0
    const newItem = {
      id: Date.now(),
      name,
      price,
      is_veg: itemData.is_veg !== false,
      category: (itemData.category || 'snacks').toLowerCase().trim(),
      available,
      stock_qty: stockQty,
      description: (itemData.description || '').trim()
    }

    setOutlets(outs => outs.map(o => {
      if (o.id !== outletId) return o
      return {
        ...o,
        menu_items: [newItem, ...(o.menu_items || [])]
      }
    }))

    const oName = outlets.find(o => o.id === outletId)?.name || outletId
    setNotice(`Added "${newItem.name}" (${money(newItem.price)}) to ${oName}!`)
    addAuditLog(currentUser?.full_name || 'Staff Member', currentUser?.role || 'staff', 'MENU', 'ADD_ITEM', `Added "${newItem.name}" (${money(newItem.price)}, stock: ${newItem.stock_qty}) in ${oName}`)
    return true
  }

  function updateMenuItem(outletId, itemId, updatedFields) {
    let updatedItemName = ''
    setOutlets(outs => outs.map(o => {
      if (o.id !== outletId) return o
      return {
        ...o,
        menu_items: (o.menu_items || []).map(i => {
          if (i.id !== itemId) return i
          const nextPrice = updatedFields.price !== undefined ? Math.max(0, parseFloat(updatedFields.price) || 0) : i.price
          const nextStock = updatedFields.stock_qty !== undefined ? Math.max(0, parseInt(updatedFields.stock_qty, 10) || 0) : (i.stock_qty !== undefined ? i.stock_qty : 30)
          const nextAvail = updatedFields.available !== undefined ? Boolean(updatedFields.available) : (nextStock > 0)
          const updated = {
            ...i,
            ...updatedFields,
            price: nextPrice,
            stock_qty: nextStock,
            available: nextAvail
          }
          updatedItemName = updated.name
          return updated
        })
      }
    }))

    const oName = outlets.find(o => o.id === outletId)?.name || outletId
    setNotice(`Updated "${updatedItemName || 'item'}" in ${oName}!`)
    addAuditLog(currentUser?.full_name || 'Staff Member', currentUser?.role || 'staff', 'MENU', 'UPDATE_ITEM', `Updated details for "${updatedItemName || itemId}" in ${oName}`)
    return true
  }

  function deleteMenuItem(outletId, itemId) {
    let deletedName = 'item'
    setOutlets(outs => outs.map(o => {
      if (o.id !== outletId) return o
      const found = (o.menu_items || []).find(i => i.id === itemId)
      if (found) deletedName = found.name
      return {
        ...o,
        menu_items: (o.menu_items || []).filter(i => i.id !== itemId)
      }
    }))

    const oName = outlets.find(o => o.id === outletId)?.name || outletId
    setNotice(`Removed "${deletedName}" from ${oName}.`)
    addAuditLog(currentUser?.full_name || 'Staff Member', currentUser?.role || 'staff', 'MENU', 'DELETE_ITEM', `Removed menu item "${deletedName}" (#${itemId}) from ${oName}`)
    return true
  }

  function toggleOutletOpen(outletId) {
    let outletName = outletId
    let nextOpen = true
    setOutlets(outs => outs.map(o => {
      if (o.id !== outletId) return o
      outletName = o.name
      nextOpen = !o.is_open
      return { ...o, is_open: !o.is_open }
    }))
    addAuditLog(currentUser?.full_name || 'Staff Member', currentUser?.role || 'staff', 'OUTLET', 'OUTLET_TOGGLE', `Toggled open/close state for ${outletName}`)

    if (supabase && outletId) {
      supabase.from('outlets').update({ is_open: nextOpen }).eq('id', outletId).then(({ error }) => {
        if (error) console.warn('toggleOutletOpen Supabase sync:', error)
      }).catch(err => console.warn('toggleOutletOpen Supabase error:', err))
    }
  }

  function advanceOrderStatus(orderId) {
    let targetStatus = ''
    setOrders(ords => ords.map(o => {
      if (o.id !== orderId) return o
      const idx = statuses.indexOf(o.status)
      const nextStatus = idx < statuses.length - 1 ? statuses[idx + 1] : o.status
      targetStatus = nextStatus
      if (nextStatus !== o.status) {
        addAuditLog(currentUser?.full_name || 'Staff Member', currentUser?.role || 'staff', 'ORDER', 'KDS_STATUS_CHANGE', `Order #${orderId} moved to "${nextStatus}" (Token #${o.token})`)
      }

      return { ...o, status: nextStatus }
    }))

    if (supabase && orderId && targetStatus) {
      supabase.rpc('update_order_status', { p_order_id: orderId, p_status: targetStatus }).then(({ error: rpcErr }) => {
        if (rpcErr) {
          console.warn('update_order_status RPC fallback to table update:', rpcErr)
          supabase.from('orders').update({ status: targetStatus, updated_at: new Date().toISOString() }).eq('id', orderId).then(({ error }) => {
            if (error) console.warn('advanceOrderStatus Supabase sync:', error)
          }).catch(err => console.warn('advanceOrderStatus Supabase error:', err))
        }
      }).catch(() => {
        supabase.from('orders').update({ status: targetStatus, updated_at: new Date().toISOString() }).eq('id', orderId).catch(() => {})
      })
    }
  }

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
    setCurrentUser(null)
    setSession(null)
    setTab('browse')
  }

  function handleSwitchCanteen(outletId) {
    const chosen = CANTEEN_STAFF_OWNER_MAP.find(c => c.id === outletId) || outlets.find(o => o.id === outletId) || DEMO_OUTLETS.find(o => o.id === outletId)
    if (!chosen) return
    setCurrentUser(prev => ({
      ...prev,
      outlet_id: chosen.id,
      outlet_name: chosen.name
    }))
    setNotice(`Active Canteen switched to: ${chosen.name}`)
    addAuditLog(currentUser?.full_name || 'Staff Member', currentUser?.role || 'staff', 'OUTLET', 'SWITCH_CANTEEN', `Switched active console to ${chosen.name} (${chosen.id})`)
  }

  // ── MAIN APP DIRECT AUTHENTICATION ──
  if (!currentUser) return <AuthScreen onLoginUser={setCurrentUser} />

  // Mandatory one-time profile completion for Google OAuth users (cannot be skipped)
  if (currentUser.requiresProfileCompletion) {
    return (
      <CompleteProfileScreen
        currentUser={currentUser}
        onCompleted={(completedUser) => {
          setCurrentUser(completedUser)
          loadUserWallet(completedUser.id)
          loadUserOrders(completedUser)
        }}
        onSignOut={handleSignOut}
      />
    )
  }

  const role      = currentUser.role || 'user'


  const isCustomer = role === 'user' || role === 'student' || role === 'customer'
  const isStaff   = role === 'staff'
  const isOwner   = role === 'owner' || role === 'shop_admin'
  const isAdmin   = role === 'admin' || role === 'superadmin' || role === 'super_admin'

  if (isCustomer) {
    return (
      <VFoodsUserDashboard
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        role={role}
        outlets={outlets}
        visibleOutlets={visibleOutlets}
        cart={cart}
        setCart={setCart}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        wallet={wallet}
        topUp={topUp}
        creditWalletBalance={creditWalletBalance}
        orders={orders}
        placeOrder={placeOrder}
        repeatOrder={repeatOrder}
        tab={tab}
        setTab={setTab}
        notice={notice}
        setNotice={setNotice}
        busy={busy}
        walletPrefill={walletPrefill}
        setWalletPrefill={setWalletPrefill}
        itemRatings={itemRatings}
        submitItemRating={submitItemRating}
        handleSignOut={handleSignOut}
        handleInstallClick={handleInstallClick}
        pickupSlots={pickupSlots}
        isScheduled={isScheduled}
        setIsScheduled={setIsScheduled}
        selectedSlotId={selectedSlotId}
        setSelectedSlotId={setSelectedSlotId}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        availableCoupons={availableCoupons}
        OrdersView={OrdersView}
        WalletView={WalletView}
        ProfileView={ProfileView}
        money={money}
      />
    )
  }

  if (isStaff) {
    return (
      <ShopStaffDashboard
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        outlets={outlets}
        orders={orders}
        setOrders={setOrders}
        advanceOrderStatus={advanceOrderStatus}
        addAuditLog={addAuditLog}
        handleSignOut={handleSignOut}
        money={money}
      />
    )
  }

  if (isOwner) {
    return (
      <ShopAdminDashboard
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        outlets={outlets}
        setOutlets={setOutlets}
        orders={orders}
        setOrders={setOrders}
        advanceOrderStatus={advanceOrderStatus}
        addAuditLog={addAuditLog}
        handleSignOut={handleSignOut}
        money={money}
      />
    )
  }

  if (isAdmin) {
    return (
      <SuperAdminDashboard
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        outlets={outlets}
        setOutlets={setOutlets}
        orders={orders}
        setOrders={setOrders}
        advanceOrderStatus={advanceOrderStatus}
        addAuditLog={addAuditLog}
        handleSignOut={handleSignOut}
        money={money}
        eventMode={eventMode}
        setEventMode={setEventMode}
      />
    )
  }

  return (
    <div className="app-shell">
      {/* iOS PWA Install Guide Modal */}
      {showIosPrompt && (
        <div className="ios-modal-overlay" onClick={() => setShowIosPrompt(false)}>
          <div className="ios-modal-card" onClick={e => e.stopPropagation()}>
            <div className="ios-modal-header">
              <h3>Install V FOODS on iOS</h3>
              <button className="close-btn" onClick={() => setShowIosPrompt(false)}><X size={18} /></button>
            </div>
            <div className="ios-modal-steps">
              <div className="ios-step">
                <span className="ios-step-num">1</span>
                <p>Tap the <strong>Share</strong> button at the bottom of Safari.</p>
              </div>
              <div className="ios-step">
                <span className="ios-step-num">2</span>
                <p>Scroll down and select <strong>"Add to Home Screen"</strong> (+).</p>
              </div>
              <div className="ios-step">
                <span className="ios-step-num">3</span>
                <p>Tap <strong>"Add"</strong> in the top right. V FOODS will launch full-screen as a native app!</p>
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
          <span className="brand-title">V-<span>FOODS</span></span>
        </a>
        <div className="top-actions">
          {!isOnline && (
            <span className="offline-badge"><WifiOff size={13} /> Offline</span>
          )}
          <button className="install-app-btn" onClick={handleInstallClick} title="Install V FOODS as Mobile or Desktop App">
            <Download size={13} />
            <span>Install App</span>
          </button>
          <span className="role-tag-badge inline-flex items-center gap-1.5">
            {role === 'owner' || role === 'shop_admin' ? <><Store size={12} strokeWidth={2} /> Shop Admin</> :
             role === 'staff' ? <><ChefHat size={12} strokeWidth={2} /> Shop Staff</> :
             role === 'admin' || role === 'superadmin' || role === 'super_admin' ? <><Shield size={12} strokeWidth={2} /> Super Admin</> : <><User size={12} strokeWidth={2} /> User</>}
          </span>
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



      <main className="content">
        {/* Hero */}
        <section className="hero-card">
          <div>
            <p className="eyebrow">CAMPUS DINING · {currentUser.full_name}</p>
            <h1>
              {isCustomer && <>What's your next order,<br /><em>{currentUser.full_name?.split(' ')[0] || 'User'}?</em></>}
              {isStaff    && <>Kitchen Operations Console<br /><em>Outlet: {currentUser.outlet_name || 'Gazebo Counter'}</em></>}
              {isOwner    && <>Canteen Franchisee Portal<br /><em>Outlet: {currentUser.outlet_name || 'Gazebo C1'}</em></>}
              {isAdmin    && <>Campus Super Admin &<br /><em>Operations Telemetry</em></>}
            </h1>
          </div>
          <div className="hero-stats">
            {isCustomer && (
              <>
                <div className="stat-pill">
                  <strong>{visibleOutlets.filter(o => o.is_open).length}</strong>
                  <small>Outlets Open</small>
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
            {isOwner && (
              <>
                <div className="stat-pill">
                  <strong>{money(orders.filter(o => o.outlet_id === (currentUser.outlet_id || 'g1')).reduce((s, o) => s + o.total, 0))}</strong>
                  <small>Today's Sales</small>
                </div>
                <div className="stat-pill">
                  <strong>{orders.filter(o => o.outlet_id === (currentUser.outlet_id || 'g1')).length}</strong>
                  <small>Outlet Orders</small>
                </div>
                <div className="stat-pill">
                  <strong>{orders.filter(o => o.outlet_id === (currentUser.outlet_id || 'g1') && o.status === 'ready').length}</strong>
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

        {/* Active Canteen Switcher for Staff & Shop Owner */}
        {(isStaff || isOwner) && (
          <div className="canteen-switcher-bar">
            <div className="canteen-switcher-label">
              <Store size={16} /> Active Canteen:
            </div>
            <select
              className="canteen-switcher-select"
              value={currentUser.outlet_id || 'g1'}
              onChange={e => handleSwitchCanteen(e.target.value)}
              id="active-canteen-switcher"
              aria-label="Switch active canteen"
            >
              {CANTEEN_STAFF_OWNER_MAP.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.location})
                </option>
              ))}
            </select>
            <span className="canteen-switcher-hint">
              Switch on the fly to inspect & test any of the 13 canteens
            </span>
          </div>
        )}

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
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
              <User size={18} /> Profile
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
          <div className="tab-content-enter" key="browse">
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
              getItemRatingStats={getItemRatingStats}
              orders={orders}
              repeatOrder={repeatOrder}
            />
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {isCustomer && tab === 'orders' && (
          <div className="tab-content-enter" key="orders">
            <OrdersView
              orders={orders}
              repeatOrder={repeatOrder}
              itemRatings={itemRatings}
              submitItemRating={submitItemRating}
              onExploreCanteens={() => setTab('browse')}
            />
          </div>
        )}

        {/* ── WALLET TAB ── */}
        {isCustomer && tab === 'wallet' && (
          <div className="tab-content-enter" key="wallet">
            <WalletView
              wallet={wallet}
              topUp={topUp}
              busy={busy}
              currentUser={currentUser}
              setNotice={setNotice}
              creditWalletBalance={creditWalletBalance}
              prefilledAmount={walletPrefill}
              setPrefilledAmount={setWalletPrefill}
            />
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {isCustomer && tab === 'profile' && (
          <div className="tab-content-enter" key="profile">
            <ProfileView
              currentUser={currentUser}
              wallet={wallet}
              orders={orders}
              onNavigate={setTab}
              onSignOut={handleSignOut}
              setNotice={setNotice}
            />
          </div>
        )}

        {/* ── SHOP OWNER CONSOLE (CANTEEN FRANCHISEE) ── */}
        {isOwner && (
          <ShopOwnerConsole
            profile={currentUser}
            orders={orders}
            outlets={outlets}
            toggleOutletOpen={toggleOutletOpen}
            updateItemStockQty={updateItemStockQty}
            toggleItemAvailability={toggleItemAvailability}
            addMenuItem={addMenuItem}
            updateMenuItem={updateMenuItem}
            deleteMenuItem={deleteMenuItem}
            setNotice={setNotice}
            addAuditLog={addAuditLog}
            getItemRatingStats={getItemRatingStats}
            pickupSlots={pickupSlots}
            setPickupSlots={setPickupSlots}
          />
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
            updateItemStockQty={updateItemStockQty}
            addMenuItem={addMenuItem}
            updateMenuItem={updateMenuItem}
            deleteMenuItem={deleteMenuItem}
            auditLogs={auditLogs}
            addAuditLog={addAuditLog}
            getItemRatingStats={getItemRatingStats}
            pickupSlots={pickupSlots}
            setPickupSlots={setPickupSlots}
            availableCoupons={availableCoupons}
            setAvailableCoupons={setAvailableCoupons}
          />
        )}
      </main>

      {/* Cart dock */}
      {isCustomer && cart.items.length > 0 && (
        <CartDock
          cart={cart}
          wallet={wallet}
          busy={busy}
          placeOrder={placeOrder}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
          updateCartItemNotes={updateCartItemNotes}
          setCart={setCart}
          pickupSlots={pickupSlots}
          isScheduled={isScheduled}
          setIsScheduled={setIsScheduled}
          selectedSlotId={selectedSlotId}
          setSelectedSlotId={setSelectedSlotId}
          activeGroup={activeGroup}
          setShowGroupModal={setShowGroupModal}
          availableCoupons={availableCoupons}
          appliedCoupon={appliedCoupon}
          setAppliedCoupon={setAppliedCoupon}
          setNotice={setNotice}
          onTopUpDeficit={handleTopUpDeficit}
        />
      )}

      {/* ── Feature 5: Group Ordering Modal ── */}
      {showGroupModal && (
        <GroupCartModal
          activeGroup={activeGroup}
          startGroupCart={startGroupCart}
          joinGroupCart={joinGroupCart}
          leaveGroupCart={leaveGroupCart}
          onClose={() => setShowGroupModal(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BROWSE TAB (with veg filter, price filter, AB3 time slot, rating sorting)
// ─────────────────────────────────────────────────────────────────────────────
function BrowseTab({ outlets, visibleOutlets, eventMode, locationFilter, setLocationFilter,
  query, setQuery, vegOnly, setVegOnly, priceFilter, setPriceFilter, cart, addToCart, removeFromCart, ab3Slot, getItemRatingStats, orders, repeatOrder }) {

  const LOCATIONS = ['All', 'Gazebo', 'North Square', 'AB3 Amphitheatre', 'Academic Blocks', 'Campus Outlets & Stores']
  const PRICE_OPTS = [{ label: 'All Prices', val: 'All' }, { label: 'Under ₹50', val: 'u50' }, { label: 'Under ₹100', val: 'u100' }, { label: 'Under ₹200', val: 'u200' }]
  const [sortBy, setSortBy] = useState('popular') // 'popular' | 'rating' | 'price_asc' | 'price_desc'
  const [activeMindCat, setActiveMindCat] = useState('all')
  const [selectedCanteenId, setSelectedCanteenId] = useState('all')

  const myUsualOrder = useMemo(() => {
    return (orders || []).find(o => o.status === 'collected' && (o.order_items || []).length > 0)
  }, [orders])

  // Apply local item-level filters to each outlet
  const filteredOutlets = useMemo(() => visibleOutlets.map(o => {
    if (selectedCanteenId !== 'all' && o.id !== selectedCanteenId) {
      return null
    }

    let items = o.menu_items || []
    // AB3 time-of-day filter (only active when browsing all items without an explicit category filter)
    if (o.id === 'ab3' && activeMindCat === 'all') {
      const timeItems = items.filter(i => i.category === ab3Slot)
      if (timeItems.length > 0) items = timeItems
    }
    // "What's on your mind?" Category Context Filter
    if (activeMindCat !== 'all') {
      items = items.filter(i => matchesMindCategory(i, activeMindCat))
    }
    // Search query item filter (if typed query)
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      const matchesOutlet = o.name.toLowerCase().includes(q) || o.location.toLowerCase().includes(q)
      if (!matchesOutlet) {
        items = items.filter(i => i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q))
      }
    }
    if (vegOnly) items = items.filter(i => i.is_veg !== false)
    if (priceFilter === 'u50')  items = items.filter(i => i.price < 50)
    if (priceFilter === 'u100') items = items.filter(i => i.price < 100)
    if (priceFilter === 'u200') items = items.filter(i => i.price < 200)

    // Sort by rating or price within each outlet's menu
    if (sortBy === 'rating' && getItemRatingStats) {
      items = [...items].sort((a, b) => (getItemRatingStats(b.id)?.avg || 0) - (getItemRatingStats(a.id)?.avg || 0))
    } else if (sortBy === 'price_asc') {
      items = [...items].sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price_desc') {
      items = [...items].sort((a, b) => b.price - a.price)
    }

    return { ...o, menu_items: items }
  }).filter(Boolean).filter(o => o.menu_items.length > 0), [visibleOutlets, selectedCanteenId, activeMindCat, query, vegOnly, priceFilter, ab3Slot, sortBy, getItemRatingStats])

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
              onClick={() => { setLocationFilter(loc); setSelectedCanteenId('all'); }}>{loc}</button>
          ))}
        </div>

        {/* ── Canteen Rapid Switcher Rail ── */}
        <div className="canteen-rail-container">
          <div className="canteen-rail-header">
            <span className="canteen-rail-title">
              <Store size={14} /> Campus Canteens & Stalls ({visibleOutlets.length})
            </span>
            {selectedCanteenId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCanteenId('all')}
                style={{ border: 0, background: 'none', color: 'var(--blue-primary)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                Reset to All Canteens
              </button>
            )}
          </div>
          <div className="canteen-rail-scroll">
            <button
              type="button"
              className={`canteen-rail-chip ${selectedCanteenId === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCanteenId('all')}
            >
              <span className="canteen-rail-avatar">All</span>
              <span>All Canteens</span>
            </button>
            {visibleOutlets.map(out => (
              <button
                key={out.id}
                type="button"
                className={`canteen-rail-chip ${selectedCanteenId === out.id ? 'active' : ''}`}
                onClick={() => setSelectedCanteenId(curr => curr === out.id ? 'all' : out.id)}
              >
                <span className="canteen-rail-avatar">{out.name.charAt(0)}</span>
                <span>{out.name}</span>
                {out.is_open && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Campus "What's on your mind?" Category Quick Bar ── */}
        <div className="food-flow-category-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
              What's on your mind?
            </span>
            {activeMindCat !== 'all' && (
              <button
                onClick={() => setActiveMindCat('all')}
                style={{ border: 0, background: 'none', color: 'var(--blue-primary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Clear filter ({MIND_CATEGORIES.find(c => c.id === activeMindCat)?.label})
              </button>
            )}
          </div>
          <div className="food-flow-cat-scroll">
            {MIND_CATEGORIES.map(cat => {
              const isActive = activeMindCat === cat.id
              return (
                <div
                  key={cat.id}
                  className={`food-flow-cat-card ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveMindCat(curr => curr === cat.id ? 'all' : cat.id)}
                  title={`Filter by ${cat.label}`}
                >
                  <span className="food-flow-cat-icon">{cat.Icon && <cat.Icon size={18} strokeWidth={2} className="text-orange-500" />}</span>
                  <span className="food-flow-cat-label">{cat.label}</span>
                </div>
              )
            })}
          </div>
          {activeMindCat !== 'all' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#EFF6FF',
              border: '1.5px solid #BFDBFE',
              padding: '8px 12px',
              borderRadius: '10px',
              marginTop: '10px',
              fontSize: '12px',
              color: 'var(--blue-primary)',
              fontWeight: 700
            }}>
              <span>
                Filtered by: <strong>{MIND_CATEGORIES.find(c => c.id === activeMindCat)?.label}</strong> ({filteredOutlets.length} {filteredOutlets.length === 1 ? 'outlet' : 'outlets'} serving this)
              </span>
              <button
                onClick={() => setActiveMindCat('all')}
                style={{
                  border: '1px solid #BFDBFE',
                  background: '#FFFFFF',
                  color: 'var(--blue-primary)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Reset to All
              </button>
            </div>
          )}
        </div>

        {/* Advanced filter row */}
        <div className="filter-row-advanced" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
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

          {/* Sort By Dropdown */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px', background: '#FFFFFF', fontWeight: 600, color: 'var(--text-main)', outline: 0 }}
            >
              <option value="popular">Popular Dishes</option>
              <option value="rating">Highest Rated</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Feature 2: My Usual Quick Reorder Banner ── */}
      {myUsualOrder && !query && locationFilter === 'All' && !vegOnly && priceFilter === 'All' && (
        <div className="my-usual-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0
            }}>
              <Zap size={18} strokeWidth={2} className="fill-white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '14px', color: '#065F46' }}>My Usual (Reorder in 1-Tap)</strong>
                <span style={{ fontSize: '11px', background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  {myUsualOrder.outlets?.name || myUsualOrder.outlet_id}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#334155' }}>
                {(myUsualOrder.order_items || []).map(i => `${i.name} × ${i.qty}`).join(', ')} · <strong>{money(myUsualOrder.total)}</strong>
              </p>
            </div>
          </div>
          <button
            className="reorder-btn btn-spring"
            onClick={() => repeatOrder && repeatOrder(myUsualOrder)}
            style={{ padding: '7px 14px', fontSize: '12.5px', borderRadius: '8px' }}
            title="Reorder your usual meal into cart"
          >
            <Repeat size={13} /> Reorder My Usual
          </button>
        </div>
      )}

      <div className="section-heading">
        <div>
          <h2>Campus Canteens & Outlets</h2>
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
              getItemRatingStats={getItemRatingStats}
              activeMindCat={activeMindCat}
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
      Icon: Sandwich,
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
      Icon: Cake,
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
      Icon: Soup,
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
      Icon: GlassWater,
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
      Icon: Coffee,
      tagline: 'Chai, Coffee & Hot Maggi',
      rating: 4.8,
      reviews: 640,
      tags: ['Filter Coffee', 'Masala Tea', 'Maggi'],
      wait: '3-6 min',
      badge: 'Campus Favourite'
    }
  }
  if (id === 'n2' || name.includes('Alpha')) {
    return {
      gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #B91C1C 100%)',
      accentColor: '#F87171',
      Icon: Flame,
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
      Icon: UtensilsCrossed,
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
      Icon: GlassWater,
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
      Icon: Sparkles,
      tagline: 'Amphitheatre All-Day Food Bar',
      rating: 4.8,
      reviews: 420,
      tags: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
      wait: '5-7 min',
      badge: 'Rotating Menu'
    }
  }
  
  return {
    gradient: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 55%, #1E40AF 100%)',
    accentColor: '#60A5FA',
    Icon: UtensilsCrossed,
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
function OutletCard({ outlet, addToCart, removeFromCart, cart, getItemRatingStats, activeMindCat }) {
  const [expanded, setExpanded] = useState(true)
  const [menuSearch, setMenuSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('all')
  const [vegOnly, setVegOnly] = useState(false)
  const meta = useMemo(() => getCanteenMeta(outlet), [outlet])

  // Items from this outlet in customer's cart
  const outletCartItems = (cart?.outlet?.id === outlet.id ? cart.items : [])
  const itemsInCartCount = outletCartItems.reduce((s, i) => s + i.qty, 0)
  const itemsInCartTotal = outletCartItems.reduce((s, i) => s + (i.price * i.qty), 0)

  // Categories present in this outlet
  const rawItems = outlet.menu_items || []
  const categories = useMemo(() => {
    const cats = new Set()
    rawItems.forEach(i => { if (i.category) cats.add(i.category) })
    return Array.from(cats)
  }, [rawItems])

  // Filtered items based on search and filters
  const filteredItems = useMemo(() => {
    return rawItems.filter(item => {
      if (vegOnly && item.is_veg === false) return false
      if (selectedCat !== 'all' && item.category !== selectedCat) return false
      if (menuSearch.trim()) {
        const q = menuSearch.toLowerCase().trim()
        const matchesName = item.name.toLowerCase().includes(q)
        const matchesCat = (item.category || '').toLowerCase().includes(q)
        if (!matchesName && !matchesCat) return false
      }
      return true
    })
  }, [rawItems, vegOnly, selectedCat, menuSearch])

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
            {meta.Icon ? <meta.Icon size={22} strokeWidth={2} style={{ color: meta.accentColor }} /> : <UtensilsCrossed size={22} strokeWidth={2} />}
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
            <span>{rawItems.length} items</span>
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
          {expanded ? 'Hide Menu' : `View Menu (${rawItems.length} items)`}
          {activeMindCat && activeMindCat !== 'all' && (
            <span style={{ fontSize: '11px', background: '#EFF6FF', color: 'var(--blue-primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 800, marginLeft: '6px' }}>
              {MIND_CATEGORIES.find(c => c.id === activeMindCat)?.label} ({rawItems.length})
            </span>
          )}
        </span>
        <div className={`collapse-chevron ${expanded ? 'open' : ''}`}>
          <ChevronDown size={17} />
        </div>
      </div>

      {/* ── Animated Menu Transition Box ── */}
      {expanded && (
        <div className="menu-list" style={{ padding: '0 16px 16px' }}>
          {/* In-Canteen Search & Sticky Category Pills (only when menu has more than 3 items or multiple categories) */}
          {(rawItems.length > 3 || categories.length > 1) && (
            <div className="outlet-menu-filter-bar">
              {rawItems.length > 3 && (
                <div className="outlet-search-input-wrap">
                  <Search size={14} />
                  <input
                    type="text"
                    className="outlet-search-input"
                    placeholder={`Search dishes in ${outlet.name}...`}
                    value={menuSearch}
                    onChange={e => setMenuSearch(e.target.value)}
                  />
                  {menuSearch && (
                    <button
                      onClick={() => setMenuSearch('')}
                      style={{ position: 'absolute', right: 10, background: 'none', border: 0, color: '#94A3B8', cursor: 'pointer', padding: 2 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              {(categories.length > 1 || (rawItems.some(i => i.is_veg === false) && rawItems.some(i => i.is_veg !== false))) && (
                <div className="outlet-menu-cat-chips">
                  {categories.length > 1 && (
                    <>
                      <button
                        type="button"
                        className={`outlet-cat-chip ${selectedCat === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedCat('all')}
                      >
                        All ({rawItems.length})
                      </button>
                      {categories.map(cat => {
                        const count = rawItems.filter(i => i.category === cat).length
                        return (
                          <button
                            key={cat}
                            type="button"
                            className={`outlet-cat-chip ${selectedCat === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCat(cat)}
                          >
                            {cat} ({count})
                          </button>
                        )
                      })}
                    </>
                  )}
                  {rawItems.some(i => i.is_veg === false) && rawItems.some(i => i.is_veg !== false) && (
                    <button
                      type="button"
                      className={`outlet-cat-chip ${vegOnly ? 'active' : ''}`}
                      style={vegOnly ? { background: '#059669', borderColor: '#059669', color: '#FFFFFF' } : {}}
                      onClick={() => setVegOnly(v => !v)}
                    >
                      Pure Veg
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748B', fontSize: '13px' }}>
              No dishes found matching your search.
            </div>
          ) : (
            filteredItems.map(item => {
              const inCart = outletCartItems.find(i => i.id === item.id)
              const foodImg = getFoodImage(item.name, item.category)
              const rStats = getItemRatingStats ? getItemRatingStats(item.id) : null
              const isSoldOut = item.available === false || item.stock_qty === 0 || !outlet.is_open

              return (
                <div className="food-flow-dish-card" key={item.id}>
                  {/* Left: Details Column */}
                  <div className="food-flow-dish-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className={item.is_veg !== false ? 'veg-icon' : 'nonveg-icon'}
                        title={item.is_veg !== false ? 'Vegetarian' : 'Non-Vegetarian'}
                      />
                      {item.is_bestseller !== false && (
                        <span className="food-flow-rating-pill" style={{ color: '#D97706', background: '#FEF3C7', borderColor: '#FDE68A' }}>
                          Bestseller
                        </span>
                      )}
                    </div>

                    <h4 className="food-flow-dish-name">{item.name}</h4>

                    <div className="food-flow-dish-price">
                      <span>{money(item.price)}</span>
                      {rStats && (
                        <span className="food-flow-rating-pill">
                          <Star size={10} fill="#F59E0B" color="#F59E0B" />
                          <strong>{rStats.avg}</strong>
                          <span style={{ opacity: 0.75, fontSize: '9.5px' }}>({rStats.count})</span>
                        </span>
                      )}
                    </div>

                    <div className="food-flow-dish-meta">
                      <span className="item-cat-pill">{item.category}</span>
                      {isSoldOut ? (
                        <span className="sold-out-pill">{!outlet.is_open ? 'Closed' : 'Sold Out'}</span>
                      ) : (
                        item.stock_qty !== undefined && item.stock_qty <= 10 && item.stock_qty > 0 && (
                          <span style={{ fontSize: '10px', color: '#B45309', fontWeight: 800, background: '#FEF3C7', padding: '1px 6px', borderRadius: '4px' }}>
                            Only {item.stock_qty} left!
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Right: Food Image with Overlapping + ADD Button */}
                  <div className="food-flow-dish-right">
                    <div className="food-flow-dish-img-box">
                      <img
                        src={foodImg.url}
                        alt={item.name}
                        className="food-flow-dish-img"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                      <div className="food-thumb-fallback" style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <UtensilsCrossed size={24} strokeWidth={1.75} className="text-slate-400" />
                      </div>
                    </div>

                    <div className="food-flow-add-btn-wrap">
                      {isSoldOut ? (
                        <span className="unavailable-btn" style={{ fontSize: '10px', padding: '3px 8px' }}>
                          {!outlet.is_open ? 'Closed' : 'Sold Out'}
                        </span>
                      ) : inCart ? (
                        <div className="food-flow-stepper-btn">
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
                          type="button"
                          className="food-flow-add-btn"
                          onClick={() => addToCart(outlet, item)}
                        >
                          ADD <Plus size={13} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CART DOCK (expanded with notes)
// ─────────────────────────────────────────────────────────────────────────────
function CartDock({
  cart, wallet, busy, placeOrder, addToCart, removeFromCart, updateCartItemNotes, setCart,
  pickupSlots = [], isScheduled, setIsScheduled, selectedSlotId, setSelectedSlotId,
  activeGroup, setShowGroupModal, availableCoupons = [], appliedCoupon, setAppliedCoupon, setNotice,
  onTopUpDeficit
}) {
  const [expanded, setExpanded] = useState(false)
  const [couponInput, setCouponInput] = useState('')

  const subtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0)
  const qty = cart.items.reduce((s, i) => s + i.qty, 0)
  const hasUnavailable = cart.items.some(i => i.available === false)
  const unavailableItems = cart.items.filter(i => i.available === false)

  // Compute discount on student-facing total
  let discount = 0
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'flat') {
      discount = Math.min(subtotal, appliedCoupon.discount_value)
    } else if (appliedCoupon.discount_type === 'percent') {
      discount = Math.min(subtotal, Math.round((subtotal * appliedCoupon.discount_value) / 100))
    }
  }
  const applicableBase = Math.max(0, subtotal - discount)
  const totalAdditionalFee = applicableBase > 0 ? Number((applicableBase * 0.07).toFixed(2)) : 0
  const convenienceFee = Number((totalAdditionalFee / 3).toFixed(2))
  const taxAndServiceCharges = Number((totalAdditionalFee - convenienceFee).toFixed(2))
  const finalDebit = Number((applicableBase + totalAdditionalFee).toFixed(2))
  const isInsufficient = wallet.balance < finalDebit
  const deficit = Math.max(0, finalDebit - wallet.balance)

  const outletSlots = pickupSlots.filter(s => s.outlet_id === cart.outlet?.id || s.outlet_id === 'g1')

  function handleApplyCoupon(codeToApply) {
    const code = (codeToApply || couponInput).trim().toUpperCase()
    if (!code) return
    const found = availableCoupons.find(c => c.code.toUpperCase() === code)
    if (!found) {
      if (setNotice) setNotice(`Coupon code "${code}" is invalid or expired.`)
      return
    }
    if (found.min_order_value && subtotal < found.min_order_value) {
      if (setNotice) setNotice(`Coupon "${code}" requires minimum order value of ${money(found.min_order_value)}.`)
      return
    }
    setAppliedCoupon(found)
    setCouponInput('')
    if (setNotice) setNotice(`Coupon "${found.code}" applied! You save with this offer.`)
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null)
    if (setNotice) setNotice('Coupon removed.')
  }

  return (
    <div className={`cart-dock ${expanded ? 'cart-dock-expanded' : ''}`}>
      {expanded && (
        <div className="cart-expanded-body">
          <div className="cart-expanded-header">
            <div>
              <strong>{cart.outlet?.name}</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <Store size={13} color="var(--blue-primary)" /> Campus Pickup
              </div>
            </div>
            <button className="cart-clear-btn" onClick={() => { setCart({ outlet: null, items: [] }); setExpanded(false) }}>
              Clear Cart
            </button>
          </div>

          {/* ── Feature 5: Group Ordering Banner ── */}
          {activeGroup ? (
            <div className="group-ticket-banner">
              <span>Group Cart #{activeGroup.code} (Payer: You)</span>
              <button
                className="cart-clear-btn"
                style={{ color: '#FFFFFF', padding: '2px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.2)' }}
                onClick={() => setShowGroupModal && setShowGroupModal(true)}
              >
                Manage ({activeGroup.members.length})
              </button>
            </div>
          ) : (
            <button
              className="btn-secondary btn-spring"
              style={{ padding: '6px 12px', fontSize: '12px', width: '100%', marginBottom: '12px', justifyContent: 'center' }}
              onClick={() => setShowGroupModal && setShowGroupModal(true)}
            >
              <Users size={13} /> Start Group Cart (Order Together)
            </button>
          )}

          {/* ── Feature 7: Scheduled Pickup Slots Selector ── */}
          <div style={{ marginBottom: '14px' }}>
            <div className="slot-toggle-bar">
              <button
                className={`slot-toggle-opt ${!isScheduled ? 'active' : ''}`}
                onClick={() => { setIsScheduled(false); setSelectedSlotId(null) }}
              >
                <Zap size={13} /> Immediate (10–15 mins)
              </button>
              <button
                className={`slot-toggle-opt ${isScheduled ? 'active' : ''}`}
                onClick={() => {
                  setIsScheduled(true)
                  if (!selectedSlotId && outletSlots.length > 0) {
                    const firstAvail = outletSlots.find(s => s.current_orders < s.max_orders)
                    if (firstAvail) setSelectedSlotId(firstAvail.id)
                  }
                }}
              >
                <Clock size={13} /> Pick up later
              </button>
            </div>

            {isScheduled && (
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Select pickup time:
                </p>
                <div className="slots-grid">
                  {outletSlots.map(slot => {
                    const isFull = slot.current_orders >= slot.max_orders
                    const isSelected = selectedSlotId === slot.id

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        className={`slot-pill ${isSelected ? 'selected' : ''} ${isFull ? 'full' : ''}`}
                        disabled={isFull}
                        onClick={() => setSelectedSlotId(slot.id)}
                        title={isFull ? 'This slot has reached capacity' : 'Select slot'}
                      >
                        <div style={{ fontWeight: 700 }}>{slot.time_label}</div>
                        {isFull && (
                          <div style={{ fontSize: '10px', color: '#EF4444', marginTop: 2 }}>
                            Full
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Feature 2: Unavailable Items Warning ── */}
          {hasUnavailable && (
            <div className="cart-clear-unavailable-banner">
              <div>
                <strong>{unavailableItems.length} item(s) currently sold out</strong>
                <div style={{ fontSize: '11.5px', marginTop: 2 }}>Remove flagged items to proceed to checkout.</div>
              </div>
              <button
                className="cart-remove-flagged-btn"
                onClick={() => {
                  const cleaned = cart.items.filter(i => i.available !== false)
                  setCart({ outlet: cleaned.length ? cart.outlet : null, items: cleaned })
                }}
              >
                Remove Sold Out
              </button>
            </div>
          )}

          {/* Cart items list */}
          {cart.items.map(item => {
            const foodImg = getFoodImage(item.name, item.category)
            const isAvail = item.available !== false
            return (
              <div className={`cart-item-row ${!isAvail ? 'unavailable-item' : ''}`} key={item.id}>
                <div className="cart-item-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={foodImg.url}
                    alt={item.name}
                    className="cart-thumb-img"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    style={{ opacity: !isAvail ? 0.5 : 1 }}
                  />
                  <div className="cart-qty-control">
                    <button onClick={() => removeFromCart(item.id)}><Minus size={13} /></button>
                    <span>{item.qty}</span>
                    <button onClick={() => isAvail && addToCart(cart.outlet, item)} disabled={!isAvail}><Plus size={13} /></button>
                  </div>
                  <div>
                    <span className="cart-item-name" style={{ textDecoration: !isAvail ? 'line-through' : 'none', color: !isAvail ? '#B91C1C' : 'inherit' }}>
                      {item.name}
                    </span>
                    {!isAvail && (
                      <div className="cart-item-unavailable-chip">
                        <AlertCircle size={11} /> {item.unavailableReason || 'Sold Out'}
                      </div>
                    )}
                    {isAvail && (
                      <input
                        className="cart-notes-input"
                        placeholder="Add note (e.g. less spicy)..."
                        value={item.notes || ''}
                        onChange={e => updateCartItemNotes(item.id, e.target.value)}
                      />
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="cart-item-price">{money(item.price * item.qty)}</span>
                  {!isAvail && (
                    <div>
                      <button
                        className="cart-remove-flagged-btn"
                        onClick={() => removeFromCart(item.id)}
                        style={{ marginTop: 4 }}
                        title="Remove out-of-stock item"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* ── Feature 8: Coupons & Promo Codes ── */}
          <div className="coupon-box" style={{ marginTop: '12px' }}>
            {appliedCoupon ? (
              <div className="applied-coupon-pill">
                <span>Promo <strong>{appliedCoupon.code}</strong> Applied: -{money(discount)}</span>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 0, color: '#15803D', fontWeight: 800, cursor: 'pointer', fontSize: '11.5px' }}
                  onClick={handleRemoveCoupon}
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="coupon-input-row">
                  <input
                    className="coupon-input"
                    placeholder="Enter Coupon / Promo Code..."
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value)}
                  />
                  <button
                    className="btn-secondary btn-spring"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                    onClick={() => handleApplyCoupon()}
                    disabled={!couponInput.trim()}
                  >
                    Apply
                  </button>
                </div>
                <div className="coupon-chip-row">
                  {availableCoupons.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      className="coupon-tag-btn btn-spring"
                      onClick={() => handleApplyCoupon(c.code)}
                    >
                      {c.code} ({c.discount_type === 'flat' ? `₹${c.discount_value} OFF` : `${c.discount_value}% OFF`})
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Enhanced Bill Details */}
            <div className="bill-summary-card">
              <div className="bill-summary-title">
                <Receipt size={14} /> Bill Summary
              </div>
              <div className="bill-summary-row">
                <span>Canteen Items</span>
                <span>{money(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="bill-summary-row savings">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>-{money(discount)}</span>
                </div>
              )}
              <div className="bill-summary-row">
                <span>Tax &amp; Service Charges</span>
                <span>{money(taxAndServiceCharges)}</span>
              </div>
              <div className="bill-summary-row">
                <span>Convenience Fee</span>
                <span>{money(convenienceFee)}</span>
              </div>
              <div className="bill-summary-row total">
                <span>Total</span>
                <span>{money(finalDebit)}</span>
              </div>
            </div>
          </div>

          {/* ── Deficit-Aware Wallet Top-Up Alert ── */}
          {isInsufficient && (
            <div className="cart-deficit-alert-banner">
              <div className="deficit-text-group">
                <div className="deficit-title">
                  <CreditCard size={15} /> Insufficient Wallet Balance
                </div>
                <div className="deficit-sub">
                  Balance: {money(wallet.balance)} · Missing: <strong>{money(deficit)}</strong>
                </div>
              </div>
              <button
                type="button"
                className="btn-deficit-action"
                onClick={() => onTopUpDeficit && onTopUpDeficit(deficit)}
              >
                + Top Up {money(deficit)}
              </button>
            </div>
          )}

          {hasUnavailable && (
            <p className="cart-balance-warn" style={{ color: '#DC2626', background: '#FEE2E2', borderColor: '#FECACA' }}>
              <AlertCircle size={14} /> Remove flagged out-of-stock item(s) to continue checkout.
            </p>
          )}
        </div>
      )}

      <div className="cart-dock-bar">
        <button className="cart-expand-btn" onClick={() => setExpanded(e => !e)}>
          <strong>{qty} Items {hasUnavailable && <span style={{ color: '#EF4444', fontSize: '11px', display: 'block' }}>Has Unavailable</span>}</strong>
          <small>{cart.outlet?.name}{isScheduled ? ' · Scheduled Pickup' : ' · Standard Pickup'}</small>
        </button>
        <div className="cart-dock-total">
          {discount > 0 && <small style={{ textDecoration: 'line-through', color: 'rgba(255,255,255,0.6)', marginRight: 6, fontSize: '12px' }}>{money(subtotal)}</small>}
          {money(finalDebit)}
        </div>
        {isInsufficient ? (
          <button
            type="button"
            className="btn-primary btn-deficit-topup"
            onClick={(e) => {
              e.stopPropagation()
              if (onTopUpDeficit) onTopUpDeficit(deficit)
            }}
          >
            + Top Up {money(deficit)} & Pay
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={() => placeOrder()}
            disabled={busy || isInsufficient || hasUnavailable || (isScheduled && !selectedSlotId)}
            style={{ background: hasUnavailable ? '#DC2626' : undefined }}
          >
            {busy ? 'Placing Pre-Order...' : hasUnavailable ? 'Remove Unavailable' : isScheduled ? 'Schedule Pre-Order' : 'Place Pre-Order'} <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT / INVOICE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ReceiptModal({ order, onClose }) {
  if (!order) return null

  function handleDownloadReceipt() {
    const itemsHtml = (order.order_items || []).map(it => `
      <tr>
        <td style="padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a;">
          <strong>${it.qty}×</strong> ${it.name} ${it.notes ? `<span style="color:#64748b; font-size: 11px;">(${it.notes})</span>` : ''}
        </td>
        <td style="padding: 7px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">
          ₹${((it.price || 0) * (it.qty || 1)).toLocaleString('en-IN')}
        </td>
      </tr>
    `).join('')

    const invoiceContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>V FOODS Official Receipt - Token #${order.token || order.id}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px 16px; background: #f8fafc; color: #0f172a; margin: 0; display: flex; justify-content: center; }
    .receipt { background: #ffffff; width: 100%; max-width: 400px; padding: 28px; border-radius: 16px; border: 1.5px solid #0f172a; box-shadow: 0 4px 20px rgba(0,0,0,0.06); box-sizing: border-box; }
    .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 14px; margin-bottom: 16px; }
    .token-box { text-align: center; background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 12px; padding: 12px; margin: 14px 0; }
    .token { font-size: 26px; font-weight: 900; color: #1d4ed8; font-family: monospace; letter-spacing: -0.5px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; margin: 5px 0; color: #475569; }
    .row strong { color: #0f172a; }
    .total-row { display: flex; justify-content: space-between; font-size: 17px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 14px; line-height: 1.5; }
    @media print { body { background: #fff; padding: 0; } .receipt { border: 1px solid #000; box-shadow: none; max-width: 100%; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div style="font-size: 20px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px;">V FOODS · VIT CHENNAI</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600;">Official Campus Dining Tax Invoice</div>
    </div>
    <div class="token-box">
      <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #2563eb; letter-spacing: 0.5px;">Pickup Token Pass</div>
      <div class="token">TOKEN #${order.token || order.id}</div>
      <div style="font-size: 11px; color: #16a34a; font-weight: 700; margin-top: 3px;">✓ Verified Paid (${order.payment_method || 'VIT Campus Wallet'})</div>
    </div>
    <div class="row"><span>Order ID:</span><strong>#${order.id}</strong></div>
    <div class="row"><span>Canteen / Counter:</span><strong>${order.outlets?.name || order.outlet_id}</strong></div>
    <div class="row"><span>Date & Time:</span><span>${new Date(order.created_at).toLocaleString('en-IN')}</span></div>
    <div class="row"><span>Payment Status:</span><span style="color:#16a34a; font-weight:700;">PAID</span></div>
    
    <div style="margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Itemized Order Breakdown</div>
      <table>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>

    <div class="total-row">
      <span>Total Paid</span>
      <span>${money(order.total)}</span>
    </div>

    <div class="footer">
      VIT Chennai Campus Dining Operations<br>
      Please present Token #${order.token || order.id} at the counter station for fast pickup.<br>
      Thank you for dining with V FOODS!
    </div>
  </div>
</body>
</html>`

    const blob = new Blob([invoiceContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `VFOODS-Receipt-Token-${order.token || order.id}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="receipt-modal-card modal-enter" onClick={e => e.stopPropagation()}>
        <div className="receipt-header">
          <img src="/vit-chennai-logo.png" alt="VIT" style={{ height: 44, margin: '0 auto 8px', display: 'block' }} />
          <h3>V FOODS · VIT Chennai</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Campus Dining e-Receipt & Tax Invoice</p>
        </div>
        <div className="receipt-row">
          <span>Order ID</span>
          <strong>#{order.id}</strong>
        </div>
        <div className="receipt-row">
          <span>Token Number</span>
          <strong style={{ color: 'var(--blue-primary)', fontFamily: 'var(--font-mono)', fontSize: '15px' }}>#{order.token}</strong>
        </div>
        <div className="receipt-row">
          <span>Outlet</span>
          <span>{order.outlets?.name || order.outlet_id}</span>
        </div>
        <div className="receipt-row">
          <span>Date & Time</span>
          <span>{new Date(order.created_at).toLocaleString('en-IN')}</span>
        </div>
        <div className="receipt-row">
          <span>Payment Status</span>
          <span style={{ color: '#059669', fontWeight: 700 }}>PAID ({order.payment_method || 'VIT Campus Wallet'})</span>
        </div>

        {/* Canteen Scannable QR Code on Receipt */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', margin: '14px 0', padding: '12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <ScannableQrCode value={`CB1.${order.id}.${order.token}`} size={75} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Pickup Pass & Verification</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--blue-primary)', fontFamily: 'var(--font-mono)' }}>TOKEN #{order.token}</div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} strokeWidth={2} /> Verified e-Invoice</div>
          </div>
        </div>

        <div style={{ margin: '14px 0 10px', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Itemized Order
          </div>
          {(order.order_items || []).map((it, idx) => {
            const foodImg = getFoodImage(it.name)
            return (
              <div key={idx} className="receipt-row" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={foodImg.url} alt={it.name} className="order-item-mini-thumb" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <span>{it.qty}× {it.name} {it.notes ? `(${it.notes})` : ''}</span>
                </div>
                <span>{money((it.price || 0) * (it.qty || 1))}</span>
              </div>
            )
          })}
        </div>

        <div className="receipt-row total-row">
          <span>Total Paid</span>
          <span>{money(order.total)}</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button className="btn-secondary btn-spring" style={{ flex: 1, justifyContent: 'center' }} onClick={handleDownloadReceipt} title="Download neat receipt file">
            <Download size={14} /> Download
          </button>
          <button className="btn-secondary btn-spring" style={{ flex: 1, justifyContent: 'center' }} onClick={() => window.print()} title="Print isolated receipt slip">
            <Printer size={14} /> Print
          </button>
          <button className="btn-primary btn-spring" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RATING MODAL (Phase 2 Step 1: Enforced for Collected Orders Only)
// ─────────────────────────────────────────────────────────────────────────────
function RatingModal({ order, onClose, submitItemRating, itemRatings = [] }) {
  const [starsMap, setStarsMap] = useState({})
  const [commentMap, setCommentMap] = useState({})
  const [submittedMap, setSubmittedMap] = useState({})

  useEffect(() => {
    const initialStars = {}
    const initialComments = {}
    const initialSubmitted = {}
    ;(order.order_items || []).forEach(it => {
      const itemId = it.item_id || it.id
      const existing = itemRatings.find(r => r.order_id === order.id && r.item_id === itemId)
      if (existing) {
        initialStars[itemId] = existing.rating
        initialComments[itemId] = existing.comment || ''
        initialSubmitted[itemId] = true
      } else {
        initialStars[itemId] = 5
      }
    })
    setStarsMap(initialStars)
    setCommentMap(initialComments)
    setSubmittedMap(initialSubmitted)
  }, [order, itemRatings])

  function handleRateItem(itemId) {
    const stars = starsMap[itemId] || 5
    const comment = commentMap[itemId] || ''
    if (submitItemRating) {
      submitItemRating(order.id, itemId, stars, comment)
    }
    setSubmittedMap(prev => ({ ...prev, [itemId]: true }))
  }

  return (
    <div className="ios-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="rating-modal-card modal-enter" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Verified Dining Feedback
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 900, margin: '2px 0 0', color: 'var(--blue-primary)' }}>
              Rate Your Meal · Order #{order.id}
            </h3>
          </div>
          <button className="cart-clear-btn" onClick={onClose} style={{ padding: 6 }}><X size={18} /></button>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: 16 }}>
          Only collected meals can be reviewed. Your ratings help others discover the best items on campus!
        </p>

        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {(order.order_items || []).map((it, idx) => {
            const itemId = it.item_id || it.id
            const currentStars = starsMap[itemId] || 5
            const isDone = submittedMap[itemId]
            const foodImg = getFoodImage(it.name)

            return (
              <div key={idx} className="rating-item-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={foodImg.url} alt={it.name} className="order-item-mini-thumb" onError={e => { e.currentTarget.style.display = 'none' }} />
                    <strong style={{ fontSize: '13.5px' }}>{it.name}</strong>
                  </div>
                  {isDone && (
                    <span style={{ fontSize: '11px', color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                      Rated ({currentStars} stars)
                    </span>
                  )}
                </div>

                {!isDone ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginRight: 4 }}>Stars:</span>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          className="rating-star-btn"
                          onClick={() => setStarsMap(prev => ({ ...prev, [itemId]: star }))}
                        >
                          <Star
                            size={18}
                            fill={star <= currentStars ? '#F59E0B' : 'none'}
                            color={star <= currentStars ? '#F59E0B' : '#CBD5E1'}
                          />
                        </button>
                      ))}
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#B45309', marginLeft: 4 }}>
                        {currentStars} / 5
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Optional feedback (e.g. Crispy, piping hot, fresh)..."
                      value={commentMap[itemId] || ''}
                      onChange={e => setCommentMap(prev => ({ ...prev, [itemId]: e.target.value }))}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: 8, border: '1px solid var(--border-color)', marginTop: 4 }}
                    />

                    <button
                      type="button"
                      className="btn-primary btn-spring"
                      style={{ alignSelf: 'flex-end', padding: '4px 12px', fontSize: '11px', marginTop: 4 }}
                      onClick={() => handleRateItem(itemId)}
                    >
                      Save Rating
                    </button>
                  </>
                ) : (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    "{commentMap[itemId] || 'Great dish!'}"
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <button className="btn-secondary btn-spring" style={{ width: '100%', marginTop: 14, justifyContent: 'center' }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL ORDER STEPPER (Phase 2 Step 6)
// ─────────────────────────────────────────────────────────────────────────────
function OrderStepper({ status, order }) {
  const steps = [
    { key: 'placed', label: 'Order Placed', desc: 'Confirmed', icon: Clock3 },
    { key: 'preparing', label: 'In Kitchen', desc: 'Cooking', icon: UtensilsCrossed },
    { key: 'ready', label: 'Counter Ready', desc: 'Pickup Now', icon: Bell },
    { key: 'collected', label: 'Completed', desc: 'Collected', icon: CheckCircle2 }
  ]
  const currentIndex = steps.findIndex(s => s.key === status)
  const isReady = status === 'ready'
  const isPrep = status === 'preparing'
  const isPlaced = status === 'placed'
  const isCollected = status === 'collected'

  const progressPercent = currentIndex <= 0 ? 8 : (currentIndex / (steps.length - 1)) * 100

  const statusHeadline = isReady
    ? 'Your Food is Ready for Pickup!'
    : isPrep
    ? 'Kitchen is Preparing Your Food with Care'
    : isPlaced
    ? 'Order Confirmed & Queued with Kitchen'
    : 'Order Completed & Picked Up'

  const statusSubline = isReady
    ? `Show Token #${order?.token || '---'} at the counter for pickup`
    : isPrep
    ? 'Estimated preparation time: 4-7 minutes'
    : isPlaced
    ? 'Canteen staff will begin preparation momentarily'
    : 'Enjoy your delicious campus meal!'

  return (
    <div className="food-flow-progress-card">
      <div className="food-flow-live-header">
        <div className="food-flow-live-status-badge">
          <span className="food-flow-pulse-dot" />
          <span>LIVE ORDER PROGRESS · {status.toUpperCase()}</span>
        </div>
        {!isCollected && (
          <div className="food-flow-eta-pill">
            <Clock size={12} />
            <span>{isReady ? 'READY NOW' : isPrep ? 'ETA: ~5 mins' : 'ETA: ~8 mins'}</span>
          </div>
        )}
      </div>

      <div className="food-flow-progress-headline">{statusHeadline}</div>
      <div className="food-flow-progress-subline">{statusSubline}</div>

      <div className="food-flow-stepper-track-wrap">
        <div className="food-flow-stepper-line">
          <div className="food-flow-stepper-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        {steps.map((step, idx) => {
          const IconComponent = step.icon
          const isDone = idx < currentIndex
          const isCurrent = idx === currentIndex

          return (
            <div
              key={step.key}
              className={`food-flow-step-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="food-flow-step-circle">
                {isDone ? <Check size={16} strokeWidth={3} /> : <IconComponent size={15} />}
              </div>
              <span className="food-flow-step-title">{step.label}</span>
              <span className="food-flow-step-desc">{step.desc}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP CART MODAL (Phase 2 Step 5)
// ─────────────────────────────────────────────────────────────────────────────
function GroupCartModal({ activeGroup, startGroupCart, joinGroupCart, leaveGroupCart, onClose }) {
  const [inputCode, setInputCode] = useState('')

  return (
    <div className="ios-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="rating-modal-card modal-enter" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EDE9FE', color: '#7C3AED', display: 'grid', placeItems: 'center' }}>
              <Users size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0, color: 'var(--blue-primary)' }}>Group Food Ordering</h3>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)' }}>Order together with friends · 1 person pays at checkout</p>
            </div>
          </div>
          <button className="cart-clear-btn" onClick={onClose} style={{ padding: 6 }}><X size={18} /></button>
        </div>

        {activeGroup ? (
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14, border: '1px solid #E2E8F0', marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#6D28D9' }}>Active Group Cart</span>
              <span className="group-badge-chip">Join Code: {activeGroup.code}</span>
            </div>
            <p style={{ fontSize: 12.5, color: '#475569', margin: '8px 0 12px' }}>
              Share this code with roommates or batchmates so they can add items to your cart:
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                readOnly
                value={`https://vfoods-web.onrender.com/?join=${activeGroup.code}`}
                style={{ flex: 1, padding: '7px 10px', fontSize: 11.5, borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF' }}
              />
              <button
                className="btn-secondary btn-spring"
                style={{ padding: '6px 12px', fontSize: 11.5 }}
                onClick={() => {
                  if (navigator.clipboard) navigator.clipboard.writeText(activeGroup.code)
                  alert(`Copied Join Code: ${activeGroup.code}`)
                }}
              >
                Copy
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>Group Members:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {activeGroup.members.map((m, idx) => (
                  <span key={idx} style={{ background: '#EDE9FE', color: '#6D28D9', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <button
              className="btn-secondary btn-spring"
              style={{ width: '100%', marginTop: 16, color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
              onClick={leaveGroupCart}
            >
              Exit Group Cart
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800 }}>Start a New Group</h4>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                You will be the group payer. A join code will be generated to share with your friends.
              </p>
              <button
                className="btn-primary btn-spring"
                style={{ width: '100%', padding: '9px 14px', fontSize: 13, background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}
                onClick={startGroupCart}
              >
                <Users size={14} /> Create Group Cart
              </button>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800 }}>Join Friend's Group</h4>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                Enter the 6-character code shared by your friend to order food with them:
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="e.g. VFOODS-82"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.toUpperCase())}
                  style={{ flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 800, borderRadius: 8, border: '1px solid #CBD5E1', textTransform: 'uppercase' }}
                />
                <button
                  className="btn-secondary btn-spring"
                  disabled={!inputCode.trim()}
                  onClick={() => joinGroupCart(inputCode)}
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        <button className="btn-secondary btn-spring" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// ORDERS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function OrdersView({ orders, repeatOrder, itemRatings, submitItemRating, onExploreCanteens }) {
  const [receiptOrder, setReceiptOrder] = useState(null)
  const active   = orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled')
  const past     = orders.filter(o => o.status === 'collected' || o.status === 'cancelled')
  const mostRecentPast = past.find(o => o.status === 'collected' && (o.order_items || []).length > 0)
  const [ordersTab, setOrdersTab] = useState(active.length > 0 ? 'active' : 'past')

  return (
    <section className="tab-content-enter">
      {receiptOrder && <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />}

      {/* ── Segmented Orders Toggle (Active vs Past) ── */}
      <div className="orders-segmented-bar">
        <button
          type="button"
          className={`orders-tab-btn ${ordersTab === 'active' ? 'active' : ''}`}
          onClick={() => setOrdersTab('active')}
        >
          <Clock size={15} />
          <span>Active Orders</span>
          <span className={`orders-tab-counter ${active.length > 0 ? 'pulse-live' : ''}`}>
            {active.length}
          </span>
        </button>
        <button
          type="button"
          className={`orders-tab-btn ${ordersTab === 'past' ? 'active' : ''}`}
          onClick={() => setOrdersTab('past')}
        >
          <Package size={15} />
          <span>Past Orders</span>
          <span className="orders-tab-counter">
            {past.length}
          </span>
        </button>
      </div>

      {ordersTab === 'active' && (
        <>
          {active.length === 0 ? (
            <div className="orders-empty-card">
              <div className="orders-empty-icon-wrap">
                <UtensilsCrossed size={28} />
              </div>
              <h3>No Active Orders Today!</h3>
              <p>You don't have any meals currently being prepared or awaiting pickup. Explore campus canteens to place an order!</p>
              <button
                type="button"
                className="btn-primary btn-spring"
                style={{ margin: '0 auto', display: 'inline-flex' }}
                onClick={() => onExploreCanteens && onExploreCanteens()}
              >
                <Store size={15} /> Explore Campus Canteens
              </button>
            </div>
          ) : (
            active.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                repeatOrder={repeatOrder}
                onShowReceipt={setReceiptOrder}
                itemRatings={itemRatings}
                submitItemRating={submitItemRating}
              />
            ))
          )}
        </>
      )}

      {ordersTab === 'past' && (
        <>
          {/* ── Feature 2: My Usual Quick Reorder Banner ── */}
          {mostRecentPast && (
            <div className="my-usual-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0
                }}>
                  <Zap size={20} strokeWidth={2} className="fill-white" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '15px', color: '#065F46' }}>My Usual (1-Tap Reorder)</strong>
                    <span style={{ fontSize: '11px', background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      {mostRecentPast.outlets?.name || mostRecentPast.outlet_id}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#334155' }}>
                    {(mostRecentPast.order_items || []).map(i => `${i.name} × ${i.qty}`).join(', ')} · <strong>{money(mostRecentPast.total)}</strong>
                  </p>
                </div>
              </div>
              <button
                className="reorder-btn btn-spring"
                onClick={() => repeatOrder(mostRecentPast)}
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}
                title="Reorder this exact meal into your cart"
              >
                <Repeat size={14} /> Reorder My Usual
              </button>
            </div>
          )}

          {!past.length ? (
            <div className="orders-empty-card">
              <div className="orders-empty-icon-wrap">
                <ShoppingBag size={28} />
              </div>
              <h3>No Past Orders Recorded</h3>
              <p>Your previous orders and digital receipts will show up here as soon as you complete your first order.</p>
              <button
                type="button"
                className="btn-primary btn-spring"
                style={{ margin: '0 auto', display: 'inline-flex' }}
                onClick={() => onExploreCanteens && onExploreCanteens()}
              >
                <Store size={15} /> Order Now
              </button>
            </div>
          ) : (
            past.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                repeatOrder={repeatOrder}
                onShowReceipt={setReceiptOrder}
                itemRatings={itemRatings}
                submitItemRating={submitItemRating}
              />
            ))
          )}
        </>
      )}
    </section>
  )
}

function OrderCard({ order, repeatOrder, onShowReceipt, itemRatings, submitItemRating }) {
  const [showQrModal, setShowQrModal] = useState(false)
  const [showRateModal, setShowRateModal] = useState(false)
  const stepIndex = statuses.indexOf(order.status)
  const isReady   = order.status === 'ready'
  const isCancelled = order.status === 'cancelled'
  const minsAgo = Math.max(0, Math.round((Date.now() - new Date(order.created_at)) / 60000))

  return (
    <article className={`order-card ${isCancelled ? 'order-cancelled' : ''} ${isReady ? 'pulse-ready-glow' : ''}`}>
      {showQrModal && <QrEnlargeModal order={order} onClose={() => setShowQrModal(false)} />}
      {showRateModal && (
        <RatingModal
          order={order}
          onClose={() => setShowRateModal(false)}
          submitItemRating={submitItemRating}
          itemRatings={itemRatings}
        />
      )}
      <div className="order-head">
        <div>
          <span className="location-tag">ORDER #{order.id} · {order.outlets?.name || order.outlet_id}</span>
          <h3>{money(order.total)}</h3>
          <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {new Date(order.created_at).toLocaleString('en-IN')} ({minsAgo} min ago)
          </small>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className={`status-badge ${order.status}`}>{order.status}</span>
          {order.status === 'collected' && (
            <button
              className="btn-secondary btn-spring"
              style={{ padding: '6px 12px', fontSize: '12px', background: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' }}
              onClick={() => setShowRateModal(true)}
              title="Rate dishes from this collected order"
            >
              <Star size={13} fill="#F59E0B" color="#F59E0B" /> Rate Food
            </button>
          )}
          {!isCancelled && (
            <button className="btn-secondary btn-spring" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowQrModal(true)} title="Show full QR for counter scan">
              <QrCode size={13} /> QR Pass
            </button>
          )}
          <button className="btn-secondary btn-spring" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => onShowReceipt && onShowReceipt(order)}>
            <FileText size={13} /> Receipt
          </button>
          {!isCancelled && (
            <button
              className="btn-secondary btn-spring reorder-btn"
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={() => repeatOrder(order)}
              title="Reorder this past order into your cart"
            >
              <Repeat size={13} /> Reorder
            </button>
          )}
        </div>
      </div>

      {/* ── Feature 6: Visual Order Stepper ── */}
      {!isCancelled && <OrderStepper status={order.status} order={order} />}

      {/* ── Badges for Scheduled Slots & Group Orders ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        {order.pickup_slot_time && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EFF6FF', color: '#1E40AF', padding: '3px 8px', borderRadius: 6, fontSize: '11px', fontWeight: 700 }}>
            <Clock size={12} /> Scheduled Pickup: {order.pickup_slot_time}
          </span>
        )}
        {order.group_id && (
          <span className="group-badge-chip">
            <Users size={12} /> Group Order {order.is_group_payer ? '(Payer: You)' : ''}
          </span>
        )}
        {order.coupon_code && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 6, fontSize: '11px', fontWeight: 700 }}>
            Promo {order.coupon_code} Applied
          </span>
        )}
      </div>

      {/* ── Order Items with Food Images ── */}
      <div className="order-items-list">
        {(order.order_items || []).map((item, idx) => {
          const foodImg = getFoodImage(item.name)
          return (
            <div key={idx} className="item-chip-wrap">
              <div className="order-item-mini-card">
                <img
                  src={foodImg.url}
                  alt={item.name}
                  className="order-item-mini-thumb"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="item-chip">{item.name} × {item.qty}</span>
              </div>
              {item.notes && <span className="item-notes-chip">{item.notes}</span>}
            </div>
          )
        })}
      </div>

      {/* ── Order QR Code Banner (Active immediately upon order placement) ── */}
      {!isCancelled && (
        <div className={`order-qr-banner ${isReady ? 'pulse-ready-glow' : ''}`}>
          <div className="order-qr-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="token-badge" style={{ margin: 0 }}>TOKEN #{order.token}</div>
              {isReady && <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', background: '#D1FAE5', padding: '2px 8px', borderRadius: '6px' }}>READY FOR PICKUP</span>}
            </div>
            <span className="order-qr-hint">
              {isReady ? 'Ready at counter! Present QR to staff' : 'Order placed! Counter verification QR code generated'}
            </span>
            <button className="btn-secondary btn-spring qr-zoom-btn" onClick={() => setShowQrModal(true)}>
              <Maximize2 size={12} /> Fullscreen QR Pass
            </button>
          </div>
          <div className="order-qr-thumb-wrap" onClick={() => setShowQrModal(true)} title="Tap to enlarge QR Pass">
            <ScannableQrCode value={`CB1.${order.id}.${order.token}`} size={76} />
            <small style={{ display: 'block', textAlign: 'center', fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', marginTop: '2px' }}>
              TAP TO ZOOM
            </small>
          </div>
        </div>
      )}
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WALLET VIEW
// ─────────────────────────────────────────────────────────────────────────────
function WalletView({ wallet, topUp, busy, currentUser, setNotice, creditWalletBalance, prefilledAmount, setPrefilledAmount }) {
  const [filter, setFilter] = useState('all') // 'all' | 'credit' | 'debit'
  const [customAmt, setCustomAmt] = useState(prefilledAmount ? String(prefilledAmount) : '')

  useEffect(() => {
    if (prefilledAmount) {
      setCustomAmt(String(prefilledAmount))
    }
  }, [prefilledAmount])

  const income  = wallet.transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const spent   = wallet.transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)

  const filteredTxns = (wallet.transactions || []).filter(tx => {
    if (filter === 'credit') return tx.amount > 0
    if (filter === 'debit') return tx.amount < 0
    return true
  })

  function handleCustomTopup(e) {
    e.preventDefault()
    const val = parseInt(customAmt, 10)
    if (val && val > 0) {
      topUp(val)
      setCustomAmt('')
      if (setPrefilledAmount) setPrefilledAmount(null)
    }
  }

  return (
    <section className="tab-content-enter">
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

        {prefilledAmount && (
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1.5px solid #38BDF8',
            borderRadius: '10px',
            padding: '8px 14px',
            margin: '12px 0 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#38BDF8',
            fontSize: '12.5px',
            fontWeight: 700
          }}>
            <span><Sparkles size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} /> Auto-filled <strong>{money(prefilledAmount)}</strong> needed for your cart checkout</span>
            <button
              type="button"
              style={{ background: 'transparent', border: 0, color: '#FFFFFF', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}
              onClick={() => { if (setPrefilledAmount) setPrefilledAmount(null); setCustomAmt(''); }}
            >
              Clear
            </button>
          </div>
        )}

        <p style={{ marginBottom: '14px', color: '#94A3B8', fontSize: '13px' }}>Instant UPI / Card / Netbanking top-up:</p>
        <div className="topup-grid">
          {[100, 200, 500, 1000, 2000].map(amt => (
            <button className="topup-btn btn-spring" key={amt} onClick={() => topUp(amt)} disabled={busy}>
              <Plus size={16} /> {money(amt)}
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomTopup} style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <input
            type="number"
            placeholder="Custom amount (₹)..."
            value={customAmt}
            onChange={e => setCustomAmt(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', outline: 0, fontFamily: 'var(--font-body)' }}
          />
          <button type="submit" className="btn-primary btn-spring" disabled={busy || !customAmt}>
            Add Money
          </button>
        </form>
      </div>


      <div className="section-heading" style={{ marginTop: '24px' }}>
        <div><h2>Transaction Ledger</h2></div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', 'credit', 'debit'].map(f => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: '11.5px' }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'credit' ? 'Credits (+)' : 'Debits (-)'}
            </button>
          ))}
        </div>
      </div>

      <div className="transaction-list">
        {filteredTxns.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No transactions found for this filter.</p>
          </div>
        ) : (
          filteredTxns.map(tx => {
            const isPos = tx.amount > 0
            return (
              <div className="transaction-row card-lift-hover" key={tx.id}>
                <div className={`txn-icon ${isPos ? 'txn-in' : 'txn-out'}`}>
                  {isPos ? <TrendingUp size={16} /> : <ShoppingBag size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '14px' }}>{tx.kind}</strong>
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>
                    {new Date(tx.created_at || Date.now()).toLocaleString('en-IN')} · {tx.ref}
                  </small>
                </div>
                <div className="txn-amount" style={{ color: isPos ? '#059669' : 'var(--text-main)', fontWeight: 800 }}>
                  {isPos ? '+' : ''}{money(tx.amount)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE VIEW (USER DASHBOARD)
// ─────────────────────────────────────────────────────────────────────────────
function ProfileView({ currentUser, wallet, orders, onNavigate, onSignOut, setNotice }) {
  const activeOrdersCount = orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled').length
  const totalOrdersCount = orders.length

  const initials = (currentUser?.full_name || 'User')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'US'

  return (
    <section className="profile-container tab-content-enter">
      {/* Hero Identity Card */}
      <div className="profile-hero-card">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-online-dot" title="Account Active" />
        </div>
        <div className="profile-hero-info">
          <h2>{currentUser?.full_name || 'V FOODS User'}</h2>
          <div className="profile-hero-meta">
            <span className="profile-role-pill">
              <User size={12} strokeWidth={2.5} /> User
            </span>
          </div>
          <div className="profile-contact-text">
            <span>{currentUser?.email || ''}</span>
            {currentUser?.mobile_number || currentUser?.phone ? (
              <>
                <span>·</span>
                <span>{currentUser?.mobile_number || currentUser?.phone}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="profile-stats-grid">
        <div className="profile-stat-box">
          <div className="profile-stat-label">
            <Banknote size={14} color="var(--blue-primary)" /> Campus Wallet
          </div>
          <div className="profile-stat-value" style={{ color: 'var(--blue-primary)' }}>
            {money(wallet?.balance || 0)}
          </div>
          <button className="profile-stat-action" onClick={() => onNavigate('wallet')}>
            Top Up Balance <ChevronRight size={14} />
          </button>
        </div>

        <div className="profile-stat-box">
          <div className="profile-stat-label">
            <Clock size={14} color="var(--emerald)" /> Active Pre-Orders
          </div>
          <div className="profile-stat-value" style={{ color: activeOrdersCount > 0 ? 'var(--emerald)' : 'var(--text-main)' }}>
            {activeOrdersCount} {activeOrdersCount === 1 ? 'order' : 'orders'}
          </div>
          <button className="profile-stat-action" onClick={() => onNavigate('orders')}>
            Track Live Orders <ChevronRight size={14} />
          </button>
        </div>

        <div className="profile-stat-box">
          <div className="profile-stat-label">
            <Package size={14} color="#6366F1" /> Total Pre-Orders
          </div>
          <div className="profile-stat-value">
            {totalOrdersCount}
          </div>
          <button className="profile-stat-action" onClick={() => onNavigate('orders')}>
            View Order History <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Campus Dining & Pickup Details */}
      <div className="profile-section-card">
        <div className="profile-section-header">
          <MapPin size={16} /> Campus Dining & Pickup Details
        </div>

        <div className="profile-info-row">
          <div className="profile-info-left">
            <div className="profile-icon-pill">
              <Store size={18} />
            </div>
            <div>
              <div className="profile-info-title">Primary Pickup Hubs</div>
              <div className="profile-info-desc">Gazebo Main Canteen, North Square & AB3 Kitchen</div>
            </div>
          </div>
          <span className="profile-info-badge">
            13 Counters Open
          </span>
        </div>

        <div className="profile-info-row">
          <div className="profile-info-left">
            <div className="profile-icon-pill">
              <Zap size={18} />
            </div>
            <div>
              <div className="profile-info-title">Queue Skipping (Token Pickup)</div>
              <div className="profile-info-desc">Pre-order online, track preparation live, show token code at counter</div>
            </div>
          </div>
          <span className="profile-info-badge" style={{ color: 'var(--emerald)', background: '#ECFDF5', borderColor: '#A7F3D0' }}>
            Instant Token
          </span>
        </div>
      </div>

      {/* Account Settings & App Information */}
      <div className="profile-section-card">
        <div className="profile-section-header">
          <Settings size={16} /> Preferences & Campus System Info
        </div>

        <div className="profile-info-row">
          <div className="profile-info-left">
            <div className="profile-icon-pill">
              <Bell size={18} />
            </div>
            <div>
              <div className="profile-info-title">Order Status Alerts</div>
              <div className="profile-info-desc">Instant push notifications & SMS when kitchen readies your order</div>
            </div>
          </div>
          <span className="profile-info-badge" style={{ color: 'var(--emerald)', background: '#ECFDF5', borderColor: '#A7F3D0' }}>
            Enabled
          </span>
        </div>

        <div className="profile-info-row">
          <div className="profile-info-left">
            <div className="profile-icon-pill">
              <CreditCard size={18} />
            </div>
            <div>
              <div className="profile-info-title">Primary Payment Mode</div>
              <div className="profile-info-desc">PhonePe UPI Gateway & Pre-loaded V FOODS Digital Wallet</div>
            </div>
          </div>
          <span className="profile-info-badge">
            PhonePe / Wallet
          </span>
        </div>

        <div className="profile-info-row">
          <div className="profile-info-left">
            <div className="profile-icon-pill">
              <Headphones size={18} />
            </div>
            <div>
              <div className="profile-info-title">Campus Dining Helpdesk</div>
              <div className="profile-info-desc">dining-support@vitchennai.ac.in · Ext: 3993</div>
            </div>
          </div>
          <span className="profile-info-badge">
            Helpdesk Open
          </span>
        </div>

        <div className="profile-info-row">
          <div className="profile-info-left">
            <div className="profile-icon-pill">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="profile-info-title">V FOODS Version</div>
              <div className="profile-info-desc">Production Campus Release · PWA & Realtime Webhooks</div>
            </div>
          </div>
          <span className="profile-info-badge">
            v2.4.0
          </span>
        </div>
      </div>

      {/* Sign Out Card */}
      <div className="profile-section-card" style={{ padding: '16px 20px' }}>
        <button className="profile-logout-btn" onClick={onSignOut}>
          <LogOut size={18} /> Sign Out of V FOODS Account
        </button>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOD ITEM CRUD MODAL (ADD / EDIT / DELETE / STOCK / AVAILABILITY)
// ─────────────────────────────────────────────────────────────────────────────
function FoodItemModal({
  isOpen,
  onClose,
  outlet,
  item = null,
  onSave,
  onDelete
}) {
  if (!isOpen || !outlet) return null

  const isEdit = Boolean(item)
  const [name, setName] = useState(item?.name || '')
  const [price, setPrice] = useState(item?.price !== undefined ? item.price.toString() : '')
  const [category, setCategory] = useState(item?.category ? item.category.toLowerCase() : 'snacks')
  const [customCat, setCustomCat] = useState('')
  const [isVeg, setIsVeg] = useState(item?.is_veg !== undefined ? item.is_veg : true)
  const [stockQty, setStockQty] = useState(item?.stock_qty !== undefined ? item.stock_qty : 30)
  const [available, setAvailable] = useState(item?.available !== undefined ? item.available : true)
  const [description, setDescription] = useState(item?.description || '')

  const standardCategories = [
    { id: 'snacks', label: 'Snacks & Rolls' },
    { id: 'meals', label: 'Biryani & Meals' },
    { id: 'beverages', label: 'Juices, Chai & Drinks' },
    { id: 'desserts', label: 'Sweets & Desserts' },
    { id: 'breakfast', label: 'South Indian & Breakfast' },
    { id: 'lunch', label: 'Lunch Combos' },
    { id: 'dinner', label: 'Dinner & Breads' },
    { id: 'starters', label: 'Crispy Starters' },
    { id: 'store', label: 'Packaged & Store' }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      alert('Please enter a food item name.')
      return
    }
    const numPrice = parseFloat(price)
    if (isNaN(numPrice) || numPrice < 0) {
      alert('Please enter a valid price (₹).')
      return
    }

    const finalCat = category === '__custom__' ? (customCat.trim().toLowerCase() || 'snacks') : category
    const numStock = Math.max(0, parseInt(stockQty, 10) || 0)

    const payload = {
      name: trimmedName,
      price: numPrice,
      category: finalCat,
      is_veg: Boolean(isVeg),
      stock_qty: numStock,
      available: Boolean(available && numStock > 0),
      description: description.trim()
    }

    onSave(outlet.id, payload, item?.id)
    onClose()
  }

  const handleDelete = () => {
    if (!item) return
    if (window.confirm(`Permanently delete "${item.name}" from ${outlet.name}'s menu? This cannot be undone.`)) {
      if (onDelete) onDelete(outlet.id, item.id)
      onClose()
    }
  }

  return (
    <div className="food-item-modal-overlay" onClick={onClose}>
      <div className="food-item-modal-card" onClick={e => e.stopPropagation()}>
        <div className="food-item-modal-header">
          <div>
            <span className="food-modal-tag">{isEdit ? 'EDIT DISH & INVENTORY' : 'NEW FOOD ITEM'}</span>
            <h3 style={{ margin: '4px 0 2px', fontSize: '18px', fontWeight: 800 }}>{isEdit ? `Edit: ${item.name}` : 'Add New Food Item'}</h3>
            <p className="food-modal-sub" style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
              Outlet: <strong>{outlet.name}</strong>
            </p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="food-item-modal-body">
          {/* Item Name */}
          <div className="food-form-group">
            <label className="food-form-label">
              Food Item Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Masala Dosa, Chicken Roll, Cold Coffee"
              required
              className="food-form-input"
              autoFocus={!isEdit}
            />
          </div>

          {/* Price & Portions Grid */}
          <div className="food-form-grid-2">
            <div className="food-form-group">
              <label className="food-form-label">
                Selling Price (₹) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div className="price-input-wrapper">
                <span className="price-currency-symbol">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="e.g. 50"
                  required
                  className="food-form-input price-input"
                />
              </div>
            </div>

            <div className="food-form-group">
              <label className="food-form-label">
                Portion Stock Count <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div className="stock-modal-stepper">
                <button
                  type="button"
                  className="modal-step-btn"
                  onClick={() => setStockQty(Math.max(0, (parseInt(stockQty, 10) || 0) - 5))}
                  title="Decrease 5"
                >
                  -5
                </button>
                <input
                  type="number"
                  min="0"
                  value={stockQty}
                  onChange={e => {
                    const val = Math.max(0, parseInt(e.target.value, 10) || 0)
                    setStockQty(val)
                    if (val === 0) setAvailable(false)
                    else if (!available) setAvailable(true)
                  }}
                  className="food-form-input stock-input"
                />
                <button
                  type="button"
                  className="modal-step-btn"
                  onClick={() => setStockQty((parseInt(stockQty, 10) || 0) + 5)}
                  title="Increase 5"
                >
                  +5
                </button>
                <button
                  type="button"
                  className="modal-step-btn reset"
                  onClick={() => { setStockQty(30); setAvailable(true); }}
                  title="Reset to 30 portions"
                >
                  30
                </button>
              </div>
            </div>
          </div>

          {/* Dietary Type: Veg vs Non-Veg */}
          <div className="food-form-group">
            <label className="food-form-label">Dietary Classification</label>
            <div className="dietary-toggle-group">
              <button
                type="button"
                className={`dietary-btn veg ${isVeg ? 'active' : ''}`}
                onClick={() => setIsVeg(true)}
              >
                <span className="veg-icon" />
                <span>Vegetarian (Pure Veg)</span>
              </button>
              <button
                type="button"
                className={`dietary-btn nonveg ${!isVeg ? 'active' : ''}`}
                onClick={() => setIsVeg(false)}
              >
                <span className="nonveg-icon" />
                <span>Non-Vegetarian</span>
              </button>
            </div>
          </div>

          {/* Category Selection */}
          <div className="food-form-group">
            <label className="food-form-label">Item Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="food-form-input"
            >
              {standardCategories.map(c => (
                <option key={c.id} value={c.id}>{c.label} ({c.id})</option>
              ))}
              <option value="__custom__">Custom Category...</option>
            </select>
            {category === '__custom__' && (
              <input
                type="text"
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                placeholder="Enter custom category (e.g., chaat, noodles)"
                className="food-form-input"
                style={{ marginTop: '8px' }}
                autoFocus
              />
            )}
          </div>

          {/* Kitchen Availability Status */}
          <div className="food-form-group">
            <label className="food-form-label">Kitchen Status & Availability</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: available && stockQty > 0 ? '#059669' : '#DC2626' }}>
                  {available && stockQty > 0 ? 'Available' : 'Sold Out'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {available && stockQty > 0 ? `${stockQty} portions in kitchen` : 'Displays as "Sold Out" on the app'}
                </div>
              </div>
              <button
                type="button"
                className={`stock-avail-btn btn-spring ${available && stockQty > 0 ? 'btn-action-zero' : 'btn-action-restock'}`}
                style={{ padding: '8px 16px', fontSize: '12px', minWidth: '150px' }}
                onClick={() => {
                  if (available && stockQty > 0) {
                    setAvailable(false)
                    setStockQty(0)
                  } else {
                    setAvailable(true)
                    setStockQty(stockQty > 0 ? stockQty : 30)
                  }
                }}
              >
                {available && stockQty > 0 ? 'Mark Unavailable' : 'Mark Available'}
              </button>
            </div>
          </div>

          {/* Description & Item Details */}
          <div className="food-form-group">
            <label className="food-form-label">
              Description & Preparation Details <small style={{ color: 'var(--text-muted)' }}>(Optional)</small>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Freshly made on tawa with homemade chutney and spiced potato masala."
              className="food-form-input food-form-textarea"
            />
          </div>

          {/* Modal Actions Footer */}
          <div className="food-item-modal-footer">
            {isEdit && (
              <button
                type="button"
                className="btn-danger btn-spring"
                onClick={handleDelete}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={14} />
                <span>Delete Dish</span>
              </button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary btn-spring"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary btn-spring"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Check size={15} />
                <span>{isEdit ? 'Save Changes' : 'Add Food Item'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOP OWNER CONSOLE (CANTEEN FRANCHISEE / OWNER PORTAL)
// ─────────────────────────────────────────────────────────────────────────────
function ShopOwnerConsole({
  profile, orders, outlets, toggleOutletOpen, updateItemStockQty,
  toggleItemAvailability, addMenuItem, updateMenuItem, deleteMenuItem,
  setNotice, addAuditLog, getItemRatingStats
}) {
  const [ownerTab, setOwnerTab] = useState('overview') // 'overview' | 'menu' | 'staff' | 'settlement'
  const [rushMode, setRushMode] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all')

  // Food Item CRUD modal state
  const [foodModalOpen, setFoodModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState(null)

  // Staff Team state for Shop Admin
  const [staffRoster, setStaffRoster] = useState([
    { id: 'st-1', name: 'Ramesh K', role: 'Head Cook & KOT Handler', phone: '+91 9876543220', shift: 'Morning & Lunch (07:30 - 15:30)', status: 'ON DUTY' },
    { id: 'st-2', name: 'Murugan P', role: 'Pickup Verification & QR Scanner', phone: '+91 9876543221', shift: 'Full Day (08:00 - 18:00)', status: 'ON DUTY' },
    { id: 'st-3', name: 'Selvan T', role: 'Kitchen Helper / Stock Keeper', phone: '+91 9876543222', shift: 'Evening Shift (15:00 - 21:30)', status: 'ON DUTY' },
  ])
  const [staffModalOpen, setStaffModalOpen] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState(null)
  const [staffForm, setStaffForm] = useState({ name: '', role: '', phone: '', shift: '' })

  const handleOpenAddStaff = () => {
    setEditingStaffId(null)
    setStaffForm({ name: '', role: 'Counter Operator', phone: '', shift: 'Morning Shift (08:00 - 16:00)' })
    setStaffModalOpen(true)
  }

  const handleOpenEditStaff = (st) => {
    setEditingStaffId(st.id)
    setStaffForm({ name: st.name, role: st.role, phone: st.phone, shift: st.shift })
    setStaffModalOpen(true)
  }

  const handleSaveStaff = (e) => {
    e.preventDefault()
    if (!staffForm.name.trim()) return
    if (editingStaffId) {
      setStaffRoster(prev => prev.map(s => s.id === editingStaffId ? { ...s, ...staffForm } : s))
      if (setNotice) setNotice(`Updated staff details for ${staffForm.name}`)
    } else {
      const newSt = {
        id: `st-${Date.now()}`,
        ...staffForm,
        status: 'ON DUTY'
      }
      setStaffRoster(prev => [...prev, newSt])
      if (setNotice) setNotice(`Added ${staffForm.name} to ${myOutlet.name} staff`)
    }
    setStaffModalOpen(false)
  }

  const handleToggleStaffStatus = (stId) => {
    setStaffRoster(prev => prev.map(s => {
      if (s.id !== stId) return s
      const nextStatus = s.status === 'ON DUTY' ? 'DEACTIVATED' : 'ON DUTY'
      if (setNotice) setNotice(`${s.name} is now ${nextStatus}`)
      return { ...s, status: nextStatus }
    }))
  }

  const myOutlet = outlets.find(o => o.id === profile.outlet_id) || outlets[0]
  const myOrders = orders.filter(o => o.outlet_id === myOutlet.id)
  const todayOrders = myOrders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0)
  const activeOrdersCount = myOrders.filter(o => o.status !== 'collected' && o.status !== 'cancelled').length
  const avgOrderVal = todayOrders.length > 0 ? Math.round(todayRevenue / todayOrders.length) : 0

  // Categories present in myOutlet
  const ownerCategories = useMemo(() => {
    const cats = new Set(['all'])
    ;(myOutlet.menu_items || []).forEach(i => {
      if (i.category) cats.add(i.category.toLowerCase())
    })
    return Array.from(cats)
  }, [myOutlet])

  const openAddItem = () => {
    setModalItem(null)
    setFoodModalOpen(true)
  }

  const openEditItem = (item) => {
    setModalItem(item)
    setFoodModalOpen(true)
  }

  return (
    <div className="tab-content-enter">
      {/* Owner Top Header */}
      <div className="admin-card" style={{ marginBottom: '16px', background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)', color: '#FFFFFF', border: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', padding: '3px 8px', borderRadius: '12px', fontWeight: 800 }}>
                CANTEEN OWNER PORTAL
              </span>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>{myOutlet.location}</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, margin: '6px 0 2px', color: '#FFFFFF' }}>{myOutlet.name}</h2>
            <p style={{ fontSize: '13px', opacity: 0.85, margin: 0 }}>{profile.full_name?.startsWith('Owner — ') ? profile.full_name : `Owner: ${profile.full_name}`} · Contact: {profile.phone || '+91 9876543230'}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn-secondary btn-spring"
              style={{ padding: '7px 14px', fontSize: '12px', background: rushMode ? '#FEF3C7' : '#FFFFFF', color: rushMode ? '#92400E' : 'var(--text-main)' }}
              onClick={() => {
                const next = !rushMode
                setRushMode(next)
                setNotice(next ? 'Rush Hour mode activated (+15m buffer added to customer estimates)' : 'Rush mode deactivated')
                if (addAuditLog) addAuditLog(profile.full_name, 'owner', 'OUTLET', 'RUSH_MODE', `${myOutlet.name} rush mode: ${next ? 'ON' : 'OFF'}`)
              }}
            >
              {rushMode ? 'Rush Mode ACTIVE (+15m)' : 'Enable Rush Buffer'}
            </button>
            <button
              className="btn-primary btn-spring"
              style={{ background: myOutlet.is_open ? '#059669' : '#DC2626', padding: '7px 16px', fontSize: '12px' }}
              onClick={() => toggleOutletOpen(myOutlet.id)}
            >
              {myOutlet.is_open ? 'Canteen Open' : 'Canteen Closed'}
            </button>
          </div>
        </div>
      </div>

      {/* Owner Subnavigation */}
      <div className="admin-subnav">
        {[
          { key: 'overview', label: 'Today Overview', icon: <PieChart size={15} /> },
          { key: 'menu', label: `Menu & Items Manager (${(myOutlet.menu_items || []).length})`, icon: <Edit size={15} /> },
          { key: 'staff', label: 'Staff on Duty', icon: <Users size={15} /> },
          { key: 'settlement', label: 'Daily Payout & Settlement', icon: <Banknote size={15} /> },
        ].map(t => (
          <button
            key={t.key}
            className={`admin-subnav-btn btn-spring ${ownerTab === t.key ? 'active' : ''}`}
            onClick={() => setOwnerTab(t.key)}
          >
            {t.icon} <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {ownerTab === 'overview' && (
        <>
          <div className="owner-stat-grid">
            <div className="owner-stat-card">
              <span className="owner-stat-label">Today Revenue</span>
              <div className="owner-stat-val" style={{ color: 'var(--blue-primary)' }}>{money(todayRevenue)}</div>
              <div className="owner-stat-sub">Pre-paid via Campus Wallet</div>
            </div>
            <div className="owner-stat-card">
              <span className="owner-stat-label">Orders Processed</span>
              <div className="owner-stat-val">{todayOrders.length}</div>
              <div className="owner-stat-sub" style={{ color: 'var(--text-muted)' }}>{activeOrdersCount} in active kitchen queue</div>
            </div>
            <div className="owner-stat-card">
              <span className="owner-stat-label">Average Order Size</span>
              <div className="owner-stat-val">{money(avgOrderVal)}</div>
              <div className="owner-stat-sub">Healthy campus dining spend</div>
            </div>
            <div className="owner-stat-card">
              <span className="owner-stat-label">Available Menu Items</span>
              <div className="owner-stat-val">{(myOutlet.menu_items || []).filter(i => i.available !== false && (i.stock_qty === undefined || i.stock_qty > 0)).length} / {(myOutlet.menu_items || []).length}</div>
              <div className="owner-stat-sub" style={{ color: (myOutlet.menu_items || []).filter(i => i.stock_qty === 0 || i.available === false).length > 0 ? '#DC2626' : '#059669' }}>
                {(myOutlet.menu_items || []).filter(i => i.stock_qty === 0 || i.available === false).length} Sold Out
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h3>Recent Orders at {myOutlet.name}</h3>
            {!todayOrders.length ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>No orders placed today yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {todayOrders.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--blue-primary)' }}>TOKEN #{o.token}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 8 }}>Order #{o.id}</span>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {(o.order_items || []).map(i => `${i.qty}× ${i.name}`).join(', ')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '14px' }}>{money(o.total)}</strong>
                      <span className={`status-badge ${o.status}`} style={{ display: 'block', marginTop: 4 }}>{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB 2: MENU & FOOD ITEMS MANAGER (FULL CRUD + STOCK & PRICING) ── */}
      {ownerTab === 'menu' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3><UtensilsCrossed size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--blue-primary)' }} />Menu & Food Items Management</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                Add dishes, update prices & portions, delete items, or manage item availability.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder="Search dishes..."
                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '13px', width: '180px' }}
              />
              <button
                className="btn-primary btn-spring"
                style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: '#2563EB' }}
                onClick={openAddItem}
              >
                <Plus size={16} /> Add Food Item
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
            {ownerCategories.map(cat => (
              <button
                key={cat}
                className={`filter-pill btn-spring ${activeCategoryFilter === cat ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter(cat)}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(myOutlet.menu_items || [])
              .filter(i => activeCategoryFilter === 'all' || (i.category && i.category.toLowerCase() === activeCategoryFilter))
              .filter(i => !itemSearch.trim() || i.name.toLowerCase().includes(itemSearch.toLowerCase()))
              .map(item => {
                const foodImg = getFoodImage(item.name, item.category)
                const stockQty = item.stock_qty !== undefined ? item.stock_qty : 30
                const isZero = stockQty === 0 || item.available === false

                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: isZero ? '#FFF1F2' : '#FFFFFF', border: isZero ? '1.5px solid #FCA5A5' : '1px solid var(--border-color)', borderRadius: '12px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px', flex: '1 1 auto' }}>
                      <img src={foodImg.url} alt={item.name} className="order-item-mini-thumb" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className={item.is_veg !== false ? 'veg-icon' : 'nonveg-icon'} />
                          <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{item.name}</strong>
                          <span className="item-cat-pill">{item.category}</span>
                          {getItemRatingStats && (() => {
                            const rStats = getItemRatingStats(item.id)
                            return rStats ? (
                              <span className="item-rating-chip" title={`${rStats.avg} stars based on ${rStats.count} customer reviews`}>
                                <Star size={10} fill="#F59E0B" color="#F59E0B" />
                                <span>{rStats.avg} ({rStats.count})</span>
                              </span>
                            ) : null
                          })()}
                        </div>
                        {item.description && (
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {item.description}
                          </p>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span>Price: <strong style={{ color: 'var(--blue-primary)', fontSize: '13px' }}>{money(item.price)}</strong></span>
                          <span>Portions: <strong style={{ color: isZero ? '#DC2626' : '#059669', fontSize: '13px' }}>{item.available === false || isZero ? '0 (Sold Out)' : stockQty}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Controls Toolbar: Stepper, Availability Toggle, Edit, Delete */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Portion Stepper */}
                      <div className="stock-stepper-wrap" style={{ marginRight: '4px' }}>
                        <button
                          className="stock-step-btn btn-spring"
                          onClick={() => updateItemStockQty(myOutlet.id, item.id, Math.max(0, stockQty - 1))}
                          disabled={stockQty <= 0}
                          title="Decrease 1 portion"
                        >
                          <Minus size={11} />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={stockQty}
                          onChange={e => updateItemStockQty(myOutlet.id, item.id, parseInt(e.target.value, 10) || 0)}
                          className="stock-num-input"
                          title="Direct numerical portion count"
                        />
                        <button
                          className="stock-step-btn btn-spring"
                          onClick={() => updateItemStockQty(myOutlet.id, item.id, stockQty + 1)}
                          title="Increase 1 portion"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      {/* Availability Toggle */}
                      <button
                        type="button"
                        className={`stock-avail-btn btn-spring ${item.available === false || isZero ? 'btn-action-restock' : 'btn-action-zero'}`}
                        onClick={() => toggleItemAvailability(myOutlet.id, item.id)}
                        title={item.available === false || isZero ? 'Mark item available' : 'Mark item unavailable'}
                      >
                        {item.available === false || isZero ? 'Mark Available' : 'Mark Unavailable'}
                      </button>

                      {/* Full Edit Modal Button */}
                      <button
                        className="btn-secondary btn-spring"
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => openEditItem(item)}
                        title="Edit price, category, stock, or details"
                      >
                        <Edit size={12} /> Edit
                      </button>

                      {/* Delete Button */}
                      <button
                        className="btn-danger btn-spring"
                        style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          if (window.confirm(`Permanently remove "${item.name}" from ${myOutlet.name}?`)) {
                            deleteMenuItem(myOutlet.id, item.id)
                          }
                        }}
                        title="Delete item from menu"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}

            {(myOutlet.menu_items || []).filter(i => activeCategoryFilter === 'all' || (i.category && i.category.toLowerCase() === activeCategoryFilter)).length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                <p>No food items match the filter or search.</p>
                <button className="btn-secondary btn-spring" onClick={openAddItem} style={{ marginTop: '8px' }}>
                  + Add First Dish to this Category
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Food Item Modal */}
      <FoodItemModal
        isOpen={foodModalOpen}
        onClose={() => { setFoodModalOpen(false); setModalItem(null); }}
        outlet={myOutlet}
        item={modalItem}
        onSave={(outId, itemData, existingId) => {
          if (existingId) {
            updateMenuItem(outId, existingId, itemData)
          } else {
            addMenuItem(outId, itemData)
          }
        }}
        onDelete={(outId, itemId) => {
          deleteMenuItem(outId, itemId)
        }}
      />

      {/* ── TAB 3: STAFF ON DUTY ── */}
      {ownerTab === 'staff' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3>Staff Roster — {myOutlet.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Kitchen and counter operators assigned to this outlet.</p>
            </div>
            <button className="btn-primary btn-spring" style={{ padding: '6px 14px', fontSize: '12px', background: 'var(--blue-primary)', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={handleOpenAddStaff}>
              <Plus size={14} /> Add Staff Member
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {staffRoster.map((st) => (
              <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14px' }}>{st.name}</strong>
                    <span style={{ fontSize: '11px', background: st.status === 'ON DUTY' ? '#DCFCE7' : '#F1F5F9', color: st.status === 'ON DUTY' ? '#166534' : '#64748B', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                      {st.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                    {st.role} · {st.phone} · Shift: {st.shift}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="btn-secondary btn-spring"
                    style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 600 }}
                    onClick={() => handleOpenEditStaff(st)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-secondary btn-spring"
                    style={{
                      padding: '5px 12px', fontSize: '12px', fontWeight: 600,
                      color: st.status === 'ON DUTY' ? '#DC2626' : '#166534',
                      borderColor: st.status === 'ON DUTY' ? '#FCA5A5' : '#86EFAC'
                    }}
                    onClick={() => handleToggleStaffStatus(st.id)}
                  >
                    {st.status === 'ON DUTY' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: SETTLEMENT & PAYOUT REPORT ── */}
      {ownerTab === 'settlement' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3>Daily Financial Settlement & Bank Payout</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Prepaid campus wallet collections disbursed directly to vendor account.</p>
            </div>
            <button className="btn-secondary btn-spring" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => window.print()}>
              <Download size={13} /> Export Daily Payout Statement
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '18px' }}>
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Wallet Gross Collections</span>
              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--blue-primary)', marginTop: 4 }}>{money(todayRevenue * 0.85)}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Direct Counter Cash / UPI</span>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669', marginTop: 4 }}>{money(todayRevenue * 0.15)}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Campus Royalty / Fee (3%)</span>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#92400E', marginTop: 4 }}>- {money(todayRevenue * 0.03)}</div>
            </div>
            <div style={{ background: '#ECFDF5', padding: '14px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
              <span style={{ fontSize: '11px', color: '#047857', textTransform: 'uppercase', fontWeight: 800 }}>Net Disbursable Payout</span>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#065F46', marginTop: 4 }}>{money(todayRevenue * 0.97)}</div>
            </div>
          </div>

          <div style={{ padding: '12px 14px', background: '#F1F5F9', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Daily campus dining settlements are batch-credited at 23:00 IST every night to the registered vendor bank account (Indian Bank VIT Branch · IFSC: IDIB000V088).
          </div>
        </div>
      )}

      {/* ── STAFF EDIT / ADD MODAL ── */}
      {staffModalOpen && (
        <div className="modal-overlay" onClick={() => setStaffModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>{editingStaffId ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button className="close-btn" onClick={() => setStaffModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveStaff} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Role / Designation</label>
                <input
                  type="text"
                  value={staffForm.role}
                  onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                  placeholder="e.g. Counter Operator & QR Scanner"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                <input
                  type="text"
                  value={staffForm.phone}
                  onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                  placeholder="e.g. +91 9876543220"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Shift Timing</label>
                <input
                  type="text"
                  value={staffForm.shift}
                  onChange={e => setStaffForm({ ...staffForm, shift: e.target.value })}
                  placeholder="e.g. Morning & Lunch (07:30 - 15:30)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setStaffModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: 'var(--blue-primary)' }}>
                  {editingStaffId ? 'Save Changes' : 'Add to Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF & ADMIN CONSOLES
// ─────────────────────────────────────────────────────────────────────────────
function StaffAdminConsole({ profile, orders, outlets, eventMode, setEventMode,
  advanceOrderStatus, toggleItemAvailability, toggleOutletOpen, setOrders, wallet, setWallet, setNotice, updateItemStockQty, addMenuItem, updateMenuItem, deleteMenuItem, auditLogs = [], addAuditLog, getItemRatingStats }) {

  const [scanInput, setScanInput]                 = useState('')
  const [creditUserEmail, setCreditUserEmail]     = useState('event.priya@vitchennai.ac.in')
  const [creditAmount, setCreditAmount]           = useState('500')
  const [tvMode, setTvMode]                       = useState(false)
  const [staffTab, setStaffTab]                   = useState('queue') // 'queue' | 'menu' | 'summary' | 'tv'
  const [adminTab, setAdminTab]                   = useState('kpi') // 'kpi' | 'canteens' | 'menu' | 'orders' | 'audit' | 'event' | 'scanner'
  const [auditFilter, setAuditFilter]             = useState('ALL') // 'ALL' | 'ORDER' | 'INVENTORY' | 'OUTLET' | 'SECURITY'
  const [soundEnabled, setSoundEnabled]           = useState(true)
  const [ordersSearch, setOrdersSearch]           = useState('')
  const [ordersFilterStatus, setOrdersFilterStatus] = useState('all')
  const [itemSearchQuery, setItemSearchQuery]     = useState('')

  // Food Item CRUD modal state for Staff & Admin
  const [foodModalOpen, setFoodModalOpen]         = useState(false)
  const [modalItem, setModalItem]                 = useState(null)
  const [targetOutletId, setTargetOutletId]       = useState(profile.outlet_id || outlets[0]?.id || 'g1')

  // Foodiv Vendor Formula states
  const [canteenMode, setCanteenMode]             = useState('normal') // 'normal' | 'rush' | 'pause'
  const [kdsViewMode, setKdsViewMode]             = useState('kanban') // 'kanban' | 'list'
  const [kdsMobileCol, setKdsMobileCol]           = useState('all') // 'all' | 'placed' | 'preparing' | 'ready'
  const [selectedKotOrder, setSelectedKotOrder]   = useState(null)
  const [activeMenuCat, setActiveMenuCat]         = useState('all')

  const isStaff = profile.role === 'staff'
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'superadmin' || profile.is_superadmin
  const myOutlet = outlets.find(o => o.id === (isStaff ? profile.outlet_id : targetOutletId)) || outlets[0]
  const activeManagedOutlet = outlets.find(o => o.id === targetOutletId) || myOutlet || outlets[0]

  // Staff: only their outlet's active orders, sorted oldest-first
  const myOrders = (isAdmin ? orders : orders.filter(o => o.outlet_id === myOutlet?.id))
    .filter(o => o.status !== 'collected' && o.status !== 'cancelled')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0)
  const placedOrders = myOrders.filter(o => o.status === 'placed')
  const prepOrders   = myOrders.filter(o => o.status === 'preparing')
  const readyOrders  = myOrders.filter(o => o.status === 'ready')

  // Categories in myOutlet
  const menuCategories = useMemo(() => {
    const cats = new Set(['all'])
    ;(myOutlet.menu_items || []).forEach(i => {
      if (i.category) cats.add(i.category.toLowerCase())
    })
    return Array.from(cats)
  }, [myOutlet])

  // Filtered orders for Admin Live Stream
  const filteredCampusOrders = orders.filter(o => {
    if (ordersFilterStatus !== 'all' && o.status !== ordersFilterStatus) return false
    if (!ordersSearch.trim()) return true
    const q = ordersSearch.toLowerCase()
    return (
      (o.id && o.id.toString().includes(q)) ||
      (o.token && o.token.toString().includes(q)) ||
      (o.outlets?.name && o.outlets.name.toLowerCase().includes(q)) ||
      (o.outlet_id && o.outlet_id.toLowerCase().includes(q))
    )
  })

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
            <div key={o.id} className="tv-token-card pulse-ready-glow">
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
    if (!match) return setNotice(`Invalid QR or token "${scanInput}"`)
    if (match.status === 'collected') return setNotice(`Order #${match.id} was ALREADY collected!`)
    setOrders(ords => ords.map(o => o.id === match.id ? { ...o, status: 'collected' } : o))
    setScanInput('')
    setNotice(`Order #${match.id} (Token #${match.token}) — marked COLLECTED!`)
  }

  function handleAdminCredit(e) {
    e.preventDefault()
    const amt = parseInt(creditAmount, 10)
    if (!amt) return
    setNotice(`Transferred ${money(amt)} event allowance to ${creditUserEmail}`)
  }

  // Render a Single KOT Ticket Card (Foodiv Standard)
  function renderKotCard(order) {
    const mins = Math.max(0, Math.round((Date.now() - new Date(order.created_at)) / 60000))
    const timerClass = mins > 14 ? 'time-pill-red' : mins > 7 ? 'time-pill-amber' : 'time-pill-green'
    const isReady = order.status === 'ready'
    const isPrep  = order.status === 'preparing'
    const isPlaced = order.status === 'placed'

    return (
      <div key={order.id} className={`kot-ticket kot-ticket-${order.status} ${isReady ? 'pulse-ready-glow' : ''}`}>
        <div className="kot-ticket-header">
          <div>
            <span className="kot-ticket-token">#{order.token}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ord #{order.id}</span>
              <span className={`kot-source-badge ${order.source === 'counter' ? 'source-counter' : 'source-app'}`}>
                {order.source === 'counter' ? 'Counter' : 'App'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`kot-time-pill ${timerClass}`}>
              <Clock size={11} /> {mins}m {mins > 14 ? 'RUSH' : ''}
            </span>
            <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-main)', marginTop: '4px' }}>
              {money(order.total)}
            </strong>
          </div>
        </div>

        <div className="kot-items-table">
          {(order.order_items || []).map((it, idx) => {
            const foodImg = getFoodImage(it.name)
            return (
              <div key={idx} className="kot-item-entry" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img src={foodImg.url} alt={it.name} className="kot-item-thumb" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <span className="kot-item-qty">{it.qty}×</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{it.name}</span>
                  {it.notes && <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic', marginLeft: 4 }}>({it.notes})</span>}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{money(it.price * it.qty)}</span>
              </div>
            )
          })}
        </div>

        {/* Verification QR on Canteen KOT */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: '6px 10px', borderRadius: '8px', margin: '8px 0', border: '1px solid #E2E8F0' }}>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Canteen Scan / Match</span>
            <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--blue-primary)' }}>TOKEN #{order.token}</div>
          </div>
          <div style={{ cursor: 'pointer' }} onClick={() => setSelectedKotOrder(order)} title="Tap to expand Slip & QR">
            <ScannableQrCode value={`CB1.${order.id}.${order.token}`} size={44} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
          {isPlaced && (
            <button
              className="btn-primary btn-spring"
              style={{ flex: 1, padding: '7px 10px', fontSize: '12px', background: '#F59E0B' }}
              onClick={() => advanceOrderStatus(order.id)}
            >
              Accept & Cook
            </button>
          )}
          {isPrep && (
            <button
              className="btn-primary btn-spring"
              style={{ flex: 1, padding: '7px 10px', fontSize: '12px', background: '#2563EB' }}
              onClick={() => {
                advanceOrderStatus(order.id)
                if (soundEnabled) playNewOrderChime()
              }}
            >
              Mark Ready
            </button>
          )}
          {isReady && (
            <button
              className="btn-primary btn-spring"
              style={{ flex: 1, padding: '7px 10px', fontSize: '12px', background: '#059669' }}
              onClick={() => advanceOrderStatus(order.id)}
            >
              Hand Over (Collect)
            </button>
          )}
          <button
            className="btn-secondary btn-spring"
            style={{ padding: '7px 10px', fontSize: '12px' }}
            onClick={() => setSelectedKotOrder(order)}
            title="View thermal kitchen ticket"
          >
            <FileText size={14} /> Slip
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="tab-content-enter">
      {/* ── FOODIV THERMAL KOT SLIP MODAL ── */}
      {selectedKotOrder && (
        <div className="receipt-overlay" onClick={() => setSelectedKotOrder(null)}>
          <div className="receipt-modal-card modal-enter" onClick={e => e.stopPropagation()}>
            <div className="thermal-receipt">
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #475569', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>V FOODS · VIT CHENNAI</div>
                <strong style={{ fontSize: '15px', display: 'block', margin: '4px 0' }}>{selectedKotOrder.outlets?.name || myOutlet.name}</strong>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Kitchen Order Ticket (KOT)</div>
              </div>

              <div style={{ textAlign: 'center', background: '#F1F5F9', padding: '10px', borderRadius: '6px', margin: '12px 0' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOKEN NUMBER</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>#{selectedKotOrder.token}</div>
                <div style={{ fontSize: '11px', marginTop: 4 }}>
                  {selectedKotOrder.source === 'counter' ? 'COUNTER SALE' : 'ONLINE APP ORDER'}
                </div>
              </div>

              <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748B' }}>
                <span>Order #{selectedKotOrder.id}</span>
                <span>{new Date(selectedKotOrder.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', margin: '10px 0' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                    <th style={{ paddingBottom: 4 }}>QTY</th>
                    <th style={{ paddingBottom: 4 }}>ITEM</th>
                    <th style={{ paddingBottom: 4, textAlign: 'right' }}>AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedKotOrder.order_items || []).map((it, i) => (
                    <tr key={i} style={{ borderBottom: '1px dashed #E2E8F0' }}>
                      <td style={{ padding: '6px 0', fontWeight: 700 }}>{it.qty}x</td>
                      <td style={{ padding: '6px 0' }}>
                        {it.name}
                        {it.notes && <div style={{ fontSize: '10px', color: '#64748B' }}>* {it.notes}</div>}
                      </td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{money(it.price * it.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '1px dashed #475569', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>TOTAL CHARGED</span>
                <span>{money(selectedKotOrder.total)}</span>
              </div>

              <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px dashed #CBD5E1', paddingTop: '10px', fontSize: '10px', color: '#64748B' }}>
                <div>Status: {selectedKotOrder.status.toUpperCase()}</div>
                <div style={{ marginTop: 2 }}>Present token when ready for pickup</div>
              </div>

              {/* Scannable Verification QR Code on Thermal Slip */}
              <div style={{ textAlign: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1' }}>
                <div style={{ display: 'inline-block', background: '#FFFFFF', padding: '6px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                  <ScannableQrCode value={`CB1.${selectedKotOrder.id}.${selectedKotOrder.token}`} size={110} />
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', marginTop: 4, letterSpacing: '0.5px' }}>
                  SCAN OR MATCH WITH USER APP
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--blue-primary)', marginTop: 2 }}>
                  TOKEN #{selectedKotOrder.token}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                <button
                  className="btn-primary btn-spring"
                  style={{ flex: 1, padding: '8px' }}
                  onClick={() => window.print()}
                >
                  Print KOT
                </button>
                <button
                  className="btn-secondary btn-spring"
                  style={{ padding: '8px 14px' }}
                  onClick={() => setSelectedKotOrder(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STAFF CONTROLS HEADER (FOODIV FORMULA) ── */}
      {isStaff && (
        <>
          {/* Canteen Rush Status bar */}
          <div className="canteen-mode-bar">
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Canteen Operational Flow:</span>
            <button
              className={`canteen-mode-btn btn-spring ${canteenMode === 'normal' ? 'active-normal' : ''}`}
              onClick={() => {
                setCanteenMode('normal')
                setNotice('Kitchen flow set to Normal (5-10 min prep)')
              }}
            >
              Normal (5-10m)
            </button>
            <button
              className={`canteen-mode-btn btn-spring ${canteenMode === 'rush' ? 'active-rush' : ''}`}
              onClick={() => {
                setCanteenMode('rush')
                setNotice('Rush Hour activated! Prep time alert sent to users (+15m).')
              }}
            >
              Rush Hour (+15m)
            </button>
            <button
              className={`canteen-mode-btn btn-spring ${canteenMode === 'pause' ? 'active-pause' : ''}`}
              onClick={() => {
                setCanteenMode('pause')
                setNotice('Kitchen Paused — no new online orders accepted.')
              }}
            >
              Kitchen Paused
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn-secondary btn-spring"
                style={{ padding: '5px 10px', fontSize: '11px' }}
                onClick={() => {
                  setSoundEnabled(s => !s)
                  if (!soundEnabled) playNewOrderChime()
                }}
              >
                {soundEnabled ? <Volume2 size={13} color="#16A34A" /> : <VolumeX size={13} color="#DC2626" />}
                <span>{soundEnabled ? 'Chime ON' : 'Chime MUTE'}</span>
              </button>
              <button
                className="btn-secondary btn-spring"
                style={{ padding: '5px 10px', fontSize: '11px' }}
                onClick={playNewOrderChime}
              >
                Test
              </button>
              <button
                className="btn-primary btn-spring"
                style={{ background: myOutlet.is_open ? '#059669' : '#DC2626', padding: '5px 12px', fontSize: '11px' }}
                onClick={() => toggleOutletOpen(myOutlet.id)}
              >
                {myOutlet.is_open ? 'Open' : 'Closed'}
              </button>
            </div>
          </div>

          <nav className="nav-tabs" style={{ marginBottom: '18px' }}>
            {[
              { key: 'queue', label: 'KDS Live Queue', icon: <Clock3 size={16} />, badge: myOrders.length },
              { key: 'menu', label: 'Menu & Food Items', icon: <Edit size={16} />, badge: (myOutlet.menu_items || []).length },
              { key: 'summary', label: 'Shift Billing', icon: <BarChart2 size={16} /> },
              { key: 'tv', label: 'TV Display', icon: <Monitor size={16} /> },
            ].map(t => (
              <button
                key={t.key}
                className={staffTab === t.key ? 'active' : ''}
                onClick={() => t.key === 'tv' ? setTvMode(true) : setStaffTab(t.key)}
              >
                {t.icon} {t.label}
                {t.badge > 0 && <span className="nav-badge">{t.badge}</span>}
              </button>
            ))}
          </nav>
        </>
      )}

      {/* ── ADMIN TABS SUBNAV ── */}
      {isAdmin && (
        <div className="admin-subnav">
          {[
            { key: 'kpi', label: 'Campus Overview', count: null },
            { key: 'canteens', label: 'Canteen Management', count: outlets.filter(o => !o.is_event).length },
            { key: 'menu', label: 'Food Items & Menus', count: outlets.reduce((sum, o) => sum + (o.menu_items || []).length, 0) },
            { key: 'orders', label: 'Live Campus Stream', count: orders.length },
            { key: 'audit', label: 'Audit Log & System Telemetry', count: (auditLogs || []).length },
            { key: 'scanner', label: 'Token & QR Scanner', count: null },
          ].map(tab => (
            <button
              key={tab.key}
              className={`admin-subnav-btn btn-spring ${adminTab === tab.key ? 'active' : ''}`}
              onClick={() => setAdminTab(tab.key)}
            >
              <span>{tab.label}</span>
              {tab.count && (
                <span style={{ fontSize: '11px', background: adminTab === tab.key ? 'rgba(255,255,255,0.2)' : '#F1F5F9', padding: '2px 7px', borderRadius: '10px' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── STAFF TAB: KDS LIVE QUEUE (FOODIV 3-COLUMN KANBAN FORMULA) ── */}
      {isStaff && staffTab === 'queue' && (
        <>
          {/* Quick Handover Scanner */}
          <div className="admin-card" style={{ padding: '14px 18px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={18} color="var(--blue-primary)" />
                <strong style={{ fontSize: '14px' }}>Counter Fast Token Handover</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className={`filter-pill btn-spring ${kdsViewMode === 'kanban' ? 'active' : ''}`}
                  onClick={() => setKdsViewMode('kanban')}
                >
                  3-Col Kanban
                </button>
                <button
                  className={`filter-pill btn-spring ${kdsViewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setKdsViewMode('list')}
                >
                  Stream
                </button>
              </div>
            </div>
            <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                placeholder="Scan user QR or type 3-digit token (e.g. 248)..."
                style={{ flex: 1, padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', outline: 0, fontSize: '13px' }}
              />
              <button type="submit" className="btn-primary btn-spring" style={{ padding: '9px 16px', fontSize: '12px' }}>
                Verify & Hand Over
              </button>
            </form>
          </div>

          {/* Kanban / List Filter for Mobile */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
            {[
              { key: 'all', label: `All Active (${myOrders.length})` },
              { key: 'placed', label: `New (${placedOrders.length})` },
              { key: 'preparing', label: `Cooking (${prepOrders.length})` },
              { key: 'ready', label: `Ready (${readyOrders.length})` },
            ].map(col => (
              <button
                key={col.key}
                className={`filter-pill btn-spring ${kdsMobileCol === col.key ? 'active' : ''}`}
                onClick={() => setKdsMobileCol(col.key)}
              >
                {col.label}
              </button>
            ))}
          </div>

          {kdsViewMode === 'kanban' ? (
            /* ── FOODIV 3-COLUMN KDS BOARD ── */
            <div className="kds-board">
              {/* Column 1: Placed / New */}
              {(kdsMobileCol === 'all' || kdsMobileCol === 'placed') && (
                <div className="kds-column">
                  <div className="kds-col-header col-new">
                    <span>1. New Orders</span>
                    <span className="kds-col-count">{placedOrders.length}</span>
                  </div>
                  <div className="kds-col-body">
                    {!placedOrders.length ? (
                      <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No pending orders
                      </div>
                    ) : (
                      placedOrders.map(renderKotCard)
                    )}
                  </div>
                </div>
              )}

              {/* Column 2: Preparing / In Kitchen */}
              {(kdsMobileCol === 'all' || kdsMobileCol === 'preparing') && (
                <div className="kds-column">
                  <div className="kds-col-header col-prep">
                    <span>2. In Kitchen (Cooking)</span>
                    <span className="kds-col-count">{prepOrders.length}</span>
                  </div>
                  <div className="kds-col-body">
                    {!prepOrders.length ? (
                      <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Kitchen idle
                      </div>
                    ) : (
                      prepOrders.map(renderKotCard)
                    )}
                  </div>
                </div>
              )}

              {/* Column 3: Ready for Pickup */}
              {(kdsMobileCol === 'all' || kdsMobileCol === 'ready') && (
                <div className="kds-column">
                  <div className="kds-col-header col-ready">
                    <span>3. Ready at Counter</span>
                    <span className="kds-col-count">{readyOrders.length}</span>
                  </div>
                  <div className="kds-col-body">
                    {!readyOrders.length ? (
                      <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No tokens ready
                      </div>
                    ) : (
                      readyOrders.map(renderKotCard)
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Stream List View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {!myOrders.length ? (
                <div className="empty-state"><CheckCircle2 size={36} /><h3>All clear!</h3><p>No active orders in kitchen queue.</p></div>
              ) : (
                myOrders
                  .filter(o => kdsMobileCol === 'all' || o.status === kdsMobileCol)
                  .map(renderKotCard)
              )}
            </div>
          )}
        </>
      )}



      {/* ── STAFF MENU TAB: NUMERICAL STOCK & PORTION INVENTORY CONTROL ── */}
      {isStaff && staffTab === 'menu' && (() => {
        const outletMenuItems = myOutlet.menu_items || []
        const inStockCount = outletMenuItems.filter(i => (i.stock_qty !== undefined ? i.stock_qty : (i.available !== false ? 30 : 0)) > 10).length
        const lowStockCount = outletMenuItems.filter(i => {
          const s = i.stock_qty !== undefined ? i.stock_qty : (i.available !== false ? 30 : 0)
          return s > 0 && s <= 10
        }).length
        const outStockCount = outletMenuItems.filter(i => (i.stock_qty !== undefined ? i.stock_qty : (i.available !== false ? 30 : 0)) === 0).length

        return (
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3>{myOutlet.name} — Portion Stock & Availability</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Real-time numerical portion counts · Automatically marks Sold Out when portion count reaches 0
                </p>
              </div>
              <div style={{ width: '220px' }}>
                <input
                  value={itemSearchQuery}
                  onChange={e => setItemSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Inventory Status Overview Banner */}
            <div className="stock-summary-banner">
              <div className="stock-summary-stat">
                <span>Total Items:</span>
                <strong>{outletMenuItems.length}</strong>
              </div>
              <div className="stock-summary-stat" style={{ color: '#166534' }}>
                <span>In Stock:</span>
                <strong>{inStockCount}</strong>
              </div>
              <div className="stock-summary-stat" style={{ color: '#92400E' }}>
                <span>Low Stock (&le;10):</span>
                <strong>{lowStockCount}</strong>
              </div>
              <div className="stock-summary-stat" style={{ color: '#991B1B' }}>
                <span>Sold Out:</span>
                <strong>{outStockCount}</strong>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn-secondary btn-spring"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                  onClick={() => {
                    outletMenuItems.forEach(it => updateItemStockQty(myOutlet.id, it.id, 30))
                    setNotice('All active items restocked to 30 portions!')
                  }}
                >
                  Restock All (30)
                </button>
                <button
                  className="btn-primary btn-spring"
                  style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', background: '#2563EB' }}
                  onClick={() => {
                    setModalItem(null);
                    setTargetOutletId(myOutlet.id);
                    setFoodModalOpen(true);
                  }}
                >
                  <Plus size={14} /> Add Food Item
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
              {menuCategories.map(cat => (
                <button
                  key={cat}
                  className={`filter-pill btn-spring ${activeMenuCat === cat ? 'active' : ''}`}
                  onClick={() => setActiveMenuCat(cat)}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Numerical Stock Control Grid */}
            <div className="stock-control-grid">
              {outletMenuItems
                .filter(i => activeMenuCat === 'all' || (i.category && i.category.toLowerCase() === activeMenuCat))
                .filter(i => !itemSearchQuery.trim() || i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                .map(item => {
                  const stockQty = item.stock_qty !== undefined ? item.stock_qty : (item.available !== false ? 30 : 0)
                  const isZero = stockQty === 0 || item.available === false
                  const isLow = stockQty > 0 && stockQty <= 10
                  const foodImg = getFoodImage(item.name, item.category)

                  return (
                    <div key={item.id} className={`stock-control-card ${isZero ? 'is-zero' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={foodImg.url}
                            alt={item.name}
                            className="order-item-mini-thumb"
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className={item.is_veg !== false ? 'veg-icon' : 'nonveg-icon'} />
                              <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>{item.name}</strong>
                              {getItemRatingStats && (() => {
                                const rStats = getItemRatingStats(item.id)
                                return rStats ? (
                                  <span className="item-rating-chip" title={`${rStats.avg} stars based on ${rStats.count} reviews`}>
                                    <Star size={10} fill="#F59E0B" color="#F59E0B" />
                                    <span>{rStats.avg}</span>
                                    <small style={{ opacity: 0.8 }}>({rStats.count})</small>
                                  </span>
                                ) : null
                              })()}
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                              {money(item.price)} · {item.category || 'general'}
                            </span>
                            {item.description && (
                              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`stock-status-pill ${isZero ? 'stock-pill-out' : isLow ? 'stock-pill-low' : 'stock-pill-ok'}`}>
                          {isZero ? 'Sold Out (0)' : isLow ? `Low: ${stockQty} left` : `${stockQty} in stock`}
                        </span>
                      </div>

                      {/* Stepper + Input + Batch Presets + Edit + Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', gap: '8px', flexWrap: 'wrap' }}>
                        <div className="stock-stepper-wrap">
                          <button
                            className="stock-step-btn btn-spring"
                            onClick={() => updateItemStockQty(myOutlet.id, item.id, Math.max(0, stockQty - 1))}
                            disabled={stockQty <= 0}
                            title="Decrease portions by 1"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={stockQty}
                            onChange={e => updateItemStockQty(myOutlet.id, item.id, parseInt(e.target.value, 10) || 0)}
                            className="stock-num-input"
                            title="Directly edit remaining portions"
                          />
                          <button
                            className="stock-step-btn btn-spring"
                            onClick={() => updateItemStockQty(myOutlet.id, item.id, stockQty + 1)}
                            title="Increase portions by 1"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Quick Presets and Availability Toggle */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="stock-preset-btn btn-spring"
                            onClick={() => updateItemStockQty(myOutlet.id, item.id, stockQty + 10)}
                            title="Add 10 portions"
                          >
                            +10
                          </button>
                          <button
                            className="stock-preset-btn btn-spring"
                            onClick={() => updateItemStockQty(myOutlet.id, item.id, stockQty + 25)}
                            title="Add 25 portions"
                          >
                            +25
                          </button>
                          <button
                            type="button"
                            className={`stock-avail-btn btn-spring ${item.available === false || isZero ? 'btn-action-restock' : 'btn-action-zero'}`}
                            onClick={() => toggleItemAvailability(myOutlet.id, item.id)}
                            title={item.available === false || isZero ? 'Mark item available' : 'Mark item unavailable'}
                          >
                            {item.available === false || isZero ? 'Mark Available' : 'Mark Unavailable'}
                          </button>
                          <button
                            className="btn-secondary btn-spring"
                            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => {
                              setModalItem(item);
                              setTargetOutletId(myOutlet.id);
                              setFoodModalOpen(true);
                            }}
                            title="Edit food details"
                          >
                            <Edit size={11} /> Edit
                          </button>
                          <button
                            className="btn-danger btn-spring"
                            style={{ padding: '4px 7px', fontSize: '11px', display: 'flex', alignItems: 'center' }}
                            onClick={() => {
                              if (window.confirm(`Permanently remove "${item.name}" from ${myOutlet.name}?`)) {
                                deleteMenuItem(myOutlet.id, item.id)
                              }
                            }}
                            title="Delete food item"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )
      })()}

      {/* ── STAFF SUMMARY TAB: SHIFT BILLING & CASH RECONCILIATION ── */}
      {isStaff && staffTab === 'summary' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3><BarChart2 size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Daily Shift Billing — {myOutlet.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Shift gross revenue, token volumes, and cash reconciliation</p>
            </div>
            <button
              className="btn-secondary btn-spring"
              style={{ padding: '7px 14px', fontSize: '12px' }}
              onClick={() => exportOrdersCSV(todayOrders)}
            >
              <Download size={14} /> Export Shift CSV
            </button>
          </div>

          <div className="sales-grid" style={{ marginTop: '16px' }}>
            <div className="sales-stat-box">
              <h4>Shift Gross Collection</h4>
              <p>{money(todayRevenue)}</p>
            </div>
            <div className="sales-stat-box">
              <h4>Orders Processed</h4>
              <p>{todayOrders.length}</p>
            </div>
            <div className="sales-stat-box">
              <h4>Active in Kitchen</h4>
              <p>{myOrders.length}</p>
            </div>
            <div className="sales-stat-box">
              <h4>Avg Ticket Size</h4>
              <p>{todayOrders.length ? money(Math.round(todayRevenue / todayOrders.length)) : '—'}</p>
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Digital Pre-Order Settlement (Wallet Only)
            </h4>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '140px', background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Settled Pre-Paid Revenue</span>
                <strong style={{ display: 'block', fontSize: '18px', color: 'var(--blue-primary)', marginTop: 2 }}>
                  {money(todayRevenue)}
                </strong>
              </div>
              <div style={{ flex: 1, minWidth: '140px', background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Payment Model</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#059669', marginTop: 4 }}>
                  100% Pre-Paid via Campus Wallet
                </strong>
              </div>
            </div>
          </div>

          <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '15px' }}>Top Fast-Moving Items Today</h4>
          {(() => {
            const freq = {}
            todayOrders.forEach(o => (o.order_items || []).forEach(i => {
              freq[i.name] = (freq[i.name] || 0) + i.qty
            }))
            const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5)
            if (!entries.length) return <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No orders recorded yet today.</p>
            const maxVal = Math.max(...entries.map(e => e[1]))
            return entries.map(([name, count]) => (
              <div key={name} className="top-item-row">
                <span>{name}</span>
                <div className="top-item-bar-wrap">
                  <div className="top-item-bar" style={{ width: `${Math.min(100, (count / maxVal) * 100)}%` }} />
                </div>
                <span className="top-item-count">{count}× sold</span>
              </div>
            ))
          })()}
        </div>
      )}

      {/* ── ADMIN: KPI OVERVIEW ── */}
      {isAdmin && adminTab === 'kpi' && (
        <>
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3><PieChart size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Campus Dining Executive Overview</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Real-time metrics across all 13 campus outlets</p>
              </div>
              <button className="btn-secondary btn-spring" style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => exportOrdersCSV(orders)}>
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="sales-grid" style={{ marginTop: '16px' }}>
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

      {/* ── ADMIN: CANTEENS BREAKDOWN ── */}
      {isAdmin && adminTab === 'canteens' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3><Store size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Campus Canteens & Stalls Management</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Live counter controls and revenue breakdown</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {outlets.map(outlet => {
              const outletOrders = orders.filter(o => o.outlet_id === outlet.id)
              const rev = outletOrders.reduce((s, o) => s + o.total, 0)
              const totalRev = Math.max(1, orders.reduce((s, o) => s + o.total, 0))
              const pct = Math.round((rev / totalRev) * 100)
              return (
                <div key={outlet.id} style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: '1 1 240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '15px' }}>{outlet.name}</strong>
                      
                    </div>
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>{outlet.location}</small>
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--blue-primary)', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{outletOrders.length} orders · {money(rev)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="btn-secondary btn-spring"
                      style={{ padding: '7px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => {
                        setTargetOutletId(outlet.id);
                        setAdminTab('menu');
                      }}
                      title="Manage menu, prices & inventory for this outlet"
                    >
                      <Edit size={12} /> Food Items ({(outlet.menu_items || []).length})
                    </button>
                    <button
                      className="btn-primary btn-spring"
                      style={{ background: outlet.is_open ? '#059669' : '#DC2626', padding: '7px 14px', fontSize: '12px' }}
                      onClick={() => toggleOutletOpen(outlet.id)}
                    >
                      {outlet.is_open ? 'Open' : 'Closed'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ADMIN: FOOD ITEMS & MENUS MANAGEMENT ACROSS ALL CANTEENS ── */}
      {isAdmin && adminTab === 'menu' && (() => {
        const currentTargetOutlet = outlets.find(o => o.id === targetOutletId) || outlets[0]
        const targetMenuItems = currentTargetOutlet.menu_items || []
        const inStockCount = targetMenuItems.filter(i => (i.stock_qty !== undefined ? i.stock_qty : (i.available !== false ? 30 : 0)) > 10).length
        const lowStockCount = targetMenuItems.filter(i => {
          const s = i.stock_qty !== undefined ? i.stock_qty : (i.available !== false ? 30 : 0)
          return s > 0 && s <= 10
        }).length
        const outStockCount = targetMenuItems.filter(i => (i.stock_qty !== undefined ? i.stock_qty : (i.available !== false ? 30 : 0)) === 0).length

        const targetCats = new Set(['all'])
        targetMenuItems.forEach(i => {
          if (i.category) targetCats.add(i.category.toLowerCase())
        })
        const targetCategoriesList = Array.from(targetCats)

        return (
          <div className="admin-card">
            {/* Header + Canteen Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3><UtensilsCrossed size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--blue-primary)' }} />Campus Food Items & Menu Control</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                  Super Admin centralized control — add, edit, delete, and restock items for any campus canteen.
                </p>
              </div>

              {/* Outlet Selector Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Canteen:</span>
                <select
                  value={targetOutletId}
                  onChange={e => setTargetOutletId(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid var(--blue-primary)', fontSize: '13px', fontWeight: 700, background: '#FFFFFF', color: 'var(--text-main)' }}
                >
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({(o.menu_items || []).length} items)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Inventory Status Overview Banner */}
            <div className="stock-summary-banner">
              <div className="stock-summary-stat">
                <span>Selected Outlet:</span>
                <strong style={{ color: 'var(--blue-primary)' }}>{currentTargetOutlet.name}</strong>
              </div>
              <div className="stock-summary-stat">
                <span>Total Items:</span>
                <strong>{targetMenuItems.length}</strong>
              </div>
              <div className="stock-summary-stat" style={{ color: '#166534' }}>
                <span>In Stock:</span>
                <strong>{inStockCount}</strong>
              </div>
              <div className="stock-summary-stat" style={{ color: '#92400E' }}>
                <span>Low Stock:</span>
                <strong>{lowStockCount}</strong>
              </div>
              <div className="stock-summary-stat" style={{ color: '#991B1B' }}>
                <span>Sold Out:</span>
                <strong>{outStockCount}</strong>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn-secondary btn-spring"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => {
                    targetMenuItems.forEach(it => updateItemStockQty(currentTargetOutlet.id, it.id, 30))
                    setNotice(`Restocked all items in ${currentTargetOutlet.name} to 30!`)
                  }}
                >
                  Restock All (30)
                </button>
                <button
                  className="btn-primary btn-spring"
                  style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', background: '#2563EB' }}
                  onClick={() => {
                    setModalItem(null);
                    setFoodModalOpen(true);
                  }}
                >
                  <Plus size={14} /> Add Food Item
                </button>
              </div>
            </div>

            {/* Search and Category Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {targetCategoriesList.map(cat => (
                  <button
                    key={cat}
                    className={`filter-pill btn-spring ${activeMenuCat === cat ? 'active' : ''}`}
                    onClick={() => setActiveMenuCat(cat)}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>
              <input
                value={itemSearchQuery}
                onChange={e => setItemSearchQuery(e.target.value)}
                placeholder={`Search in ${currentTargetOutlet.name}...`}
                style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '13px', width: '200px' }}
              />
            </div>

            {/* Grid of Items */}
            <div className="stock-control-grid">
              {targetMenuItems
                .filter(i => activeMenuCat === 'all' || (i.category && i.category.toLowerCase() === activeMenuCat))
                .filter(i => !itemSearchQuery.trim() || i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                .map(item => {
                  const stockQty = item.stock_qty !== undefined ? item.stock_qty : (item.available !== false ? 30 : 0)
                  const isZero = stockQty === 0 || item.available === false
                  const isLow = stockQty > 0 && stockQty <= 10
                  const foodImg = getFoodImage(item.name, item.category)

                  return (
                    <div key={item.id} className={`stock-control-card ${isZero ? 'is-zero' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={foodImg.url}
                            alt={item.name}
                            className="order-item-mini-thumb"
                            style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className={item.is_veg !== false ? 'veg-icon' : 'nonveg-icon'} />
                              <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{item.name}</strong>
                              {getItemRatingStats && (() => {
                                const rStats = getItemRatingStats(item.id)
                                return rStats ? (
                                  <span className="item-rating-chip" title={`${rStats.avg} stars`}>
                                    <Star size={10} fill="#F59E0B" color="#F59E0B" />
                                    <span>{rStats.avg}</span>
                                  </span>
                                ) : null
                              })()}
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                              {money(item.price)} · {item.category || 'general'}
                            </span>
                            {item.description && (
                              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`stock-status-pill ${isZero ? 'stock-pill-out' : isLow ? 'stock-pill-low' : 'stock-pill-ok'}`}>
                          {isZero ? 'Sold Out (0)' : isLow ? `Low: ${stockQty}` : `${stockQty} in stock`}
                        </span>
                      </div>

                      {/* Stepper + Quick Presets + Edit + Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', gap: '6px', flexWrap: 'wrap' }}>
                        <div className="stock-stepper-wrap">
                          <button
                            className="stock-step-btn btn-spring"
                            onClick={() => updateItemStockQty(currentTargetOutlet.id, item.id, Math.max(0, stockQty - 1))}
                            disabled={stockQty <= 0}
                            title="Decrease 1 portion"
                          >
                            <Minus size={11} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={stockQty}
                            onChange={e => updateItemStockQty(currentTargetOutlet.id, item.id, parseInt(e.target.value, 10) || 0)}
                            className="stock-num-input"
                            title="Direct edit portions"
                          />
                          <button
                            className="stock-step-btn btn-spring"
                            onClick={() => updateItemStockQty(currentTargetOutlet.id, item.id, stockQty + 1)}
                            title="Increase 1 portion"
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={`stock-avail-btn btn-spring ${item.available === false || isZero ? 'btn-action-restock' : 'btn-action-zero'}`}
                            onClick={() => toggleItemAvailability(currentTargetOutlet.id, item.id)}
                            title={item.available === false || isZero ? 'Mark item available' : 'Mark item unavailable'}
                          >
                            {item.available === false || isZero ? 'Mark Available' : 'Mark Unavailable'}
                          </button>
                          <button
                            className="btn-secondary btn-spring"
                            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => {
                              setModalItem(item);
                              setFoodModalOpen(true);
                            }}
                            title="Edit food details"
                          >
                            <Edit size={11} /> Edit
                          </button>
                          <button
                            className="btn-danger btn-spring"
                            style={{ padding: '4px 7px', fontSize: '11px', display: 'flex', alignItems: 'center' }}
                            onClick={() => {
                              if (window.confirm(`Permanently remove "${item.name}" from ${currentTargetOutlet.name}?`)) {
                                deleteMenuItem(currentTargetOutlet.id, item.id);
                              }
                            }}
                            title="Delete item"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )
      })()}

      {/* ── ADMIN: LIVE ORDERS STREAM ── */}
      {isAdmin && adminTab === 'orders' && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <div>
              <h3><Package size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Live Campus Orders Stream</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Real-time feed of all university orders</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                value={ordersSearch}
                onChange={e => setOrdersSearch(e.target.value)}
                placeholder="Search token, ID, canteen..."
                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '13px', width: '200px' }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {['all', 'placed', 'preparing', 'ready', 'collected'].map(st => (
                  <button
                    key={st}
                    className={`filter-pill btn-spring ${ordersFilterStatus === st ? 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => setOrdersFilterStatus(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Order ID</th>
                  <th>Outlet</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampusOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No orders match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredCampusOrders.map(o => (
                    <tr key={o.id}>
                      <td><strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue-primary)' }}>#{o.token}</strong></td>
                      <td>#{o.id}</td>
                      <td>{o.outlets?.name || o.outlet_id}</td>
                      <td>{(o.order_items || []).map(i => `${i.qty}× ${i.name}`).join(', ')}</td>
                      <td><strong>{money(o.total)}</strong></td>
                      <td><span className={`status-badge ${o.status}`}>{o.status}</span></td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        {o.status !== 'collected' && (
                          <button
                            className="btn-secondary btn-spring"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => advanceOrderStatus(o.id)}
                          >
                            Advance
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ADMIN: RIVIERA FEST & ALLOWANCE ── */}
      {isAdmin && adminTab === 'event' && (
        <>
          <div className="admin-card">
            <h3><Zap size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Riviera Fest Mode Switch</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '14px' }}>
              Enabling Riviera Event Mode closes standard canteens and activates 20+ festival food stalls.
            </p>
            <button
              className="btn-primary btn-spring"
              style={{ background: eventMode ? '#DC2626' : '#059669' }}
              onClick={() => {
                setEventMode(m => !m)
                setNotice(eventMode ? 'Regular canteens OPEN — Event Mode off.' : 'Riviera Event Mode ACTIVE! 20 stalls open.')
              }}
            >
              {eventMode ? 'Disable Event Mode (Return to Regular Canteens)' : 'Activate Riviera Event Mode'}
            </button>
          </div>

          <div className="admin-card">
            <h3><Users size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Event Crew Wallet Allowance Tool</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
              Credit meals allowance directly to Riviera volunteers and organizing committee.
            </p>
            <form onSubmit={handleAdminCredit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="email" value={creditUserEmail}
                onChange={e => setCreditUserEmail(e.target.value)}
                placeholder="User / Crew Email (e.g. crew@vitchennai.ac.in)"
                style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 0 }}
              />
              <input
                type="number" value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)}
                placeholder="Amount (₹)"
                style={{ width: '130px', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 0 }}
              />
              <button type="submit" className="btn-primary btn-spring">Credit Allowance</button>
            </form>
          </div>
        </>
      )}

      {/* ── ADMIN: SCANNER & VERIFIER ── */}
      {isAdmin && adminTab === 'scanner' && (
        <div className="admin-card">
          <h3><QrCode size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Token & QR Code Verifier Terminal</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '14px' }}>
            Instant verification for order pickups across all canteens
          </p>
          <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder="Scan QR string or type 3-digit token (e.g. 248)..."
              style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: '1.5px solid var(--border-color)', outline: 0, fontFamily: 'var(--font-body)', fontSize: '15px' }}
            />
            <button type="submit" className="btn-primary btn-spring">Verify & Collect</button>
          </form>

          {(() => {
            const match = orders.find(o =>
              scanInput.trim() && (
                o.token === scanInput.trim() ||
                scanInput.includes(o.token) ||
                scanInput.includes(o.id.toString())
              )
            )
            if (!match) return null
            return (
              <div style={{ background: '#F8FAFC', border: '1.5px solid var(--blue-primary)', borderRadius: '14px', padding: '16px', animation: 'card-in 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '18px', color: 'var(--blue-primary)', fontFamily: 'var(--font-mono)' }}>TOKEN #{match.token}</strong>
                  <span className={`status-badge ${match.status}`}>{match.status}</span>
                </div>
                <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Outlet:</strong> {match.outlets?.name || match.outlet_id}</p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Order ID:</strong> #{match.id}</p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Total:</strong> {money(match.total)}</p>
                <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <strong>Items:</strong>
                  <ul style={{ margin: '6px 0 0 20px', fontSize: '13.5px' }}>
                    {(match.order_items || []).map((it, idx) => (
                      <li key={idx}>{it.qty}× {it.name} {it.notes ? `(${it.notes})` : ''}</li>
                    ))}
                  </ul>
                </div>
                {match.status !== 'collected' && (
                  <button
                    className="btn-primary btn-spring"
                    style={{ marginTop: '14px', width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      setOrders(ords => ords.map(o => o.id === match.id ? { ...o, status: 'collected' } : o))
                      setScanInput('')
                      setNotice(`Order #${match.id} (Token #${match.token}) collected!`)
                    }}
                  >
                    Confirm Collection & Hand Over Meal
                  </button>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── ADMIN: AUDIT LOG & RENDER SYSTEM TELEMETRY ── */}
      {isAdmin && adminTab === 'audit' && (
        <div className="audit-log-card">
          {/* Render Cloud Telemetry Instructions Box */}
          <div className="render-info-card">
            <div className="render-info-badge">
              <Sparkles size={12} /> Live Render Cloud Deployment
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '4px 0 6px', color: '#FFFFFF' }}>
              Where to Check Live Server & API Logs on Render.com
            </h3>
            <p style={{ fontSize: '13px', opacity: 0.9, lineHeight: 1.5, margin: 0 }}>
              V FOODS runs live on Render's global cloud. To inspect production HTTP request streams, API latency, database calls, and server events:
            </p>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', background: 'rgba(255,255,255,0.06)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div><strong style={{ color: '#60A5FA', marginRight: '6px' }}>Step 1:</strong> Log into your Render account at <a href="https://dashboard.render.com" target="_blank" rel="noreferrer" style={{ color: '#60A5FA', fontWeight: 700, textDecoration: 'underline' }}>dashboard.render.com</a>.</div>
              <div><strong style={{ color: '#60A5FA', marginRight: '6px' }}>Step 2:</strong> Click on your active service: <strong>vfoods-web</strong> (Frontend CDN) or <strong>vfoods-api</strong> (FastAPI Backend).</div>
              <div><strong style={{ color: '#60A5FA', marginRight: '6px' }}>Step 3:</strong> In the left-hand sidebar menu, click the <strong>"Logs"</strong> tab.</div>
              <div><strong style={{ color: '#60A5FA', marginRight: '6px' }}>Step 4:</strong> All real-time incoming requests, status codes (200/400/500), deploy builds, and console logs stream live in that terminal!</div>
            </div>
          </div>

          {/* In-App Audit Trail */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3>Campus Operations Audit Trail</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Every order event, stock modification, role change, and wallet grant is tamper-logged.</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'ORDER', 'INVENTORY', 'AVAILABILITY', 'OUTLET', 'SECURITY'].map(cat => (
                <button
                  key={cat}
                  className={`filter-pill btn-spring ${auditFilter === cat ? 'active' : ''}`}
                  onClick={() => setAuditFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / User</th>
                  <th>Role</th>
                  <th>Category</th>
                  <th>Event Action</th>
                  <th>Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(auditLogs || [])
                  .filter(l => auditFilter === 'ALL' || l.category === auditFilter)
                  .map(log => {
                    const tagClass = log.category === 'ORDER' ? 'tag-order' :
                                     (log.category === 'INVENTORY' || log.category === 'AVAILABILITY') ? 'tag-stock' :
                                     log.category === 'OUTLET' ? 'tag-outlet' :
                                     log.category === 'WALLET' ? 'tag-wallet' : 'tag-security'
                    return (
                      <tr key={log.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td><strong>{log.actor}</strong></td>
                        <td><span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{log.role}</span></td>
                        <td><span className={`audit-tag ${tagClass}`}>{log.category}</span></td>
                        <td><strong style={{ fontSize: '12px' }}>{log.action}</strong></td>
                        <td style={{ color: 'var(--text-main)', fontSize: '12.5px' }}>{log.details}</td>
                        <td>
                          <span style={{ fontSize: '10.5px', background: '#DCFCE7', color: '#166534', padding: '2px 7px', borderRadius: '4px', fontWeight: 800 }}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff & Admin Food Item Modal */}
      <FoodItemModal
        isOpen={foodModalOpen}
        onClose={() => { setFoodModalOpen(false); setModalItem(null); }}
        outlet={activeManagedOutlet}
        item={modalItem}
        onSave={(outId, itemData, existingId) => {
          if (existingId) {
            updateMenuItem(outId, existingId, itemData)
          } else {
            addMenuItem(outId, itemData)
          }
        }}
        onDelete={(outId, itemId) => {
          deleteMenuItem(outId, itemId)
        }}
      />
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCREEN (Universal Dining Platform — User, Shop Staff, Shop Owner, Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE BRAND ICON
// ─────────────────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE PROFILE SCREEN (Mandatory One-Time Setup for Google OAuth Accounts)
// ─────────────────────────────────────────────────────────────────────────────
function CompleteProfileScreen({ currentUser, onCompleted, onSignOut }) {
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleProfileSubmit(e) {
    e.preventDefault()
    setError('')
    const cleanMobile = mobile.replace(/\D/g, '')

    if (cleanMobile.length !== 10) {
      return setError('Please enter a valid 10-digit mobile number')
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters')
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match')
    }

    setSubmitting(true)
    try {
      if (supabase) {
        // 1. Enforce mobile uniqueness at DB level via RPC
        const { data: isAvail, error: availErr } = await supabase.rpc('check_mobile_availability', {
          p_mobile: cleanMobile,
          p_user_id: currentUser?.id
        })
        if (!availErr && isAvail === false) {
          setSubmitting(false)
          return setError('This mobile number is already registered to another account. Please enter a different number.')
        }

        // 2. Complete profile on DB profiles table FIRST so onAuthStateChange doesn't see empty profile
        const { error: rpcErr } = await supabase.rpc('complete_google_profile', { p_mobile: cleanMobile })
        if (rpcErr) {
          console.warn('complete_google_profile RPC fallback:', rpcErr)
          await supabase.from('profiles').update({
            mobile_number: cleanMobile,
            phone: cleanMobile,
            profile_completed: true,
            has_password: true
          }).eq('id', currentUser.id)
        }

        // 3. Set account password on Supabase Auth User
        const { error: pwdErr } = await supabase.auth.updateUser({ password })
        if (pwdErr) {
          setSubmitting(false)
          return setError(pwdErr.message)
        }
      }

      onCompleted({
        ...currentUser,
        mobile_number: cleanMobile,
        phone: cleanMobile,
        profile_completed: true,
        has_password: true,
        requiresProfileCompletion: false
      })
    } catch (err) {
      setError(err.message || 'Failed to complete profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-art">
        <div className="login-art-top">
          <img src="/vit-chennai-logo.png" alt="V Foods Logo" className="vit-logo-img" />
          <div className="vfoods-brand-name login-hero-brand" title="V Foods">
            <span className="vfoods-logo-v">V</span>
            <span className="vfoods-logo-space"> </span>
            <span className="vfoods-logo-f">F</span>
            <span className="vfoods-logo-oods">OODS</span>
          </div>
        </div>
        <div>
          <h1>One final step,<br /><span>complete your profile.</span></h1>
          <p style={{ marginTop: '16px', color: '#94A3B8', fontSize: '15px', lineHeight: 1.6 }}>
            Set your mobile number for campus canteen pickup tokens and create a password so you can sign in directly from any device.
          </p>
        </div>
        <small style={{ color: '#64748B' }}>© 2026 V Foods · VIT Chennai Campus Dining</small>
      </div>

      <div className="login-form-wrapper">
        <div className="login-card-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ background: '#EFF6FF', color: 'var(--blue-primary)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
              One-Time Profile Setup
            </span>
          </div>

          <h2>Complete Your Profile</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '18px', lineHeight: 1.5 }}>
            Welcome, <strong>{currentUser?.full_name || currentUser?.email}</strong>! Please enter your mobile number and create a password.
          </p>

          <div className="auth-feedback-banner info">
            This password allows you to log in later using your mobile number or email without going through Google again.
          </div>

          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label>Mobile Number *</label>
              <div className="phone-input-group">
                <span className="phone-prefix">+91</span>
                <input
                  id="complete-mobile"
                  type="tel"
                  maxLength="10"
                  className="phone-number-field"
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  required
                />
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                Used for order pickup tokens and fast mobile login.
              </small>
            </div>

            <div className="form-group">
              <label>Create Password *</label>
              <input
                id="complete-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                id="complete-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="auth-feedback-banner error">
                {error}
              </div>
            )}

            <button
              id="btn-complete-profile"
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            >
              {submitting ? 'Saving Profile...' : 'Complete & Continue'} <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED AUTH SCREEN (Unified Login, Manual Signup, Google Signup, Forgot Password)
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({ onLoginUser }) {
  // Modes: 'login' | 'signup' | 'forgot'
  const [authMode, setAuthMode] = useState('login')
  const [error, setError] = useState('')
  const [noticeMsg, setNoticeMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Unified Login state
  const [identifier, setIdentifier] = useState('') // email or 10-digit mobile
  const [loginPassword, setLoginPassword] = useState('')

  // Manual Signup state
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupMobile, setSignupMobile] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('')

  // Quick Test Bar state (preserved)
  const [selectedCanteenId, setSelectedCanteenId] = useState('g1')
  const [showAllCanteens, setShowAllCanteens] = useState(false)

  // Clear errors when switching modes
  function switchMode(newMode) {
    setAuthMode(newMode)
    setError('')
    setNoticeMsg('')
  }

  // Quick login handler for test buttons
  async function handleQuickLogin(userObj) {
    if (!userObj) return
    onLoginUser(userObj)
    if (supabase && userObj.email) {
      try {
        await supabase.auth.signInWithPassword({
          email: userObj.email,
          password: userObj.password || 'Password@123'
        })
      } catch (err) {
        console.warn('Quick login session establishment:', err)
      }
    }
  }

  // 1. UNIFIED LOGIN HANDLER
  async function handleUnifiedLogin(e) {
    e.preventDefault()
    setError('')
    setNoticeMsg('')
    setLoading(true)

    const rawId = identifier.trim()
    if (!rawId) {
      setLoading(false)
      return setError('Please enter your email or mobile number')
    }
    if (!loginPassword) {
      setLoading(false)
      return setError('Please enter your password')
    }

    try {
      let resolvedEmail = null

      if (rawId.includes('@')) {
        resolvedEmail = rawId
      } else {
        // Mobile number provided: look up matching email via database RPC
        const cleanMobile = rawId.replace(/\D/g, '')
        if (supabase) {
          const { data: lookedUpEmail, error: rpcErr } = await supabase.rpc('lookup_email_by_mobile', {
            p_mobile: cleanMobile
          })
          if (rpcErr) console.warn('lookup_email_by_mobile error:', rpcErr)
          resolvedEmail = lookedUpEmail
        }
        // Fallback test users check
        if (!resolvedEmail) {
          const matchedTest = TEST_USERS.find(u => u.phone?.replace(/\D/g, '').slice(-10) === cleanMobile.slice(-10))
          if (matchedTest) resolvedEmail = matchedTest.email
        }
      }

      // If no account found for this mobile/email, show ONE generic error
      if (!resolvedEmail) {
        setLoading(false)
        return setError('Invalid login details')
      }

      if (supabase) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password: loginPassword
        })

        if (authErr) {
          // Check quick test accounts fallback
          const matchedTest = TEST_USERS.find(u =>
            (u.email.toLowerCase() === resolvedEmail.toLowerCase()) &&
            (u.password === loginPassword || !u.password)
          )
          if (matchedTest) {
            setLoading(false)
            return onLoginUser(matchedTest)
          }
          // Never reveal whether email or password was wrong
          setLoading(false)
          return setError('Invalid login details')
        }

        // Fetch user profile from database
        const userId = authData.user.id
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()

        let userObj = profile
        if (userObj) {
          if (userObj.outlet_id) {
            const match = CANTEEN_STAFF_OWNER_MAP.find(c => c.id === userObj.outlet_id) || DEMO_OUTLETS.find(o => o.id === userObj.outlet_id)
            if (match) userObj.outlet_name = match.name
          }
          // Check if Google OAuth account has completed profile setup
          const isOAuth = authData.user.app_metadata?.provider === 'google' || authData.user.identities?.some(i => i.provider === 'google')
          if (isOAuth && (!userObj.mobile_number || !userObj.profile_completed || !userObj.has_password)) {
            userObj.requiresProfileCompletion = true
          }
        } else {
          userObj = {
            id: userId,
            email: resolvedEmail,
            full_name: resolvedEmail.split('@')[0],
            role: 'user',
            balance: 0
          }
        }

        setLoading(false)
        onLoginUser(userObj)
      } else {
        const matchedTest = TEST_USERS.find(u =>
          (u.email.toLowerCase() === resolvedEmail.toLowerCase()) &&
          (u.password === loginPassword || !u.password)
        )
        setLoading(false)
        if (matchedTest) return onLoginUser(matchedTest)
        setError('Invalid login details')
      }
    } catch (err) {
      setLoading(false)
      setError('Invalid login details')
    }
  }

  // 2. MANUAL SIGNUP HANDLER (PATH A)
  async function handleManualSignup(e) {
    e.preventDefault()
    setError('')
    setNoticeMsg('')

    if (!signupName.trim()) {
      return setError('Please enter your full name')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(signupEmail.trim())) {
      return setError('Please enter a valid email address')
    }
    const cleanMobile = signupMobile.replace(/\D/g, '')
    if (cleanMobile.length !== 10) {
      return setError('Please enter a valid 10-digit mobile number')
    }
    if (signupPassword.length < 6) {
      return setError('Password must be at least 6 characters')
    }
    if (signupPassword !== confirmPassword) {
      return setError('Passwords do not match')
    }

    setLoading(true)
    try {
      if (supabase) {
        // Enforce mobile uniqueness at database level via RPC first
        const { data: isAvail, error: availErr } = await supabase.rpc('check_mobile_availability', {
          p_mobile: cleanMobile
        })
        if (!availErr && isAvail === false) {
          setLoading(false)
          return setError('Mobile number is already registered to another account')
        }

        // Call register_manual_user to create the auth.users credential with instant confirmation
        const { data: uid, error: regErr } = await supabase.rpc('register_manual_user', {
          p_name: signupName.trim(),
          p_email: signupEmail.trim(),
          p_mobile: cleanMobile,
          p_password: signupPassword
        })

        if (regErr) {
          setLoading(false)
          if (regErr.message?.includes('MOBILE_EXISTS') || regErr.message?.includes('already registered to another account')) {
            return setError('Mobile number is already registered to another account')
          }
          if (regErr.message?.includes('EMAIL_EXISTS')) {
            return setError('Email address is already registered to another account')
          }
          return setError(regErr.message || 'Signup failed')
        }

        // Establish session with Supabase Auth
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email: signupEmail.trim(),
          password: signupPassword
        })

        if (loginErr) {
          setLoading(false)
          return setError('Account created but login failed: ' + loginErr.message)
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', loginData.user.id).single()

        setLoading(false)
        onLoginUser(profile || {
          id: loginData.user.id,
          full_name: signupName.trim(),
          email: signupEmail.trim(),
          mobile_number: cleanMobile,
          phone: cleanMobile,
          role: 'customer',
          has_password: true,
          profile_completed: true,
          balance: 0
        })
      } else {
        setLoading(false)
        onLoginUser({
          id: `usr-${Date.now()}`,
          full_name: signupName.trim(),
          email: signupEmail.trim(),
          mobile_number: cleanMobile,
          phone: cleanMobile,
          role: 'user',
          has_password: true,
          profile_completed: true,
          balance: 0
        })
      }
    } catch (err) {
      setLoading(false)
      setError(err.message || 'Signup failed')
    }
  }

  // 3. GOOGLE SIGNUP / SIGNIN HANDLER (PATH B)
  async function handleGoogleLogin() {
    setError('')
    setNoticeMsg('')
    if (supabase) {
      const { error: gErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (gErr) {
        if (gErr.message?.toLowerCase().includes('not enabled') || gErr.message?.toLowerCase().includes('unsupported provider')) {
          setError('Google Sign-In is not enabled yet in your Supabase project (Authentication > Providers > Google). Enter your Google OAuth Client ID & Secret in the Supabase Dashboard to complete live activation.')
        } else {
          setError(gErr.message)
        }
      }
    }
  }

  // Google Test Simulator: sets up or logs into a real Google test user
  async function handleSimulateGoogleLogin(isNewUser = true) {
    setError('')
    setNoticeMsg('')
    setLoading(true)
    const testEmail = isNewUser ? `google.new.${Date.now()}@gmail.com` : 'google.returning@gmail.com'
    const testName = isNewUser ? 'Vikram Google' : 'Ananya Google (Returning)'

    try {
      if (supabase) {
        if (isNewUser) {
          // Creates real auth user with provider = 'google' and profile_completed = false
          const { data: uid, error: createErr } = await supabase.rpc('create_google_test_user', {
            p_email: testEmail,
            p_name: testName
          })
          if (createErr) console.warn('create_google_test_user rpc:', createErr)
        }

        // Sign in using the test account's auth credentials
        const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: 'GoogleTest@123'
        })

        if (signInErr) {
          setLoading(false)
          return setError(`Google test simulation: ${signInErr.message}`)
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single()
        const userObj = profile || { id: authData.user.id, email: testEmail, full_name: testName, role: 'user' }

        if (isNewUser || !userObj.profile_completed || !userObj.mobile_number) {
          userObj.requiresProfileCompletion = true
        }

        setLoading(false)
        onLoginUser(userObj)
      } else {
        setLoading(false)
        onLoginUser({
          id: `usr-google-${Date.now()}`,
          full_name: testName,
          email: testEmail,
          role: 'user',
          requiresProfileCompletion: isNewUser
        })
      }
    } catch (err) {
      setLoading(false)
      setError(err.message || 'Google simulation failed')
    }
  }

  // 4. FORGOT PASSWORD HANDLER
  async function handleForgotPassword(e) {
    e.preventDefault()
    setError('')
    setNoticeMsg('')
    const rawId = forgotIdentifier.trim()
    if (!rawId) return setError('Please enter your registered email or mobile number')

    setLoading(true)
    try {
      let targetEmail = null
      if (rawId.includes('@')) {
        targetEmail = rawId
      } else {
        const cleanMobile = rawId.replace(/\D/g, '')
        if (supabase) {
          const { data: foundEmail } = await supabase.rpc('lookup_email_by_mobile', { p_mobile: cleanMobile })
          targetEmail = foundEmail
        }
      }

      if (supabase && targetEmail) {
        supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: window.location.origin
        }).catch(err => console.warn('resetPasswordForEmail notice:', err))
      }

      // Neutral confirmation message (prevents account enumeration)
      setLoading(false)
      setNoticeMsg('If an account exists, a reset link has been sent to the registered email.')
    } catch (_) {
      setLoading(false)
      setNoticeMsg('If an account exists, a reset link has been sent to the registered email.')
    }
  }

  return (
    <div className="login-container">
      <div className="login-art">
        <div className="login-art-top">
          <img src="/vit-chennai-logo.png" alt="V Foods Logo" className="vit-logo-img" />
          <div className="vfoods-brand-name login-hero-brand" title="V Foods">
            <span className="vfoods-logo-v">V</span>
            <span className="vfoods-logo-space"> </span>
            <span className="vfoods-logo-f">F</span>
            <span className="vfoods-logo-oods">OODS</span>
          </div>
        </div>
        <div>
          <h1>Pre-order campus meals,<br /><span>pick up in seconds.</span></h1>
          <p style={{ marginTop: '16px', color: '#94A3B8', fontSize: '15px', lineHeight: 1.6 }}>
            Order ahead from your favourite VIT Chennai canteens.
            <br />Get your digital token, skip the counter line, and grab hot food on your way.
          </p>
        </div>
        <small style={{ color: '#64748B' }}>© 2026 V Foods · VIT Chennai Campus Dining</small>
      </div>

      <div className="login-form-wrapper">
        <div className="login-card-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ background: '#EFF6FF', color: 'var(--blue-primary)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
              V Foods Access
            </span>
          </div>

          {/* ════ VIEW 1: UNIFIED LOGIN ════ */}
          {authMode === 'login' && (
            <div>
              <h2>Sign In to V Foods</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '18px' }}>
                Enter your email or mobile number to continue.
              </p>

              {/* Continue with Google */}
              <button
                id="btn-google-login"
                type="button"
                className="btn-google"
                onClick={handleGoogleLogin}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              <div className="auth-divider">
                <span>OR</span>
              </div>

              {noticeMsg && (
                <div className="auth-feedback-banner success">
                  {noticeMsg}
                </div>
              )}

              {error && (
                <div className="auth-feedback-banner error">
                  {error}
                </div>
              )}

              <form onSubmit={handleUnifiedLogin}>
                <div className="form-group">
                  <label htmlFor="login-identifier">Email or Mobile Number *</label>
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="user@gmail.com or 9876543210"
                    required
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label htmlFor="login-password" style={{ margin: 0 }}>Password *</label>
                    <a
                      href="#"
                      onClick={e => { e.preventDefault(); switchMode('forgot') }}
                      style={{ fontSize: '12px', color: 'var(--blue-primary)', fontWeight: 700 }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  id="btn-sign-in"
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
                >
                  {loading ? 'Signing In...' : 'Sign In'} <ArrowRight size={16} />
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                Don't have an account?{' '}
                <a
                  href="#"
                  style={{ color: 'var(--blue-primary)', fontWeight: 700 }}
                  onClick={e => { e.preventDefault(); switchMode('signup') }}
                >
                  Register New Account
                </a>
              </p>
            </div>
          )}

          {/* ════ VIEW 2: MANUAL SIGNUP (PATH A) ════ */}
          {authMode === 'signup' && (
            <div>
              <h2>Create Account</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '18px' }}>
                Sign up with your details to pre-order meals across campus.
              </p>

              {error && (
                <div className="auth-feedback-banner error">
                  {error}
                </div>
              )}

              <form onSubmit={handleManualSignup}>
                <div className="form-group">
                  <label htmlFor="signup-name">Full Name *</label>
                  <input
                    id="signup-name"
                    type="text"
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    placeholder="Rahul Sharma"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-email">Email Address *</label>
                  <input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    placeholder="rahul.sharma@gmail.com"
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                    Used for order receipts and account recovery.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="signup-mobile">Mobile Number *</label>
                  <div className="phone-input-group">
                    <span className="phone-prefix">+91</span>
                    <input
                      id="signup-mobile"
                      type="tel"
                      maxLength="10"
                      className="phone-number-field"
                      value={signupMobile}
                      onChange={e => setSignupMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      required
                    />
                  </div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                    Must be unique. Used for token SMS and fast mobile login.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="signup-password">Password *</label>
                  <input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-confirm-password">Confirm Password *</label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    minLength={6}
                    required
                  />
                </div>

                <button
                  id="btn-sign-up"
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                >
                  {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight size={16} />
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <a
                  href="#"
                  style={{ color: 'var(--blue-primary)', fontWeight: 700 }}
                  onClick={e => { e.preventDefault(); switchMode('login') }}
                >
                  Sign In to Account
                </a>
              </p>
            </div>
          )}

          {/* ════ VIEW 3: FORGOT PASSWORD ════ */}
          {authMode === 'forgot' && (
            <div>
              <h2>Reset Password</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '18px' }}>
                Enter your registered email or mobile number to receive a reset link.
              </p>

              {noticeMsg && (
                <div className="auth-feedback-banner success">
                  {noticeMsg}
                </div>
              )}

              {error && (
                <div className="auth-feedback-banner error">
                  {error}
                </div>
              )}

              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label htmlFor="forgot-identifier">Email or Mobile Number *</label>
                  <input
                    id="forgot-identifier"
                    type="text"
                    value={forgotIdentifier}
                    onChange={e => setForgotIdentifier(e.target.value)}
                    placeholder="user@domain.com or 9876543210"
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    The reset instructions will always be sent to the account's registered email address.
                  </small>
                </div>

                <button
                  id="btn-send-reset"
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'} <ArrowRight size={16} />
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                Remember your password?{' '}
                <a
                  href="#"
                  style={{ color: 'var(--blue-primary)', fontWeight: 700 }}
                  onClick={e => { e.preventDefault(); switchMode('login') }}
                >
                  Back to Sign In
                </a>
              </p>
            </div>
          )}

          {/* ════ QUICK TEST ACCESS BOX (PRESERVED) ════ */}
          <div className="quick-test-box">
            <div className="quick-test-header">
              <p style={{ margin: 0, fontWeight: 800 }}>Quick Test Access (Select Role):</p>
              <div className="quick-canteen-row">
                <label htmlFor="quick-canteen-select" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-subtle)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Canteen:
                </label>
                <select
                  id="quick-canteen-select"
                  value={selectedCanteenId}
                  onChange={e => setSelectedCanteenId(e.target.value)}
                  style={{ fontSize: '12px', fontWeight: 700, padding: '5px 8px', borderRadius: '6px', border: '1.5px solid var(--blue-primary)', background: '#FFFFFF', color: 'var(--text-main)', cursor: 'pointer', flex: 1, minWidth: '160px' }}
                >
                  {CANTEEN_STAFF_OWNER_MAP.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="quick-chip-grid">
              {/* Customer User */}
              <button
                type="button"
                className="quick-chip"
                onClick={() => handleQuickLogin(TEST_USERS.find(u => u.role === 'user' || u.role === 'student'))}
                title="Login as Rahul Sharma (User)"
              >
                <User size={14} strokeWidth={2} />
                <span style={{ fontWeight: 700 }}>User</span>
              </button>

              {/* Shop Staff for selected canteen */}
              <button
                type="button"
                className="quick-chip"
                onClick={() => {
                  const staffUser = TEST_USERS.find(u => u.role === 'staff' && u.outlet_id === selectedCanteenId)
                  if (staffUser) handleQuickLogin(staffUser)
                }}
                title={`Login as Shop Staff for ${CANTEEN_STAFF_OWNER_MAP.find(c => c.id === selectedCanteenId)?.name}`}
                style={{ background: '#1E40AF' }}
              >
                <ChefHat size={14} strokeWidth={2} />
                <span style={{ fontWeight: 700 }}>Shop Staff ({selectedCanteenId.toUpperCase()})</span>
              </button>

              {/* Shop Owner for selected canteen */}
              <button
                type="button"
                className="quick-chip"
                onClick={() => {
                  const ownerUser = TEST_USERS.find(u => (u.role === 'owner' || u.role === 'shop_admin') && u.outlet_id === selectedCanteenId)
                  if (ownerUser) handleQuickLogin(ownerUser)
                }}
                title={`Login as Shop Admin for ${CANTEEN_STAFF_OWNER_MAP.find(c => c.id === selectedCanteenId)?.name}`}
                style={{ background: '#0B192C' }}
              >
                <Store size={14} strokeWidth={2} />
                <span style={{ fontWeight: 700 }}>Shop Admin ({selectedCanteenId.toUpperCase()})</span>
              </button>

              {/* Super Admin */}
              <button
                type="button"
                className="quick-chip"
                onClick={() => handleQuickLogin(TEST_USERS.find(u => u.is_superadmin))}
                title="Login as Platform Super Admin"
              >
                <Shield size={14} strokeWidth={2} />
                <span style={{ fontWeight: 700 }}>Super Admin (Me)</span>
              </button>
            </div>

            {/* Google OAuth Test Simulator Chips */}
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                id="btn-simulate-google-new"
                type="button"
                className="quick-chip"
                style={{ background: '#4285F4', fontSize: '11px', padding: '5px 10px' }}
                onClick={() => handleSimulateGoogleLogin(true)}
                title="Simulate first-time Google sign up to test profile completion"
              >
                <GoogleIcon />
                <span>Simulate Google Sign-Up (New)</span>
              </button>

              <button
                id="btn-simulate-google-returning"
                type="button"
                className="quick-chip"
                style={{ background: '#334155', fontSize: '11px', padding: '5px 10px' }}
                onClick={() => handleSimulateGoogleLogin(false)}
                title="Simulate returning Google sign-in (bypasses profile completion)"
              >
                <GoogleIcon />
                <span>Google Sign-In (Returning)</span>
              </button>
            </div>

            {/* Expandable toggle for All 13 Canteen Staff & Owner Matrix */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => setShowAllCanteens(!showAllCanteens)}
                style={{
                  background: 'none',
                  border: 0,
                  padding: 0,
                  color: 'var(--blue-primary)',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{showAllCanteens ? 'Hide' : 'Show'} All 13 Canteen Logins ({CANTEEN_STAFF_OWNER_MAP.length * 2} Dedicated Test Accounts)</span>
              </button>

              {showAllCanteens && (
                <div className="canteen-matrix-grid">
                  {CANTEEN_STAFF_OWNER_MAP.map(c => {
                    const staffU = TEST_USERS.find(u => u.role === 'staff' && u.outlet_id === c.id)
                    const ownerU = TEST_USERS.find(u => (u.role === 'owner' || u.role === 'shop_admin') && u.outlet_id === c.id)
                    return (
                      <div key={c.id} className="canteen-matrix-card">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {c.location} · <code>{c.id}</code>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="canteen-matrix-btn staff"
                            title={`Staff Login: ${c.staffEmail} | Phone: ${c.staffPhone} | Password: Password@123`}
                            onClick={() => handleQuickLogin(staffU)}
                          >
                            Staff
                          </button>
                          <button
                            type="button"
                            className="canteen-matrix-btn owner"
                            title={`Owner Login: ${c.ownerEmail} | Phone: ${c.ownerPhone} | Password: Password@123`}
                            onClick={() => handleQuickLogin(ownerU)}
                          >
                            Owner
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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

// ─────────────────────────────────────────────────────────────────────────────
// SCANNABLE QR CODE (High-Res QR with SVG Fallback)
// ─────────────────────────────────────────────────────────────────────────────
function ScannableQrCode({ value, size = 90, label = '', onEnlarge }) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    let active = true
    if (value) {
      QRCode.toDataURL(value, {
        width: size * 3,
        margin: 1,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      }).then(url => {
        if (active) setDataUrl(url)
      }).catch(() => {})
    }
    return () => { active = false }
  }, [value, size])

  return (
    <div className="qr-scannable-wrap" onClick={onEnlarge} style={{ cursor: onEnlarge ? 'pointer' : 'default' }}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`QR-${value}`}
          style={{ width: size, height: size, borderRadius: '8px', display: 'block', background: '#FFFFFF', padding: '3px', border: '1px solid #E2E8F0' }}
        />
      ) : (
        <SvgQrCode value={value} size={size} />
      )}
      {label && <span className="qr-scannable-label">{label}</span>}
    </div>
  )
}

function QrEnlargeModal({ order, onClose }) {
  if (!order) return null
  return (
    <div className="ios-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="qr-modal-card modal-enter" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Campus Dining Pickup Pass
            </span>
            <h3 style={{ fontSize: '20px', fontWeight: 900, margin: '2px 0 0', color: 'var(--blue-primary)' }}>
              TOKEN #{order.token}
            </h3>
          </div>
          <button className="cart-clear-btn" onClick={onClose} style={{ padding: '6px' }}><X size={18} /></button>
        </div>

        <div style={{ textAlign: 'center', background: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '2px dashed var(--blue-primary)', boxShadow: '0 8px 24px rgba(30,58,138,0.1)' }}>
          <div style={{ display: 'inline-block' }}>
            <ScannableQrCode value={`CB1.${order.id}.${order.token}`} size={180} />
          </div>
          <p style={{ marginTop: '12px', fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
            Order #{order.id} · {order.outlets?.name || order.outlet_id}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
            <span className={`status-badge ${order.status}`}>{order.status.toUpperCase()}</span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
              PAID {money(order.total)}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Present this QR at the counter for automated verification and token collection.
        </div>

        <button className="btn-primary btn-spring" style={{ width: '100%', marginTop: '16px', padding: '10px', justifyContent: 'center' }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}

export default App