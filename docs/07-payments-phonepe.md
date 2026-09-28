# Payments & PhonePe: Dual Payment Architecture (Wallet + Instant Gateway)

A plain-English guide to how payments work in V FOODS, why we support both a **Prepaid Campus Wallet** and an **Instant Payment Gateway (PhonePe / Paytm UPI)**, and how transactions remain fast and secure.

---

## The Dual Payment Choice: Flexibility & Speed

V FOODS provides two flexible payment methods directly on the checkout screen:

1. **Option A: V FOODS Campus Wallet (Prepaid 1-Tap Checkout)**
   - **How it works**: Students add money to their digital campus wallet when convenient (dorm, home, or morning) via PhonePe / UPI.
   - **Why use it**: When buying food during a busy 10-minute break, deducting from the prepaid balance takes under one second with zero bank redirects or OTP delays.
   - **Top-Up**: Recharge anytime in ₹100, ₹200, ₹500 increments or top up the exact deficit needed for an order.

2. **Option B: Instant Payment Gateway (PhonePe / Paytm UPI Direct Checkout)**
   - **How it works**: Students can pay directly per order using PhonePe, Paytm, Google Pay, or any UPI app.
   - **Why use it**: Perfect for students ordering for the first time, visitors, or anyone who prefers direct bank debit per transaction without maintaining a prepaid wallet float.
   - **Zero Prior Top-Up**: Places the order immediately upon bank approval without touching the wallet balance.

---

## The Exact Payment Journey

Here is the exact step-by-step path money takes through V FOODS:

### Step 1: Student Initiates a Wallet Top-Up
- The student opens the **Wallet** tab, chooses an amount (such as ₹200), and selects their payment method (UPI or Card).
- **Fee Rules**:
  - **UPI / RuPay (0% Fee)**: If a student adds ₹200 via UPI, they pay exactly ₹200 and receive ₹200 in their wallet.
  - **Bank Cards (Reverse Fee Pass-Through)**: Credit and debit cards carry a standard bank processing fee. The app uses the reverse formula (`Amount / 0.9765`) to charge the small extra fee to the card, so the student's wallet still receives the clean ₹200 requested.

### Step 2: PhonePe Collects the Payment
- V FOODS creates a secure transaction payload and passes the student to PhonePe.
- The student authorizes the payment using their preferred UPI app (PhonePe, Google Pay, BHIM) or bank card.

### Step 3: PhonePe Sends a Secure Webhook Confirmation
- The moment the money leaves the student's bank account, PhonePe sends an automated notification called a **webhook** directly to our FastAPI server.
- The notification includes the transaction ID, amount paid, and a cryptographic digital signature (`X-VERIFY`).

### Step 4: Server Verifies the Signature
- Before trusting the message, our server recalculates the signature using our private secret key (`SALT_KEY`).
- If the signature matches, the server knows the message genuinely came from PhonePe and was not tampered with.

### Step 5: Wallet Is Credited Idempotently
- Our server calls the `credit_wallet()` stored procedure in Supabase.
- The database adds the money to the student's wallet and writes an unchangeable audit log in `wallet_txns`.
- **Double-Credit Protection**: The transaction ID is locked. If PhonePe's server sends the confirmation twice by mistake, the database detects the duplicate and ignores it, ensuring the student is never credited twice.

### Step 6: Instant Food Ordering
- Later, when the student wants to eat, they select their food and tap **Place Order**.
- The database checks their wallet balance and deducts the meal cost instantly.
- The kitchen screen chimes and cooks start preparing the food.
- **PhonePe is not involved at checkout**: No bank connections, no OTPs, and zero loading spinners.

---

## Why Checkout Doesn't Wait on PhonePe

Separating wallet top-up from food ordering is the key design choice that makes V FOODS fast:

| Typical Food App (Gateway at Checkout) | V FOODS (Wallet-First Model) |
| :--- | :--- |
| Gateway opens during lunch rush | Gateway used before lunch at leisure |
| Requires strong cellular signal at counter | Requires zero internet speed at counter |
| 30 to 60 second bank delay per order | Under 1 second instant database deduction |
| Payment failures leave students hungry in line | Zero checkout payment failures |
| Counter cashiers wait on banking screens | Counter cashiers hand over pre-paid meals |

---

## How the App Knows a Payment is Genuine

How do we stop someone from pretending they paid ₹500 when they didn't?

1. **The Secret Stamp**: PhonePe and our server share a private secret code (called a `SALT_KEY`) that is never revealed to the public or sent to any browser.
2. **The Digital Signature**: When PhonePe tells our server that a payment succeeded, it creates a unique digital stamp using SHA-256 mathematical encryption that combines the payment details with the secret key.
3. **Verification**: When our server receives the message, it runs the exact same formula. If the calculated stamp matches the stamp on the message, the server knows:
   - The message 100% came from PhonePe's official bank servers.
   - Nobody intercepted or altered the amount along the way.
4. **No Trust in the Phone**: The student's phone browser is never trusted to confirm a payment. Only PhonePe's server-to-server webhook can credit money to a wallet.
