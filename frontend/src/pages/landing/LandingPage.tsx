import React, { useState } from 'react'
import {
  UtensilsCrossed, ArrowRight, Clock, QrCode, Smartphone, Bell,
  ChevronRight, CheckCircle2, ShieldCheck, DollarSign, Store,
  Users, ChevronDown, Sparkles, RefreshCw, ShoppingBag, Coffee,
  Flame, Check, Play, MapPin, Star
} from 'lucide-react'

interface LandingPageProps {
  onLaunchApp: () => void
  onQuickLogin?: (role: 'student' | 'staff' | 'shop_admin' | 'super_admin') => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp, onQuickLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeRoleTab, setActiveRoleTab] = useState<'student' | 'staff' | 'shop' | 'admin'>('student')
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  // Interactive Live Demo Simulator
  const [simStep, setSimStep] = useState<'idle' | 'ordered' | 'preparing' | 'ready' | 'collected'>('idle')
  const [simGmv, setSimGmv] = useState(148500)
  const [simProfit, setSimProfit] = useState(7425)

  const triggerSimOrder = () => {
    setSimStep('ordered')
    setSimGmv(prev => prev + 140)
    setSimProfit(prev => prev + 7) // 5% fee

    setTimeout(() => setSimStep('preparing'), 1200)
    setTimeout(() => setSimStep('ready'), 2400)
    setTimeout(() => setSimStep('collected'), 3800)
  }

  const resetSim = () => setSimStep('idle')

  const faqs = [
    {
      q: "How does V-FOOD reduce the 30-minute lunch line?",
      a: "Students order meals from their phone before class ends and pick a scheduled 15-minute pickup slot. The canteen kitchen prepares the food ahead of time. When it is ready, the student shows a quick QR pass at the express pickup counter and collects their hot food in under 2 minutes."
    },
    {
      q: "What is the business model?",
      a: "V-FOOD charges a transparent 5% platform fee per digital order. Canteens keep 95% of their revenue with faster turnaround and zero cash handling errors. Additional revenue comes from temporary stall onboarding during campus fests (Riviera and Gravitas) and student wallet float."
    },
    {
      q: "How do kitchen workers know what to prepare?",
      a: "Counter staff have a clean Kitchen Display Screen (KDS) on a tablet or mobile. Every new order rings with a clear sound alert. Staff can tap 'Preparing' or 'Ready', and scan the student's QR code in 2 seconds to confirm pickup."
    },
    {
      q: "What happens if an item runs out of stock?",
      a: "Kitchen staff have a simple '+ / -' stock stepper and a one-tap 'Sold Out' button. As soon as an item is marked sold out, it immediately greys out on all students' phones so no one can order an unavailable dish."
    },
    {
      q: "How do festival stalls join during Riviera or Gravitas?",
      a: "University admins can turn on 'Event Mode' with one click, activating all 20 festival stalls on campus. Stalls can be onboarded in under 2 minutes using simple 8-character invite codes."
    }
  ]

  return (
    <div className="min-h-screen bg-[#0C1017] text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. CLEAN NAVIGATION BAR
      ───────────────────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0C1017]/90 border-b border-slate-800/80 px-6 lg:px-12 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">V-FOOD</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  CAMPUS DINING
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Order Ahead &amp; Skip the Line</p>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-300">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-white transition-colors">Who It's For</a>
            <a href="#simulator" className="hover:text-orange-400 text-orange-400 flex items-center gap-1.5 transition-colors">
              <Sparkles className="w-3.5 h-3.5" />
              Live Demo
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          {/* Action Button */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onLaunchApp}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Open V-FOOD App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-200"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-800 flex flex-col gap-2.5 pb-2">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1.5 text-sm text-slate-300">How It Works</a>
            <a href="#roles" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1.5 text-sm text-slate-300">Who It's For</a>
            <a href="#simulator" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1.5 text-sm text-orange-400">Live Demo</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1.5 text-sm text-slate-300">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1.5 text-sm text-slate-300">FAQ</a>
            <button onClick={() => { setMobileMenuOpen(false); onLaunchApp() }} className="w-full mt-2 py-2.5 rounded-lg bg-orange-500 text-white font-bold text-sm">
              Open App
            </button>
          </div>
        )}
      </nav>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. HERO SECTION
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="pt-16 pb-20 px-6 lg:px-12 text-center max-w-4xl mx-auto">
        {/* Simple Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Live across 13 campus canteens &amp; 20 Riviera festival stalls</span>
        </div>

        {/* Clean, Human Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-5">
          Skip the Canteen Line.<br />
          <span className="text-orange-400">Order Ahead &amp; Pick Up Fast.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          V-FOOD connects students, busy canteen kitchens, shop owners, and university admins on one simple platform. Zero waiting, fast QR pickup, and transparent payments.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12">
          <button
            onClick={onLaunchApp}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-base bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Launch App</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#simulator"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-base bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>Try Live Simulator</span>
          </a>
        </div>

        {/* Quick Role Selectors */}
        <div className="pt-6 border-t border-slate-800/80 max-w-xl mx-auto">
          <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">
            Open Directly as Any Role:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { role: 'student', label: 'Student', icon: ShoppingBag, color: 'hover:border-blue-500 hover:text-blue-400' },
              { role: 'staff', label: 'Canteen Staff', icon: UtensilsCrossed, color: 'hover:border-amber-500 hover:text-amber-400' },
              { role: 'shop_admin', label: 'Shop Owner', icon: Store, color: 'hover:border-emerald-500 hover:text-emerald-400' },
              { role: 'super_admin', label: 'Admin', icon: ShieldCheck, color: 'hover:border-purple-500 hover:text-purple-400' },
            ].map(item => (
              <button
                key={item.role}
                onClick={() => onQuickLogin ? onQuickLogin(item.role as any) : onLaunchApp()}
                className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-all ${item.color}`}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. REAL CAMPUS STATS
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-800/80 bg-[#0E131C] py-8 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl font-extrabold text-white">13 + 20</p>
            <p className="text-xs font-medium text-slate-400 mt-1">Canteens &amp; Festival Stalls</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-orange-400">2 mins</p>
            <p className="text-xs font-medium text-slate-400 mt-1">Average Counter Pickup</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-400">100%</p>
            <p className="text-xs font-medium text-slate-400 mt-1">Verified Order Collection</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-white">5%</p>
            <p className="text-xs font-medium text-slate-400 mt-1">Simple Platform Fee</p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. WHO IT'S FOR: 4 SIMPLE ROLES
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="roles" className="py-20 px-6 lg:px-12 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Designed for Everyone on Campus
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Each role gets a focused, clutter-free screen tailored to what they need to do.
          </p>

          {/* Simple Tab Pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {[
              { id: 'student', label: '1. Students', icon: ShoppingBag },
              { id: 'staff', label: '2. Kitchen Staff', icon: UtensilsCrossed },
              { id: 'shop', label: '3. Canteen Owners', icon: Store },
              { id: 'admin', label: '4. Campus Admins', icon: ShieldCheck }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveRoleTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  activeRoleTab === tab.id
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Student */}
        {activeRoleTab === 'student' && (
          <div className="grid md:grid-cols-2 gap-8 items-center bg-[#101522] border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-2">For Students</span>
              <h3 className="text-2xl font-bold text-white mb-3">
                Order Ahead &amp; Pick Up in 2 Minutes.
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-5">
                No more standing in hungry lines between lectures. Pick your food, choose your pickup time, and grab your meal fresh from the counter.
              </p>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Scheduled pickup slots:</strong> Select exact 15-min windows so your meal is hot when you arrive.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Fast campus wallet:</strong> Preload balance with UPI to checkout in one tap even when cell network is slow.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Instant QR pickup pass:</strong> Show your token at the counter for quick collection with zero confusion.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Daily streaks &amp; loyalty:</strong> Earn discounts and reorder your favorite daily combo in 1 tap.</span>
                </li>
              </ul>
            </div>

            {/* Visual Card */}
            <div className="bg-[#0B0E17] border border-slate-800 rounded-xl p-5 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                <div>
                  <p className="font-bold text-white text-sm">Gazebo C1 Canteen</p>
                  <p className="text-slate-400 text-[11px]">Scheduled for 1:15 PM</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">READY</span>
              </div>

              <div className="bg-slate-900 rounded-lg p-3 text-center mb-3">
                <p className="text-slate-400 text-[11px]">Pickup Token</p>
                <p className="text-2xl font-black text-orange-400 my-1">#289</p>
                <div className="w-20 h-20 bg-white mx-auto rounded p-1.5 my-2">
                  <QrCode className="w-full h-full text-slate-900" />
                </div>
                <p className="text-[11px] text-slate-400">Present this QR code at the counter</p>
              </div>

              <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-800">
                <span>Total Paid: <strong className="text-white">₹105</strong></span>
                <span className="text-emerald-400 font-semibold">Wallet Balance: ₹420</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Staff */}
        {activeRoleTab === 'staff' && (
          <div className="grid md:grid-cols-2 gap-8 items-center bg-[#101522] border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">For Kitchen Staff</span>
              <h3 className="text-2xl font-bold text-white mb-3">
                A Clean Kitchen Screen. Zero Lost Paper Chits.
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-5">
                Staff can see incoming orders clearly on a tablet or mobile screen. Hear a sound when new food is ordered and tap to update status.
              </p>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Audio chime on new order:</strong> Pleasant sound alert notifies staff the second an order arrives.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>1-tap status updates:</strong> Tap 'Preparing' or 'Ready' to notify the student's phone instantly.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Fast QR verification:</strong> Point camera at student QR or enter 3-digit backup code to mark collected.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>One-tap 'Sold Out':</strong> Ran out of samosas? Tap '86 Item' to immediately stop student orders.</span>
                </li>
              </ul>
            </div>

            {/* Visual Card */}
            <div className="bg-[#0B0E17] border border-slate-800 rounded-xl p-5 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Bell className="w-4 h-4" />
                  Live Kitchen Queue
                </span>
                <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">Sound Alert: ON</span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-white">TOKEN #104</span>
                    <span className="text-orange-400">Placed (2m ago)</span>
                  </div>
                  <p className="text-slate-300">2x Veg Puff, 1x Paneer Roll</p>
                  <button className="mt-2.5 w-full py-1.5 rounded bg-orange-500 text-white font-bold text-xs hover:bg-orange-600">
                    Start Preparing →
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-white">TOKEN #289</span>
                    <span className="text-emerald-400">Preparing (6m ago)</span>
                  </div>
                  <p className="text-slate-300">3x Chicken Cutlet</p>
                  <button className="mt-2.5 w-full py-1.5 rounded bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600">
                    Mark Ready for Pickup ✓
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Shop Owner */}
        {activeRoleTab === 'shop' && (
          <div className="grid md:grid-cols-2 gap-8 items-center bg-[#101522] border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">For Canteen Owners</span>
              <h3 className="text-2xl font-bold text-white mb-3">
                Full Store Control &amp; Real-Time Sales.
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-5">
                Manage your canteen menu, onboard your kitchen workers, and see exact earnings and payouts with complete clarity.
              </p>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Live earnings dashboard:</strong> See today's total revenue, order count, and your 95% net payout.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Menu editing:</strong> Add dishes, update prices, and set breakfast, lunch, or snack timing windows.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Team management:</strong> Invite kitchen helpers with simple 8-character codes and toggle access.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Kitchen open/close switch:</strong> Pause incoming online orders with one tap during busy prep time.</span>
                </li>
              </ul>
            </div>

            {/* Visual Card */}
            <div className="bg-[#0B0E17] border border-slate-800 rounded-xl p-5 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
                <span className="font-bold text-white text-sm">Gazebo C1 Overview</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">STORE OPEN</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 text-[11px]">Today's Sales</p>
                  <p className="text-lg font-bold text-white mt-1">₹42,850</p>
                  <p className="text-[10px] text-emerald-400">184 orders</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 text-[11px]">Net Merchant Payout</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">₹40,707</p>
                  <p className="text-[10px] text-slate-400">95% settled</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                <p className="font-bold text-slate-300 mb-1">Kitchen Team (2 Staff Active)</p>
                <p className="text-slate-400">Murugan K. · Active on Counter</p>
                <p className="text-slate-400">Ramesh S. · Active on Grill</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Super Admin */}
        {activeRoleTab === 'admin' && (
          <div className="grid md:grid-cols-2 gap-8 items-center bg-[#101522] border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div>
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-2">For Campus Administrators</span>
              <h3 className="text-2xl font-bold text-white mb-3">
                Total Campus Food Operations at a Glance.
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-5">
                Oversee all 13 canteens and 20 festival stalls from one master view. Real-time sales, automated 5% platform earnings, and complete inventory logs.
              </p>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Campus GMV &amp; 5% take:</strong> See live platform transaction volume and platform earnings.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Canteen hierarchy tree:</strong> View all outlets, their assigned shop managers, and active staff.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Riviera / Gravitas Event Mode:</strong> One-tap toggle activates 20 temporary festival stalls across campus grounds.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Full inventory audit log:</strong> Track every stock adjustment to prevent food waste and counter discrepancies.</span>
                </li>
              </ul>
            </div>

            {/* Visual Card */}
            <div className="bg-[#0B0E17] border border-slate-800 rounded-xl p-5 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
                <span className="font-bold text-purple-400 text-sm">University Master Console</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">33 OUTLETS</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 text-[11px]">Total Campus GMV</p>
                  <p className="text-lg font-bold text-white mt-1">₹2,48,900</p>
                  <p className="text-[10px] text-slate-400">1,450 orders today</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 text-[11px]">Platform Take (5%)</p>
                  <p className="text-lg font-bold text-purple-400 mt-1">₹12,445</p>
                  <p className="text-[10px] text-emerald-400">Automated settlement</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">Riviera Event Mode</p>
                  <p className="text-slate-400 text-[11px]">20 Festival Stalls Active</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">ACTIVE</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. INTERACTIVE LIVE PLATFORM SIMULATOR
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="simulator" className="py-16 px-6 lg:px-12 bg-[#0E131C] border-y border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block mb-1">
              Interactive Test Drive
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
              See How an Order Moves Across All Screens
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Click the button below to simulate a real student order. Watch how the student phone, kitchen screen, and admin earnings update simultaneously.
            </p>
          </div>

          <div className="bg-[#101522] border border-slate-800 rounded-2xl p-5 sm:p-7">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Sample Order</p>
                <p className="text-base font-bold text-white">2x Paneer Roll + Mango Lassi (₹140) · Gazebo C1</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={triggerSimOrder}
                  disabled={simStep !== 'idle' && simStep !== 'collected'}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Simulate Order (₹140)</span>
                </button>
                {simStep !== 'idle' && (
                  <button onClick={resetSim} className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white" title="Reset">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 3 Synchronized Screen Cards */}
            <div className="grid sm:grid-cols-3 gap-4 mt-5">
              {/* Screen 1: Student */}
              <div className="bg-[#0B0E17] border border-blue-500/30 rounded-xl p-4 text-xs">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-800 mb-2.5">
                  <span className="font-bold text-blue-400 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    Student View
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    simStep === 'idle' ? 'bg-slate-800 text-slate-400' :
                    simStep === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {simStep === 'idle' ? 'NO ORDER' : simStep.toUpperCase()}
                  </span>
                </div>

                {simStep === 'idle' ? (
                  <p className="text-slate-400 text-center py-8">Click "Simulate Order" above to start.</p>
                ) : (
                  <div>
                    <p className="font-bold text-white mb-2">Token #412</p>
                    <div className="p-2.5 bg-slate-900 rounded text-center">
                      <QrCode className="w-12 h-12 text-white mx-auto" />
                      <p className="text-[10px] text-slate-400 mt-1">Show at counter</p>
                    </div>
                    <p className="text-[11px] text-emerald-400 font-semibold mt-2 text-center">
                      {simStep === 'ready' ? 'Ready for Pickup!' : 'Order received'}
                    </p>
                  </div>
                )}
              </div>

              {/* Screen 2: Kitchen Staff */}
              <div className="bg-[#0B0E17] border border-amber-500/30 rounded-xl p-4 text-xs">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-800 mb-2.5">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    Kitchen Screen
                  </span>
                  <span className="text-[10px] text-slate-400">Gazebo C1</span>
                </div>

                {simStep === 'idle' ? (
                  <p className="text-slate-400 text-center py-8">Waiting for incoming tickets...</p>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-amber-400">TOKEN #412</span>
                      <span className="text-white text-[10px]">{simStep.toUpperCase()}</span>
                    </div>
                    <p className="text-slate-300">2x Paneer Roll, 1x Lassi</p>
                  </div>
                )}
              </div>

              {/* Screen 3: Admin Financials */}
              <div className="bg-[#0B0E17] border border-purple-500/30 rounded-xl p-4 text-xs">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-800 mb-2.5">
                  <span className="font-bold text-purple-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    Platform Admin
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">+₹7 Take</span>
                </div>

                <div className="space-y-2 mt-2">
                  <div className="p-2 bg-slate-900 rounded flex justify-between">
                    <span className="text-slate-400">Campus Sales</span>
                    <span className="font-bold text-white">₹{simGmv.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-2 bg-purple-500/10 rounded flex justify-between">
                    <span className="text-purple-300">5% Platform Cut</span>
                    <span className="font-bold text-purple-300">₹{simProfit.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          6. PRICING & REVENUE MODEL
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 lg:px-12 max-w-5xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
            Fair &amp; Transparent
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Simple 5% Fee. Canteens Keep 95%.
          </h2>
          <p className="text-slate-400 text-sm">
            Zero upfront hardware fees. Canteens only pay when an order is completed.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#101522] border border-slate-800">
            <p className="text-sm font-bold text-orange-400 uppercase">Digital Orders</p>
            <p className="text-3xl font-black text-white my-2">5%</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Applied automatically per completed order. On a ₹140 order, canteens receive ₹133 and V-FOOD captures ₹7.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#101522] border border-slate-800">
            <p className="text-sm font-bold text-amber-400 uppercase">Riviera Festival Stalls</p>
            <p className="text-3xl font-black text-white my-2">₹1,500</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Temporary 4-day pass for visiting food stalls to run QR ordering, express pickup, and track daily sales.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#101522] border border-slate-800">
            <p className="text-sm font-bold text-blue-400 uppercase">Student Preload Wallet</p>
            <p className="text-3xl font-black text-white my-2">₹0</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Zero fees for students to recharge or order food. Fast UPI top-ups ensure 1-tap checkout without card friction.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          7. FAQ ACCORDION
      ───────────────────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 px-6 lg:px-12 max-w-3xl mx-auto border-t border-slate-800">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index
            return (
              <div key={index} className="rounded-xl bg-[#101522] border border-slate-800 overflow-hidden">
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left text-sm font-bold text-white hover:text-orange-400"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-orange-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          8. CALL TO ACTION BANNER
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-8 sm:p-12 text-center text-slate-900 shadow-xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
            Ready to Try V-FOOD on Campus?
          </h2>
          <p className="text-white/90 text-sm max-w-lg mx-auto mb-6 font-medium">
            Open the live app right now to test food ordering, the kitchen display queue, or shop management.
          </p>
          <button
            onClick={onLaunchApp}
            className="px-8 py-3.5 rounded-xl font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-md text-sm inline-flex items-center gap-2"
          >
            <span>Launch V-FOOD App Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          9. SIMPLE CLEAN FOOTER
      ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-10 px-6 lg:px-12 bg-[#090C13] text-slate-400 text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white">
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">V-FOOD</p>
              <p className="text-[11px] text-slate-400">Campus Dining &amp; Canteen Pre-Ordering System</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <a href="#how-it-works" className="hover:text-white">How It Works</a>
            <a href="#roles" className="hover:text-white">Roles</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <button onClick={onLaunchApp} className="text-orange-400 font-bold hover:underline">
              Open App →
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-slate-800/60 text-center text-slate-400 text-[11px]">
          © {new Date().getFullYear()} V-FOOD. Built for University Canteens, Riviera, &amp; Gravitas Stalls.
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
