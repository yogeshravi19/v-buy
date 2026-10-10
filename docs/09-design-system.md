# V Foods Shared Design & Motion System

A complete reference for the tokens, motion rules, and shared component system across all four V Foods dashboards (User, Shop Staff, Shop Admin, and Super Admin).

---

## 1. Brand & Semantic Color Tokens

The visual foundation uses four primary brand families without unnecessary colors: Royal Blue, Emerald, Dark Slate, and Light Gray.

- **Primary / Royal Blue (`#1E40AF`, tints `#3B82F6`, `#DBEAFE`, `#EFF6FF`)**: Used for platform branding, active navigation indicators, key primary actions, and order progress.
- **Success / Emerald (`#059669`, `#10B981`, `#D1FAE5`, `#ECFDF5`)**: Used for positive states, "Ready for Pickup", "Open", wallet positive credits, and active inventory status.
- **Surface (`#FFFFFF`)**: Base clean background for cards, modals, sheets, and active tabs.
- **Surface-Raised (`#F8FAFC`, `#F1F5F9`)**: Subdued secondary background for screen headers, table zebra fills, and inactive category chips.
- **Text-Primary (`#0F172A`)**: High-contrast, dark slate typography for headings, titles, prices, and token IDs.
- **Text-Muted (`#64748B`, `#94A3B8`)**: Calm secondary slate for subtitles, metadata timestamps, descriptions, and helper hints.
- **Warning (`#D97706`, `#FEF3C7`)**: Warm amber for "Preparing", pending actions, and low-stock alerts.
- **Danger (`#DC2626`, `#FEE2E2`)**: Calm red reserved strictly for real errors, destructive actions (e.g., removing a staff member), and closed kitchen status.

---

## 2. Corner Radius Scale

All components follow a single, coherent rounding scale:

- **Cards & Modals (`16px` to `20px` / `rounded-card`, `rounded-modal`)**: Food item cards, bottom drawer sheets, KPI cards, table containers, and confirmation dialogs.
- **Buttons & Form Inputs (`10px` to `12px` / `rounded-btn`, `rounded-input`)**: Action buttons, search fields, text boxes, and dropdown menus.
- **Chips, Pills & Badges (`9999px` / `rounded-chip`, `rounded-full`)**: Order status badges, category chips, vegetarian indicators, and count pills.

---

## 3. Shadows & Elevation

Only two soft, realistic shadow levels are used across the entire application:

- **Soft Base Shadow (`shadow-soft` / `0 2px 10px -2px rgba(15,23,42,0.06), 0 1px 3px -1px rgba(15,23,42,0.04)`)**: Default calm elevation for cards, table wrappers, and sidebar panels.
- **Floating Element Shadow (`shadow-floating` / `0 10px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.06)`)**: Reserved for elevated floating bottom sheets (vaul), toasts (sonner), and dropdown overlays.

---

## 4. Typography & Numerals

- **Font Family**: Plus Jakarta Sans (`@fontsource-variable/plus-jakarta-sans`), a friendly, modern geometric sans self-hosted locally without third-party CDN trackers.
- **Tabular Numerals (`font-variant-numeric: tabular-nums`)**: Applied universally to wallet balances, prices, order numbers, countdown timers, and ticket counters so digits never jitter as values update.
- **Page Title**: `20px` to `24px`, bold (`font-weight: 700`), slate-900.
- **Section Header**: `15px` to `17px`, semi-bold (`font-weight: 600`), slate-800.
- **Primary Number / Metric**: `22px` to `28px`, extra-bold (`font-weight: 800`), tabular numerals.
- **Body Text**: `13px` to `14px`, regular or medium (`font-weight: 400`/`500`), slate-700.
- **Caption & Meta**: `11px` to `12px`, slate-500.

---

## 5. Motion Rules & Tokens

All transitions are centralized in `src/lib/motion.ts` and wrap rendering only. Motion never delays, blocks, or alters database operations or realtime event subscriptions.

- **Durations**:
  - **Micro (`100ms` to `150ms`)**: Button presses, hover states, checkbox toggles, and badge bumps.
  - **Standard (`200ms` to `250ms`)**: Page tab transitions, card state updates, and menu item drawer opens.
  - **Emphasis (`300ms` to `400ms`)**: Order status transitions ("Ready"), drawer entries, and dialog appearances.
- **Easing Curves**:
  - **Entering**: Deceleration curve (`easeOut` / `[0, 0, 0.2, 1]`) for elements entering the screen.
  - **Leaving**: Acceleration curve (`easeIn` / `[0.4, 0, 1, 1]`) for elements exiting.
  - **Sheets & Modals**: Spring physics (`stiffness: 300, damping: 30`) for natural, tactile gestures.
- **Allowed Attributes**:
  - Animate only `transform` (scale, translate) and `opacity`.
  - Never animate `width`, `height`, `top`, or `left` directly to maintain 60fps GPU performance on mobile devices.
- **List Staggering**:
  - Items enter with a maximum stagger of `30ms` per item, capped at `300ms` total for the entire list.
- **Reduced Motion Support**:
  - Centralized `<MotionConfig reducedMotion="user">` at application root.
  - Users with `prefers-reduced-motion: reduce` receive instantaneous, non-animated state changes without layout shifts.

---

## 6. Shared Component Library

Built once in `src/components/ui/` and reused across all four dashboards:

- **Button (`Button`)**: Features micro-scale press feedback (`scale: 0.97`) with semantic variants (`primary`, `secondary`, `outline`, `ghost`, `danger`, `success`).
- **Card (`Card`)**: Standardized with `rounded-card`, calm border, and `shadow-soft`.
- **StatusBadge (`StatusBadge`)**: Fully rounded chip mapping routine statuses (`placed`, `preparing`, `ready`, `collected`, `open`, `closed`) to soft background tints and calm text colors.
- **EmptyState (`EmptyState`)**: Clean, human-designed empty container featuring a single Lucide icon and one clear, helpful sentence (used for empty cart, zero active orders, or empty search queries).
- **Skeleton (`Skeleton`, `DashboardSkeleton`)**: Exact structural wireframe placeholders matching real cards, tables, and headers, crossfading into loaded content with zero layout jumps.
- **Sheet (`Sheet`)**: Built with Vaul for smooth swipeable bottom sheets on mobile devices (used for cart review, item customization, and order details).
- **Toast (`Toast`, Sonner `toast`)**: Stackable, quiet notification toasts styled in white with soft borders and calm affirmative copy.
- **Stepper (`Stepper`)**: Animated 4-step progress tracker (Placed -> Preparing -> Ready -> Collected) featuring progressive connector line fill and gentle emerald emphasis on the "Ready" state.
- **SoundToggle (`SoundToggle`)**: Web Audio API two-note synthesized order chime toggle that respects browser autoplay policies, preserves user preferences, and avoids external audio file dependencies.
