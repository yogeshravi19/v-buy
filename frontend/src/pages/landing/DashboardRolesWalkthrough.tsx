import React, { useState } from 'react'
import {
  User, ChefHat, Store, TrendingUp, CheckCircle2,
  XCircle, Shield, Eye, Smartphone, Tablet, Monitor,
  Sliders, ArrowRight, Layers, Bell, QrCode, DollarSign
} from 'lucide-react'

interface RoleDetail {
  id: 'student' | 'staff' | 'shop_admin' | 'super_admin'
  title: string
  targetUser: string
  device: string
  deviceIcon: React.ElementType
  colorBadge: string
  screenshot: string
  activeTabs: string[]
  canDo: string[]
  cannotDo: string[]
  keyFlow: string
}

const ROLES: RoleDetail[] = [
  {
    id: 'student',
    title: 'Student / Customer',
    targetUser: 'University students, faculty, and campus visitors',
    device: 'Mobile Browser / PWA (Phone)',
    deviceIcon: Smartphone,
    colorBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    screenshot: '/assets/landing/user-order-tracking-placed.webp',
    activeTabs: ['Menu Catalog', 'Live Orders', 'Campus Wallet'],
    canDo: [
      'Browse all 13 campus canteens & Riviera/Gravitas festival stalls',
      'Instant search and pure vegetarian dietary filter toggle',
      'Select 15-minute scheduled pickup slot to avoid counter rush',
      'Collaborative Group Ordering: share 6-digit room code with classmates',
      'Apply campus discount coupons (e.g. WELCOME50)',
      '1-tap instant payment from pre-funded PhonePe UPI wallet',
      'Track real-time 4-stage order progress (Placed → Preparing → Ready → Collected)',
      'Display scannable QR pickup pass and 3-digit order token',
      'Submit 1–5 star ratings & comments for items; maintain daily loyalty streak',
    ],
    cannotDo: [
      'Cannot view other students’ orders, balances, or personal phone numbers',
      'Cannot access the kitchen queue or advance order statuses',
      'Cannot edit menu prices, outlet operating hours, or vendor payouts',
    ],
    keyFlow: 'Order from lecture hall → Get notified when status changes to Ready → Show QR at pickup counter in 5 seconds.'
  },
  {
    id: 'staff',
    title: 'Shop Staff (Kitchen / Counter)',
    targetUser: 'Canteen cooks, assembly staff, and counter operators',
    device: 'Countertop Tablet / Smartphone (KDS)',
    deviceIcon: Tablet,
    colorBadge: 'bg-orange-50 text-orange-700 border-orange-200',
    screenshot: '/assets/landing/staff-live-queue.webp',
    activeTabs: ['Live Queue (KDS)', 'Quick 86 Stock Toggle', 'Order History'],
    canDo: [
      'Real-time stream of incoming orders for their assigned canteen only',
      'Instant Web Audio chime alert when a student places a new order',
      'Filter orders by current status: Placed, Preparing, or Ready',
      '1-tap status transition buttons (e.g., tap "Start Prep", tap "Mark Ready")',
      'Quick Token search bar to verify 3 or 4-digit pickup tokens immediately',
      'Instant "86" Stock Switch: toggle sold-out dishes off in real time to stop app orders',
      'Order history log to review collected tickets and resolve order mix-ups',
    ],
    cannotDo: [
      'Cannot view financial analytics, bank payouts, or vendor profit margins',
      'Cannot edit food pricing or create discount coupons',
      'Cannot see customer wallet transactions or debit balances directly',
      'Zero access to queue data of other campus canteens',
    ],
    keyFlow: 'Hear chime alert → Cook meal → Tap "Ready" (triggers student notification) → Verify student token on handover.'
  },
  {
    id: 'shop_admin',
    title: 'Shop Admin (Canteen Owner / Manager)',
    targetUser: 'Canteen operators, food court stall owners, catering managers',
    device: 'Laptop / Tablet Admin Portal',
    deviceIcon: Monitor,
    colorBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    screenshot: '/assets/landing/shop-admin-analytics.webp',
    activeTabs: ['Analytics', 'Menu Management', 'Queue Monitor', 'Staff Team', 'Payouts', 'Coupons'],
    canDo: [
      'Comprehensive financial dashboard: daily revenue, total order volume, average order value',
      'Identify peak ordering rush hours and best-selling menu items',
      'Full Menu Catalog CRUD: add dishes, update prices, set prep times, upload dish photos',
      'Manage staff access: generate secure 8-character invite codes for kitchen helpers',
      'Net vendor payout ledger: review platform fee deductions and bank settlement receipts',
      'Create outlet-specific discount promo codes with custom usage limits',
      'Emergency toggle to pause incoming online orders during sudden physical rushes',
      'Export detailed order sheets to CSV for accounting and audit reconciliation',
    ],
    cannotDo: [
      'Cannot alter platform-wide commission rates set by the university',
      'Cannot access or modify databases of other independent campus vendors',
      'Cannot perform Super Admin system role promotions',
    ],
    keyFlow: 'Monitor daily lunch revenue → Update seasonal menu prices → Reconcile bank settlements and staff permissions.'
  },
  {
    id: 'super_admin',
    title: 'Super Admin (Campus Dining Director)',
    targetUser: 'University dining committee, campus operations director',
    device: 'Desktop Command Console',
    deviceIcon: Sliders,
    colorBadge: 'bg-purple-50 text-purple-700 border-purple-200',
    screenshot: '/assets/landing/super-admin-overview.webp',
    activeTabs: ['Campus Monitor', 'Global Metrics', 'Outlet Hierarchy', 'User RBAC', 'Master Orders', 'Campus Coupons', 'Audit Logs'],
    canDo: [
      'Real-time campus-wide monitoring across all 13 canteens and festival popups',
      'Macro analytics: Gross Merchandise Value (GMV), university commission, daily active users',
      'Hierarchy management: configure Gazebo C1/C2/C3, North Square, Food Park, and fest stalls',
      'Approve new vendor onboarding and manage operating permits',
      'Role-Based Access Control (RBAC): elevate or demote student, staff, and manager accounts',
      'Master Order Ledger: cross-campus order lookup, dispute investigation, and instant refund overrides',
      'Configure campus-wide festival discounts (Riviera, Gravitas, freshers orientation)',
      'Comprehensive tamper-evident security audit log tracking price modifications and auth actions',
    ],
    cannotDo: [
      'Strict separation prevents arbitrary modification of immutable bank transaction logs',
    ],
    keyFlow: 'Oversee campus food operations → Review peak lunch traffic → Manage dining contracts and safety audits.'
  }
]

