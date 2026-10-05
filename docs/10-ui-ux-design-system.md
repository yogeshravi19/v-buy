# 10 — UI/UX Design System & GUI Polish Engine

This document catalogs the UI/UX design patterns, interactive micro-interactions, and visual components implemented to give V Foods a premium, state-of-the-art mobile feel.

---

## 1. Skeleton Shimmer Screens (Instant Perceived Performance)

* **Components**:
  * `MenuCardSkeleton.tsx` (`frontend/src/components/skeletons/MenuCardSkeleton.tsx`)
  * `OutletCardSkeleton.tsx` (`frontend/src/components/skeletons/OutletCardSkeleton.tsx`)
* **What It Does**:
  * Displays pulsing gray placeholder blocks that match the exact shape of menu items (veg badge, title, price, image thumbnail, add button) while remote data loads.
* **Why It Was Added**:
  * Eliminates layout shifting (Cumulative Layout Shift) when content loads.
  * Replaces clunky circular spinners with smooth, native-app-like loading states.
  * Makes the app feel 3x faster on slow hostel Wi-Fi and crowded mobile networks.

---

## 2. Step-by-Step Live Order Tracker

* **Component**: `LiveOrderTracker.tsx` (`frontend/src/components/LiveOrderTracker.tsx`)
* **What It Does**:
  * Renders an interactive 4-step progress timeline:
    1. **Order Placed**: Blue glow with clock icon.
    2. **Cooking & Prep**: Amber pulse with chef hat icon.
    3. **Ready at Counter**: High-contrast emerald glow with audio chime + vibration buzzer.
    4. **Collected**: Clean checkmark state.
  * Pinned automatically to the top of the student home screen whenever an order is in progress.
  * Includes a one-tap **"Pass QR"** button to present the scannable counter token.
* **Why It Was Added**:
  * Eliminates student counter anxiety: students know whether food is still on the stove or ready on the counter, preventing physical crowding around the canteen pickup window.

---

## 3. Spotlight Quick Search (`⌘K` / `Ctrl+K`)

* **Component**: `SpotlightSearch.tsx` (`frontend/src/components/SpotlightSearch.tsx`)
* **What It Does**:
  * A full-screen dialog triggered via:
    * Desktop hotkey: `⌘K` on Mac or `Ctrl+K` on Windows/Linux.
    * Mobile: Tapping the "⌘K All Canteens" badge in the search bar.
  * Instant fuzzy search across **all 13 campus outlets simultaneously**.
  * Shows:
    * Dish Name & Price.
    * Veg / Non-Veg badge.
    * Which canteen serves it (Gazebo, AB3, North Square, etc.).
    * One-tap **"Add"** button with tactile haptic feedback.
    * Quick toggle: **"Veg Only"** filter.
* **Why It Was Added**:
  * Solves the primary campus food question: *"Where can I get Cold Coffee or Samosa right now without checking 13 menus one by one?"*

---

## 4. Mobile Bottom Sheet Drawer

* **Component**: `ItemDetailBottomSheet.tsx` (`frontend/src/components/ItemDetailBottomSheet.tsx`)
* **What It Does**:
  * A smooth, iOS-style swipeable drawer powered by Framer Motion spring physics.
  * Slides up from the bottom of the screen with a swipe-down drag handle.
  * Displays:
    * High-resolution dish photography.
    * Veg/Non-Veg indicator and meal category tag.
    * Prep time estimate (e.g. *5–8 mins prep*), calorie count (*~240 kcal*), and freshness badge.
    * Stepper quantity selector (`- 1 +`).
    * Full-width "Add to Tray" button with live price calculation.
* **Why It Was Added**:
  * 95%+ of students use mobile phones. Standard boxy centered modal popups feel like legacy desktop websites; bottom drawers provide a natural thumb-friendly native app experience.

---

## 5. Web Haptics Engine (`useWebHaptics`)

* **Hook**: `useWebHaptics.ts` (`frontend/src/hooks/useWebHaptics.ts`)
* **What It Does**:
  * Utilizes the native HTML5 `navigator.vibrate()` API with graceful fallbacks.
  * Provides distinct tactile patterns:
    * **`tap` (10ms)**: Light click when adding a dish to the cart or tapping quantity steppers.
    * **`success` (20ms-40ms-20ms)**: Double-beat affirmation when an order is placed.
    * **`ready` (50ms-50ms-100ms)**: Attention-grabbing pulse when the kitchen marks the token ready for pickup.
    * **`error` (80ms-40ms-80ms)**: Warning buzz for insufficient wallet balance or stock-out.
* **Why It Was Added**:
  * Gives the browser-based PWA the physical tactile responsiveness of native iOS and Android apps without requiring a 100MB app-store download.

---

## 6. KDS Ticket Aging Badges (Kitchen Staff Dashboard)

* **Implementation**: `getAgingBadge()` in `ShopStaffDashboard.tsx`.
* **What It Does**:
  * Automatically calculates elapsed prep time and changes ticket border & badge colors:
    * **Green (`#ECFDF5`)**: < 5 minutes in queue (Fresh ticket).
    * **Amber (`#FFFBEB`)**: 5–10 minutes in queue (Standard cooking window).
    * **Flashing Red (`#FEF2F2`)**: > 10 minutes in queue (Delayed order alert).
* **Why It Was Added**:
  * Canteen kitchens during break rushes are loud and hectic. Kitchen staff can spot delayed tickets from 10 feet away and prioritize older tickets without touching the screen.

---

## 7. Night Canteen OLED Dark Theme

* **Design**: True deep black backgrounds (`#090D16`), subtle slate borders (`#1E293B`), and glowing emerald/blue accents.
* **Why It Was Added**:
  * Campus night canteens run from **10:00 PM to 1:30 AM**. Students ordering from dark dorm rooms get an eye-friendly, battery-saving dark interface.
