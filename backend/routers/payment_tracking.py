"""
V FOODS - Payment Help, Refund Tracking, Reconciliation & Role-Based Accounting Router
Modular router connecting:
- User payment & refund traceability
- Operational staff payment issues
- Shop admin outlet-level payment & refund accounting
- Super admin global reconciliation and audit visibility
"""

import os
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

logger = logging.getLogger("vfoods.payment_tracking")

sb = None

def init_payment_tracking_router(_sb, get_current_user, require_staff):
    global sb
    sb = _sb
    router = APIRouter(prefix="", tags=["payments_and_refunds"])

    # ──────────────────────────────────────────────────────────────────────────
    # 1. USER: Payment & Refund History + Active Issues
    # ──────────────────────────────────────────────────────────────────────────
    @router.get("/user/payments-refunds")
    async def get_user_payments_and_refunds(user=Depends(get_current_user)):
        """
        Returns the authenticated user's payment records, linked orders, and refund tracking details.
        Includes clear distinction between payment status, order status, and refund status.
        Never exposes sensitive keys, tokens, or credentials.
        """
        user_id = user["id"]
        try:
            # 1. Fetch payments for this user
            pay_res = sb.from_("payments").select(
                "id, user_id, order_id, amount, payment_purpose, payment_method, status, paytm_order_id, paytm_txn_id, failure_reason, paid_at, created_at"
            ).eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
            payments = pay_res.data or []

            order_ids = [p["order_id"] for p in payments if p.get("order_id")]
            orders_map = {}
            if order_ids:
                ord_res = sb.from_("orders").select(
                    "id, outlet_id, token, status, total, created_at, expires_at, cancel_reason"
                ).in_("id", order_ids).execute()
                for o in (ord_res.data or []):
                    orders_map[o["id"]] = o

            payment_ids = [p["id"] for p in payments]
            refunds_map = {}
            if payment_ids:
                ref_res = sb.from_("refunds").select(
                    "id, payment_id, order_id, refund_ref, refund_type, amount, status, failure_reason, created_at, completed_at"
                ).in_("payment_id", payment_ids).execute()
                for r in (ref_res.data or []):
                    refunds_map[r["payment_id"]] = r

            items = []
            for p in payments:
                ord_obj = orders_map.get(p.get("order_id"))
                ref_obj = refunds_map.get(p["id"])

                p_status = p.get("status") or "UNKNOWN"
                o_status = ord_obj.get("status") if ord_obj else ("NO_ORDER" if p.get("payment_purpose") == "WALLET_TOPUP" else "UNKNOWN")
                
                # Explicit refund states
                if ref_obj:
                    raw_r_status = (ref_obj.get("status") or "").upper()
                    if raw_r_status in ("SUCCESS", "COMPLETED"):
                        refund_status = "REFUND_SUCCESS"
                    elif raw_r_status in ("PENDING", "ACCEPTED"):
                        refund_status = "REFUND_INITIATED"
                    elif raw_r_status == "PROCESSING":
                        refund_status = "REFUND_PROCESSING"
                    elif raw_r_status in ("FAILED", "FAILURE"):
                        refund_status = "REFUND_FAILED"
                    else:
                        refund_status = "REFUND_UNKNOWN"
                else:
                    refund_status = "REFUND_NOT_REQUIRED" if p_status != "REFUNDED" else "REFUND_PENDING"

                # Next action & friendly guidance
                is_unresolved = False
                if p_status == "PENDING":
                    is_unresolved = True
                    next_action = "Payment pending at gateway. Tap Check Status to verify."
                elif p_status == "SUCCESS" and o_status in ("awaiting_payment", "cancelled") and refund_status != "REFUND_SUCCESS":
                    is_unresolved = True
                    next_action = "Payment debited but order could not be confirmed. 100% refund initiated to source account."
                elif refund_status == "REFUND_FAILED":
                    is_unresolved = True
                    next_action = "Refund issue detected. Tap Contact Outlet for direct assistance."
                elif refund_status == "REFUND_SUCCESS":
                    next_action = "Refund completed to original payment source."
                elif p_status == "SUCCESS" and o_status in ("placed", "confirmed", "preparing", "ready"):
                    tok_str = (ord_obj.get("token") or ord_obj.get("id")) if ord_obj else p.get("order_id")
                    next_action = f"Order #{tok_str} active in kitchen."
                elif p_status == "SUCCESS" and o_status == "collected":
                    next_action = "Order completed and collected."
                elif p_status == "FAILED":
                    next_action = "Payment failed. No amount debited."
                else:
                    next_action = "No action required."

                # Safe masked transaction reference (never expose private internal credentials)
                safe_txn_ref = None
                if p.get("paytm_txn_id"):
                    raw_txn = str(p["paytm_txn_id"])
                    safe_txn_ref = f"...{raw_txn[-8:]}" if len(raw_txn) > 8 else raw_txn

                items.append({
                    "payment_id": p["id"],
                    "order_id": p.get("order_id"),
                    "order_date": p.get("created_at"),
                    "amount": float(p.get("amount") or 0),
                    "payment_method": p.get("payment_method") or "UPI_APP",
                    "payment_status": p_status,
                    "order_status": o_status,
                    "token": ord_obj.get("token") if ord_obj else None,
                    "refund_status": refund_status,
                    "refund_amount": float(ref_obj.get("amount") or 0) if ref_obj else 0.0,
                    "refund_ref": ref_obj.get("refund_ref") if ref_obj else None,
                    "paytm_txn_ref": safe_txn_ref,
                    "failure_reason": p.get("failure_reason") or (ref_obj.get("failure_reason") if ref_obj else None),
                    "last_status_update": ((ref_obj.get("completed_at") or ref_obj.get("created_at")) if ref_obj else (p.get("paid_at") or p.get("created_at"))),
                    "is_unresolved": is_unresolved,
                    "next_action": next_action
                })

            return {
                "user_id": user_id,
                "total_records": len(items),
                "unresolved_count": sum(1 for i in items if i["is_unresolved"]),
                "payments": items
            }
        except Exception as e:
            logger.error(f"Error fetching user payments & refunds: {e}")
            return {"user_id": user_id, "total_records": 0, "unresolved_count": 0, "payments": []}

    # ──────────────────────────────────────────────────────────────────────────
    # 2. SHOP STAFF: Operational Payment Issues for Permitted Outlet
    # ──────────────────────────────────────────────────────────────────────────
    @router.get("/staff/payment-issues")
    async def get_staff_payment_issues(user=Depends(require_staff)):
        """
        Operational payment issues view for shop staff.
        Restricted to permitted outlet.
        Staff sees only what is necessary to resolve customer orders:
        - Order ID, token, time, customer identifier, amount, payment status, order status, refund status, issue reason, required action.
        Staff cannot see secrets, checksums, or other outlets' data.
        """
        outlet_id = user.get("outlet_id")
        if not outlet_id:
            raise HTTPException(400, "User is not assigned to an outlet")

        try:
            # Fetch orders with issues in the last 24 hours
            ords_res = sb.from_("orders").select(
                "id, user_id, outlet_id, token, status, total, payment_method, created_at, cancel_reason"
            ).eq("outlet_id", outlet_id).order("created_at", desc=True).limit(50).execute()
            orders = ords_res.data or []

            order_ids = [o["id"] for o in orders]
            payments_map = {}
            if order_ids:
                pay_res = sb.from_("payments").select(
                    "id, order_id, amount, status, failure_reason, paytm_txn_id, created_at"
                ).in_("order_id", order_ids).execute()
                for p in (pay_res.data or []):
                    payments_map[p["order_id"]] = p

            refunds_map = {}
            payment_ids = [p["id"] for p in payments_map.values()]
            if payment_ids:
                ref_res = sb.from_("refunds").select(
                    "id, payment_id, refund_ref, amount, status, failure_reason"
                ).in_("payment_id", payment_ids).execute()
                for r in (ref_res.data or []):
                    refunds_map[r["payment_id"]] = r

            issues = []
            for o in orders:
                p = payments_map.get(o["id"])
                p_status = p.get("status") if p else "NO_PAYMENT"
                ref = refunds_map.get(p["id"]) if p else None

                # Discrepancy detection:
                # 1. Order awaiting_payment older than 2 minutes
                # 2. Payment SUCCESS but Order cancelled/awaiting_payment
                # 3. Refund PENDING or FAILED
                has_issue = False
                reason = ""
                action = ""

                created_dt = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00")) if o.get("created_at") else datetime.now(timezone.utc)
                age_minutes = (datetime.now(timezone.utc) - created_dt).total_seconds() / 60.0

                if p_status == "SUCCESS" and o["status"] in ("awaiting_payment", "cancelled"):
                    has_issue = True
                    reason = "Payment received at gateway, but order not confirmed"
                    action = "Verify at counter or confirm refund"
                elif p_status == "PENDING" and age_minutes > 3:
                    has_issue = True
                    reason = "Payment pending > 3 minutes"
                    action = "Tap Check Status or re-order"
                elif ref and ref.get("status") in ("PENDING", "FAILED"):
                    has_issue = True
                    reason = f"Refund {ref.get('status')}"
                    action = "Monitor refund completion"

                if has_issue:
                    safe_txn_id = None
                    if p and p.get("paytm_txn_id"):
                        raw = str(p["paytm_txn_id"])
                        safe_txn_id = f"...{raw[-6:]}" if len(raw) > 6 else raw

                    issues.append({
                        "order_id": o["id"],
                        "token": o.get("token") or f"ORD-{o['id']}",
                        "created_at": o["created_at"],
                        "user_display": f"User #{str(o.get('user_id') or 'Anon')[:6]}",
                        "order_amount": float(o.get("total") or 0),
                        "total_amount": float(o.get("total") or 0),
                        "payment_status": p_status,
                        "order_status": o["status"],
                        "refund_status": ref.get("status") if ref else "REFUND_NOT_REQUIRED",
                        "refund_ref": ref.get("refund_ref") if ref else None,
                        "paytm_ref": safe_txn_id,
                        "paytm_txn_ref": safe_txn_id,
                        "reason": reason,
                        "issue_reason": reason,
                        "required_action": action
                    })

            return {
                "outlet_id": outlet_id,
                "total_issues": len(issues),
                "issues_count": len(issues),
                "issues": issues
            }
        except Exception as e:
            logger.error(f"Error fetching staff payment issues: {e}")
            return {"outlet_id": outlet_id, "total_issues": 0, "issues": []}

    # ──────────────────────────────────────────────────────────────────────────
    # 3. SHOP ADMIN: Outlet-Level Payments & Reconciliation
    # ──────────────────────────────────────────────────────────────────────────
    @router.get("/shop/payments-reconciliation")
    async def get_shop_payments_reconciliation(
        outlet_id: Optional[str] = None,
        payment_status: Optional[str] = None,
        refund_status: Optional[str] = None,
        order_id: Optional[int] = None,
        user=Depends(get_current_user)
    ):
        """
        Detailed outlet payment and refund view for Shop Admin.
        Permitted outlet only.
        Returns payment ledger, refund tracking, and daily accounting totals.
        """
        role = user.get("role")
        user_outlet = user.get("outlet_id")

        target_outlet = outlet_id or user_outlet
        if role not in ("super_admin", "admin"):
            if not target_outlet or target_outlet != user_outlet:
                raise HTTPException(403, "Access restricted to permitted outlet")

        try:
            # Query orders for target outlet
            query = sb.from_("orders").select(
                "id, user_id, outlet_id, token, status, total, payment_method, created_at"
            ).eq("outlet_id", target_outlet).order("created_at", desc=True).limit(100)
            
            if order_id:
                query = query.eq("id", order_id)
            
            orders = query.execute().data or []
            order_ids = [o["id"] for o in orders]

            payments_map = {}
            if order_ids:
                p_query = sb.from_("payments").select(
                    "id, order_id, amount, status, payment_method, paytm_order_id, paytm_txn_id, paid_at, created_at, failure_reason"
                ).in_("order_id", order_ids)
                if payment_status:
                    p_query = p_query.eq("status", payment_status)
                pay_res = p_query.execute().data or []
                for p in pay_res:
                    payments_map[p["order_id"]] = p

            refunds_map = {}
            payment_ids = [p["id"] for p in payments_map.values()]
            if payment_ids:
                r_query = sb.from_("refunds").select(
                    "id, payment_id, refund_ref, amount, status, failure_reason, created_at, completed_at"
                ).in_("payment_id", payment_ids)
                if refund_status:
                    r_query = r_query.eq("status", refund_status)
                ref_res = r_query.execute().data or []
                for r in ref_res:
                    refunds_map[r["payment_id"]] = r

            records = []
            total_payments_amt = 0.0
            total_refunds_amt = 0.0
            pending_count = 0

            for o in orders:
                p = payments_map.get(o["id"])
                if not p and payment_status:
                    continue
                ref = refunds_map.get(p["id"]) if p else None
                if not ref and refund_status:
                    continue

                amt = float(p.get("amount") or o.get("total") or 0)
                if p and p.get("status") == "SUCCESS":
                    total_payments_amt += amt
                elif p and p.get("status") == "PENDING":
                    pending_count += 1

                ref_amt = float(ref.get("amount") or 0) if ref else 0.0
                if ref and ref.get("status") == "SUCCESS":
                    total_refunds_amt += ref_amt

                records.append({
                    "order_id": o["id"],
                    "token": o.get("token"),
                    "created_at": o["created_at"],
                    "order_total": float(o.get("total") or 0),
                    "order_status": o["status"],
                    "payment_id": p["id"] if p else None,
                    "payment_status": p.get("status") if p else "NO_PAYMENT",
                    "payment_method": p.get("payment_method") or o.get("payment_method"),
                    "paytm_txn_id": p.get("paytm_txn_id") if p else None,
                    "refund_id": ref.get("id") if ref else None,
                    "refund_ref": ref.get("refund_ref") if ref else None,
                    "refund_status": ref.get("status") if ref else "REFUND_NOT_REQUIRED",
                    "refund_amount": ref_amt
                })

            summary_dict = {
                "total_orders": len(records),
                "total_revenue": round(total_payments_amt, 2),
                "total_payment_revenue": round(total_payments_amt, 2),
                "total_online_volume": round(total_payments_amt, 2),
                "total_refunded": round(total_refunds_amt, 2),
                "net_revenue": round(total_payments_amt - total_refunds_amt, 2),
                "successful_payments_count": len([r for r in records if r.get("payment_status") == "SUCCESS"]),
                "refunded_count": len([r for r in records if r.get("refund_id") or (r.get("refund_status") not in (None, "REFUND_NOT_REQUIRED", "NONE"))]),
                "pending_payments": pending_count
            }

            return {
                "outlet_id": target_outlet,
                "summary": summary_dict,
                "accounting_summary": summary_dict,
                "records": records
            }
        except Exception as e:
            logger.error(f"Error fetching shop payments reconciliation: {e}")
            return {"outlet_id": target_outlet, "summary": {}, "records": []}

    # ──────────────────────────────────────────────────────────────────────────
    # 4. SUPER ADMIN: Global Payments, Reconciliation & Audit Overview
    # ──────────────────────────────────────────────────────────────────────────
    @router.get("/admin/payments/overview")
    async def get_super_admin_payments_overview(user=Depends(get_current_user)):
        """
        Global platform payments overview for Super Admin.
        Includes all payments, refunds, webhook audits, and reconciliation records.
        """
        role = user.get("role")
        if role not in ("super_admin", "admin"):
            raise HTTPException(403, "Access restricted to Super Admin")

        try:
            # 1. Metrics from payments table
            pays_res = sb.from_("payments").select("id, amount, status, created_at").execute().data or []
            total_pays = len(pays_res)
            success_pays = sum(1 for p in pays_res if p.get("status") == "SUCCESS")
            pending_pays = sum(1 for p in pays_res if p.get("status") == "PENDING")
            failed_pays = sum(1 for p in pays_res if p.get("status") == "FAILED")
            total_pay_vol = sum(float(p.get("amount") or 0) for p in pays_res if p.get("status") == "SUCCESS")

            # 2. Metrics from refunds table
            refs_res = sb.from_("refunds").select("id, amount, status, created_at").execute().data or []
            total_refs = len(refs_res)
            success_refs = sum(1 for r in refs_res if r.get("status") in ("SUCCESS", "COMPLETED"))
            pending_refs = sum(1 for r in refs_res if r.get("status") in ("PENDING", "ACCEPTED", "PROCESSING"))
            failed_refs = sum(1 for r in refs_res if r.get("status") in ("FAILED", "FAILURE"))
            total_ref_vol = sum(float(r.get("amount") or 0) for r in refs_res if r.get("status") in ("SUCCESS", "COMPLETED"))

            # 3. Webhook events (if table exists)
            webhook_events = []
            try:
                wh_res = sb.from_("webhook_events").select(
                    "id, event_type, gateway, gateway_order_id, gateway_txn_id, signature_valid, processed_status, created_at"
                ).order("created_at", desc=True).limit(20).execute()
                webhook_events = wh_res.data or []
            except Exception as e:
                logger.debug(f"webhook_events table query skipped: {e}")

            # 4. Reconciliation records (if table exists)
            reconcile_records = []
            try:
                rec_res = sb.from_("reconciliation_records").select(
                    "id, order_id, payment_id, reconciliation_type, local_status, gateway_status, discrepancy_detected, action_taken, reconciled_by, created_at"
                ).order("created_at", desc=True).limit(20).execute()
                reconcile_records = rec_res.data or []
            except Exception as e:
                logger.debug(f"reconciliation_records table query skipped: {e}")

            return {
                "metrics": {
                    "total_payments_count": total_pays,
                    "successful_payments_count": success_pays,
                    "pending_payments_count": pending_pays,
                    "failed_payments_count": failed_pays,
                    "total_collected_inr": round(total_pay_vol, 2),
                    "total_refunds_count": total_refs,
                    "successful_refunds_count": success_refs,
                    "pending_refunds_count": pending_refs,
                    "failed_refunds_count": failed_refs,
                    "total_refunded_inr": round(total_ref_vol, 2),
                    "net_settled_inr": round(total_pay_vol - total_ref_vol, 2)
                },
                "recent_webhook_events": webhook_events,
                "recent_reconciliations": reconcile_records
            }
        except Exception as e:
            logger.error(f"Error fetching super admin payments overview: {e}")
            raise HTTPException(500, f"Failed to compute payments overview: {e}")

    return router
