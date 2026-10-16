# V Foods UI/UX Changelog

All changes on branch `ui-ux-modernization` are strictly frontend UI/UX enhancements. No database schema, RLS, storage policies, backend code, payments, wallet logic, webhooks, order-number logic, POS logic, push sending, or authentication are altered.

---

## Entries

### 1. Design System
- **Area**: Design System
- **Commit**: `UI: design system`
- **Files Modified/Created**:
  - `frontend/src/index.css`: Replaced legacy dark orange theme with canonical tokens (Royal Blue `#1E40AF`, Emerald `#059669`, Dark Slate `#0F172A`, Light Gray `#F8FAFC`, White `#FFFFFF`), radius scale (`sm` to `xl`), soft shadow system, 4px spacing scale, type scale, and motion bounds.
  - `frontend/tailwind.config.js`: Integrated canonical color scale, typography, and box shadow tokens.
  - `frontend/src/lib/motion.js`: Enforced strict 150ms-250ms motion duration boundaries for state changes with reduced-motion respect.
  - `frontend/src/components/ui/input.jsx`: Built accessible shared Input primitive.
  - `frontend/src/components/ui/badge.jsx`: Built shared Badge component with semantic color variants.
  - `frontend/src/components/ui/error-state.jsx`: Built shared ErrorState component with Lucide icon and retry action.
  - `frontend/src/components/ui/page-header.jsx`: Built shared PageHeader with title, description, and action slot.
  - `frontend/src/components/ui/form-field.jsx`: Built accessible FormField wrapper with label, error, and hint.
  - `frontend/src/components/ui/confirmation-dialog.jsx`: Built Radix-backed ConfirmationDialog.
  - `docs/DESIGN_SYSTEM.md`: Full specification of tokens, palette, and component rules.
- **Previous Behavior**: Discordant dark theme in `index.css` (`#040407` with orange gradient buttons) clashing with light navy theme in `styles.css`. Missing standard shared primitives (Input, Badge, ErrorState, PageHeader, FormField, ConfirmationDialog).
- **New Behavior**: Single source of truth for design tokens matching V Foods identity. Standardized typography, radii, soft shadows, and motion timings.
- **Rollback Scope**: Reverting commit `UI: design system` restores previous `index.css`, `tailwind.config.js`, and removes added UI primitives without impacting any backend or business logic.

### 2. Global Layout
- **Area**: Global Layout
- **Commit**: `UI: global layout`
- **Files Modified/Created**:
  - `frontend/src/components/ui/saas-bottom-tab-bar.jsx`: Built mobile 5-tab bottom navigation with More sheet for SaaS roles.
  - `frontend/src/pages/staff/ShopStaffDashboard.tsx`: Integrated `SaasBottomTabBar` with 4 primary tabs + More sheet; removed mobile drawer dependency.
  - `frontend/src/pages/shop/ShopAdminDashboard.tsx`: Integrated `SaasBottomTabBar` with 4 primary tabs + More sheet for 12 sections.
  - `frontend/src/pages/admin/SuperAdminDashboard.tsx`: Integrated `SaasBottomTabBar` with 4 primary tabs + More sheet for cross-campus console.
  - `frontend/src/saas_dashboard.css`: Implemented keyboard focus auto-hide (`body:has(input:focus, textarea:focus)`), fixed desktop `100dvh` compact sidebar spacing for 1280x720, 1366x768, and 1024x768 landscape viewports, and tablet rail optimizations.
- **Previous Behavior**: Staff, Shop Admin, and Super Admin mobile views relied on a slide-out drawer with 7 to 12 links. Bottom navigation jumped over input fields when virtual keyboards opened. Low-height desktop screens required vertical scrolling inside the sidebar.
- **New Behavior**: Mobile views for all roles have fixed headers and clean 5-tab bottom navigation bars (primary actions + More sheet). Virtual keyboard focus cleanly hides bottom navigation bars. Fixed desktop sidebar at 100dvh with zero scroll leak across all target desktop resolutions.
- **Rollback Scope**: Reverting commit `UI: global layout` restores previous sidebar drawer behavior and CSS rules without touching business logic or data layers.
### 3. User Experience
- **Area**: User Experience
- **Commit**: `UI: user experience`
- **Files Modified/Created**:
  - `frontend/src/components/VFoodsUserDashboard.jsx`: Equal height food cards with flex containers, 2-line clamped titles (`-webkit-line-clamp: 2`), 1-line truncated outlet name, bottom-aligned price & add actions, high-contrast Veg/Non-Veg badges with tooltip/accessible labels, Sold Out badge overlay, image load fallback, and EmptyState for empty search results and empty explorer filter selections.
  - `frontend/src/components/ItemDetailBottomSheet.tsx`: Bounded drawer animation to 220ms ease-out, accessible full keyboard and ESC trap, accessible Add button labels and clean Dark Slate/Royal Blue design tokens.
  - `frontend/src/components/LiveOrderTracker.tsx`: Bounded order stepper animation to 220ms ease-out with zero bounce.
  - `frontend/src/styles.css`: Updated `.vfoods-filter-pill-group` and `.vfoods-right-filters-scroll` for single-row horizontal swiping on mobile with hidden scrollbars, `white-space: nowrap`, and `flex-shrink: 0`.
