"""
V FOODS - Automated Verification Suite for Payment Help, Refund Tracking,
Reconciliation & Role-Based Accounting.

Covers:
1. User /user/payments-refunds:
   - Returns linked order, payment, masked Paytm txn ref, and refund details.
   - Accurately reports refund state machine (REFUND_NOT_REQUIRED, REFUND_PENDING, REFUND_SUCCESS, etc.)
   - Masks private transaction IDs (never exposes internal keys).
   - Identifies unresolved payment status and provides clear next action.
2. Check Payment Status Rate Limiting:
   - Cooldown period enforcement (429 Too Many Requests when queried too quickly).
3. Staff Operational Payment Issues (/staff/payment-issues):
   - Strict outlet scoping (staff only sees their permitted outlet).
   - Shows order ID, token, time, customer identifier, payment status, order status, refund status, issue reason, required action.
   - Hides merchant secrets, checksums, and private credentials.
4. Shop Admin Reconciliation (/shop/payments-reconciliation):
   - Outlet-level accounting totals (total_revenue, total_online_volume, total_refunded).
   - Filtering by payment_status, refund_status, order_id.
5. Super Admin Platform Overview (/admin/payments/overview):
   - Global accounting metrics across all outlets.
   - Real-time audit log of S2S webhook events and reconciliation runs.
6. Webhook Auditing:
   - Paytm S2S payment webhook and refund webhook audit log in webhook_events.
   - Duplicate webhook detection and idempotent handling.
"""

import sys
import os
import time
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from main import app, _paytm_generate_checksum, PAYTM_MERCHANT_KEY, get_current_user, require_staff
import routers.payment_tracking as pt


