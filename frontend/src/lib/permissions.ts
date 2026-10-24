/**
 * V FOODS — Single Authoritative Permission Map
 * Source of truth for navigation visibility, capability matrices, and permission explanations.
 * Backed directly by Supabase RLS policies and backend FastAPI endpoints.
 */

export type UserRole = 'user' | 'staff' | 'shop_admin' | 'super_admin'

export interface RoleCapability {
  role: UserRole
  displayName: string
  hierarchyLevel: number
  badgeColor: string
  scopeDescription: string
  accountCreationMethod: string
  canSee: string[]
  canDo: string[]
  cannotDo: string[]
  allowedScreens: string[]
  codeEvidence: string
  rlsEvidence: string
}

export interface ModulePermission {
  module: string
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  manage: boolean
  notes?: string
}

export interface RoleModuleMatrix {
  role: UserRole
  modules: ModulePermission[]
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleCapability> = {
  user: {
    role: 'user',
    displayName: 'User',
    hierarchyLevel: 1,
    badgeColor: '#2563EB',
    scopeDescription: 'Campus-wide customer ordering across all canteens and Riviera food stalls.',
    accountCreationMethod: 'Self sign-up via Email OTP or VIT Google OAuth verification.',
    canSee: [
      'Published active menus, dish pricing, and preparation time estimates across all 20 outlets.',
      'Their personal orders, live status updates (placed, preparing, ready, collected), and Token QR.',
      'Their digital wallet balance, loyalty streaks, and referral bonuses.',
      'Public pickup slots and student discount coupons.'
    ],
    canDo: [
      'Add dishes to cart and customize quantities.',
      'Place food pre-orders using Campus Wallet or online payment gateway.',
      'Top up their digital campus wallet balance.',
      'Rate collected meals (1-5 stars) to help maintain quality.',
      'Cancel unpaid or recently placed orders before kitchen begins cooking.'
    ],
    cannotDo: [
      'Cannot view other customers orders or confidential POS register transactions.',
      'Cannot edit dish pricing, toggle 86 item availability, or adjust inventory.',
      'Cannot modify order status in the kitchen display or advance queue tokens.',
      'Cannot access backend administration routes (`/staff`, `/shop-admin`, `/admin`).'
    ],
    allowedScreens: ['Browse Menu', 'Cart Tray', 'Live Orders', 'Campus Wallet', 'User Profile'],
    codeEvidence: 'frontend/src/App.jsx:1527-1582, frontend/src/components/VFoodsUserDashboard.jsx',
    rlsEvidence: 'orders_user_read (017_pos_counter_billing.sql:63), wallets_user_read (001_initial_schema.sql)'
  },
  staff: {
    role: 'staff',
    displayName: 'Shop Staff',
    hierarchyLevel: 2,
    badgeColor: '#10B981',
    scopeDescription: 'Counter operations and kitchen fulfillment strictly scoped to their assigned outlet.',
    accountCreationMethod: 'Invited by Shop Admin or Super Admin using 8-character invite code (`invites` table).',
    canSee: [
      'Real-time incoming orders, cooking tickets, and order queue for their assigned outlet only.',
      'Outlet inventory quantities and 86 (sold out) stock indicators.',
      'Cashier POS counter screen with quick-tap dish buttons.',
      'Shift order reconciliation and counter cash collection totals.'
    ],
    canDo: [
      'Advance kitchen tickets (`placed` -> `preparing` -> `ready` -> `collected`).',
      'Scan customer token QR codes at the pickup counter to mark food collected.',
      'Ring up walk-in counter sales via POS cashier register (cash/UPI).',
      'Toggle 86 stock status (mark dishes sold out or restocked).',
      'Insert new dishes or update dish descriptions/photos for their assigned outlet.'
    ],
    cannotDo: [
      'Cannot delete menu items (blocked by RLS policy `menu_items_staff_insert/update`).',
      'Cannot modify dish pricing (enforced via frontend disabled price input and audit logging).',
      'Cannot access or view orders from other outlets (enforced by `outlet_id = get_my_outlet()`).',
      'Cannot manage payout settlements, view bank account VPAs, or create coupons.',
      'Cannot invite other staff members or assign administrative permissions.'
    ],
    allowedScreens: ['Station Overview', 'Live Orders', 'KDS Screen', 'Stock & 86 List', 'Pickup Queue', 'POS Counter', 'Shift Billing'],
    codeEvidence: 'frontend/src/pages/staff/ShopStaffDashboard.tsx, backend/main.py:921-974',
    rlsEvidence: 'orders_staff_read/update (008_four_tier_roles.sql:386-393), menu_items_staff_insert/update (010_staff_menu_insert_rls.sql:16-23)'
  },
  shop_admin: {
    role: 'shop_admin',
    displayName: 'Shop Admin',
    hierarchyLevel: 3,
    badgeColor: '#D97706',
    scopeDescription: 'Full commercial and operational control over their assigned canteen or vendor stall.',
    accountCreationMethod: 'Assigned by Super Admin via `/admin/invites/create` or role assignment.',
    canSee: [
      'All live orders, historical sales logs, and financial metrics for their assigned outlet.',
      'Full menu catalog with profit margins, dish pricing, and stock depletion rates.',
      'Outlet staff roster, employee activity timestamps, and shift presence.',
      'Daily payout settlements, platform commission deductions, and net payouts.'
    ],
    canDo: [
      'Full CRUD on outlet menu items (Create, Edit price, Toggle availability, Delete dish).',
      'Invite and onboard Shop Staff team members using outlet-bound invite codes.',
      'Deactivate or remove staff members from their outlet roster.',
      'Configure scheduled pickup time slots and capacity limits.',
      'Toggle store operational status (`Kitchen Open`, `Rush Buffer +10m`, `Store Paused`).',
      'Export shift revenue and sales CSV reports.'
    ],
    cannotDo: [
      'Cannot access, inspect, or modify other canteen outlets or campuses.',
      'Cannot override platform-wide commission rates or create global discount coupons.',
      'Cannot credit customer wallets from platform treasury funds.',
      'Cannot access system-wide audit logs, raw platform database settings, or Developer System Map.'
    ],
    allowedScreens: ['Overview', 'Live Orders', 'KDS', 'Menu Management', 'Inventory Levels', 'POS Register', 'Pickup Slots', 'Staff Team', 'Revenue Analytics', 'Settlements', 'Sales Reports', 'Outlet Settings'],
    codeEvidence: 'frontend/src/pages/shop/ShopAdminDashboard.tsx, backend/main.py:1039-1075',
    rlsEvidence: 'orders_shop_admin (008_four_tier_roles.sql:400), menu_items_shop_admin (010_staff_menu_insert_rls.sql:34), profiles_shop_admin_team (008:354)'
  },
  super_admin: {
    role: 'super_admin',
    displayName: 'Super Admin',
    hierarchyLevel: 4,
    badgeColor: '#7C3AED',
    scopeDescription: 'Campus-wide governance, global access control, platform commerce, and developer diagnostics.',
    accountCreationMethod: 'Designated via direct database seed in `supabase/migrations/001_initial_schema.sql` with master credentials.',
    canSee: [
      'All 20 outlets across all campus facilities with aggregate Gross Merchandise Value (GMV).',
      'System-wide user roster (students, staff, shop admins, super admins) with active status.',
      'Platform-wide audit logs capturing every price adjustment, status change, and login.',
      'Payment gateway session states, Paytm 3-way split breakdowns, and merchant balances.',
      'Developer System Map tracing routes, redirects, popups, and persisted error telemetry.'
    ],
    canDo: [
      'Create and onboard new university campuses and dining facilities.',
      'Provision new canteen outlets, configure vendor UPI VPAs, and set commission splits.',
      'Issue and revoke role invites for Shop Admins and Shop Staff across any facility.',
      'Create platform discount coupons with usage caps and date bounds.',
      'Perform administrative wallet credits from platform reserve balance.',
      'Toggle campus Event Mode for high-traffic Riviera festivals.',
      'Inspect error logs and system health telemetry.'
    ],
    cannotDo: [
      'Cannot silently bypass immutable financial ledger constraints in `wallet_transactions`.',
      'Cannot alter completed Paytm payment webhooks or verified banking signatures.'
    ],
    allowedScreens: ['Platform Overview', 'Campuses', 'Outlets', 'Users & Staff', 'Roles & Permissions', 'All Orders', 'Payments Gateway', 'Settlements', 'Coupons', 'Analytics & Reports', 'Audit Logs', 'System Settings', 'System Map'],
    codeEvidence: 'frontend/src/pages/admin/SuperAdminDashboard.tsx, backend/main.py:1019-1075',
    rlsEvidence: 'menu_items_super_admin (010_staff_menu_insert_rls.sql:45), orders_super_admin_all (008:407), profiles_super_admin_all (008:342)'
  }
}

export const MODULE_CAPABILITY_MATRIX: {
  module: string
  user: { view: boolean; create: boolean; edit: boolean; delete: boolean; manage: boolean }
  staff: { view: boolean; create: boolean; edit: boolean; delete: boolean; manage: boolean }
  shop_admin: { view: boolean; create: boolean; edit: boolean; delete: boolean; manage: boolean }
  super_admin: { view: boolean; create: boolean; edit: boolean; delete: boolean; manage: boolean }
}[] = [
  {
    module: 'Menu & Dishes',
    user:       { view: true,  create: false, edit: false, delete: false, manage: false },
    staff:      { view: true,  create: true,  edit: true,  delete: false, manage: false },
    shop_admin: { view: true,  create: true,  edit: true,  delete: true,  manage: true  },
    super_admin:{ view: true,  create: true,  edit: true,  delete: true,  manage: true  }
  },
  {
    module: 'Pricing & Tariffs',
    user:       { view: true,  create: false, edit: false, delete: false, manage: false },
    staff:      { view: true,  create: false, edit: false, delete: false, manage: false },
    shop_admin: { view: true,  create: true,  edit: true,  delete: false, manage: true  },
    super_admin:{ view: true,  create: true,  edit: true,  delete: false, manage: true  }
  },
  {
    module: 'Live Kitchen (KDS)',
    user:       { view: false, create: false, edit: false, delete: false, manage: false },
    staff:      { view: true,  create: false, edit: true,  delete: false, manage: true  },
    shop_admin: { view: true,  create: false, edit: true,  delete: false, manage: true  },
    super_admin:{ view: true,  create: false, edit: true,  delete: false, manage: true  }
  },
  {
    module: 'Customer Orders',
    user:       { view: true,  create: true,  edit: false, delete: false, manage: false },
    staff:      { view: true,  create: true,  edit: true,  delete: false, manage: false },
    shop_admin: { view: true,  create: true,  edit: true,  delete: false, manage: true  },
    super_admin:{ view: true,  create: true,  edit: true,  delete: true,  manage: true  }
  },
  {
    module: 'POS Cash Register',
    user:       { view: false, create: false, edit: false, delete: false, manage: false },
    staff:      { view: true,  create: true,  edit: false, delete: false, manage: false },
    shop_admin: { view: true,  create: true,  edit: false, delete: false, manage: true  },
    super_admin:{ view: true,  create: true,  edit: false, delete: false, manage: true  }
  },
  {
    module: 'Stock & 86 Levels',
    user:       { view: true,  create: false, edit: false, delete: false, manage: false },
    staff:      { view: true,  create: false, edit: true,  delete: false, manage: false },
    shop_admin: { view: true,  create: true,  edit: true,  delete: false, manage: true  },
    super_admin:{ view: true,  create: true,  edit: true,  delete: false, manage: true  }
  },
  {
    module: 'Staff Team Management',
    user:       { view: false, create: false, edit: false, delete: false, manage: false },
    staff:      { view: false, create: false, edit: false, delete: false, manage: false },
    shop_admin: { view: true,  create: true,  edit: true,  delete: true,  manage: true  },
    super_admin:{ view: true,  create: true,  edit: true,  delete: true,  manage: true  }
  },
  {
    module: 'Payout Settlements',
    user:       { view: false, create: false, edit: false, delete: false, manage: false },
    staff:      { view: false, create: false, edit: false, delete: false, manage: false },
    shop_admin: { view: true,  create: false, edit: false, delete: false, manage: false },
    super_admin:{ view: true,  create: true,  edit: true,  delete: false, manage: true  }
  },
  {
    module: 'Coupons & Promos',
    user:       { view: true,  create: false, edit: false, delete: false, manage: false },
    staff:      { view: false, create: false, edit: false, delete: false, manage: false },
    shop_admin: { view: false, create: false, edit: false, delete: false, manage: false },
    super_admin:{ view: true,  create: true,  edit: true,  delete: true,  manage: true  }
  },
  {
    module: 'Audit Logs',
    user:       { view: false, create: false, edit: false, delete: false, manage: false },
    staff:      { view: false, create: false, edit: false, delete: false, manage: false },
    shop_admin: { view: true,  create: false, edit: false, delete: false, manage: false },
    super_admin:{ view: true,  create: false, edit: false, delete: false, manage: true  }
  },
  {
    module: 'Developer System Map',
    user:       { view: false, create: false, edit: false, delete: false, manage: false },
    staff:      { view: false, create: false, edit: false, delete: false, manage: false },
    shop_admin: { view: false, create: false, edit: false, delete: false, manage: false },
    super_admin:{ view: true,  create: false, edit: false, delete: false, manage: true  }
  }
]

export function normalizeRole(rawRole?: string): UserRole {
  if (!rawRole) return 'user'
  const r = rawRole.toLowerCase().trim()
  if (r === 'super_admin' || r === 'superadmin' || r === 'admin') return 'super_admin'
  if (r === 'shop_admin' || r === 'owner') return 'shop_admin'
  if (r === 'staff' || r === 'shop_staff') return 'staff'
  return 'user'
}
