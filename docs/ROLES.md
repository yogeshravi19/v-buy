# Role Hierarchy & Access Control

A plain-English guide to who uses V-BUY and what each role is permitted to see and do.

---

## 1. Super Admin (Campus Administrator)

- **Who they are**: Campus authorities or system managers in charge of overall campus food operations.
- **How accounts are created**: Pre-configured in the database or promoted directly by existing administrators.
- **What they can see**:
  - A master overview across all campus canteens, food courts, and festival stalls.
  - Overall campus sales figures, total orders placed, platform fees collected (5%), and net shop payouts.
  - Complete history of user wallets, payments, and system activity logs.
- **What they can do**:
  - Add new food stalls and canteens to the system.
  - Send invite codes to onboard new canteen owners and administrators.
  - Toggle campus festival mode on or off to highlight special event stalls.
  - Export financial and audit reports for university accounting.

---

## 2. Shop Admin (Canteen Owner)

- **Who they are**: The franchisee or owner running one specific canteen on campus (such as Gazebo C1 or Dakshin Chitra).
- **How accounts are created**: Invited through a private invite link created by the Super Admin.
- **What they can see**:
  - Daily, weekly, and monthly sales and earnings for their own shop only.
  - Customer ratings and feedback left for their dishes.
  - Full menu catalog with prices, categories, and inventory stock counts.
  - The team of kitchen cooks and counter staff assigned to their stall.
- **What they can do**:
  - Add new dishes, change food prices, or edit descriptions for their own stall.
  - Invite and manage kitchen staff members for their counter.
  - Turn their stall Open or Closed at any time.
  - Set limits on scheduled pickup slots so the kitchen is not overwhelmed.

---

## 3. Shop Staff (Kitchen Cooks & Counter Cashiers)

- **Who they are**: The workers who cook food, assemble plates, and hand orders to students at the counter.
- **How accounts are created**: Invited by the Shop Admin or Super Admin to work at a specific counter.
- **What they can see**:
  - The live digital Kitchen Display System (KDS) showing new orders as they arrive.
  - Order details: 4-digit pickup token, dish names, quantities, and cooking notes.
  - Current stock inventory levels for their stall's dishes.
- **What they can do**:
  - Move orders through each cooking step: tap to start **Preparing**, tap when **Ready for Pickup**.
  - Scan the student's digital QR pass or check their 4-digit token to tap **Mark Collected**.
  - Adjust portion counts up or down if ingredients change.
  - Tap the red **86** button to mark any dish sold out immediately if an ingredient runs out.

---

## 4. Student (Customer)

- **Who they are**: Students, faculty, and campus staff who order food on campus.
- **How accounts are created**: Self-registration on the login page using mobile phone verification.
- **What they can see**:
  - All open campus canteens and festival stalls with live wait times and menus.
  - Dish photos, prices, vegetarian/non-vegetarian indicators, and customer review scores.
  - Their personal prepaid wallet balance and recent spending history.
  - Active order status tracking with live updates and a digital QR collection pass.
- **What they can do**:
  - Top up their prepaid campus wallet using PhonePe (supporting any UPI app or bank card).
  - Add items to cart, enter promo discount codes, or choose a scheduled pickup time.
  - Create or join group ordering sessions with friends.
  - Pay for food orders instantly from their wallet balance.
  - Submit 1-to-5 star ratings and reviews for dishes they have picked up.

---

## How Database Security Protects Each Role

V-BUY uses **Row-Level Security (RLS)** built directly into the database:
- **No data mixing**: The database itself enforces boundaries. An app screen cannot accidentally display a North Square order on a Gazebo kitchen screen.
- **Private student wallets**: Students can only access their own balance and transaction records.
- **Private shop earnings**: Canteen owners can only access financial numbers for their own specific shop ID.
- **Tamper-proof safety**: Even if an unauthorized person attempts to modify network requests in their browser, the database rejects any command outside the user's role.
