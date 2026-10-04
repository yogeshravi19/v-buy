import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowRight, Wallet, QrCode, Clock, CheckCircle2,
  ChevronDown, ChevronUp, Shield, Store,
  Zap, Lock, Package, ChefHat, User,
  TrendingUp, Menu, X, Sparkles, Check, Download
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
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ─── 3D Tilting Phone Frame ──────────────────────────────────────────────────

function PhoneFrame({ src, alt, width = 230 }: { src: string; alt: string; width?: number }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14
    const y = -((e.clientY - rect.top) / rect.height - 0.5) * 14
    setTilt({ x: y, y: x })
  }

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 })

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: 1000,
        display: 'inline-block',
      }}
    >
      <div
        style={{
          width,
          background: '#FFFFFF',
          borderRadius: 36,
          border: '3px solid #E2E8F0',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
          position: 'relative',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s ease-out',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Sleek Light Notch */}
        <div style={{ background: '#F8FAFC', height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ width: 56, height: 5, background: '#CBD5E1', borderRadius: 4 }} />
        </div>
        <img
          src={src}
          alt={alt}
          loading="lazy"
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
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #EA580C, #C2410C)',
      color: '#fff',
      fontWeight: 800,
      fontSize: 14,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 4px 12px rgba(234, 88, 12, 0.28)',
    }}>
      {n}
    </div>
  )
}

// ─── Section Container ───────────────────────────────────────────────────────

function Section({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`py-20 lg:py-24 px-6 sm:px-8 max-w-7xl mx-auto ${className}`}>
      {children}
    </section>
  )
}

function Divider() {
  return <div className="border-t border-slate-200/80 max-w-7xl mx-auto" />
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
        <span className="font-bold text-base text-slate-900">{q}</span>
        <span className="text-orange-600 shrink-0">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open && (
        <p className="text-sm text-slate-600 leading-relaxed pt-2 pb-2 pl-1 animate-in fade-in duration-150">
          {a}
        </p>
      )}
    </div>
  )
}

// ─── Role Card ───────────────────────────────────────────────────────────────

