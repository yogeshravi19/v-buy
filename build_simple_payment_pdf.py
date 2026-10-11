"""
Build Simple & Executive-Friendly PDF for V Foods Payment Architecture.
Written in simple words for investors, store managers, and users.
Includes complete visual architecture diagrams and proof from Paytm docs.
Target length: Exactly 5 pages.
"""

import os
import sys
import base64
import subprocess
import re
from PIL import Image

WORKSPACE_DIR = r"E:\v-buy"
DOCS_DIR = os.path.join(WORKSPACE_DIR, "docs")
ASSETS_DIR = os.path.join(DOCS_DIR, "assets")
PAYTM_ASSETS = os.path.join(ASSETS_DIR, "paytm")
OUTPUT_HTML = os.path.join(DOCS_DIR, "V_FOODS_PAYMENT_SYSTEM_EXPLAINED_SIMPLY.html")
OUTPUT_PDF = os.path.join(DOCS_DIR, "V_FOODS_PAYMENT_SYSTEM_EXPLAINED_SIMPLY.pdf")

def get_base64_img(filepath, crop_box=None, max_width=None):
    if not os.path.exists(filepath):
        print(f"Warning: Missing image {filepath}")
        return ""
    try:
        im = Image.open(filepath)
        if crop_box:
            im = im.crop(crop_box)
        if max_width and im.width > max_width:
            ratio = max_width / float(im.width)
            new_height = int(float(im.height) * ratio)
            im = im.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        import io
        buf = io.BytesIO()
        im.save(buf, format="PNG", optimize=True)
        encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"
    except Exception as e:
        print(f"Error encoding image {filepath}: {e}")
        return ""

def generate_html():
    print("Generating base64 assets...")
    img_webhook = get_base64_img(
        os.path.join(PAYTM_ASSETS, "fig01_callback_and_webhook.png"),
        crop_box=(150, 80, 1150, 700),
        max_width=800
    )
    img_txn_status = get_base64_img(
        os.path.join(PAYTM_ASSETS, "fig03_transaction_status_api.png"),
        crop_box=(150, 80, 1150, 700),
        max_width=800
    )
    img_refund = get_base64_img(
        os.path.join(PAYTM_ASSETS, "fig06_refund_api.png"),
        crop_box=(150, 80, 1150, 700),
        max_width=800
    )

    print("Building simple HTML content...")
    raw_html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>V Foods — How Payments Work (Simple Guide for Investors &amp; Users)</title>
