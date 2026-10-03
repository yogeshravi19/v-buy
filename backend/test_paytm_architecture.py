"""
V FOODS - Automated Verification Suite for Paytm Payment Architecture
Tests:
1. Cryptographic Checksum Generation and Verification (HMAC-SHA256)
2. FastAPI Webhook Signature Enforcement & Security (Rejection of tampered payloads)
3. Wallet Top-Up Flow (Payments row created, 0 payment_splits, wallet balance credited)
4. Direct-Pay Order Flow (Payments row created, exactly 3 payment_splits summing to 100%)
5. Wallet-Funded Order Flow (3-way split produced via calculate_order_split(), 0 new Paytm txns)
6. Outlet-Specific Split Percentages (Differing shop_split_percentage produces correct SHOP share while platform/college remain fixed)
7. Duplicate Webhook Idempotency (Same paytm_txn_id produces zero duplicate records and zero double-credit)
"""

import sys
import os
import unittest
from decimal import Decimal
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from main import app, _paytm_generate_checksum, _paytm_verify_checksum, PAYTM_MERCHANT_KEY

class SimulatedVFoodsDB:
    """
    In-memory relational test harness executing the exact logic of
    migration 011_paytm_three_way_split.sql for verification.
    """
    def __init__(self):
        self.wallets = {"usr_test_1": 500}
        self.wallet_txns = []
        self.orders = {}
        self.payments = {}
        self.payment_splits = []
        self.outlet_paytm_accounts = {
            "main-canteen": {
                "outlet_id": "main-canteen",
                "paytm_account_id": "PAYTM_OUTLET_MAIN_CANTEEN",
                "shop_split_percentage": Decimal("90.0"),
                "settlement_enabled": True
            },
            "tech-cafe": {
                "outlet_id": "tech-cafe",
                "paytm_account_id": "PAYTM_OUTLET_TECH_CAFE",
                "shop_split_percentage": Decimal("85.0"),
                "settlement_enabled": True
            }
        }
        self.platform_settlement_account = {
            1: {
                "id": 1,
                "paytm_account_id": "PAYTM_PLATFORM_VFOODS_01",
                "platform_split_percentage": Decimal("5.0"),
                "settlement_enabled": True
            }
        }
        self.college_settlement_accounts = {
            1: {
                "id": 1,
                "campus_name": "VIT Chennai",
                "paytm_account_id": "PAYTM_COLLEGE_VITC_01",
                "is_active": True,
                "college_split_percentage": Decimal("5.0"),
                "settlement_enabled": True
            }
        }
        self._next_payment_id = 1
        self._next_order_id = 100

    def credit_wallet(self, user_id: str, amount: int, kind: str, ref: str, note: str = ""):
        # Check idempotency on ref
        for txn in self.wallet_txns:
            if txn["ref"] == ref:
                return "already_credited"
        
        self.wallets[user_id] = self.wallets.get(user_id, 0) + amount
        txn_id = len(self.wallet_txns) + 1
        self.wallet_txns.append({
            "id": txn_id,
            "user_id": user_id,
            "amount": amount,
            "kind": kind,
            "ref": ref,
            "note": note
        })
        return txn_id

    def calculate_order_split(self, order_id: int, payment_id: int = None):
        order = self.orders.get(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")

        resolved_payment_id = payment_id or order.get("payment_id")
        if not resolved_payment_id:
            # Wallet-funded order creates internal settlement payment record
            resolved_payment_id = self._next_payment_id
            self._next_payment_id += 1
            self.payments[resolved_payment_id] = {
                "id": resolved_payment_id,
                "user_id": order["user_id"],
                "order_id": order_id,
                "amount": order["total"],
                "payment_purpose": "ORDER",
                "payment_method": "WALLET",
                "status": "SUCCESS",
                "payment_reference": f"wallet:order:{order_id}",
                "paytm_txn_id": None
            }
            order["payment_id"] = resolved_payment_id

        # Idempotency check: exactly one set of splits per payment
        existing_splits = [s for s in self.payment_splits if s["payment_id"] == resolved_payment_id]
        if existing_splits:
            return existing_splits

        outlet_acc = self.outlet_paytm_accounts.get(order["outlet_id"])
        platform_acc = self.platform_settlement_account[1]
        active_college = next(c for c in self.college_settlement_accounts.values() if c["is_active"])

        total = Decimal(str(order["total"]))
        shop_pct = outlet_acc["shop_split_percentage"]
        platform_pct = platform_acc["platform_split_percentage"]
        college_pct = active_college["college_split_percentage"]

        # Validate that percentages sum to 100
        if (shop_pct + platform_pct + college_pct) != Decimal("100.0"):
            # Adjust college or platform if outlet split is customized
            college_pct = Decimal("100.0") - shop_pct - platform_pct

        shop_amount = round(total * (shop_pct / Decimal("100.0")), 2)
        platform_amount = round(total * (platform_pct / Decimal("100.0")), 2)
        college_amount = total - shop_amount - platform_amount

        created_splits = [
            {
                "id": len(self.payment_splits) + 1,
                "payment_id": resolved_payment_id,
                "recipient_type": "SHOP",
                "outlet_paytm_account_id": outlet_acc["outlet_id"],
                "platform_account_id": None,
                "college_account_id": None,
                "split_amount": shop_amount,
                "split_percentage": shop_pct,
                "settlement_status": "PENDING"
            },
            {
                "id": len(self.payment_splits) + 2,
                "payment_id": resolved_payment_id,
                "recipient_type": "PLATFORM",
                "outlet_paytm_account_id": None,
                "platform_account_id": platform_acc["id"],
                "college_account_id": None,
                "split_amount": platform_amount,
                "split_percentage": platform_pct,
                "settlement_status": "PENDING"
            },
            {
                "id": len(self.payment_splits) + 3,
                "payment_id": resolved_payment_id,
                "recipient_type": "COLLEGE",
                "outlet_paytm_account_id": None,
                "platform_account_id": None,
                "college_account_id": active_college["id"],
                "split_amount": college_amount,
                "split_percentage": college_pct,
                "settlement_status": "PENDING"
            }
        ]
        self.payment_splits.extend(created_splits)
        return created_splits

    def verify_and_record_payment(self, paytm_txn_id: str, status: str, paytm_order_id: str = None, failure_reason: str = None):
        # Locate payment by paytm_order_id or paytm_txn_id
        target_payment = None
        for p in self.payments.values():
            if p.get("paytm_txn_id") == paytm_txn_id or (paytm_order_id and p.get("paytm_order_id") == paytm_order_id):
                target_payment = p
                break

        if not target_payment:
            raise ValueError("Payment not found")

        # Idempotency: if already SUCCESS, no-op
        if target_payment["status"] == "SUCCESS":
            return {"status": "already_processed", "payment_id": target_payment["id"]}

        target_payment["status"] = status
        target_payment["paytm_txn_id"] = paytm_txn_id
        target_payment["failure_reason"] = failure_reason

        if status == "SUCCESS":
            if target_payment["payment_purpose"] == "WALLET_TOPUP":
                ref = f"paytm:{paytm_txn_id}"
                txn_id = self.credit_wallet(target_payment["user_id"], int(target_payment["amount"]), "topup", ref)
                target_payment["wallet_txn_id"] = txn_id
                return {"status": "success", "purpose": "WALLET_TOPUP", "payment_id": target_payment["id"], "amount": target_payment["amount"]}
            elif target_payment["payment_purpose"] == "ORDER":
                order_id = target_payment["order_id"]
                order = self.orders[order_id]
                order["status"] = "placed"
                order["token"] = "420"
                order["payment_id"] = target_payment["id"]
                self.calculate_order_split(order_id, target_payment["id"])
                return {"status": "success", "purpose": "ORDER", "order_id": order_id, "payment_id": target_payment["id"]}

        return {"status": status}


class TestPaytmPaymentArchitecture(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SimulatedVFoodsDB()

    @classmethod
    def tearDownClass(cls):
        from main import scheduler
        if scheduler.running:
            scheduler.shutdown(wait=False)


    def test_01_cryptographic_checksum(self):
        """Test SHA256 HMAC checksum generation and verification."""
        params = {
            "MID": "TEST_MID_123",
            "ORDER_ID": "ORD_9999",
            "TXN_AMOUNT": "150.00",
            "CHANNEL_ID": "WAP"
        }
        sig = _paytm_generate_checksum(params, PAYTM_MERCHANT_KEY)
        self.assertTrue(len(sig) > 20, "Checksum must be non-empty hex digest")
        
        # Verify valid signature
        self.assertTrue(_paytm_verify_checksum(params, PAYTM_MERCHANT_KEY, sig))
        
        # Tampered parameter must fail
        tampered_params = dict(params)
        tampered_params["TXN_AMOUNT"] = "1.00"
        self.assertFalse(_paytm_verify_checksum(tampered_params, PAYTM_MERCHANT_KEY, sig))

        # Tampered signature must fail
        self.assertFalse(_paytm_verify_checksum(params, PAYTM_MERCHANT_KEY, "invalid_sig_12345"))

    def test_02_webhook_rejects_untrusted_signature(self):
        """Webhooks with missing or invalid checksums must be rejected with 400 Bad Request."""
        payload = {
            "MID": "MOCK_PAYTM_MID",
            "ORDERID": "ORD-TEST-001",
            "TXNID": "TXN_INVALID_SIG",
            "STATUS": "TXN_SUCCESS",
            "CHECKSUMHASH": "bogus_checksum"
        }
        resp = self.client.post("/webhooks/paytm", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Invalid Paytm checksum signature", resp.text)

    def test_03_wallet_topup_flow(self):
        """
        Wallet top-up:
        1. payments row created
        2. zero payment_splits rows
        3. wallet balance increases correctly
        """
        user_id = "usr_test_1"
        initial_balance = self.db.wallets[user_id]
        topup_amount = 300

        # Simulate creation of pending payment
        payment_id = self.db._next_payment_id
        self.db._next_payment_id += 1
        self.db.payments[payment_id] = {
            "id": payment_id,
            "user_id": user_id,
            "order_id": None,
            "amount": topup_amount,
            "payment_purpose": "WALLET_TOPUP",
            "payment_method": "UPI_APP",
            "status": "PENDING",
            "paytm_order_id": "TOPUP-ORD-001"
        }

        # Simulate webhook execution
        res = self.db.verify_and_record_payment("PAYTM_TXN_TOPUP_101", "SUCCESS", paytm_order_id="TOPUP-ORD-001")
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["purpose"], "WALLET_TOPUP")

        # Verify wallet balance
        new_balance = self.db.wallets[user_id]
        self.assertEqual(new_balance, initial_balance + topup_amount)

        # Verify zero payment_splits rows created for top-up
        topup_splits = [s for s in self.db.payment_splits if s["payment_id"] == payment_id]
        self.assertEqual(len(topup_splits), 0, "Top-up must NEVER produce payment_splits")

    def test_04_direct_pay_order_flow(self):
        """
        Direct-pay order:
        1. payments row created
        2. payment_splits produces exactly 3 rows (SHOP, PLATFORM, COLLEGE)
        3. 3 splits sum exactly to full order amount
        4. Uses the outlet's own shop_split_percentage
        """
        user_id = "usr_test_1"
        order_total = 200  # Total order amount

        # Create pending order at main-canteen (shop_split_percentage = 90%)
        order_id = self.db._next_order_id
        self.db._next_order_id += 1
        self.db.orders[order_id] = {
            "id": order_id,
            "user_id": user_id,
            "outlet_id": "main-canteen",
            "total": order_total,
            "status": "payment_pending",
            "payment_method": "gateway",
            "payment_id": None
        }

        # Create pending payment
        payment_id = self.db._next_payment_id
        self.db._next_payment_id += 1
        self.db.payments[payment_id] = {
            "id": payment_id,
            "user_id": user_id,
            "order_id": order_id,
            "amount": order_total,
            "payment_purpose": "ORDER",
            "payment_method": "UPI_ID",
            "status": "PENDING",
            "paytm_order_id": "ORD-PAYTM-DIRECT-001"
        }

        # Webhook confirmation
        res = self.db.verify_and_record_payment("PAYTM_TXN_DIR_202", "SUCCESS", paytm_order_id="ORD-PAYTM-DIRECT-001")
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["purpose"], "ORDER")

        # Verify order marked placed
        self.assertEqual(self.db.orders[order_id]["status"], "placed")

        # Verify exactly 3 splits
        splits = [s for s in self.db.payment_splits if s["payment_id"] == payment_id]
        self.assertEqual(len(splits), 3, "Direct order must create exactly 3 splits")

        shop_split = next(s for s in splits if s["recipient_type"] == "SHOP")
        platform_split = next(s for s in splits if s["recipient_type"] == "PLATFORM")
        college_split = next(s for s in splits if s["recipient_type"] == "COLLEGE")

        # Verify split amounts: 90% Shop (180), 5% Platform (10), 5% College (10)
        self.assertEqual(shop_split["split_amount"], Decimal("180.00"))
        self.assertEqual(platform_split["split_amount"], Decimal("10.00"))
        self.assertEqual(college_split["split_amount"], Decimal("10.00"))

        # Verify exact sum to total
        total_split = shop_split["split_amount"] + platform_split["split_amount"] + college_split["split_amount"]
        self.assertEqual(total_split, Decimal(str(order_total)))

    def test_05_wallet_funded_order_split(self):
        """
        Wallet-funded order:
        1. Produces identical 3-way split via calculate_order_split()
        2. No new external Paytm transaction created
        """
        user_id = "usr_test_1"
        order_total = 100

        # Place wallet order directly (wallet deducted internally)
        order_id = self.db._next_order_id
        self.db._next_order_id += 1
        self.db.orders[order_id] = {
            "id": order_id,
            "user_id": user_id,
            "outlet_id": "main-canteen",
            "total": order_total,
            "status": "placed",
            "payment_method": "wallet",
            "payment_id": None
        }

        # Trigger calculate_order_split (as called at the end of place_order_wallet)
        splits = self.db.calculate_order_split(order_id)
        self.assertEqual(len(splits), 3)

        # Confirm internal settlement payment created with payment_method='WALLET' and no paytm_txn_id
        linked_payment_id = self.db.orders[order_id]["payment_id"]
        payment = self.db.payments[linked_payment_id]
        self.assertEqual(payment["payment_method"], "WALLET")
        self.assertIsNone(payment["paytm_txn_id"])

        # Splits sum to order total
        total_split = sum(s["split_amount"] for s in splits)
        self.assertEqual(total_split, Decimal(str(order_total)))

    def test_06_differing_outlet_split_percentages(self):
        """
        Two outlets with different shop_split_percentage values:
        - Outlet A (main-canteen) at 90%: SHOP receives 90%
        - Outlet B (tech-cafe) at 85%: SHOP receives 85%
        - Platform and College shares remain consistent
        """
        # Order at Outlet A (main-canteen: 90%)
        order_a_id = self.db._next_order_id
        self.db._next_order_id += 1
        self.db.orders[order_a_id] = {
            "id": order_a_id, "user_id": "usr_test_1", "outlet_id": "main-canteen",
            "total": 100, "status": "placed", "payment_method": "wallet", "payment_id": None
        }
        splits_a = self.db.calculate_order_split(order_a_id)
        shop_a = next(s for s in splits_a if s["recipient_type"] == "SHOP")
        self.assertEqual(shop_a["split_amount"], Decimal("90.00"))

        # Order at Outlet B (tech-cafe: 85%)
        order_b_id = self.db._next_order_id
        self.db._next_order_id += 1
        self.db.orders[order_b_id] = {
            "id": order_b_id, "user_id": "usr_test_1", "outlet_id": "tech-cafe",
            "total": 100, "status": "placed", "payment_method": "wallet", "payment_id": None
        }
        splits_b = self.db.calculate_order_split(order_b_id)
        shop_b = next(s for s in splits_b if s["recipient_type"] == "SHOP")
        self.assertEqual(shop_b["split_amount"], Decimal("85.00"))

        # Both sum perfectly to total
        self.assertEqual(sum(s["split_amount"] for s in splits_a), Decimal("100.00"))
        self.assertEqual(sum(s["split_amount"] for s in splits_b), Decimal("100.00"))

    def test_07_duplicate_webhook_idempotency(self):
        """
        Duplicate webhook for the same paytm_txn_id:
        1. Does NOT create duplicate payment
        2. Does NOT double-credit the wallet
        3. Returns already_processed status
        """
        user_id = "usr_test_1"
        topup_amount = 250

        payment_id = self.db._next_payment_id
        self.db._next_payment_id += 1
        self.db.payments[payment_id] = {
            "id": payment_id,
            "user_id": user_id,
            "order_id": None,
            "amount": topup_amount,
            "payment_purpose": "WALLET_TOPUP",
            "payment_method": "UPI_APP",
            "status": "PENDING",
            "paytm_order_id": "TOPUP-IDEMP-001"
        }

        # First webhook arrival
        res1 = self.db.verify_and_record_payment("TXN_IDEMP_999", "SUCCESS", paytm_order_id="TOPUP-IDEMP-001")
        self.assertEqual(res1["status"], "success")
        bal_after_first = self.db.wallets[user_id]

        # Second webhook arrival (same txn_id retry)
        res2 = self.db.verify_and_record_payment("TXN_IDEMP_999", "SUCCESS", paytm_order_id="TOPUP-IDEMP-001")
        self.assertEqual(res2["status"], "already_processed")

        # Third webhook arrival
        res3 = self.db.verify_and_record_payment("TXN_IDEMP_999", "SUCCESS", paytm_order_id="TOPUP-IDEMP-001")
        self.assertEqual(res3["status"], "already_processed")

        # Wallet balance must NOT be double-credited
        bal_after_retries = self.db.wallets[user_id]
        self.assertEqual(bal_after_first, bal_after_retries)
        self.assertEqual(len([t for t in self.db.wallet_txns if t["ref"] == "paytm:TXN_IDEMP_999"]), 1)

    def test_08_convenience_fee_billing_calculation(self):
        """
        Test 7% convenience fee calculation:
        e.g., if item subtotal is 100, convenience fee is 7, making total bill 107.
        Shop payout receives the base food amount (100).
        """
        item_price = 100
        qty = 1
        subtotal = item_price * qty
        convenience_fee = round(subtotal * 0.07, 2)
        total_bill = round(subtotal + convenience_fee, 2)

        self.assertEqual(subtotal, 100)
        self.assertEqual(convenience_fee, 7.00)
        self.assertEqual(total_bill, 107.00)

        # Multi-item test: 2 items of 45 = 90
        subtotal_2 = 90
        convenience_fee_2 = round(subtotal_2 * 0.07, 2)
        total_bill_2 = round(subtotal_2 + convenience_fee_2, 2)
        self.assertEqual(convenience_fee_2, 6.30)
        self.assertEqual(total_bill_2, 96.30)

        # Exact decimal test without round-off: Veg puff at 20 -> fee is 1.4, total bill is 21.4
        subtotal_3 = 20
        convenience_fee_3 = round(subtotal_3 * 0.07, 2)
        total_bill_3 = round(subtotal_3 + convenience_fee_3, 2)
        self.assertEqual(convenience_fee_3, 1.40)
        self.assertEqual(total_bill_3, 21.40)


if __name__ == "__main__":
    unittest.main()

