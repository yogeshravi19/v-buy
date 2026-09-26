# V-FOOD — Investor Pitch Deck & Startup Overview
> **The Smart Campus Dining & Fast-Pickup Network**  
> *Transforming University Food Operations: 35,000+ Students · 13 Canteens · 20 Riviera Festival Stalls*

---

## 1. Executive Summary & Problem

### The Problem on College Campuses (VIT Vellore Case Study)
- **Extreme Peak-Hour Rush**: Between 12:45 PM – 1:45 PM, 30,000+ students descend on 13 canteens simultaneously.
- **25–35 Minute Lost Break Time**: Students wait 20 minutes in a crowded line to order, and another 15 minutes waiting for their paper token number to be yelled out.
- **Counter Chaos & Kitchen Leakage**: Paper chits get lost, staff waste time making change, and canteens face inventory pilferage and revenue leakage.
- **Congested Cell Towers**: Payment gateways fail during peak hours when thousands of students try to scan UPI QR codes simultaneously.

### The Solution: V-FOOD
- **Order Ahead with Scheduled Pickup Slots**: Students order from their phones 15 minutes before lecture ends, choosing a scheduled pickup window.
- **Prepaid Campus Wallet**: Instant 1-tap checkout via closed-loop student wallet with zero payment gateway failure.
- **High-Velocity Kitchen Display Screen (KDS)**: Kitchen workers see orders in sub-second real time with clear audio chimes and big token cards.
- **2-Minute Express QR Collection**: Students arrive, present their anti-fraud QR pass at the express counter, and pick up hot food immediately.

---

## 2. The 4 Operating Models

```
┌────────────────────────────────────────────────────────────────────────┐
│                        V-FOOD PLATFORM ARCHITECTURE                    │
│                                                                        │
│   1. STUDENT MODEL        2. STAFF KDS MODEL      3. SHOP ADMIN MODEL  │
│   • Scheduled Slots       • Audio Chimes          • Menu Catalog CRUD  │
│   • 1-Tap Wallet Pay      • Big Token Cards       • Team Invites (8ch) │
│   • QR Pickup Pass        • 1-Tap Prep/Ready      • Live 95% Payouts   │
│   • Loyalty Streaks       • Scan-to-Collect       • Canteen Coupons    │
│            │                      │                        │           │
│            └──────────────────────┼────────────────────────┘           │
│                                   ▼                                    │
│                     4. SUPER ADMIN PLATFORM MODEL                      │
│                     • Real-time University GMV                         │
│                     • Automated 5% Take-Rate Rake                      │
│                     • Multi-tier Org Hierarchy Tree                    │
│                     • Riviera / Gravitas Event Mode                    │
│                     • Full System Stock Audit Logs                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Model 1: The Student / Buyer Model (Demand Engine)
- **Scheduled 15-Minute Windows**: Matches class timetable breaks so meals are prepared right as students walk out of lecture halls.
- **Closed-Loop Campus Wallet**: Preloaded via UPI/cards; executes in `<200ms` with zero dependence on external banking servers.
- **Anti-Fraud QR Tokens**: High-density QR tokens combined with 3-digit backup codes (`#289`) prevent token duplication or screenshot sharing.
- **Loyalty & Retention**: Daily dining streaks, 1-tap re-order (*"My Usual"*), post-pickup 5-star ratings, and peer referral incentives.

### Model 2: The Kitchen Staff Model (Fulfillment Engine)
- **Zero Paper Chits**: Completely eliminates physical receipt rolls and manual yelling.
- **Harmoic Audio Chimes**: Web Audio API triggers distinct alerts on new orders even if workers are facing the stove.
- **1-Tap State Advancer**: Single tap advances tickets: `Placed` → `Preparing` → `Ready for Pickup!`.
- **Instant "86 Item" (Sold Out) Stepper**: Kitchen workers tap `-` or `Sold Out` to immediately prevent students from ordering out-of-stock items in 150ms.
- **Express Counter Scan**: Camera scan verifies QR in `<1s` or staff punches in the 3-digit token.

### Model 3: The Shop Owner Model (Merchant Engine)
- **Menu Catalog Autonomy**: Set prices, toggle Veg/Non-Veg categories, and schedule meal-time availability (Breakfast, Lunch, Snacks, Dinner).
- **Kitchen Team Management**: Issue 8-character cryptographic invite codes to onboarding staff; toggle active access with one click.
- **Real-Time Net Payouts**: Clear financial transparency showing gross sales, order counts, and net 95% merchant payout.
- **Outlet-Level Promo Engine**: Run flash sales (e.g. 15% off afternoon snacks) restricted to their specific canteen.

### Model 4: The University Super Admin Model (Governance Engine)
- **Campus-Wide Oversight**: Live financial scoreboard tracking gross GMV across all 13 canteens and 20 festival stalls.
- **Automated 5% Platform Monetization**: Real-time calculation of startup take-rate.
- **Nested Hierarchy Tree**: Visual tree mapping `Outlet → Shop Admin → Kitchen Staff`.
- **Festival Event Mode (Riviera & Gravitas)**: 1-tap switch activates 20 temporary festival stalls with instant onboarding.
- **Forensic Stock Audit Trail**: Full telemetry logging every inventory change (manual adjustments vs automatic order decrements) to eliminate inventory shrinkage.

---

## 3. Unit Economics & Monetization

| Metric | Target Campus Metric | Financial Impact |
|---|---|---|
| **Average Order Value (AOV)** | ₹120 – ₹150 | Standard student meal basket |
| **Platform Take-Rate** | **5.0%** | **₹6.00 to ₹7.50 per order** |
| **Canteen Payout** | **95.0%** | ₹114.00 to ₹142.50 per order |
| **Daily Campus Volume** | 8,000 – 15,000 orders/day | During peak semester days |
| **Daily Gross Platform Revenue** | **₹48,000 – ₹90,000 / day** | Scaled across 13 canteens |
| **Annualized Campus Run-Rate** | **₹1.2 Cr – ₹2.2 Cr** | Single campus potential |

### Additional Revenue Streams
1. **Festival Stall Onboarding (Riviera & Gravitas)**: 20+ visiting food stalls pay a ₹1,500 onboarding pass + standard 5% take-rate over 4 festival days (₹1.5L+ per fest).
2. **Treasury Float Yield**: 35,000 students maintaining ₹200 average wallet balance = ₹70 Lakhs liquid float earning short-term yield.
3. **Sponsored / Featured Placements**: Brand promotion and featured snack banners on high-traffic campus days.

---

## 4. Technology & Moat

- **Database & Sync**: Single Supabase PostgreSQL cluster with Row Level Security (RLS) keeping merchant data strictly isolated.
- **Sub-Second Realtime Engine**: WebSocket change-data-capture broadcasts order state transitions to students and kitchen screens in `<150ms`.
- **Zero Hardware Requirement**: Runs entirely on responsive web / PWA on standard phones and low-cost kitchen tablets.
- **Offline Walk-in Counter Fallback**: If campus WiFi drops, counter workers use local token validation and walk-in cash drawer without downtime.
