/**
 * V FOODS — Master Route, Redirect & Popup System Registry
 * Single authoritative typed registry of every user-accessible surface.
 * Every entry is strictly verified against frontend components, routes, backend endpoints, and Supabase RLS.
 */

export type RegistryEntryType = 'route' | 'redirect' | 'popup'

export interface RegistryEntry {
  id: string
  type: RegistryEntryType
  name: string
  pathOrTrigger: string
  rolesAllowed: string[]
  openedFrom: string
  redirectCondition?: string
  redirectTarget?: string
  popupActions?: string[]
  apiRoutes?: string[]
  tables?: string[]
  storageBuckets?: string[]
  realtimeChannels?: string[]
  sourceFiles: string[]
  protected?: boolean | 'not instrumented'
}

export const SYSTEM_REGISTRY: RegistryEntry[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // 1. ROUTES (User / Customer)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'R-CUSTOMER-BROWSE',
    type: 'route',
    name: 'Browse Food Courts & Menus',
    pathOrTrigger: '/ or /browse',
    rolesAllowed: ['user'],
    openedFrom: 'Direct URL or Home Navigation Tab',
    apiRoutes: ['GET /api/catalog/summary'],
    tables: ['outlets', 'menu_items', 'campuses'],
    realtimeChannels: ['menu_items'],
    sourceFiles: ['frontend/src/App.jsx', 'frontend/src/components/VFoodsUserDashboard.jsx'],
    protected: false
  },
  {
    id: 'R-CUSTOMER-CART',
    type: 'route',
    name: 'Cart Tray & Scheduled Checkout',
    pathOrTrigger: '/cart',
    rolesAllowed: ['user'],
    openedFrom: 'Bottom Nav Cart Tab or Floating Tray Bar',
    apiRoutes: ['POST /order/checkout', 'POST /order/checkout/paytm-session'],
    tables: ['orders', 'order_items', 'pickup_slots', 'coupons'],
    realtimeChannels: [],
    sourceFiles: ['frontend/src/components/VFoodsUserDashboard.jsx'],
    protected: 'not instrumented'
  },
  {
    id: 'R-CUSTOMER-ORDERS',
    type: 'route',
    name: 'My Orders & Live Order Tracker',
    pathOrTrigger: '/orders',
    rolesAllowed: ['user'],
    openedFrom: 'Bottom Nav Orders Tab or Profile Menu',
    apiRoutes: [],
    tables: ['orders', 'order_items'],
    realtimeChannels: ['orders'],
    sourceFiles: ['frontend/src/components/LiveOrderTracker.tsx', 'frontend/src/components/VFoodsUserDashboard.jsx'],
    protected: false
  },
  {
    id: 'R-CUSTOMER-WALLET',
    type: 'route',
    name: 'Campus Wallet Ledger & Top-Up',
    pathOrTrigger: '/wallet',
    rolesAllowed: ['user'],
    openedFrom: 'Bottom Nav Wallet Tab or Header Balance Pill',
    apiRoutes: ['POST /wallet/topup', 'POST /wallet/topup/paytm'],
    tables: ['wallets', 'wallet_transactions'],
    realtimeChannels: ['wallets'],
    sourceFiles: ['frontend/src/components/VFoodsUserDashboard.jsx'],
    protected: 'not instrumented'
  },
  {
    id: 'R-CUSTOMER-PROFILE',
    type: 'route',
    name: 'User Profile & Preferences',
    pathOrTrigger: '/profile',
    rolesAllowed: ['user'],
    openedFrom: 'Bottom Nav Profile Tab or Avatar Menu',
    apiRoutes: ['POST /api/push/subscribe'],
    tables: ['profiles', 'web_push_subscriptions'],
    sourceFiles: ['frontend/src/components/VFoodsUserDashboard.jsx'],
    protected: false
  },
  {
    id: 'R-LANDING-WELCOME',
    type: 'route',
    name: 'Welcome Landing Page',
    pathOrTrigger: '/welcome',
    rolesAllowed: ['user', 'staff', 'shop_admin', 'super_admin'],
    openedFrom: 'Marketing URL or Onboarding link',
    sourceFiles: ['frontend/src/pages/landing/WelcomePage.tsx', 'frontend/src/main.jsx'],
    protected: false
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ROUTES (Shop Staff)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'R-STAFF-OVERVIEW',
    type: 'route',
    name: 'Staff Station Overview',
    pathOrTrigger: '/staff or /staff/overview',
    rolesAllowed: ['staff'],
    openedFrom: 'Staff Login or Sidebar Overview Tab',
    tables: ['orders', 'menu_items', 'outlets'],
    realtimeChannels: ['orders'],
    sourceFiles: ['frontend/src/pages/staff/ShopStaffDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-STAFF-LIVE-ORDERS',
    type: 'route',
    name: 'Staff Live Orders Counter',
    pathOrTrigger: '/staff/live-orders',
    rolesAllowed: ['staff'],
    openedFrom: 'Sidebar Live Orders Tab',
    apiRoutes: ['POST /staff/order/{order_id}/advance', 'POST /staff/order/{order_id}/cancel'],
    tables: ['orders', 'order_items', 'audit_logs'],
    realtimeChannels: ['orders'],
    sourceFiles: ['frontend/src/pages/staff/ShopStaffDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-STAFF-KDS',
    type: 'route',
    name: 'Kitchen Display Screen (KDS)',
    pathOrTrigger: '/staff/kds',
    rolesAllowed: ['staff'],
    openedFrom: 'Sidebar KDS Tab or Overview Quick Action',
    apiRoutes: ['POST /staff/order/{order_id}/advance'],
    tables: ['orders', 'order_items'],
    realtimeChannels: ['orders'],
    sourceFiles: ['frontend/src/pages/staff/ShopStaffDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-STAFF-STOCK',
    type: 'route',
    name: 'Stock & 86 Item Availability',
    pathOrTrigger: '/staff/stock',
    rolesAllowed: ['staff'],
    openedFrom: 'Sidebar Stock Tab',
    apiRoutes: ['POST /staff/stock/adjust'],
    tables: ['menu_items', 'stock_adjustments'],
    realtimeChannels: ['menu_items'],
    sourceFiles: ['frontend/src/pages/staff/ShopStaffDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-STAFF-PICKUP-QUEUE',
    type: 'route',
    name: 'Ready Order Pickup Queue',
    pathOrTrigger: '/staff/pickup-queue',
    rolesAllowed: ['staff'],
    openedFrom: 'Sidebar Pickup Queue Tab',
    apiRoutes: ['POST /staff/scan'],
    tables: ['orders'],
    realtimeChannels: ['orders'],
    sourceFiles: ['frontend/src/pages/staff/ShopStaffDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-STAFF-POS',
    type: 'route',
    name: 'POS Cashier Counter Register',
    pathOrTrigger: '/staff/pos',
    rolesAllowed: ['staff'],
    openedFrom: 'Sidebar POS Counter Tab or Alias /pos',
    tables: ['menu_items', 'orders', 'order_items'],
    sourceFiles: ['frontend/src/components/pos/PosCounterScreen.tsx', 'frontend/src/pages/staff/ShopStaffDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-STAFF-SHIFT-BILLING',
    type: 'route',
    name: 'Shift Reconciliation & Counter Cash',
    pathOrTrigger: '/staff/shift-billing',
    rolesAllowed: ['staff'],
    openedFrom: 'Sidebar Shift Billing Tab',
    tables: ['orders'],
    sourceFiles: ['frontend/src/pages/staff/ShopStaffDashboard.tsx'],
    protected: false
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ROUTES (Shop Admin)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'R-SHOP-OVERVIEW',
    type: 'route',
    name: 'Shop Admin Command Center',
    pathOrTrigger: '/shop-admin or /shop-admin/overview',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Shop Admin Login',
    tables: ['orders', 'menu_items', 'profiles', 'outlets'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-LIVE-ORDERS',
    type: 'route',
    name: 'Shop Admin Live Orders',
    pathOrTrigger: '/shop-admin/live-orders',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar Live Orders Tab',
    tables: ['orders', 'order_items'],
    realtimeChannels: ['orders'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-KDS',
    type: 'route',
    name: 'Shop Admin Kitchen Display',
    pathOrTrigger: '/shop-admin/kds',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar Kitchen Display Tab',
    tables: ['orders'],
    realtimeChannels: ['orders'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-MENU',
    type: 'route',
    name: 'Menu Management & Pricing',
    pathOrTrigger: '/shop-admin/menu-items',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar Menu Management Tab',
    apiRoutes: ['POST /media/upload-menu-image'],
    tables: ['menu_items'],
    storageBuckets: ['menu-images'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-INVENTORY',
    type: 'route',
    name: 'Inventory Levels & Batch Restock',
    pathOrTrigger: '/shop-admin/inventory',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar Inventory Levels Tab',
    tables: ['menu_items', 'stock_adjustments'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-POS',
    type: 'route',
    name: 'Shop Admin POS Counter',
    pathOrTrigger: '/shop-admin/pos',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar POS Counter Tab',
    tables: ['menu_items', 'orders'],
    sourceFiles: ['frontend/src/components/pos/PosCounterScreen.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-PICKUP-SLOTS',
    type: 'route',
    name: 'Pickup Time Slots Capacity',
    pathOrTrigger: '/shop-admin/pickup-slots',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar Pickup Slots Tab',
    tables: ['pickup_slots'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-STAFF',
    type: 'route',
    name: 'Staff Team Roster & Invites',
    pathOrTrigger: '/shop-admin/staff',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar Staff Team Tab',
    apiRoutes: ['POST /admin/invites/create'],
    tables: ['profiles', 'invites'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-REVENUE',
    type: 'route',
    name: 'Revenue & Performance Analytics',
    pathOrTrigger: '/shop-admin/sales-revenue',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar Revenue Analytics Tab',
    tables: ['orders'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-SETTLEMENTS',
    type: 'route',
    name: 'Payout Settlements Ledger',
    pathOrTrigger: '/shop-admin/settlements',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar Payout Settlements Tab',
    tables: ['settlements'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-REPORTS',
    type: 'route',
    name: 'Sales Reports & CSV Export',
    pathOrTrigger: '/shop-admin/reports',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar Sales Reports Tab',
    tables: ['orders'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-SHOP-SETTINGS',
    type: 'route',
    name: 'Outlet Status & Operating Hours',
    pathOrTrigger: '/shop-admin/shop-settings',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Sidebar Outlet Settings Tab',
    tables: ['outlets'],
    sourceFiles: ['frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 4. ROUTES (Super Admin)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'R-ADMIN-OVERVIEW',
    type: 'route',
    name: 'Campus Platform Overview',
    pathOrTrigger: '/admin or /admin/overview',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Super Admin Login',
    tables: ['orders', 'outlets', 'profiles', 'campuses'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-ADMIN-CAMPUSES',
    type: 'route',
    name: 'University Campuses Directory',
    pathOrTrigger: '/admin/campuses',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar Campuses Tab',
    tables: ['campuses'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-ADMIN-OUTLETS',
    type: 'route',
    name: 'Canteens & Riviera Outlets',
    pathOrTrigger: '/admin/outlets',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar Outlets Tab',
    tables: ['outlets', 'campuses'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-ADMIN-USERS',
    type: 'route',
    name: 'Users Directory & Role Assignment',
    pathOrTrigger: '/admin/users',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar Users & Staff Tab',
    apiRoutes: ['POST /admin/invites/create', 'POST /admin/credit-wallet'],
    tables: ['profiles', 'invites', 'wallets'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-ADMIN-ROLES-PERMISSIONS',
    type: 'route',
    name: 'Roles & Access Governance Matrix',
    pathOrTrigger: '/admin/roles-permissions',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar Access Control -> Roles & Permissions Tab',
    tables: ['profiles', 'outlets'],
    sourceFiles: ['frontend/src/pages/admin/RolesAndPermissionsScreen.tsx', 'frontend/src/lib/permissions.ts'],
    protected: false
  },
  {
    id: 'R-ADMIN-ORDERS',
    type: 'route',
    name: 'Campus Orders Master Ledger',
    pathOrTrigger: '/admin/orders',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar All Orders Tab',
    tables: ['orders', 'order_items', 'outlets'],
    realtimeChannels: ['orders'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-ADMIN-PAYMENTS',
    type: 'route',
    name: 'Paytm & Payment Gateway Sessions',
    pathOrTrigger: '/admin/payments',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar Payments Gateway Tab',
    apiRoutes: ['POST /webhooks/paytm', 'POST /webhooks/phonepe'],
    tables: ['orders', 'wallet_transactions'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: 'not instrumented'
  },
  {
    id: 'R-ADMIN-SETTLEMENTS',
    type: 'route',
    name: 'Vendor Payout Settlements',
    pathOrTrigger: '/admin/settlements',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar Shop Settlements Tab',
    tables: ['settlements', 'outlets'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-ADMIN-ANALYTICS',
    type: 'route',
    name: 'Cross-Outlet Analytics & Trends',
    pathOrTrigger: '/admin/analytics-reports',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar Analytics & Reports Tab',
    tables: ['orders', 'outlets'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-ADMIN-COUPONS',
    type: 'route',
    name: 'Coupons & Student Promos',
    pathOrTrigger: '/admin/coupons',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar Coupons & Discounts Tab',
    tables: ['coupons'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-ADMIN-AUDIT-LOGS',
    type: 'route',
    name: 'Platform Security Audit Logs',
    pathOrTrigger: '/admin/audit-logs',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar Audit Logs Tab',
    tables: ['audit_logs'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-ADMIN-SETTINGS',
    type: 'route',
    name: 'Platform System Settings & Riviera Event Mode',
    pathOrTrigger: '/admin/system-settings',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar System Settings Tab',
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'R-ADMIN-SYSTEM-MAP',
    type: 'route',
    name: 'Developer System Map & Error Telemetry',
    pathOrTrigger: '/admin/system-map',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Sidebar Developer & System -> System Map Tab',
    tables: ['app_error_log'],
    sourceFiles: ['frontend/src/pages/admin/SystemMapScreen.tsx'],
    protected: false
  },
  {
    id: 'R-NOT-FOUND',
    type: 'route',
    name: '404 Unknown Route Fallback',
    pathOrTrigger: '/* (unknown paths)',
    rolesAllowed: ['user', 'staff', 'shop_admin', 'super_admin'],
    openedFrom: 'Invalid URL navigation',
    sourceFiles: ['frontend/src/pages/NotFoundPage.tsx', 'frontend/src/App.jsx'],
    protected: false
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 5. REDIRECTS (Enforced Navigation Boundaries)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'X-ALIAS-OPS-STAFF',
    type: 'redirect',
    name: 'Route Alias: /ops to Staff POS',
    pathOrTrigger: 'URL path /ops or /pos',
    rolesAllowed: ['staff'],
    openedFrom: 'Browser URL entry',
    redirectCondition: 'User role is staff accessing /ops or /pos',
    redirectTarget: '/staff/pos',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-ALIAS-OPS-SHOP',
    type: 'redirect',
    name: 'Route Alias: /ops to Shop Admin POS',
    pathOrTrigger: 'URL path /ops or /pos',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Browser URL entry',
    redirectCondition: 'User role is shop_admin accessing /ops or /pos',
    redirectTarget: '/shop-admin/pos',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-ALIAS-OPS-ADMIN',
    type: 'redirect',
    name: 'Route Alias: /ops to Admin POS',
    pathOrTrigger: 'URL path /ops or /pos',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Browser URL entry',
    redirectCondition: 'User role is super_admin accessing /ops or /pos',
    redirectTarget: '/admin/pos',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-UNAUTH-CUSTOMER-STAFF',
    type: 'redirect',
    name: 'Guard: Customer Blocked from Staff Routes',
    pathOrTrigger: 'URL starting with /staff',
    rolesAllowed: ['user'],
    openedFrom: 'Direct URL entry',
    redirectCondition: 'Customer attempts to access /staff/*',
    redirectTarget: '/',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-UNAUTH-CUSTOMER-SHOP',
    type: 'redirect',
    name: 'Guard: Customer Blocked from Shop Admin Routes',
    pathOrTrigger: 'URL starting with /shop-admin',
    rolesAllowed: ['user'],
    openedFrom: 'Direct URL entry',
    redirectCondition: 'Customer attempts to access /shop-admin/*',
    redirectTarget: '/',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-UNAUTH-CUSTOMER-ADMIN',
    type: 'redirect',
    name: 'Guard: Customer Blocked from Super Admin Routes',
    pathOrTrigger: 'URL starting with /admin',
    rolesAllowed: ['user'],
    openedFrom: 'Direct URL entry',
    redirectCondition: 'Customer attempts to access /admin/*',
    redirectTarget: '/',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-UNAUTH-STAFF-ADMIN',
    type: 'redirect',
    name: 'Guard: Staff Blocked from Admin Routes',
    pathOrTrigger: 'URL starting with /admin or /shop-admin',
    rolesAllowed: ['staff'],
    openedFrom: 'Direct URL entry',
    redirectCondition: 'Staff attempts to access /admin/* or /shop-admin/*',
    redirectTarget: '/staff',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-UNAUTH-STAFF-ROOT',
    type: 'redirect',
    name: 'Guard: Staff Auto-Nav to Station Dashboard',
    pathOrTrigger: 'URL path /',
    rolesAllowed: ['staff'],
    openedFrom: 'Login or direct root visit',
    redirectCondition: 'Staff user visits base route /',
    redirectTarget: '/staff',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-UNAUTH-SHOP-ADMIN',
    type: 'redirect',
    name: 'Guard: Shop Admin Blocked from Super Admin Routes',
    pathOrTrigger: 'URL starting with /admin',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Direct URL entry',
    redirectCondition: 'Shop Admin attempts to access /admin/*',
    redirectTarget: '/shop-admin',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-UNAUTH-SHOP-ROOT',
    type: 'redirect',
    name: 'Guard: Shop Admin Auto-Nav to Outlet Dashboard',
    pathOrTrigger: 'URL path /',
    rolesAllowed: ['shop_admin'],
    openedFrom: 'Login or direct root visit',
    redirectCondition: 'Shop Admin visits base route /',
    redirectTarget: '/shop-admin',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-SUPER-ADMIN-ROOT',
    type: 'redirect',
    name: 'Guard: Super Admin Auto-Nav to Platform Dashboard',
    pathOrTrigger: 'URL path /',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Login or direct root visit',
    redirectCondition: 'Super Admin visits base route /',
    redirectTarget: '/admin',
    sourceFiles: ['frontend/src/App.jsx']
  },
  {
    id: 'X-NOT-FOUND-HOME',
    type: 'redirect',
    name: '404 Safety Return Redirect',
    pathOrTrigger: 'User clicks Return to Safety button on 404',
    rolesAllowed: ['user', 'staff', 'shop_admin', 'super_admin'],
    openedFrom: '404 NotFoundPage button',
    redirectCondition: 'User manually clicks return button',
    redirectTarget: '/ or role home (/staff, /shop-admin, /admin)',
    sourceFiles: ['frontend/src/pages/NotFoundPage.tsx', 'frontend/src/App.jsx']
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 6. POPUPS, MODALS, SHEETS & DRAWERS
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'P-ITEM-DETAIL',
    type: 'popup',
    name: 'Dish Detail & Customization Sheet',
    pathOrTrigger: 'User taps any dish card on menu',
    rolesAllowed: ['user'],
    openedFrom: 'Browse Menu and Canteen screens',
    popupActions: ['Select quantity', 'View allergens', 'Add to cart tray'],
    sourceFiles: ['frontend/src/components/ItemDetailBottomSheet.tsx'],
    protected: false
  },
  {
    id: 'P-USER-AUTH',
    type: 'popup',
    name: 'User Sign In & OTP Modal',
    pathOrTrigger: 'User clicks Sign In or initiates checkout without session',
    rolesAllowed: ['user', 'staff', 'shop_admin', 'super_admin'],
    openedFrom: 'Top navigation bar or cart checkout barrier',
    popupActions: ['Send Email OTP', 'Verify OTP', 'Google Sign In'],
    apiRoutes: ['POST /auth/send-otp', 'POST /auth/verify-otp'],
    tables: ['profiles'],
    sourceFiles: ['frontend/src/pages/AuthPage.tsx', 'frontend/src/App.jsx'],
    protected: false
  },
  {
    id: 'P-WALLET-TOPUP',
    type: 'popup',
    name: 'Digital Wallet Top-Up Sheet',
    pathOrTrigger: 'User clicks Top Up Balance in Wallet',
    rolesAllowed: ['user'],
    openedFrom: 'Campus Wallet view',
    popupActions: ['Select amount', 'Choose gateway', 'Initiate checkout'],
    apiRoutes: ['POST /wallet/topup', 'POST /wallet/topup/paytm'],
    tables: ['wallets', 'wallet_transactions'],
    sourceFiles: ['frontend/src/App.jsx', 'frontend/src/components/VFoodsUserDashboard.jsx'],
    protected: 'not instrumented'
  },
  {
    id: 'P-ACTIVE-ORDER',
    type: 'popup',
    name: 'Live Order Tracker & Token QR Drawer',
    pathOrTrigger: 'User places order or taps active order status pill',
    rolesAllowed: ['user'],
    openedFrom: 'Top bar active order chip or Orders tab',
    popupActions: ['View status timeline', 'Display Token QR', 'Download receipt'],
    tables: ['orders', 'order_items'],
    realtimeChannels: ['orders'],
    sourceFiles: ['frontend/src/components/LiveOrderTracker.tsx'],
    protected: false
  },
  {
    id: 'P-ORDER-RATING',
    type: 'popup',
    name: 'Meal Feedback & Rating Modal',
    pathOrTrigger: 'Order marked collected by counter staff',
    rolesAllowed: ['user'],
    openedFrom: 'Orders view post-collection',
    popupActions: ['Submit 1-5 star rating', 'Submit feedback text', 'Dismiss'],
    tables: ['item_ratings'],
    sourceFiles: ['frontend/src/App.jsx'],
    protected: false
  },
  {
    id: 'P-MENU-ITEM-FORM',
    type: 'popup',
    name: 'Add / Edit Dish Dialog',
    pathOrTrigger: 'Staff or Admin clicks Add Item or Edit Dish',
    rolesAllowed: ['staff', 'shop_admin', 'super_admin'],
    openedFrom: 'Menu Management tab or Stock list',
    popupActions: ['Enter dish name', 'Set price', 'Toggle veg', 'Set stock qty', 'Upload image'],
    apiRoutes: ['POST /media/upload-menu-image'],
    tables: ['menu_items'],
    storageBuckets: ['menu-images'],
    sourceFiles: ['frontend/src/components/forms/MenuItemFormDialog.jsx'],
    protected: false
  },
  {
    id: 'P-MENU-AUDIT-LOG',
    type: 'popup',
    name: 'Menu Audit History Modal',
    pathOrTrigger: 'Admin clicks View Audit Log on menu item',
    rolesAllowed: ['shop_admin', 'super_admin'],
    openedFrom: 'Menu Management screen',
    popupActions: ['Filter price adjustments', 'Filter stock changes', 'Close'],
    tables: ['audit_logs'],
    sourceFiles: ['frontend/src/components/forms/MenuAuditLogModal.tsx'],
    protected: false
  },
  {
    id: 'P-POS-RECEIPT',
    type: 'popup',
    name: 'POS Cashier Receipt Modal',
    pathOrTrigger: 'Cashier confirms counter order checkout',
    rolesAllowed: ['staff', 'shop_admin'],
    openedFrom: 'POS Cashier Register screen',
    popupActions: ['Thermal print receipt', 'Download receipt image', 'Close'],
    tables: ['orders'],
    sourceFiles: ['frontend/src/components/pos/PosPrintReceipt.tsx'],
    protected: false
  },
  {
    id: 'P-CONFIRM-ACTION',
    type: 'popup',
    name: 'Confirmation Alert Dialog',
    pathOrTrigger: 'User triggers irreversible action (clear cart, delete item, revoke code)',
    rolesAllowed: ['user', 'staff', 'shop_admin', 'super_admin'],
    openedFrom: 'Various dashboard actions',
    popupActions: ['Confirm action', 'Cancel'],
    sourceFiles: ['frontend/src/components/ui/confirmation-dialog.jsx'],
    protected: false
  },
  {
    id: 'P-IOS-INSTALL',
    type: 'popup',
    name: 'iOS PWA Install Instructions Modal',
    pathOrTrigger: 'iOS Safari visitor opens V Foods application',
    rolesAllowed: ['user', 'staff', 'shop_admin', 'super_admin'],
    openedFrom: 'App root initialization',
    popupActions: ['View share button instruction', 'Dismiss'],
    sourceFiles: ['frontend/src/components/PwaInstallPrompt.tsx'],
    protected: false
  },
  {
    id: 'P-SPOTLIGHT-SEARCH',
    type: 'popup',
    name: 'Spotlight Quick Search & Launcher',
    pathOrTrigger: 'User presses Ctrl+K or clicks global search bar',
    rolesAllowed: ['user', 'staff', 'shop_admin', 'super_admin'],
    openedFrom: 'Top navigation bar or keyboard shortcut',
    popupActions: ['Search dishes', 'Jump to canteen', 'Filter categories'],
    tables: ['menu_items', 'outlets'],
    sourceFiles: ['frontend/src/components/SpotlightSearch.tsx'],
    protected: false
  },
  {
    id: 'P-SAAS-MORE-NAV',
    type: 'popup',
    name: 'Mobile More Navigation Drawer',
    pathOrTrigger: 'Cashier or Admin taps More tab on mobile devices',
    rolesAllowed: ['staff', 'shop_admin', 'super_admin'],
    openedFrom: 'Mobile bottom navigation bar',
    popupActions: ['Navigate to overflow screen', 'Sign out', 'Close drawer'],
    sourceFiles: ['frontend/src/components/ui/saas-bottom-tab-bar.jsx'],
    protected: false
  },
  {
    id: 'P-ADMIN-CAMPUS',
    type: 'popup',
    name: 'Create / Edit Campus Modal',
    pathOrTrigger: 'Super Admin clicks Add Campus or Edit on campus card',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Campuses directory screen',
    popupActions: ['Enter campus name', 'Set code', 'Set address', 'Save'],
    tables: ['campuses'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'P-ADMIN-OUTLET',
    type: 'popup',
    name: 'Create / Edit Outlet Modal',
    pathOrTrigger: 'Super Admin clicks Add Outlet or Edit on outlet card',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Outlets directory screen',
    popupActions: ['Assign campus', 'Set outlet name', 'Enter UPI VPA', 'Set commission', 'Save'],
    tables: ['outlets'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'P-ADMIN-INVITE',
    type: 'popup',
    name: 'Team Invite Code Generator Modal',
    pathOrTrigger: 'Admin clicks Invite Team Member or Create Invite',
    rolesAllowed: ['shop_admin', 'super_admin'],
    openedFrom: 'Staff Team or Users management screens',
    popupActions: ['Select role', 'Select outlet', 'Generate 8-char code', 'Copy code'],
    apiRoutes: ['POST /admin/invites/create'],
    tables: ['invites'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx', 'frontend/src/pages/shop/ShopAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'P-ADMIN-COUPON',
    type: 'popup',
    name: 'Create / Edit Discount Coupon Modal',
    pathOrTrigger: 'Super Admin clicks Create Coupon',
    rolesAllowed: ['super_admin'],
    openedFrom: 'Coupons & Promos screen',
    popupActions: ['Set coupon code', 'Set discount %', 'Set max cap', 'Set expiry', 'Save'],
    tables: ['coupons'],
    sourceFiles: ['frontend/src/pages/admin/SuperAdminDashboard.tsx'],
    protected: false
  },
  {
    id: 'P-MY-ROLE-PANEL',
    type: 'popup',
    name: 'My Role & Permissions Modal',
    pathOrTrigger: 'User or Staff clicks My Role in profile menu or sidebar footer',
    rolesAllowed: ['user', 'staff', 'shop_admin', 'super_admin'],
    openedFrom: 'Profile dropdown or sidebar profile pill',
    popupActions: ['Review permissions', 'Review restrictions', 'Contact admin', 'Close'],
    sourceFiles: ['frontend/src/components/ui/MyRolePanel.tsx'],
    protected: false
  },
  {
    id: 'P-ROOT-ERROR',
    type: 'popup',
    name: 'Root Error Boundary Fallback Screen',
    pathOrTrigger: 'Unhandled JavaScript runtime exception in React tree',
    rolesAllowed: ['user', 'staff', 'shop_admin', 'super_admin'],
    openedFrom: 'React ErrorBoundary catch handler',
    popupActions: ['Reload application', 'Return to safety home', 'Inspect error details'],
    sourceFiles: ['frontend/src/components/RootErrorBoundary.tsx'],
    protected: false
  }
]

export function getRegistryEntry(id: string): RegistryEntry | undefined {
  return SYSTEM_REGISTRY.find(e => e.id === id)
}

export function getEntriesByType(type: RegistryEntryType): RegistryEntry[] {
  return SYSTEM_REGISTRY.filter(e => e.type === type)
}
