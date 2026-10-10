# V-BUY (V FOODS) — MASTER SYSTEM SPECIFICATION & BUSINESS BLUEPRINT
> **The Complete, Single Source of Truth Documentation for Campus Dining & Fast-Pickup Operations**  
> *Consolidated Master Edition: Full Product Vision, Operational Manual, Financial Models, 7% Pricing Architecture, Technical Comparisons, Database Relational Schemas & Startup Legal Compliance*  
> **Version**: 2.5 (Production Consolidated) &bull; **Classification**: Official Company Blueprint

---

# Table of Contents

1. [Executive Summary & Master Vision](#1-executive-summary--master-vision)
2. [The Problem: Why College Dining is Broken](#2-the-problem-why-college-dining-is-broken)
3. [The Solution: How V-Buy Solves Campus Dining](#3-the-solution-how-v-buy-solves-campus-dining)
4. [The Pricing & Payment Model (The 7% Formula)](#4-the-pricing--payment-model-the-7-formula)
5. [Business Model, Unit Economics & Financial Projections](#5-business-model-unit-economics--financial-projections)
6. [The Four Operational Roles & Permissions Matrix](#6-the-four-operational-roles--permissions-matrix)
7. [End-to-End User Journeys & Workflows](#7-end-to-end-user-journeys--workflows)
8. [Comprehensive Functional & UI/UX Feature Catalog](#8-comprehensive-functional--uiux-feature-catalog)
9. [Canteen, Kitchen & POS Operations](#9-canteen-kitchen--pos-operations)
10. [Dual Payment Gateway & Wallet Architecture](#10-dual-payment-gateway--wallet-architecture)
11. [System Architecture & High-Traffic Concurrency Engine](#11-system-architecture--high-traffic-concurrency-engine)
12. [Technology Stack Selection & Deep-Dive Comparisons](#12-technology-stack-selection--deep-dive-comparisons)
13. [Database Architecture & Complete Schema Specification](#13-database-architecture--complete-schema-specification)
14. [Backend APIs, Webhooks & Cryptography](#14-backend-apis-webhooks--cryptography)
15. [Real-Time WebSockets & Notification Engine](#15-real-time-websockets--notification-engine)
16. [Security, Row-Level Isolation (RLS) & Forensic Auditing](#16-security-row-level-isolation-rls--forensic-auditing)
17. [Edge Cases, Error Handling & Failure Recovery](#17-edge-cases-error-handling--failure-recovery)
18. [Campus Physical Infrastructure & Outlet Hierarchy](#18-campus-physical-infrastructure--outlet-hierarchy)
19. [Startup Business Registration & Compliance Roadmap](#19-startup-business-registration--compliance-roadmap)
20. [Operational Implementation Plan & Scalability Roadmap](#20-operational-implementation-plan--scalability-roadmap)
21. [Risks, Mitigations & Core Assumptions](#21-risks-mitigations--core-assumptions)
22. [Master Appendix & Final Reference Calculations](#22-master-appendix--final-reference-calculations)

---

# 1. Executive Summary & Master Vision

### 1.1 What is V-Buy?
**V-Buy** (operating in university campuses under the consumer brand **V FOODS**) is an integrated, high-velocity campus dining operating system, digital prepaid wallet, and kitchen management platform custom-engineered for collegiate food courts, canteens, and festival grids.

The platform eliminates physical lines, eliminates cashier errors, and eradicates payment terminal timeouts by allowing students and faculty to pre-order food directly from lecture halls, pay instantly through a closed-loop digital campus wallet, and pick up hot, packaged meals from express counter shelves in under **2 minutes** using cryptographically verified QR passes and token chits.

### 1.2 Overarching Philosophy
1. **Zero-Queue Campus Dining**: Break times are 10 to 15 minutes. Students should spend those minutes eating, socializing, and resting—not waiting in a packed 30-minute queue.
2. **Pickup-Only, Zero-Driver Model**: Unlike commercial food delivery apps (Swiggy, Zomato) that charge heavy delivery fees and cannot navigate gated college hostels, V-Buy is strictly customer pickup. Students are already on campus and walk right past the canteen; our technology ensures their meal is hot and waiting when they arrive.
3. **High-Velocity Infrastructure**: Built to handle massive concurrent traffic spikes when 3,000+ students exit lecture halls simultaneously, featuring sub-20ms wallet checkout, sub-second WebSocket kitchen updates, and in-memory catalog caching.
4. **Fair, Transparent Economics**: A non-extractive pricing model where canteen stall owners keep **100% of their base menu price**, while a small **7% convenience fee** is added to fund the platform (5%) and university facilities (2%).

---

# 2. The Problem: Why College Dining is Broken

### 2.1 The 15-Minute Break Bottleneck
In collegiate institutions (such as VIT Vellore, VIT Chennai, SRM, and other large engineering hubs), between 25,000 and 40,000 students move between classes on synchronized timetables. During major break intervals (11:00 AM – 11:15 AM, 1:15 PM – 2:00 PM, and 4:45 PM – 5:00 PM), thousands of hungry students descend upon campus canteens at the exact same minute.

```
                  THE TRADITIONAL CAMPUS LUNCH BOTTLENECK
  
  [Lecture Bell Rings] ──► 3,500+ Students Rush to 13 Canteens
                                      │
                                      ▼
                      [Physical Queue: 20–30 Minutes]
                      • Basement mobile dead zones (UPI fails)
                      • Cashiers shouting order tokens
                      • Paper tickets dropped, torn, or lost
                      • Desired food sells out after 20 mins of waiting
                                      │
                                      ▼
                      [5 Minutes to Gulp Food or Miss Next Class]
```

### 2.2 Core Operational Failure Points
1. **Mobile Network & Gateway Congestion**:
   - Food courts are frequently located on ground floors or basements of academic buildings. When hundreds of students scan merchant UPI QR codes simultaneously, localized cellular towers become congested. Payment gateways time out, OTPs arrive minutes late, and lines freeze.
2. **Cashier Chokepoints & Paper Slip Chaos**:
   - Cashiers must manually key in orders, calculate change, print paper receipts, and shout numbers into a noisy crowd. Slippery counters result in wet, unreadable chits and disputed orders.
3. **Food Sold-Out Disappointments**:
   - Students spend 20 minutes standing in line only to reach the cashier and discover that the meal they wanted is sold out.
4. **Kitchen Food Pilferage & Revenue Leakage**:
   - Without an integrated Kitchen Display System (KDS), canteen operators struggle to track inventory against cash collections. Unrecorded plates, stolen ingredients, and mismatched tickets cost canteen owners 8% to 15% of their daily margin.
5. **Commercial Delivery Incompatibility**:
   - Apps like Swiggy or Zomato are completely unviable for campus lunch: delivery couriers are blocked at university gates, campus addresses are confusing, delivery fees (₹40–₹80) double the cost of a student snack, and delivery times (35–50 minutes) exceed the break duration.

---

# 3. The Solution: How V-Buy Solves Campus Dining

V-Buy transforms the chaotic counter rush into a streamlined, digital-first assembly line:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE V-BUY SOLUTION LIFECYCLE                           │
│                                                                                        │
│   [1. BROWSE & ORDER]         [2. 1-TAP CHECKOUT]    [3. KITCHEN PREP]   [4. 2-MIN PICKUP] │
│   Browse live menus,     ──►  Deducted in <20ms ──►  Ticket lands on ──► Student flashes   │
│   time slots, and stock       from prepaid wallet    digital KDS board;  HMAC QR pass;     │
│   10 mins before class        (or direct Paytm UPI)  cook prepares meal  counter hands tray│
│   ends from lecture hall                             while student walks in under 2 mins   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Pre-Order from Class**: Students view live dish availability, veg/non-veg filters, and preparation queues directly on their phones before leaving the classroom.
2. **Zero-Gateway Campus Wallet**: Orders are funded instantly from a pre-loaded digital campus wallet. Transaction confirmation takes **under 20 milliseconds**, completely bypassing external banking servers and mobile signal latency.
3. **Digital Kitchen Display System (KDS)**: Kitchen staff receive orders on an interactive tablet screen organized by status columns (`Placed` $\to$ `Preparing` $\to$ `Ready`), accompanied by pleasant audio chimes.
4. **Express Counter Handover**: Once marked `Ready`, the student receives an instant notification with an anti-fraud HMAC-signed QR pass and a 3-digit pickup token. Staff verify the pass with a high-speed camera scanner and hand over the meal in seconds. **Zero lines. Zero shouting.**

---

# 4. The Pricing & Payment Model (The 7% Formula)

### 4.1 The Fundamental Pricing Principle
V-Buy operates on a transparent, additive convenience-fee model. **The canteen owner is never penalized or charged a commission on their menu prices.** 

* **Base Food Cost**: The exact price set by the canteen owner on the menu.
* **Additional Charge**: A **7.0% convenience fee calculated directly on the base food cost** is added to the order total.
* **Customer Payment**: Base Food Cost + 7% Additional Charge.

### 4.2 Mathematical Distribution of the 7% Charge
The 7% convenience fee is split into two dedicated allocations:
* **5.0% of Base Food Cost $\to$ V-Buy Platform / Company**: Powers software maintenance, cloud servers, development, customer support, and profit margin.
* **2.0% of Base Food Cost $\to$ College Management / University Administration**: Paid to the university as a dining facilities royalty and campus infrastructure maintenance fund.
* **100.0% of Base Food Cost $\to$ Canteen / Food Stall Owner**: Transferred directly to the merchant. The merchant receives 100% of their posted price.

```
                               ORDER VALUE BREAKDOWN (₹100 BASE ITEM)
                                                │
                                    Total Customer Payment: ₹107
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 │                                                             │
        Base Food Cost: ₹100                                        Additional 7% Charge: ₹7
                 │                                                             │
                 ▼                                              ┌──────────────┴──────────────┐
         CANTEEN OWNER RECEIVES                                 ▼                             ▼
                ₹100.00                                   V-BUY PLATFORM              COLLEGE MANAGEMENT
          (100% of menu price)                            RECEIVES ₹5.00                RECEIVES ₹2.00
                                                        (5% of base value)            (2% of base value)
```

> **CRITICAL RULE**: The 5% and 2% shares are **NOT** deducted from the customer's ₹107 payment. Rather, **7% is added on top of the base food cost**, and that exact 7% additional sum is split into **5% for V-Buy and 2% for the College**. The canteen owner receives 100% of the original ₹100 food price.

### 4.3 Comprehensive Pricing & Split Scenarios

| Menu Item / Basket | Base Food Cost | 7% Convenience Fee | Total Customer Pays | Canteen Receives (100% Base) | V-Buy Receives (5% Base) | College Receives (2% Base) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Samosa & Chai** | ₹40.00 | ₹2.80 | **₹42.80** | ₹40.00 | ₹2.00 | ₹0.80 |
| **Masala Dosa Breakfast** | ₹70.00 | ₹4.90 | **₹74.90** | ₹70.00 | ₹3.50 | ₹1.40 |
| **Standard Lunch Thali** | ₹100.00 | ₹7.00 | **₹107.00** | ₹100.00 | ₹5.00 | ₹2.00 |
| **Chicken Biryani Combo** | ₹150.00 | ₹10.50 | **₹160.50** | ₹150.00 | ₹7.50 | ₹3.00 |
| **Two-Friend Lunch Basket**| ₹250.00 | ₹17.50 | **₹267.50** | ₹250.00 | ₹12.50 | ₹5.00 |
| **Study Group Party Order**| ₹600.00 | ₹42.00 | **₹642.00** | ₹600.00 | ₹30.00 | ₹12.00 |
| **Hostel Floor Bulk Order**| ₹1,200.00 | ₹84.00 | **₹1,284.00** | ₹1,200.00 | ₹60.00 | ₹24.00 |

### 4.4 Why All Three Stakeholders Support This Model
1. **Why Canteen Owners Love It**: On Swiggy or Zomato, restaurants lose 25% to 32% of their gross revenue to platform commissions. On V-Buy, the canteen receives **100% of their base food revenue**. They get digitised operations, zero queue congestion, and higher meal turnover without losing a single rupee of food margin.
2. **Why Students Happily Pay 7%**: On a ₹100 meal, a student pays just ₹7 extra. In return, they save 25 to 30 minutes of standing in a crowded line, guarantee their food is in stock, and pick up a freshly cooked meal in 2 minutes. This is drastically cheaper than commercial food delivery fees (which add ₹50–₹90 per order).
3. **Why College Management Supports It**: The university earns a completely passive **2% royalty on campus-wide dining turnover** (generating ₹30,000 to ₹50,000 daily per campus), while eliminating counter stampedes, noise, and health-code crowd violations.

---

# 5. Business Model, Unit Economics & Financial Projections

### 5.1 Campus Scale Benchmarks (Single Large University)
* **Campus Baseline**: 35,000 enrolled students + 3,000 faculty and administrative staff (e.g., VIT Vellore / Chennai benchmark).
* **Dining Facilities**: 13 permanent canteens/food courts + 20 temporary festival stalls (Riviera / Gravitas).
* **Average Base Order Value (AOV)**: ₹125.00 base food value.
* **Customer Gross Order Value (AOV + 7%)**: ₹133.75.

### 5.2 Daily Revenue Modeling Under Various Adoption Tiers

| Campus Metric | Conservative (20% Adoption) | Target (35% Adoption) | Peak Semester / Fest Days (50% Adoption) |
| :--- | :--- | :--- | :--- |
| **Daily Orders Placed** | 7,000 orders/day | 12,000 orders/day | 18,000 orders/day |
| **Daily Base Food Turnover (GMV)** | ₹8,75,000 / day | ₹15,00,000 / day | ₹22,50,000 / day |
| **Customer Total Payment (Base + 7%)**| ₹9,36,250 / day | ₹16,05,000 / day | ₹24,07,500 / day |
| **Canteen Payout (100% Base)** | ₹8,75,000 / day | ₹15,00,000 / day | ₹22,50,000 / day |
| **V-Buy Platform Take-Rate (5% Base)**| **₹43,750 / day** | **₹75,000 / day** | **₹1,12,500 / day** |
| **College Management Royalty (2% Base)**| **₹17,500 / day** | **₹30,000 / day** | **₹45,000 / day** |
| **Monthly V-Buy Platform Revenue (24 Days)**| **₹10.50 Lakhs / month**| **₹18.00 Lakhs / month**| **₹27.00 Lakhs / month**|
| **Monthly College Royalty (24 Days)** | **₹4.20 Lakhs / month** | **₹7.20 Lakhs / month** | **₹10.80 Lakhs / month**|
| **Annualized Campus Run-Rate (9 Months)**| **₹94.5 Lakhs / year** | **₹1.62 Crores / year** | **₹2.43 Crores / year** |

### 5.3 Additional Revenue Streams
1. **Visiting Festival Stall Onboarding**: During annual cultural and technical festivals (such as Riviera and Gravitas), 20 to 30 outside food vendors set up pop-up stalls. V-Buy charges a **₹1,500 onboarding pass per stall** plus the standard 5% platform take-rate over 4 festival days (adding ₹1.5L – ₹2.5L in pure profit per fest).
2. **Escrow Float Interest Yield**: 35,000 students maintaining an average ₹150 pre-loaded balance in their digital campus wallets generates a rolling **₹52.5 Lakh liquid cash float**. When deposited in bank escrow accounts, this float generates recurring low-risk yield.
3. **Sponsored Brand Placements**: Beverage and snack brands (Red Bull, Paper Boat, Amul, Nestlé) pay monthly sponsorship fees to feature high-converting promotional banners on student mobile screens during 4:00 PM tea time.

---

# 6. The Four Operational Roles & Permissions Matrix

V-Buy partitions user access into four strictly segregated operational tiers using PostgreSQL **Row-Level Security (RLS)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        V-BUY ROLE HIERARCHY TREE                       │
│                                                                        │
│                      [1. SUPER ADMIN PLATFORM]                         │
│                      • Campus GMV & Financial Ledger                   │
│                      • Platform 5% & College 2% Splits                 │
│                      • Festival Mode & Global Outlets                  │
│                                  │                                     │
│                                  ▼                                     │
│                        [2. SHOP ADMIN / OWNER]                         │
│                        • Menu Catalog CRUD & Stock                     │
│                        • Staff 8-char Onboarding Invites               │
│                        • 100% Net Sales Reconciliation                 │
│                                  │                                     │
│                                  ▼                                     │
│                        [3. KITCHEN KDS STAFF]                          │
│                        • Live Kanban Screen & Chimes                   │
│                        • 1-Tap Prep/Ready Ticket Advancer              │
│                        • Rapid Camera QR Code Scanner                  │
│                                  │                                     │
│                                  ▼                                     │
│                        [4. STUDENT / CUSTOMER]                         │
│                        • Browse Outlets & Time Slots                   │
│                        • 1-Tap Wallet Checkout (<20ms)                 │
│                        • Digital QR Pass & Order Tracker               │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Role Capability & Security Matrix

| Role | Interface | Permitted Actions | Data Isolation Boundary (RLS) |
| :--- | :--- | :--- | :--- |
| **Student / Customer** | Mobile Progressive Web App (PWA) | Browse menus, filter veg/non-veg, load wallet, checkout, track live tickets, present QR pass, review items. | **User-Scoped**: Can only query and update rows where `user_id == auth.uid()`. Zero access to other student wallets or canteen financials. |
| **Kitchen Staff** | Tablet KDS Kanban Board | View live tickets, tap `Preparing`, tap `Ready`, tap `86 Sold Out` on out-of-stock items, scan customer QR pass. | **Outlet-Scoped**: Locked strictly to orders and dishes matching their assigned `outlet_id`. Cannot view other canteens. |
| **Shop Owner / Canteen Admin** | Desktop / Tablet Merchant Console | Edit menu prices, set meal categories, set slot capacity limits, issue 8-character staff invite codes, view 100% net earnings. | **Outlet-Admin-Scoped**: Can manage menu items and staff accounts for their specific `outlet_id`. Zero access to competitor sales. |
| **Super Admin / University Board** | Master Executive Governance Portal | Monitor campus GMV, track 5% platform and 2% college split ledgers, toggle festival mode, view forensic stock audit logs. | **Global Scope**: Full read access across all campus outlets, settlement accounts, and audit ledgers. |

---

# 7. End-to-End User Journeys & Workflows

### 7.1 Student Journey: From Lecture Hall to Meal Pickup
1. **Browse (10 minutes before class ends)**: The student opens the V-Buy PWA. The homepage displays live open/closed status for all 13 campus canteens. The student selects "Main Canteen".
2. **Item Selection & Customization**: The student selects a Paneer Butter Masala Combo (Base Price: ₹120.00). The cart clearly displays:
   - Base Food Value: ₹120.00
   - Convenience & Campus Fee (7%): ₹8.40
   - **Total Due**: ₹128.40
3. **Instant 1-Tap Checkout**: The student taps "Pay via Campus Wallet". The database executes an atomic transaction in **under 20 milliseconds**, deducting ₹128.40 from the student's balance, decrementing kitchen inventory, assigning token `#342`, and calculating the 3-way split:
   - Canteen Payout: ₹120.00 (100% of base)
   - Platform Fee: ₹6.00 (5% of base)
   - College Royalty: ₹2.40 (2% of base)
4. **Walk Over & Live Tracking**: While walking to the canteen, the student's phone displays an animated live tracker. When the cook starts preparing the meal, the status updates to `Preparing`.
5. **Ready Notification**: When the food is packaged, the kitchen staff taps `Mark Ready`. The student's phone receives an instant push and SMS notification, displaying an animated high-density QR pass.
6. **2-Minute Express Pickup**: The student walks up to the express counter shelf, presents the QR pass to the scanner, staff hands over the packaged tray, and the order completes.

### 7.2 Kitchen Staff Journey: Digital Assembly Line
1. **Incoming Ticket**: A pleasant harmonic audio chime sounds through the kitchen tablet speaker via the Web Audio API. A new order card appears under `Placed` displaying Token `#342` and the requested dishes.
2. **Cooking Progression**: The cook taps the ticket card. The ticket shifts to the yellow `Preparing` column.
3. **Packaging & Alerting**: Once the hot meal is boxed, the cook taps `Mark Ready`. The ticket moves to the green `Ready` column, and the student is immediately notified.
4. **Verification & Handover**: When the student arrives, staff point their tablet or smartphone camera at the student's QR pass. The scanner verifies the HMAC signature in < 500ms, plays a confirmation beep, and moves the ticket to `Collected`.

---

# 8. Comprehensive Functional & UI/UX Feature Catalog

### 8.1 Active Production Features
1. **1-Tap Reorder ("My Usual")**: The student's most frequent or recent meal appears pinned at the top of the browse screen. One tap verifies live canteen stock and reloads the items into the cart.
2. **Post-Pickup Dish Ratings & Reviews**: Only students who have verified and collected an order can submit 1-to-5 star ratings for individual items. Verified scores calculate running averages, awarding high-rated dishes a "Popular" badge.
3. **Group Ordering (Split Carts)**: Friends sitting together in a hostel or library can open a group session. One student generates a 4-digit code (`VBUY-84`). Friends join on their own phones, add dishes, and the host pays for the combined order in a single transaction. The kitchen receives a single consolidated ticket with grouped items.
4. **Scheduled Pickup Time Slots**: Students can select "Order for Now" or schedule an upcoming 15-minute window (e.g., 1:15 PM – 1:30 PM). Each slot has a configurable maximum order ceiling to prevent kitchen bottlenecks.
5. **Coupons & Promo Engine**: Supports platform-wide promotional codes (e.g., `WELCOME10`). The discount is absorbed by the platform's marketing budget; **the canteen's 100% base food payout is strictly protected**.
6. **Spotlight Search (`⌘K` / `Ctrl+K`)**: Desktop and tablet users can press keyboard shortcuts to instantly search across dishes, food courts, and allergen tags.
7. **Skeleton Shimmer Loading**: During initial network handshakes, sleek skeleton shimmer cards replace jarring spinners to maintain smooth perceived performance.
8. **Web Haptics Feedback**: Mobile browsers trigger tactile vibration pulses upon successful token generation, cart increments, and order collection.
9. **KDS Ticket Aging Indicators**: Kitchen tickets gradually change color from cool blue to urgent amber and red if tickets remain in `Placed` for more than 8 minutes, highlighting lagging orders.

### 8.2 Retired Experiments & Justification
1. **Student Referral Credits (REMOVED)**:
   - *Reason for Removal*: Introduced ledger complexity and vulnerability to campus gaming (students creating throwaway accounts to milk referral bonuses). Replaced with clean, transparent coupon codes.
2. **Cross-Canteen Streak Rewards (REMOVED)**:
   - *Reason for Removal*: Caused inter-stall accounting friction regarding which canteen funded free reward dishes when a student visited different canteens. Replaced with single-stall promotional discounts.

---

# 9. Canteen, Kitchen & POS Operations

### 9.1 The Live Kitchen Display System (KDS)
The KDS replaces physical receipt rolls with an intuitive, 3-column Kanban interface:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KITCHEN DISPLAY SYSTEM (KDS)                    │
│                                                                        │
│   PLACED (Incoming)        PREPARING (Cooking)     READY (For Pickup)  │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐ │
│   │ Token #342 (2m)  │    │ Token #339 (6m)  │    │ Token #335 (11m) │ │
│   │ 1x Paneer Combo  │    │ 2x Chicken Roll  │    │ 1x Veg Fried Rice│ │
│   │ [Start Cooking]  │    │ [Mark Ready]     │    │ [Scan QR Pass]   │ │
│   └──────────────────┘    └──────────────────┘    └──────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 9.2 The Instant "86" Sold-Out Switch
If an ingredient runs out during a lunch rush, kitchen workers tap the red "86" button next to any dish on the KDS screen. The database immediately updates `menu_items.is_available = false`, and Supabase Realtime pushes this state to all 1,000+ active student mobile screens in **under 150 milliseconds**, preventing any student from ordering an unavailable dish.

### 9.3 POS Offline Fallback Mode
If campus Wi-Fi drops completely, counter staff can switch the counter screen to Offline Validation Mode. The app verifies the cryptographic signature embedded within the student's QR pass locally using the shared secret key, allowing counter handover to proceed without internet connectivity.

---

# 10. Dual Payment Gateway & Wallet Architecture

V-Buy supports two distinct payment channels to accommodate both daily campus regulars and casual visitors:

```
                                  CUSTOMER CHECKOUT
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
           CHANNEL 1: CAMPUS WALLET                        CHANNEL 2: DIRECT PAYTM PG
           Preloaded student float                         UPI Intent / QR / Cards
           < 20ms atomic database deduction                Confirmed via signed webhook
           Zero banking server latency                     5–10s bank authorization
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                             AUTOMATED THREE-WAY SPLIT
                                (Migration 011)
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         ▼                               ▼                               ▼
    CANTEEN SHARE                 PLATFORM FEE                    COLLEGE ROYALTY
     100% of Base                  5% of Base                      2% of Base
       (₹100.00)                     (₹5.00)                         (₹2.00)
Direct merchant payout         V-Buy startup revenue          Campus facilities fund
```

### 10.1 Payment Channel Comparison

| Evaluation Feature | Channel 1: V-Buy Campus Wallet | Channel 2: Instant Paytm Gateway |
| :--- | :--- | :--- |
| **Primary Audience** | Daily students, hostellers, 10-minute break rushes | Visitors, parents, faculty, first-time users |
| **Execution Latency** | **< 20 milliseconds** | 5 – 12 seconds (bank authorization) |
| **Prerequisites** | Preloaded balance (rechargeable via UPI anytime) | Active bank account / UPI app |
| **External Dependencies** | **None** (internal database transaction) | External banking servers & cellular network |
| **Break-Time Reliability** | **100% immune** to cell tower congestion | Vulnerable to network latency during rush hour |
| **Deficit Support** | Auto-calculated 1-tap deficit top-up (+ ₹X & Pay)| Directly charges total order amount |

### 10.2 Server-to-Server Webhook Security & Idempotency
Payment confirmation follows strict zero-trust principles:
1. **The frontend client never confirms a payment**: The browser only displays a "Processing..." indicator.
2. **Paytm sends an HTTPS POST webhook**: Paytm's server communicates directly with our FastAPI endpoint at `/webhooks/paytm`.
3. **Cryptographic Checksum Verification**: FastAPI recalculates the HMAC-SHA256 signature using `PAYTM_MERCHANT_KEY`. Any tampered or unsigned request is immediately rejected with HTTP 400.
4. **Idempotency Guarantee**: If Paytm re-sends a webhook multiple times due to dropped packets, the database checks `payments.paytm_txn_id`. Duplicate callbacks return the existing processed state with zero duplicate wallet credits.

---

# 11. System Architecture & High-Traffic Concurrency Engine

College canteens face extreme traffic spikes that crash traditional e-commerce web applications. V-Buy uses a **4-Layer High-Traffic Architecture** capable of serving **2,500+ simultaneous students**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     4-LAYER HIGH-TRAFFIC CONCURRENCY                   │
│                                                                        │
│   [LAYER 1: CLIENT CACHE]       TanStack Query (React Query v5)        │
│   1,000+ Mobile Browsers   ──►  In-memory stale-while-revalidate cache │
│                                 Menu switches render in 0ms            │
│                                              │                         │
│                                              ▼ (Cache miss only)       │
│   [LAYER 2: FASTAPI RAM CACHE]  FastAPI /api/catalog/summary           │
│   Absorbs 95% of reads     ──►  30-second TTL in RAM                   │
│                                 Serves cold hits in < 2ms              │
│                                              │                         │
│                                              ▼ (Write operations only) │
│   [LAYER 3: ZERO-GATEWAY RPC]   PostgreSQL Atomic Stored Procedure     │
│   Single ACID transaction  ──►  place_order_wallet() with FOR UPDATE   │
│                                 Executes in < 20ms with zero oversell  │
│                                              │                         │
│                                              ▼                         │
│   [LAYER 4: REALTIME PUSH]      Supabase Realtime WebSockets           │
│   PostgreSQL logical WAL   ──►  Pushes status changes in < 150ms       │
│                                 Zero client polling on the database    │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.1 Concurrency Benchmark Performance

| System Metric | Traditional Polling / Bank Gateway | V-Buy High-Traffic Stack | Operational Improvement |
| :--- | :--- | :--- | :--- |
| **Menu Screen Load Time** | 800ms – 2,500ms (database read) | 0ms – 15ms (TanStack Query Cache) | **99% faster** |
| **Rush-Hour Checkout Latency** | 5s – 15s (external bank redirect)| 15ms – 25ms (Internal Wallet RPC) | **500x faster** |
| **Database Queries / Minute** | 25,000+ (constant status polling)| < 250 (push-only WebSockets) | **99% lower server load**|
| **Concurrent Capacity** | ~150 users before slowdown | **2,500+ simultaneous students** | **16x scalability** |

---

# 12. Technology Stack Selection & Deep-Dive Comparisons

### 12.1 Frontend Architecture
* **Stack**: **React 19 + Vite 8 + TypeScript + Tailwind CSS 4 + Progressive Web App (PWA)**.
* **Why React 19 + Vite won**: Builds pure static assets distributed globally over edge CDNs. Cold loads execute in under 400ms on mobile data.
* **Why not Next.js?**: Next.js requires Node.js server-side rendering (SSR), introducing container cold starts and expensive server infrastructure for what is fundamentally an authenticated, state-heavy client dashboard.
* **Why not Flutter / React Native?**: Native apps require students to download 80–120MB packages from Google Play or the App Store. A PWA opens instantly via URL or QR scan in mobile Safari/Chrome with **zero download friction**.

### 12.2 Backend Architecture
* **Stack**: **FastAPI (Python 3.11) + Uvicorn + Pydantic v2 + APScheduler**.
* **Why FastAPI won**: Native asynchronous I/O (`asyncio`) handles thousands of concurrent requests per container with minimal RAM usage. Auto-generates interactive OpenAPI documentation and provides strict data validation via Pydantic v2.
* **Why not Node.js / Express?**: Express requires heavy middleware boilerplate for type validation, lacks native auto-generated OpenAPI schemas, and cannot natively execute Python AI/ML libraries.
* **Why not Django?**: Django is synchronous by default, heavy, bundles an unnecessary ORM and templating engine, and exhibits 10x higher response latency (~150ms vs ~15ms with FastAPI).
* **AI / ML Readiness**: Python backend allows direct integration of future demand forecasting models (morning kitchen batch cooking predictions based on timetable attendance).

### 12.3 Database & Realtime Architecture
* **Stack**: **PostgreSQL 15 (Supabase Cloud) + Row-Level Security (RLS) + Realtime WebSockets**.
* **Why Supabase PostgreSQL won**: Financial ledgers, wallet balances, and inventory require strict **ACID transactions**. Row-level locks (`FOR UPDATE`) prevent double-spending and overselling.
* **Why not MongoDB (NoSQL)?**: MongoDB provides only eventual consistency by default. During peak lunch rushes, race conditions can easily drive stock counts negative or corrupt wallet ledgers.
* **Why not Firebase / Firestore?**: Firestore charges per document read/write (costs explode during break-time traffic), lacks relational SQL joins, and locks the company into Google Cloud proprietary tooling.

---

# 13. Database Architecture & Complete Schema Specification

The V-Buy database consists of **16 production tables** operating under PostgreSQL 15:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE RELATIONAL ENTITY GRAPH                    │
│                                                                        │
│   [outlets] ───────────┬───────────► [menu_items]                      │
│        │               │                   │                           │
│        ▼               │                   ▼                           │
│   [outlet_paytm_acc]   │             [order_items]                     │
│        │               │                   │                           │
│        ▼               ▼                   ▼                           │
│   [payment_splits] ◄── [orders] ───────────┘                           │
│        ▲               │   ▲                                           │
│        │               ▼   │                                           │
│   [payments] ──────────┘   │                                           │
│        │                   │                                           │
│        ▼                   ▼                                           │
│   [refunds]           [profiles] ──────────► [wallets] ──► [wallet_txns]
└────────────────────────────────────────────────────────────────────────┘
```

### 13.1 Schema Table Definitions
1. **`outlets`**: Campus dining locations (`id`, `name`, `location`, `is_open`, `is_event`).
2. **`menu_items`**: Food catalog (`id`, `outlet_id`, `name`, `price`, `category`, `is_veg`, `stock_qty`, `is_available`).
3. **`orders`**: Meal orders (`id`, `user_id`, `outlet_id`, `token`, `status`, `payment_method`, `total`, `shop_payout`, `scheduled_slot`, `payment_id`).
4. **`order_items`**: Individual line items (`id`, `order_id`, `item_id`, `name`, `price`, `qty`).
5. **`profiles`**: User directory (`id`, `full_name`, `role`, `phone`, `outlet_id`).
6. **`wallets`**: Prepaid student balances (`id`, `user_id`, `balance`, `updated_at`).
7. **`wallet_txns`**: Immutable balance audit log (`id`, `wallet_id`, `amount`, `txn_type`, `ref`, `created_at`).
8. **`payments`**: Gateway payment attempts (`id`, `user_id`, `order_id`, `amount`, `payment_purpose`, `payment_method`, `status`, `paytm_order_id`, `paytm_txn_id`).
9. **`outlet_paytm_accounts`**: Canteen Paytm merchant sub-account IDs and split configurations (`outlet_id`, `paytm_account_id`, `shop_split_percentage`).
10. **`platform_settlement_account`**: V-Buy master merchant settlement account (`platform_split_percentage = 5.0`).
11. **`college_settlement_accounts`**: University administration Paytm settlement account (`college_split_percentage = 2.0`).
12. **`payment_splits`**: Records the exact 3-way distribution (`order_id`, `recipient_type`, `split_amount`, `split_percentage`, `settlement_status`).
13. **`refunds`**: Customer refund logs (`id`, `payment_id`, `order_id`, `amount`, `status`, `reason`).
14. **`audit_logs`**: Tamper-proof forensic audit trail of all staff price changes, inventory adjustments, and administrative overrides (`id`, `actor_id`, `action`, `target_table`, `details`, `timestamp`).
15. **`invites`**: Cryptographic 8-character single-use invite codes used to onboard staff (`code`, `role`, `outlet_id`, `is_used`).
16. **`settings`**: Campus-wide parameters (`campus_id`, `festival_mode_active`, `max_orders_per_slot`).

---

# 14. Backend APIs, Webhooks & Cryptography

### 14.1 Key REST Endpoints
* `POST /order/checkout`: Validates cart items, verifies wallet balance, and invokes `place_order_wallet()`.
* `POST /wallet/topup/paytm`: Generates a signed Paytm payment order payload for wallet recharge.
* `POST /order/checkout/paytm-session`: Generates a signed direct-order session for visitors paying via Paytm UPI.
* `POST /webhooks/paytm`: Ingests Paytm server-to-server callbacks, verifies HMAC-SHA256 signatures, and finalizes orders.
* `GET /api/catalog/summary`: In-memory cached endpoint returning all active campus canteens and statuses in < 2ms.
* `GET /health`: Health-check telemetry reporting API uptime, database connectivity, and scheduler status.

### 14.2 HMAC Cryptographic Signatures
* **Paytm Webhook Verification**:
  $$\text{Expected Signature} = \text{HMAC-SHA256}(\text{Sorted Payload Parameters}, \text{PAYTM\_MERCHANT\_KEY})$$
* **Counter QR Pickup Pass Verification**:
  $$\text{QR Token Signature} = \text{HMAC-SHA256}(\text{"order:"} + \text{order\_id}, \text{QR\_SECRET})$$
  Prevents students from faking token numbers or taking screenshots of other students' passes.

---

# 15. Real-Time WebSockets & Notification Engine

1. **Supabase Realtime WebSockets**:
   - Listens to PostgreSQL Write-Ahead Log (WAL) events.
   - When kitchen staff advance a ticket, a lightweight JSON payload broadcasts over WebSockets to the student's phone in **< 150ms**.
2. **MSG91 WhatsApp & SMS Alerts**:
   - The moment an order shifts to `Ready`, FastAPI initiates an asynchronous background task to dispatch a WhatsApp alert containing the pickup token and express counter shelf location.
   - If WhatsApp delivery fails or mobile data is disabled, an automatic SMS fallback is dispatched.

---

# 16. Security, Row-Level Isolation (RLS) & Forensic Auditing

1. **Zero Card / PIN Data Storage**: V-Buy never touches or stores credit card numbers, CVVs, expiration dates, or UPI MPINs. All payment processing occurs on Paytm's PCI-DSS Level 1 certified banking servers.
2. **Row-Level Security (RLS)**: Enforced directly inside PostgreSQL. Even if an attacker manipulates API requests, the database rejects queries outside the user's validated JWT token scope.
3. **Forensic Audit Logging**: Every staff inventory adjustment, price update, and administrative override writes an immutable entry into `audit_logs` capturing the user ID, previous value, new value, IP address, and timestamp.

---

# 17. Edge Cases, Error Handling & Failure Recovery

| Edge Case | Potential Failure Mode | V-Buy Automated Solution |
| :--- | :--- | :--- |
| **Simultaneous Stock Contention** | 20 students order the last 2 items at the same millisecond. | `place_order_wallet` locks target rows using `FOR UPDATE`. Stock decrements sequentially; the 3rd student receives an immediate "Item Sold Out" rollback. |
| **Network Drop During UPI Payment** | Student phone battery dies or signal cuts out after bank authorization. | Paytm confirms the transaction server-to-server via webhook. The order is placed and confirmed regardless of student phone status. |
| **Duplicate Webhook Delivery** | Paytm retries webhooks multiple times due to internet packet drops. | The database checks `payments.paytm_txn_id`. Duplicate webhooks are ignored, producing zero double-credits. |
| **Unclaimed Food / Expired Tokens** | Student places an order but never arrives at the counter. | The system flags orders uncollected after 45 minutes, archives them, and logs them for manager review. |
| **Kitchen Internet Disconnection** | Food court Wi-Fi router powers off during rush hour. | The KDS switches to offline mode, validating tokens via local HMAC pass verification and cached queues. |

---

# 18. Campus Physical Infrastructure & Outlet Hierarchy

V-Buy models university dining into physical food courts housing distinct specialized counters:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VIT CHENNAI CAMPUS MAPPING                      │
│                                                                        │
│   GAZEBO FOOD COURT (Central Plaza)                                    │
│   • Gazebo C1: Fast Food & Rolls                                       │
│   • Gazebo C2: Sweets & Pastries                                       │
│   • Dakshin Chitra: South Indian Meals & Dosa                          │
│   • Lassi House: Shakes, Juices & Beverages                            │
│                                                                        │
│   NORTH SQUARE FOOD COURT (Academic Hub)                               │
│   • Georgia Canteen: Sandwiches, Teas & Coffees                        │
│   • Alpha Non-Veg Kitchen: Chicken Biryani & Kebabs                    │
│   • Sri's Fast Food: Fried Rice & Noodles                              │
│   • Juice & Rice Corner: Healthy Meal Bowls                            │
│                                                                        │
│   ACADEMIC BLOCKS & SPECIALIZED OUTLETS                                │
│   • AB3 Food Complex: Amphitheatre Meals                               │
│   • AB1 Walkway Canteen: Quick Grab-and-Go Snacks                      │
│   • Delta Snacks Counter: Evening Tea & Puffs                          │
│   • Campus Pavilion: Aavin Dairy & Ice Creams                          │
│   • V-Mart Store: Packaged Provisions & Confectionery                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

# 19. Startup Business Registration & Compliance Roadmap

*(Consolidated from Official Legal & Compliance Blueprint)*

### 19.1 Regulatory Classification
V-Buy is classified as an **E-Commerce Food Aggregator & SaaS Marketplace Platform**. Because the platform handles real money (wallets, order splits, and merchant payouts), it sits at the intersection of three legal frameworks:
1. **Business Law**: Legal entity incorporation and ownership under the Ministry of Corporate Affairs (MCA).
2. **Payment Law**: Escrow and wallet handling under RBI's Payment and Settlement Systems Act, 2007.
3. **Food Safety Law**: Food safety compliance under the Food Safety and Standards Authority of India (FSSAI).

### 19.2 Recommended Business Structure: LLP vs Private Limited

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         OUR 2-STAGE REGISTRATION STRATEGY                    │
│                                                                              │
│    STAGE 1: LAUNCH & CAMPUS PILOT               STAGE 2: SCALE & VENTURE CAP │
│    ┌─────────────────────────────┐              ┌──────────────────────────┐ │
│    │  Incorporate as an LLP      │  ────────►   │ Convert to Pvt Ltd       │ │
│    │  (Limited Liability P'ship) │ (Seed / VC)  │ (Under Section 366)      │ │
│    └─────────────────────────────┘              └──────────────────────────┘ │
│    • Zero mandatory audit (<₹40L)               • Issue equity to VCs      │
│    • Low annual compliance cost                 • Create ESOP pool for dev │
│    • Full liability protection                  • Multi-campus expansion   │
│    • Direct profit sharing                      • Institutional contracts  │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Entity Comparison Matrix:

| Evaluation Parameter | Sole Proprietorship | Limited Liability Partnership (LLP) | Private Limited Company (Pvt Ltd) |
| :--- | :--- | :--- | :--- |
| **Legal Identity** | Not a separate entity | **Separate Legal Entity** | **Separate Legal Entity** |
| **Personal Liability** | **Unlimited** (Personal assets at risk) | **Limited** to partner's capital contribution | **Limited** to unpaid share capital |
| **Incorporation Cost** | ₹1,000 – ₹2,000 | **₹3,000 – ₹6,000** | ₹8,000 – ₹15,000 |
| **Mandatory Annual Audit** | Only if turnover > ₹1 Cr | **Exempt** until turnover exceeds ₹40 Lakhs OR capital exceeds ₹25 Lakhs | **Mandatory Every Year** from Day 1 regardless of turnover |
| **Annual Compliance Cost** | Minimal | **Low (~₹5,000 – ₹8,000 / year)** | High (~₹25,000 – ₹45,000 / year) |
| **Tax on Profit Distribution** | Individual tax slabs | **Zero Dividend Distribution Tax** (Profits distributed tax-free u/s 10(2A)) | Corporate Tax (22%) + Dividend Tax on shareholders |
| **Venture Capital Suitability** | Impossible | Not suitable for institutional VCs | **Standard** (Equity, CCPS, SAFE notes, ESOPs) |

#### Strategic Verdict:
1. **Stage 1 (Campus Launch & Bootstrapping)**: **Incorporate as an LLP**. Protects founders from personal liability, avoids mandatory statutory audit fees (saving ₹25,000–₹40,000/year while turnover is under ₹40 Lakhs), allows direct profit withdrawals without double taxation, and operates with minimal paperwork.
2. **Stage 2 (Expansion to Multiple Campuses & VC Funding)**: **Convert to Private Limited** under Section 366 of the Companies Act, 2013. Required when issuing equity shares to angel investors/VCs or creating an ESOP pool for engineering talent.

### 19.3 The Full 9-Step Registration Sequence (Timeline: 4–8 Weeks)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           THE 9-STEP REGISTRATION SEQUENCE                      │
│                                                                                 │
│   [STEP 1] DSC Certificates (1–2 days, ₹800–₹1,500/cert, video-KYC)             │
│      │                                                                          │
│      ▼                                                                          │
│   [STEP 2] RUN-LLP Name Reservation (2–3 days, ₹200 MCA fee)                    │
│      │                                                                          │
│      ▼                                                                          │
│   [STEP 3] FiLLiP Incorporation Filing (Several days to 2 weeks, ₹500 fee)      │
│      │     Triggers automatic PAN & TAN; yields Certificate & LLPIN             │
│      ▼                                                                          │
│   [STEP 4] LLP Agreement Form 3 (Must file within 30 days, stamp duty ₹500–₹2k) │
│      │                                                                          │
│      ▼                                                                          │
│   [STEP 5] Current Bank Account in LLP Name (Several days to 2 weeks)           │
│      │                                                                          │
│      ▼                                                                          │
│   [STEP 6] GST Registration (Few days to 1 week, online, no gov fee)            │
│      │                                                                          │
│      ├──────────────────────────────────────────┐                               │
│      ▼ (Parallel)                               ▼ (Parallel)                    │
│   [STEP 7] Udyam MSME Registration           [STEP 8] Paytm Merchant & Split    │
│   (Same day once GST exists, free)           Settlement (1–4+ weeks, KYC)       │
│      │                                          │                               │
│      └────────────────────┬─────────────────────┘                               │
│                           ▼                                                     │
│   [STEP 9] FSSAI E-Commerce FBO Central License (₹7,500/yr, several weeks)      │
│   Every partner canteen must also display active individual FSSAI registration  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 19.4 Key Regulatory Clearances
1. **RBI / Prepaid Payment Instrument (PPI) Compliance**: Storing money in a student wallet falls under the Payment and Settlement Systems Act, 2007. V-Buy routes top-ups through **Paytm's authorized escrow and wallet infrastructure**. Paytm holds the required RBI license, with V-Buy's wallet balance acting as an application display layer on top of Paytm's regulated ledger.
2. **College Management Written Agreement**: A formal written institutional agreement with the university finance office covering:
   - Designated Paytm settlement account details.
   - Agreed 2.0% campus dining royalty share.
   - Exclusive operational rights across campus food courts.
3. **DPIIT Startup India Recognition**: Once incorporated, apply for Startup India recognition to unlock:
   - **Section 80-IAC Tax Holiday**: 3 consecutive years of 100% income tax exemption out of the first 10 years.
   - **80% Rebate on Patent & 50% on Trademark Filings**.
   - **Self-certification** under 6 labor and 3 environmental laws.
4. **Google Play Store Publishing**: Google strictly reviews payment and financial apps. Complete Steps 1–9 before submitting the production app bundle to avoid developer account suspensions.

---

# 20. Operational Implementation Plan & Scalability Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           4-PHASE IMPLEMENTATION ROADMAP                        │
│                                                                                 │
│   PHASE 1: PILOT LAUNCH        PHASE 2: FULL SATURATION   PHASE 3: EXPANSION    │
│   (Months 1–3)                 (Months 4–6)               (Months 7–12)         │
│   • 3 Major Food Courts        • All 13 Campus Canteens   • 5 Regional Colleges │
│   • 8,000 Active Students      • Festival Mode Activated  • Convert to Pvt Ltd  │
│   • Wallet & KDS Validation    • 15,000 Orders / Day      • Institutional Seed  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

* **Phase 1: Pilot Launch (Months 1–3)**: Deploy in Gazebo Food Court (4 counters). Onboard 8,000 students. Validate wallet top-up flow and KDS audio chimes.
* **Phase 2: Full Campus Saturation (Months 4–6)**: Onboard all 13 canteens. Activate Riviera/Gravitas Festival Event Mode. Reach 12,000+ daily orders and full financial reconciliation.
* **Phase 3: Multi-Campus Expansion (Months 7–12)**: Expand to 5 neighboring universities (SRM, VIT Chennai, Anna University, SSN). Convert LLP to Private Limited and close seed venture round.
* **Phase 4: Smart Canteen Ecosystem (Year 2)**: Deploy machine learning models for predictive kitchen morning prep, install automated IoT temperature-controlled pickup lockers, and launch recurring semester meal subscription plans.

---

# 21. Risks, Mitigations & Core Assumptions

| Identified Risk | Impact Level | Mitigation Strategy |
| :--- | :--- | :--- |
| **Peak Cellular Network Latency** | High | Closed-loop campus wallet executes orders entirely in the database (< 20ms) with zero gateway dependency. |
| **Merchant Resistance to Technology** | Medium | Simple UI requiring zero typing; single-tap ticket advancers; 100% net food revenue with zero merchant deductions. |
| **Student Wallet Balance Gaming** | High | Stored procedure execution inside PostgreSQL; strict atomic locks; full double-entry ledger in `wallet_txns`. |
| **Regulatory / RBI Scrutiny** | High | Partnering with licensed payment aggregator (Paytm) for funds holding and automated escrow split disbursement. |
| **Student Counter Crowding** | Medium | Staggered 15-minute pickup slots and distinct express counter collection shelves. |

---

# 22. Master Appendix & Final Reference Calculations

### 22.1 Comprehensive Settlement Equation
For any completed order $i$ with base food cost $B_i$:
$$\text{Customer Total Payment } (T_i) = B_i + (0.07 \times B_i) = 1.07 \times B_i$$
$$\text{Canteen Payout } (C_i) = B_i \quad (100\% \text{ of Base})$$
$$\text{V-Buy Platform Share } (P_i) = 0.05 \times B_i \quad (5\% \text{ of Base})$$
$$\text{College Management Share } (M_i) = 0.02 \times B_i \quad (2\% \text{ of Base})$$
$$\text{Invariant Verification}: C_i + P_i + M_i = B_i + 0.05 B_i + 0.02 B_i = 1.07 B_i = T_i$$

### 22.2 Final Verification Checklist
- [x] All 15 source documents reconciled and consolidated into a single master document.
- [x] Full 7 pages of `setup.pdf` business registration and compliance blueprint incorporated.
- [x] 7% convenience fee model consistently applied across all financial calculations (₹100 Base $\to$ ₹107 Customer Payment; ₹100 Shop / ₹5 Platform / ₹2 College).
- [x] All obsolete, duplicate, and temporary files cleaned up.
- [x] Complete technical, business, operational, and legal coverage from beginning to end.

---
*End of Master System Specification. V-Buy Platform Technologies &copy; 2026. All Rights Reserved.*
