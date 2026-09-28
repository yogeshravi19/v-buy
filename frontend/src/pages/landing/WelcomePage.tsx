import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowRight,
  Wallet,
  ShoppingBag,
  QrCode,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Shield,
  Users,
  Store,
  BarChart2,
  Smartphone,
  Zap,
  Bell,
  Lock,
  Package,
  ChefHat,
  User,
  Settings,
  TrendingUp,
  Menu,
  X,
  Leaf,
  AlertCircle,
  MapPin,
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
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
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ─── Phone Frame ─────────────────────────────────────────────────────────────

function PhoneFrame({ src, alt, width = 240 }: { src: string; alt: string; width?: number }) {
  return (
    <div
      style={{
        width,
        flexShrink: 0,
        background: '#0f172a',
        borderRadius: 36,
        border: '2px solid rgba(71,85,105,0.6)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Notch bar */}
      <div style={{ background: '#0f172a', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 80, height: 8, background: '#1e293b', borderRadius: 4 }} />
      </div>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        width={width}
        height={Math.round(width * 1.82)}
        style={{ width: '100%', display: 'block' }}
      />
    </div>
  )
}

// ─── Step Badge ───────────────────────────────────────────────────────────────

function StepBadge({ n }: { n: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 32, height: 32, borderRadius: '50%',
      background: '#1d4ed8', color: '#fff',
      fontWeight: 800, fontSize: 14, flexShrink: 0,
    }}>{n}</span>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, children, style }: { id?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section id={id} style={{ padding: '80px 0', ...style }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        {children}
      </div>
    </section>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ borderTop: '1px solid rgba(71,85,105,0.3)', maxWidth: 960, margin: '0 auto' }} />
}

// ─── Primary button ───────────────────────────────────────────────────────────

function PrimaryBtn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#1d4ed8', color: '#fff', fontWeight: 700,
        fontSize: 15, padding: '12px 24px', borderRadius: 10,
        textDecoration: 'none', transition: 'background 0.2s, transform 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#1e40af'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#1d4ed8'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}
    >
      {children}
    </a>
  )
}

// ─── FAQ item ────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        borderBottom: '1px solid rgba(71,85,105,0.3)',
        paddingBottom: open ? 16 : 0,
        marginBottom: 0,
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '20px 0', background: 'none', border: 'none',
          color: '#f1f5f9', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          textAlign: 'left', gap: 16,
        }}
        aria-expanded={open}
      >
        <span>{q}</span>
        {open ? <ChevronUp size={18} style={{ flexShrink: 0, color: '#64748b' }} /> : <ChevronDown size={18} style={{ flexShrink: 0, color: '#64748b' }} />}
      </button>
      {open && (
        <p style={{ margin: 0, marginBottom: 16, color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>{a}</p>
      )}
    </div>
  )
}

// ─── Role card ───────────────────────────────────────────────────────────────