export const DashboardRolesWalkthrough: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'student' | 'staff' | 'shop_admin' | 'super_admin'>('student')
  const current = ROLES.find(r => r.id === selectedRole) || ROLES[0]
  const DeviceIcon = current.deviceIcon

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 mb-3">
          <Layers className="w-3.5 h-3.5" />
          <span>FOUR DEDICATED ROLES</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          How Each Dashboard Works
        </h3>
        <p className="text-slate-600 text-sm sm:text-base mt-2">
          V Foods implements 4 distinct role-based dashboards with strict database Row Level Security. Select a role below to inspect what each user sees and controls.
        </p>
      </div>

      {/* Role Navigation Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLES.map(role => {
          const isSelected = selectedRole === role.id
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-orange-600 shadow-md ring-2 ring-orange-500/20'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${role.colorBadge}`}>
                    {role.id.replace('_', ' ').toUpperCase()}
                  </span>
                  <role.deviceIcon className={`w-4 h-4 ${isSelected ? 'text-orange-600' : 'text-slate-400'}`} />
                </div>
                <h4 className="text-sm font-bold text-slate-900">{role.title}</h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">{role.targetUser}</p>
            </button>
          )
        })}
      </div>

      {/* Role Detailed View Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl shadow-slate-200/40">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Role Details and Permissions */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-2xl font-extrabold text-slate-900">{current.title} Dashboard</h4>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${current.colorBadge}`}>
                  {current.device}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {current.targetUser}
              </p>
            </div>

            {/* Key Workflow Pill */}
            <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 text-xs text-orange-900 flex items-start gap-2.5">
              <ArrowRight className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Core Daily Workflow:</span> {current.keyFlow}
              </div>
            </div>

            {/* Active Dashboard Tabs */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                Included Dashboard Navigation Tabs:
              </span>
              <div className="flex flex-wrap gap-2">
                {current.activeTabs.map(tab => (
                  <span
                    key={tab}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>

            {/* Permissions: What they CAN do */}
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Authorized Features &amp; Actions
              </span>
              <div className="space-y-1.5">
                {current.canDo.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strict Boundaries: What they CANNOT do */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-600" /> Strict Security Boundaries (RLS Enforced)
              </span>
              <div className="space-y-1.5">
                {current.cannotDo.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Real Interface Preview */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-between">
            <div className="w-full text-center pb-3 border-b border-slate-200 mb-4">
              <span className="text-xs font-bold text-slate-800">Verified Dashboard UI</span>
              <p className="text-[11px] text-slate-500">Production interface running in active system</p>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md max-w-sm w-full bg-white">
              <img
                src={current.screenshot}
                alt={`${current.title} interface screenshot`}
                className="w-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="w-full mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" /> Row-Level Security
              </span>
              <span className="font-semibold text-slate-800">Supabase Auth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