- **Previous Behavior**: Food card titles could wrap arbitrarily causing uneven card heights in grids; out-of-stock items had no visual overlay on card thumbnails; filter pills could wrap onto 2 lines on narrow mobile viewports; spring animations had bounce overshoots.
- **New Behavior**: Uniform card grid with aligned prices and action buttons; unambiguous Sold Out overlays and Unavailable disabled buttons; single-line horizontally scrollable filter chips; crisp 220ms motion transitions; empty states with clear recovery guidance.
### 4. Shop Staff
- **Area**: Shop Staff
- **Commit**: `UI: shop staff`
- **Files Modified/Created**:
  - `frontend/src/pages/staff/ShopStaffDashboard.tsx`: Added calm highlight styling for incoming placed orders (< 3 min) in the Live Orders table (`boxShadow: inset 3px 0 0 #2563EB`, soft blue tint, and `NEW` badge) and KDS Kanban column (`border: 1.5px solid #3B82F6` and `NEW` badge); modernized counter stock availability with an accessible 1-tap pill toggle (`aria-pressed`, emerald/slate status dot, and instant label).
  - `frontend/src/components/pos/PosCounterScreen.tsx`: Enforced 2-line title min-height on product cards for clean grid row alignment; maintained exact transaction flow, quick sale toggle, cash change calculation, and thermal receipt/KOT dialogs.
- **Previous Behavior**: Incoming placed orders had the same visual weight as older pending orders, requiring staff to scan elapsed times manually; stock availability buttons lacked distinct indicator dots and accessibility aria attributes; product titles with single lines caused misaligned pricing rows in the POS grid.
- **New Behavior**: New placed orders (< 3 mins) feature a calm Royal Blue highlight and badge without distracting flashing; stock availability is a clear 1-tap accessible pill with live status dot; POS product cards have aligned price rows across varying title lengths.
### 5. Shop Admin
- **Area**: Shop Admin
- **Commit**: `UI: shop admin`
- **Files Modified/Created**:
  - `frontend/src/pages/shop/ShopAdminDashboard.tsx`: Added clear visual separation between "Things to act on (Actionable alerts requiring immediate staff/inventory response)" and "Things to check (Informational operational review: compliance, settlements)"; integrated TanStack-powered `DataTable` with live search, column sorting, pagination, and readable row density across menu items, staff rosters, and financial audit logs.
  - `frontend/src/components/analytics/ShopAnalyticsChart.jsx`: Themed 7-day revenue trend (Royal Blue `#1E40AF` gradient) and daily order volume (Emerald `#059669` bars) charts; replaced literal color labels with authentic 7-day metric summaries.
- **Previous Behavior**: Overview mixed immediate actionable emergencies with routine operational checks; analytics charts displayed static color names ("Royal Blue", "Emerald") rather than real metrics.
- **New Behavior**: Structured hierarchy separating high-urgency alerts from routine administrative reviews; informative 7-day turnover and order volume summary badges on charts; clean, paginated, sortable data tables with empty states.
### 6. Super Admin
- **Area**: Super Admin
- **Commit**: `UI: super admin`
- **Files Modified/Created**:
  - `frontend/src/pages/admin/SuperAdminDashboard.tsx`: Added amber exception alert badges in the Master Outlet Registry table for offline/closed kitchens (`<AlertTriangle /> Offline`); integrated multi-outlet telemetry with search, sort, and pagination.
  - `frontend/src/components/admin/OutletHierarchyAndComparison.jsx`: Refined Cross-Outlet Turnover Comparison chart header with live aggregated platform volume in place of static placeholders; verified 3-tier expandable tree navigation (Outlet -> Shop Admin -> Shop Staff) using canonical tokens.
- **Previous Behavior**: Offline or closed outlets in the master registry had no visual exception alert; comparison chart headers had generic static labels ("Control Tower").
- **New Behavior**: Outlets that are closed or offline immediately flag an exception warning in the master registry table; turnover comparison header reflects live aggregate volume; governance tree cleanly visualizes the 3-tier operational hierarchy.
### 7. Landing Page
- **Area**: Landing Page
- **Commit**: `UI: landing page`
- **Files Modified/Created**:
  - `frontend/src/pages/landing/WelcomePage.tsx`: Removed heavy Three.js WebGL canvas components (`CampusCanvas3D`, `OrderFlow3DVisualization`) reducing landing chunk size from 658.54 kB to 113.63 kB (83% decrease in JS payload); replaced with authentic dual-phone device frame showcase using real screenshots (`user-menu-veg.webp`, `user-order-tracking-ready.webp`); implemented a responsive 4-step real-time order lifecycle; added a dedicated PWA installation section with direct Android/Desktop 1-tap install and interactive iOS "Add to Home Screen" modal guide (`IosInstallModal`).
- **Previous Behavior**: Landing page loaded heavy Three.js WebGL canvas animations in the hero and order flow sections, resulting in a large 658 kB initial chunk and GPU rendering overhead; lacked clear PWA installation instructions for Android and iOS users.
- **New Behavior**: Lightweight 113 kB landing page chunk with instant first contentful paint; authentic app screenshots in tilted phone frames; structured 4-step lifecycle; dedicated PWA install section with native browser install trigger and iOS Safari guide modal.
- **Rollback Scope**: Reverting commit `UI: landing page` restores prior 3D canvas components and navigation links without impacting app dashboards, authentication, or database records.