function RoleCard({
  label, icon, screenshot, screenshotAlt, lines, tag,
}: {
  label: string; icon: React.ReactNode; screenshot: string; screenshotAlt: string; lines: string[]; tag?: string
}) {
  return (
    <FadeIn>
      <div style={{
        background: '#0f172a', border: '1px solid rgba(71,85,105,0.4)',
        borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ color: '#38bdf8' }}>{icon}</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>{label}</span>
            {tag && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px',
                background: '#10b981', color: '#fff', borderRadius: 6,
              }}>{tag}</span>
            )}
          </div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map((l, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                <CheckCircle2 size={14} style={{ color: '#10b981', marginTop: 2, flexShrink: 0 }} />
                {l}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
          <PhoneFrame src={screenshot} alt={screenshotAlt} width={200} />
        </div>
      </div>
    </FadeIn>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function WelcomePage({ onOpenApp }: { onOpenApp?: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '#how-it-works', label: 'How it works' },
    { href: '#wallet', label: 'Wallet' },
    { href: '#tracking', label: 'Tracking' },
    { href: '#roles', label: 'Roles' },
    { href: '#canteen-owners', label: 'For canteen owners' },
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
      a: 'Top-ups via UPI or RuPay have no extra fee — you pay exactly the amount you chose and receive that amount in your wallet. Credit and debit cards carry a standard bank processing fee; the app applies a reverse formula so your wallet still receives the clean amount you selected.',
    },
    {
      q: 'What happens if an item runs out after I order?',
      a: 'Stock is checked and reserved the moment you place an order. If the kitchen runs out before you order, the item is automatically shown as sold out so you cannot order it. Once an item is marked sold out by staff, it disappears from the menu on all phones immediately.',
    },
    {
      q: 'Can I cancel my order?',
      a: 'Orders cannot be cancelled once the kitchen begins preparing them. The order lifecycle moves quickly — as soon as you see the status change to Preparing, the food is already cooking.',
    },
    {
      q: 'How do I collect my food?',
      a: 'Walk to the counter and show your 4-digit token number or tap the QR pass on your Orders screen. The counter staff verify it and hand over your food. You do not need to sign anything or enter a PIN.',
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
      a: 'Each cart holds items from one canteen at a time. If you want food from two different counters, you place and pay for each as a separate order.',
    },
  ]

  return (
    <>
      {/* ─── SEO meta (injected via Helmet equivalent or directly) ─── */}
      {/* Page title and description are set in index.html for the /welcome route */}

      <div style={{
        minHeight: '100dvh',
        background: '#020617',
        color: '#f1f5f9',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflowX: 'hidden',
      }}>

        {/* ─── 0. STICKY TOP BAR ─────────────────────────────────── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(2,6,23,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(71,85,105,0.3)',
          padding: '0 24px',
        }}>
          <div style={{
            maxWidth: 960, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: 56,
          }}>
            <a href="#" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32,
                background: '#1d4ed8',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ChefHat size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#f1f5f9', letterSpacing: '-0.01em' }}>V Foods</span>
            </a>

            {/* Desktop nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hidden-mobile">
              {navLinks.map(l => (
                <a key={l.href} href={l.href} style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
                  onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = '#f1f5f9')}
                  onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = '#94a3b8')}
                >{l.label}</a>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                id="nav-open-app"
                onClick={handleOpenApp}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#1d4ed8', color: '#fff', fontWeight: 700,
                  fontSize: 13, padding: '8px 16px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#1e40af')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8')}
              >
                Open V Foods
                <ArrowRight size={14} />
              </button>
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(o => !o)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, display: 'none' }}
                className="show-mobile"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile nav menu */}
          {mobileMenuOpen && (
            <div className="show-mobile" style={{
              borderTop: '1px solid rgba(71,85,105,0.3)',
              padding: '12px 0 16px',
              flexDirection: 'column', gap: 4,
            }}>
              {navLinks.map(l => (
                <a key={l.href} href={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500, textDecoration: 'none', padding: '10px 0' }}
                >{l.label}</a>
              ))}
            </div>
          )}
        </nav>

        {/* ─── 1. HERO ───────────────────────────────────────────── */}
        <section style={{ padding: '72px 24px 64px', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px' }}>
              <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Campus Food Pre-Ordering
              </p>
              <h1 style={{
                margin: '0 0 20px', fontSize: 'clamp(28px, 5vw, 46px)',
                fontWeight: 800, lineHeight: 1.12, color: '#f1f5f9', letterSpacing: '-0.02em',
              }}>
                Order ahead.<br />Skip the canteen queue.
              </h1>
              <p style={{ margin: '0 0 32px', fontSize: 16, color: '#94a3b8', lineHeight: 1.65, maxWidth: 420 }}>
                V Foods is a pre-order and digital wallet system for college campuses. Add money once, order from class, and collect your hot food in seconds — no waiting, no cash.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  id="hero-open-app"
                  onClick={handleOpenApp}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: '#1d4ed8', color: '#fff', fontWeight: 700,
                    fontSize: 15, padding: '14px 28px', borderRadius: 10,
                    border: 'none', cursor: 'pointer', transition: 'background 0.2s, transform 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1e40af'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
                >
                  Open V Foods
                  <ArrowRight size={16} />
                </button>
                <a href="#how-it-works" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  color: '#94a3b8', fontWeight: 600, fontSize: 15,
                  padding: '14px 24px', borderRadius: 10,
                  border: '1px solid rgba(71,85,105,0.5)',
                  textDecoration: 'none', transition: 'border-color 0.2s',
                }}>
                  How it works
                </a>
              </div>
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
              <PhoneFrame src="/assets/landing/user-menu-veg.webp" alt="V Foods user home screen showing campus canteen menu with veg filter active" width={220} />
            </div>
          </div>
        </section>

        <Divider />

        {/* ─── 2. THE PROBLEM ────────────────────────────────────── */}
        <Section id="problem">
          <FadeIn>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>The problem</p>
            <h2 style={{ margin: '0 0 40px', fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              The college lunch rush is broken.
            </h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { icon: <Clock size={18} />, heading: 'Crushing queues', body: 'Thousands of people reach canteen counters at the same minute when class bells ring. Lines stretch 20–30 minutes on busy days.' },
              { icon: <AlertCircle size={18} />, heading: 'Payment bottlenecks', body: 'Mobile internet inside basement canteens is weak. Waiting for banking OTPs or counting cash at the counter holds up everyone behind you.' },
              { icon: <Package size={18} />, heading: 'Sold-out surprises', body: 'You wait 25 minutes only to reach the counter and be told the dish you wanted just ran out. No one knew beforehand.' },
              { icon: <Bell size={18} />, heading: 'Kitchen chaos', body: 'Cooks rely on shouted names and paper slips during peak rush. Orders get misread, lost, or duplicated.' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{
                  background: '#0f172a', border: '1px solid rgba(71,85,105,0.35)',
                  borderRadius: 12, padding: '20px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ color: '#f59e0b' }}>{item.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{item.heading}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{item.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ─── 3. HOW IT WORKS ───────────────────────────────────── */}
        <Section id="how-it-works">
          <FadeIn>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>How it works</p>
            <h2 style={{ margin: '0 0 8px', fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Four steps from class to counter.
            </h2>
            <p style={{ margin: '0 0 48px', fontSize: 15, color: '#94a3b8' }}>No waiting in line, no payment delay, no guessing if your food is ready.</p>
          </FadeIn>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
            {/* Step 1 */}
            <FadeIn>
              <div style={{ display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <StepBadge n={1} />
                    <span style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>Load your wallet</span>
                  </div>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 14, lineHeight: 1.7, maxWidth: 380 }}>
                    Open the Wallet tab and top up using PhonePe — it accepts any UPI app, BHIM, or bank card. UPI and RuPay top-ups carry zero extra fee. Once the payment clears, the balance is credited to your campus wallet instantly and is ready to use for every order.
                  </p>
                </div>
                <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
                  <PhoneFrame src="/assets/landing/user-wallet.webp" alt="V Foods wallet top-up screen showing ₹200 balance and transaction ledger" width={210} />
                </div>
              </div>
            </FadeIn>

            {/* Step 2 */}
            <FadeIn>
              <div style={{ display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap-reverse' }}>
                <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
                  <PhoneFrame src="/assets/landing/user-menu-veg.webp" alt="V Foods home screen showing campus canteens with veg filter and add-to-cart" width={210} />
                </div>
                <div style={{ flex: '1 1 260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <StepBadge n={2} />
                    <span style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>Pick your food</span>
                  </div>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 14, lineHeight: 1.7, maxWidth: 380 }}>
                    Browse open canteens, filter by veg or non-veg, and tap to add items to your cart. Every dish shows live stock — if a dish shows as available, the kitchen can make it. You can also choose a scheduled 15-minute pickup slot so the kitchen prepares your food before you arrive.
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* Step 3 */}
            <FadeIn>
              <div style={{ display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <StepBadge n={3} />
                    <span style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>Place the order</span>
                  </div>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 14, lineHeight: 1.7, maxWidth: 380 }}>
                    Tap "Pay from Wallet". The balance is deducted in under a second — no bank redirect, no OTP, no loading spinner. A 4-digit pickup token and a QR pass are generated on the spot. The kitchen sees the order appear on their screen immediately and starts cooking.
                  </p>
                </div>
                <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
                  <PhoneFrame src="/assets/landing/user-cart.webp" alt="V Foods cart showing bill summary, wallet balance, and Pay from Wallet button" width={210} />
                </div>
              </div>
            </FadeIn>

            {/* Step 4 */}
            <FadeIn>
              <div style={{ display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap-reverse' }}>
                <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
                  <PhoneFrame src="/assets/landing/user-order-tracking-ready.webp" alt="V Foods order tracking screen showing Ready status with QR pickup pass" width={210} />
                </div>
                <div style={{ flex: '1 1 260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <StepBadge n={4} />
                    <span style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9' }}>Collect with your token</span>
                  </div>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 14, lineHeight: 1.7, maxWidth: 380 }}>
                    When the status updates to Ready, walk to the counter and show your 4-digit token or the on-screen QR pass. The staff scan or verify it, then hand over your food. No cash, no queue, no waiting.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </Section>

        <Divider />

        {/* ─── 4. WALLET & PAYMENTS ──────────────────────────────── */}
        <Section id="wallet">
          <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px' }}>
              <FadeIn>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wallet and payments</p>
                <h2 style={{ margin: '0 0 20px', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Checkout takes less than a second.
                </h2>
                <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
                  The key design choice: money goes into the wallet before lunch, not during it. When you order food, the balance is deducted from the database directly — no payment gateway opens, no bank network is involved at that moment.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { icon: <Wallet size={16} />, title: 'Top-up via PhonePe', body: 'Supports any UPI app (PhonePe, Google Pay, BHIM), RuPay, and bank cards. PhonePe is used only for wallet top-ups, never at checkout.' },
                    { icon: <Zap size={16} />, title: 'UPI and RuPay — no extra fee', body: 'If you add ₹200 via UPI, you pay ₹200 and receive ₹200. Card top-ups use a reverse formula so your wallet still receives the clean amount.' },
                    { icon: <Lock size={16} />, title: 'Verified by server signature', body: 'PhonePe signs every payment confirmation with a cryptographic stamp. Our server verifies it before crediting your wallet. Your phone browser is never trusted to confirm a payment.' },
                    { icon: <Shield size={16} />, title: 'Double-credit protected', body: 'Each transaction ID is locked. If the confirmation arrives twice by mistake, the database detects the duplicate and ignores it.' },
                  ].map((item, i) => (
                    <FadeIn key={i} delay={i * 60}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{
                          background: '#10b981', borderRadius: 8,
                          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <span style={{ color: '#fff' }}>{item.icon}</span>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{item.title}</p>
                          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{item.body}</p>
                        </div>
                      </div>
                    </FadeIn>
                  ))}
                </div>
                <div style={{ marginTop: 28, padding: '16px 20px', background: '#0f172a', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 12 }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>Why checkout is instant</p>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', color: '#64748b', paddingBottom: 8, fontWeight: 600 }}>Other food apps</th>
                        <th style={{ textAlign: 'left', color: '#64748b', paddingBottom: 8, fontWeight: 600 }}>V Foods</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Gateway opens during lunch', 'Gateway used before lunch'],
                        ['30–60s bank delay per order', 'Under 1s database deduction'],
                        ['Needs strong signal at counter', 'Zero internet at checkout'],
                      ].map(([a, b], i) => (
                        <tr key={i}>
                          <td style={{ color: '#94a3b8', padding: '4px 0', borderTop: '1px solid rgba(71,85,105,0.2)', paddingTop: 8 }}>{a}</td>
                          <td style={{ color: '#10b981', padding: '4px 0', borderTop: '1px solid rgba(71,85,105,0.2)', paddingTop: 8 }}>{b}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FadeIn>
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
              <FadeIn>
                <PhoneFrame src="/assets/landing/user-wallet.webp" alt="V Foods wallet screen showing balance, top-up presets and transaction ledger" width={220} />
              </FadeIn>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ─── 5. LIVE ORDER TRACKING ────────────────────────────── */}
        <Section id="tracking">
          <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap-reverse' }}>
            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <FadeIn>
                <PhoneFrame src="/assets/landing/user-order-tracking-placed.webp" alt="Order tracker at Placed stage" width={200} />
              </FadeIn>
              <FadeIn delay={100}>
                <PhoneFrame src="/assets/landing/user-order-tracking-ready.webp" alt="Order tracker at Ready stage" width={200} />
              </FadeIn>
            </div>
            <div style={{ flex: '1 1 260px' }}>
              <FadeIn>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live order tracking</p>
                <h2 style={{ margin: '0 0 20px', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Four stages, zero guessing.
                </h2>
                <p style={{ margin: '0 0 28px', color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
                  Every order moves through four stages. Your phone updates in real time over WebSocket — you do not need to refresh.
                </p>
              </FadeIn>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                {[
                  { stage: 'Placed', color: '#3b82f6', desc: 'Your order is confirmed and the kitchen screen shows it immediately with a sound alert.' },
                  { stage: 'Preparing', color: '#f59e0b', desc: 'The cook has accepted the order and started preparing. The kitchen has the item count and your cooking notes.' },
                  { stage: 'Ready', color: '#10b981', desc: 'Your food is packaged and waiting at the pickup counter. You get notified to come collect.' },
                  { stage: 'Collected', color: '#64748b', desc: 'Staff verify your token or QR code and hand over the food. The order closes.' },
                ].map((item, i) => (
                  <FadeIn key={i} delay={i * 80}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', paddingBottom: i < 3 ? 20 : 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: item.color, flexShrink: 0, marginTop: 3,
                        }} />
                        {i < 3 && <div style={{ width: 2, flex: 1, minHeight: 28, background: 'rgba(71,85,105,0.4)', marginTop: 6 }} />}
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: item.color }}>{item.stage}</p>
                        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{item.desc}</p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
              <FadeIn delay={320}>
                <div style={{ marginTop: 24, padding: '14px 16px', background: '#0f172a', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Smartphone size={16} style={{ color: '#a78bfa', marginTop: 2, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                      The kitchen display (KDS) uses the same live WebSocket connection. When a cook taps Accept or Mark Ready, both the kitchen screen and the user's phone update in the same instant.
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ─── 6. SCHEDULED PICKUP & STOCK ───────────────────────── */}
        <Section id="scheduled">
          <FadeIn>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scheduled pickup and stock</p>
            <h2 style={{ margin: '0 0 20px', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              The menu only shows what the kitchen can actually make.
            </h2>
          </FadeIn>
          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <FadeIn>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ padding: '18px 20px', background: '#0f172a', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <Clock size={16} style={{ color: '#f59e0b' }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>Scheduled pickup slots</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.65 }}>
                      At checkout you can choose "As soon as ready" or pick a 15-minute slot, such as 1:00 PM–1:15 PM. Each slot has a hard cap on how many orders the kitchen accepts in that window, so you are never stuck waiting for food meant for the previous wave.
                    </p>
                  </div>
                  <div style={{ padding: '18px 20px', background: '#0f172a', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <Package size={16} style={{ color: '#10b981' }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>Automatic stock deduction</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.65 }}>
                      The database subtracts stock automatically as orders are placed. When a dish reaches zero portions, it immediately switches to Sold Out on every user's screen — no one else can order it.
                    </p>
                  </div>
                  <div style={{ padding: '18px 20px', background: '#0f172a', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <AlertCircle size={16} style={{ color: '#f43f5e' }} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>Staff can mark items unavailable</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.65 }}>
                      If an ingredient runs out unexpectedly, kitchen staff tap the Mark Unavailable button on any dish. The item disappears from the menu instantly — no user can order it from that point on.
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <FadeIn>
                <PhoneFrame src="/assets/landing/user-scheduled-slot.webp" alt="V Foods cart showing scheduled 15-minute pickup slot selector" width={200} />
              </FadeIn>
              <FadeIn delay={100}>
                <PhoneFrame src="/assets/landing/staff-stock-toggle.webp" alt="Staff stock management showing portion counts and Mark Unavailable button" width={200} />
              </FadeIn>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ─── 7. FOUR ROLES ─────────────────────────────────────── */}
        <Section id="roles">
          <FadeIn>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Four roles, four screens</p>
            <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Every person on campus has the right view.
            </h2>
            <p style={{ margin: '0 0 12px', color: '#94a3b8', fontSize: 14, lineHeight: 1.7, maxWidth: 560 }}>
              Super Admin creates Shop Admins. Shop Admins invite Shop Staff. Each role can only see and do what it is supposed to — the database enforces this at the data level, not just in the app.
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              marginBottom: 40, fontSize: 13, color: '#64748b', fontWeight: 500,
            }}>
              <span style={{ padding: '4px 12px', background: '#1e293b', borderRadius: 6, color: '#f1f5f9' }}>Super Admin</span>
              <ArrowRight size={14} />
              <span style={{ padding: '4px 12px', background: '#1e293b', borderRadius: 6, color: '#f1f5f9' }}>Shop Admin</span>
              <ArrowRight size={14} />
              <span style={{ padding: '4px 12px', background: '#1e293b', borderRadius: 6, color: '#f1f5f9' }}>Shop Staff</span>
              <span style={{ color: '#475569', marginLeft: 4 }}>and</span>
              <span style={{ padding: '4px 12px', background: '#1e293b', borderRadius: 6, color: '#f1f5f9' }}>User</span>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <RoleCard
              label="User"
              icon={<User size={18} />}
              screenshot="/assets/landing/user-order-tracking-placed.webp"
              screenshotAlt="User order tracking screen"
              lines={[
                'Browses campus canteen menus, filters by veg, adds items to cart',
                'Tops up wallet via PhonePe and pays for orders with one tap',
                'Tracks order through four live stages and collects with token or QR',
                'Cannot view any other user\'s wallet, orders, or personal data',
              ]}
            />
            <RoleCard
              label="Shop Staff"
              icon={<ChefHat size={18} />}
              screenshot="/assets/landing/staff-live-queue.webp"
              screenshotAlt="Shop Staff kitchen display system showing live order queue"
              lines={[
                'Sees a live order queue for their assigned canteen only',
                'Advances orders: Accept and Cook, Mark Ready, Hand Over',
                'Adjusts portion counts and marks items unavailable when stock runs out',
                'Cannot see orders from other canteens or user wallet balances',
              ]}
            />
            <RoleCard
              label="Shop Admin"
              icon={<Store size={18} />}
              screenshot="/assets/landing/shop-admin-analytics.webp"
              screenshotAlt="Shop Admin outlet dashboard showing today revenue and orders"
              lines={[
                'Manages the full menu for their own canteen: add, edit, price, delete items',
                'Invites Shop Staff to their counter and controls the team list',
                'Views daily and session-level sales and order counts for their outlet only',
                'Cannot access another canteen\'s menu, orders, or earnings',
              ]}
            />
            <RoleCard
              label="Super Admin"
              icon={<TrendingUp size={18} />}
              screenshot="/assets/landing/super-admin-overview.webp"
              screenshotAlt="Super Admin campus overview showing all outlets, total revenue, and order counts"
              tag="Platform"
              lines={[
                'Sees a live overview across all 13 campus canteens and stalls',
                'Creates Shop Admins via invite link and manages the canteen network',
                'Monitors campus-wide order counts, revenue, and audit logs',
                'Toggles campus event mode to bring festival stalls online',
              ]}
            />
          </div>
        </Section>

        <Divider />

        {/* ─── 8. SAFE BY DESIGN ─────────────────────────────────── */}
        <Section id="safety">
          <FadeIn>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Safe by design</p>
            <h2 style={{ margin: '0 0 20px', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              The database does the checking, not the app.
            </h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              {
                icon: <Shield size={18} />,
                title: 'Prices are calculated server-side',
                body: 'The order total is calculated from the database\'s own record of item prices, not from whatever number the app sends. Manipulating the network request to claim a lower price has no effect.',
              },
              {
                icon: <Lock size={18} />,
                title: 'Each canteen sees only its own data',
                body: 'Row-level security in the database filters every query by outlet ID. A Gazebo staff member\'s screen cannot accidentally show a North Square order, even if the app code had a bug.',
              },
              {
                icon: <QrCode size={18} />,
                title: 'Pickup codes are verified on the server',
                body: 'The QR pass is verified by the backend before the order is marked Collected. Showing a screenshot of someone else\'s QR code will not close their order.',
              },
              {
                icon: <Wallet size={18} />,
                title: 'Payments are verified before wallet credit',
                body: 'Only a signed server-to-server webhook from PhonePe can add money to a wallet. The user\'s phone browser is never trusted to confirm a payment — only PhonePe\'s bank-level confirmation counts.',
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 70}>
                <div style={{
                  background: '#0f172a', border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 12, padding: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ color: '#10b981' }}>{item.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{item.title}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{item.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section>

        <Divider />

        {/* ─── 9. FOR CANTEEN OWNERS ─────────────────────────────── */}
        <Section id="canteen-owners">
          <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px' }}>
              <FadeIn>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>For canteen owners</p>
                <h2 style={{ margin: '0 0 20px', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Run your counter without paper, shouting, or cash errors.
                </h2>
                <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
                  Your canteen gets a dedicated digital kitchen screen, a menu manager, and a live sales view — all from the same login your staff already use.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { icon: <Smartphone size={15} />, label: 'Live order queue on any tablet or phone — no dedicated hardware needed' },
                    { icon: <Package size={15} />, label: 'One-tap stock control: adjust portion counts or mark an item sold out immediately' },
                    { icon: <BarChart2 size={15} />, label: 'Daily revenue, orders processed, and average order value — updated in real time' },
                    { icon: <Users size={15} />, label: 'Invite and manage your kitchen team directly from the admin portal' },
                    { icon: <MapPin size={15} />, label: 'Set your canteen open or closed at any time from the dashboard' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ color: '#38bdf8', marginTop: 2, flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 32 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>Interested in joining the V Foods canteen network?</p>
                  <a
                    href="mailto:vfoods@vit.ac.in"
                    id="contact-canteen-owners"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: '#0f172a', color: '#f1f5f9', fontWeight: 700,
                      fontSize: 14, padding: '12px 20px', borderRadius: 10,
                      border: '1px solid rgba(56,189,248,0.4)',
                      textDecoration: 'none', transition: 'border-color 0.2s',
                    }}
                  >
                    Contact the V Foods team
                    <ArrowRight size={15} />
                  </a>
                </div>
              </FadeIn>
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <FadeIn>
                <PhoneFrame src="/assets/landing/staff-live-queue.webp" alt="Staff kitchen display system" width={200} />
              </FadeIn>
              <FadeIn delay={100}>
                <PhoneFrame src="/assets/landing/shop-admin-analytics.webp" alt="Shop Admin analytics overview" width={200} />
              </FadeIn>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ─── 10. FAQ ───────────────────────────────────────────── */}
        <Section id="faq">
          <FadeIn>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>FAQ</p>
            <h2 style={{ margin: '0 0 40px', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Common questions
            </h2>
          </FadeIn>
          <div style={{ maxWidth: 680 }}>
            {faqs.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </Section>

        <Divider />

        {/* ─── 11. CLOSING CTA ───────────────────────────────────── */}
        <section style={{ padding: '80px 24px', textAlign: 'left' }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <FadeIn>
              <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.2, maxWidth: 560 }}>
                Order from class.<br />Collect in seconds.
              </h2>
              <p style={{ margin: '0 0 32px', fontSize: 15, color: '#94a3b8', maxWidth: 400 }}>
                V Foods is built for VIT Chennai campus. Open the app, add money, and start ordering from any canteen on campus.
              </p>
              <button
                id="cta-open-app"
                onClick={handleOpenApp}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#1d4ed8', color: '#fff', fontWeight: 700,
                  fontSize: 16, padding: '16px 32px', borderRadius: 12,
                  border: 'none', cursor: 'pointer', transition: 'background 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1e40af'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
              >
                Open V Foods
                <ArrowRight size={18} />
              </button>
            </FadeIn>
          </div>
        </section>

        {/* ─── FOOTER ────────────────────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid rgba(71,85,105,0.3)',
          padding: '32px 24px',
          background: '#020617',
        }}>
          <div style={{
            maxWidth: 960, margin: '0 auto',
            display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, background: '#1d4ed8', borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ChefHat size={15} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>V Foods</span>
              <span style={{ color: '#475569', fontSize: 13 }}>— Campus Smart Dining</span>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <a href="#how-it-works" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>How it works</a>
              <a href="#wallet" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>Wallet</a>
              <a href="#roles" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>Roles</a>
              <a href="#faq" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>FAQ</a>
              <a href="mailto:vfoods@vit.ac.in" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>Contact</a>
            </div>
          </div>
        </footer>

      </div>

      {/* ─── Responsive helpers ─────────────────────────────────── */}
      <style>{`
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 641px) {
          .show-mobile { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </>
  )
}
