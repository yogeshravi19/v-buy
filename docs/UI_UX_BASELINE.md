# V Foods UI/UX Baseline Specification

- **Baseline Branch**: `main` (Render Deployed Production Branch)
- **Baseline Commit SHA**: `30f3202bce6c6437f1abbe2ff4d94650e70ebf25`
- **Modernization Branch**: `ui-ux-modernization` (created from `main`)
- **Date & Time**: 2026-10-16 13:00 IST
- **App Name**: V Foods
- **Roles**: User, Shop Staff, Shop Admin, Super Admin

---

## 1. Frontend Architecture & Technology Stack

The application is structured as a single-page application (SPA) with multi-dashboard routing based on user session role:

- **Build Tool & Runtime**: Vite 8.3.1, React 19.2.8, TypeScript ~6.0.2 / JSX
- **CSS Architecture**:
  - `@tailwindcss/postcss` 4.3.3
  - Custom CSS Design Tokens: `frontend/src/styles.css` (primary light theme & components) and `frontend/src/saas_dashboard.css` (SaaS administration & POS consoles)
  - Legacy dark CSS layer in `frontend/src/index.css` (slated for cleanup to align with unified palette)
- **Server Communication & Caching**:
  - `@tanstack/react-query` 5.103.2 (Stale-While-Revalidate caching for campus food court high-concurrency)
  - `@supabase/supabase-js` 2.117.2 (Realtime Postgres subscriptions for menu items, orders, and authentication)
- **Component Libraries & Primitives**:
  - `@radix-ui/react-*` (Dialog, DropdownMenu, Select, Switch, Tabs, Tooltip)
  - `lucide-react` (Single stroke width icons)
  - `framer-motion` (Spring physics & animated bottom sheets)
  - `vaul` (Drawer primitives)
  - `sonner` & custom `react-hot-toast` wrappers
- **PWA Capabilities**:
  - Native service worker `public/sw.js` with app shell precaching and runtime menu image cache
  - `usePwa` hook and `PwaInstallPrompt` suite with custom iOS Add to Home Screen modal
- **Thermal Printing & Receipts**:
  - `jspdf` 4.2.1, `html2canvas` 1.4.1, and ESC/POS raw text generation for 58mm and 80mm thermal receipt printers.

---

## 2. Production Bundle Baseline Metrics

Compiled via `npm run build` (`vite build`) on Node.js v24:

- **Modules Transformed**: 3,343
- **Build Duration**: 27.25s
- **Primary Chunks**:
  | Chunk | Uncompressed Size | Gzipped Size | Purpose |
  | :--- | :--- | :--- | :--- |
  | `dist/assets/index-lCDno-Vi.js` | 1,208.15 kB | 351.00 kB | Main Application Bundle & Core Logic |
  | `dist/assets/index-DNFbLVko.css` | 330.37 kB | 52.05 kB | Global & Component Styles |
  | `dist/assets/WelcomePage-CIokaqle.js` | 658.54 kB | 165.52 kB | Landing & Welcome Page |
  | `dist/assets/card-ChuKF3GZ.js` | 412.71 kB | 118.04 kB | Shared Card Primitives |
  | `dist/assets/html2canvas-Dn6bw578.js` | 199.49 kB | 46.77 kB | Receipt Canvas Rasterizer |
  | `dist/assets/PosCounterScreen-Dq32Pbh4.js`| 179.66 kB | 51.33 kB | Walk-in Counter POS Console |
  | `dist/assets/ShopAdminDashboard-gpby3XcT.js` | 110.14 kB | 24.46 kB | Franchise / Shop Owner Dashboard |
  | `dist/assets/VFoodsUserDashboard-BzgTpFKz.js` | 75.19 kB | 21.72 kB | Customer / Student Mobile Dashboard |
  | `dist/assets/SuperAdminDashboard-CIiEJLFW.js` | 75.07 kB | 16.58 kB | Campus Operations Super Admin |
  | `dist/assets/ShopStaffDashboard-FfE7gPAY.js` | 57.06 kB | 12.29 kB | Kitchen Staff Live Order Queue |

---

## 3. Route Matrix & Dashboard Navigation

Routing is handled via Browser History API (`pushState` / `popstate`) with route validation and cross-role protection:

- `/welcome`: Public landing page showcasing platform architecture and PWA download guide.
- `/`: Primary entry point. If unauthenticated, displays unified `AuthScreen`. If authenticated as User, renders `VFoodsUserDashboard` (Browse Tab).
- `/orders`: User order history and live status tracking.
- `/wallet`: User prepaid balance, top-up modal, and recent transactions.
- `/cart`: User pre-order tray and checkout sheet.
- `/profile`: User account details, notification toggles, and logout.
- `/staff` & `/staff/pos`: Shop Staff live kitchen queue and walk-in counter billing.
- `/shop-admin` & `/shop-admin/*`: Shop Admin overview, live menu management, order analytics, and team members.
- `/admin` & `/admin/*`: Super Admin cross-campus overview, outlet hierarchy, global audit logs, and emergency event mode.

---

## 4. Current Design Tokens & Palette

The active production app operates primarily under a light navy/slate and royal blue system defined in `styles.css`:

```css
:root {
  /* Typography */
  --font-body:    'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-heading: 'Outfit', system-ui, -apple-system, sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  /* Brand Palette */
  --bg-main:           #F8FAFC; /* Light Gray */
  --bg-surface:        #FFFFFF; /* Pure White */
  --bg-navy-dark:      #0B192C; /* Dark Slate / Navy */
  --bg-navy-header:    #0F172A;
  --bg-navy-card:      #1E293B;
  --blue-primary:      #1E40AF; /* Royal Blue */
  --blue-hover:        #1D4ED8;
  --success:           #059669; /* Emerald */
  --warning:           #D97706; /* Amber */
  --danger:            #DC2626; /* Crimson */

  /* Radii */
  --radius-card:       18px;
  --radius-btn:        11px;
  --radius-chip:       9999px;

  /* Shadows */
  --shadow-soft:       0 2px 10px -2px rgba(15,23,42,0.06), 0 1px 3px -1px rgba(15,23,42,0.04);
  --shadow-float:      0 12px 28px -4px rgba(15,23,42,0.1), 0 4px 10px -2px rgba(15,23,42,0.05);
}
```

*Note on discrepancy*: `frontend/src/index.css` and `frontend/tailwind.config.js` currently hold an older dark-mode orange theme (`#040407` with `#f97316`) that clashes with the official Royal Blue and Emerald palette. Consolidating this into a single source of truth is Phase 1's primary objective.

---

## 5. Baseline Screenshots (Captured with Isolated QA Test Accounts)

All baseline screenshots are captured using automated Playwright sessions with synthetic test accounts (`qa+<role>@example.test`) containing zero real student or financial data:

### Auth & Public Screens
- **Authentication (Desktop 1280x800)**: `docs/assets/baseline/00-auth-desktop.png`
- **Authentication (Mobile 375x667)**: `docs/assets/baseline/00-auth-mobile.png`
- **Welcome / Landing Page**: `docs/assets/baseline/01-landing-welcome.png`

### User Dashboard
- **Browse Outlets (Desktop)**: `docs/assets/baseline/02-user-browse.png`
- **Browse Outlets (Mobile)**: `docs/assets/baseline/02-user-browse-mobile.png`
- **User Orders**: `docs/assets/baseline/03-user-orders.png`

### Shop Staff Dashboard
- **Live Kitchen Queue (Desktop)**: `docs/assets/baseline/06-shop-staff-queue.png`
- **Live Kitchen Queue (Mobile)**: `docs/assets/baseline/06-shop-staff-queue-mobile.png`
- **Walk-in Counter POS**: `docs/assets/baseline/07-shop-staff-counter-pos.png`

### Shop Admin Dashboard
- **Overview & Metrics (Desktop)**: `docs/assets/baseline/08-shop-admin-overview.png`
- **Overview & Metrics (Mobile)**: `docs/assets/baseline/08-shop-admin-overview-mobile.png`

### Super Admin Dashboard
- **Campus Multi-Outlet Overview (Desktop)**: `docs/assets/baseline/09-super-admin-overview.png`
- **Campus Multi-Outlet Overview (Mobile)**: `docs/assets/baseline/09-super-admin-overview-mobile.png`
