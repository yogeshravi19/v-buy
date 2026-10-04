import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Search, X, ArrowLeft, Store, ShoppingBag, Clock, User, CreditCard,
  ChevronRight, ChevronDown, Plus, Minus, Trash2, CheckCircle2, AlertCircle,
  Tag, Utensils, Zap, Download, LogOut, Check, ShoppingCart, RefreshCw,
  Flame, Building2, MapPin, Star, Leaf, Wallet, QrCode, ShieldCheck, Lock,
  Edit2, Settings
} from 'lucide-react'
import { getFoodImage } from '../lib/foodImages'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTIC VIT CHENNAI FOOD COURTS (V FOODS User Dashboard)
// ─────────────────────────────────────────────────────────────────────────────
export const CAMPUS_FOOD_COURTS = [
  {
    id: 'fc-gazebo',
    name: 'Gazebo Food Court',
    subtitle: 'Central Campus Plaza · Ground Floor',
    locationKey: 'Gazebo (Main Canteen)',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    outlets: ['g1', 'g2', 'g3', 'g4'],
  },
  {
    id: 'fc-northsquare',
    name: 'North Square Food Court',
    subtitle: 'North Square Building · 1st Floor',
    locationKey: 'North Square',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    outlets: ['n1', 'n2', 'n3', 'n4'],
  },
  {
    id: 'fc-ab3',
    name: 'AB3 Food Complex',
    subtitle: 'Academic Block 3 Courtyard',
    locationKey: 'AB3 Amphitheatre',
    image: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=600&auto=format&fit=crop&q=80',
    outlets: ['ab3'],
  },
  {
    id: 'fc-academic',
    name: 'Academic Blocks Diner',
    subtitle: 'Delta & AB1 Walkway Counters',
    locationKey: 'Academic Blocks',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&auto=format&fit=crop&q=80',
    outlets: ['ab1', 'delta'],
  },
  {
    id: 'fc-pavilion',
    name: 'Campus Pavilion & Stalls',
    subtitle: 'Lakeview Campus Activity Centre',
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

export default function VFoodsUserDashboard({
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
  money = (v) => `₹${Number(Number(v || 0).toFixed(2)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
}) {
  // Navigation & Screen selection
  const [selectedFoodCourt, setSelectedFoodCourt] = useState(null)
  const [explorerCanteenId, setExplorerCanteenId] = useState('all')
  const [explorerFilter, setExplorerFilter] = useState('all') // 'all' | 'popular' | 'deals' | 'veg' | 'non-veg'
  const [popularFilter, setPopularFilter] = useState('all') // 'all' | 'veg' | 'non-veg'
  const [searchQuery, setSearchQuery] = useState('')
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [paymentMode, setPaymentMode] = useState('wallet') // 'wallet' | 'instant_gateway'
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false)
  const [selectedGatewayApp, setSelectedGatewayApp] = useState('phonepe') // 'phonepe' | 'paytm' | 'gpay' | 'upi'
  const [isGatewayProcessing, setIsGatewayProcessing] = useState(false)
  const [gatewayStep, setGatewayStep] = useState('select') // 'select' | 'processing' | 'success'

  // Header Profile Dropdown & Edit Profile State
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = useMemo(() => {
    return (currentUser?.full_name || 'User')
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'US'
  }, [currentUser?.full_name])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!editName.trim()) return
    setSavingProfile(true)
    const cleanPhone = editPhone.replace(/\D/g, '')

    try {
      if (supabase && currentUser?.id) {
        await supabase.from('profiles').update({
          full_name: editName.trim(),
          mobile_number: cleanPhone,
          phone: cleanPhone
        }).eq('id', currentUser.id)
      }
      if (setCurrentUser) {
        setCurrentUser(prev => ({
          ...prev,
          full_name: editName.trim(),
          mobile_number: cleanPhone,
          phone: cleanPhone
        }))
      }
      if (setNotice) setNotice('Profile updated successfully.')
      setShowEditProfileModal(false)
    } catch (err) {
      console.error('Error updating profile:', err)
      if (setNotice) setNotice('Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleGatewayCheckout = () => {
    setIsGatewayProcessing(true)
    setGatewayStep('processing')
    setTimeout(() => {
      setGatewayStep('success')
      setTimeout(() => {
        setIsGatewayProcessing(false)
        setIsGatewayModalOpen(false)
        setGatewayStep('select')
        const providerLabels = {
          phonepe: 'PhonePe UPI',
          paytm: 'Paytm UPI',
          gpay: 'Google Pay UPI',
          upi: 'Instant UPI Intent'
        }
        placeOrder('instant_gateway', {
          provider: providerLabels[selectedGatewayApp] || 'PhonePe / Paytm UPI',
          txnId: 'UPI-' + Date.now().toString().slice(-8)
        })
      }, 700)
    }, 1200)
  }

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
  // Applicable base amount for fees (after discount)
  const applicableBase = Math.max(0, subtotal - discount)

  // Total additional charge is exactly 7% of applicable base
  const totalAdditionalCharge = applicableBase > 0 ? Number((applicableBase * 0.07).toFixed(2)) : 0

  // Each of Tax (1/3), Service Charges (1/3), and Convenience Fee (1/3) receives an equal one-third share of the 7%
  const convenienceFee = Number((totalAdditionalCharge / 3).toFixed(2))
  const taxAndServiceCharges = Number((totalAdditionalCharge - convenienceFee).toFixed(2))

  // Total payable
  const finalDebit = Number((applicableBase + totalAdditionalCharge).toFixed(2))
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

  // Popular on Campus items (filtered by veg / non-veg)
  const popularDishes = useMemo(() => {
    let items = allDishes
    if (popularFilter === 'veg') items = items.filter(i => i.is_veg === true)
    if (popularFilter === 'non-veg') items = items.filter(i => i.is_veg === false)
    return items.slice(0, 18)
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

  // Reusable Top-App Food Card Renderer (Swiggy / Zomato / Burger King design system)
  const renderDishCard = (item, isBestseller = false) => {
    const cartItem = (cart.items || []).find(ci => ci.id === item.id)
    const qty = cartItem ? cartItem.qty : 0
    return (
      <div key={item.id} className="vfoods-dish-card">
        <div className="vfoods-dish-img-wrap">
          <img
            src={getItemImageUrl(item)}
            alt={item.name}
            className="vfoods-dish-img"
            loading="lazy"
          />
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 2,
            background: 'rgba(255, 255, 255, 0.96)',
            padding: '3px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          }} title={item.is_veg ? 'Pure Veg' : 'Non-Veg'}>
            {item.is_veg ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '13px',
                height: '13px',
                border: '1.5px solid #16A34A',
                borderRadius: '2.5px',
                background: '#FFFFFF'
              }}>
                <span style={{ width: '5.5px', height: '5.5px', borderRadius: '50%', background: '#16A34A' }} />
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '13px',
                height: '13px',
                border: '1.5px solid #DC2626',
                borderRadius: '2.5px',
                background: '#FFFFFF'
              }}>
                <span style={{
                  width: 0,
                  height: 0,
                  borderLeft: '3px solid transparent',
                  borderRight: '3px solid transparent',
                  borderBottom: '5.5px solid #DC2626'
                }} />
              </span>
            )}
          </div>
          {isBestseller && (
            <div className="vfoods-bestseller-ribbon">
              <Star size={7.5} fill="#D97706" color="#D97706" /> Bestseller
            </div>
          )}
        </div>
        <div className="vfoods-dish-body">
          <div>
            <div className="vfoods-dish-title" title={item.name}>{item.name}</div>
            <div className="vfoods-dish-meta-row">
              <span className="vfoods-rating-pill">
                <Star size={9} fill="#FFFFFF" color="#FFFFFF" /> 4.3
              </span>
              <span className="vfoods-prep-time">
                <Clock size={10} /> 10-15m
              </span>
            </div>
            <div style={{ marginTop: '3px' }}>
              <div className="vfoods-dish-canteen" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.outlet?.name || 'Campus Canteen'}
              </div>
            </div>
          </div>
          <div className="vfoods-dish-bottom">
            <span className="vfoods-dish-price">{money(item.price)}</span>
            {qty > 0 ? (
              <div className="vfoods-dish-qty-stepper">
                <button onClick={() => removeFromCart(item.id)}>-</button>
                <span>{qty}</span>
                <button onClick={() => addToCart(item.outlet, item)}>+</button>
              </div>
            ) : (
              <button className="vfoods-dish-add-btn" onClick={() => addToCart(item.outlet, item)}>
                + ADD
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="vfoods-desktop-backdrop">
      <div className="vfoods-app-frame">

        {/* ── Top Header Bar ── */}
        <header className="vfoods-top-bar">
          <div className="vfoods-brand-block">
            <div className="vfoods-brand-row">
              <img src="/vit-chennai-logo.png" alt="V FOODS" className="vfoods-brand-logo" />
              <div className="vfoods-brand-name" title="V FOODS">
                <span className="vfoods-logo-v">V</span>
                <span className="vfoods-logo-space"> </span>
                <span className="vfoods-logo-f">F</span>
                <span className="vfoods-logo-oods">OODS</span>
              </div>
            </div>
          </div>

          <div className="vfoods-top-actions">
            <div
              className="vfoods-wallet-chip"
              role="button"
              tabIndex={0}
              onClick={() => setTab('wallet')}
              onKeyDown={e => { if (e.key === 'Enter') setTab('wallet') }}
              title="Campus Wallet"
            >
              <CreditCard size={14} />
              <span>{money(wallet?.balance)}</span>
            </div>

            {/* Profile Avatar / User Menu */}
            <div className="vfoods-profile-menu-container" ref={profileMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className={`vfoods-profile-avatar-btn ${profileMenuOpen ? 'active' : ''}`}
                onClick={() => setProfileMenuOpen(prev => !prev)}
                title="Account Menu"
                aria-label="Account Menu"
              >
                <span className="vfoods-profile-avatar-text">{initials}</span>
                <ChevronDown size={13} className={`vfoods-profile-chevron ${profileMenuOpen ? 'open' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div className="vfoods-profile-dropdown" onClick={e => e.stopPropagation()}>
                  <div className="vfoods-profile-dd-header">
                    <div className="vfoods-profile-dd-avatar">{initials}</div>
                    <div className="vfoods-profile-dd-user">
                      <div className="vfoods-profile-dd-name">{currentUser?.full_name || 'V FOODS User'}</div>
                      <div className="vfoods-profile-dd-meta">
                        <span className="vfoods-role-badge">User</span>
                        <span className="vfoods-profile-dd-email">{currentUser?.email || ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="vfoods-profile-dd-divider" />

                  <button
                    type="button"
                    className="vfoods-profile-dd-item"
                    onClick={() => { setTab('profile'); setProfileMenuOpen(false) }}
                  >
                    <User size={15} />
                    <span>View Profile</span>
                  </button>

                  <button
                    type="button"
                    className="vfoods-profile-dd-item"
                    onClick={() => {
                      setEditName(currentUser?.full_name || '')
                      setEditPhone(currentUser?.mobile_number || currentUser?.phone || '')
                      setShowEditProfileModal(true)
                      setProfileMenuOpen(false)
                    }}
                  >
                    <Edit2 size={15} />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    className="vfoods-profile-dd-item"
                    onClick={() => { setTab('wallet'); setProfileMenuOpen(false) }}
                  >
                    <CreditCard size={15} />
                    <span>Campus Wallet ({money(wallet?.balance)})</span>
                  </button>

                  <button
                    type="button"
                    className="vfoods-profile-dd-item"
                    onClick={() => { setTab('orders'); setProfileMenuOpen(false) }}
                  >
                    <Clock size={15} />
                    <span>My Orders {activeOrdersCount > 0 ? `(${activeOrdersCount} live)` : ''}</span>
                  </button>

                  <div className="vfoods-profile-dd-divider" />

                  <button
                    type="button"
                    className="vfoods-profile-dd-item danger"
                    onClick={() => { setProfileMenuOpen(false); handleSignOut() }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

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
          <div className="vfoods-main-content">
            {/* Search Bar */}
            <div className="vfoods-search-wrap">
              <Search size={16} className="vfoods-search-icon" />
              <input
                type="text"
                className="vfoods-search-input"
                placeholder="Search dishes, canteens, drinks (e.g. Dosa, Biryani, Coffee)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="vfoods-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* If search query active: Show search results */}
            {searchQuery.trim() ? (
              <div>
                <div className="vfoods-section-header">
                  <span className="vfoods-section-title">
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
                  <div className="vfoods-dish-grid-3">
                    {searchResults.map((item, idx) => renderDishCard(item, idx < 3))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* ── Section 1: Campus Food Courts & Counters (FIRST) ── */}
                <div className="vfoods-section-header">
                  <span className="vfoods-section-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Store size={17} color="#2563EB" /> Campus Food Courts & Counters
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    Select a court to explore counters & live menus
                  </span>
                </div>

                <div className="vfoods-food-courts-grid">
                  {CAMPUS_FOOD_COURTS.map(fc => {
                    const courtOutlets = outlets.filter(o =>
                      fc.outlets.includes(o.id) || o.location === fc.locationKey
                    )
                    const itemCount = courtOutlets.reduce((s, o) => s + (o.menu_items || []).length, 0)
                    return (
                      <div
                        key={fc.id}
                        className="vfoods-fc-card"
                        onClick={() => {
                          setSelectedFoodCourt(fc)
                          setExplorerCanteenId('all')
                          setExplorerFilter('all')
                        }}
                      >
                        <img src={fc.image} alt={fc.name} className="vfoods-fc-img" loading="lazy" />
                        <div className="vfoods-fc-overlay">
                          <h3 className="vfoods-fc-title">{fc.name}</h3>
                          <p className="vfoods-fc-sub">{fc.subtitle}</p>
                          <div className="vfoods-fc-pill">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Store size={11} /> {courtOutlets.length} {courtOutlets.length === 1 ? 'counter' : 'counters'}
                            </span>
                            <span>|</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Utensils size={11} /> {itemCount} items <ChevronRight size={11} />
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ── Section 2: Popular Campus Dishes (SECOND) ── */}
                <div className="vfoods-section-header" style={{ marginTop: '24px' }}>
                  <span className="vfoods-section-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Utensils size={17} color="#2563EB" /> Popular Campus Dishes
                  </span>
                  <div className="vfoods-filter-pill-group">
                    <button
                      className={`vfoods-filter-pill-btn ${popularFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setPopularFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={`vfoods-filter-pill-btn ${popularFilter === 'veg' ? 'active' : ''}`}
                      onClick={() => setPopularFilter('veg')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '12px',
                        height: '12px',
                        border: '1.5px solid #16A34A',
                        borderRadius: '2px',
                        background: '#FFFFFF'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16A34A' }} />
                      </span>
                      Pure Veg
                    </button>
                    <button
                      className={`vfoods-filter-pill-btn ${popularFilter === 'non-veg' ? 'active' : ''}`}
                      onClick={() => setPopularFilter('non-veg')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '12px',
                        height: '12px',
                        border: '1.5px solid #DC2626',
                        borderRadius: '2px',
                        background: '#FFFFFF'
                      }}>
                        <span style={{
                          width: 0,
                          height: 0,
                          borderLeft: '3px solid transparent',
                          borderRight: '3px solid transparent',
                          borderBottom: '5px solid #DC2626'
                        }} />
                      </span>
                      Non-Veg
                    </button>
                  </div>
                </div>

                <div className="vfoods-dish-grid-3">
                  {popularDishes.map((item, idx) => renderDishCard(item, idx < 6))}
                </div>

                {/* ── Campus Dining Info Footer Card ── */}
                <div style={{
                  marginTop: '28px',
                  marginBottom: '16px',
                  padding: '18px 16px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    <Store size={15} color="#2563EB" /> V FOODS · VIT Chennai Campus Dining
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#64748B', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
                    Pre-order ahead, receive your pickup token, and collect your fresh food directly from counters across Gazebo, North Square, AB3, and Academic Blocks.
                  </p>
                  <span style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600, marginTop: '2px' }}>
                    19 campus canteens & food counters · Open daily 07:30 AM – 10:30 PM
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN 2: FOOD COURT EXPLORER (selectedFoodCourt !== null)
            ══════════════════════════════════════════════════════════════════════ */}
        {(tab === 'browse' || tab === 'home') && selectedFoodCourt && (
          <div className="vfoods-explorer-view">
            {/* Explorer Top Header Bar */}
            <div className="vfoods-explorer-top-bar">
              <button className="vfoods-back-btn" onClick={() => setSelectedFoodCourt(null)} title="Back to Food Courts">
                <ArrowLeft size={16} />
              </button>
              <div className="vfoods-explorer-title-box">
                <div className="vfoods-explorer-main-title">Food Court Explorer</div>
                <div className="vfoods-explorer-sub-title">ALL COUNTERS · {selectedFoodCourt.name}</div>
              </div>
            </div>

            {/* Split Screen Layout: Left Canteen Rail + Right Menu Content */}
            <div className="vfoods-explorer-split">
              {/* Left Vertical Canteen Rail */}
              <div className="vfoods-left-rail">
                {/* "All" button */}
                <button
                  className={`vfoods-rail-avatar-btn ${explorerCanteenId === 'all' ? 'active' : ''}`}
                  onClick={() => setExplorerCanteenId('all')}
                  title="All Outlets in this Food Court"
                >
                  <div className="vfoods-rail-avatar-circle">
                    <Utensils size={18} />
                  </div>
                  <span className="vfoods-rail-avatar-name">All Counters</span>
                </button>

                {/* Stalls / Canteens in this food court */}
                {explorerOutlets.map(outlet => {
                  const isActive = explorerCanteenId === outlet.id
                  return (
                    <button
                      key={outlet.id}
                      className={`vfoods-rail-avatar-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setExplorerCanteenId(outlet.id)}
                      title={outlet.name}
                    >
                      <div className="vfoods-rail-avatar-circle">
                        <span>{outlet.name.charAt(0)}</span>
                      </div>
                      <span className="vfoods-rail-avatar-name">{outlet.name}</span>
                      {!outlet.is_open && (
                        <span className="vfoods-rail-closed-tag">CLOSED</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Right Content Area: Menu & Dishes */}
              <div className="vfoods-right-content">
                <div className="vfoods-right-header">
                  <div className="vfoods-right-canteen-name">
                    {explorerActiveOutlet ? explorerActiveOutlet.name : `All in ${selectedFoodCourt.name}`}
                    {explorerActiveOutlet && (
                      <span style={{ fontSize: '11px', color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Star size={11} fill="#D97706" color="#D97706" /> 4.7
                      </span>
                    )}
                  </div>
                  <div className="vfoods-right-item-count">
                    {explorerDishes.length} items available
                  </div>
                </div>

                {/* Filter chips row */}
                <div className="vfoods-right-filters-scroll">
                  <button
                    className={`vfoods-right-filter-chip ${explorerFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setExplorerFilter('all')}
                  >
                    All
                  </button>
                  <button
                    className={`vfoods-right-filter-chip ${explorerFilter === 'popular' ? 'active' : ''}`}
                    onClick={() => setExplorerFilter('popular')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Flame size={12} /> Popular
                  </button>
                  <button
                    className={`vfoods-right-filter-chip ${explorerFilter === 'deals' ? 'active' : ''}`}
                    onClick={() => setExplorerFilter('deals')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Tag size={12} /> Deals
                  </button>
                  <button
                    className={`vfoods-right-filter-chip ${explorerFilter === 'veg' ? 'active' : ''}`}
                    onClick={() => setExplorerFilter('veg')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span className="vfoods-veg-dot" style={{ display: 'inline-block', width: '7px', height: '7px' }} /> Pure Veg
                  </button>
                  <button
                    className={`vfoods-right-filter-chip ${explorerFilter === 'non-veg' ? 'active' : ''}`}
                    onClick={() => setExplorerFilter('non-veg')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span className="vfoods-nonveg-dot" style={{ display: 'inline-block', width: '7px', height: '7px' }} /> Non-Veg
                  </button>
                </div>

                {/* 2-Column Food Grid */}
                <div className="vfoods-explorer-grid-2">
                  {explorerDishes.map((item, idx) => renderDishCard(item, idx % 4 === 0))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN 3: CART SCREEN (tab === 'cart')
            ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'cart' && (
          <div className="vfoods-cart-view">
            <div className="vfoods-cart-header">
              <button className="vfoods-back-btn" onClick={() => setTab('browse')} title="Back to menu">
                <ArrowLeft size={16} />
              </button>
              <h2>Your Cart</h2>
            </div>

            <div className="vfoods-cart-content">
              {!cart.items || cart.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                  <ShoppingCart size={42} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                  <h3 style={{ fontSize: '15px', color: '#0F172A', fontWeight: 700 }}>Your cart is empty</h3>
                  <p style={{ fontSize: '12px', margin: '4px 0 16px 0' }}>
                    Browse campus canteens and add items to your cart.
                  </p>
                  <button
                    className="vfoods-pay-btn-primary"
                    style={{ maxWidth: '240px', margin: '0 auto' }}
                    onClick={() => setTab('browse')}
                  >
                    Browse Food Courts
                  </button>
                </div>
              ) : (
                <>
                  {/* Outlet Group Card */}
                  <div className="vfoods-cart-outlet-card">
                    <div className="vfoods-cart-outlet-title">
                      <Store size={16} color="#2563EB" />
                      <span>{cart.outlet?.name}</span>
                      <CheckCircle2 size={14} color="#10B981" style={{ marginLeft: 'auto' }} />
                    </div>

                    {cart.items.map(item => (
                      <div key={item.id} className="vfoods-cart-item-row">
                        <img
                          src={getItemImageUrl(item)}
                          alt={item.name}
                          className="vfoods-cart-item-thumb"
                        />
                        <div className="vfoods-cart-item-info">
                          <div className="vfoods-cart-item-name">{item.name}</div>
                          <div className="vfoods-cart-item-price">{money(item.price * item.qty)}</div>
                        </div>
                        <div className="vfoods-cart-stepper">
                          <button onClick={() => removeFromCart(item.id)}>-</button>
                          <span>{item.qty}</span>
                          <button onClick={() => addToCart(cart.outlet, item)}>+</button>
                        </div>
                        <button
                          className="vfoods-cart-delete-btn"
                          onClick={() => {
                            for (let i = 0; i < item.qty; i++) removeFromCart(item.id)
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Pickup Timing */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} color="#2563EB" /> Pickup
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setIsScheduled(false)}
                        style={{
                          padding: '10px',
                          borderRadius: '10px',
                          border: !isScheduled ? '2px solid #2563EB' : '1px solid #E2E8F0',
                          background: !isScheduled ? '#EFF6FF' : '#FFFFFF',
                          color: !isScheduled ? '#1D4ED8' : '#475569',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Now (10–15 mins)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsScheduled(true)}
                        style={{
                          padding: '10px',
                          borderRadius: '10px',
                          border: isScheduled ? '2px solid #2563EB' : '1px solid #E2E8F0',
                          background: isScheduled ? '#EFF6FF' : '#FFFFFF',
                          color: isScheduled ? '#1D4ED8' : '#475569',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Schedule Later
                      </button>
                    </div>

                    {isScheduled && (
                      <div style={{ marginTop: '10px' }}>
                        <select
                          value={selectedSlotId || ''}
                          onChange={e => setSelectedSlotId(e.target.value)}
                          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', color: '#0F172A', background: '#FFFFFF' }}
                        >
                          <option value="">Select pickup time...</option>
                          {pickupSlots.map(s => {
                            const isFull = (s.max_orders - s.current_orders) <= 0
                            return (
                              <option key={s.id} value={s.id} disabled={isFull}>
                                {s.time_label}
                              </option>
                            )
                          })}
                        </select>
                      </div>
                    )}

                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Pickup:</span>
                      <strong style={{ color: '#0F172A' }}>
                        {isScheduled 
                          ? (pickupSlots.find(s => s.id === selectedSlotId)?.time_label || 'Select a time')
                          : '10–15 mins'}
                      </strong>
                    </div>
                  </div>

                  {/* Bill Details */}
                  <div className="vfoods-cart-bill-card">
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                      Bill Summary
                    </div>
                    <div className="vfoods-cart-bill-row">
                      <span>Canteen Items</span>
                      <span>{money(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="vfoods-cart-bill-row" style={{ color: '#059669', fontWeight: 600 }}>
                        <span>Discount Savings</span>
                        <span>-{money(discount)}</span>
                      </div>
                    )}
                    <div className="vfoods-cart-bill-row">
                      <span>Tax &amp; Service Charges</span>
                      <span>{money(taxAndServiceCharges)}</span>
                    </div>
                    <div className="vfoods-cart-bill-row">
                      <span>Convenience Fee</span>
                      <span>{money(convenienceFee)}</span>
                    </div>
                    <div className="vfoods-cart-bill-total">
                      <span>Total</span>
                      <span>{money(finalDebit)}</span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="vfoods-payment-method-card">
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                      Payment Method
                    </div>

                    <div className="vfoods-payment-options-grid">
                      {/* Option 1: Campus Wallet */}
                      <div 
                        className={`vfoods-payment-option-tile ${paymentMode === 'wallet' ? 'selected' : ''}`}
                        onClick={() => setPaymentMode('wallet')}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="vfoods-payment-option-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="vfoods-pay-icon-box wallet">
                              <Wallet size={16} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                                Campus Wallet
                              </div>
                              <div style={{ fontSize: '11.5px', color: isInsufficient ? '#DC2626' : '#166534', fontWeight: 600, marginTop: '1px' }}>
                                Balance: {money(wallet?.balance)} {isInsufficient && `(Short by ${money(deficit)})`}
                              </div>
                            </div>
                          </div>
                          <div className={`vfoods-custom-radio ${paymentMode === 'wallet' ? 'checked' : ''}`} />
                        </div>
                      </div>

                      {/* Option 2: UPI & Online Payment */}
                      <div 
                        className={`vfoods-payment-option-tile ${paymentMode === 'instant_gateway' ? 'selected' : ''}`}
                        onClick={() => setPaymentMode('instant_gateway')}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="vfoods-payment-option-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="vfoods-pay-icon-box gateway">
                              <CreditCard size={16} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                                UPI &amp; Online Payment
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                                PhonePe, Paytm, Google Pay, UPI
                              </div>
                            </div>
                          </div>
                          <div className={`vfoods-custom-radio ${paymentMode === 'instant_gateway' ? 'checked' : ''}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Checkout Sticky Bar */}
            {cart.items && cart.items.length > 0 && (
              <div className="vfoods-cart-bottom-bar">
                <div className="vfoods-cart-wallet-info">
                  <span style={{ color: '#64748B', fontWeight: 600 }}>
                    {paymentMode === 'wallet' ? 'Paying via: Campus Wallet' : 'Paying via: UPI / Online'}
                  </span>
                  <strong style={{ color: paymentMode === 'wallet' ? (isInsufficient ? '#DC2626' : '#166534') : '#2563EB' }}>
                    {paymentMode === 'wallet' ? money(wallet?.balance) : 'UPI'}
                  </strong>
                </div>

                {paymentMode === 'wallet' ? (
                  !isInsufficient ? (
                    <button
                      className="vfoods-pay-btn-primary"
                      disabled={busy}
                      onClick={() => placeOrder('wallet')}
                    >
                      Pay {money(finalDebit)} from Wallet
                    </button>
                  ) : (
                    <div className="vfoods-deficit-btn-row">
                      <button
                        className="vfoods-topup-pay-btn"
                        onClick={handleDeficitPay}
                      >
                        Top Up {money(deficit)} &amp; Pay
                      </button>
                      <button
                        className="vfoods-switch-gateway-btn"
                        onClick={() => setPaymentMode('instant_gateway')}
                      >
                        Pay via UPI
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    className="vfoods-pay-btn-gateway"
                    disabled={busy}
                    onClick={() => setIsGatewayModalOpen(true)}
                  >
                    Pay {money(finalDebit)} via UPI
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instant Payment Gateway (PhonePe / Paytm UPI) Modal */}
        {isGatewayModalOpen && (
          <div className="vfoods-gateway-modal-backdrop" onClick={() => !isGatewayProcessing && setIsGatewayModalOpen(false)}>
            <div className="vfoods-gateway-modal-box" onClick={e => e.stopPropagation()}>
              <div className="vfoods-gateway-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="vfoods-pay-icon-box gateway">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '14px', color: '#0F172A' }}>Instant Payment Gateway</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Verified UPI Gateway for V FOODS</div>
                  </div>
                </div>
                {!isGatewayProcessing && (
                  <button 
                    onClick={() => setIsGatewayModalOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Order summary in modal */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
                  <span>Outlet</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{cart.outlet?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
                  <span>Total Items</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{cartQty} items</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900, color: '#0F172A', paddingTop: '6px', borderTop: '1px dashed #CBD5E1' }}>
                  <span>Amount to Pay</span>
                  <span style={{ color: '#EA580C' }}>{money(finalDebit)}</span>
                </div>
              </div>

              {/* Provider Selection */}
              {gatewayStep === 'select' && (
                <>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>Select UPI Provider</div>
                  <div className="vfoods-gateway-app-grid">
                    <div 
                      className={`vfoods-gateway-app-btn ${selectedGatewayApp === 'phonepe' ? 'active' : ''}`}
                      onClick={() => setSelectedGatewayApp('phonepe')}
                    >
                      <span className="vfoods-gateway-brand-badge phonepe">PhonePe</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>PhonePe UPI</span>
                      <span style={{ fontSize: '9.5px', color: '#64748B' }}>1-Tap UPI Intent</span>
                    </div>

                    <div 
                      className={`vfoods-gateway-app-btn ${selectedGatewayApp === 'paytm' ? 'active' : ''}`}
                      onClick={() => setSelectedGatewayApp('paytm')}
                    >
                      <span className="vfoods-gateway-brand-badge paytm">Paytm</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>Paytm UPI</span>
                      <span style={{ fontSize: '9.5px', color: '#64748B' }}>Fast Bank UPI</span>
                    </div>

                    <div 
                      className={`vfoods-gateway-app-btn ${selectedGatewayApp === 'gpay' ? 'active' : ''}`}
                      onClick={() => setSelectedGatewayApp('gpay')}
                    >
                      <span className="vfoods-gateway-brand-badge gpay">GPay</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>Google Pay</span>
                      <span style={{ fontSize: '9.5px', color: '#64748B' }}>Direct Bank Debit</span>
                    </div>

                    <div 
                      className={`vfoods-gateway-app-btn ${selectedGatewayApp === 'upi' ? 'active' : ''}`}
                      onClick={() => setSelectedGatewayApp('upi')}
                    >
                      <span className="vfoods-gateway-brand-badge upi">Any UPI</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>BHIM / Any App</span>
                      <span style={{ fontSize: '9.5px', color: '#64748B' }}>QR & UPI ID</span>
                    </div>
                  </div>

                  <button
                    className="vfoods-pay-btn-gateway"
                    onClick={handleGatewayCheckout}
                    disabled={isGatewayProcessing}
                  >
                    <ShieldCheck size={16} /> Authorize & Pay {money(finalDebit)}
                  </button>
                </>
              )}

              {/* Processing step */}
              {gatewayStep === 'processing' && (
                <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                    Connecting to {selectedGatewayApp === 'phonepe' ? 'PhonePe' : selectedGatewayApp === 'paytm' ? 'Paytm' : 'UPI'} Gateway...
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Securing encrypted bank transaction session
                  </div>
                </div>
              )}

              {/* Success confirmation */}
              {gatewayStep === 'success' && (
                <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#DCFCE7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#166534' }}>
                    Payment Approved by Bank!
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Generating kitchen order ticket and pickup token...
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SCREEN 4: ORDERS SCREEN (tab === 'orders')
            ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'orders' && OrdersView && (
          <div className="vfoods-main-content">
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
          <div className="vfoods-main-content">
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
          <div className="vfoods-main-content">
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
          <div className="vfoods-floating-cart-bar" onClick={() => setTab('cart')}>
            <div className="vfoods-floating-cart-left">
              <ShoppingCart size={18} />
              <div>
                <div className="vfoods-floating-cart-count">{cartQty} {cartQty === 1 ? 'ITEM' : 'ITEMS'}</div>
                <div className="vfoods-floating-cart-price">{money(finalDebit)}</div>
              </div>
            </div>
            <div className="vfoods-floating-cart-right">
              <span>VIEW CART</span>
              <ChevronRight size={16} />
            </div>
          </div>
        )}

        {/* ── Fixed Bottom Navigation Bar (Home, Cart, Orders) ── */}
        <nav className="vfoods-bottom-nav">
          <button
            className={`vfoods-nav-tab ${(tab === 'browse' || tab === 'home') ? 'active' : ''}`}
            onClick={() => { setSelectedFoodCourt(null); setTab('browse') }}
          >
            <Store size={18} />
            <span className="vfoods-nav-tab-label">Home</span>
          </button>

          <button
            className={`vfoods-nav-tab ${tab === 'cart' ? 'active' : ''}`}
            onClick={() => setTab('cart')}
          >
            <ShoppingBag size={18} />
            <span className="vfoods-nav-tab-label">Cart</span>
            {cartQty > 0 && (
              <span className="vfoods-nav-badge">{cartQty}</span>
            )}
          </button>

          <button
            className={`vfoods-nav-tab ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            <Clock size={18} />
            <span className="vfoods-nav-tab-label">Orders</span>
            {activeOrdersCount > 0 && (
              <span className="vfoods-nav-pulse-dot" />
            )}
          </button>
        </nav>

        {/* ── Edit Profile Modal ── */}
        {showEditProfileModal && (
          <div className="saas-modal-backdrop" onClick={() => setShowEditProfileModal(false)}>
            <div className="saas-modal-card" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
              <div className="saas-modal-header">
                <h3 className="saas-modal-title">Edit Profile</h3>
                <button className="saas-modal-close" onClick={() => setShowEditProfileModal(false)}>
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSaveProfile} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value="User"
                    style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="saas-btn saas-btn-secondary"
                    onClick={() => setShowEditProfileModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="saas-btn saas-btn-primary"
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