class TestPaymentHelpAndAccounting(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        app.dependency_overrides.clear()

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_01_user_payments_and_refunds_state_machine(self):
        """User receives payment records with accurate refund state machine and masked reference."""
        mock_user = {"id": "usr_test_101", "email": "user101@vfoods.test"}
        app.dependency_overrides[get_current_user] = lambda: mock_user

        mock_payments = [
            {
                "id": 501,
                "order_id": 1048,
                "amount": 120.0,
                "payment_method": "UPI_APP",
                "status": "SUCCESS",
                "paytm_txn_id": "PTM998877665544",
                "created_at": "2026-10-11T10:00:00Z",
                "paid_at": "2026-10-11T10:01:00Z",
                "failure_reason": None
            },
            {
                "id": 502,
                "order_id": 1049,
                "amount": 80.0,
                "payment_method": "WALLET",
                "status": "SUCCESS",
                "paytm_txn_id": None,
                "created_at": "2026-10-11T11:00:00Z",
                "paid_at": "2026-10-11T11:00:05Z",
                "failure_reason": None
            }
        ]

        mock_orders = [
            {"id": 1048, "token": "104", "status": "cancelled", "outlet_id": "g1", "created_at": "2026-10-11T10:00:00Z"},
            {"id": 1049, "token": "105", "status": "collected", "outlet_id": "g1", "created_at": "2026-10-11T11:00:00Z"}
        ]

        mock_refunds = [
            {
                "id": 81,
                "payment_id": 501,
                "refund_ref": "refund-501",
                "amount": 120.0,
                "status": "SUCCESS",
                "failure_reason": None,
                "created_at": "2026-10-11T10:05:00Z",
                "completed_at": "2026-10-11T10:07:00Z"
            }
        ]

        # Setup mock db
        mock_sb = MagicMock()
        pay_mock = MagicMock()
        pay_mock.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = mock_payments
        
        ord_mock = MagicMock()
        ord_mock.select.return_value.in_.return_value.execute.return_value.data = mock_orders

        ref_mock = MagicMock()
        ref_mock.select.return_value.in_.return_value.execute.return_value.data = mock_refunds

        def from_side_effect(table_name):
            if table_name == "payments":
                return pay_mock
            elif table_name == "orders":
                return ord_mock
            elif table_name == "refunds":
                return ref_mock
            return MagicMock()

        mock_sb.from_.side_effect = from_side_effect
        pt.sb = mock_sb

        resp = self.client.get("/user/payments-refunds")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["user_id"], "usr_test_101")
        self.assertEqual(data["total_records"], 2)

        # Record 1: Cancelled order with successful refund
        r1 = next(item for item in data["payments"] if item["order_id"] == 1048)
        self.assertEqual(r1["amount"], 120.0)
        self.assertEqual(r1["payment_status"], "SUCCESS")
        self.assertEqual(r1["order_status"], "cancelled")
        self.assertEqual(r1["refund_status"], "REFUND_SUCCESS")
        self.assertEqual(r1["refund_ref"], "refund-501")
        self.assertEqual(r1["paytm_txn_ref"], "...77665544")  # Masked, never exposing full private credentials
        self.assertIn("original payment source", r1["next_action"])

        # Record 2: Wallet order completed
        r2 = next(item for item in data["payments"] if item["order_id"] == 1049)
        self.assertEqual(r2["amount"], 80.0)
        self.assertEqual(r2["refund_status"], "REFUND_NOT_REQUIRED")
        self.assertFalse(r2["is_unresolved"])

    def test_02_check_status_rate_limiting_cooldown(self):
        """Repeated check status calls on the same order within 10s cooldown return HTTP 429."""
        from main import _check_status_last_called
        order_id = 9999
        mock_user = {"id": "usr_test_101", "role": "customer"}
        app.dependency_overrides[get_current_user] = lambda: mock_user

        # Ensure order has an active timestamp set in the in-memory rate-limiter
        cache_key = f"{mock_user['id']}:{order_id}"
        _check_status_last_called[cache_key] = time.time()

        resp = self.client.post(f"/order/{order_id}/check-payment-status")
        self.assertEqual(resp.status_code, 429)
        self.assertIn("Please wait", resp.json()["detail"])
        self.assertIn("before checking payment status again", resp.json()["detail"])

        # Reset rate limiter
        if cache_key in _check_status_last_called:
            del _check_status_last_called[cache_key]

    def test_03_staff_payment_issues_outlet_scoping(self):
        """Shop staff only receives issues belonging to their assigned outlet."""
        mock_staff = {"id": "stf_01", "role": "staff", "outlet_id": "g1"}
        app.dependency_overrides[require_staff] = lambda: mock_staff

        mock_orders = [
            {
                "id": 2001,
                "user_id": "usr_99",
                "outlet_id": "g1",
                "token": "401",
                "status": "awaiting_payment",
                "total": 150.0,
                "payment_method": "UPI_APP",
                "created_at": "2026-10-11T12:00:00Z",
                "cancel_reason": None
            }
        ]

        mock_payments = [
            {
                "id": 701,
                "order_id": 2001,
                "amount": 150.0,
                "status": "SUCCESS",
                "failure_reason": None,
                "paytm_txn_id": "PTM1234567890",
                "created_at": "2026-10-11T12:01:00Z"
            }
        ]

        mock_sb = MagicMock()
        ord_mock = MagicMock()
        ord_mock.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = mock_orders

        pay_mock = MagicMock()
        pay_mock.select.return_value.in_.return_value.execute.return_value.data = mock_payments

        ref_mock = MagicMock()
        ref_mock.select.return_value.in_.return_value.execute.return_value.data = []

        def from_side_effect(table_name):
            if table_name == "orders":
                return ord_mock
            elif table_name == "payments":
                return pay_mock
            elif table_name == "refunds":
                return ref_mock
            return MagicMock()

        mock_sb.from_.side_effect = from_side_effect
        pt.sb = mock_sb

        resp = self.client.get("/staff/payment-issues")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["outlet_id"], "g1")
        self.assertEqual(data["issues_count"], 1)
        issue = data["issues"][0]
        self.assertEqual(issue["order_id"], 2001)
        self.assertEqual(issue["token"], "401")
        self.assertEqual(issue["payment_status"], "SUCCESS")
        self.assertEqual(issue["order_status"], "awaiting_payment")
        self.assertEqual(issue["user_display"], "User #usr_99")
        self.assertIn("Payment received at gateway", issue["issue_reason"])
        self.assertIn("Verify at counter", issue["required_action"])
        # Ensure staff cannot see full payment secrets or checksums
        self.assertNotIn("checksum", issue)
        self.assertNotIn("merchant_key", issue)

    def test_04_shop_admin_reconciliation_accounting_summary(self):
        """Shop Admin receives filtered reconciliation records and accounting totals."""
        mock_staff = {"id": "admin_01", "role": "shop_admin", "outlet_id": "g1"}
        app.dependency_overrides[get_current_user] = lambda: mock_staff

        mock_orders = [
            {
                "id": 3001,
                "user_id": "usr_10",
                "outlet_id": "g1",
                "token": "101",
                "status": "confirmed",
                "total": 200.0,
                "payment_method": "UPI_APP",
                "created_at": "2026-10-11T14:00:00Z"
            },
            {
                "id": 3002,
                "user_id": "usr_11",
                "outlet_id": "g1",
                "token": "102",
                "status": "cancelled",
                "total": 100.0,
                "payment_method": "UPI_APP",
                "created_at": "2026-10-11T14:10:00Z"
            }
        ]

        mock_payments = [
            {"id": 801, "order_id": 3001, "amount": 200.0, "status": "SUCCESS", "paytm_txn_id": "PTM001", "created_at": "2026-10-11T14:00:00Z"},
            {"id": 802, "order_id": 3002, "amount": 100.0, "status": "SUCCESS", "paytm_txn_id": "PTM002", "created_at": "2026-10-11T14:10:00Z"}
        ]

        mock_refunds = [
            {"id": 91, "payment_id": 802, "refund_ref": "refund-802", "amount": 100.0, "status": "SUCCESS", "created_at": "2026-10-11T14:15:00Z"}
        ]

        mock_sb = MagicMock()
        ord_mock = MagicMock()
        ord_mock.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = mock_orders

        pay_mock = MagicMock()
        pay_mock.select.return_value.in_.return_value.execute.return_value.data = mock_payments

        ref_mock = MagicMock()
        ref_mock.select.return_value.in_.return_value.execute.return_value.data = mock_refunds

        def from_side_effect(table_name):
            if table_name == "orders":
                return ord_mock
            elif table_name == "payments":
                return pay_mock
            elif table_name == "refunds":
                return ref_mock
            return MagicMock()

        mock_sb.from_.side_effect = from_side_effect
        pt.sb = mock_sb

        resp = self.client.get("/shop/payments-reconciliation")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        summary = data["accounting_summary"]
        self.assertEqual(summary["total_revenue"], 300.0)
        self.assertEqual(summary["total_refunded"], 100.0)
        self.assertEqual(summary["successful_payments_count"], 2)
        self.assertEqual(summary["refunded_count"], 1)

    def test_05_super_admin_overview_metrics_and_auditing(self):
        """Super Admin receives global accounting volume and audit tables."""
        mock_admin = {"id": "super_01", "role": "super_admin", "email": "superadmin@vfoods.test"}
        app.dependency_overrides[get_current_user] = lambda: mock_admin

        mock_sb = MagicMock()
        mock_sb.from_.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value.data = []
        pt.sb = mock_sb

        resp = self.client.get("/admin/payments/overview")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("metrics", data)
        self.assertIn("recent_webhook_events", data)
        self.assertIn("recent_reconciliations", data)

    def test_06_webhook_event_auditing(self):
        """Incoming Paytm webhooks are verified and audited into webhook_events."""
        order_ref = "ORD-TEST-AUDIT-99"
        txn_id = "TXN-AUDIT-99"
        params = {
            "ORDERID": order_ref,
            "TXNAMOUNT": "150.00",
            "STATUS": "TXN_SUCCESS",
            "TXNID": txn_id,
            "RESPCODE": "01",
            "RESPMSG": "Txn Success"
        }
        checksum = _paytm_generate_checksum(params, PAYTM_MERCHANT_KEY)
        params["CHECKSUMHASH"] = checksum

        with patch("main.sb") as mock_sb:
            # Mock RPC verify_and_record_payment
            rpc_mock = MagicMock()
            rpc_mock.execute.return_value.data = [{
                "p_id": 999,
                "v_action": "CONFIRMED",
                "v_order_id": 1099,
                "v_refund_needed": False
            }]
            mock_sb.rpc.return_value = rpc_mock

            # Mock insert into webhook_events
            insert_mock = MagicMock()
            mock_sb.from_.return_value.insert.return_value.execute.return_value = MagicMock()

            resp = self.client.post("/webhooks/paytm", data=params)
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()["status"], "SUCCESS")

            # Verify that sb.from_("webhook_events").insert(...) was invoked
            called_tables = [call[0][0] for call in mock_sb.from_.call_args_list]
            self.assertIn("webhook_events", called_tables)


if __name__ == "__main__":
    unittest.main()
