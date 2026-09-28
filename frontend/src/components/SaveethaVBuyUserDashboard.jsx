import React, { useState, useMemo } from 'react'
import {
  Search, X, ArrowLeft, Store, ShoppingBag, Clock, User, CreditCard,
  ChevronRight, Plus, Minus, Trash2, CheckCircle2, AlertCircle, Sparkles,
  Tag, Utensils, Zap, Download, LogOut, Check, ShoppingCart, RefreshCw
} from 'lucide-react'
import { getFoodImage } from '../lib/foodImages'

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTIC VIT CHENNAI FOOD COURTS (Reference: Saveetha V-Buy structure)
// ─────────────────────────────────────────────────────────────────────────────
export const CAMPUS_FOOD_COURTS = [
  {
    id: 'fc-gazebo',
    name: 'Gazebo Food Court',
    subtitle: 'Central Campus Hub · Ground Floor',
    locationKey: 'Gazebo (Main Canteen)',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    outlets: ['g1', 'g2', 'g3', 'g4'],
  },
  {
    id: 'fc-northsquare',
    name: 'North Square Food Court',
    subtitle: 'North Square Complex · 1st Floor',
    locationKey: 'North Square',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    outlets: ['n1', 'n2', 'n3', 'n4'],
  },
  {
    id: 'fc-ab3',
    name: 'AB3 Food Complex',
    subtitle: 'Academic Block 3 Amphitheatre Area',
    locationKey: 'AB3 Amphitheatre',
    image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&auto=format&fit=crop&q=80',
    outlets: ['ab3'],
  },
  {
    id: 'fc-academic',
    name: 'Academic Blocks Diner',
    subtitle: 'AB1 & Delta Blocks Courtyard',
    locationKey: 'Academic Blocks',
    image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&auto=format&fit=crop&q=80',
    outlets: ['ab1', 'delta'],
  },
  {
    id: 'fc-pavilion',
    name: 'Campus Pavilion & Stores',
    subtitle: 'Central Walkway & Student Hub',
    locationKey: 'Campus Outlets & Stores',
    image: 'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=600&auto=format&fit=crop&q=80',
    outlets: ['store1', 'store2'],
  },
]

function getItemImageUrl(item) {
  if (!item) return ''
  const img = getFoodImage(item.name, item.category)
  if (typeof img === 'string') return img
  return img?.url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80'
}

