# How an Order Works: The Complete Lifecycle

A simple, step-by-step walk-through of how orders move through V FOODS from start to finish.

---

## 1. Student Wallet Top-Up (via PhonePe)

- Students add money to their prepaid balance inside the Wallet tab.
- Payment is handled exclusively by **PhonePe**, supporting all UPI apps (PhonePe, Google Pay, BHIM) and bank cards.
- **Fee Rules**:
  - **UPI / RuPay**: 0% fee. If a student adds ₹100, they pay ₹100 and receive exactly ₹100 in their wallet.
  - **Credit / Debit Cards**: A small bank processing fee is calculated using the reverse formula (`Amount / 0.9765`) so the student still receives the full clean amount in their wallet.
- Once PhonePe completes the transaction, it sends an automatic instant notification called a **webhook** to our server.
- Our server verifies the digital signature to ensure the notification is genuine, then credits the student's wallet balance.
- **Safety Guarantee**: Every payment uses an unchangeable transaction key. Even if the network sends the confirmation twice by mistake, the database guarantees the wallet is only credited once.
- **Key Rule**: PhonePe is used ONLY for wallet top-ups. Food orders are never routed through PhonePe directly.

---

## 2. Menu Browsing & Cart Assembly

- Students browse campus canteens (such as Gazebo, Dakshin Chitra, and North Square) or festival stalls.
- Every canteen shows its live status (Open or Closed), wait times, customer ratings, and cuisine tags.
- Dishes clearly display vegetarian or non-vegetarian badges, current stock levels, and bestseller tags.
- Students can customize their order with extra options:
  - **Coupons**: Apply discount promo codes to save money.
  - **Scheduled Pickup**: Pick a specific future 15-minute pickup slot to beat the peak lunch rush.
  - **Group Ordering**: Share a code so friends can combine items into one order.

---

## 3. Checkout: Dual Payment Options (Wallet or Instant Gateway)

When ready to order, the student chooses their preferred payment method:

- **Method A: Campus Prepaid Wallet**:
  - Deducts the meal total from the student's prepaid balance in under one second.
  - Zero bank loading spinners, zero OTPs, zero network delay.
  - If the wallet balance is low, the student can 1-tap top up the deficit or switch to Instant Gateway.

- **Method B: Instant Payment Gateway (PhonePe / Paytm UPI)**:
  - Connects directly to PhonePe, Paytm, Google Pay, or any UPI app.
  - Allows immediate payment per order without needing prior wallet balance.
  - Once authorized by the bank, the order is confirmed and sent directly to the kitchen.

Regardless of payment method:
- The database confirms the canteen is open and stock is reserved.
- A unique 4-digit pickup token number (such as `284`) and secure pickup QR pass are generated instantly.

---

## 4. Kitchen Queue Dispatch via Realtime

- The moment the database records the order, Supabase sends a live WebSocket signal directly to the canteen's kitchen screen.
- A notification chime rings on the counter tablet.
- The order instantly pops up in the **Incoming / Placed** column with its token number, item quantities, and special cooking notes.
- Kitchen staff never need to refresh their browser or check paper printouts.

---

## 5. Automatic & Manual Stock Tracking

- **Automatic Deduction**: The database automatically decreases available stock by the quantities ordered. If a dish reaches zero portions remaining, it automatically flips to "Sold Out" so nobody else can order it.
- **Staff Controls**: Kitchen cooks can also adjust stock manually using quick buttons (+1, -1, +5, -5) or tap the one-click **86** button to immediately mark an item sold out if fresh ingredients run out.

---

## 6. Food Preparation & Milestone Progression

- Kitchen staff update the order step-by-step on their screen:
  - **Placed**: Order received and queued.
  - **Preparing**: Cook starts preparing the food. The student's screen updates in real time to show their food is cooking.
  - **Ready**: Food is packaged and placed on the pickup counter.

---

## 7. Ready-for-Pickup Notification (MSG91)

- The second staff mark the order **Ready**, the system triggers the MSG91 messaging service.
- An automated WhatsApp message or SMS is sent to the student with their token number and pickup counter name.
- On the student's phone, the order card lights up with a live QR collection pass.

---

## 8. QR-Verified Pickup & Collection

- The student walks to the counter and presents their token number or digital QR pass.
- Counter staff scan the QR code or verify the token number and tap **Mark Collected**.
- The database changes the order status to `collected`, closing the food ticket.
- *(Note: Earlier promotional referral codes and loyalty streak systems have been permanently removed to protect database speed and eliminate any risk of ledger fraud).*

---

## 9. Post-Collection Food Ratings

- Once food is collected, an optional rating prompt appears on the student's screen.
- Students can leave a 1-to-5 star rating and review for the dishes they ate.
- These ratings update dish scores across campus in real time, helping other students find the best meals.

---

## 10. Daily Settlements & Financial Reconciliation

- The platform calculates earnings automatically:
  - **Shop Payout**: The canteen owner receives 100% of their official menu prices.
  - **Platform Commission**: The 5% system fee is recorded separately for campus maintenance.
- At the end of each day, administrators and shop owners can review their clean sales breakdown and export financial summaries.
