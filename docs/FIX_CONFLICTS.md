# Fix Conflicts & Skipped Defects Log

Per Rule 4:
> "Never change: Paytm logic, webhooks, wallet logic, payment verification, payment splits, place_order money math, verify_and_record_payment, authentication. If a defect needs one of these, log it in docs/FIX_CONFLICTS.md and skip it."

The following defects from `AUDIT_POPUPS_EDITS.md` intersect with protected payment and wallet sub-systems and are logged here for explicit review rather than modifying sensitive financial pipelines:

---

## 1. DEFECT-02: Missing Payment Ledger Rows for 93.7% of Orders
- **Protected Category:** Payment verification, `place_order` money math, `verify_and_record_payment`.
- **Description:** Only 1 out of 16 orders has a row in the `payments` table. Earlier checkout and POS punch flows wrote directly to `orders` and `wallet_txns` without invoking payment ledger recording.
- **Why Skipped:** Modifying checkout and order placement flows to write into `payments` directly alters `place_order` and `verify_and_record_payment` pipelines, which is strictly prohibited by Rule 4.
- **Recommended Action for Backend Team:** Add an atomic PostgreSQL trigger on the `orders` table (`AFTER INSERT ON orders`) to auto-populate `payments` rows safely without altering frontend payment handler code.

---

## 2. DEFECT-06: Unledgered Wallet Balance Seeding (₹2,554 Discrepancy)
- **Protected Category:** Wallet logic, wallet transactions.
- **Description:** User `Rahul Sharma` (`a6d778ae-5174-4bbf-8e68-00ef619a1ced`) has `wallets.balance = 2178` with transaction sum of `-376`, creating a `+₹2,554` unledgered discrepancy.
- **Why Skipped:** Modifying wallet balance reconciliation or transaction recalculation affects sensitive wallet debit/credit logic prohibited by Rule 4.
- **Recommended Action for Database Team:** Issue a manual ledger audit adjustment row in `wallet_txns` (`kind: 'audit_adjustment'`, `amount: 2554`) for user `a6d778ae-5174-4bbf-8e68-00ef619a1ced` to balance the ledger.
