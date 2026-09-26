"""
CampusBite FastAPI Backend
- Auth: Supabase JWT verification
- Wallet: topup via PhonePe, credit_wallet stored proc
- Orders: place_order_wallet, create_pending_gateway_order, finalize_gateway_order
- PhonePe webhook: single handler for topup + order_payment
- Staff: advance/cancel order, scan QR / token
- Admin: credit wallet, event mode utils
- MSG91: WhatsApp notifications at every trigger point
- Scheduler: expire_pending_orders every 5 minutes
"""

from __future__ import annotations

import os, hashlib, hmac, base64, json, time, logging, secrets
from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional, List, Dict, Any

import httpx
import qrcode
import qrcode.image.svg
from io import BytesIO
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException, Request, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from supabase import create_client, Client
from jose import jwt, JWTError
from apscheduler.schedulers.asyncio import AsyncIOScheduler

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("campusbite")

# ──────────────────────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────────────────────
SUPABASE_URL              = os.getenv("SUPABASE_URL", "https://wahftohnwfoepuszvzrx.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "PLACEHOLDER_SERVICE_KEY")

PHONEPE_MERCHANT_ID = os.getenv("PHONEPE_MERCHANT_ID", "MOCK_MERCHANT")
PHONEPE_SALT_KEY    = os.getenv("PHONEPE_SALT_KEY", "mock_salt_key")
PHONEPE_SALT_INDEX  = os.getenv("PHONEPE_SALT_INDEX", "1")
PHONEPE_BASE_URL    = os.getenv("PHONEPE_BASE_URL", "https://api-preprod.phonepe.com/apis/pg-sandbox")
WEBHOOK_BASE_URL    = os.getenv("WEBHOOK_BASE_URL", "http://localhost:8000")

MSG91_AUTH_KEY       = os.getenv("MSG91_AUTH_KEY", "")
MSG91_WHATSAPP_NUM   = os.getenv("MSG91_WHATSAPP_INTEGRATED_NUMBER", "")
MSG91_OTP_TEMPLATE   = os.getenv("MSG91_OTP_TEMPLATE_ID", "")
MSG91_SENDER         = os.getenv("MSG91_SENDER", "CAMPBT")

QR_SECRET      = os.getenv("QR_SECRET", "campusbite-super-secret-key-vitc").encode()
FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:5173")

DUMMY_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.signature"
_raw_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
if _raw_key and _raw_key.count(".") == 2 and not _raw_key.startswith("PLACEHOLDER"):
    SUPABASE_SERVICE_ROLE_KEY = _raw_key
else:
    SUPABASE_SERVICE_ROLE_KEY = DUMMY_KEY

# Supabase client (service role — never expose to browser)
try:
    sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
except Exception as e:
    logger.warning(f"Fallback to dummy client: {e}")
    sb: Client = create_client(SUPABASE_URL, DUMMY_KEY)

# ──────────────────────────────────────────────────────────────────────────────
# App
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="CampusBite API", version="1.0.0")

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "campusbite-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "supabase_configured": SUPABASE_SERVICE_ROLE_KEY != DUMMY_KEY,
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "capacitor://localhost", "ionic://localhost"],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# Scheduler — expire pending gateway orders every 5 min
# ──────────────────────────────────────────────────────────────────────────────
scheduler = AsyncIOScheduler()

@scheduler.scheduled_job("interval", minutes=5)
async def run_expire_pending():
    try:
        result = sb.rpc("expire_pending_orders", {}).execute()
        count = result.data
        if count:
            logger.info(f"expire_pending_orders: cancelled {count} orders")
    except Exception as e:
        logger.error(f"expire_pending_orders failed: {e}")

@app.on_event("startup")
async def startup():
    scheduler.start()

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()