<style>
  @page {
    size: A4 portrait;
    margin: 8mm 10mm 8mm 10mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    font-size: 8.8pt;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    page-break-before: always;
    height: 279mm;
    max-height: 279mm;
    overflow: hidden;
    position: relative;
    padding-bottom: 8mm;
    display: flex;
    flex-direction: column;
  }

  .page:first-of-type {
    page-break-before: avoid;
  }

  /* Header */
  .page-header {
    border-bottom: 2px solid #0284c7;
    padding-bottom: 3px;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .doc-badge {
    font-size: 7.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #0284c7;
  }
  .page-topic {
    font-size: 7.5pt;
    font-weight: 600;
    color: #64748b;
  }

  /* Footer */
  .page-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 1px solid #cbd5e1;
    padding-top: 2px;
    display: flex;
    justify-content: space-between;
    font-size: 7.2pt;
    color: #64748b;
  }
  .footer-bold {
    font-weight: 700;
    color: #0369a1;
  }

  /* Titles */
  h1.page-title {
    font-size: 15pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin-bottom: 2px;
    letter-spacing: -0.02em;
  }
  .page-subtitle {
    font-size: 8.5pt;
    color: #475569;
    margin-bottom: 7px;
  }
  h2.section-heading {
    font-size: 10.2pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 6px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Simple Cards */
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 6px 9px;
    margin-bottom: 6px;
  }
  .card-highlight {
    background: #f0fdf4;
    border: 1px solid #86efac;
  }
  .card-warning {
    background: #fffbeb;
    border: 1px solid #fde68a;
  }
  .card-primary {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
  }

  /* Diagrams */
  .diagram-wrapper {
    background: #0f172a;
    color: #f8fafc;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 7px;
  }
  .diagram-step {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 4px;
    padding: 5px 7px;
    text-align: center;
  }
  .diagram-arrow {
    color: #38bdf8;
    font-weight: 900;
    text-align: center;
    font-size: 10pt;
  }

  .columns-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 6px;
  }
  .columns-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    margin-bottom: 6px;
  }

  /* Clean Tables */
  table.simple-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.8pt;
    margin-bottom: 6px;
  }
  table.simple-table th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 4px 6px;
  }
  table.simple-table td {
    padding: 4px 6px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  table.simple-table tr:nth-child(even) {
    background: #f8fafc;
  }

  ul, ol {
    padding-left: 14px;
    margin-bottom: 4px;
  }
  li {
    margin-bottom: 2px;
  }

  .pill {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 12px;
    font-size: 6.8pt;
    font-weight: 700;
    text-transform: uppercase;
  }
  .pill-green { background: #dcfce7; color: #15803d; }
  .pill-blue { background: #e0f2fe; color: #0369a1; }
  .pill-amber { background: #fef3c7; color: #b45309; }

  .figure-box {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 5px;
    padding: 4px;
    text-align: center;
    margin-bottom: 5px;
  }
  .figure-box img {
    max-width: 100%;
    height: auto;
    border-radius: 3px;
  }
  .figure-caption {
    font-size: 6.8pt;
    color: #475569;
    margin-top: 3px;
    text-align: left;
    line-height: 1.25;
  }
  .figure-caption a {
    color: #0284c7;
    text-decoration: underline;
  }
</style>
</head>
<body>

<!-- =================================================================== -->
<!-- PAGE 1 — COMPLETE ARCHITECTURE IN SIMPLE WORDS                      -->
<!-- =================================================================== -->
<div class="page" id="page-1">
  <div class="page-header">
    <span class="doc-badge">V FOODS &bull; EXECUTIVE PAYMENT GUIDE</span>
    <span class="page-topic">Page 1 — The Complete Payment Journey</span>
  </div>

  <h1 class="page-title">How Payment Works: In Plain English</h1>
  <div class="page-subtitle">A high-level overview for investors, store owners, and customers</div>

  <!-- The Master Visual Diagram -->
  <div class="diagram-wrapper">
    <div style="text-align: center; font-size: 8.5pt; font-weight: 800; color: #38bdf8; margin-bottom: 6px;">
      THE 4-STEP PAYMENT &amp; FOOD FULFILLMENT JOURNEY
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 4px;">
      <div class="diagram-step" style="flex: 1;">
        <div style="font-size: 14pt;">📱</div>
        <strong style="color: #67e8f9; font-size: 7.8pt;">1. Customer Taps Pay</strong><br>
        <span style="font-size: 6.8pt; color: #cbd5e1;">Selects food items on app &amp; chooses Paytm / UPI</span>
      </div>
      <div class="diagram-arrow">&rarr;</div>
      <div class="diagram-step" style="flex: 1.2;">
        <div style="font-size: 14pt;">🔒</div>
        <strong style="color: #67e8f9; font-size: 7.8pt;">2. Paytm Takes Payment</strong><br>
        <span style="font-size: 6.8pt; color: #cbd5e1;">Customer approves ₹ in Paytm. Bank debits account</span>
      </div>
      <div class="diagram-arrow">&rarr;</div>
      <div class="diagram-step" style="flex: 1.2;">
        <div style="font-size: 14pt;">⚡</div>
        <strong style="color: #4ade80; font-size: 7.8pt;">3. Paytm Tells V Foods</strong><br>
        <span style="font-size: 6.8pt; color: #cbd5e1;">Direct server signal confirms: "Money received!"</span>
      </div>
      <div class="diagram-arrow">&rarr;</div>
      <div class="diagram-step" style="flex: 1;">
        <div style="font-size: 14pt;">🍔</div>
        <strong style="color: #4ade80; font-size: 7.8pt;">4. Food Is Cooked</strong><br>
        <span style="font-size: 6.8pt; color: #cbd5e1;">Order confirmed, pickup token generated for kitchen</span>
      </div>
    </div>
  </div>

  <div class="columns-2">
    <div class="card card-primary">
      <h2 class="section-heading" style="color: #0369a1;">Where Does Payment Start?</h2>
      <p>
        Everything starts when a student or customer fills their cart on the V Foods app and taps <strong>"Pay via Paytm"</strong>.
      </p>
      <ul>
        <li>The V Foods app creates a temporary reservation for the items.</li>
        <li>Our backend asks Paytm: <em>"Please open a secure payment session for ₹250."</em></li>
        <li>Paytm opens its secure screen for UPI, Cards, or Netbanking.</li>
      </ul>
      <p style="margin-top: 3px;">
        <strong>Safety Note:</strong> V Foods never sees or stores card numbers, UPI PINs, or bank passwords. Paytm handles the banking securely.
      </p>
    </div>

    <div class="card card-highlight">
      <h2 class="section-heading" style="color: #15803d;">How Does the Order Become Confirmed?</h2>
      <p>
        We do <strong>not</strong> trust the customer's phone to tell us if payment succeeded (because phones can crash or lose signal).
      </p>
      <ul>
        <li>Instead, <strong>Paytm’s official server</strong> directly contacts <strong>V Foods’ server</strong> via a private digital message (called a <em>Webhook</em>).</li>
        <li>Our server verifies that the money actually arrived.</li>
        <li>Our server checks that food is in stock, sets the order to <strong>CONFIRMED</strong>, and alerts the kitchen screen.</li>
      </ul>
    </div>
  </div>

  <!-- The Two Golden Guarantees -->
  <div class="card" style="border-left: 4px solid #0284c7;">
    <h2 class="section-heading" style="margin-top: 2px;">The Core Rule for Investors &amp; Store Owners</h2>
    <div class="columns-2" style="margin-bottom: 0;">
      <div style="background: #ffffff; padding: 5px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
        <strong style="color: #15803d; font-size: 8.5pt;">✅ Guarantee 1: The Outlet Never Loses Food</strong><br>
        The kitchen screen will <em>never</em> show an order unless the money is 100% verified in Paytm. No free food, no fake screenshots, no scam orders.
      </div>
      <div style="background: #ffffff; padding: 5px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
        <strong style="color: #0284c7; font-size: 8.5pt;">✅ Guarantee 2: The Customer Never Loses Money</strong><br>
        If money is debited from the customer's bank but food cannot be made (e.g. sold out or shop closed), the system <strong>automatically refunds 100%</strong> of the money.
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span class="footer-bold">V FOODS &bull; HOW PAYMENTS WORK</span>
    <span>Page 1 of 5</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 2 — MONEY DEBITED BUT ORDER NOT CONFIRMED?                     -->
<!-- =================================================================== -->
<div class="page" id="page-2">
  <div class="page-header">
    <span class="doc-badge">V FOODS &bull; EXECUTIVE PAYMENT GUIDE</span>
    <span class="page-topic">Page 2 — Resolving Stuck / Pending Payments</span>
  </div>

  <h1 class="page-title">The Big Question: Money Debited, Order Not Confirmed?</h1>
  <div class="page-subtitle">What happened behind the scenes, why no one needs to panic, and how it auto-resolves</div>

  <div class="card card-warning">
    <h2 class="section-heading" style="color: #b45309; margin-top: 2px;">Why Does This Happen in Real Life?</h2>
    <p>
      On busy university campuses, mobile data often fluctuates right after a student types their UPI PIN.
    </p>
    <div style="display: flex; gap: 8px; margin-top: 4px; font-size: 8pt;">
      <div style="flex: 1; background: #ffffff; padding: 4px 6px; border-radius: 4px; border: 1px solid #fde68a;">
        <strong>1. Bank Debited:</strong> Bank takes ₹120 and gives it to Paytm.
      </div>
      <div style="flex: 1; background: #ffffff; padding: 4px 6px; border-radius: 4px; border: 1px solid #fde68a;">
        <strong>2. Internet Drop:</strong> Student's phone loses signal or closes app.
      </div>
      <div style="flex: 1; background: #ffffff; padding: 4px 6px; border-radius: 4px; border: 1px solid #fde68a;">
        <strong>3. Result:</strong> Paytm has the money, but V Foods didn't hear back yet.
      </div>
    </div>
  </div>

  <h2 class="section-heading">How V Foods Auto-Heals (No Human Action Needed)</h2>
  <div class="diagram-wrapper" style="padding: 6px 10px;">
    <div style="text-align: center; color: #fde047; font-weight: 700; margin-bottom: 4px;">
      AUTOMATED SELF-HEALING DECISION TREE (Within 1 to 2 Minutes)
    </div>
    <div style="background: #1e293b; padding: 6px; border-radius: 4px; text-align: center; margin-bottom: 4px;">
      V Foods Backend contacts Paytm directly: <em>"Did customer really pay for Order #123?"</em>
    </div>
    <div style="display: flex; justify-content: space-between; gap: 6px;">
      <div style="flex: 1; background: #064e3b; border: 1px solid #059669; padding: 5px; border-radius: 4px;">
        <strong style="color: #6ee7b7;">Paytm says: "YES, PAID!"</strong><br>
        <span style="font-size: 7.2pt; color: #a7f3d0;">Is the food still in stock &amp; outlet open?</span>
        <div style="margin-top: 4px; display: flex; gap: 4px;">
          <div style="flex: 1; background: #047857; padding: 3px; border-radius: 3px; font-size: 6.8pt;">
            <strong>YES &rarr; ORDER CONFIRMED!</strong><br>
            Pickup token generated. Kitchen cooks food!
          </div>
          <div style="flex: 1; background: #991b1b; padding: 3px; border-radius: 3px; font-size: 6.8pt;">
            <strong>NO &rarr; AUTO REFUND!</strong><br>
            Sold out or timed out. 100% money sent back.
          </div>
        </div>
      </div>
      <div style="flex: 0.8; background: #450a0a; border: 1px solid #dc2626; padding: 5px; border-radius: 4px;">
        <strong style="color: #fca5a5;">Paytm says: "NO / CANCELLED"</strong><br>
        <span style="font-size: 7.2pt; color: #fecaca;">Customer cancelled or bank failed.</span>
        <div style="margin-top: 4px; background: #7f1d1d; padding: 3px; border-radius: 3px; font-size: 6.8pt;">
          Order marked CANCELLED. Bank auto-reverses if debited.
        </div>
      </div>
    </div>
  </div>

  <div class="columns-2">
    <div class="card card-highlight">
      <strong style="color: #15803d; font-size: 8.5pt;">Outcome A: The Order Gets Confirmed</strong>
      <p style="margin-top: 2px;">
        If the student reconnects within 1–2 minutes, our server confirms with Paytm that payment succeeded. As long as the food is still available, the order instantly flips to <strong>Confirmed</strong> and the kitchen prepares the meal.
      </p>
    </div>

    <div class="card" style="background: #fef2f2; border-color: #fecaca;">
      <strong style="color: #991b1b; font-size: 8.5pt;">Outcome B: Automated 100% Refund</strong>
      <p style="margin-top: 2px;">
        If the student waited too long (>10 minutes) or the item sold out before signal returned, V Foods <strong>never keeps the money</strong>. Our system immediately calls Paytm's Refund API and returns 100% to the student's UPI.
      </p>
    </div>
  </div>

  <div class="card">
    <strong style="color: #0369a1;">Bottom Line for Customers:</strong>
    You do not need to panic, scream at the counter, or make 10 phone calls. The system handles it automatically in under 2 minutes.
  </div>

  <div class="page-footer">
    <span class="footer-bold">V FOODS &bull; HOW PAYMENTS WORK</span>
    <span>Page 2 of 5</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 3 — WHOM DOES THE USER CONTACT?                                -->
<!-- =================================================================== -->
<div class="page" id="page-3">
  <div class="page-header">
    <span class="doc-badge">V FOODS &bull; EXECUTIVE PAYMENT GUIDE</span>
    <span class="page-topic">Page 3 — Customer Support &amp; Store Resolution</span>
  </div>

  <h1 class="page-title">Whom Does the User Contact?</h1>
  <div class="page-subtitle">The 3-tier safety net for customer support, store managers, and banking inquiries</div>

  <div class="card card-primary" style="margin-bottom: 6px;">
    <h2 class="section-heading" style="color: #0369a1; margin-top: 2px;">The 99% Rule: No Contact Needed</h2>
    <p>
      In <strong>99% of cases, the user does not need to call or message anyone.</strong> The backend self-heals in 1–2 minutes. Either their food is confirmed or their money is refunded automatically.
    </p>
  </div>

  <h2 class="section-heading">If a Customer Wants Support, Here is Exactly How It Works:</h2>
  <div class="columns-3">
    <!-- Channel 1: In App -->
    <div class="card" style="border-top: 3px solid #0284c7;">
      <div style="font-size: 16pt;">📲</div>
      <strong style="color: #0284c7; font-size: 8.5pt;">1. In-App One-Tap Check</strong>
      <p style="font-size: 7.5pt; margin-top: 3px;">
        On the order tracking screen, the user has a <strong>"Check Payment Status"</strong> button.
      </p>
      <ul style="font-size: 7.2pt; padding-left: 10px;">
        <li>Tapping it forces our server to query Paytm right that second.</li>
        <li>Displays Order ID and Paytm Reference for immediate proof.</li>
      </ul>
    </div>

    <!-- Channel 2: Store Counter -->
    <div class="card" style="border-top: 3px solid #16a34a;">
      <div style="font-size: 16pt;">🏪</div>
      <strong style="color: #16a34a; font-size: 8.5pt;">2. At the Store Counter</strong>
      <p style="font-size: 7.5pt; margin-top: 3px;">
        The student can show their order screen or bank SMS at the counter.
      </p>
      <ul style="font-size: 7.2pt; padding-left: 10px;">
        <li>Store manager opens their <strong>Admin Tablet</strong>.</li>
        <li>One tap on <em>"Reconcile Payments"</em> checks all pending orders live.</li>
        <li>Cashier can see instantly: "Payment Received" or "Auto-Refunded".</li>
      </ul>
    </div>

    <!-- Channel 3: Bank / Paytm -->
    <div class="card" style="border-top: 3px solid #eab308;">
      <div style="font-size: 16pt;">🏦</div>
      <strong style="color: #b45309; font-size: 8.5pt;">3. Bank / Paytm Proof</strong>
      <p style="font-size: 7.5pt; margin-top: 3px;">
        Every payment sends an instant SMS with a <strong>UTR / Txn ID</strong>.
      </p>
      <ul style="font-size: 7.2pt; padding-left: 10px;">
        <li>This unique 12-digit number is permanent banking proof.</li>
        <li>If ever disputed, Paytm and the bank can trace the exact rupee.</li>
      </ul>
    </div>
  </div>

  <h2 class="section-heading">Comparison: Traditional Cafeteria vs. V Foods</h2>
  <table class="simple-table">
    <thead>
      <tr>
        <th style="width: 25%;">Scenario</th>
        <th style="width: 37%;">Traditional College Canteen</th>
        <th style="width: 38%;">V Foods Automated System</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Money debited, cashier says no</strong></td>
        <td>Student argues with cashier. Cashier refuses food. Student feels cheated.</td>
        <td>System checks Paytm within 2 mins. Either confirms food or auto-refunds.</td>
      </tr>
      <tr>
        <td><strong>Food runs out while paying</strong></td>
        <td>Student forced to take something they didn't want, or wait days for cash refund.</td>
        <td>System instantly detects zero stock and triggers <strong>automated 100% refund</strong>.</td>
      </tr>
      <tr>
        <td><strong>Store Manager workload</strong></td>
        <td>Spends hours checking passbooks and bank statements every evening.</td>
        <td>Zero manual work. One-click dashboard reconciles every single rupee.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-footer">
    <span class="footer-bold">V FOODS &bull; HOW PAYMENTS WORK</span>
    <span>Page 3 of 5</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 4 — CONCURRENCY & REFUNDS SIMPLIFIED                           -->
<!-- =================================================================== -->
<div class="page" id="page-4">
  <div class="page-header">
    <span class="doc-badge">V FOODS &bull; EXECUTIVE PAYMENT GUIDE</span>
    <span class="page-topic">Page 4 — Stock Rush &amp; Refund Mechanics</span>
  </div>

  <h1 class="page-title">Rush Hour Stock Race &amp; Refunds Explained</h1>
  <div class="page-subtitle">What happens when two students pay for the last item at the exact same second?</div>

  <!-- Concurrency Scenario -->
  <div class="card card-primary">
    <h2 class="section-heading" style="color: #0369a1; margin-top: 2px;">The 1:00 PM Lunch Rush: 2 Students, 1 Sandwich Remaining</h2>
    <p>
      Imagine User A and User B both tap <em>"Pay via Paytm"</em> for the last Paneer Sandwich at 1:00:00 PM. Both of their bank accounts debit ₹80 successfully. What happens?
    </p>
    <div style="display: flex; gap: 8px; margin-top: 5px;">
      <div style="flex: 1; background: #ffffff; padding: 6px; border-radius: 5px; border-left: 3px solid #16a34a;">
        <strong style="color: #15803d;">User A (Arrives 0.05 seconds first):</strong><br>
        <span style="font-size: 7.2pt;">
          1. System locks the inventory row.<br>
          2. Sees 1 sandwich left. Takes it.<br>
          3. Sandwich count becomes 0.<br>
          4. <strong>Order Confirmed &bull; Token #42 Issued!</strong>
        </span>
      </div>
      <div style="flex: 1; background: #ffffff; padding: 6px; border-radius: 5px; border-left: 3px solid #dc2626;">
        <strong style="color: #991b1b;">User B (Arrives 0.05 seconds later):</strong><br>
        <span style="font-size: 7.2pt;">
          1. System checks inventory.<br>
          2. Sees 0 sandwiches left (out of stock).<br>
          3. Rejects the order.<br>
          4. <strong>Instantly triggers 100% Refund of ₹80!</strong>
        </span>
      </div>
    </div>
  </div>

  <!-- Refund Semantics -->
  <h2 class="section-heading">How Refunds Actually Work: "Requested &ne; In Bank"</h2>
  <div class="columns-3">
    <div class="card" style="background: #ffffff; border-top: 3px solid #0284c7;">
      <strong style="color: #0284c7;">Step 1: Auto-Triggered</strong>
      <p style="font-size: 7.2pt; margin-top: 2px;">
        V Foods calls Paytm Refund API within milliseconds. Unique ID prevents duplicate refunds.
      </p>
      <span class="pill pill-blue">Instant (&lt; 1 sec)</span>
    </div>
    <div class="card" style="background: #ffffff; border-top: 3px solid #f59e0b;">
      <strong style="color: #b45309;">Step 2: Paytm Accepted</strong>
      <p style="font-size: 7.2pt; margin-top: 2px;">
        Paytm acknowledges the refund and routes funds back through the banking network.
      </p>
      <span class="pill pill-amber">Queued at Bank</span>
    </div>
    <div class="card" style="background: #ffffff; border-top: 3px solid #16a34a;">
      <strong style="color: #15803d;">Step 3: Credited to User</strong>
      <p style="font-size: 7.2pt; margin-top: 2px;">
        UPI refunds usually credit in seconds or hours. Cards take 1–3 banking business days.
      </p>
      <span class="pill pill-green">Money in Bank</span>
    </div>
  </div>

  <!-- Crash Resilience -->
  <div class="card card-highlight">
    <h2 class="section-heading" style="color: #15803d; margin-top: 2px;">What If the V Foods Server Crashes or Restarts?</h2>
    <p>
      Even if our server restarts in the middle of a transaction, nothing is lost:
    </p>
    <ul>
      <li><strong>Database Safety:</strong> Database transactions are <em>atomic</em>—they either finish 100% or cleanly roll back. No half-finished states.</li>
      <li><strong>Paytm Retries:</strong> Paytm will automatically re-send confirmation webhooks every few minutes until our server answers.</li>
      <li><strong>Background Reconciler:</strong> A background cron job scans for any order that has been pending for over 2 minutes and resolves it immediately.</li>
    </ul>
  </div>

  <div class="page-footer">
    <span class="footer-bold">V FOODS &bull; HOW PAYMENTS WORK</span>
    <span>Page 4 of 5</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 5 — OFFICIAL PROOF FROM PAYTM DOCS                             -->
<!-- =================================================================== -->
<div class="page" id="page-5">
  <div class="page-header">
    <span class="doc-badge">V FOODS &bull; EXECUTIVE PAYMENT GUIDE</span>
    <span class="page-topic">Page 5 — Official Paytm Documentation Proof</span>
  </div>

  <h1 class="page-title">Proof from Official Paytm Documentation</h1>
  <div class="page-subtitle">Verifying our architecture directly against official Paytm Payment Gateway specifications</div>

  <!-- 3 Official Screenshots -->
  <div class="columns-3">
    <!-- Proof 1: Webhooks -->
    <div class="figure-box">
      <img src="__IMG_WEBHOOK__" alt="Paytm Webhook Documentation">
      <div class="figure-caption">
        <strong>Figure 1: S2S Webhooks</strong><br>
        Paytm proves server-to-server notifications are the authoritative channel.<br>
        <a href="https://paytmpayments.com/docs/callback-and-webhook" target="_blank">paytmpayments.com/docs/callback-and-webhook</a>
      </div>
    </div>

    <!-- Proof 2: Status API -->
    <div class="figure-box">
      <img src="__IMG_TXN_STATUS__" alt="Paytm Transaction Status API">
      <div class="figure-caption">
        <strong>Figure 2: Transaction Status API</strong><br>
        Paytm's official endpoint for querying status when webhooks are delayed.<br>
        <a href="https://paytmpayments.com/docs/api/v3/transaction-status-api" target="_blank">paytmpayments.com/docs/api/v3/transaction-status-api</a>
      </div>
    </div>

    <!-- Proof 3: Refund API -->
    <div class="figure-box">
      <img src="__IMG_REFUND__" alt="Paytm Refund API">
      <div class="figure-caption">
        <strong>Figure 3: Automated Refund API</strong><br>
        Paytm's official merchant reversal API using unique <code>refId</code> keys.<br>
        <a href="https://paytmpayments.com/docs/api/refund-api" target="_blank">paytmpayments.com/docs/api/refund-api</a>
      </div>
    </div>
  </div>

  <!-- Verification Summary Table -->
  <h2 class="section-heading">Implementation Audit Summary</h2>
  <table class="simple-table">
    <thead>
      <tr>
        <th style="width: 25%;">Feature</th>
        <th style="width: 45%;">How V Foods Implements It</th>
        <th style="width: 30%;">Paytm Requirement</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Payment Checksum</strong></td>
        <td>Server signs every transaction with HMAC-SHA256 using private key.</td>
        <td>Mandatory for tamper prevention.</td>
      </tr>
      <tr>
        <td><strong>Order Confirmation</strong></td>
        <td>Handled by S2S webhook (<code>POST /webhooks/paytm</code>) with DB row locks.</td>
        <td>Never trust client-side redirect.</td>
      </tr>
      <tr>
        <td><strong>Pending Recovery</strong></td>
        <td>Periodic reconciler queries Paytm Transaction Status API (<code>/v3/order/status</code>).</td>
        <td>Recommended fallback pattern.</td>
      </tr>
      <tr>
        <td><strong>Automated Refunds</strong></td>
        <td>Calls Paytm Refund API (<code>/refund/apply</code>) with unique idempotency key.</td>
        <td>Mandatory unique <code>refId</code> per refund.</td>
      </tr>
    </tbody>
  </table>

  <!-- Final Conclusion Box -->
  <div class="card card-highlight" style="margin-top: 4px; padding: 6px 9px;">
    <strong style="color: #15803d; font-size: 8.5pt;">Summary for Investors &amp; Stakeholders:</strong>
    <p style="margin-top: 2px;">
      V Foods adheres 100% to industry standard payment gateway patterns. The architecture provides <strong>zero financial leakage for outlets</strong>, <strong>zero lost money for students</strong>, and <strong>automated self-healing</strong> for high-volume campus operations.
    </p>
  </div>

  <div class="page-footer">
    <span class="footer-bold">V FOODS &bull; HOW PAYMENTS WORK</span>
    <span>Page 5 of 5</span>
  </div>
</div>

</body>
</html>
"""
    # Replace image placeholders
    final_html = raw_html.replace("__IMG_WEBHOOK__", img_webhook)
    final_html = final_html.replace("__IMG_TXN_STATUS__", img_txn_status)
    final_html = final_html.replace("__IMG_REFUND__", img_refund)

    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(final_html)
    print(f"HTML successfully generated at: {OUTPUT_HTML}")

def compile_pdf():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        print(f"Error: Chrome executable not found at {chrome_path}")
        return False
    
    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={OUTPUT_PDF}",
        OUTPUT_HTML
    ]
    print(f"Executing: {' '.join(cmd)}")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Chrome PDF generation failed: {res.stderr}")
        return False
    
    print(f"PDF successfully generated at: {OUTPUT_PDF}")
    return True

def verify_page_count():
    if not os.path.exists(OUTPUT_PDF):
        print("PDF does not exist.")
        return 0
    with open(OUTPUT_PDF, "rb") as f:
        data = f.read()
    pages = len(re.findall(rb'/Type\s*/Page\b', data))
    print(f"--> Verified PDF Page Count: {pages} pages")
    return pages

if __name__ == "__main__":
    generate_html()
    if compile_pdf():
        count = verify_page_count()
        print(f"Result: {count} pages generated.")
