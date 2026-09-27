# The Four User Roles

A plain-English guide to who uses V-BUY and what each role is permitted to see and do.

---

## Overview

V-BUY serves four different groups of people on campus. Each group has their own dedicated view and access level:

1. **Super Admin**: Campus authorities overseeing all food courts and stalls.
2. **Shop Admin**: Franchisees or canteen owners managing a specific food counter.
3. **Shop Staff**: Cooks, kitchen helpers, and counter cashiers preparing and handing out food.
4. **Student**: Customers ordering meals, managing their wallet, and collecting food.

---

## 1. Super Admin (Campus Administrator)

- **Who they are**: University dining officials and platform managers who oversee all campus canteens and festival stalls.
- **How accounts are created**: Pre-configured in the database or promoted directly by existing administrators.
- **What they can see**:
  - A master dashboard showing all 13+ canteens, food courts, and temporary festival stalls.
  - Campus-wide sales numbers, total meals served, platform fees collected (5%), and net shop payouts.
  - Complete history of user wallets, payment attempts, and system activity logs.
- **What they can do**:
  - Add new canteens and food stalls to the campus network.
  - Create secure invite links to onboard new canteen owners and administrators.
  - Toggle campus festival mode on or off to feature special event stalls.
  - Export financial reports for university management and accounting.

---

## 2. Shop Admin (Canteen Owner)

- **Who they are**: The business owner or franchisee running one specific canteen on campus (such as Gazebo C1 or Dakshin Chitra).
- **How accounts are created**: Invited through a private invite link created by the Super Admin.
- **Connected by Outlet ID**: Every shop has a unique code called an `outlet_id` (such as `gazebo_c1`). This ID connects the owner strictly to their own stall.
- **What they can see**:
  - Daily, weekly, and monthly sales and earnings for their own shop only.
  - Customer ratings and feedback left for their stall's dishes.
  - Full menu catalog with prices, categories, and inventory stock counts.
  - The team of kitchen cooks and counter staff assigned to their counter.
- **What they can do**:
  - Add new dishes, adjust prices, or edit descriptions for their own stall.
  - Invite and manage kitchen staff members for their counter.
  - Turn their stall Open or Closed at any time.
  - Set order limits on scheduled pickup time slots so the kitchen is not overwhelmed.

---

## 3. Shop Staff (Kitchen Cooks & Counter Cashiers)

- **Who they are**: The workers who cook food, assemble plates, and hand orders to students at the counter.
- **How accounts are created**: Invited by the Shop Admin or Super Admin to work at a specific counter.
- **What they can see**:
  - The **Kitchen Display System (KDS)**: a live digital screen showing new orders as they arrive, color-coded by urgency.
  - Order details: 4-digit pickup token, dish names, portion counts, and special cooking notes.
  - Current stock inventory levels for their stall's dishes.
- **What they can do**:
  - Advance orders through each step: tap to start **Preparing**, tap when food is **Ready for Pickup**.
  - Scan the student's digital QR pass or check their 4-digit token to tap **Mark Collected**.
  - Adjust portion counts up or down if ingredients change.
  - Tap the red **86** button to mark any dish sold out immediately if an ingredient runs out.

---

## 4. Student (Customer)

- **Who they are**: Students, professors, and campus visitors who order food.
- **How accounts are created**: Self-registration on the login page using mobile phone verification.
- **What they can see**:
  - All open campus canteens and festival stalls with live wait times and menus.
  - Dish photos, prices, vegetarian or non-vegetarian badges, and customer review scores.
  - Their personal prepaid wallet balance and recent spending history.
  - Active order status tracking with live updates and a digital QR collection pass.
- **What they can do**:
  - Top up their prepaid campus wallet using PhonePe (supporting any UPI app or bank card).
  - Add dishes to cart, enter promo discount codes, or choose a scheduled pickup time.
  - Create or join group ordering sessions with friends.
  - Pay for food orders instantly from their wallet balance.
  - Submit 1-to-5 star ratings and reviews for dishes they have picked up.

---

## How Database Security Protects Each Role

V-BUY uses **Row-Level Security (RLS)** built directly into the database:

- **What RLS means**: Instead of relying on a phone app to hide buttons, the database itself refuses to return unauthorized records.
- **No data mixing**: An app screen cannot accidentally display a North Square order on a Gazebo kitchen screen because the database checks the user's `outlet_id` before sending any data.
- **Private student wallets**: Students can only access their own balance and transaction records.
- **Private shop earnings**: Canteen owners can only access financial numbers for their own specific shop ID.
- **Tamper-proof safety**: Even if someone attempts to manipulate network requests in their browser, the database rejects any command outside the user's role.