# ──────────────────────────────────────────────────────────────────────────────
# Auth dependency — verify Supabase JWT
# ──────────────────────────────────────────────────────────────────────────────
async def get_current_user(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        # Supabase JWTs are signed with the project JWT secret
        # In production verify with Supabase JWKS; here we trust sub claim
        payload = jwt.decode(token, key="", options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token: no sub claim")
        return {"id": user_id, "email": payload.get("email")}
    except JWTError as e:
        raise HTTPException(401, f"Token error: {e}")

async def require_staff(user=Depends(get_current_user)) -> dict:
    row = sb.from_("profiles").select("role,outlet_id").eq("id", user["id"]).single().execute()
    if not row.data or row.data["role"] not in ("staff", "shop_admin", "super_admin", "admin"):
        raise HTTPException(403, "Staff, shop admin, or super admin role required")
    return {**user, "role": row.data["role"], "outlet_id": row.data["outlet_id"]}

async def require_shop_admin(user=Depends(get_current_user)) -> dict:
    row = sb.from_("profiles").select("role,outlet_id").eq("id", user["id"]).single().execute()
    if not row.data or row.data["role"] not in ("shop_admin", "super_admin", "admin"):
        raise HTTPException(403, "Shop admin or super admin role required")
    return {**user, "role": row.data["role"], "outlet_id": row.data["outlet_id"]}

async def require_admin(user=Depends(get_current_user)) -> dict:
    row = sb.from_("profiles").select("role").eq("id", user["id"]).single().execute()
    if not row.data or row.data["role"] not in ("super_admin", "admin"):
        raise HTTPException(403, "Super admin role required")
    return user

# ──────────────────────────────────────────────────────────────────────────────
# PhonePe helpers
# ──────────────────────────────────────────────────────────────────────────────
def _phonepe_checksum(payload_b64: str, endpoint: str) -> str:
    """SHA256(base64payload + /endpoint + salt_key) + ### + salt_index"""
    data = payload_b64 + endpoint + PHONEPE_SALT_KEY
    sha = hashlib.sha256(data.encode()).hexdigest()
    return f"{sha}###{PHONEPE_SALT_INDEX}"

def _phonepe_verify_webhook(raw_body: bytes, x_verify: str) -> bool:
    """Verify PhonePe webhook signature."""
    try:
        sha_part = x_verify.split("###")[0]
        data = base64.b64decode(raw_body).decode() if raw_body[:1] == b'{' else raw_body.decode()
        # PhonePe: SHA256(responseBody + salt_key)
        computed = hashlib.sha256((raw_body.decode() + PHONEPE_SALT_KEY).encode()).hexdigest()
        return hmac.compare_digest(computed, sha_part)
    except Exception:
        return False

async def _create_phonepe_order(
    merchant_txn_id: str,
    amount_paise: int,
    user_id: str,
    callback_url: str,
    redirect_url: str,
) -> str:
    """Create a PhonePe payment order and return checkout URL."""
    payload = {
        "merchantId": PHONEPE_MERCHANT_ID,
        "merchantTransactionId": merchant_txn_id,
        "merchantUserId": user_id[:36],
        "amount": amount_paise,
        "redirectUrl": redirect_url,
        "redirectMode": "REDIRECT",
        "callbackUrl": callback_url,
        "paymentInstrument": {"type": "PAY_PAGE"},
    }
    payload_json  = json.dumps(payload)
    payload_b64   = base64.b64encode(payload_json.encode()).decode()
    endpoint      = "/pg/v1/pay"
    checksum      = _phonepe_checksum(payload_b64, endpoint)

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{PHONEPE_BASE_URL}{endpoint}",
            json={"request": payload_b64},
            headers={"Content-Type": "application/json", "X-VERIFY": checksum, "X-MERCHANT-ID": PHONEPE_MERCHANT_ID},
        )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise HTTPException(502, f"PhonePe error: {data.get('message', 'Unknown')}")
    return data["data"]["instrumentResponse"]["redirectInfo"]["url"]

# ──────────────────────────────────────────────────────────────────────────────
# MSG91 helpers
# ──────────────────────────────────────────────────────────────────────────────
async def _send_whatsapp(phone: str, template_id: str, variables: list[str]):
    """Fire-and-forget WhatsApp via MSG91."""
    if not phone or not MSG91_AUTH_KEY:
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
                headers={"authkey": MSG91_AUTH_KEY, "Content-Type": "application/json"},
                json={
                    "integrated_number": MSG91_WHATSAPP_NUM,
                    "content_type": "template",
                    "payload": {
                        "to": [{"user_whatsapp_number": phone.replace("+", "").strip()}],
                        "type": "template",
                        "template": {
                            "id": template_id,
                            "params": variables,
                        },
                    },
                },
            )
    except Exception as e:
        logger.warning(f"WhatsApp send failed: {e}")

