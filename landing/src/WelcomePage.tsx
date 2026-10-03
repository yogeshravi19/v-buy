import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowRight, Wallet, QrCode, Clock, CheckCircle2,
  ChevronDown, ChevronUp, Shield, Store,
  Zap, Lock, Package, ChefHat, User,
  TrendingUp, Menu, X, Sparkles, Check,
  ArrowLeft, Layers, Compass, ExternalLink, HelpCircle,
  Smartphone, Monitor, FileCode, CheckCircle
} from 'lucide-react'

// Modular Interactive Components
import { CampusCanvas3D } from './CampusCanvas3D'
import { OrderFlow3DVisualization } from './OrderFlow3DVisualization'
import { DatabaseSchemaArchitecture } from './DatabaseSchemaArchitecture'
import { DashboardRolesWalkthrough } from './DashboardRolesWalkthrough'
import { InteractiveMockups } from './InteractiveMockups'
import { PaymentArchitectureSwitcher } from './PaymentArchitectureSwitcher'
import { TechArchitectureSection } from './TechArchitectureSection'
import { PilotRoadmapSection, WaitlistModal } from './PilotRoadmapModal'

export type SubPageId = 'overview' | 'order-flow' | 'dashboards' | 'architecture' | 'pilot-faq'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.45s ease ${delay}ms, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ─── 3D Tilting Phone Frame ──────────────────────────────────────────────────

function PhoneFrame({ src, alt, width = 220 }: { src: string; alt: string; width?: number }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12
    const y = -((e.clientY - rect.top) / rect.height - 0.5) * 12
    setTilt({ x: y, y: x })
  }

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 })

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1000, display: 'inline-block' }}
    >
      <div
        style={{
          width,
          background: '#FFFFFF',
          borderRadius: 34,
          border: '3px solid #CBD5E1',
          boxShadow: '0 18px 36px -12px rgba(11, 25, 44, 0.16), 0 0 0 1px rgba(11, 25, 44, 0.05)',
          overflow: 'hidden',
          position: 'relative',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out',
          transformStyle: 'preserve-3d',
        }}
      >
        <div style={{ background: '#F8FAFC', height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ width: 50, height: 4, background: '#94A3B8', borderRadius: 4 }} />
        </div>
        <img
          src={src}
          alt={alt}
          loading="eager"
          decoding="async"
          width={width}
          height={Math.round(width * 1.82)}
          style={{ width: '100%', display: 'block', background: '#F8FAFC' }}
        />
      </div>
    </div>
  )
}

// ─── Step Badge ───────────────────────────────────────────────────────────────

function StepBadge({ n }: { n: number }) {
  return (
    <div style={{
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #EA580C, #F97316)',
      color: '#fff',
      fontWeight: 800,
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 4px 10px rgba(234, 88, 12, 0.28)',
    }}>
      {n}
    </div>
  )
}

// ─── FAQ Item ────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-200/80 last:border-b-0 py-4 transition-colors">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-left gap-4 py-2 cursor-pointer bg-transparent border-0 text-inherit"
        aria-expanded={open}
      >
        <span className="font-bold text-sm sm:text-base text-slate-900">{q}</span>
        <span className="text-brand-700 shrink-0">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open && (
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 pb-2 pl-1 animate-in fade-in duration-150">
          {a}
        </p>
      )}
    </div>
  )
}

// ─── Main Page with Clean Sub-Page Architecture ──────────────────────────────

