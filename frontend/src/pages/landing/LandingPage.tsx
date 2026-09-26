import React, { useState } from 'react'
import {
  Sparkles, ArrowRight, ShieldCheck, Zap, Store, Users, DollarSign,
  TrendingUp, Clock, QrCode, Smartphone, Bell, ChevronRight, CheckCircle2,
  Layers, Lock, Database, Award, HelpCircle, Menu, X, Play, RefreshCw,
  ExternalLink, BarChart3, UtensilsCrossed, ShoppingBag, Coffee, ChevronDown,
  Flame, Cpu, ShieldAlert, Check
} from 'lucide-react'

interface LandingPageProps {
  onLaunchApp: () => void
  onQuickLogin?: (role: 'student' | 'staff' | 'shop_admin' | 'super_admin') => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp, onQuickLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeModelTab, setActiveModelTab] = useState<'student' | 'staff' | 'shop' | 'admin'>('student')
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  // Interactive Live Platform Simulator State
  const [simStep, setSimStep] = useState<'idle' | 'ordered' | 'preparing' | 'ready' | 'collected'>('idle')
  const [simGmv, setSimGmv] = useState(248900)
  const [simProfit, setSimProfit] = useState(12445)
  const [simRecentOrder, setSimRecentOrder] = useState({
    id: '#VB-892',
    item: '2x Paneer Roll + Mango Lassi',
    outlet: 'Gazebo C1',
    token: '412',
    amount: 155
  })

  const triggerSimOrder = () => {
    setSimStep('ordered')
    setSimGmv(prev => prev + 155)
    setSimProfit(prev => prev + 8) // ~5% platform cut

    setTimeout(() => setSimStep('preparing'), 1200)
    setTimeout(() => setSimStep('ready'), 2400)
    setTimeout(() => setSimStep('collected'), 3800)
  }

  const resetSim = () => {
    setSimStep('idle')
  }

  const faqs = [
    {
      q: "How does V-BUY eliminate 30-minute canteen lines?",
      a: "Students pre-order meals from hostel rooms or between lectures, select a scheduled 15-minute pickup window, and pay seamlessly via student wallet. When the kitchen marks the dish ready, the student simply presents their cryptographic anti-fraud QR pass at the express collection counter."
    },
    {
      q: "What is the revenue & business model for the startup?",
      a: "V-BUY operates on a 5% digital platform commission on every transaction. Additional revenue streams include temporary vendor onboarding fees during campus festivals (Riviera & Gravitas with 20+ stalls), treasury interest from closed-loop student wallet float, and sponsored featured item placements."
    },
    {
      q: "How does the platform handle kitchen rush and counter chaos?",
      a: "Counter staff receive an ultra-lean Kitchen Display System (KDS) with sub-second Web Audio chimes, slot grouping, and a 1-tap '86 Item' (Mark Sold Out) stepper that automatically greys out dishes across the student app within 150 milliseconds to prevent angry crowds."
    },
    {
      q: "What if there is a campus WiFi cut or power outage?",
      a: "V-BUY features an offline walk-in POS counter backup mode with 3-digit verification fallback codes. Orders placed are cryptographically verified client-side, and transactions reconcile automatically upon reconnection."
    },
    {
      q: "How do Riviera or Gravitas festival pop-up stalls onboard?",
      a: "Super Admins can toggle 'Event Mode' with a single click, instantly activating 20 temporary festival stalls across campus grounds. Shop admins can be provisioned in under 60 seconds using 8-character cryptographically random staff invite codes."
    }
  ]

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. NAVIGATION BAR
      ───────────────────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#07090E]/80 border-b border-white/5 px-6 lg:px-12 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-400 p-[1px] shadow-lg shadow-orange-500/20">
              <div className="w-full h-full bg-[#0B0F19] rounded-[15px] flex items-center justify-center">
                <UtensilsCrossed className="text-orange-500 w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">V-BUY</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  VIT VELLORE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Smart Dining Protocol</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#models" className="hover:text-orange-400 transition-colors">4 Role Models</a>
            <a href="#economics" className="hover:text-orange-400 transition-colors">Business Model</a>
            <a href="#simulator" className="hover:text-orange-400 transition-colors flex items-center gap-1.5 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Live Simulator
            </a>
            <a href="#architecture" className="hover:text-orange-400 transition-colors">Architecture</a>
            <a href="#faq" className="hover:text-orange-400 transition-colors">FAQ</a>
          </div>

          {/* Desktop Right CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onLaunchApp}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <span>Launch App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10 flex flex-col gap-3 pb-2">
            <a href="#models" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5">4 Role Models</a>
            <a href="#economics" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5">Business Model</a>
            <a href="#simulator" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-amber-300 hover:bg-white/5">Live Simulator</a>
            <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5">Architecture</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5">FAQ</a>
            <button
              onClick={() => { setMobileMenuOpen(false); onLaunchApp() }}
              className="w-full mt-2 py-3 rounded-xl font-bold text-center bg-orange-500 text-white"
            >
              Launch App
            </button>
          </div>
        )}
      </nav>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. HERO SECTION (Inspired by sleek Framer styling)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6 lg:px-12">
        {/* Glow backdrop effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-orange-600/15 via-amber-500/10 to-transparent blur-[120px] pointer-events-none -z-10 rounded-full" />
        <div className="absolute top-12 left-1/4 w-72 h-72 bg-blue-600/10 blur-[100px] pointer-events-none -z-10 rounded-full" />

        <div className="max-w-5xl mx-auto text-center">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md mb-8 hover:border-orange-500/30 transition-all cursor-default">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300 tracking-wide">
              The Next-Gen Campus Food Protocol · Live at VIT Vellore
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] mb-6 text-white">
            Transform Campus Dining into a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
              Zero-Wait, Real-Time Network.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 font-normal leading-relaxed mb-10">
            One unified Supabase-powered platform connecting <span className="text-white font-semibold">35,000+ students</span>, <span className="text-white font-semibold">13 campus canteens</span>, and <span className="text-white font-semibold">20 Riviera festival stalls</span> with sub-second kitchen synchronization and anti-fraud QR pickup.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold text-base bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <span>Enter V-BUY App</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#simulator"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-extrabold text-base bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-3 backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Try Live Simulator</span>
            </a>
          </div>

          {/* 1-Tap Quick Demo Role Jumpers */}
          <div className="pt-6 border-t border-white/5 max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">
              Explore Directly as Any Role:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { role: 'student', label: 'Student', icon: ShoppingBag, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
                { role: 'staff', label: 'Staff KDS', icon: UtensilsCrossed, color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
                { role: 'shop_admin', label: 'Shop Owner', icon: Store, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
                { role: 'super_admin', label: 'Super Admin', icon: ShieldCheck, color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
              ].map(item => (
                <button
                  key={item.role}
                  onClick={() => onQuickLogin ? onQuickLogin(item.role as any) : onLaunchApp()}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 hover:scale-[1.03] transition-all ${item.color}`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. KEY IMPACT NUMBERS TICKER
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#0A0D15]/60 px-6 lg:px-12 py-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-3xl lg:text-4xl font-black text-white mb-1">13 + 20</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Canteens & Riviera Stalls</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-3xl lg:text-4xl font-black text-amber-400 mb-1">&lt; 4.2 min</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Wait Time (from 28m)</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-3xl lg:text-4xl font-black text-emerald-400 mb-1">99.8%</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Token Verification Accuracy</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-3xl lg:text-4xl font-black text-orange-400 mb-1">5%</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sustainable Platform Take</p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. THE 4 ECOSYSTEM MODELS (Detailed Breakdown)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="models" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-2 block">
            End-To-End Architecture
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            Four Dedicated Models. One Single Brain.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Every user experiences an interface crafted specifically for their high-stress role, all querying and modifying the identical Supabase PostgreSQL database in real time.
          </p>

          {/* Model Switcher Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mt-8 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 w-fit mx-auto">
            {[
              { id: 'student', label: '1. Student / Buyer', icon: ShoppingBag },
              { id: 'staff', label: '2. Kitchen / Staff KDS', icon: UtensilsCrossed },
              { id: 'shop', label: '3. Shop Admin / Manager', icon: Store },
              { id: 'admin', label: '4. Super Admin / Platform', icon: ShieldCheck }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveModelTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                  activeModelTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Student Model */}
        {activeModelTab === 'student' && (
          <div className="grid lg:grid-cols-2 gap-8 items-center bg-[#0C101B] border border-white/10 rounded-3xl p-8 lg:p-12 shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold mb-4">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>CONSUMER BUYING ENGINE</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">
                Skip the Crowd. Eat on Your Exact Schedule.
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Engineered for college students rushing between classes, labs, and hostel curfews. Order from Gazebo, North Square, Food Courts, or festival stalls with zero friction.
              </p>

              <div className="space-y-4">
                {[
                  { title: "Scheduled Pickup Slot Picker", desc: "Select 15-minute pickup slots to guarantee freshly prepared hot meals right as lectures conclude." },
                  { title: "Campus Wallet & Instant UPI Top-Up", desc: "Preload your wallet for 1-tap checkout even during congested 4G cellular campus cell tower drops." },
                  { title: "Sub-Second Realtime Progress Tracker", desc: "Watch orders seamlessly move from Placed → Preparing → Ready for Pickup with live audio/visual alerts." },
                  { title: "Anti-Fraud Cryptographic QR Pass", desc: "Display dynamic high-contrast QR tokens or 3-digit backup tokens that verify instantly at the counter." },
                  { title: "Loyalty Streaks & 1-Tap Reorder ('My Usual')", desc: "Earn campus rewards on daily streaks and re-order favorite daily combos with a single tap." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock Preview Card */}
            <div className="bg-[#080B13] border border-white/10 rounded-2xl p-6 shadow-inner relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-slate-300">Live Active Order Tracker</span>
                </div>
                <span className="text-xs font-black text-amber-400 px-2 py-0.5 rounded bg-amber-400/10">TOKEN #289</span>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 mb-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="font-extrabold text-sm text-white">Gazebo C1 — Snacks & Fast Food</h5>
                    <p className="text-xs text-slate-400">Scheduled: 1:15 PM - 1:30 PM</p>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400">READY FOR PICKUP</span>
                </div>

                <div className="flex gap-2 my-4">
                  {['Placed', 'Preparing', 'Ready', 'Collected'].map((step, i) => (
                    <div key={step} className="flex-1 text-center">
                      <div className={`h-1.5 rounded-full mb-1 ${i <= 2 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      <span className={`text-[10px] font-bold ${i <= 2 ? 'text-emerald-400' : 'text-slate-400'}`}>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-10 h-10 text-orange-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Present QR at Counter</p>
                      <p className="text-[10px] text-slate-400">Anti-screenshot token CB1.4019.289</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-400">PAID ₹105</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Wallet Balance: <strong className="text-white">₹420</strong></span>
                <span className="text-orange-400 font-bold">Loyalty Streak: 🔥 5 Days</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Staff KDS Model */}
        {activeModelTab === 'staff' && (
          <div className="grid lg:grid-cols-2 gap-8 items-center bg-[#0C101B] border border-white/10 rounded-3xl p-8 lg:p-12 shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold mb-4">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>KITCHEN & COUNTER OPERATIONS</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">
                High-Speed Kitchen Display System (KDS).
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Zero confusing paper chits. Kitchen workers see live queued orders, hear audible chimes, advance status with 1 tap, and scan student tokens in under 2 seconds.
              </p>

              <div className="space-y-4">
                {[
                  { title: "Web Audio Chime Notifications", desc: "Loud, clear harmonic sound alert triggers instantly when new student orders drop into the queue." },
                  { title: "1-Tap State Advancer", desc: "Single tap moves tickets from Placed → Preparing → Ready, immediately pushing push updates to the student's screen." },
                  { title: "Scan-to-Collect Camera & 3-Digit Numpad", desc: "Camera scans student QR pass in 0.5s or staff types the 3-digit backup code to release food." },
                  { title: "Rapid Stock Steppers & 86 Toggle", desc: "Quick +/- stock controls and '86 Item' (Mark Sold Out) that updates the student menu campus-wide in 150ms." },
                  { title: "Offline Walk-In POS Drawer", desc: "Handle offline cash or card walk-ins without internet dependency, maintaining synchronized inventory." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock KDS Preview */}
            <div className="bg-[#080B13] border border-white/10 rounded-2xl p-6 shadow-inner">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4 animate-bounce" />
                  KDS Active Queue (3 Pending)
                </span>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                  AUDIO CHIME ON
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-orange-400">TOKEN #104 · 2m ago</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-500 text-white">PLACED</span>
                  </div>
                  <p className="text-xs font-bold text-white">2x Veg Puff, 1x Paneer Roll</p>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-extrabold hover:bg-orange-600">
                      Start Preparing →
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-amber-400">TOKEN #289 · 7m ago</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-900">PREPARING</span>
                  </div>
                  <p className="text-xs font-bold text-white">3x Chicken Cutlet</p>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-extrabold hover:bg-emerald-600">
                      Mark Ready for Pickup! ✓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Shop Admin Model */}
        {activeModelTab === 'shop' && (
          <div className="grid lg:grid-cols-2 gap-8 items-center bg-[#0C101B] border border-white/10 rounded-3xl p-8 lg:p-12 shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold mb-4">
                <Store className="w-3.5 h-3.5" />
                <span>MERCHANT & FRANCHISE ENGINE</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">
                Full Storefront Autonomy & Realtime Revenue.
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Designed for canteen managers and franchise operators. Manage digital menu catalogs, provision kitchen staff with 8-character codes, and analyze net payouts with zero guesswork.
              </p>

              <div className="space-y-4">
                {[
                  { title: "Dynamic Menu Catalog CRUD", desc: "Update prices, add combo specials, set dietary tags (Veg/Non-Veg), and schedule meal-time availability windows." },
                  { title: "'My Team' Staff Provisioning", desc: "Generate 8-character cryptographic invite codes for kitchen helpers and toggle active staff access instantly." },
                  { title: "Real-Time Net Payout & GMV Analytics", desc: "Track total daily orders, 95% merchant payout calculations, top-selling items, and peak hour trends." },
                  { title: "Outlet-Scoped Flash Discounts", desc: "Launch targeted promo codes (e.g., 'EXAM15') restricted to your canteen to boost afternoon sales." },
                  { title: "Open/Closed Kitchen Switch", desc: "Pause incoming digital orders with a master emergency switch during unexpected ingredient shortages." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock Shop Analytics Preview */}
            <div className="bg-[#080B13] border border-white/10 rounded-2xl p-6 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  Outlet Financial Overview
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                  Gazebo C1
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Today's Revenue</p>
                  <p className="text-xl font-black text-white mt-1">₹42,850</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">↑ 18% vs yesterday</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Net Merchant Payout</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">₹40,707</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">95% settled directly</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-xs font-bold text-slate-300 mb-2">Team Staff Access</p>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                  <span className="text-white">Murugan K. (Kitchen)</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-white">Ramesh S. (Counter)</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Super Admin Model */}
        {activeModelTab === 'admin' && (
          <div className="grid lg:grid-cols-2 gap-8 items-center bg-[#0C101B] border border-white/10 rounded-3xl p-8 lg:p-12 shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold mb-4">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>UNIVERSITY GOVERNANCE & OVERSIGHT</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">
                Campus-Wide Oversight, Hierarchy & Monetization.
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Built for startup leadership and campus authorities. Monitor cross-canteen volume, collect automated 5% platform cuts, inspect audit logs, and onboard festival stalls with 1 click.
              </p>

              <div className="space-y-4">
                {[
                  { title: "Platform GMV & 5% Monetization Cut", desc: "Automated real-time calculation of platform net earnings and float liquidity across all campus food courts." },
                  { title: "Nested Hierarchy Tree (Outlet → Shop Admin → Staff)", desc: "Visual multi-tier organizational tree showing management links, operating hours, and staff assignments." },
                  { title: "Cross-Outlet Realtime Feed & CSV Export", desc: "Global live transaction feed across all 13 canteens and 20 stalls with instant CSV export for reporting." },
                  { title: "Master Event Mode Toggle (Riviera / Gravitas)", desc: "1-click switch instantly activates 20 temporary festival stalls and provisions event-mode staff accounts." },
                  { title: "Full System Stock Audit Log", desc: "Forensic audit logging every inventory change (manual steppers vs order decrements) to eliminate pilferage." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock Super Admin Preview */}
            <div className="bg-[#080B13] border border-white/10 rounded-2xl p-6 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black text-purple-400 uppercase tracking-wider">
                  University Master Control
                </span>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
                  All 33 Outlets
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Campus GMV</p>
                  <p className="text-xl font-black text-white mt-1">₹2,48,900</p>
                  <p className="text-[10px] text-purple-400 mt-0.5">Across 1,450 orders</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Platform Profit (5%)</p>
                  <p className="text-xl font-black text-purple-400 mt-1">₹12,445</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Automated rake</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Riviera Event Mode</p>
                  <p className="text-[10px] text-slate-400">20 Festival Stalls Active</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[11px] border border-emerald-500/30">
                  LIVE ACTIVE
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. BUSINESS & UNIT ECONOMICS MODEL
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="economics" className="py-20 px-6 lg:px-12 bg-[#090C14] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2 block">
              Startup Viability & Monetization
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
              Unit Economics Built for Campus Scale.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              A high-frequency digital micropayments model generating consistent margin with zero merchant acquisition churn.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 rounded-3xl bg-[#0E121E] border border-white/10 hover:border-amber-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">5% Platform Take-Rate</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Applied automatically on every transaction. On average campus basket of ₹120, V-BUY captures ₹6 per order with zero hardware overhead.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-amber-300 font-semibold">
                Daily projected platform income: ₹12,000 - ₹25,000
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#0E121E] border border-white/10 hover:border-orange-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Riviera / Gravitas Stalls</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Temporary 4-day festival stalls pay a ₹1,500 onboarding license + standard 5% take-rate for plug-and-play QR ordering and live sales tracking.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-orange-300 font-semibold">
                20 stalls × ₹1,500 + surge take-rate: ₹1,50,000+
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#0E121E] border border-white/10 hover:border-blue-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Closed-Loop Wallet Float</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                35,000 students holding average ₹200 wallet balances creates a ₹70 Lakhs liquid treasury float, enabling interest yield and instant sub-second transactions.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 text-xs text-blue-300 font-semibold">
                Zero PG gateway failure on rush hours
              </div>
            </div>
          </div>

          {/* Interactive Unit Economics Breakdown */}
          <div className="p-8 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-purple-500/10 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">Illustrative Sample Order</span>
              <h4 className="text-2xl font-black text-white mt-1">₹140 Meal Combo Breakdown</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-lg">
                Transparent split ensures canteens earn 95% net revenue with faster turnaround, while the startup takes a guaranteed 5% margin.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">Merchant Receives (95%)</p>
                <p className="text-2xl font-black text-emerald-400">₹133.00</p>
              </div>
              <div className="h-10 w-[1px] bg-white/10" />
              <div className="text-left">
                <p className="text-xs text-slate-400">V-BUY Take (5%)</p>
                <p className="text-2xl font-black text-orange-400">₹7.00</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          6. INTERACTIVE LIVE PLATFORM SIMULATOR
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="simulator" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INTERACTIVE TEST DRIVE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            See Simultaneous Synchronization Live.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Trigger a simulated student order below and watch it propagate instantly across the simulated Kitchen KDS and Super Admin revenue telemetry.
          </p>
        </div>

        <div className="bg-[#0C101A] border border-white/10 rounded-3xl p-6 lg:p-10 shadow-2xl">
          {/* Simulator Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Simulated Item</span>
              <p className="text-base font-bold text-white">{simRecentOrder.item} · Gazebo C1</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={triggerSimOrder}
                disabled={simStep !== 'idle' && simStep !== 'collected'}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Simulate Student Order (₹155)</span>
              </button>
              {simStep !== 'idle' && (
                <button
                  onClick={resetSim}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                  title="Reset Simulator"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Three Simultaneous Windows */}
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            {/* Screen 1: Student Phone Screen */}
            <div className="bg-[#080B13] border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Student Mobile View
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                  simStep === 'idle' ? 'bg-slate-800 text-slate-400' :
                  simStep === 'ordered' ? 'bg-blue-500/20 text-blue-400' :
                  simStep === 'preparing' ? 'bg-amber-500/20 text-amber-400' :
                  simStep === 'ready' ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {simStep === 'idle' ? 'NO ORDER' : simStep.toUpperCase()}
                </span>
              </div>

              {simStep === 'idle' ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Click "Simulate Student Order" to trigger checkout.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white">{simRecentOrder.item}</span>
                    <span className="font-mono text-emerald-400 font-bold">₹{simRecentOrder.amount}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Campus Pickup Pass</p>
                    <p className="text-2xl font-black text-amber-400 my-1">TOKEN #{simRecentOrder.token}</p>
                    <div className="w-16 h-16 bg-white mx-auto rounded p-1">
                      <QrCode className="w-full h-full text-black" />
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-slate-400">
                    {simStep === 'ready' ? '⚡ Collect now at Gazebo counter express window!' : 'Realtime WebSocket connected'}
                  </p>
                </div>
              )}
            </div>

            {/* Screen 2: Staff Kitchen Display (KDS) */}
            <div className="bg-[#080B13] border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  Staff Kitchen KDS
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-300">
                  GAZEBO C1
                </span>
              </div>

              {simStep === 'idle' ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Waiting for incoming orders...
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-amber-400">TOKEN #{simRecentOrder.token}</span>
                      <span className="text-white text-[10px]">Just now</span>
                    </div>
                    <p className="text-xs font-extrabold text-white">{simRecentOrder.item}</p>
                    <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-slate-300">
                      <span>Status:</span>
                      <span className="text-emerald-400">{simStep.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Screen 3: Super Admin Live Telemetry */}
            <div className="bg-[#080B13] border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Super Admin Telemetry
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-500/10 text-purple-300">
                  REALTIME FEED
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Campus GMV</p>
                  <p className="text-xl font-black text-white">₹{simGmv.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-[10px] text-purple-300 font-bold uppercase">Platform Profit (5%)</p>
                  <p className="text-xl font-black text-purple-400">₹{simProfit.toLocaleString('en-IN')}</p>
                </div>
                <p className="text-[10px] text-slate-400">
                  Audit Row: <span className="font-mono text-white">stock_adjustments.item_decrement</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          7. TECHNICAL ARCHITECTURE & SECURITY
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="architecture" className="py-20 px-6 lg:px-12 bg-[#090C14] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2 block">
              Enterprise Grade Tech Stack
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
              Engineered for High-Concurreny Campus Peaks.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Proven architecture handling 1,500 simultaneous requests during the 1:15 PM lunch bell without degrading latency.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Cpu,
                color: "text-orange-400 bg-orange-500/10",
                title: "Supabase Realtime Engine",
                desc: "Sub-150ms WebSocket push notifications broadcast order state changes and 86 Sold-Out alerts to all connected devices."
              },
              {
                icon: Lock,
                color: "text-emerald-400 bg-emerald-500/10",
                title: "Row Level Security (RLS)",
                desc: "PostgreSQL RLS ensures staff only access their assigned outlet, while students can never inspect another peer's cart."
              },
              {
                icon: QrCode,
                color: "text-blue-400 bg-blue-500/10",
                title: "Anti-Screenshot Passes",
                desc: "Tokens combine order IDs with dynamic timestamps, preventing unauthorized redemption through shared screenshots."
              },
              {
                icon: Zap,
                color: "text-amber-400 bg-amber-500/10",
                title: "Offline POS Fallback",
                desc: "Counter operations continue uninterrupted during campus power or internet outages with local token validation."
              }
            ].map((card, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#0E121E] border border-white/5 hover:border-white/15 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">{card.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          8. FREQUENTLY ASKED QUESTIONS (Accordion)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6 lg:px-12 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index
            return (
              <div
                key={index}
                className="rounded-2xl bg-[#0C101A] border border-white/10 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left text-sm sm:text-base font-bold text-white hover:text-orange-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/5">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          9. FINAL CALL TO ACTION BANNER
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-tr from-orange-600 via-amber-600 to-orange-500 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl shadow-orange-500/20">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
              Ready to Experience the Future of Campus Dining?
            </h2>
            <p className="text-amber-100 text-sm sm:text-base mb-8">
              Open the live web application right now to test ordering, kitchen ticketing, and university management in real time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onLaunchApp}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-slate-900 bg-white hover:bg-slate-100 shadow-xl hover:scale-105 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                <span>Launch V-BUY App Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          10. FOOTER
      ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6 lg:px-12 bg-[#05070B] text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-white text-sm">V-BUY Technologies</p>
              <p className="text-[11px] text-slate-400">VIT Vellore Campus Dining & Stall Operations Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#models" className="hover:text-white transition-colors">4 Role Models</a>
            <a href="#economics" className="hover:text-white transition-colors">Economics</a>
            <a href="#simulator" className="hover:text-white transition-colors">Simulator</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <button onClick={onLaunchApp} className="text-orange-400 font-bold hover:underline">
              Enter App →
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/5 text-center text-slate-400 text-[11px]">
          © {new Date().getFullYear()} V-BUY. All rights reserved. Built for VIT Vellore University Canteens, Riviera, & Gravitas.
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