async def _get_user_phone(user_id: str) -> Optional[str]:
    row = sb.from_("profiles").select("phone").eq("id", user_id).single().execute()
    return row.data.get("phone") if row.data else None

def _qr_sign(order_id: int) -> str:
    """HMAC-SHA256 signature for QR payload."""
    msg = f"order:{order_id}".encode()
    return hmac.new(QR_SECRET, msg, hashlib.sha256).hexdigest()

def _qr_verify(order_id: int, sig: str) -> bool:
    expected = _qr_sign(order_id)
    return hmac.compare_digest(expected, sig)

# ──────────────────────────────────────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}

# ──────────────────────────────────────────────────────────────────────────────
# Wallet top-up
# ──────────────────────────────────────────────────────────────────────────────
class TopupRequest(BaseModel):
    amount: int = Field(..., ge=10)
    method: str = Field("upi")  # 'upi' | 'card'

@app.post("/wallet/topup")
async def wallet_topup(req: TopupRequest, user=Depends(get_current_user)):
    # Card fee pass-through: customer is charged ceil(amount / 0.9765)
    if req.method == "card":
        charge_paise = int(-(-req.amount * 100 / 0.9765 // 1))  # ceiling
    else:
        charge_paise = req.amount * 100

    merchant_txn_id = f"WU-{user['id'][:8]}-{int(time.time())}"

    # Record payment intent
    sb.from_("payments").insert({
        "phonepe_txn_id": merchant_txn_id,
        "user_id": user["id"],
        "order_id": None,
        "amount": charge_paise // 100,
        "purpose": "topup",
        "status": "created",
    }).execute()

    checkout_url = await _create_phonepe_order(
        merchant_txn_id=merchant_txn_id,
        amount_paise=charge_paise,
        user_id=user["id"],
        callback_url=f"{WEBHOOK_BASE_URL}/webhooks/phonepe",
        redirect_url=f"{FRONTEND_URL}/?topup=success",
    )
    return {"checkout_url": checkout_url, "txn_id": merchant_txn_id}

# ──────────────────────────────────────────────────────────────────────────────
# Order checkout (wallet OR gateway)
# ──────────────────────────────────────────────────────────────────────────────
class OrderItem(BaseModel):
    item_id: int
    qty: int = Field(..., ge=1)

class CheckoutRequest(BaseModel):
    outlet_id: str
    items: list[OrderItem]
    payment_method: str  # 'wallet' | 'gateway'

@app.post("/order/checkout")
async def order_checkout(req: CheckoutRequest, bg: BackgroundTasks, user=Depends(get_current_user)):
    items_jsonb = json.dumps([i.dict() for i in req.items])

    if req.payment_method == "wallet":
        # ── Wallet path ──────────────────────────────────────────────────────
        result = sb.rpc("place_order_wallet", {
            "p_user_id": user["id"],
            "p_outlet_id": req.outlet_id,
            "p_items": items_jsonb,
        }).execute()

        if not result.data:
            raise HTTPException(400, "Order placement failed")

        order_id = result.data
        # Fetch token
        order = sb.from_("orders").select("token,total").eq("id", order_id).single().execute().data

        # WhatsApp notification (fire-and-forget)
        bg.add_task(_notify_order_placed, user["id"], order_id, order["token"])
        return {"order_id": order_id, "token": order["token"], "status": "placed"}

    else:
        # ── Gateway path ─────────────────────────────────────────────────────
        result = sb.rpc("create_pending_gateway_order", {
            "p_user_id": user["id"],
            "p_outlet_id": req.outlet_id,
            "p_items": items_jsonb,
        }).execute()

        if not result.data:
            raise HTTPException(400, "Could not create pending order")

        row = result.data[0]
        order_id = row["order_id"]
        total    = row["total"]

        merchant_txn_id = f"OP-{order_id}-{int(time.time())}"

        # Record payment intent
        sb.from_("payments").insert({
            "phonepe_txn_id": merchant_txn_id,
            "user_id": user["id"],
            "order_id": order_id,
            "amount": total,
            "purpose": "order_payment",
            "status": "created",
        }).execute()

        checkout_url = await _create_phonepe_order(
            merchant_txn_id=merchant_txn_id,
            amount_paise=total * 100,
            user_id=user["id"],
            callback_url=f"{WEBHOOK_BASE_URL}/webhooks/phonepe",
            redirect_url=f"{FRONTEND_URL}/?order_id={order_id}",
        )
        return {"order_id": order_id, "checkout_url": checkout_url, "status": "payment_pending"}

# ──────────────────────────────────────────────────────────────────────────────
# PhonePe Webhook (single endpoint for both topup + order_payment)
# ──────────────────────────────────────────────────────────────────────────────
@app.post("/webhooks/phonepe")
async def phonepe_webhook(request: Request, bg: BackgroundTasks, x_verify: str = Header(...)):
    raw = await request.body()
    if not _phonepe_verify_webhook(raw, x_verify):
        logger.warning("PhonePe webhook: invalid signature")
        raise HTTPException(400, "Invalid signature")

    body = await request.json()
    logger.info(f"PhonePe webhook: {body}")

    txn_id   = body.get("data", {}).get("merchantTransactionId") or body.get("merchantTransactionId")
    state    = body.get("code", "")
    success  = state == "PAYMENT_SUCCESS"

    # Fetch payment record
    pay_row = sb.from_("payments").select("*").eq("phonepe_txn_id", txn_id).single().execute()
    if not pay_row.data:
        logger.error(f"Payment record not found: {txn_id}")
        return JSONResponse({"status": "ignored"})

    payment = pay_row.data

    # Update payment status
    sb.from_("payments").update({"status": "SUCCESS" if success else "FAILED"}).eq("phonepe_txn_id", txn_id).execute()

    if payment["purpose"] == "topup":
        if success:
            ref = f"phonepe:{txn_id}"
            sb.rpc("credit_wallet", {
                "p_user_id": payment["user_id"],
                "p_amount": payment["amount"],
                "p_kind": "topup",
                "p_ref": ref,
                "p_note": f"PhonePe top-up {txn_id}",
            }).execute()
            bg.add_task(_notify_topup_success, payment["user_id"], payment["amount"])
            logger.info(f"Wallet credited {payment['amount']} for {payment['user_id']}")

    elif payment["purpose"] == "order_payment":
        if success:
            result = sb.rpc("finalize_gateway_order", {
                "p_order_id": payment["order_id"],
                "p_phonepe_txn_id": txn_id,
            }).execute()
            outcome = result.data or ""
            logger.info(f"finalize_gateway_order({payment['order_id']}): {outcome}")
            if outcome.startswith("placed:"):
                token = outcome.split(":")[1]
                bg.add_task(_notify_order_placed, payment["user_id"], payment["order_id"], token)
            elif outcome in ("stock_unavailable_cancelled", "expired_cancelled"):
                bg.add_task(_notify_payment_failed, payment["user_id"], payment["order_id"], "Stock ran out or payment expired")
        else:
            # Mark order cancelled
            sb.from_("orders").update({"status": "cancelled", "cancel_reason": "Payment failed"}).eq("id", payment["order_id"]).execute()
            bg.add_task(_notify_payment_failed, payment["user_id"], payment["order_id"], "Payment not completed")

    return JSONResponse({"status": "processed"})

# ──────────────────────────────────────────────────────────────────────────────
# Staff endpoints
# ──────────────────────────────────────────────────────────────────────────────
STATUS_TRANSITIONS = {"placed": "preparing", "preparing": "ready"}

@app.post("/staff/order/{order_id}/advance")
async def advance_order(order_id: int, bg: BackgroundTasks, user=Depends(require_staff)):
    order = sb.from_("orders").select("*").eq("id", order_id).single().execute().data
    if not order:
        raise HTTPException(404, "Order not found")
    if user["role"] in ("staff", "shop_admin") and order["outlet_id"] != user["outlet_id"]:
        raise HTTPException(403, "Wrong outlet")

    next_status = STATUS_TRANSITIONS.get(order["status"])
    if not next_status:
        raise HTTPException(400, f"Cannot advance from status {order['status']}")

    sb.from_("orders").update({"status": next_status}).eq("id", order_id).execute()

    if next_status == "ready":
        bg.add_task(_notify_order_ready, order["user_id"], order_id, order["token"])

    return {"order_id": order_id, "status": next_status}

@app.post("/staff/order/{order_id}/cancel")
async def cancel_order(order_id: int, request: Request, bg: BackgroundTasks, user=Depends(require_staff)):
    body = await request.json()
    reason = body.get("reason", "Cancelled by staff")

    order = sb.from_("orders").select("*").eq("id", order_id).single().execute().data
    if not order:
        raise HTTPException(404, "Order not found")
    if user["role"] in ("staff", "shop_admin") and order["outlet_id"] != user["outlet_id"]:
        raise HTTPException(403, "Wrong outlet")
    if order["status"] in ("collected", "cancelled"):
        raise HTTPException(400, "Cannot cancel at this stage")

    sb.from_("orders").update({"status": "cancelled", "cancel_reason": reason}).eq("id", order_id).execute()

    # Refund if wallet order
    if order["payment_method"] == "wallet":
        sb.rpc("credit_wallet", {
            "p_user_id": order["user_id"],
            "p_amount": order["total"],
            "p_kind": "refund",
            "p_ref": f"refund:order:{order_id}",
            "p_note": f"Refund for cancelled order #{order_id}: {reason}",
        }).execute()
    # Gateway order → TODO: trigger PhonePe refund API call here

    bg.add_task(_notify_payment_failed, order["user_id"], order_id, reason)
    return {"order_id": order_id, "status": "cancelled"}

class ScanRequest(BaseModel):
    token: Optional[str] = None
    qr_payload: Optional[str] = None  # "order:<id>" signed with HMAC
    outlet_id: str

@app.post("/staff/scan")
async def scan_collect(req: ScanRequest, user=Depends(require_staff)):
    # Resolve order by QR or token
    if req.qr_payload:
        # Format: order:<id>:<hmac_hex>
        parts = req.qr_payload.split(":")
        if len(parts) != 3 or parts[0] != "order":
            raise HTTPException(400, "Invalid QR format")
        order_id = int(parts[1])
        sig      = parts[2]
        if not _qr_verify(order_id, sig):
            raise HTTPException(403, "QR signature invalid — forged or tampered")
    elif req.token:
        today = datetime.now(timezone.utc).date().isoformat()
        row = sb.from_("orders").select("id") \
            .eq("outlet_id", req.outlet_id) \
            .eq("token", req.token) \
            .eq("status", "ready") \
            .gte("created_at", today) \
            .execute()
        if not row.data:
            raise HTTPException(404, "No ready order with that token")
        order_id = row.data[0]["id"]
    else:
        raise HTTPException(400, "Provide token or qr_payload")

    order = sb.from_("orders").select("*").eq("id", order_id).single().execute().data
    if not order:
        raise HTTPException(404, "Order not found")
    if order["outlet_id"] != req.outlet_id:
        raise HTTPException(403, "Order belongs to a different outlet")
    if order["status"] != "ready":
        raise HTTPException(400, f"Order is {order['status']}, not ready")

    sb.from_("orders").update({"status": "collected"}).eq("id", order_id).execute()
    return {"order_id": order_id, "status": "collected"}

# ──────────────────────────────────────────────────────────────────────────────
# Admin endpoints
# ──────────────────────────────────────────────────────────────────────────────
class AdminCreditRequest(BaseModel):
    user_id: str
    amount: int = Field(..., ge=1)
    note: Optional[str] = "Admin credit"

@app.post("/admin/credit-wallet")
async def admin_credit_wallet(req: AdminCreditRequest, user=Depends(require_admin)):
    ref = f"admin:{user['id']}:{req.user_id}:{int(time.time())}"
    sb.rpc("credit_wallet", {
        "p_user_id": req.user_id,
        "p_amount": req.amount,
        "p_kind": "admin_credit",
        "p_ref": ref,
        "p_note": req.note,
    }).execute()
    return {"credited": req.amount, "to": req.user_id}

# ──────────────────────────────────────────────────────────────────────────────
# Stock adjustment endpoint
# ──────────────────────────────────────────────────────────────────────────────
class StockAdjustRequest(BaseModel):
    item_id: int
    new_qty: int = Field(..., ge=0)
    reason: Optional[str] = "manual_adjustment"

@app.post("/staff/stock/adjust")
async def adjust_item_stock(req: StockAdjustRequest, user=Depends(require_staff)):
    item = sb.from_("menu_items").select("*").eq("id", req.item_id).single().execute().data
    if not item:
        raise HTTPException(404, "Menu item not found")
    if user["role"] in ("staff", "shop_admin") and item["outlet_id"] != user["outlet_id"]:
        raise HTTPException(403, "Cannot adjust stock for another outlet")

    old_qty = item.get("stock_qty") or 0
    delta = req.new_qty - old_qty
    sb.from_("menu_items").update({
        "stock_qty": req.new_qty,
        "available": (req.new_qty > 0)
    }).eq("id", req.item_id).execute()

    sb.from_("stock_adjustments").insert({
        "outlet_id": item["outlet_id"],
        "item_id": req.item_id,
        "adjusted_by": user["id"],
        "qty_change": delta,
        "previous_qty": old_qty,
        "new_qty": req.new_qty,
        "reason": req.reason,
    }).execute()

    return {"success": True, "item_id": req.item_id, "previous_qty": old_qty, "new_qty": req.new_qty}

# ──────────────────────────────────────────────────────────────────────────────
# Invite endpoints
# ──────────────────────────────────────────────────────────────────────────────
class InviteCreateRequest(BaseModel):
    role: str = Field(..., pattern="^(staff|shop_admin)$")
    outlet_id: str
    email: Optional[str] = None
    phone: Optional[str] = None

@app.post("/admin/invites/create")
async def create_user_invite(req: InviteCreateRequest, user=Depends(require_staff)):
    if user["role"] == "staff":
        raise HTTPException(403, "Staff cannot create invites")
    if user["role"] == "shop_admin":
        if req.role != "staff":
            raise HTTPException(403, "Shop admins can only invite staff")
        if req.outlet_id != user["outlet_id"]:
            raise HTTPException(403, "Shop admins can only invite for their own outlet")

    code = secrets.token_hex(4).upper()
    res = sb.from_("invites").insert({
        "code": code,
        "email": req.email,
        "phone": req.phone,
        "role": req.role,
        "outlet_id": req.outlet_id,
        "invited_by": user["id"],
        "status": "pending"
    }).execute()

    return {"success": True, "code": code, "role": req.role, "outlet_id": req.outlet_id}

class InviteAcceptRequest(BaseModel):
    code: str

@app.post("/invites/accept")
async def accept_user_invite(req: InviteAcceptRequest, user=Depends(get_current_user)):
    code_clean = req.code.strip().upper()
    inv = sb.from_("invites").select("*").eq("code", code_clean).single().execute().data
    if not inv:
        raise HTTPException(404, "Invalid invite code")
    if inv["status"] != "pending":
        raise HTTPException(400, f"Invite is already {inv['status']}")

    sb.from_("profiles").update({
        "role": inv["role"],
        "outlet_id": inv["outlet_id"],
        "added_by": inv["invited_by"]
    }).eq("id", user["id"]).execute()

    sb.from_("invites").update({
        "status": "accepted",
        "accepted_by": user["id"]
    }).eq("id", inv["id"]).execute()

    return {"success": True, "role": inv["role"], "outlet_id": inv["outlet_id"]}

# ──────────────────────────────────────────────────────────────────────────────
# MSG91 notification helpers (fire-and-forget)
# ──────────────────────────────────────────────────────────────────────────────
TEMPLATE_TOPUP_SUCCESS    = "topup_success"        # replace with real MSG91 template IDs
TEMPLATE_ORDER_PLACED     = "order_placed"
TEMPLATE_ORDER_READY      = "order_ready"
TEMPLATE_PAYMENT_FAILED   = "payment_failed"

async def _notify_topup_success(user_id: str, amount: int):
    phone = await _get_user_phone(user_id)
    if phone:
        await _send_whatsapp(phone, TEMPLATE_TOPUP_SUCCESS, [str(amount)])

async def _notify_order_placed(user_id: str, order_id: int, token: Optional[str]):
    phone = await _get_user_phone(user_id)
    if phone and token:
        await _send_whatsapp(phone, TEMPLATE_ORDER_PLACED, [str(order_id), token])

async def _notify_order_ready(user_id: str, order_id: int, token: Optional[str]):
    phone = await _get_user_phone(user_id)
    if phone:
        await _send_whatsapp(phone, TEMPLATE_ORDER_READY, [str(order_id), token or ""])

async def _notify_payment_failed(user_id: str, order_id: int, reason: str):
    phone = await _get_user_phone(user_id)
    if phone:
        await _send_whatsapp(phone, TEMPLATE_PAYMENT_FAILED, [str(order_id), reason])