export default function SaveethaVBuyUserDashboard({
  currentUser,
  setCurrentUser,
  role,
  outlets = [],
  visibleOutlets = [],
  cart,
  setCart,
  addToCart,
  removeFromCart,
  wallet,
  topUp,
  creditWalletBalance,
  orders = [],
  placeOrder,
  repeatOrder,
  tab,
  setTab,
  notice,
  setNotice,
  busy,
  walletPrefill,
  setWalletPrefill,
  itemRatings,
  submitItemRating,
  handleSignOut,
  handleInstallClick,
  pickupSlots = [],
  isScheduled,
  setIsScheduled,
  selectedSlotId,
  setSelectedSlotId,
  appliedCoupon,
  setAppliedCoupon,
  availableCoupons = [],
  OrdersView,
  WalletView,
  ProfileView,
  money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
}) {
  // Navigation & Screen selection
  const [selectedFoodCourt, setSelectedFoodCourt] = useState(null)
  const [explorerCanteenId, setExplorerCanteenId] = useState('all')
  const [explorerFilter, setExplorerFilter] = useState('all') // 'all' | 'popular' | 'deals' | 'veg' | 'non-veg'
  const [popularFilter, setPopularFilter] = useState('all') // 'all' | 'veg' | 'non-veg'
  const [searchQuery, setSearchQuery] = useState('')
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [couponInput, setCouponInput] = useState('')

  // Cart totals
  const subtotal = (cart.items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0)
  const cartQty = (cart.items || []).reduce((s, i) => s + (i.qty || 0), 0)

  let discount = 0
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'flat') {
      discount = Math.min(subtotal, appliedCoupon.discount_value)
    } else if (appliedCoupon.discount_type === 'percent') {
      discount = Math.min(subtotal, Math.round((subtotal * appliedCoupon.discount_value) / 100))
    }
  }
  const finalDebit = Math.max(0, subtotal - discount)
  const isInsufficient = (wallet?.balance || 0) < finalDebit
  const deficit = Math.max(0, finalDebit - (wallet?.balance || 0))

  // Active orders count for pulse badge
  const activeOrdersCount = (orders || []).filter(o => o.status !== 'collected' && o.status !== 'cancelled').length

  // Build a flat list of all dishes with outlet metadata
  const allDishes = useMemo(() => {
    const list = []
    outlets.forEach(o => {
      (o.menu_items || []).forEach(it => {
        list.push({ ...it, outlet: o })
      })
    })
    return list
  }, [outlets])

  // "🔥 Popular Near By" items (12 curated dishes across outlets)
  const popularDishes = useMemo(() => {
    let items = allDishes
    if (popularFilter === 'veg') items = items.filter(i => i.is_veg === true)
    if (popularFilter === 'non-veg') items = items.filter(i => i.is_veg === false)
    return items.slice(0, 12)
  }, [allDishes, popularFilter])

  // Search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return allDishes.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) ||
      (i.outlet?.name || '').toLowerCase().includes(q)
    )
  }, [allDishes, searchQuery])

  // Food Court Explorer Outlets & Dishes
  const explorerOutlets = useMemo(() => {
    if (!selectedFoodCourt) return []
    return outlets.filter(o =>
      selectedFoodCourt.outlets.includes(o.id) ||
      o.location === selectedFoodCourt.locationKey
    )
  }, [selectedFoodCourt, outlets])

  const explorerActiveOutlet = useMemo(() => {
    if (explorerCanteenId === 'all') return null
    return explorerOutlets.find(o => o.id === explorerCanteenId) || null
  }, [explorerOutlets, explorerCanteenId])

  const explorerDishes = useMemo(() => {
    let items = []
    if (explorerCanteenId === 'all') {
      explorerOutlets.forEach(o => {
        (o.menu_items || []).forEach(it => items.push({ ...it, outlet: o }))
      })
    } else {
      const o = explorerActiveOutlet
      if (o) {
        items = (o.menu_items || []).map(it => ({ ...it, outlet: o }))
      }
    }

    if (explorerFilter === 'veg') items = items.filter(i => i.is_veg === true)
    if (explorerFilter === 'non-veg') items = items.filter(i => i.is_veg === false)
    if (explorerFilter === 'deals') items = items.filter(i => i.price <= 50)
    if (explorerFilter === 'popular') items = items.filter(i => i.price >= 40 && i.price <= 120)

    return items
  }, [explorerOutlets, explorerCanteenId, explorerActiveOutlet, explorerFilter])

  // Quick switch role handler
  function handleRoleSwitch(newRole) {
    if (setCurrentUser) {
      setCurrentUser(prev => ({
        ...prev,
        role: newRole,
        outlet_id: newRole === 'staff' ? 'g1' : newRole === 'owner' ? 'g1' : undefined,
        outlet_name: newRole === 'staff' ? 'Gazebo C1' : newRole === 'owner' ? 'Gazebo C1' : undefined
      }))
    }
    setShowRoleSwitcher(false)
  }

  // Handle Deficit Topup & Checkout
  function handleDeficitPay() {
    if (deficit > 0 && setWalletPrefill) {
      setWalletPrefill(deficit)
      setTab('wallet')
      if (setNotice) setNotice(`Added ₹${deficit} deficit to wallet top-up. Complete recharge to pay.`)
    }
  }

  return (
    <div className="vbuy-desktop-backdrop">
      <div className="vbuy-app-frame">

        {/* ── Top Header Bar ── */}
        <header className="vbuy-top-bar">
          <div className="vbuy-brand-block">
            <div className="vbuy-brand-row">
              <img src="/vit-chennai-logo.png" alt="V-BUY" className="vbuy-brand-logo" />
              <div className="vbuy-brand-name">V-<span>BUY</span></div>
            </div>
            <div className="vbuy-location-pill" onClick={() => { setSelectedFoodCourt(null); setTab('browse') }} title="Campus Location">
              <span>📍 VIT Chennai Campus</span>
              <span style={{ fontSize: '10px' }}>⌵</span>
            </div>
          </div>

          <div className="vbuy-top-actions">
            {/* Quick Wallet Chip */}
            <div className="vbuy-wallet-chip" onClick={() => setTab('wallet')} title="Open Wallet">
              <CreditCard size={14} />
              <span>{money(wallet?.balance)}</span>
            </div>

            {/* Quick Role Switcher Pill (Developer / Tester Friendly) */}
            <button
              className="vbuy-role-chip"
              onClick={() => setShowRoleSwitcher(s => !s)}
              title="Switch user role for testing"
            >
              <User size={13} />
              <span>User</span>
              <span style={{ fontSize: '9px' }}>⌵</span>
            </button>

            {handleInstallClick && (
              <button
                onClick={handleInstallClick}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
                title="Install V-BUY App"
              >
                <Download size={17} />
              </button>
            )}

            <button
              onClick={handleSignOut}
              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              title="Sign Out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {/* Role Switcher Dropdown Modal */}
        {showRoleSwitcher && (
          <div style={{
            position: 'absolute', top: '56px', right: '16px', background: '#FFFFFF',
            border: '1px solid #E2E8F0', borderRadius: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            zIndex: 100, padding: '8px', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '4px'
          }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', padding: '4px 8px', textTransform: 'uppercase' }}>
              Switch Operational Role
            </span>
            <button
              onClick={() => handleRoleSwitch('user')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: 'none', background: '#EFF6FF', color: '#1D4ED8', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              <User size={14} /> Student / User View
            </button>
            <button
              onClick={() => handleRoleSwitch('staff')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#334155', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Store size={14} /> Shop Staff (Kitchen)
            </button>
            <button
              onClick={() => handleRoleSwitch('owner')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#334155', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Store size={14} /> Shop Owner (Franchisee)
            </button>
            <button
              onClick={() => handleRoleSwitch('admin')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#334155', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Sparkles size={14} /> Campus Super Admin
            </button>
          </div>
        )}

        {/* Notice toast */}
        {notice && (
          <div style={{
            background: '#1E293B', color: '#FFFFFF', padding: '10px 14px', margin: '8px 16px 0 16px',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: '12px', fontWeight: 600, zIndex: 70, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <span>{notice}</span>
            <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN 1: HOME SCREEN (tab === 'browse' && !selectedFoodCourt)
            ══════════════════════════════════════════════════════════════════════ */}
        {(tab === 'browse' || tab === 'home') && !selectedFoodCourt && (
          <div className="vbuy-main-content">
            {/* Search Bar */}
            <div className="vbuy-search-wrap">
              <Search size={16} className="vbuy-search-icon" />
              <input
                type="text"
                className="vbuy-search-input"
                placeholder="Search for food, canteens, dishes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="vbuy-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* If search query active: Show search results */}
            {searchQuery.trim() ? (
              <div>
                <div className="vbuy-section-header">
                  <span className="vbuy-section-title">
                    <Utensils size={16} color="#2563EB" /> Dishes ({searchResults.length})
                  </span>
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear Search
                  </button>
                </div>

                {!searchResults.length ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                    <Utensils size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>No dishes found for "{searchQuery}"</p>
                    <p style={{ fontSize: '11px' }}>Try searching "Dosa", "Biryani", or "Noodles"</p>
                  </div>
                ) : (
                  <div className="vbuy-dish-grid-3">
                    {searchResults.map(item => {
                      const cartItem = (cart.items || []).find(ci => ci.id === item.id)
                      const qty = cartItem ? cartItem.qty : 0
                      return (
                        <div key={item.id} className="vbuy-dish-card">
                          <div className="vbuy-dish-img-wrap">
                            <img
                              src={getItemImageUrl(item)}
                              alt={item.name}
                              className="vbuy-dish-img"
                              loading="lazy"
                            />
                            <div className="vbuy-dish-veg-badge">
                              <span className={item.is_veg ? 'vbuy-veg-icon' : 'vbuy-nonveg-icon'} />
                            </div>
                          </div>
                          <div className="vbuy-dish-body">
                            <div>
                              <div className="vbuy-dish-title" title={item.name}>{item.name}</div>
                              <div className="vbuy-dish-canteen">{item.outlet?.name}</div>
                            </div>
                            <div className="vbuy-dish-bottom">
                              <span className="vbuy-dish-price">{money(item.price)}</span>
                              {qty > 0 ? (
                                <div className="vbuy-dish-qty-stepper">
                                  <button onClick={() => removeFromCart(item.id)}>-</button>
                                  <span>{qty}</span>
                                  <button onClick={() => addToCart(item.outlet, item)}>+</button>
                                </div>
                              ) : (
                                <button className="vbuy-dish-add-btn" onClick={() => addToCart(item.outlet, item)}>
                                  + ADD
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* ── Section 1: "🔥 Popular Near By" ── */}
                <div className="vbuy-section-header">
                  <span className="vbuy-section-title">
                    <span>🔥</span> Popular Near By
                  </span>
                  <div className="vbuy-filter-pill-group">
                    <button
                      className={`vbuy-filter-pill-btn ${popularFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setPopularFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={`vbuy-filter-pill-btn ${popularFilter === 'veg' ? 'active' : ''}`}
                      onClick={() => setPopularFilter('veg')}
                    >
                      <span className="vbuy-veg-dot" /> Veg
                    </button>
                    <button
                      className={`vbuy-filter-pill-btn ${popularFilter === 'non-veg' ? 'active' : ''}`}
                      onClick={() => setPopularFilter('non-veg')}
                    >
                      <span className="vbuy-nonveg-dot" /> Non-veg
                    </button>
                  </div>
                </div>

                <div className="vbuy-dish-grid-3">
                  {popularDishes.map(item => {
                    const cartItem = (cart.items || []).find(ci => ci.id === item.id)
                    const qty = cartItem ? cartItem.qty : 0
                    return (
                      <div key={item.id} className="vbuy-dish-card">
                        <div className="vbuy-dish-img-wrap">
                          <img
                            src={getItemImageUrl(item)}
                            alt={item.name}
                            className="vbuy-dish-img"
                            loading="lazy"
                          />
                          <div className="vbuy-dish-veg-badge">
                            <span className={item.is_veg ? 'vbuy-veg-icon' : 'vbuy-nonveg-icon'} />
                          </div>
                        </div>
                        <div className="vbuy-dish-body">
                          <div>
                            <div className="vbuy-dish-title" title={item.name}>{item.name}</div>
                            <div className="vbuy-dish-canteen">{item.outlet?.name}</div>
                          </div>
                          <div className="vbuy-dish-bottom">
                            <span className="vbuy-dish-price">{money(item.price)}</span>
                            {qty > 0 ? (
                              <div className="vbuy-dish-qty-stepper">
                                <button onClick={() => removeFromCart(item.id)}>-</button>
                                <span>{qty}</span>
                                <button onClick={() => addToCart(item.outlet, item)}>+</button>
                              </div>
                            ) : (
                              <button className="vbuy-dish-add-btn" onClick={() => addToCart(item.outlet, item)}>
                                + ADD
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ── Section 2: "🏢 Food Courts (5)" ── */}
                <div className="vbuy-section-header">
                  <span className="vbuy-section-title">
                    <span>🏢</span> Campus Food Courts ({CAMPUS_FOOD_COURTS.length})
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    Tap to explore counters
                  </span>
                </div>

                <div className="vbuy-food-courts-grid">
                  {CAMPUS_FOOD_COURTS.map(fc => {
                    const courtOutlets = outlets.filter(o =>
                      fc.outlets.includes(o.id) || o.location === fc.locationKey
                    )
                    const itemCount = courtOutlets.reduce((s, o) => s + (o.menu_items || []).length, 0)
                    return (
                      <div
                        key={fc.id}
                        className="vbuy-fc-card"
                        onClick={() => {
                          setSelectedFoodCourt(fc)
                          setExplorerCanteenId('all')
                          setExplorerFilter('all')
                        }}
                      >
                        <img src={fc.image} alt={fc.name} className="vbuy-fc-img" loading="lazy" />
                        <div className="vbuy-fc-overlay">
                          <h3 className="vbuy-fc-title">{fc.name}</h3>
                          <p className="vbuy-fc-sub">{fc.subtitle}</p>
                          <div className="vbuy-fc-pill">
                            <span>🏢 {courtOutlets.length} {courtOutlets.length === 1 ? 'canteen' : 'canteens'}</span>
                            <span>|</span>
                            <span>🍽️ {itemCount} items ›</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN 2: FOOD COURT EXPLORER (selectedFoodCourt !== null)
            ══════════════════════════════════════════════════════════════════════ */}
        {(tab === 'browse' || tab === 'home') && selectedFoodCourt && (
          <div className="vbuy-explorer-view">
            {/* Explorer Top Header Bar */}
            <div className="vbuy-explorer-top-bar">
              <button className="vbuy-back-btn" onClick={() => setSelectedFoodCourt(null)} title="Back to Food Courts">
                <ArrowLeft size={16} />
              </button>
              <div className="vbuy-explorer-title-box">
                <div className="vbuy-explorer-main-title">Food Court Explorer</div>
                <div className="vbuy-explorer-sub-title">BROWSE ALL CANTEENS · {selectedFoodCourt.name}</div>
              </div>
            </div>

            {/* Split Screen Layout: Left Canteen Rail + Right Menu Content */}
            <div className="vbuy-explorer-split">
              {/* Left Vertical Canteen Rail */}
              <div className="vbuy-left-rail">
                {/* "All" button */}
                <button
                  className={`vbuy-rail-avatar-btn ${explorerCanteenId === 'all' ? 'active' : ''}`}
                  onClick={() => setExplorerCanteenId('all')}
                  title="All Outlets in this Food Court"
                >
                  <div className="vbuy-rail-avatar-circle">
                    <Utensils size={18} />
                  </div>
                  <span className="vbuy-rail-avatar-name">All Canteens</span>
                </button>

                {/* Stalls / Canteens in this food court */}
                {explorerOutlets.map(outlet => {
                  const isActive = explorerCanteenId === outlet.id
                  return (
                    <button
                      key={outlet.id}
                      className={`vbuy-rail-avatar-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setExplorerCanteenId(outlet.id)}
                      title={outlet.name}
                    >
                      <div className="vbuy-rail-avatar-circle">
                        <span>{outlet.name.charAt(0)}</span>
                      </div>
                      <span className="vbuy-rail-avatar-name">{outlet.name}</span>
                      {!outlet.is_open && (
                        <span className="vbuy-rail-closed-tag">CLOSED</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Right Content Area: Menu & Dishes */}
              <div className="vbuy-right-content">
                <div className="vbuy-right-header">
                  <div className="vbuy-right-canteen-name">
                    {explorerActiveOutlet ? explorerActiveOutlet.name : `All in ${selectedFoodCourt.name}`}
                    {explorerActiveOutlet && (
                      <span style={{ fontSize: '11px', color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        ⭐ 4.7
                      </span>
                    )}
                  </div>
                  <div className="vbuy-right-item-count">
                    {explorerDishes.length} items available
                  </div>
                </div>

                {/* Filter chips row */}
                <div className="vbuy-right-filters-scroll">
                  <button
                    className={`vbuy-right-filter-chip ${explorerFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setExplorerFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={`vbuy-right-filter-chip ${explorerFilter === 'popular' ? 'active' : ''}`}
                    onClick={() => setExplorerFilter('popular')}
                  >
                    🔥 Popular
                  </button>
                  <button
                    className={`vbuy-right-filter-chip ${explorerFilter === 'deals' ? 'active' : ''}`}
                    onClick={() => setExplorerFilter('deals')}
                  >
                    🏷️ Deals
                  </button>
                  <button
                    className={`vbuy-right-filter-chip ${explorerFilter === 'veg' ? 'active' : ''}`}
                    onClick={() => setExplorerFilter('veg')}
                  >
                    🥬 Veg Only
                  </button>
                  <button
                    className={`vbuy-right-filter-chip ${explorerFilter === 'non-veg' ? 'active' : ''}`}
                    onClick={() => setExplorerFilter('non-veg')}
                  >
                    🍗 Non-veg
                  </button>
                </div>

                {/* 2-Column Food Grid */}
                <div className="vbuy-explorer-grid-2">
                  {explorerDishes.map(item => {
                    const cartItem = (cart.items || []).find(ci => ci.id === item.id)
                    const qty = cartItem ? cartItem.qty : 0
                    return (
                      <div key={item.id} className="vbuy-dish-card">
                        <div className="vbuy-dish-img-wrap">
                          <img
                            src={getItemImageUrl(item)}
                            alt={item.name}
                            className="vbuy-dish-img"
                            loading="lazy"
                          />
                          <div className="vbuy-dish-veg-badge">
                            <span className={item.is_veg ? 'vbuy-veg-icon' : 'vbuy-nonveg-icon'} />
                          </div>
                        </div>
                        <div className="vbuy-dish-body">
                          <div>
                            <div className="vbuy-dish-title" title={item.name}>{item.name}</div>
                            <div className="vbuy-dish-canteen">{item.outlet?.name}</div>
                          </div>
                          <div className="vbuy-dish-bottom">
                            <span className="vbuy-dish-price">{money(item.price)}</span>
                            {qty > 0 ? (
                              <div className="vbuy-dish-qty-stepper">
                                <button onClick={() => removeFromCart(item.id)}>-</button>
                                <span>{qty}</span>
                                <button onClick={() => addToCart(item.outlet, item)}>+</button>
                              </div>
                            ) : (
                              <button className="vbuy-dish-add-btn" onClick={() => addToCart(item.outlet, item)}>
                                + ADD
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN 3: CART SCREEN (tab === 'cart')
            ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'cart' && (
          <div className="vbuy-cart-view">
            <div className="vbuy-cart-header">
              <button className="vbuy-back-btn" onClick={() => setTab('browse')} title="Back to menu">
                <ArrowLeft size={16} />
              </button>
              <h2>Your Pre-Order Cart</h2>
            </div>

            <div className="vbuy-cart-content">
              {/* Pickup Mode Notice */}
              <div className="vbuy-pickup-banner">
                <div className="vbuy-pickup-banner-icon">
                  <Store size={18} />
                </div>
                <div>
                  <div className="vbuy-pickup-banner-title">Counter Pre-Order (Fast Pickup)</div>
                  <div className="vbuy-pickup-banner-sub">
                    Direct counter pickup with 4-digit token. Zero waiting line.
                  </div>
                </div>
              </div>

              {!cart.items || cart.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                  <ShoppingCart size={42} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                  <h3 style={{ fontSize: '15px', color: '#0F172A', fontWeight: 800 }}>Your cart is empty</h3>
                  <p style={{ fontSize: '12px', margin: '4px 0 16px 0' }}>
                    Browse campus canteens and add items for quick counter pickup!
                  </p>
                  <button
                    className="vbuy-pay-btn-primary"
                    style={{ maxWidth: '240px', margin: '0 auto' }}
                    onClick={() => setTab('browse')}
                  >
                    Browse Food Courts
                  </button>
                </div>
              ) : (
                <>
                  {/* Outlet Group Card */}
                  <div className="vbuy-cart-outlet-card">
                    <div className="vbuy-cart-outlet-title">
                      <Store size={16} color="#2563EB" />
                      <span>{cart.outlet?.name}</span>
                      <CheckCircle2 size={14} color="#10B981" style={{ marginLeft: 'auto' }} />
                    </div>

                    {cart.items.map(item => (
                      <div key={item.id} className="vbuy-cart-item-row">
                        <img
                          src={getItemImageUrl(item)}
                          alt={item.name}
                          className="vbuy-cart-item-thumb"
                        />
                        <div className="vbuy-cart-item-info">
                          <div className="vbuy-cart-item-name">{item.name}</div>
                          <div className="vbuy-cart-item-price">{money(item.price * item.qty)}</div>
                        </div>
                        <div className="vbuy-cart-stepper">
                          <button onClick={() => removeFromCart(item.id)}>-</button>
                          <span>{item.qty}</span>
                          <button onClick={() => addToCart(cart.outlet, item)}>+</button>
                        </div>
                        <button
                          className="vbuy-cart-delete-btn"
                          onClick={() => {
                            for (let i = 0; i < item.qty; i++) removeFromCart(item.id)
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Timing Option: Immediate vs Scheduled */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} color="#2563EB" /> Pickup Preparation Timing
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setIsScheduled(false)}
                        style={{
                          padding: '10px', borderRadius: '10px', border: !isScheduled ? '2px solid #2563EB' : '1px solid #E2E8F0',
                          background: !isScheduled ? '#EFF6FF' : '#FFFFFF', color: !isScheduled ? '#1D4ED8' : '#475569',
                          fontWeight: 700, fontSize: '11.5px', cursor: 'pointer', textAlign: 'center'
                        }}
                      >
                        ⚡ Order Now (Immediate)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsScheduled(true)}
                        style={{
                          padding: '10px', borderRadius: '10px', border: isScheduled ? '2px solid #2563EB' : '1px solid #E2E8F0',
                          background: isScheduled ? '#EFF6FF' : '#FFFFFF', color: isScheduled ? '#1D4ED8' : '#475569',
                          fontWeight: 700, fontSize: '11.5px', cursor: 'pointer', textAlign: 'center'
                        }}
                      >
                        🕒 Schedule Pickup Slot
                      </button>
                    </div>

                    {isScheduled && (
                      <div style={{ marginTop: '10px' }}>
                        <select
                          value={selectedSlotId || ''}
                          onChange={e => setSelectedSlotId(e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                        >
                          <option value="">Select counter pickup slot...</option>
                          {pickupSlots.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.time_label} ({s.max_orders - s.current_orders} slots left)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Bill Details */}
                  <div className="vbuy-cart-bill-card">
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                      Bill Summary
                    </div>
                    <div className="vbuy-cart-bill-row">
                      <span>Item Total ({cartQty} items)</span>
                      <span>{money(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="vbuy-cart-bill-row" style={{ color: '#059669', fontWeight: 700 }}>
                        <span>Discount Savings</span>
                        <span>-{money(discount)}</span>
                      </div>
                    )}
                    <div className="vbuy-cart-bill-row">
                      <span>Taxes & Canteen Packaging</span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>₹0 (FREE)</span>
                    </div>
                    <div className="vbuy-cart-bill-row">
                      <span>Counter Pickup Service</span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>FREE</span>
                    </div>
                    <div className="vbuy-cart-bill-total">
                      <span>To Pay</span>
                      <span>{money(finalDebit)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Checkout Sticky Bar */}
            {cart.items && cart.items.length > 0 && (
              <div className="vbuy-cart-bottom-bar">
                <div className="vbuy-cart-wallet-info">
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Wallet Balance:</span>
                  <strong style={{ color: isInsufficient ? '#DC2626' : '#166534' }}>
                    {money(wallet?.balance)}
                  </strong>
                </div>

                {!isInsufficient ? (
                  <button
                    className="vbuy-pay-btn-primary"
                    disabled={busy}
                    onClick={placeOrder}
                  >
                    <Zap size={16} /> Pay {money(finalDebit)} & Place Pre-Order
                  </button>
                ) : (
                  <div className="vbuy-deficit-btn-row">
                    <div className="vbuy-deficit-notice">
                      Insufficient Balance ({money(deficit)} needed)
                    </div>
                    <button
                      className="vbuy-topup-pay-btn"
                      onClick={handleDeficitPay}
                    >
                      + Top Up {money(deficit)} & Pay
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN 4: ORDERS SCREEN (tab === 'orders')
            ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'orders' && OrdersView && (
          <div className="vbuy-main-content">
            <OrdersView
              orders={orders}
              repeatOrder={repeatOrder}
              itemRatings={itemRatings}
              submitItemRating={submitItemRating}
              onExploreCanteens={() => { setSelectedFoodCourt(null); setTab('browse') }}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN 5: WALLET SCREEN (tab === 'wallet')
            ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'wallet' && WalletView && (
          <div className="vbuy-main-content">
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

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN 6: PROFILE SCREEN (tab === 'profile')
            ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'profile' && ProfileView && (
          <div className="vbuy-main-content">
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

        {/* ── Floating "VIEW CART" Bottom Pill (Home & Explorer) ── */}
        {(tab === 'browse' || tab === 'home') && cartQty > 0 && (
          <div className="vbuy-floating-cart-bar" onClick={() => setTab('cart')}>
            <div className="vbuy-floating-cart-left">
              <ShoppingCart size={18} />
              <div>
                <div className="vbuy-floating-cart-count">{cartQty} {cartQty === 1 ? 'ITEM' : 'ITEMS'}</div>
                <div className="vbuy-floating-cart-price">{money(finalDebit)}</div>
              </div>
            </div>
            <div className="vbuy-floating-cart-right">
              <span>VIEW CART</span>
              <ChevronRight size={16} />
            </div>
          </div>
        )}

        {/* ── Fixed Bottom 4-Tab Navigation Bar ── */}
        <nav className="vbuy-bottom-nav">
          <button
            className={`vbuy-nav-tab ${(tab === 'browse' || tab === 'home') ? 'active' : ''}`}
            onClick={() => { setSelectedFoodCourt(null); setTab('browse') }}
          >
            <Store size={18} />
            <span className="vbuy-nav-tab-label">Home</span>
          </button>

          <button
            className={`vbuy-nav-tab ${tab === 'cart' ? 'active' : ''}`}
            onClick={() => setTab('cart')}
          >
            <ShoppingBag size={18} />
            <span className="vbuy-nav-tab-label">Cart</span>
            {cartQty > 0 && (
              <span className="vbuy-nav-badge">{cartQty}</span>
            )}
          </button>

          <button
            className={`vbuy-nav-tab ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            <Clock size={18} />
            <span className="vbuy-nav-tab-label">Orders</span>
            {activeOrdersCount > 0 && (
              <span className="vbuy-nav-pulse-dot" />
            )}
          </button>

          <button
            className={`vbuy-nav-tab ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => setTab('profile')}
          >
            <User size={18} />
            <span className="vbuy-nav-tab-label">Profile</span>
          </button>
        </nav>

      </div>
    </div>
  )
}
