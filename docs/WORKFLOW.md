# Order Lifecycle & System Workflow

The complete end-to-end lifecycle of an order in V-BUY follows a strict, transactional sequence:

## 1. Student Wallet Top-Up
- The student initiates a wallet recharge via the Wallet tab.
- Payment is routed through PhonePe UPI (or secondary gateway integration).
- Upon successful payment webhook verification via the backend, `credit_wallet()` executes atomically in PostgreSQL with an idempotent transaction key (`topup:<txn_id>`), updating the student's ledger and available balance.

## 2. Menu Browsing & Cart Assembly
- The student explores campus outlets (Gazebo, Dakshin Chitra, Lassi House, Georgia Chai, etc.) or Riviera Fest stalls.
- Real-time outlet open/closed status, dish tags (veg/non-veg, bestsellers), current stock counts, and star ratings are displayed.
- The student adds items to the cart, applies optional promo codes (validated against the `coupons` table), selects an optional pickup slot (validated against `pickup_slots` capacity), or joins a group cart session.

## 3. Instant Transactional Wallet Debit
- When the student clicks "Pay & Place Order", the PostgreSQL stored procedure `place_order_wallet()` executes within an atomic transaction:
  - Verifies menu item availability and active status.
  - Verifies scheduled slot capacity (if a future slot is selected) and row-locks the slot record.
  - Applies coupon discount if valid, deducting the net amount strictly from the student's balance (`studentDebit = baseTotal - discount`).
  - Checks student wallet balance; fails immediately if balance is insufficient.
  - Atomically debits the student's wallet and records the transaction in the ledger.
  - Inserts the primary `orders` row and corresponding `order_items` records with a unique 4-digit token number.

## 4. Kitchen Queue Dispatch via Supabase Realtime
- PostgreSQL emits a realtime change event on `orders`.
- The shop's kitchen display system (KDS) receives the WebSocket payload immediately without client-side polling.
- An audible chime rings on the counter tablet/terminal, and the ticket appears in the "Incoming / Placed" column with the token number, item breakdown, and scheduled pickup time (if applicable).

## 5. Stock Updation (Dual-Path)
- **Automatic Decrement**: The moment the order is inserted, item stock counts in `menu_items` automatically decrement by the ordered quantities. Counter walk-in POS orders placed by staff trigger the same decrement logic.
- **Manual Staff Adjustment**: Kitchen staff and shop admins can adjust stock at any time using quick steppers (+1/-1, +5/-5), presets (10, 25, 50), or the 1-click "86" toggle (mark sold out immediately if raw ingredients run out).

## 6. Order Preparation & Milestone Status Progression
- Kitchen staff update order status along the milestone lifecycle:
  - **Placed**: Order received, awaiting kitchen processing.
  - **Preparing**: Chef/cook starts food preparation; student UI updates in real-time.
  - **Ready**: Food is packaged and placed at the counter shelf for pickup.

## 7. Automated Notifications (MSG91)
- As soon as the order transitions to **Ready**, an automated webhook triggers the MSG91 SMS gateway.
- A concise SMS containing the token number, outlet name, and pickup counter is dispatched to the student's registered mobile number.
- In-app push notifications and visual status stepper highlight the "Ready for Collection" state with a live QR code pass.

## 8. QR-Verified Pickup & Collection
- The student presents their digital token pass or dynamic QR code at the counter.
- Counter staff scan the QR code via their scanner or verify the token number and tap "Mark Collected".
- Status is updated to **Collected** in PostgreSQL via Supabase.
- If the order was part of a referral or loyalty streak, automated triggers (`reward_referral_on_first_order`, `increment_loyalty_on_order_collected`) evaluate eligibility and credit points or vouchers.

## 9. Post-Collection Item Ratings
- Once the order status is **Collected**, the student receives an interactive prompt to submit 1-to-5 star ratings and reviews for each item consumed.
- Ratings update the aggregated item scores in real time, influencing outlet sorting on the browse screen.

## 10. End-of-Day Reconciliation & Settlement
- Shop Admin and Super Admin consoles track live gross merchandise value (GMV), net sales, platform commission (5%), and net shop payouts.
- At the end of trading hours, daily sales summaries are locked and exported for accounting and bank transfers.
