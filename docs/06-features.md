# Feature Catalog: Active & Retired Features

A plain-English overview of the active features built into V-BUY, along with features that have been retired.

---

## Active Features Currently Built

### 1. 1-Tap Reorder ("My Usual")
- **What it does**: Saves time by showing the student's favorite or most recent completed meal directly at the top of the browse screen.
- **How it works**: Students can tap "Reorder My Usual" to load the entire meal back into their cart with one tap. It checks live canteen stock first to make sure every item is currently available before checkout.

### 2. Dish Ratings & Reviews
- **What it does**: Lets students submit 1-to-5 star ratings for individual food dishes after picking up their order.
- **How it works**: Verified ratings update the average score and review count shown next to each dish. High-rated dishes receive a "Popular" badge and appear higher when students sort by rating.

### 3. Group Ordering
- **What it does**: Allows groups of friends or classmates to pool their food choices into a single order.
- **How it works**: One student starts a group cart and shares a short 4-digit code (such as `VBUY-42`). Friends join on their own phones, add dishes, and the host pays for the combined cart in one transaction. The kitchen receives one consolidated ticket with all items clearly grouped.

### 4. Scheduled Pickup Time Slots
- **What it does**: Helps students avoid long lunch lines by scheduling their food pickup for a specific time window.
- **How it works**: When ordering, students can choose "Order Now" or select an upcoming 15-minute slot (such as 1:00 PM – 1:15 PM). Each slot has a strict maximum order cap so the kitchen is never overwhelmed at once.

### 5. Coupons & Promo Codes
- **What it does**: Lets students apply special promotional codes during checkout to receive flat or percentage discounts.
- **How it works**: Students enter an active code (like `CAMPUS10`). The discount is subtracted from what the student pays, while the canteen owner's payout remains protected based on official item prices.

### 6. Live Kitchen Display System (KDS)
- **What it does**: Replaces paper kitchen slips with a clean, color-coded digital screen for canteen staff.
- **How it works**: Orders appear on the kitchen tablet in real time using Supabase WebSockets. Staff tap buttons to advance orders through "Placed", "Preparing", and "Ready" columns without ever printing paper tickets.

### 7. Digital Token Pass & QR Pickup
- **What it does**: Eliminates shouting names or crowding counter registers.
- **How it works**: Every order generates an easy-to-read 4-digit token number and an animated QR pass. Students simply show their screen at the counter, staff verify it, and hand over the meal.

### 8. Dual-Path Stock Management & "86" Sold-Out Toggle
- **What it does**: Keeps the online menu accurate so students never order food that the kitchen cannot cook.
- **How it works**: The database automatically decreases stock numbers as orders come in. If ingredients run out unexpectedly, kitchen staff can tap the red "86" button to instantly remove the item from the student menu.

---

## Features Marked as Removed

### 1. Student Referral Program (Removed)
- **Status**: **REMOVED**
- **Reason**: The referral system created unneeded complexity in the wallet ledger and introduced potential for referral code gaming on campus. To keep financial accounting completely clean and trustworthy, referrals have been retired.

### 2. Loyalty Milestones & Streak Points (Removed)
- **Status**: **REMOVED**
- **Reason**: Tracking visit streaks across different independent canteens caused accounting disputes regarding which shop funded free reward meals. To maintain simple, straightforward pricing, loyalty streaks have been retired in favor of direct coupon codes.
