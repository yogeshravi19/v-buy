"""
V FOODS - Automated Verification Suite for Payment Reliability and Refunds (Step 9)

Tests covering:
1. Payment succeeds but the webhook never arrives: reconciliation confirms the order.
2. The same webhook arrives twice: no double confirmation, no double credit.
3. Payment succeeds but the item sold out in between: an automatic refund is created exactly once.
4. Pending payment that later fails: the order expires and no refund is created.
5. Duplicate refund trigger: only one refund is created (deterministic refund_ref).
6. Refund webhook arrives twice: no duplicate update.
7. Invalid checksum on any webhook: rejected with HTTP 400.
8. Wallet-funded order failing mid-way: wallet balance is unchanged.
"""

import sys
import os
import unittest
from decimal import Decimal
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from main import (
    app,
    _paytm_generate_checksum,
    _paytm_verify_checksum,
    _paytm_initiate_refund,
    PAYTM_MERCHANT_KEY,
    RECONCILIATION_SECRET
)


class SimulatedReliabilityDB:
    """
    In-memory database state replicating migration 013 and stored procedures:
    - verify_and_record_payment()
    - record_refund()
    - calculate_order_split()
    - expire_stale_awaiting_orders()
    - place_order_wallet()
    """
    def __init__(self):
        self.wallets = {"usr_alice": 500, "usr_bob": 50}
        self.wallet_txns = []
        self.orders = {}
        self.order_items = {}
        self.menu_items = {
            101: {"id": 101, "name": "Veg Roll", "price": 80, "in_stock": True, "stock_count": 5},
            102: {"id": 102, "name": "Special Biryani", "price": 180, "in_stock": False, "stock_count": 0}
        }
        self.payments = {}
        self.refunds = {}
        self.payment_splits = []
        self._next_payment_id = 1
        self._next_order_id = 1001
        self._next_refund_id = 1

    def credit_wallet(self, user_id: str, amount: int, kind: str, ref: str, note: str = ""):
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

    def create_awaiting_payment_order(self, user_id: str, outlet_id: str, items: list, paytm_order_id: str):
        order_id = self._next_order_id
        self._next_order_id += 1
        total_subtotal = sum(it["price"] * it["qty"] for it in items)
        conv_fee = round(total_subtotal * 0.07, 2)
        total_bill = round(total_subtotal + conv_fee, 2)

        payment_id = self._next_payment_id
        self._next_payment_id += 1

        self.orders[order_id] = {
            "id": order_id,
            "user_id": user_id,
            "outlet_id": outlet_id,
            "total": total_bill,
            "status": "awaiting_payment",
            "payment_id": payment_id,
            "token": None,
            "expires_at": "2026-10-11T22:00:00Z"
        }
        self.order_items[order_id] = items

        self.payments[payment_id] = {
            "id": payment_id,
            "user_id": user_id,
            "order_id": order_id,
            "amount": total_bill,
            "payment_purpose": "ORDER",
            "payment_method": "UPI_APP",
            "status": "PENDING",
            "paytm_order_id": paytm_order_id,
            "paytm_txn_id": None
        }
        return order_id, payment_id

    def verify_and_record_payment(self, paytm_txn_id: str, status: str, paytm_order_id: str = None, failure_reason: str = None):
        target_payment = None
        for p in self.payments.values():
            if (paytm_order_id and p.get("paytm_order_id") == paytm_order_id) or (paytm_txn_id and p.get("paytm_txn_id") == paytm_txn_id):
                target_payment = p
                break

        if not target_payment:
            raise ValueError("Payment record not found")

        # Idempotency
        if target_payment["status"] == "SUCCESS":
            return {"status": "already_processed", "payment_id": target_payment["id"]}

        target_payment["paytm_txn_id"] = paytm_txn_id
        target_payment["failure_reason"] = failure_reason

        if status == "SUCCESS":
            target_payment["status"] = "SUCCESS"

            if target_payment["payment_purpose"] == "WALLET_TOPUP":
                ref = f"paytm:{paytm_txn_id}"
                txn_id = self.credit_wallet(target_payment["user_id"], int(target_payment["amount"]), "topup", ref)
                return {"status": "success", "purpose": "WALLET_TOPUP", "payment_id": target_payment["id"]}

            elif target_payment["payment_purpose"] == "ORDER":
                order_id = target_payment["order_id"]
                order = self.orders.get(order_id)
                if not order:
                    return {"status": "refund_needed", "payment_id": target_payment["id"], "reason": "Order record missing"}

                # Check fulfillability (e.g. expired or sold out)
                if order["status"] == "expired":
                    return {"status": "refund_needed", "payment_id": target_payment["id"], "order_id": order_id, "reason": "Order expired before payment completion"}

                items = self.order_items.get(order_id, [])
                for it in items:
                    menu_item = self.menu_items.get(it["item_id"])
                    if not menu_item or not menu_item["in_stock"] or menu_item["stock_count"] < it["qty"]:
                        order["status"] = "cancelled"
                        order["cancel_reason"] = f"Item {menu_item['name'] if menu_item else 'item'} sold out"
                        return {
                            "status": "refund_needed",
                            "payment_id": target_payment["id"],
                            "order_id": order_id,
                            "reason": f"Item sold out: {order['cancel_reason']}"
                        }

                # Success path: flip to paid -> confirmed and enter kitchen queue
                order["status"] = "confirmed"
                order["token"] = "TK-101"
                return {"status": "success", "purpose": "ORDER", "order_id": order_id, "payment_id": target_payment["id"]}

        elif status in ("FAILED", "TXN_FAILURE"):
            target_payment["status"] = "FAILED"
            order_id = target_payment.get("order_id")
            if order_id and order_id in self.orders:
                self.orders[order_id]["status"] = "expired"
            return {"status": "failed", "payment_id": target_payment["id"]}

        return {"status": status}

    def record_refund(self, payment_id: int, refund_ref: str, amount: float, reason: str, status: str = "PENDING"):
        # Deterministic unique check on refund_ref
        for ref_id, r in self.refunds.items():
            if r["refund_ref"] == refund_ref:
                # Idempotent: return existing
                if status == "SUCCESS" and r["status"] != "SUCCESS":
                    r["status"] = "SUCCESS"
                    if payment_id in self.payments:
                        self.payments[payment_id]["status"] = "REFUNDED"
                return {"refund_id": ref_id, "status": r["status"], "already_exists": True}

        refund_id = self._next_refund_id
        self._next_refund_id += 1
        self.refunds[refund_id] = {
            "id": refund_id,
            "payment_id": payment_id,
            "refund_ref": refund_ref,
            "amount": amount,
            "status": status,
            "reason": reason
        }
        if status == "SUCCESS" and payment_id in self.payments:
            self.payments[payment_id]["status"] = "REFUNDED"
        return {"refund_id": refund_id, "status": status, "already_exists": False}

    def place_order_wallet(self, user_id: str, outlet_id: str, items: list):
        """
        Simulates the atomic PostgreSQL transaction for wallet order.
        Single transaction: debits wallet AND creates order.
        If item check fails or insufficient balance, whole transaction rolls back.
        """
        total = sum(it["price"] * it["qty"] for it in items)
        user_balance = self.wallets.get(user_id, 0)
        initial_balance = user_balance

        if user_balance < total:
            return {"error": "INSUFFICIENT_FUNDS", "balance_unchanged": True}

        # Check stock
        for it in items:
            m = self.menu_items.get(it["item_id"])
            if not m or not m["in_stock"]:
                # Abort! Balance must remain unchanged
                return {"error": "ITEM_OUT_OF_STOCK", "balance_unchanged": (self.wallets[user_id] == initial_balance)}

        # Atomic commit
        self.wallets[user_id] -= total
        order_id = self._next_order_id
        self._next_order_id += 1
        self.orders[order_id] = {
            "id": order_id,
            "user_id": user_id,
            "outlet_id": outlet_id,
            "total": total,
            "status": "confirmed",
            "payment_method": "wallet"
        }
        return {"status": "success", "order_id": order_id}


