"""
Build Focused Technical & Executive PDF on Paytm Refund Options & Workflow.
Specifically addresses:
- How refunds are initiated according to official Paytm documentation.
- What happens when payment is debited but order is NOT placed.
- The 3 triggers in V Foods (Auto Reconciler, User In-App, Manager Counter Tablet).
- Official Paytm proof with screenshots and links.
Target length: Exactly 4 pages.
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
OUTPUT_HTML = os.path.join(DOCS_DIR, "PAYTM_REFUND_OPTIONS_AND_WORKFLOW.html")
OUTPUT_PDF = os.path.join(DOCS_DIR, "PAYTM_REFUND_OPTIONS_AND_WORKFLOW.pdf")

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
    print("Generating base64 assets for Refund Guide...")
    # 1. Refund API
    img_refund_api = get_base64_img(
        os.path.join(PAYTM_ASSETS, "fig06_refund_api.png"),
        crop_box=(150, 70, 1150, 680),
        max_width=850
    )
    # 2. Refund Status API
    img_refund_status = get_base64_img(
        os.path.join(PAYTM_ASSETS, "fig07_refund_status_api.png"),
        crop_box=(150, 70, 1150, 680),
        max_width=850
    )
    # 3. Accept Refund Webhook
    img_refund_webhook = get_base64_img(
        os.path.join(PAYTM_ASSETS, "fig08_accept_refund_webhook.png"),
        crop_box=(150, 70, 1150, 660),
        max_width=850
    )

    print("Building HTML content...")
    raw_html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>V Foods — Paytm Refund Options &amp; Workflow</title>
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

  /* Running Header */
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

  /* Running Footer */
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

  /* Headings */
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
    font-size: 10pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 5px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Cards */
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
  .card-danger {
    background: #fef2f2;
    border: 1px solid #fecaca;
  }

  /* Diagrams */
  .diagram-wrapper {
    background: #0f172a;
    color: #f8fafc;
    border-radius: 6px;
    padding: 7px 10px;
    margin-bottom: 6px;
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

  /* Tables */
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

  code.inline {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 7.4pt;
    background: #f1f5f9;
    padding: 1px 3px;
    border-radius: 3px;
    color: #0369a1;
    border: 1px solid #e2e8f0;
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
    margin-bottom: 4px;
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

  ul, ol {
    padding-left: 14px;
    margin-bottom: 4px;
  }
  li {
    margin-bottom: 2px;
  }
</style>
</head>
<body>

<!-- =================================================================== -->
<!-- PAGE 1 — THE CORE PROBLEM & PAYTM REFUND OPTIONS OVERVIEW           -->
<!-- =================================================================== -->
<div class="page" id="page-1">
  <div class="page-header">
    <span class="doc-badge">V FOODS &bull; PAYTM INTEGRATION GUIDE</span>
    <span class="page-topic">Page 1 — Payment Debited, Order Not Placed</span>
  </div>

  <h1 class="page-title">Payment Debited, Order Not Placed: Refund Options</h1>
  <div class="page-subtitle">How Paytm Documentation defines refunds and how V Foods executes them seamlessly</div>

  <!-- The Real-World Situation -->
  <div class="card card-warning">
    <h2 class="section-heading" style="color: #b45309; margin-top: 2px;">The Real-World Situation</h2>
    <p>
      In a fast-moving cafeteria, a customer enters their UPI PIN and their bank account is debited ₹120. However, the order is <strong>NOT placed</strong> (e.g. phone lost internet right after UPI authorization, customer closed the app, or the 10-minute checkout timer expired while paying).
    </p>
    <div style="display: flex; gap: 6px; margin-top: 4px; font-size: 7.8pt;">
      <div style="flex: 1; background: #ffffff; padding: 4px 6px; border-radius: 4px; border: 1px solid #fde68a;">
        <strong>1. Paytm Gateway State:</strong><br>
        Transaction is marked <code class="inline">TXN_SUCCESS</code>. Funds reside securely at Paytm.
      </div>
      <div style="color: #b45309; font-weight: bold; align-self: center;">&ne;</div>
      <div style="flex: 1; background: #ffffff; padding: 4px 6px; border-radius: 4px; border: 1px solid #fde68a;">
        <strong>2. V Foods Order State:</strong><br>
        Order status remains <code class="inline">awaiting_payment</code> or <code class="inline">cancelled</code>. No food token issued.
      </div>
    </div>
  </div>

  <h2 class="section-heading">Official Refund Options Provided in Paytm Documentation</h2>
  <div class="columns-2">
    <!-- Option A: Automated Refund API -->
    <div class="card card-primary">
      <div style="font-size: 14pt;">⚡</div>
      <strong style="color: #0284c7; font-size: 8.8pt;">Option A: Automated Server-to-Server Refund API</strong>
      <p style="font-size: 7.8pt; margin-top: 3px;">
        Documented by Paytm as the programmatic reversal channel:
      </p>
      <ul style="font-size: 7.5pt;">
        <li><strong>Endpoint:</strong> <code class="inline">POST https://securegw.paytm.in/refund/apply</code></li>
        <li><strong>How it works:</strong> The merchant server sends a signed JSON request with Merchant ID, Transaction ID, and a unique Refund ID.</li>
        <li><strong>Paytm Action:</strong> Paytm automatically reverses the funds to the customer's source account (UPI / Bank / Card).</li>
        <li><strong>V Foods Usage:</strong> <strong>Primary method used</strong> for automated and one-click refunds.</li>
      </ul>
    </div>

    <!-- Option B: Paytm Merchant Dashboard -->
    <div class="card">
      <div style="font-size: 14pt;">🖥️</div>
      <strong style="color: #0f172a; font-size: 8.8pt;">Option B: Paytm Merchant Dashboard (Manual Portal)</strong>
      <p style="font-size: 7.8pt; margin-top: 3px;">
        Documented by Paytm as the administrative backup channel:
      </p>
      <ul style="font-size: 7.5pt;">
        <li><strong>Portal:</strong> <code class="inline">https://dashboard.paytm.com</code></li>
        <li><strong>How it works:</strong> Merchant logs into the Paytm web portal, searches the Order ID / Transaction ID, and clicks "Initiate Refund".</li>
        <li><strong>Paytm Action:</strong> Paytm processes the refund from the web interface.</li>
        <li><strong>V Foods Usage:</strong> Super Admin emergency backup. (Store managers do not need this because V Foods automates it via Option A).</li>
      </ul>
    </div>
  </div>

  <!-- End-to-End Decision Flow -->
  <div class="diagram-wrapper">
    <div style="text-align: center; color: #38bdf8; font-weight: 700; font-size: 8pt; margin-bottom: 4px;">
      THE V FOODS REFUND LIFECYCLE FOR UNPLACED ORDERS
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 7.2pt; text-align: center;">
      <div class="diagram-step" style="flex: 1;">
        <strong>Customer Debited ₹120</strong><br>
        <span style="color: #94a3b8; font-size: 6.5pt;">Paytm has funds; Order unplaced</span>
      </div>
      <div class="diagram-arrow">&rarr;</div>
      <div class="diagram-step" style="flex: 1.2;">
        <strong>System Detects Issue</strong><br>
        <span style="color: #94a3b8; font-size: 6.5pt;">Auto Reconcile / App / Tablet</span>
      </div>
      <div class="diagram-arrow">&rarr;</div>
      <div class="diagram-step" style="flex: 1.3;">
        <strong>Calls Paytm Refund API</strong><br>
        <span style="color: #94a3b8; font-size: 6.5pt;">POST /refund/apply with unique refId</span>
      </div>
      <div class="diagram-arrow">&rarr;</div>
      <div class="diagram-step" style="flex: 1.1;">
        <strong>Customer Receives 100%</strong><br>
        <span style="color: #4ade80; font-size: 6.5pt;">Credited back to Bank / UPI</span>
      </div>
    </div>
  </div>

  <div class="card card-highlight">
    <strong style="color: #15803d;">Key Takeaway for Investors &amp; Store Owners:</strong>
    Because everything is in one PostgreSQL database, inventory and payment states are always clear. When money is taken without an order being placed, V Foods uses Paytm’s automated Refund API to send the money back immediately.
  </div>

  <div class="page-footer">
    <span class="footer-bold">V FOODS &bull; PAYTM REFUND OPTIONS GUIDE</span>
    <span>Page 1 of 4</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 2 — THE 3 REAL-WORLD TRIGGERS IN V FOODS                       -->
<!-- =================================================================== -->
<div class="page" id="page-2">
  <div class="page-header">
    <span class="doc-badge">V FOODS &bull; PAYTM INTEGRATION GUIDE</span>
    <span class="page-topic">Page 2 — The 3 Execution Triggers in V Foods</span>
  </div>

  <h1 class="page-title">How V Foods Triggers the Paytm Refund API</h1>
  <div class="page-subtitle">The three real-world execution paths that protect customer money</div>

  <div class="columns-3">
    <!-- Trigger 1: Background Reconciler -->
    <div class="card card-primary" style="border-top: 3px solid #0284c7;">
      <div style="font-size: 16pt;">🤖</div>
      <strong style="color: #0284c7; font-size: 8.5pt;">Trigger 1: Automatic Background Reconciler</strong>
      <p style="font-size: 7.5pt; margin-top: 3px;">
        <strong>When:</strong> The customer walked away or closed their browser without returning to V Foods.
      </p>
      <ul style="font-size: 7.2pt; padding-left: 10px;">
        <li>A background task (<code class="inline">/admin/payments/reconcile</code>) scans for stuck payments older than 2 minutes.</li>
        <li>It queries Paytm’s Transaction Status API. If Paytm confirms payment was taken but the 10-minute order timer expired, it <strong>automatically initiates the refund</strong>.</li>
        <li><strong>Human effort required: ZERO.</strong></li>
      </ul>
    </div>

    <!-- Trigger 2: Customer In-App -->
    <div class="card card-highlight" style="border-top: 3px solid #16a34a;">
      <div style="font-size: 16pt;">📱</div>
      <strong style="color: #15803d; font-size: 8.5pt;">Trigger 2: Customer Taps "Check Status" in App</strong>
      <p style="font-size: 7.5pt; margin-top: 3px;">
        <strong>When:</strong> The student is looking at their phone and sees their screen stuck on "Payment Pending".
      </p>
      <ul style="font-size: 7.2pt; padding-left: 10px;">
        <li>Customer taps <strong>"Check Payment Status"</strong>.</li>
        <li>Backend queries Paytm live. If payment succeeded but order window expired, the backend <strong>initiates the refund on the spot</strong>.</li>
        <li>Student's screen instantly displays: <em>"100% Refund Initiated (Ref: refund-482)"</em>.</li>
      </ul>
    </div>

    <!-- Trigger 3: Store Manager Tablet -->
    <div class="card card-warning" style="border-top: 3px solid #eab308;">
      <div style="font-size: 16pt;">🏪</div>
      <strong style="color: #b45309; font-size: 8.5pt;">Trigger 3: Store Manager One-Click Refund</strong>
      <p style="font-size: 7.5pt; margin-top: 3px;">
        <strong>When:</strong> Student shows their bank SMS at the counter saying money was debited without a token.
      </p>
      <ul style="font-size: 7.2pt; padding-left: 10px;">
        <li>Manager opens the <strong>"Payments Needing Attention"</strong> screen (<code class="inline">/admin/payments/attention</code>).</li>
        <li>Manager sees the transaction with order unplaced.</li>
        <li>Manager taps <strong>"Cancel &amp; Refund"</strong>. Backend calls Paytm Refund API immediately.</li>
      </ul>
    </div>
  </div>

  <h2 class="section-heading">Where Does the Money Go &amp; Settlement Speed?</h2>
  <table class="simple-table">
    <thead>
      <tr>
        <th style="width: 25%;">Customer Payment Source</th>
        <th style="width: 45%;">Where the Money Returns</th>
        <th style="width: 30%;">Turnaround Time</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>UPI (GPay / PhonePe / Paytm)</strong></td>
        <td>Directly credited back to the customer's <strong>original linked bank account</strong> via NPCI.</td>
        <td><span class="pill pill-green">Instant to a few hours</span></td>
      </tr>
      <tr>
        <td><strong>V Foods In-App Wallet</strong></td>
        <td>Directly re-credited to the customer's <strong>in-app wallet balance</strong>.</td>
        <td><span class="pill pill-blue">Instant (0 seconds)</span></td>
      </tr>
      <tr>
        <td><strong>Debit / Credit Card</strong></td>
        <td>Credited back to the card account through the card network (Visa / Mastercard / RuPay).</td>
        <td><span class="pill pill-amber">1 to 3 banking days</span></td>
      </tr>
      <tr>
        <td><strong>Netbanking</strong></td>
        <td>Credited back to customer's savings account via bank IMPS/NEFT reversal.</td>
        <td><span class="pill pill-amber">2 to 4 banking hours</span></td>
      </tr>
    </tbody>
  </table>

  <!-- Internal Backend Function -->
  <div class="card" style="border-left: 4px solid #0284c7;">
    <h2 class="section-heading" style="margin-top: 0;">Behind the Scenes: The V Foods Python Backend Function</h2>
    <p style="font-size: 7.5pt;">
      In <code class="inline">backend/main.py</code>, line 459, the backend executes:
      <br>
      <code class="inline">async def _paytm_initiate_refund(payment_id, amount, reason, order_id):</code>
    </p>
    <ul style="font-size: 7.2pt; margin-top: 2px;">
      <li>Generates a deterministic reference: <code class="inline">refId = f"refund-{payment_id}"</code>.</li>
      <li>Calculates HMAC-SHA256 signature using the secret merchant key.</li>
      <li>Transmits HTTP POST to <code class="inline">https://securegw.paytm.in/refund/apply</code>.</li>
      <li>Updates the PostgreSQL <code class="inline">refunds</code> table to record the gateway refund ID.</li>
    </ul>
  </div>

  <div class="page-footer">
    <span class="footer-bold">V FOODS &bull; PAYTM REFUND OPTIONS GUIDE</span>
    <span>Page 2 of 4</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 3 — OFFICIAL PAYTM DOCUMENTATION PROOF & API PAYLOAD          -->
<!-- =================================================================== -->
<div class="page" id="page-3">
  <div class="page-header">
    <span class="doc-badge">V FOODS &bull; PAYTM INTEGRATION GUIDE</span>
    <span class="page-topic">Page 3 — Official Documentation Evidence</span>
  </div>

  <h1 class="page-title">Official Paytm Documentation Proof &amp; API Fields</h1>
  <div class="page-subtitle">Visual proof from Paytm's official Developer Documentation portal</div>

  <!-- Real Screenshot: Refund API -->
  <div class="figure-box">
    <img src="__IMG_REFUND_API__" alt="Paytm Official Refund API Specification" style="max-height: 105px; object-fit: contain;">
    <div class="figure-caption">
      <strong>Figure 1: Paytm Official Refund API Specification (POST /refund/apply)</strong><br>
      Official Documentation URL: <a href="https://paytmpayments.com/docs/api/refund-api" target="_blank">https://paytmpayments.com/docs/api/refund-api</a><br>
      Shows the exact merchant initiation endpoint, required parameters, and response structure.
    </div>
  </div>

  <div class="columns-2">
    <!-- Left: Exact Payload Sent -->
    <div class="card">
      <h2 class="section-heading" style="margin-top: 0;">Exact JSON Sent to Paytm's Refund API</h2>
      <pre style="background: #0f172a; color: #f8fafc; padding: 5px; border-radius: 4px; font-size: 6.8pt; line-height: 1.25; overflow: hidden;">
{
  "head": {
    "clientId": "C11",
    "signature": "HMAC_SHA256_CHECKSUM..."
  },
  "body": {
    "mid": "YOUR_MERCHANT_ID",
    "txnType": "REFUND",
    "orderId": "order_abc123_169...",
    "txnId": "20261011111212800110168...",
    "refId": "refund-482",
    "refundAmount": "120.00"
  }
}
      </pre>
      <p style="font-size: 7.2pt; margin-top: 3px;">
        <strong>Purpose of Parameters:</strong><br>
        &bull; <code class="inline">txnId</code>: Points to the exact original payment.<br>
        &bull; <code class="inline">refId</code>: Unique refund identifier generated by V Foods.<br>
        &bull; <code class="inline">refundAmount</code>: Exact amount to return.
      </p>
    </div>

    <!-- Right: Screenshot of Refund Status API -->
    <div>
      <div class="figure-box">
        <img src="__IMG_REFUND_STATUS__" alt="Paytm Refund Status API" style="max-height: 90px; object-fit: contain;">
        <div class="figure-caption">
          <strong>Figure 2: Paytm Refund Status API (/v2/refund/status)</strong><br>
          Official Documentation: <a href="https://paytmpayments.com/docs/api/refund-status-api" target="_blank">paytmpayments.com/docs/api/refund-status-api</a><br>
          Used to query refund progress if gateway experiences banking delays.
        </div>
      </div>

      <div class="figure-box">
        <img src="__IMG_REFUND_WEBHOOK__" alt="Paytm Accept Refund Webhook" style="max-height: 60px; object-fit: contain;">
        <div class="figure-caption">
          <strong>Figure 3: Paytm S2S Refund Webhook</strong><br>
          Official Documentation: <a href="https://paytmpayments.com/docs/accept-refund-webhook" target="_blank">paytmpayments.com/docs/accept-refund-webhook</a><br>
          Paytm pushes async status when funds clear into the customer's bank.
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span class="footer-bold">V FOODS &bull; PAYTM REFUND OPTIONS GUIDE</span>
    <span>Page 3 of 4</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 4 — SAFETY GUARANTEES, IDEMPOTENCY & INVESTOR SUMMARY          -->
<!-- =================================================================== -->
<div class="page" id="page-4">
  <div class="page-header">
    <span class="doc-badge">V FOODS &bull; PAYTM INTEGRATION GUIDE</span>
    <span class="page-topic">Page 4 — Duplicate Prevention &amp; Investor Summary</span>
  </div>

  <h1 class="page-title">Safety Guarantees &amp; Executive Summary</h1>
  <div class="page-subtitle">How duplicate refunds are prevented and why this architecture guarantees zero financial loss</div>

  <!-- Preventing Double Refunds -->
  <div class="card card-highlight">
    <h2 class="section-heading" style="color: #15803d; margin-top: 2px;">What Prevents Duplicate / Double Refunds?</h2>
    <p>
      A common concern is: <em>"What if the student taps 'Check Status' 5 times, or both the automated system and the store manager click Refund?"</em>
    </p>
    <div class="columns-3" style="margin-top: 4px; font-size: 7.5pt;">
      <div style="background: #ffffff; padding: 5px; border-radius: 4px; border: 1px solid #bbf7d0;">
        <strong style="color: #15803d;">1. Deterministic Key:</strong><br>
        V Foods generates:
        <code class="inline">refId = refund-&lt;payment_id&gt;</code>.
        There is only one valid refund key per payment ID.
      </div>
      <div style="background: #ffffff; padding: 5px; border-radius: 4px; border: 1px solid #bbf7d0;">
        <strong style="color: #15803d;">2. Database Constraint:</strong><br>
        In PostgreSQL, <code class="inline">refunds.refund_ref</code> is marked <code class="inline">UNIQUE</code>. Inserting a duplicate key raises a constraint error.
      </div>
      <div style="background: #ffffff; padding: 5px; border-radius: 4px; border: 1px solid #bbf7d0;">
        <strong style="color: #15803d;">3. Paytm Gateway Lock:</strong><br>
        Paytm uses <code class="inline">refId</code> as an <strong>idempotency key</strong>. If Paytm sees the same <code class="inline">refId</code> again, it returns the existing status without debiting the merchant twice.
      </div>
    </div>
  </div>

  <h2 class="section-heading">Stakeholder Experience Matrix</h2>
  <table class="simple-table">
    <thead>
      <tr>
        <th style="width: 25%;">Stakeholder</th>
        <th style="width: 40%;">What They Experience When an Order Fails</th>
        <th style="width: 35%;">Why It Builds Trust</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>The Customer (Student)</strong></td>
        <td>Screen shows clear status: <em>"Order unplaced. 100% refund of ₹120 initiated to UPI (Ref: refund-482)"</em>.</td>
        <td>No panic, no yelling at cashiers, instant digital proof in the app.</td>
      </tr>
      <tr>
        <td><strong>The Store Manager (Cashier)</strong></td>
        <td>Admin Tablet highlights unplaced orders under "Payments Needing Attention". One tap cancels &amp; refunds.</td>
        <td>No manual cash payouts, no passbook reconciliation headaches, no lost food.</td>
      </tr>
      <tr>
        <td><strong>The Investor / Owner</strong></td>
        <td>Zero financial leakage. All reversals happen through regulated Paytm banking APIs with auditable logs.</td>
        <td>Scalable campus operations without human error or employee fraud.</td>
      </tr>
    </tbody>
  </table>

  <!-- Final Conclusion Box -->
  <div class="card card-primary" style="margin-top: 4px; padding: 7px 10px;">
    <strong style="color: #0369a1; font-size: 9pt;">Final Conclusion:</strong>
    <p style="margin-top: 2px; font-size: 8pt;">
      When payment is debited but an order is not placed, V Foods uses <strong>Paytm’s official automated Refund API (<code class="inline">/refund/apply</code>)</strong>. Whether triggered by the <strong>automatic background worker</strong>, the <strong>customer’s in-app status check</strong>, or the <strong>store manager’s counter tablet</strong>, 100% of the money is returned safely to the customer’s original source account with zero manual bank transfers required.
    </p>
  </div>

  <div class="page-footer">
    <span class="footer-bold">V FOODS &bull; PAYTM REFUND OPTIONS GUIDE</span>
    <span>Page 4 of 4</span>
  </div>
</div>

</body>
</html>
"""
    # Replace image placeholders
    final_html = raw_html.replace("__IMG_REFUND_API__", img_refund_api)
    final_html = final_html.replace("__IMG_REFUND_STATUS__", img_refund_status)
    final_html = final_html.replace("__IMG_REFUND_WEBHOOK__", img_refund_webhook)

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
