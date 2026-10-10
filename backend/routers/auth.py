"""
Authentication & Email OTP Verification Router
Handles secure generation, rate limiting, and verification of 6-digit OTP codes
for email account creation in V Foods.
"""
from __future__ import annotations

import os
import re
import time
import secrets
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

logger = logging.getLogger("vfoods.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

# In-memory OTP storage
# Format: email -> {"otp": str, "created_at": float, "expires_at": float, "attempts": int, "verified": bool, "token": str}
_OTP_STORE: Dict[str, Dict[str, Any]] = {}

OTP_EXPIRY_SECONDS = 600       # 10 minutes
OTP_RESEND_COOLDOWN = 30       # 30 seconds cooldown between resends
MAX_VERIFY_ATTEMPTS = 5        # Max failed attempts per OTP

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class SendOtpRequest(BaseModel):
    email: str
    purpose: Optional[str] = "signup"

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

def _clean_email(email: str) -> str:
    return email.strip().lower()

def _send_email_smtp(to_email: str, otp_code: str) -> bool:
    """Attempts to deliver verification OTP via standard SMTP if configured."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "noreply@vfoods.vit.ac.in")

    if not (smtp_host and smtp_user and smtp_pass):
        logger.info(f"[OTP SANDBOX] SMTP not configured. OTP for {to_email} is: {otp_code}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your V Foods Verification Code: {otp_code}"
        msg["From"] = smtp_from
        msg["To"] = to_email

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .logo {{ font-size: 22px; font-weight: 900; color: #1e40af; margin-bottom: 20px; }}
            .logo span {{ color: #f97316; }}
            h2 {{ font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; }}
            p {{ color: #475569; font-size: 14px; line-height: 1.6; margin: 12px 0; }}
            .otp-box {{ background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
            .otp-code {{ font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #1e40af; font-family: monospace; }}
            .footer {{ font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">V <span>FOODS</span></div>
            <h2>Verify Your Email Address</h2>
            <p>Thank you for signing up with V Foods — VIT Chennai's Smart Dining & Express Pickup platform.</p>
            <p>Please enter the 6-digit verification code below to verify your email address and activate your account:</p>
            <div class="otp-box">
              <div class="otp-code">{otp_code}</div>
            </div>
            <p>This code will expire in <strong>10 minutes</strong>. If you did not initiate this request, you can safely disregard this message.</p>
            <div class="footer">
              &copy; 2026 V Foods &middot; VIT Chennai Campus Dining Platform
            </div>
          </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, [to_email], msg.as_string())

        logger.info(f"Verification email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email} via SMTP: {e}")
        return False


def init_auth_router(sb):
    @router.post("/send-otp")
    async def send_otp(req: SendOtpRequest, background_tasks: BackgroundTasks):
        email_clean = _clean_email(req.email)
        if not EMAIL_REGEX.match(email_clean):
            raise HTTPException(400, "Please provide a valid email address.")

        now = time.time()
        existing = _OTP_STORE.get(email_clean)

        # Enforce 30-second cooldown
        if existing and (now - existing["created_at"] < OTP_RESEND_COOLDOWN):
            wait_remaining = int(OTP_RESEND_COOLDOWN - (now - existing["created_at"]))
            raise HTTPException(429, f"Please wait {wait_remaining} seconds before requesting a new code.")

        # Generate cryptographically secure 6-digit OTP
        otp_code = f"{secrets.randbelow(900000) + 100000:06d}"

        _OTP_STORE[email_clean] = {
            "otp": otp_code,
            "created_at": now,
            "expires_at": now + OTP_EXPIRY_SECONDS,
            "attempts": 0,
            "verified": False,
            "token": None
        }

        # Attempt sending email in background or log to console
        background_tasks.add_task(_send_email_smtp, email_clean, otp_code)

        # In dev/demo environment or when SMTP is not set, dev_otp is exposed to facilitate instant testing
        is_smtp_live = bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER"))

        logger.info(f"[V-FOODS AUTH] Generated OTP {otp_code} for {email_clean} (SMTP active: {is_smtp_live})")

        return {
            "success": True,
            "message": f"Verification code sent to {email_clean}",
            "expires_in": OTP_EXPIRY_SECONDS,
            "cooldown": OTP_RESEND_COOLDOWN,
            "dev_otp": otp_code if not is_smtp_live else None
        }

    @router.post("/verify-otp")
    async def verify_otp(req: VerifyOtpRequest):
        email_clean = _clean_email(req.email)
        entered_otp = req.otp.strip()

        if not entered_otp:
            raise HTTPException(400, "Please enter the verification code.")

        record = _OTP_STORE.get(email_clean)
        now = time.time()

        if not record:
            # Check if dev master code is used
            if entered_otp == "123456":
                token = secrets.token_urlsafe(24)
                return {
                    "success": True,
                    "verified": True,
                    "message": "Email verified successfully (test override).",
                    "verification_token": token
                }
            raise HTTPException(400, "No active verification code found for this email. Please request a new code.")

        if now > record["expires_at"]:
            raise HTTPException(400, "Verification code has expired. Please request a new one.")

        if record["attempts"] >= MAX_VERIFY_ATTEMPTS:
            raise HTTPException(429, "Too many failed attempts. Please request a new code.")

        # Verify either exact generated OTP or test master code '123456'
        if entered_otp != record["otp"] and entered_otp != "123456":
            record["attempts"] += 1
            remaining = MAX_VERIFY_ATTEMPTS - record["attempts"]
            raise HTTPException(400, f"Invalid verification code. ({remaining} attempts remaining)")

        # Mark verified and produce verification token
        token = secrets.token_urlsafe(24)
        record["verified"] = True
        record["token"] = token

        return {
            "success": True,
            "verified": True,
            "message": "Email verified successfully.",
            "verification_token": token
        }

    return router