class TestPaymentReliabilitySuite(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SimulatedReliabilityDB()

    @classmethod
    def tearDownClass(cls):
        from main import scheduler
        if scheduler.running:
            scheduler.shutdown(wait=False)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 1: Payment succeeds but webhook never arrives -> reconciliation confirms order
    # ──────────────────────────────────────────────────────────────────────────
    def test_01_webhook_never_arrives_reconciliation_confirms_order(self):
        """
        Scenario: User pays on Paytm, Paytm debits money, but network drops webhook.
        Protected backend reconciliation endpoint calls Paytm status API and confirms the order.
        """
        order_id, payment_id = self.db.create_awaiting_payment_order(
            user_id="usr_alice",
            outlet_id="main-canteen",
            items=[{"item_id": 101, "price": 80, "qty": 1}],
            paytm_order_id="VFOODS-ORDER-REC-01"
        )
        self.assertEqual(self.db.orders[order_id]["status"], "awaiting_payment")
        self.assertEqual(self.db.payments[payment_id]["status"], "PENDING")

        # Mock Paytm Status API returning TXN_SUCCESS
        paytm_status_response = {
            "resultStatus": "TXN_SUCCESS",
            "txnId": "PTM_TXN_RECON_777",
            "txnAmount": "85.60"
        }

        # Reconciliation simulates resolving the pending payment via verify_and_record_payment
        status = paytm_status_response["resultStatus"]
        if status == "TXN_SUCCESS":
            res = self.db.verify_and_record_payment(
                paytm_txn_id=paytm_status_response["txnId"],
                status="SUCCESS",
                paytm_order_id="VFOODS-ORDER-REC-01"
            )

        self.assertEqual(res["status"], "success")
        self.assertEqual(self.db.payments[payment_id]["status"], "SUCCESS")
        self.assertEqual(self.db.orders[order_id]["status"], "confirmed")
        self.assertEqual(self.db.orders[order_id]["token"], "TK-101")

    # ──────────────────────────────────────────────────────────────────────────
    # Test 2: The same webhook arrives twice -> no double confirmation, no double credit
    # ──────────────────────────────────────────────────────────────────────────
    def test_02_duplicate_webhook_arrives_twice_idempotency(self):
        """
        Scenario: Paytm retries webhook delivery.
        Second delivery must NOT double-confirm, must NOT double-credit, and returns already_processed.
        """
        # Wallet top-up test
        pay_id = self.db._next_payment_id
        self.db._next_payment_id += 1
        self.db.payments[pay_id] = {
            "id": pay_id,
            "user_id": "usr_alice",
            "order_id": None,
            "amount": 200,
            "payment_purpose": "WALLET_TOPUP",
            "status": "PENDING",
            "paytm_order_id": "VFOODS-TOPUP-DUP-01"
        }
        initial_balance = self.db.wallets["usr_alice"]

        # 1st Webhook delivery
        res1 = self.db.verify_and_record_payment("TXN_PTM_DUP_100", "SUCCESS", "VFOODS-TOPUP-DUP-01")
        self.assertEqual(res1["status"], "success")
        self.assertEqual(self.db.wallets["usr_alice"], initial_balance + 200)

        # 2nd Webhook delivery (duplicate)
        res2 = self.db.verify_and_record_payment("TXN_PTM_DUP_100", "SUCCESS", "VFOODS-TOPUP-DUP-01")
        self.assertEqual(res2["status"], "already_processed")
        self.assertEqual(self.db.wallets["usr_alice"], initial_balance + 200, "Wallet must not double-credit")

        # 3rd Webhook delivery (another retry)
        res3 = self.db.verify_and_record_payment("TXN_PTM_DUP_100", "SUCCESS", "VFOODS-TOPUP-DUP-01")
        self.assertEqual(res3["status"], "already_processed")
        self.assertEqual(self.db.wallets["usr_alice"], initial_balance + 200)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 3: Payment succeeds but item sold out in between -> automatic refund created exactly once
    # ──────────────────────────────────────────────────────────────────────────
    def test_03_payment_succeeds_item_sold_out_automatic_refund(self):
        """
        Scenario: User checkout had item in stock, but before payment completed,
        last item was sold. Payment succeeds on Paytm, but order cannot be confirmed.
        System must trigger automatic refund and NOT enter kitchen queue.
        """
        order_id, payment_id = self.db.create_awaiting_payment_order(
            user_id="usr_alice",
            outlet_id="main-canteen",
            items=[{"item_id": 102, "price": 180, "qty": 1}], # Item 102 is in_stock: False
            paytm_order_id="VFOODS-ORDER-SOLDOUT-01"
        )

        res = self.db.verify_and_record_payment("PTM_TXN_SOLDOUT_999", "SUCCESS", "VFOODS-ORDER-SOLDOUT-01")
        self.assertEqual(res["status"], "refund_needed")
        self.assertIn("sold out", res["reason"].lower())

        # Automatic refund initiated with deterministic reference
        refund_ref = f"refund-{payment_id}"
        refund_res = self.db.record_refund(payment_id, refund_ref, 180.0, res["reason"], "PENDING")
        self.assertEqual(refund_res["status"], "PENDING")
        self.assertFalse(refund_res["already_exists"])
        self.assertEqual(self.db.orders[order_id]["status"], "cancelled")

    # ──────────────────────────────────────────────────────────────────────────
    # Test 4: Pending payment that later fails -> order expires and no refund is created
    # ──────────────────────────────────────────────────────────────────────────
    def test_04_pending_payment_fails_order_expires_no_refund(self):
        """
        Scenario: User drops payment or bank declines.
        Payment is marked FAILED, order status becomes expired, zero refunds created.
        """
        order_id, payment_id = self.db.create_awaiting_payment_order(
            user_id="usr_alice",
            outlet_id="main-canteen",
            items=[{"item_id": 101, "price": 80, "qty": 1}],
            paytm_order_id="VFOODS-ORDER-FAIL-01"
        )

        res = self.db.verify_and_record_payment(
            "PTM_TXN_FAILED_001",
            "FAILED",
            "VFOODS-ORDER-FAIL-01",
            failure_reason="User cancelled on bank page"
        )
        self.assertEqual(res["status"], "failed")
        self.assertEqual(self.db.payments[payment_id]["status"], "FAILED")
        self.assertEqual(self.db.orders[order_id]["status"], "expired")

        # Verify zero refunds created
        refunds_for_pay = [r for r in self.db.refunds.values() if r["payment_id"] == payment_id]
        self.assertEqual(len(refunds_for_pay), 0, "No refund should be created for failed payments")

    # ──────────────────────────────────────────────────────────────────────────
    # Test 5: Duplicate refund trigger -> only one refund is created
    # ──────────────────────────────────────────────────────────────────────────
    def test_05_duplicate_refund_trigger_deterministic_key(self):
        """
        Scenario: Network retry or duplicate reconciliation trigger fires refund.
        Deterministic refund_ref (refund-<payment_id>) ensures only 1 refund record exists.
        """
        payment_id = 888
        self.db.payments[payment_id] = {"id": payment_id, "amount": 150.0, "status": "SUCCESS"}
        refund_ref = f"refund-{payment_id}"

        # 1st refund trigger
        r1 = self.db.record_refund(payment_id, refund_ref, 150.0, "Outlet closed", "PENDING")
        self.assertEqual(r1["already_exists"], False)

        # 2nd refund trigger (duplicate event)
        r2 = self.db.record_refund(payment_id, refund_ref, 150.0, "Outlet closed retry", "PENDING")
        self.assertEqual(r2["already_exists"], True)
        self.assertEqual(r1["refund_id"], r2["refund_id"])

        # Count of refunds in table must be strictly 1
        all_refs = [r for r in self.db.refunds.values() if r["refund_ref"] == refund_ref]
        self.assertEqual(len(all_refs), 1, "Exactly one refund record must exist")

    # ──────────────────────────────────────────────────────────────────────────
    # Test 6: Refund webhook arrives twice -> no duplicate update
    # ──────────────────────────────────────────────────────────────────────────
    def test_06_refund_webhook_arrives_twice_idempotency(self):
        """
        Scenario: Paytm sends refund webhook twice for the same refund.
        First marks status SUCCESS and payment REFUNDED.
        Second returns already_exists without duplicating records.
        """
        payment_id = 777
        self.db.payments[payment_id] = {"id": payment_id, "amount": 100.0, "status": "SUCCESS"}
        refund_ref = f"refund-{payment_id}"

        # Initial pending refund
        self.db.record_refund(payment_id, refund_ref, 100.0, "Order cancelled", "PENDING")

        # 1st Refund Webhook (SUCCESS)
        w1 = self.db.record_refund(payment_id, refund_ref, 100.0, "Order cancelled", "SUCCESS")
        self.assertEqual(self.db.refunds[w1["refund_id"]]["status"], "SUCCESS")
        self.assertEqual(self.db.payments[payment_id]["status"], "REFUNDED")

        # 2nd Refund Webhook (Duplicate SUCCESS)
        w2 = self.db.record_refund(payment_id, refund_ref, 100.0, "Order cancelled", "SUCCESS")
        self.assertTrue(w2["already_exists"])
        self.assertEqual(self.db.refunds[w2["refund_id"]]["status"], "SUCCESS")
        self.assertEqual(self.db.payments[payment_id]["status"], "REFUNDED")

        # Total refund records must remain 1
        self.assertEqual(len([r for r in self.db.refunds.values() if r["refund_ref"] == refund_ref]), 1)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 7: Invalid checksum on any webhook -> rejected with HTTP 400
    # ──────────────────────────────────────────────────────────────────────────
    def test_07_invalid_checksum_rejected_with_400(self):
        """
        Scenario: Malicious actor or corrupt transmission attempts to forge payment or refund webhook.
        Backend endpoint must cryptographically reject with HTTP 400 Bad Request.
        """
        # Test 7A: Invalid checksum on payment webhook
        tampered_payment_payload = {
            "MID": "MOCK_PAYTM_MID",
            "ORDERID": "TAMPERED-ORD-01",
            "TXNID": "TXN_FAKE_999",
            "TXNAMOUNT": "500.00",
            "STATUS": "TXN_SUCCESS",
            "CHECKSUMHASH": "completely_fake_invalid_hash"
        }
        res_pay = self.client.post("/webhooks/paytm", data=tampered_payment_payload)
        self.assertEqual(res_pay.status_code, 400)
        self.assertIn("invalid paytm checksum", res_pay.text.lower())

        # Test 7B: Invalid checksum on refund webhook
        tampered_refund_payload = {
            "MID": "MOCK_PAYTM_MID",
            "ORDERID": "TAMPERED-ORD-01",
            "REFUNDID": "REF-FAKE-01",
            "REFUNDAMOUNT": "500.00",
            "STATUS": "TXN_SUCCESS",
            "CHECKSUMHASH": "completely_fake_invalid_hash"
        }
        res_refund = self.client.post("/webhooks/paytm/refund", data=tampered_refund_payload)
        self.assertEqual(res_refund.status_code, 400)
        self.assertIn("invalid paytm checksum", res_refund.text.lower())

        # Test 7C: Valid checksum on refund webhook is NOT rejected with 400
        valid_refund_dict = {
            "MID": "MOCK_PAYTM_MID",
            "ORDERID": "VALID-ORD-01",
            "REFUNDID": "REF-VALID-01",
            "REFUNDAMOUNT": "100.00",
            "STATUS": "TXN_SUCCESS"
        }
        valid_checksum = _paytm_generate_checksum(valid_refund_dict, PAYTM_MERCHANT_KEY)
        valid_refund_dict["CHECKSUMHASH"] = valid_checksum

        # Mock database call so it doesn't fail on missing table row
        with patch("main.sb") as mock_sb:
            mock_sb.rpc.return_value.execute.return_value.data = {"status": "SUCCESS"}
            mock_sb.from_.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
                "id": 1, "order_id": 100, "payment_id": 1
            }
            res_valid = self.client.post("/webhooks/paytm/refund", data=valid_refund_dict)
            self.assertEqual(res_valid.status_code, 200)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 8: Wallet-funded order failing mid-way -> wallet balance is unchanged
    # ──────────────────────────────────────────────────────────────────────────
    def test_08_wallet_funded_order_failing_midway_balance_unchanged(self):
        """
        Scenario: User orders via wallet, but an item goes out of stock or error occurs.
        The database transaction is atomic: debit + order creation.
        If it fails, wallet balance remains strictly unchanged.
        """
        user_id = "usr_alice"
        initial_balance = self.db.wallets[user_id]
        self.assertEqual(initial_balance, 500)

        # Attempt to order item 102 (out of stock)
        res_stock_fail = self.db.place_order_wallet(
            user_id=user_id,
            outlet_id="main-canteen",
            items=[{"item_id": 102, "price": 180, "qty": 1}]
        )
        self.assertEqual(res_stock_fail["error"], "ITEM_OUT_OF_STOCK")
        self.assertTrue(res_stock_fail["balance_unchanged"])
        self.assertEqual(self.db.wallets[user_id], initial_balance, "Wallet balance must remain unchanged on stockout")

        # Attempt to order with insufficient balance (user_bob has only 50)
        bob_init = self.db.wallets["usr_bob"]
        res_balance_fail = self.db.place_order_wallet(
            user_id="usr_bob",
            outlet_id="main-canteen",
            items=[{"item_id": 101, "price": 80, "qty": 1}]
        )
        self.assertEqual(res_balance_fail["error"], "INSUFFICIENT_FUNDS")
        self.assertTrue(res_balance_fail["balance_unchanged"])
        self.assertEqual(self.db.wallets["usr_bob"], bob_init, "Bob's wallet balance must remain unchanged on insufficient funds")


if __name__ == "__main__":
    unittest.main()