function RoleCard({
  label,
  icon,
  screenshot,
  screenshotAlt,
  lines,
  tag,
}: {
  label: string
  icon: React.ReactNode
  screenshot: string
  screenshotAlt: string
  lines: string[]
  tag?: string
}) {
  return (
    <FadeIn>
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between h-full hover:border-orange-400 hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-300">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center">
                {icon}
              </div>
              <span className="font-bold text-lg text-slate-900">{label}</span>
            </div>
            {tag && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {tag}
              </span>
            )}
          </div>

          <div className="flex justify-center my-4">
            <PhoneFrame src={screenshot} alt={screenshotAlt} width={180} />
          </div>

          <ul className="space-y-2.5 mt-5">
            {lines.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                <Check className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FadeIn>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function WelcomePage({ onOpenApp }: { onOpenApp?: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  const navLinks = [
    { href: '#order-flow-3d', label: '3D Order Flow' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#database', label: 'Database & Schemas' },
    { href: '#interactive-demo', label: 'Live Demo' },
    { href: '#tracking', label: 'Live Tracking' },
    { href: '#wallet', label: 'Payments' },
    { href: '#dashboards', label: 'Roles & Dashboards' },
    { href: '#architecture', label: 'Tech Stack' },
    { href: '#faq', label: 'FAQ' },
  ]

  const handleOpenApp = () => {
    if (onOpenApp) onOpenApp()
    else window.location.href = '/'
  }

  const faqs = [
    {
      q: 'How do I add money to my wallet?',
      a: 'Open the Wallet tab and tap a preset amount (₹100, ₹200, ₹500, ₹1000, ₹2000) or enter a custom amount. You are taken to PhonePe, which supports any UPI app or bank card. Once your bank confirms the payment, the balance appears in your wallet immediately.',
    },
    {
      q: 'Is there a fee when I top up?',
      a: 'Top-ups via UPI or RuPay have zero extra fee — you pay exactly the amount you chose and receive that amount in your wallet. Credit and debit cards carry standard bank processing fees; the app applies a transparent reverse formula so your wallet still receives the clean amount you selected.',
    },
    {
      q: 'What happens if an item runs out after I order?',
      a: 'Stock is checked and reserved the moment you place an order. If the kitchen runs out before you order, the item is automatically shown as sold out so you cannot order it. If an ingredient runs out unexpectedly, kitchen staff tap Mark Unavailable and your wallet is refunded instantly.',
    },
    {
      q: 'Can I cancel my order?',
      a: 'Orders cannot be cancelled once the kitchen begins preparing them. The order lifecycle moves quickly — as soon as you see the status change to Preparing, the food is already on the grill.',
    },
    {
      q: 'How do I collect my food?',
      a: 'Walk to the counter and show your 4-digit token number or tap the QR pass on your Orders screen. Counter staff verify it and hand over your food. You do not need to sign anything or enter a PIN.',
    },
    {
      q: 'Can I schedule a pickup for later?',
      a: 'Yes. At checkout, choose "Pick up later (Slot)" and select a 15-minute pickup window. Each slot has a cap on how many orders the kitchen accepts, so your food is ready when you arrive rather than sitting on the counter for 30 minutes.',
    },
    {
      q: 'What is the veg filter?',
      a: 'Tap "Pure Veg" on the home screen to hide all non-vegetarian dishes. Only items marked vegetarian by the canteen owner are shown. The filter is per-session and resets when you switch tabs.',
    },
    {
      q: 'Can I order from more than one canteen at a time?',
      a: 'Each cart holds items from one canteen at a time. If you want food from two different counters (e.g. Gazebo C1 and North Square), you place and pay for each as a separate order.',
    },
  ]

  return (
    <>
      <WaitlistModal isOpen={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-orange-500 selection:text-white antialiased">
        {/* ─── 0. STICKY NAVIGATION BAR ─────────────────────────── */}
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-6 sm:px-10 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="#" className="flex items-center gap-3 no-underline">
              <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/20">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight">V Foods</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                    CAMPUS DINING
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Order Ahead &amp; Skip the Line</p>
              </div>
            </a>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
              {navLinks.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  className="hover:text-orange-600 transition-colors no-underline"
                >
                  {l.label}
                </a>
              ))}
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWaitlistOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Join Pilot</span>
              </button>

              <button
                onClick={handleOpenApp}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                title="Download V Foods App on your device"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download App</span>
              </button>

              <button
                id="nav-open-app"
                onClick={handleOpenApp}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>Open V Foods</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(o => !o)}
                className="lg:hidden p-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Nav Drawer */}
          {mobileMenuOpen && (
            <div className="lg:hidden pt-3 pb-4 border-t border-slate-200 mt-3 flex flex-col gap-2">
              {navLinks.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-slate-600 hover:text-orange-600 py-1.5 no-underline"
                >
                  {l.label}
                </a>
              ))}
              <button
                onClick={() => { setMobileMenuOpen(false); setWaitlistOpen(true) }}
                className="text-left text-xs font-bold text-amber-700 py-1.5 cursor-pointer"
              >
                Join Pilot Waitlist
              </button>
            </div>
          )}
        </nav>

        {/* ─── 1. HERO SECTION WITH 3D CAMPUS CANVAS ───────────── */}
        <section className="py-16 sm:py-20 lg:py-24 px-6 sm:px-10 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left 6 Columns: Value Proposition */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200/80">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                <span>CAMPUS PRE-ORDERING &amp; WALLET PLATFORM</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.08]">
                Order ahead.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700">
                  Skip the canteen queue.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                V Foods is a digital dining network for university campuses. Load your wallet once, order from class, and pick up your meal in 2 minutes at the counter — zero cash, zero OTP wait.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  id="hero-open-app"
                  onClick={handleOpenApp}
                  className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-600/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Open V Foods App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setWaitlistOpen(true)}
                  className="px-5 py-3.5 rounded-2xl font-bold text-sm bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Join Campus Pilot</span>
                </button>

                <a
                  href="#how-it-works"
                  className="px-5 py-3.5 rounded-2xl font-semibold text-sm text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 transition-all no-underline shadow-xs"
                >
                  How it works
                </a>
              </div>

              {/* Live Campus Highlights Strip */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4">
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

            {/* Right 6 Columns: Interactive Three.js WebGL Campus Canvas */}
            <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-3 shadow-xl shadow-slate-200/60 relative">
              <CampusCanvas3D onSelectCanteen={handleOpenApp} />
            </div>
          </div>
        </section>

        <Divider />

        {/* ─── 1.5 INTERACTIVE 3D SYSTEM ARCHITECTURE: WHAT HAPPENS ON ORDER ─── */}
        <Section id="order-flow-3d" className="pt-10">
          <FadeIn>
            <OrderFlow3DVisualization />
          </FadeIn>
        </Section>

        <Divider />

        {/* ─── 2. THE PROBLEM SECTION ────────────────────────────── */}
        <Section id="problem">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">The College Rush Problem</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Lunch Break Lasts 45 Minutes.<br />The Line Takes 30.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Thousands of students release from lectures simultaneously, overwhelming campus kitchens and card readers.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Clock, title: 'Crushing Queues', desc: 'When class bells ring, 400 students pack Gazebo C1 and North Square simultaneously. Waiting 25 minutes cuts lunch in half.', color: 'text-orange-600 bg-orange-50 border-orange-100' },
              { icon: Zap, title: 'Payment Bottlenecks', desc: 'Basement canteens suffer weak 4G signal. Waiting for bank SMS OTPs or counting loose rupee notes stalls the entire queue.', color: 'text-amber-600 bg-amber-50 border-amber-100' },
              { icon: Package, title: 'Sold-Out Surprises', desc: 'After waiting 20 minutes in line, you reach the cashier only to learn the dish you wanted just ran out 2 minutes ago.', color: 'text-rose-600 bg-rose-50 border-rose-100' },
              { icon: ChefHat, title: 'Kitchen Slip Chaos', desc: 'Cooks juggle shouted token numbers and crumpled paper tickets. Orders get misread, duplicated, or handed to the wrong student.', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <FadeIn key={i} delay={i * 70}>
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-orange-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all h-full flex flex-col justify-between">
                    <div>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 border ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </Section>

        <Divider />

        {/* ─── 3. HOW IT WORKS ───────────────────────────────────── */}
        <Section id="how-it-works">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">How It Works</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Four Steps From Lecture Hall to Counter
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Order ahead, track cooking in real time, and pick up your hot food in seconds.
              </p>
            </div>
          </FadeIn>

          <div className="space-y-16">
            {/* Step 1 */}
            <FadeIn>
              <div className="grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <StepBadge n={1} />
                    <h3 className="text-xl font-bold text-slate-900">Load Your Campus Wallet</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Open the Wallet tab and top up using PhonePe — it accepts any UPI app (Google Pay, Paytm, BHIM) or bank card. UPI and RuPay transfers have <strong>zero extra transaction fees</strong>. Balance credits to your encrypted database ledger immediately.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>0% fee on UPI &amp; RuPay top-ups</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <PhoneFrame src="/assets/landing/user-wallet.webp" alt="V Foods wallet top-up screen showing ₹200 balance and transaction ledger" width={220} />
                </div>
              </div>
            </FadeIn>

            {/* Step 2 */}
            <FadeIn>
              <div className="grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-center order-2 md:order-1">
                  <PhoneFrame src="/assets/landing/user-menu-veg.webp" alt="V Foods home screen showing campus canteens with veg filter and add-to-cart" width={220} />
                </div>
                <div className="space-y-4 order-1 md:order-2">
                  <div className="flex items-center gap-3">
                    <StepBadge n={2} />
                    <h3 className="text-xl font-bold text-slate-900">Pick Your Food &amp; Pickup Window</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Browse active campus dining halls. Use the <strong>Pure Veg filter</strong> to hide non-veg dishes instantly. Every dish shows real-time portion stock. Select a 15-minute pickup window so your food is fresh and piping hot.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-orange-600" />
                    <span>Live stock deduction prevents ordering sold-out dishes</span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Step 3 */}
            <FadeIn>
              <div className="grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <StepBadge n={3} />
                    <h3 className="text-xl font-bold text-slate-900">Instant 1-Tap Checkout</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Tap "Pay from Wallet". Balance deducts in under 100 milliseconds — no bank redirect, no SMS OTP timeout, no loading spinner. A 4-digit pickup token is generated and the kitchen tablet sounds an incoming order alert immediately.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    <span>Works flawlessly even in weak basement cellular reception</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <PhoneFrame src="/assets/landing/user-cart.webp" alt="V Foods cart showing bill summary, wallet balance, and Pay from Wallet button" width={220} />
                </div>
              </div>
            </FadeIn>

            {/* Step 4 */}
            <FadeIn>
              <div className="grid md:grid-cols-2 gap-8 items-center bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-center order-2 md:order-1">
                  <PhoneFrame src="/assets/landing/user-order-tracking-ready.webp" alt="V Foods order tracking screen showing Ready status with QR pickup pass" width={220} />
                </div>
                <div className="space-y-4 order-1 md:order-2">
                  <div className="flex items-center gap-3">
                    <StepBadge n={4} />
                    <h3 className="text-xl font-bold text-slate-900">Collect With QR Pass or Token</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    When your phone updates to Ready, walk straight to the designated V Foods pickup bay. Show your 4-digit token or on-screen QR pass. Staff verify it on their tablet and hand over your meal.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Zero physical money handling at the food counter</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </Section>

        <Divider />

        {/* ─── 4. DATABASE & REALTIME DATA FLOW ─────────────────── */}
        <Section id="database">
          <FadeIn>
            <DatabaseSchemaArchitecture />
          </FadeIn>
        </Section>

        <Divider />

        {/* ─── 5. DUAL INTERACTIVE MOCKUPS (PHONE + TABLET) ──────── */}
        <Section id="interactive-demo">
          <FadeIn>
            <InteractiveMockups />
          </FadeIn>
        </Section>

        <Divider />

        {/* ─── 6. LIVE ORDER TRACKING STAGES ─────────────────────── */}
        <Section id="tracking">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">Real-Time WebSocket Sync</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Four Live Stages. Zero Guessing.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Your phone updates in real time over persistent WebSockets. You never need to pull to refresh.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { stage: 'Placed', screenshot: '/assets/landing/user-order-tracking-placed.webp', color: 'border-sky-300 bg-sky-50 text-sky-700', desc: 'Order confirmed and sounds alert on kitchen tablet screen immediately.' },
              { stage: 'Preparing', screenshot: '/assets/landing/user-order-tracking-preparing.webp', color: 'border-amber-300 bg-amber-50 text-amber-700', desc: 'Cook taps Accept and begins frying or assembling ingredients.' },
              { stage: 'Ready', screenshot: '/assets/landing/user-order-tracking-ready.webp', color: 'border-emerald-300 bg-emerald-50 text-emerald-700', desc: 'Food is packaged at Bay 2. Notification pings your phone to collect.' },
              { stage: 'Collected', screenshot: '/assets/landing/user-order-tracking-collected.webp', color: 'border-slate-300 bg-slate-100 text-slate-700', desc: 'Counter staff verify token or QR code. Order ledger archives.' },
            ].map((step, idx) => (
              <FadeIn key={step.stage} delay={idx * 80}>
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 text-center flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mb-4 ${step.color}`}>
                      {idx + 1}. {step.stage}
                    </span>
                    <div className="flex justify-center mb-4">
                      <PhoneFrame src={step.screenshot} alt={`Order tracking ${step.stage} stage`} width={160} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ─── 7. PAYMENT ARCHITECTURE SWITCHER ──────────────────── */}
        <Section id="wallet">
          <FadeIn>
            <PaymentArchitectureSwitcher />
          </FadeIn>
        </Section>

        <Divider />

        {/* ─── 8. FOUR CAMPUS DASHBOARD ROLES ───────────────────── */}
        <Section id="dashboards">
          <FadeIn>
            <DashboardRolesWalkthrough />
          </FadeIn>
        </Section>

        <Divider />

        {/* ─── 9. PRODUCTION TECH ARCHITECTURE ───────────────────── */}
        <Section id="architecture">
          <FadeIn>
            <TechArchitectureSection />
          </FadeIn>
        </Section>

        <Divider />

        {/* ─── 10. SAFE BY DESIGN ────────────────────────────────── */}
        <Section id="safety">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-2">Institutional Grade</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Safe by Design. Verified on Server.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                All pricing, stock quotas, and wallet debits are calculated server-side in PostgreSQL.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Shield, title: 'Server-Side Pricing', desc: 'Cart totals compute from database records, not client payloads. Tampering with network requests has zero effect.' },
              { icon: Lock, title: 'Row Level Security', desc: 'PostgreSQL RLS ensures staff only query their assigned canteen. No cross-outlet data leaks are possible.' },
              { icon: QrCode, title: 'Signed QR Handover', desc: 'Pickup QR passes are cryptographically verified before marking an order Collected. Screenshots cannot duplicate meals.' },
              { icon: Wallet, title: 'Bank-Signed Webhooks', desc: 'Wallet credits require an HMAC SHA-256 signature from Paytm. Phone browser redirects are never trusted for money.' },
            ].map((s, idx) => {
              const Icon = s.icon
              return (
                <FadeIn key={s.title} delay={idx * 70}>
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all h-full flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2">{s.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </Section>

        <Divider />

        {/* ─── 11. PILOT ROADMAP & HARDWARE SPECS ────────────────── */}
        <Section id="roadmap">
          <FadeIn>
            <PilotRoadmapSection />
          </FadeIn>
        </Section>

        <Divider />

        {/* ─── 12. FAQ ACCORDION ─────────────────────────────────── */}
        <Section id="faq">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider block mb-2">Got Questions?</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Everything you need to know about campus dining with V Foods.
              </p>
            </div>
          </FadeIn>

          <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
            {faqs.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </Section>

        <Divider />

        {/* ─── 13. CLOSING CALL TO ACTION ────────────────────────── */}
        <section className="py-20 lg:py-24 px-6 sm:px-10 text-center max-w-5xl mx-auto">
          <FadeIn>
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden border border-slate-800">
              <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">Ready for Lunch?</span>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                  Order From Class.<br />Collect in Seconds.
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Join hundreds of students and faculty skipping the queues every single day across university dining halls.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                  <button
                    id="cta-open-app"
                    onClick={handleOpenApp}
                    className="px-8 py-4 rounded-2xl font-bold text-sm bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Open V Foods App</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setWaitlistOpen(true)}
                    className="px-6 py-4 rounded-2xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Join Campus Pilot</span>
                  </button>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ─── FOOTER ────────────────────────────────────────────── */}
        <footer className="border-t border-slate-200 py-12 px-6 sm:px-10 bg-white text-xs text-slate-600">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-sm">V Foods</span>
                <p className="text-[11px] text-slate-500">Campus Pre-Ordering &amp; Smart Dining Network</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-slate-600">
              <a href="#order-flow-3d" className="hover:text-slate-900 transition-colors no-underline">3D Order Flow</a>
              <a href="#how-it-works" className="hover:text-slate-900 transition-colors no-underline">How it works</a>
              <a href="#database" className="hover:text-slate-900 transition-colors no-underline">Database &amp; Schemas</a>
              <a href="#interactive-demo" className="hover:text-slate-900 transition-colors no-underline">Live Demo</a>
              <a href="#tracking" className="hover:text-slate-900 transition-colors no-underline">Live Tracking</a>
              <a href="#wallet" className="hover:text-slate-900 transition-colors no-underline">Payments</a>
              <a href="#dashboards" className="hover:text-slate-900 transition-colors no-underline">Dashboard Roles</a>
              <a href="#architecture" className="hover:text-slate-900 transition-colors no-underline">Tech Stack</a>
              <a href="#faq" className="hover:text-slate-900 transition-colors no-underline">FAQ</a>
              <button onClick={() => setWaitlistOpen(true)} className="text-orange-600 font-bold hover:underline cursor-pointer">
                Join Pilot →
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-100 text-center text-slate-400 text-[11px]">
            © {new Date().getFullYear()} V Foods. Built for University Canteens, Riviera, &amp; Gravitas Campus Dining.
          </div>
        </footer>
      </div>
    </>
  )
}

export default WelcomePage