export function WelcomePage({ onOpenApp }: { onOpenApp?: () => void }) {
  const [activePage, setActivePage] = useState<SubPageId>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '')
      if (['order-flow', 'dashboards', 'architecture', 'pilot-faq'].includes(hash)) {
        setActivePage(hash as SubPageId)
      } else {
        setActivePage('overview')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Initial check
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateTo = (page: SubPageId) => {
    setActivePage(page)
    window.location.hash = page === 'overview' ? '' : `#/${page}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleOpenApp = () => {
    if (onOpenApp) onOpenApp()
    else {
      const appUrl = import.meta.env.VITE_APP_URL || 'https://campusbite-web.onrender.com'
      window.location.href = appUrl
    }
  }

  const navItems: { id: SubPageId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'order-flow', label: 'How It Works & Flow', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'dashboards', label: 'Roles & Dashboards', icon: <Monitor className="w-3.5 h-3.5" /> },
    { id: 'architecture', label: 'System Architecture', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'pilot-faq', label: 'Pilot & FAQ', icon: <HelpCircle className="w-3.5 h-3.5" /> },
  ]

  const faqs = [
    {
      q: 'How do I add money to my campus wallet?',
      a: 'Open the Wallet tab and tap a preset amount (₹100, ₹200, ₹500, ₹1000) or enter a custom amount. Top up via PhonePe UPI (Google Pay, Paytm, PhonePe, BHIM) or bank card. UPI & RuPay transfers carry 0% platform fee and balance credits immediately to your encrypted balance.',
    },
    {
      q: 'Why use a campus wallet instead of direct UPI on every tea / samosa?',
      a: 'Entering a 6-digit UPI PIN and waiting for bank SMS authentication 4 times a day during busy 15-minute lecture breaks creates massive bottlenecks, especially in basement canteens with weak cellular signal. With the pre-loaded wallet, orders clear in <100ms with zero bank timeouts.',
    },
    {
      q: 'What happens if an ingredient runs out after I order?',
      a: 'Menu stock deductions occur atomically on order placement. If an item runs out unexpectedly, kitchen staff tap "Mark Unavailable" on their tablet and the exact amount is refunded to your wallet in under 1 second.',
    },
    {
      q: 'Can I cancel my order once placed?',
      a: 'Orders cannot be cancelled once kitchen staff tap "Preparing" because ingredients are already on the stove or grill. Prior to preparation, orders can be reviewed or cancelled from the active order screen.',
    },
    {
      q: 'How do I pick up my food at the counter?',
      a: 'Walk directly to the designated V Foods express counter bay and present your 4-digit token or on-screen QR pass. Staff verify it in 2 seconds on their display and hand over your meal.',
    },
    {
      q: 'Can I schedule orders for later breaks?',
      a: 'Yes! During checkout, select a 15-minute pickup window (e.g., 1:00 PM – 1:15 PM). Outlets cap maximum orders per slot so meals remain piping hot and fresh when you arrive.',
    },
    {
      q: 'How does the Pure Veg filter work?',
      a: 'Tap "Pure Veg" on the menu bar to filter out all non-vegetarian dishes across campus canteens instantly with zero reload delay.',
    },
    {
      q: 'Does the canteen need special hardware to run V Foods?',
      a: 'Zero proprietary hardware is required. Canteen managers and staff run the web app on any existing smartphone, Android tablet, iPad, or desktop browser over regular campus Wi-Fi or mobile data.',
    },
  ]

  return (
    <>
      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-brand-700 selection:text-white antialiased flex flex-col justify-between">
        
        {/* ─── 0. UNIFIED STICKY NAVIGATION BAR ─────────────────── */}
        <header className="sticky top-0 z-50 bg-[#0B192C]/95 backdrop-blur-md border-b border-[#1E3E62] text-white px-5 sm:px-8 py-3 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Brand Logo matching real V Foods App */}
            <button
              onClick={() => navigateTo('overview')}
              className="flex items-center gap-3 bg-transparent border-0 text-left p-0 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-white tracking-tight">V Foods</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1E3E62] text-amber-200 border border-amber-500/30">
                    CAMPUS DINING
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Pre-Order &amp; Skip the Line</p>
              </div>
            </button>

            {/* Desktop Navigation Links / Subpage Switchers */}
            <nav className="hidden lg:flex items-center gap-1 bg-[#0F2540] p-1 rounded-xl border border-[#1E3E62]">
              {navItems.map(item => {
                const isActive = activePage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setWaitlistOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-200 bg-[#1E3E62]/70 border border-amber-500/30 hover:bg-[#1E3E62] transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Join Pilot</span>
              </button>

              <button
                id="nav-open-app"
                onClick={handleOpenApp}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <span>Launch App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(o => !o)}
                className="lg:hidden p-2 rounded-xl bg-[#1E3E62] text-slate-200 hover:text-white border border-[#285180]"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="lg:hidden pt-3 pb-3 border-t border-[#1E3E62] mt-3 flex flex-col gap-1.5 animate-in fade-in duration-150">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { navigateTo(item.id); setMobileMenuOpen(false) }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                    activePage === item.id
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="pt-2 border-t border-[#1E3E62] flex justify-between items-center mt-1">
                <button
                  onClick={() => { setMobileMenuOpen(false); setWaitlistOpen(true) }}
                  className="text-xs font-bold text-amber-400 py-1 cursor-pointer flex items-center gap-1"
                >
                  <Sparkles size={14} />
                  <span>Join Early Access Pilot</span>
                </button>
              </div>
            </div>
          )}
        </header>

        {/* ─── BREADCRUMB STRIP FOR SUBPAGES ─────────────────────── */}
        {activePage !== 'overview' && (
          <div className="bg-white border-b border-slate-200 px-6 sm:px-10 py-3 shadow-xs">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => navigateTo('overview')}
                className="inline-flex items-center gap-2 text-xs font-bold text-orange-700 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to Overview</span>
              </button>

              {/* Subpage Pill Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {navItems.filter(i => i.id !== 'overview').map(i => (
                  <button
                    key={i.id}
                    onClick={() => navigateTo(i.id)}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      activePage === i.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── VIEW ROUTER: CLEAN SEPARATION (NO OVER-DUMPING) ──── */}
        <main className="flex-1">

          {/* ════════════════════════════════════════════════════════
              1. MAIN OVERVIEW PAGE (CLEAN, FOCUSED, GATEWAYS TO SUBPAGES)
              ════════════════════════════════════════════════════════ */}
          {activePage === 'overview' && (
            <div className="animate-in fade-in duration-200">
              {/* 1.1 HERO SECTION */}
              <section className="py-12 sm:py-16 lg:py-20 px-6 sm:px-10 max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                  
                  {/* Left Column: Clear Value Proposition */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
                      <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                      <span>CAMPUS PRE-ORDERING &amp; WALLET PLATFORM</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.08]">
                      Order ahead.<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0B192C] via-orange-600 to-amber-500">
                        Skip the canteen queue.
                      </span>
                    </h1>

                    <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                      V Foods connects campus diners with university kitchens. Top up your wallet once, order from class, and pick up your hot food in 2 minutes at express counters.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        id="hero-open-app"
                        onClick={handleOpenApp}
                        className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <span>Open V Foods App</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => navigateTo('order-flow')}
                        className="px-5 py-3.5 rounded-2xl font-bold text-sm bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span>See How It Works</span>
                      </button>
                    </div>

                    {/* Live Campus Highlights Strip */}
                    <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-2xl font-extrabold text-slate-900">13 + 20</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Canteens &amp; Fest Stalls</p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-orange-600">2 mins</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Avg Counter Pickup</p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-emerald-600">100%</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Verified QR Handover</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: 3D Campus Canvas Preview */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-3 shadow-xl shadow-slate-200/60 relative">
                    <CampusCanvas3D onSelectCanteen={handleOpenApp} />
                  </div>
                </div>
              </section>

              {/* 1.2 CORE SUBPAGE GATEWAYS (THE 4 PILLARS) */}
              <section className="py-16 px-6 sm:px-10 max-w-7xl mx-auto border-t border-slate-200">
                <div className="text-center max-w-2xl mx-auto mb-12">
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">Explore the Platform</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    Everything You Need in Clear Sub-Pages
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 mt-2">
                    Click into any section below to see deep technical workflows, live dashboards, or pilot rollouts without page clutter.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Card 1: Order Flow & 3D Simulation */}
                  <div
                    onClick={() => navigateTo('order-flow')}
                    className="group bg-white border border-slate-200 hover:border-orange-500 rounded-3xl p-7 shadow-xs hover:shadow-xl hover:shadow-orange-500/10 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Clock className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          SUB-PAGE 1
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors mb-2">
                        How It Works &amp; 3D Order Flow
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                        Follow the complete journey from student wallet checkout to live kitchen ticket creation and verified QR pickup. Includes the interactive 3D network packet simulator.
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span>4-step student checkout flow</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span>Interactive 3D Three.js data packet flow</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span>Real-time WebSocket tracking stages</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-orange-600 group-hover:translate-x-1 transition-transform">
                      <span>Explore Order Flow &amp; 3D Journey</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>

                  {/* Card 2: Campus Dashboards & Roles */}
                  <div
                    onClick={() => navigateTo('dashboards')}
                    className="group bg-white border border-slate-200 hover:border-brand-500 rounded-3xl p-7 shadow-xs hover:shadow-xl hover:shadow-brand-700/5 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Monitor className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          SUB-PAGE 2
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-700 transition-colors mb-2">
                        Campus Roles &amp; Interactive Mockups
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                        Discover dedicated interfaces designed for Students, Kitchen Operators (KDS), Canteen Shop Admins, and Campus Directors, with dual device simulation.
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          <span>Interactive Phone + Kitchen Tablet simulators</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          <span>Kitchen display screen (KDS) live workflow</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          <span>4-tier Role Based Access Control walkthrough</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-700 group-hover:translate-x-1 transition-transform">
                      <span>View Roles &amp; Live Dashboards</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>

                  {/* Card 3: System Architecture & Security */}
                  <div
                    onClick={() => navigateTo('architecture')}
                    className="group bg-white border border-slate-200 hover:border-brand-500 rounded-3xl p-7 shadow-xs hover:shadow-xl hover:shadow-brand-700/5 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Layers className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          SUB-PAGE 3
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-700 transition-colors mb-2">
                        Database Schema &amp; Architecture
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                        Inspect the relational database schema, atomic financial ledger transactions, payment gateway bifurcation, and institutional security protocols.
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          <span>PostgreSQL schema &amp; Row Level Security</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          <span>Payment Architecture Switcher (Wallet vs Split)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          <span>HMAC signatures &amp; server-side price validation</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-700 group-hover:translate-x-1 transition-transform">
                      <span>Inspect System &amp; Schemas</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>

                  {/* Card 4: Pilot Roadmap & FAQ */}
                  <div
                    onClick={() => navigateTo('pilot-faq')}
                    className="group bg-white border border-slate-200 hover:border-brand-500 rounded-3xl p-7 shadow-xs hover:shadow-xl hover:shadow-brand-700/5 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <HelpCircle className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          SUB-PAGE 4
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-700 transition-colors mb-2">
                        Campus Pilot Roadmap &amp; FAQ
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                        Review the 3-phase campus rollout strategy, zero hardware requirement specifications, and answers to common student &amp; vendor questions.
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          <span>3-phase rollout roadmap &amp; timeline</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          <span>Standard tablet browser setup (zero hardware cost)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          <span>Full campus dining FAQ answers</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-700 group-hover:translate-x-1 transition-transform">
                      <span>View Pilot Timeline &amp; FAQs</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </section>

              {/* 1.3 CRISP PROBLEM VS SOLUTION (UNCLUTTERED) */}
              <section className="py-16 px-6 sm:px-10 max-w-7xl mx-auto border-t border-slate-200">
                <div className="bg-[#0B192C] text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-[#1E3E62]">
                  <div className="max-w-3xl mb-10">
                    <span className="text-xs font-bold text-brand-300 uppercase tracking-wider block mb-2">The College Rush Fix</span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      Lunch Break Lasts 45 Minutes. The Line Took 30.
                    </h3>
                    <p className="text-sm text-slate-300 mt-2">
                      When class bells ring, hundreds of students pack Gazebo C1 and North Square at the same time. Here is the shift:
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-[#0F2540] border border-red-500/30">
                      <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span>✕ Traditional Canteen Chaos</span>
                      </h4>
                      <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                        <li className="flex items-start gap-2.5">
                          <span className="text-red-400 font-bold">•</span>
                          <span><strong>25-minute line stand:</strong> Cuts lunch time in half while waiting to pay.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-red-400 font-bold">•</span>
                          <span><strong>Weak basement 4G:</strong> Bank OTP SMS timeouts stall the card machine.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-red-400 font-bold">•</span>
                          <span><strong>Sold-out disappointment:</strong> Finding out a dish is finished only when reaching cashier.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-6 rounded-2xl bg-[#0F2540] border border-emerald-500/30">
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span>✓ The V Foods Flow</span>
                      </h4>
                      <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                        <li className="flex items-start gap-2.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span><strong>Pre-order from lecture:</strong> Food is prepared before you even leave class.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span><strong>&lt;100ms 1-tap checkout:</strong> Deducts from wallet without bank gateways or PIN.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span><strong>2-minute counter pickup:</strong> Flash your token or QR pass and grab your meal.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* 1.4 CLOSING CTA BANNER */}
              <section className="py-16 px-6 sm:px-10 max-w-5xl mx-auto text-center">
                <div className="bg-gradient-to-br from-[#060D17] via-[#0B192C] to-[#0F2540] text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-[#1E3E62]">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">Ready for Lunch?</span>
                  <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                    Skip Queues Across University Dining Halls
                  </h3>
                  <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mb-8">
                    Available for Gazebo, North Square, Food Street, and Riviera / Gravitas campus food stalls.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={handleOpenApp}
                      className="px-7 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Open V Foods App</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setWaitlistOpen(true)}
                      className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Join Campus Pilot</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              2. SUBPAGE: HOW IT WORKS & 3D ORDER FLOW
              ════════════════════════════════════════════════════════ */}
          {activePage === 'order-flow' && (
            <div className="py-10 px-6 sm:px-10 max-w-7xl mx-auto space-y-16 animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="text-center max-w-3xl mx-auto">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">Sub-Page 1</span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  How It Works &amp; Real-Time Order Flow
                </h1>
                <p className="text-sm sm:text-base text-slate-600 mt-2">
                  Follow how meals move from student order placement to kitchen prep and fast counter collection.
                </p>
              </div>

              {/* 4 Steps Section */}
              <div className="space-y-10">
                {/* Step 1 */}
                <div className="grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <StepBadge n={1} />
                      <h3 className="text-xl font-bold text-slate-900">Load Campus Wallet</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Top up via PhonePe using any UPI app (GPay, Paytm, BHIM) or bank card. UPI &amp; RuPay transfers have <strong>0% processing fee</strong> and balance credits instantaneously.
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>0% transaction fees on UPI top-ups</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <PhoneFrame src="/assets/landing/user-wallet.webp" alt="V Foods wallet top-up" width={200} />
                  </div>
                </div>

                {/* Step 2 */}
                <div className="grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                  <div className="flex justify-center order-2 md:order-1">
                    <PhoneFrame src="/assets/landing/user-menu-veg.webp" alt="V Foods menu" width={200} />
                  </div>
                  <div className="space-y-3 order-1 md:order-2">
                    <div className="flex items-center gap-3">
                      <StepBadge n={2} />
                      <h3 className="text-xl font-bold text-slate-900">Pick Food &amp; Pickup Window</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Select your favorite campus canteen, tap the <strong>Pure Veg filter</strong> if desired, and choose a 15-minute pickup window so meals are hot when you arrive.
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-800 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />
                      <span>Live stock deduction prevents sold-out orders</span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <StepBadge n={3} />
                      <h3 className="text-xl font-bold text-slate-900">Instant 1-Tap Checkout</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Tap "Pay from Wallet". Balance deducts in under 100 milliseconds without bank redirect or SMS wait. Your 4-digit token is generated immediately.
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                      <span>Zero network gateway timeout</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <PhoneFrame src="/assets/landing/user-cart.webp" alt="V Foods cart summary" width={200} />
                  </div>
                </div>

                {/* Step 4 */}
                <div className="grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                  <div className="flex justify-center order-2 md:order-1">
                    <PhoneFrame src="/assets/landing/user-order-tracking-ready.webp" alt="V Foods QR pickup pass" width={200} />
                  </div>
                  <div className="space-y-3 order-1 md:order-2">
                    <div className="flex items-center gap-3">
                      <StepBadge n={4} />
                      <h3 className="text-xl font-bold text-slate-900">Express Counter Collection</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      When notification updates to Ready, walk to the counter, show your token number or tap your QR pass. Staff verify it in 2 seconds.
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Zero physical cash counting at the bay</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3D Order Flow Simulation */}
              <div className="pt-8 border-t border-slate-200">
                <OrderFlow3DVisualization />
              </div>

              {/* Real-Time Live Tracking Stages */}
              <div className="pt-8 border-t border-slate-200">
                <div className="text-center max-w-2xl mx-auto mb-10">
                  <span className="text-xs font-bold text-brand-700 uppercase tracking-wider block mb-1">Persistent Sync</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Four Live Stages. Zero Guessing.
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Your phone updates in real time over WebSockets without manual refresh.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { stage: 'Placed', screenshot: '/assets/landing/user-order-tracking-placed.webp', color: 'border-sky-300 bg-sky-50 text-sky-700', desc: 'Order confirmed and rings chime alert on kitchen tablet screen.' },
                    { stage: 'Preparing', screenshot: '/assets/landing/user-order-tracking-preparing.webp', color: 'border-amber-300 bg-amber-50 text-amber-700', desc: 'Cook taps Accept and begins frying or assembling ingredients.' },
                    { stage: 'Ready', screenshot: '/assets/landing/user-order-tracking-ready.webp', color: 'border-emerald-300 bg-emerald-50 text-emerald-700', desc: 'Food is packaged. Notification pings your phone to collect.' },
                    { stage: 'Collected', screenshot: '/assets/landing/user-order-tracking-collected.webp', color: 'border-slate-300 bg-slate-100 text-slate-700', desc: 'Counter staff verify token or QR code. Order ledger archives.' },
                  ].map((step, idx) => (
                    <div key={step.stage} className="bg-white border border-slate-200 rounded-3xl p-4 text-center flex flex-col justify-between shadow-xs">
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mb-3 ${step.color}`}>
                          {idx + 1}. {step.stage}
                        </span>
                        <div className="flex justify-center mb-3">
                          <PhoneFrame src={step.screenshot} alt={`Order tracking ${step.stage} stage`} width={150} />
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              3. SUBPAGE: ROLES & INTERACTIVE DASHBOARDS
              ════════════════════════════════════════════════════════ */}
          {activePage === 'dashboards' && (
            <div className="py-10 px-6 sm:px-10 max-w-7xl mx-auto space-y-16 animate-in fade-in duration-200">
              {/* Header */}
              <div className="text-center max-w-3xl mx-auto">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">Sub-Page 2</span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Campus Roles &amp; Interactive Dashboards
                </h1>
                <p className="text-sm sm:text-base text-slate-600 mt-2">
                  Four distinct interfaces tailored for student dining, kitchen production, vendor finance, and university-wide management.
                </p>
              </div>

              {/* Roles Walkthrough */}
              <div>
                <DashboardRolesWalkthrough />
              </div>

              {/* Dual Interactive Mockups (Phone + Tablet) */}
              <div className="pt-8 border-t border-slate-200">
                <InteractiveMockups />
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              4. SUBPAGE: DATABASE & SYSTEM ARCHITECTURE
              ════════════════════════════════════════════════════════ */}
          {activePage === 'architecture' && (
            <div className="py-10 px-6 sm:px-10 max-w-7xl mx-auto space-y-16 animate-in fade-in duration-200">
              {/* Header */}
              <div className="text-center max-w-3xl mx-auto">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">Sub-Page 3</span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Database Schemas, APIs &amp; Security Architecture
                </h1>
                <p className="text-sm sm:text-base text-slate-600 mt-2">
                  PostgreSQL relational models, atomic financial ledgers, and zero-trust institutional security protocols.
                </p>
              </div>

              {/* Database Schema Component */}
              <div>
                <DatabaseSchemaArchitecture />
              </div>

              {/* Payment Architecture Switcher */}
              <div className="pt-8 border-t border-slate-200">
                <PaymentArchitectureSwitcher />
              </div>

              {/* Production Tech Stack Layers */}
              <div className="pt-8 border-t border-slate-200">
                <TechArchitectureSection />
              </div>

              {/* Safe By Design Security Cards */}
              <div className="pt-8 border-t border-slate-200">
                <div className="text-center max-w-2xl mx-auto mb-10">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-2">Institutional Grade</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Safe by Design. Verified on Server.
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    All pricing, stock quotas, and wallet debits are calculated server-side in PostgreSQL.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { icon: Shield, title: 'Server-Side Pricing', desc: 'Cart totals compute from database records, not client payloads. Tampering with network requests has zero effect.' },
                    { icon: Lock, title: 'Row Level Security', desc: 'PostgreSQL RLS ensures staff only query their assigned canteen. No cross-outlet data leaks are possible.' },
                    { icon: QrCode, title: 'Signed QR Handover', desc: 'Pickup QR passes are cryptographically verified before marking an order Collected. Screenshots cannot duplicate meals.' },
                    { icon: Wallet, title: 'Bank-Signed Webhooks', desc: 'Wallet credits require an HMAC SHA-256 signature from PhonePe. Phone browser redirects are never trusted for money.' },
                  ].map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.title} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-200">
                            <Icon className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mb-2">{s.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              5. SUBPAGE: PILOT ROADMAP & FAQ
              ════════════════════════════════════════════════════════ */}
          {activePage === 'pilot-faq' && (
            <div className="py-10 px-6 sm:px-10 max-w-7xl mx-auto space-y-16 animate-in fade-in duration-200">
              {/* Header */}
              <div className="text-center max-w-3xl mx-auto">
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">Sub-Page 4</span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Campus Pilot Roadmap &amp; FAQ
                </h1>
                <p className="text-sm sm:text-base text-slate-600 mt-2">
                  Phased campus deployment schedule, zero specialty hardware setup, and common questions answered.
                </p>
              </div>

              {/* Pilot Roadmap Component */}
              <div>
                <PilotRoadmapSection />
              </div>

              {/* FAQ Accordion Section */}
              <div className="pt-8 border-t border-slate-200">
                <div className="text-center max-w-2xl mx-auto mb-10">
                  <span className="text-xs font-bold text-brand-700 uppercase tracking-wider block mb-2">Campus Queries</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Everything you need to know about campus dining with V Foods.
                  </p>
                </div>

                <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                  {faqs.map(item => (
                    <FaqItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ─── UNIFIED FOOTER ──────────────────────────────────────── */}
        <footer className="border-t border-slate-200 bg-white py-12 px-6 sm:px-10 text-xs text-slate-600">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-700 flex items-center justify-center text-white">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-sm">V Foods</span>
                <p className="text-[11px] text-slate-500">Campus Pre-Ordering &amp; Smart Dining Network</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-600">
              {navItems.map(i => (
                <button
                  key={i.id}
                  onClick={() => navigateTo(i.id)}
                  className={`bg-transparent border-0 cursor-pointer text-xs font-semibold ${
                    activePage === i.id ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {i.label}
                </button>
              ))}
              <button
                onClick={() => setWaitlistOpen(true)}
                className="text-brand-700 font-bold hover:underline cursor-pointer bg-transparent border-0 text-xs"
              >
                Join Pilot →
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px]">
            <p>© {new Date().getFullYear()} V Foods. Built for University Canteens, Riviera &amp; Gravitas Campus Dining.</p>
            <p className="font-mono text-[10px]">Deep Navy &amp; Royal Blue Edition • Matching V Foods App</p>
          </div>
        </footer>
      </div>
    </>
  )
}

export default WelcomePage
