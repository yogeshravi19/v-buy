import React, { useState } from 'react'
import {
  Code2, Database, Shield, Zap, Server, Clock,
  CheckCircle2, ArrowRight, Layers, Bell, Smartphone
} from 'lucide-react'

export const TechArchitectureSection: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<number>(0)

  const layers = [
    {
      id: 'frontend',
      title: 'Frontend PWA & Web App',
      badge: 'React 19 • TypeScript • Vite • Tailwind',
      icon: Code2,
      summary: 'Responsive, lightning-fast progressive web app with seamless mobile navigation and instant interactions.',
      points: [
        'Vite build engine for instantaneous page loads and hot updates',
        'Lucide UI icons with accessible semantic markup',
        'Pure vegetarian filter and live item search with zero lag',
        'Works seamlessly across user smartphones, laptops, and canteen tablets',
      ],
      color: 'border-orange-500/60 text-orange-600 bg-orange-50',
    },
    {
      id: 'backend',
      title: 'FastAPI Backend Gateway',
      badge: 'Python 3.11 • Async ASGI • JWT',
      icon: Server,
      summary: 'High-performance asynchronous Python API processing orders, PhonePe webhooks, and cryptographic QR signatures.',
      points: [
        'FastAPI & Uvicorn ASGI server with non-blocking async endpoint handlers',
        'Supabase JWT authentication & cryptographic QR pass verification (HMAC-SHA256)',
        'PhonePe payment gateway webhook handler with SHA256 X-VERIFY checksum',
        'APScheduler background tasks expiring pending uncollected orders automatically',
      ],
      color: 'border-blue-500/60 text-blue-600 bg-blue-50',
    },
    {
      id: 'database',
      title: 'Supabase PostgreSQL Relational DB',
      badge: 'PostgreSQL 15 • Strict RLS',
      icon: Database,
      summary: 'Institutional-grade relational database with strict Row Level Security (RLS) separating roles and outlets.',
      points: [
        'Relational schema across orders, order_items, outlets, menu_items, profiles, and wallets',
        'Row Level Security policies prevent unauthorized cross-outlet and cross-user data leaks',
        'Foreign key constraints maintain immutable referential integrity',
        'Server-side price computation eliminates client-side tampering',
      ],
      color: 'border-emerald-500/60 text-emerald-600 bg-emerald-50',
    },
    {
      id: 'realtime',
      title: 'Realtime WebSocket Channels',
      badge: 'Postgres Change CDC • Sub-150ms',
      icon: Zap,
      summary: 'Sub-second event streaming broadcasting order updates from user checkouts directly to kitchen screens.',
      points: [
        'Native Supabase Realtime subscriptions listen to public.orders table inserts and updates',
        'Kitchen display receives new orders instantly without polling or manual page refreshing',
        'Web Audio API triggers an immediate sound chime when a new ticket arrives in kitchen',
        'User order status updates synchronously when staff advance the preparation state',
      ],
      color: 'border-amber-500/60 text-amber-600 bg-amber-50',
    },
    {
      id: 'slots',
      title: '15-Minute Scheduled Pickup Slots',
      badge: 'Rush Mitigation • Outlets Config',
      icon: Clock,
      summary: 'Structured time-slotted ordering that flattens 1:00 PM lunch rushes into manageable batches.',
      points: [
        'Users reserve a convenient 15-minute pickup window during checkout',
        'Configurable outlet capacity caps prevent kitchen overloading',
        'Orders display clear target pickup slots on staff display tickets',
        'Reduces physical crowding in front of campus canteen counters',
      ],
      color: 'border-sky-500/60 text-sky-600 bg-sky-50',
    },
    {
      id: 'wallet',
      title: 'In-App Wallet & PhonePe UPI',
      badge: 'Zero-Latency • HMAC Signatures',
      icon: Shield,
      summary: 'Instantaneous 1-tap balance checkout eliminating bank timeouts during crowded break hours.',
      points: [
        'Users pre-top up via PhonePe UPI; balance is immediately credited',
        'Order checkout debits balance in <100ms with zero payment gateway latency',
        'Double-entry transaction ledger logs all credit and debit activities with timestamps',
        'HMAC SHA-256 signature verification guarantees bank-grade top-up security',
      ],
      color: 'border-purple-500/60 text-purple-600 bg-purple-50',
    },
    {
      id: 'rbac',
      title: 'Four-Tier Role Permissions',
      badge: 'User • Staff • Shop Admin • Super Admin',
      icon: Server,
      summary: 'Comprehensive access control isolating campus users, kitchen operators, canteen managers, and platform directors.',
      points: [
        'Staff invite tokens allow canteen owners to onboard kitchen helpers securely',
        'Staff view is strictly scoped to their assigned outlet and active queue',
        'Shop Admins manage catalog prices, revenue reports, and custom promo coupons',
        'Super Admin monitors all 13 campus outlets, GMV, and university-wide dining settings',
      ],
      color: 'border-rose-500/60 text-rose-600 bg-rose-50',
    },
    {
      id: 'high-traffic',
      title: 'High-Traffic Engine & Query Cache',
      badge: 'TanStack Query v5 • 2,500+ Users',
      icon: Layers,
      summary: 'Stale-While-Revalidate caching and in-memory FastAPI catalog routing designed for 1,000+ simultaneous break-hour orders.',
      points: [
        'TanStack Query v5 caches campus menus with automatic background revalidation',
        'In-memory 30-second catalog cache absorbs 95% of burst database reads',
        'Zero-gateway wallet checkout executes in <15ms without external UPI bank latency',
        'Pre-warmed connection pooling prevents database starvation during 10-minute break rushes',
      ],
      color: 'border-indigo-500/60 text-indigo-600 bg-indigo-50',
    },
    {
      id: 'ui-polish',
      title: 'GUI Polish & Micro-Interactions',
      badge: 'Skeletons • Spotlight ⌘K • Live Tracker • Haptics',
      icon: Smartphone,
      summary: 'Native-feel mobile PWA components including content shimmer skeletons, live 4-step order progress, and tactile web haptics.',
      points: [
        'Content shimmer skeleton placeholders eliminate layout shifts on slow Wi-Fi',
        'Spotlight Quick Search (⌘K) searches dishes across all 13 canteens instantly',
        'Live Order Tracker provides visual cooking timeline and token countdown',
        'Web Haptics (navigator.vibrate) triggers tactile confirmation on mobile orders',
      ],
      color: 'border-teal-500/60 text-teal-600 bg-teal-50',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 mb-3">
          <Layers className="w-3.5 h-3.5" />
          <span>PRODUCTION-GRADE STACK</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          How the Technology Works
        </h3>
        <p className="text-slate-600 text-sm sm:text-base mt-2">
          A robust architecture combining Supabase PostgreSQL, Realtime WebSockets, in-app wallet balance, and four isolated dashboard tiers.
        </p>
      </div>

      {/* Interactive Layer Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {layers.map((layer, idx) => {
          const Icon = layer.icon
          const isSelected = activeLayer === idx
          return (
            <div
              key={layer.id}
              onClick={() => setActiveLayer(idx)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-orange-600 shadow-xl shadow-orange-600/10 ring-2 ring-orange-500/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${layer.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {layer.badge}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 mb-2">{layer.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{layer.summary}</p>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                {layer.points.slice(0, 2).map((pt, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-tight">{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
