# Role Hierarchy & Access Control

V-BUY enforces a strict four-tier role hierarchy governed by PostgreSQL Row-Level Security (RLS) policies and frontend route guards.

---

## 1. Super Admin (System Head)
- **Scope**: Platform-wide across all campus canteens and event stalls.
- **Account Creation**: Pre-seeded in the database or elevated directly by existing Super Admins.
- **What They Can See**:
  - Global dashboard across all 13+ canteens and Riviera stalls.
  - Platform-wide GMV, total transaction volume, platform commission revenue (5%), and net shop payouts.
  - Complete immutable audit logs, wallet ledger entries, and system-wide order history.
  - User and shop management tables.
- **What They Can Do**:
  - Provision and onboard new campus canteens and temporary event stalls.
  - Invite, promote, suspend, or revoke Shop Admin accounts.
  - Override system-level settings, adjust platform fee parameters, and trigger manual wallet adjustments if required.
  - Export system-wide compliance and financial audit reports.

---

## 2. Shop Admin (Outlet Owner)
- **Scope**: Restricted strictly to their assigned outlet (`outlet_id`).
- **Account Creation**: Invite-based; invited and assigned to an outlet by the Super Admin.
- **What They Can See**:
  - Financial dashboard for their specific outlet (daily, weekly, monthly revenue, order counts, average ticket size).
  - Outlet-specific order history and customer ratings breakdown.
  - Menu catalog, pricing, item descriptions, and category organization.
  - Active staff members assigned to their shop.
- **What They Can Do**:
  - Add, edit, or archive menu items and update prices for their outlet.
  - Invite and manage Shop Staff members for their counter.
  - Toggle outlet operating hours (Open/Closed status).
  - Configure pickup slot capacities and view net payout settlements.

---

## 3. Shop Staff (Kitchen & Counter Operations)
- **Scope**: Operational workflow for their assigned outlet (`outlet_id`).
- **Account Creation**: Invite-based; invited and provisioned by the Shop Admin or Super Admin.
- **What They Can See**:
  - Real-time Kitchen Display System (KDS) order queue (`Placed`, `Preparing`, `Ready`).
  - Active order details: token numbers, items, quantities, scheduled pickup times, and customer notes.
  - Current stock inventory levels and 86-status (out-of-stock flags) for their outlet's menu items.
  - Counter walk-in POS interface.
- **What They Can Do**:
  - Advance order statuses (`Placed` → `Preparing` → `Ready` → `Collected`).
  - Scan customer QR passes or verify token numbers to hand over orders.
  - Update stock quantities using live steppers (+1/-1, +5/-5), presets, or trigger the 1-click "86" button to take items off the menu instantly.
  - Enter counter walk-in cash/UPI orders into the POS system (automatically decrementing stock).

---

## 4. Student (Customer)
- **Scope**: Personal account and order data.
- **Account Creation**: Self-registration using mobile number OTP verification (VIT email as secondary recovery contact).
- **What They Can See**:
  - All open campus canteens, Riviera stalls, active menus, prices, dietary tags, stock levels, and ratings.
  - Personal wallet balance, transaction ledger, and top-up options.
  - Personal order history, active token passes, live visual order progress, and QR collection codes.
  - Loyalty streak progress, earned meal vouchers, and personal referral code.
- **What They Can Do**:
  - Top up prepaid wallet via PhonePe UPI.
  - Assemble cart, apply coupon promo codes, select pickup time slots, or create/join group carts.
  - Place orders with instant wallet debit.
  - Submit ratings and reviews for collected food items.
  - Share referral codes to earn wallet credits on peers' first orders.

---

## Schema RLS Policy Mapping Reference
PostgreSQL RLS policies in `supabase/migrations/008_four_tier_roles_invites_and_stock.sql` enforce these boundaries directly in the database:
- `orders`:
  - Students: `SELECT` own orders (`auth.uid() = user_id`); `INSERT` via `place_order_wallet()`.
  - Staff / Shop Admin: `SELECT` and `UPDATE` status where `outlet_id = public.get_my_outlet()`.
  - Super Admin: Unrestricted `ALL` access across all rows.
- `menu_items`:
  - Public/Student: `SELECT` all active menu items.
  - Staff: `UPDATE` `stock_qty` and `available` where `outlet_id = public.get_my_outlet()`.
  - Shop Admin: Full `ALL` CRUD operations where `outlet_id = public.get_my_outlet()`.
  - Super Admin: Unrestricted `ALL` access across all outlets.
- `stock_adjustments`:
  - Staff & Shop Admin: `SELECT` adjustment history where `outlet_id = public.get_my_outlet()`.
  - Super Admin: `ALL` access for auditing.
- `invites`:
  - Shop Admin: `ALL` invites scoped strictly to their `outlet_id` (staff only).
  - Super Admin: `ALL` invites across all roles and outlets.
- `profiles`:
  - Users: `SELECT` and `UPDATE` own profile (`id = auth.uid()`).
  - Shop Admin: `SELECT` and manage team members where `outlet_id = public.get_my_outlet()` and `role = 'staff'`.
  - Super Admin: Full `ALL` management across all roles.
- `wallets` & `wallet_txns`:
  - Students: `SELECT` only rows where `wallet_id` belongs to `auth.uid()`.
  - Stored Procedures (`SECURITY DEFINER`): System-managed debit and credit execution.
  - Super Admin: Read-only access for financial auditing and platform profit tracking.
