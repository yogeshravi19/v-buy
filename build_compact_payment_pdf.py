"""
Build Compact Technical PDF for Paytm Payment Architecture in V Foods.
Enforces strict 7-page budget with high density, professional styling,
clear classification tags, and real official Paytm screenshots.
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
VFOODS_ASSETS = os.path.join(ASSETS_DIR, "vfoods")
OUTPUT_HTML = os.path.join(DOCS_DIR, "PAYTM_PAYMENT_BACKEND_ARCHITECTURE.html")
OUTPUT_PDF = os.path.join(DOCS_DIR, "PAYTM_PAYMENT_BACKEND_ARCHITECTURE.pdf")

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
        max_width=850
    )
    img_txn_status = get_base64_img(
        os.path.join(PAYTM_ASSETS, "fig03_transaction_status_api.png"),
        crop_box=(150, 80, 1150, 700),
        max_width=850
    )
    img_checksum = get_base64_img(
        os.path.join(PAYTM_ASSETS, "fig04_checksum_intro.png"),
        crop_box=(150, 80, 1150, 680),
        max_width=850
    )
    img_refund = get_base64_img(
        os.path.join(PAYTM_ASSETS, "fig06_refund_api.png"),
        crop_box=(150, 80, 1150, 700),
        max_width=850
    )
    img_refund_webhook = get_base64_img(
        os.path.join(PAYTM_ASSETS, "fig08_accept_refund_webhook.png"),
        crop_box=(150, 80, 1150, 680),
        max_width=850
    )

    print("Building HTML content...")
    raw_html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>V Foods — Payment Backend Architecture & Paytm Integration</title>
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
    font-size: 8.3pt;
    line-height: 1.35;
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

  /* Top Running Header */
  .page-header {
    border-bottom: 2px solid #0284c7;
    padding-bottom: 3px;
    margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .page-header .doc-title {
    font-size: 7.2pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #0369a1;
  }
  .page-header .page-topic {
    font-size: 7.2pt;
    font-weight: 600;
    color: #64748b;
  }

  /* Bottom Running Footer */
  .page-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 1px solid #cbd5e1;
    padding-top: 2px;
    display: flex;
    justify-content: space-between;
    font-size: 6.8pt;
    color: #64748b;
  }
  .page-footer .confidential {
    font-weight: 600;
    color: #0369a1;
  }

  /* Headings */
  h1.page-title {
    font-size: 13pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
    margin-bottom: 2px;
    letter-spacing: -0.01em;
  }
  .page-subtitle {
    font-size: 7.8pt;
    color: #475569;
    margin-bottom: 5px;
  }
  h2.section-heading {
    font-size: 9.0pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 4px;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 5px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2px;
  }
  h3.subheading {
    font-size: 8.2pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 3px;
    margin-bottom: 2px;
  }

  /* Tag labels */
  .tag {
    display: inline-block;
    font-size: 5.8pt;
    font-weight: 700;
    text-transform: uppercase;
    padding: 1px 4px;
    border-radius: 3px;
    letter-spacing: 0.04em;
    vertical-align: middle;
  }
  .tag-actual { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
  .tag-paytm { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .tag-rec { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .tag-missing { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

  /* Cards / Boxes */
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 4px 6px;
    margin-bottom: 4px;
  }
  .card-highlight {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }
  .card-alert {
    background: #fff7ed;
    border-color: #fed7aa;
  }
  .card-danger {
    background: #fef2f2;
    border-color: #fecaca;
  }

  /* Architecture Diagrams / Flowcharts */
  .diagram-container {
    background: #0f172a;
    color: #f8fafc;
    border-radius: 4px;
    padding: 5px 7px;
    margin-bottom: 5px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 6.8pt;
    line-height: 1.25;
  }
  .diagram-box {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 3px;
    padding: 3px 5px;
    margin: 2px 0;
    display: inline-block;
  }
  .diagram-arrow {
    color: #38bdf8;
    font-weight: bold;
    text-align: center;
    margin: 1px 0;
  }

  /* Tables */
  table.compact-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.1pt;
    margin-bottom: 4px;
  }
  table.compact-table th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 2.5px 4px;
    border: 1px solid #334155;
  }
  table.compact-table td {
    padding: 2px 4px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }
  table.compact-table tr:nth-child(even) {
    background: #f8fafc;
  }
  table.compact-table code {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 6.7pt;
    background: #f1f5f9;
    padding: 1px 2px;
    border-radius: 2px;
    color: #0369a1;
  }

  /* Column Layouts */
  .columns-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
    margin-bottom: 4px;
  }
  .columns-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4px;
    margin-bottom: 4px;
  }

  ul, ol {
    padding-left: 11px;
    margin-bottom: 3px;
  }
  li {
    margin-bottom: 1.5px;
  }

  code.inline {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 7.1pt;
    background: #f1f5f9;
    padding: 1px 3px;
    border-radius: 2px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
  }

  /* Image Figure Box */
  .figure-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 3px;
    text-align: center;
  }
  .figure-card img {
    max-width: 100%;
    height: auto;
    border-radius: 2px;
    border: 1px solid #e2e8f0;
  }
  .figure-caption {
    font-size: 6.3pt;
    color: #475569;
    margin-top: 2px;
    line-height: 1.15;
    text-align: left;
  }
  .figure-caption a {
    color: #0284c7;
    text-decoration: underline;
  }
</style>
</head>
<body>

<!-- =================================================================== -->
<!-- PAGE 1 — COMPLETE PAYMENT ARCHITECTURE                              -->
<!-- =================================================================== -->
<div class="page" id="page-1">
  <div class="page-header">
    <span class="doc-title">V Foods &bull; Technical Architecture Whitepaper</span>
    <span class="page-topic">Page 1 — Complete Payment Architecture</span>
  </div>

  <h1 class="page-title">Page 1 — Complete Payment Architecture</h1>
  <div class="page-subtitle">End-to-End Payment Processing Pipeline, Gateway Orchestration &amp; State Transitions</div>

  <!-- High-Level Flow Diagram -->
  <div class="diagram-container">
    <div style="text-align: center; font-weight: bold; color: #38bdf8; margin-bottom: 2px;">
      SYSTEM ARCHITECTURE &amp; TRANSACTION LIFECYCLE FLOW
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; text-align: center;">
      <div class="diagram-box" style="flex: 1;">
        <strong style="color: #67e8f9;">User / Frontend</strong><br>
        React + Vite PWA<br>
        <span style="color: #94a3b8; font-size: 5.8pt;">Initiates Checkout</span>
      </div>
      <div style="color: #38bdf8; font-weight: bold; padding: 0 3px;">&rarr;</div>
      <div class="diagram-box" style="flex: 1.2;">
        <strong style="color: #67e8f9;">FastAPI Backend</strong><br>
        <code>POST /order/checkout/paytm-session</code><br>
        <span style="color: #94a3b8; font-size: 5.8pt;">Snapshots Order + Signs HMAC</span>
      </div>
      <div style="color: #38bdf8; font-weight: bold; padding: 0 3px;">&rarr;</div>
      <div class="diagram-box" style="flex: 1.2;">
        <strong style="color: #67e8f9;">Paytm Payment API</strong><br>
        <code>/theia/api/v1/initiateTransaction</code><br>
        <span style="color: #94a3b8; font-size: 5.8pt;">Creates Txn Session + Returns Token</span>
      </div>
      <div style="color: #38bdf8; font-weight: bold; padding: 0 3px;">&rarr;</div>
      <div class="diagram-box" style="flex: 1.1;">
        <strong style="color: #fde047;">Paytm Core Gateway</strong><br>
        UPI / Netbanking / Cards<br>
        <span style="color: #94a3b8; font-size: 5.8pt;">Acquires &amp; Clears Funds</span>
      </div>
    </div>

    <div style="text-align: center; color: #38bdf8; font-weight: bold; margin: 1px 0;">
      &darr; Payment Status Determined (TXN_SUCCESS / TXN_FAILURE) &darr;
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; text-align: center;">
      <div class="diagram-box" style="flex: 1.2;">
        <strong style="color: #f472b6;">Paytm Webhook / Callback</strong><br>
        S2S HTTPS <code>POST /webhooks/paytm</code><br>
        <span style="color: #94a3b8; font-size: 5.8pt;">Signed Payload + Checksum</span>
      </div>
      <div style="color: #38bdf8; font-weight: bold; padding: 0 3px;">&rarr;</div>
      <div class="diagram-box" style="flex: 1.2;">
        <strong style="color: #67e8f9;">V Foods FastAPI Backend</strong><br>
        Verify HMAC &amp; Auth<br>
        <span style="color: #94a3b8; font-size: 5.8pt;">Invokes PostgreSQL Procedure</span>
      </div>
      <div style="color: #38bdf8; font-weight: bold; padding: 0 3px;">&rarr;</div>
      <div class="diagram-box" style="flex: 1.3;">
        <strong style="color: #4ade80;">PostgreSQL / Supabase</strong><br>
        <code>verify_and_record_payment()</code><br>
        <span style="color: #94a3b8; font-size: 5.8pt;">Atomic Stock Locks + Idempotency</span>
      </div>
      <div style="color: #38bdf8; font-weight: bold; padding: 0 3px;">&rarr;</div>
      <div class="diagram-box" style="flex: 1.1;">
        <strong style="color: #4ade80;">Order Confirmed</strong><br>
        KDS Dispatch &amp; Live Token<br>
        <span style="color: #94a3b8; font-size: 5.8pt;">Real-time Socket Broadcast</span>
      </div>
    </div>
  </div>

  <div class="columns-2">
    <!-- Left Column: Core Flow Mechanics -->
    <div class="card">
      <h2 class="section-heading">1. Where Payment Starts &amp; Intake API <span class="tag tag-actual">Actual Implementation</span></h2>
      <p>
        Payment starts when a customer selects food items and taps <strong>"Pay via Paytm"</strong> in the client application.
        The frontend issues an authenticated HTTP POST request to:
      </p>
      <p style="margin: 2px 0;">
        <code class="inline">POST /order/checkout/paytm-session</code>
      </p>
      <ul>
        <li><strong>Validation:</strong> Backend validates authenticated user (<code class="inline">user_id</code>), outlet active state, operating hours, and cart item availability.</li>
        <li><strong>Pessimistic Order Snapshot:</strong> Inserts a row into <code class="inline">orders</code> with status <code class="inline">awaiting_payment</code> and inserts line items into <code class="inline">order_items</code>.</li>
        <li><strong>Payment Record Initialization:</strong> Inserts a corresponding row into <code class="inline">payments</code> with status <code class="inline">PENDING</code>, linking <code class="inline">order_id</code> and <code class="inline">amount</code>.</li>
      </ul>

      <h2 class="section-heading">2. Communicating with Paytm &amp; Token Return <span class="tag tag-paytm">Paytm Official</span></h2>
      <p>
        The backend acts as the secure mediator to avoid exposing credentials:
      </p>
      <ul>
        <li><strong>Payload Generation:</strong> Prepares order payload containing Merchant ID (<code class="inline">PAYTM_MID</code>), unique <code class="inline">orderId</code>, transaction amount, and callback URL.</li>
        <li><strong>Cryptographic Signing:</strong> Calculates HMAC-SHA256 signature using the secret <code class="inline">PAYTM_MERCHANT_KEY</code>.</li>
        <li><strong>Paytm Response:</strong> Paytm returns a transaction token (<code class="inline">txnToken</code>). The backend forwards this token, <code class="inline">orderId</code>, and <code class="inline">amount</code> to the client to initialize Paytm Checkout JS / Custom UI.</li>
      </ul>
    </div>

    <!-- Right Column: Status & Confirmation Mechanics -->
    <div class="card">
      <h2 class="section-heading">3. Gateway Communication Back &amp; Verification <span class="tag tag-actual">Actual Implementation</span></h2>
      <p>
        When payment completes or terminates at Paytm:
      </p>
      <ul>
        <li><strong>Primary Channel (Webhook):</strong> Paytm sends an asynchronous HTTPS POST request directly to <code class="inline">POST /webhooks/paytm</code>. This server-to-server (S2S) notification contains the gateway reference (<code class="inline">TXNID</code>), status (<code class="inline">STATUS: TXN_SUCCESS</code>), and response signature.</li>
        <li><strong>Checksum Verification:</strong> FastAPI executes <code class="inline">_paytm_verify_checksum()</code> to prevent payload spoofing before processing.</li>
        <li><strong>Fallback Polling:</strong> If the webhook is delayed or dropped, the client or background reconciliation queries <code class="inline">POST /admin/payments/reconcile</code> calling Paytm's <code class="inline">/v3/order/status</code> API.</li>
      </ul>

      <h2 class="section-heading">4. State Persistence &amp; Order Confirmation <span class="tag tag-actual">Actual Implementation</span></h2>
      <p>
        Final authority resides in the database, never the client:
      </p>
      <ul>
        <li><strong>Atomic Stored Procedure:</strong> Backend calls PostgreSQL procedure <code class="inline">verify_and_record_payment()</code>.</li>
        <li><strong>Storage:</strong> Status is recorded in <code class="inline">payments.status</code> (<code class="inline">SUCCESS</code>), recording <code class="inline">paytm_txn_id</code> and <code class="inline">paid_at = NOW()</code>.</li>
        <li><strong>Stock Decrement:</strong> Acquired row locks (<code class="inline">FOR UPDATE</code>) decrement item stock atomically.</li>
        <li><strong>Order Confirmation:</strong> Order status transitions from <code class="inline">awaiting_payment</code> to <code class="inline">confirmed</code>, generating the kitchen token for KDS tracking.</li>
      </ul>
    </div>
  </div>

  <div class="card card-highlight">
    <h3 class="subheading" style="color: #166534;">Architectural Principles &amp; Guarantees</h3>
    <div class="columns-3" style="margin-bottom: 0;">
      <div>
        <strong>Zero Client Trust:</strong> The client application is strictly treated as an untrusted presentation layer. Only cryptographically verified S2S webhooks or direct backend-to-Paytm queries can confirm payments.
      </div>
      <div>
        <strong>Strict Idempotency:</strong> Handled at database level via unique constraints on <code class="inline">paytm_txn_id</code>. Repeated webhook dispatches exit cleanly without duplicate order generation.
      </div>
      <div>
        <strong>Automatic Remediation:</strong> If payment succeeds but stock has depleted or outlet is closed, the system initiates an automated refund via Paytm Refund API.
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span class="confidential">CONFIDENTIAL &bull; V FOODS ENGINEERING ARCHITECTURE</span>
    <span>Page 1 of 7</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 2 — HOW PAYTM CONNECTS TO THE BACKEND                         -->
<!-- =================================================================== -->
<div class="page" id="page-2">
  <div class="page-header">
    <span class="doc-title">V Foods &bull; Technical Architecture Whitepaper</span>
    <span class="page-topic">Page 2 — Gateway Connectivity &amp; API Handshake</span>
  </div>

  <h1 class="page-title">Page 2 — How Paytm Connects to the Backend</h1>
  <div class="page-subtitle">Server-to-Server Protocols, Cryptographic Signatures &amp; Entity Correlation</div>

  <div class="card" style="margin-bottom: 4px;">
    <h2 class="section-heading">1. API-Level Handshake &amp; Communication Flow <span class="tag tag-actual">Actual Implementation</span></h2>
    <div style="display: flex; gap: 5px; font-size: 7pt; align-items: center;">
      <div style="flex: 1; background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 4px; border-radius: 3px;">
        <strong>Step 1: Frontend Request</strong><br>
        Client calls <code class="inline">POST /order/checkout/paytm-session</code> passing <code class="inline">outlet_id</code>, items array, and delivery metadata.
      </div>
      <div style="color: #0284c7; font-weight: bold;">&rarr;</div>
      <div style="flex: 1.2; background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 4px; border-radius: 3px;">
        <strong>Step 2: Backend &rarr; Paytm</strong><br>
        FastAPI constructs parameters, formats <code class="inline">paytm_order_id</code>, signs with HMAC-SHA256, and calls Paytm Initiate API.
      </div>
      <div style="color: #0284c7; font-weight: bold;">&rarr;</div>
      <div style="flex: 1.1; background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 4px; border-radius: 3px;">
        <strong>Step 3: Paytm Token Return</strong><br>
        Paytm validates signature &amp; returns <code class="inline">txnToken</code>. Backend returns token &amp; MID to frontend for checkout rendering.
      </div>
      <div style="color: #0284c7; font-weight: bold;">&rarr;</div>
      <div style="flex: 1.1; background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 4px; border-radius: 3px;">
        <strong>Step 4: Customer Payment</strong><br>
        Customer completes auth at Paytm. Paytm dispatches S2S webhook to <code class="inline">/webhooks/paytm</code>.
      </div>
    </div>
  </div>

  <div class="columns-2">
    <div class="card">
      <h2 class="section-heading">2. Payload Details &amp; Gateway Endpoints <span class="tag tag-paytm">Paytm Official</span></h2>
      <p><strong>Paytm Host URLs:</strong></p>
      <ul>
        <li><strong>Staging / Test:</strong> <code class="inline">https://securegw-stage.paytm.in</code></li>
        <li><strong>Production:</strong> <code class="inline">https://securegw.paytm.in</code></li>
      </ul>
      <p style="margin-top: 2px;"><strong>Initiate Transaction Endpoint:</strong></p>
      <p><code class="inline">POST /theia/api/v1/initiateTransaction?mid={mid}&amp;orderId={orderId}</code></p>
      <p style="margin-top: 2px;"><strong>Critical Body Parameters Transmitted:</strong></p>
      <ul>
        <li><code class="inline">mid</code>: Merchant Identifier provisioned in Paytm Dashboard.</li>
        <li><code class="inline">orderId</code>: Unique transaction tracking string generated by V Foods.</li>
        <li><code class="inline">txnAmount.value</code> &amp; <code class="inline">currency</code>: Stringified amount (e.g., <code class="inline">"250.00"</code>) and <code class="inline">"INR"</code>.</li>
        <li><code class="inline">userInfo.custId</code>: Unique customer identifier (<code class="inline">user_id</code>).</li>
        <li><code class="inline">callbackUrl</code>: Backend webhook target (<code class="inline">https://api.vfoods.in/webhooks/paytm</code>).</li>
      </ul>
    </div>

    <div class="card">
      <h2 class="section-heading">3. Security, Authentication &amp; Correlation <span class="tag tag-actual">Actual Implementation</span></h2>
      <p><strong>Cryptographic Signing (HMAC-SHA256):</strong></p>
      <ul>
        <li>The backend utilizes <code class="inline">_paytm_generate_checksum()</code> to sign the JSON body string using the secret <code class="inline">PAYTM_MERCHANT_KEY</code>.</li>
        <li>Signature is transmitted in the HTTP payload header under <code class="inline">head.signature</code>.</li>
        <li><strong>Credential Isolation:</strong> The secret key resides strictly in server environment variables (<code class="inline">PAYTM_MERCHANT_KEY</code>). It is never sent to the browser or embedded in client code.</li>
      </ul>
      <p style="margin-top: 2px;"><strong>Local Order Correlation:</strong></p>
      <ul>
        <li>When a checkout session is initiated, <code class="inline">paytm_order_id</code> is deterministically linked to local <code class="inline">orders.id</code> via the <code class="inline">payments</code> record.</li>
        <li>When Paytm dispatches a webhook or status response, the backend reads <code class="inline">ORDERID</code>, fetches the row from <code class="inline">payments WHERE paytm_order_id = ORDERID</code>, and resolves the parent <code class="inline">order_id</code>.</li>
      </ul>
    </div>
  </div>

  <h2 class="section-heading">4. Transaction Identifier &amp; Entity Correlation Matrix</h2>
  <table class="compact-table">
    <thead>
      <tr>
        <th style="width: 22%;">Field Name</th>
        <th style="width: 32%;">Purpose &amp; Description</th>
        <th style="width: 20%;">Generated By</th>
        <th style="width: 26%;">Stored In Database</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Application Order ID</strong></td>
        <td>Primary UUID identifying the customer food order</td>
        <td>V Foods Backend (FastAPI)</td>
        <td><code>orders.id</code>, <code>payments.order_id</code>, <code>refunds.order_id</code></td>
      </tr>
      <tr>
        <td><strong>Paytm Order ID</strong></td>
        <td>Gateway-facing order reference (e.g. <code>order_abc123_169...</code>)</td>
        <td>V Foods Backend</td>
        <td><code>payments.paytm_order_id</code></td>
      </tr>
      <tr>
        <td><strong>Paytm Transaction ID</strong></td>
        <td>Unique financial transaction reference assigned by Paytm acquirer</td>
        <td>Paytm Gateway Engine</td>
        <td><code>payments.paytm_txn_id</code> (UNIQUE)</td>
      </tr>
      <tr>
        <td><strong>Payment Amount</strong></td>
        <td>Authorized transaction amount in INR (two decimal digits)</td>
        <td>Frontend Cart / Pricing Engine</td>
        <td><code>orders.total</code>, <code>payments.amount</code></td>
      </tr>
      <tr>
        <td><strong>Payment Status</strong></td>
        <td>Financial state (<code>PENDING</code>, <code>SUCCESS</code>, <code>FAILED</code>, <code>REFUNDED</code>)</td>
        <td>Paytm / DB Stored Proc</td>
        <td><code>payments.status</code>, <code>orders.status</code></td>
      </tr>
      <tr>
        <td><strong>Refund Reference</strong></td>
        <td>Deterministic refund idempotency key (<code>refund-&lt;payment_id&gt;</code>)</td>
        <td>V Foods Backend</td>
        <td><code>refunds.refund_ref</code> (UNIQUE)</td>
      </tr>
      <tr>
        <td><strong>Paytm Refund ID</strong></td>
        <td>Acquirer reference generated for the refund transaction</td>
        <td>Paytm Refund Engine</td>
        <td><code>refunds.paytm_refund_id</code></td>
      </tr>
    </tbody>
  </table>

  <div class="card card-alert">
    <strong>Security Audit Note:</strong> In strict compliance with PCI-DSS and RBI digital payment guidelines, no cardholder PAN, CVV, OTP, or merchant API secrets are stored in V Foods databases or logs. All payment authorization occurs on Paytm's regulated infrastructure.
  </div>

  <div class="page-footer">
    <span class="confidential">CONFIDENTIAL &bull; V FOODS ENGINEERING ARCHITECTURE</span>
    <span>Page 2 of 7</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 3 — PAYMENT STATUS + WEBHOOK + TRANSACTION STATUS             -->
<!-- =================================================================== -->
<div class="page" id="page-3">
  <div class="page-header">
    <span class="doc-title">V Foods &bull; Technical Architecture Whitepaper</span>
    <span class="page-topic">Page 3 — Status Lifecycle &amp; Webhook Idempotency</span>
  </div>

  <h1 class="page-title">Page 3 — Payment Status, Webhooks &amp; Status APIs</h1>
  <div class="page-subtitle">Multi-Channel Status Verification, Server-to-Server Webhooks &amp; Active Recovery</div>

  <div class="columns-2">
    <div class="card">
      <h2 class="section-heading">1. Status Communication Channels Compared <span class="tag tag-paytm">Paytm Official</span></h2>
      <ol>
        <li>
          <strong>Frontend Payment Response (Client-side):</strong>
          User interface callback fired via JavaScript SDK upon redirect. <em>Inherently untrusted</em>. Subject to browser crashes, network drops, packet spoofing, and malicious tampering. Never used to confirm orders.
        </li>
        <li>
          <strong>Paytm Callback (Browser POST Redirect):</strong>
          Browser-redirected POST to <code class="inline">CALLBACK_URL</code>. Can fail if the user closes their mobile browser or switches apps before the redirect cycle completes.
        </li>
        <li>
          <strong>Paytm Webhook (Server-to-Server Asynchronous POST):</strong>
          Direct HTTPS POST from Paytm infrastructure to V Foods backend (<code class="inline">/webhooks/paytm</code>). <em>Authoritative channel</em>. Cryptographically signed, decoupled from client network health, and retried automatically by Paytm on network errors.
        </li>
        <li>
          <strong>Transaction Status API (Active Pull Mechanism):</strong>
          Outbound S2S query from FastAPI to Paytm's <code class="inline">/v3/order/status</code> endpoint. Used as active reconciliation when webhooks are delayed.
        </li>
      </ol>
    </div>

    <div class="card">
      <h2 class="section-heading">2. Why Backend Rejects Frontend Authority <span class="tag tag-rec">Best Practice</span></h2>
      <p>
        In production systems, clients are untrusted agents. Relying on frontend confirmations creates fatal attack vectors:
      </p>
      <ul>
        <li><strong>Man-in-the-Middle Spoofing:</strong> An attacker can intercept client responses and inject fake 200 OK success payloads.</li>
        <li><strong>Premature Browser Termination:</strong> If a customer closes the tab after bank debit but before the redirect fires, the order remains unpaid without S2S webhooks.</li>
        <li><strong>Dual Execution:</strong> Flaky mobile connections can re-trigger payment callbacks, leading to duplicate database records.</li>
      </ul>
      <p style="margin-top: 2px;">
        <strong>V Foods Enforcement:</strong> The frontend only updates UI to "Verifying Payment..." and polls the backend until the S2S webhook confirms the order.
      </p>
    </div>
  </div>

  <div class="columns-2">
    <!-- Webhook Pipeline -->
    <div class="card">
      <h2 class="section-heading">3. Webhook Pipeline Flowchart <span class="tag tag-actual">Actual Implementation</span></h2>
      <div class="diagram-container" style="font-size: 6.4pt; padding: 4px 6px;">
        <div style="color: #fde047; font-weight: bold;">[Paytm Gateway Engine]</div>
        <div class="diagram-arrow">&darr; Dispatches S2S POST with HMAC signature</div>
        <div class="diagram-box">FastAPI Endpoint: <code>POST /webhooks/paytm</code></div>
        <div class="diagram-arrow">&darr; Execute <code>_paytm_verify_checksum()</code></div>
        <div class="diagram-box">Fetch Payment Record via <code>paytm_order_id</code></div>
        <div class="diagram-arrow">&darr; Invoke Atomic Database Procedure</div>
        <div class="diagram-box"><code>verify_and_record_payment(paytm_txn_id, amount)</code></div>
        <div class="diagram-arrow">&darr; Row Locks Acquired + Stock Decremented</div>
        <div class="diagram-box" style="border-color: #22c55e; color: #4ade80;">Order Confirmed &bull; Token Generated &bull; Return 200 OK</div>
      </div>
    </div>

    <!-- Active Recovery Pipeline -->
    <div class="card">
      <h2 class="section-heading">4. Transaction Status API Recovery Path <span class="tag tag-actual">Actual Implementation</span></h2>
      <div class="diagram-container" style="font-size: 6.4pt; padding: 4px 6px;">
        <div style="color: #f87171; font-weight: bold;">[Payment State Uncertain: PENDING &gt; 2 mins]</div>
        <div class="diagram-arrow">&darr; User Poll OR Background Reconcile Cron</div>
        <div class="diagram-box">FastAPI: <code>POST /admin/payments/reconcile</code></div>
        <div class="diagram-arrow">&darr; S2S Query: <code>/v3/order/status</code></div>
        <div class="diagram-box">Paytm Returns Gateway Truth (<code>TXN_SUCCESS / FAILED</code>)</div>
        <div class="diagram-arrow">&darr; Evaluate Order Window &amp; Inventory</div>
        <div class="diagram-box" style="border-color: #38bdf8;">
          If Valid: Confirm Order via <code>verify_and_record_payment()</code><br>
          If Expired/Out of Stock: Initiate Auto-Refund via <code>/refund/apply</code>
        </div>
      </div>
    </div>
  </div>

  <div class="card card-highlight">
    <h2 class="section-heading" style="color: #166534;">5. Webhook Idempotency Guarantees <span class="tag tag-actual">Actual Implementation</span></h2>
    <p>
      Paytm guarantees "at least once" webhook delivery. Under network congestion, Paytm will retry the identical webhook payload up to 5 times. The V Foods backend enforces strict idempotency at the database engine level via PostgreSQL:
    </p>
    <div class="columns-3" style="margin-top: 2px; font-size: 7.1pt;">
      <div>
        <strong>1. Unique Transaction Key:</strong>
        <code class="inline">payments.paytm_txn_id</code> is constrained with a <code class="inline">UNIQUE</code> index. Attempting to insert a duplicate gateway transaction ID raises a constraint violation.
      </div>
      <div>
        <strong>2. Stored Procedure Guard:</strong>
        In <code class="inline">verify_and_record_payment()</code>, the procedure first inspects <code class="inline">payments.status</code>. If already <code class="inline">SUCCESS</code>, it exits immediately and returns existing status.
      </div>
      <div>
        <strong>3. Stock &amp; Order Protection:</strong>
        Because the procedure exits early on duplicates, stock decrement logic and order confirmation events execute <em>strictly once</em>. Duplicate webhooks cannot double-decrement stock or re-credit wallets.
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span class="confidential">CONFIDENTIAL &bull; V FOODS ENGINEERING ARCHITECTURE</span>
    <span>Page 3 of 7</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 4 — PAYMENT DATABASE STRUCTURE                                -->
<!-- =================================================================== -->
<div class="page" id="page-4">
  <div class="page-header">
    <span class="doc-title">V Foods &bull; Technical Architecture Whitepaper</span>
    <span class="page-topic">Page 4 — Payment Relational Database Schema</span>
  </div>

  <h1 class="page-title">Page 4 — Payment Database Structure</h1>
  <div class="page-subtitle">PostgreSQL Relational Schema, Audit Ledgers, Inventory Locking &amp; ER Topology</div>

  <!-- ER Topology Diagram -->
  <div class="diagram-container" style="padding: 4px 8px; margin-bottom: 4px;">
    <div style="text-align: center; font-weight: bold; color: #38bdf8; margin-bottom: 2px;">
      PAYMENT RELATIONAL ENTITY RELATIONSHIPS &amp; FOREIGN KEY GRAPH
    </div>
    <div style="display: flex; justify-content: space-around; font-size: 6.8pt; text-align: center;">
      <div class="diagram-box">
        <strong>auth.users / profiles</strong><br>
        PK: <code>id</code> (UUID)
      </div>
      <div style="color: #38bdf8; align-self: center;">&larr; 1:N &rarr;</div>
      <div class="diagram-box">
        <strong>orders</strong><br>
        PK: <code>id</code> (UUID)<br>
        FK: <code>user_id</code>, <code>payment_id</code>
      </div>
      <div style="color: #38bdf8; align-self: center;">&larr; 1:1 &rarr;</div>
      <div class="diagram-box">
        <strong>payments</strong><br>
        PK: <code>id</code> (UUID)<br>
        FK: <code>order_id</code>, <code>user_id</code>
      </div>
      <div style="color: #38bdf8; align-self: center;">&larr; 1:0..1 &rarr;</div>
      <div class="diagram-box">
        <strong>refunds</strong><br>
        PK: <code>id</code> (UUID)<br>
        FK: <code>payment_id</code>, <code>order_id</code>
      </div>
    </div>
    <div style="display: flex; justify-content: center; gap: 40px; margin-top: 2px; font-size: 6.5pt;">
      <div>&darr; 1:N</div>
      <div style="visibility: hidden;">spacer</div>
      <div>&darr; 1:N</div>
    </div>
    <div style="display: flex; justify-content: space-around; font-size: 6.8pt; text-align: center;">
      <div class="diagram-box" style="margin-left: 120px;">
        <strong>order_items</strong> (Snapshot)<br>
        PK: <code>id</code> | FK: <code>order_id</code>, <code>item_id</code>
      </div>
      <div style="color: #38bdf8; align-self: center;">&rarr; N:1 &rarr;</div>
      <div class="diagram-box">
        <strong>menu_items</strong> (Inventory)<br>
        PK: <code>id</code> (<code>stock_qty</code> locked <code>FOR UPDATE</code>)
      </div>
      <div class="diagram-box" style="margin-right: 40px;">
        <strong>wallets &amp; wallet_txns</strong><br>
        Stored-value ledger &bull; Unique <code>ref</code>
      </div>
    </div>
  </div>

  <div class="columns-2">
    <!-- Left Table: Payments & Orders -->
    <div>
      <div class="card" style="margin-bottom: 3px;">
        <h3 class="subheading" style="color: #0284c7;">Table: payments <span class="tag tag-actual">Actual Implementation</span></h3>
        <p style="font-size: 6.8pt; margin-bottom: 2px;">Primary ledger for all inbound payments (Paytm gateway, split payments, and wallet top-ups).</p>
        <table class="compact-table" style="font-size: 6.7pt;">
          <tr><th>Column</th><th>Type</th><th>Constraint / Notes</th></tr>
          <tr><td><code>id</code></td><td>UUID</td><td>PRIMARY KEY (Default <code>gen_random_uuid()</code>)</td></tr>
          <tr><td><code>order_id</code></td><td>UUID</td><td>FOREIGN KEY &rarr; <code>orders.id</code> (Nullable for top-up)</td></tr>
          <tr><td><code>user_id</code></td><td>UUID</td><td>FOREIGN KEY &rarr; <code>profiles.id</code></td></tr>
          <tr><td><code>amount</code></td><td>NUMERIC(10,2)</td><td>Authorized monetary amount (&gt; 0)</td></tr>
          <tr><td><code>payment_purpose</code></td><td>TEXT</td><td><code>ORDER_PAYMENT</code>, <code>WALLET_TOPUP</code>, <code>SPLIT_PAYMENT</code></td></tr>
          <tr><td><code>status</code></td><td>TEXT</td><td><code>PENDING</code>, <code>SUCCESS</code>, <code>FAILED</code>, <code>REFUNDED</code></td></tr>
          <tr><td><code>paytm_order_id</code></td><td>TEXT</td><td>Gateway-facing order reference</td></tr>
          <tr><td><code>paytm_txn_id</code></td><td>TEXT</td><td><strong>UNIQUE</strong>: Gateway reference ID</td></tr>
          <tr><td><code>paid_at</code></td><td>TIMESTAMPTZ</td><td>Timestamp when verified by gateway</td></tr>
          <tr><td><code>failure_reason</code></td><td>TEXT</td><td>Gateway or inventory rejection code</td></tr>
        </table>
      </div>

      <div class="card">
        <h3 class="subheading" style="color: #0284c7;">Table: orders <span class="tag tag-actual">Actual Implementation</span></h3>
        <p style="font-size: 6.8pt; margin-bottom: 2px;">Customer food order entity linked to physical fulfillment.</p>
        <table class="compact-table" style="font-size: 6.7pt;">
          <tr><th>Column</th><th>Type</th><th>Constraint / Notes</th></tr>
          <tr><td><code>id</code></td><td>UUID</td><td>PRIMARY KEY</td></tr>
          <tr><td><code>payment_id</code></td><td>UUID</td><td>FOREIGN KEY &rarr; <code>payments.id</code></td></tr>
          <tr><td><code>status</code></td><td>TEXT</td><td><code>awaiting_payment</code>, <code>paid</code>, <code>confirmed</code>, <code>cancelled</code></td></tr>
          <tr><td><code>total</code></td><td>NUMERIC(10,2)</td><td>Gross order payable amount</td></tr>
          <tr><td><code>token</code></td><td>INTEGER</td><td>Daily sequential pickup number for KDS</td></tr>
          <tr><td><code>expires_at</code></td><td>TIMESTAMPTZ</td><td>Checkout window expiry (10-minute timeout)</td></tr>
        </table>
      </div>
    </div>

    <!-- Right Table: Refunds, Inventory, Wallets & Missing -->
    <div>
      <div class="card" style="margin-bottom: 3px;">
        <h3 class="subheading" style="color: #0284c7;">Table: refunds <span class="tag tag-actual">Actual Implementation</span></h3>
        <p style="font-size: 6.8pt; margin-bottom: 2px;">Tracks all automated and manual outbound refund transactions.</p>
        <table class="compact-table" style="font-size: 6.7pt;">
          <tr><th>Column</th><th>Type</th><th>Constraint / Notes</th></tr>
          <tr><td><code>id</code></td><td>UUID</td><td>PRIMARY KEY</td></tr>
          <tr><td><code>payment_id</code></td><td>UUID</td><td>FOREIGN KEY &rarr; <code>payments.id</code></td></tr>
          <tr><td><code>refund_ref</code></td><td>TEXT</td><td><strong>UNIQUE</strong>: Idempotency key (<code>refund-&lt;payment_id&gt;</code>)</td></tr>
          <tr><td><code>paytm_refund_id</code></td><td>TEXT</td><td>Gateway refund reference</td></tr>
          <tr><td><code>amount</code></td><td>NUMERIC(10,2)</td><td>Refunded amount in INR</td></tr>
          <tr><td><code>status</code></td><td>TEXT</td><td><code>PENDING</code>, <code>SUCCESS</code>, <code>FAILED</code></td></tr>
          <tr><td><code>failure_reason</code></td><td>TEXT</td><td>Gateway rejection diagnostic</td></tr>
        </table>
      </div>

      <div class="card" style="margin-bottom: 3px;">
        <h3 class="subheading" style="color: #0284c7;">Inventory &amp; Wallet Tables <span class="tag tag-actual">Actual Implementation</span></h3>
        <ul style="font-size: 6.8pt;">
          <li><code class="inline">menu_items</code>: Contains <code class="inline">stock_qty</code>, <code class="inline">reserved_qty</code>, <code class="inline">available</code>. Evaluated with <code class="inline">SELECT ... FOR UPDATE</code> during confirmation.</li>
          <li><code class="inline">wallets</code> &amp; <code class="inline">wallet_txns</code>: Stored-value ledger for wallet orders and refunds, enforcing atomic debit/credit via unique <code class="inline">ref</code>.</li>
        </ul>
      </div>

      <div class="card card-danger">
        <h3 class="subheading" style="color: #991b1b;">Audit Gaps &amp; Missing Tables <span class="tag tag-missing">Not Present</span></h3>
        <p style="font-size: 6.7pt;">The following recommended audit tables are verified as absent in the current schema:</p>
        <ul style="font-size: 6.7pt;">
          <li><code class="inline">webhook_events</code>: <strong>NOT PRESENT IN CURRENT IMPLEMENTATION</strong>. Raw incoming webhook headers and JSON payloads are currently processed in-memory without persistent raw audit storage.</li>
          <li><code class="inline">reconciliation_logs</code>: <strong>NOT PRESENT IN CURRENT IMPLEMENTATION</strong>. Cron execution run statistics are logged to stdout but not persisted to a dedicated relational audit table.</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span class="confidential">CONFIDENTIAL &bull; V FOODS ENGINEERING ARCHITECTURE</span>
    <span>Page 4 of 7</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 5 — PAYMENT SUCCESS, FAILURE AND REFUND                       -->
<!-- =================================================================== -->
<div class="page" id="page-5">
  <div class="page-header">
    <span class="doc-title">V Foods &bull; Technical Architecture Whitepaper</span>
    <span class="page-topic">Page 5 — Failure Recovery &amp; Automated Refunds</span>
  </div>

  <h1 class="page-title">Page 5 — Payment Success, Failure &amp; Refunds</h1>
  <div class="page-subtitle">Handling Uncertain Transaction States, Network Dropouts &amp; The Automated Refund Engine</div>

  <div class="card card-alert" style="margin-bottom: 4px;">
    <h2 class="section-heading" style="color: #9a3412;">1. The Primary Real-World Failure: "The Ghost Payment" <span class="tag tag-actual">Actual Implementation</span></h2>
    <div style="display: flex; gap: 6px; font-size: 7pt; align-items: center;">
      <div style="flex: 1; background: #ffffff; border: 1px solid #fed7aa; padding: 3px 4px; border-radius: 3px;">
        <strong>Phase 1: Money Debited</strong><br>
        Customer completes UPI/OTP. Paytm successfully debits ₹250 from customer bank.
      </div>
      <div style="color: #ea580c; font-weight: bold;">&rarr;</div>
      <div style="flex: 1; background: #ffffff; border: 1px solid #fed7aa; padding: 3px 4px; border-radius: 3px;">
        <strong>Phase 2: Transit Failure</strong><br>
        Mobile cellular drops, user closes browser tab, or AWS/V Foods restart drops incoming webhook.
      </div>
      <div style="color: #ea580c; font-weight: bold;">&rarr;</div>
      <div style="flex: 1.2; background: #ffffff; border: 1px solid #fed7aa; padding: 3px 4px; border-radius: 3px;">
        <strong>Phase 3: Uncertain State</strong><br>
        Paytm shows SUCCESS; V Foods database has payment marked <code>PENDING</code>. Customer sees no order confirmation.
      </div>
    </div>
  </div>

  <div class="columns-2">
    <!-- Left Column: Recovery Path -->
    <div class="card">
      <h2 class="section-heading">2. Two-Pronged Automated Recovery <span class="tag tag-actual">Actual Implementation</span></h2>
      <p>
        The system resolves ghost payments through two active recovery loops:
      </p>
      <ul>
        <li>
          <strong>Path A: Paytm Webhook Retry:</strong>
          Paytm’s S2S notification engine monitors HTTP responses. If V Foods returned a 500 error or was temporarily unreachable, Paytm automatically re-transmits the webhook at exponential backoff intervals.
        </li>
        <li>
          <strong>Path B: Active Reconciler &amp; User Poll:</strong>
          When customer views order tracker, frontend calls <code class="inline">POST /order/{id}/check-payment-status</code>. Simultaneously, background cron calls <code class="inline">POST /admin/payments/reconcile</code> querying Paytm's <code class="inline">/v3/order/status</code> API for any pending transaction older than 2 minutes.
        </li>
      </ul>
      <p style="margin-top: 2px;">
        <strong>Resolution Logic:</strong> Once Paytm returns <code class="inline">TXN_SUCCESS</code>, the backend inspects order validity. If the order is within the 10-minute window and stock is intact, the order is confirmed. If expired or unfulfillable, it triggers an automated refund.
      </p>
    </div>

    <!-- Right Column: Unfulfillable Refund Flow -->
    <div class="card">
      <h2 class="section-heading">3. The Unfulfillable Order Refund Engine <span class="tag tag-actual">Actual Implementation</span></h2>
      <p>
        When a customer pays successfully, but the order <em>cannot be fulfilled</em> (e.g., kitchen closed, order timeout exceeded, or item out of stock):
      </p>
      <div class="diagram-container" style="font-size: 6.1pt; padding: 3px 5px; margin: 2px 0;">
        <div style="color: #f87171; font-weight: bold;">[PAYMENT SUCCESS + CANNOT FULFILL]</div>
        <div class="diagram-arrow">&darr; Backend initiates automated refund</div>
        <div class="diagram-box">FastAPI invokes <code>_paytm_initiate_refund()</code></div>
        <div class="diagram-arrow">&darr; Calls Paytm Refund API: <code>POST /refund/apply</code></div>
        <div class="diagram-box">Record inserted into <code>refunds</code> with status <code>PENDING</code></div>
        <div class="diagram-arrow">&darr; Paytm validates and returns <code>ACCEPTED / TXN_ACCEPTED</code></div>
        <div class="diagram-box">Paytm initiates banking reversal (1–3 banking days)</div>
        <div class="diagram-arrow">&darr; Paytm S2S Refund Webhook: <code>POST /webhooks/paytm/refund</code></div>
        <div class="diagram-box" style="border-color: #22c55e; color: #4ade80;">Database updated to <code>SUCCESS</code> &bull; Customer notified</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2 class="section-heading">4. Asynchronous Refund Semantics: "Requested &ne; Completed" <span class="tag tag-paytm">Paytm Official</span></h2>
    <p>
      A common architectural flaw in naive payment integrations is treating a successful HTTP response from the Refund API as confirmation that the customer received money. In official Paytm payment gateway semantics:
    </p>
    <div class="columns-3" style="margin-top: 3px; font-size: 7.1pt;">
      <div class="card" style="background: #ffffff; margin-bottom: 0;">
        <strong style="color: #0369a1;">1. PENDING / ACCEPTED</strong><br>
        Paytm has accepted the refund request. Funds are queued for banking settlement. The merchant balance is reserved, but funds have <em>not yet arrived</em> in customer bank.
      </div>
      <div class="card" style="background: #ffffff; margin-bottom: 0;">
        <strong style="color: #166534;">2. TXN_SUCCESS / SUCCESS</strong><br>
        Banking partner/NPCI has successfully credited the customer account or source UPI handle. Confirmed via <strong>Refund Webhook</strong> or <strong>Refund Status API</strong>.
      </div>
      <div class="card" style="background: #ffffff; margin-bottom: 0;">
        <strong style="color: #991b1b;">3. TXN_FAILURE / FAILED</strong><br>
        The refund was rejected (e.g. beneficiary account frozen or invalid merchant balance). Requires manual intervention or secondary payout mechanism.
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span class="confidential">CONFIDENTIAL &bull; V FOODS ENGINEERING ARCHITECTURE</span>
    <span>Page 5 of 7</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 6 — REFUND + RECOVERY + CONCURRENCY                           -->
<!-- =================================================================== -->
<div class="page" id="page-6">
  <div class="page-header">
    <span class="doc-title">V Foods &bull; Technical Architecture Whitepaper</span>
    <span class="page-topic">Page 6 — Concurrency Safety &amp; Fault Resilience</span>
  </div>

  <h1 class="page-title">Page 6 — Refunds, Concurrency &amp; Fault Resilience</h1>
  <div class="page-subtitle">Deterministic Keys, Rush-Hour Stock Race Conditions &amp; Crash Recovery Across 5 Lifecycle Phases</div>

  <div class="columns-2">
    <!-- Left Column: Concurrency & Stock Race -->
    <div class="card">
      <h2 class="section-heading">1. Payment &amp; Stock Concurrency Race Condition <span class="tag tag-actual">Actual Implementation</span></h2>
      <p>
        <strong>Scenario:</strong> Two customers pay for the <em>single remaining item</em> simultaneously via Paytm UPI.
      </p>
      <div class="diagram-container" style="font-size: 6.1pt; padding: 3px 5px; margin: 2px 0;">
        <div style="display: flex; justify-content: space-between;">
          <div style="color: #67e8f9;">User A Payment SUCCESS (₹120)</div>
          <div style="color: #f472b6;">User B Payment SUCCESS (₹120)</div>
        </div>
        <div class="diagram-arrow">&darr; Concurrent Webhooks hit FastAPI &darr;</div>
        <div class="diagram-box" style="display: block; text-align: center;">
          PostgreSQL Procedure: <code>verify_and_record_payment()</code><br>
          Executes: <code>SELECT stock_qty FROM menu_items WHERE id = ... FOR UPDATE</code>
        </div>
        <div class="diagram-arrow">&darr; Row Lock Serializes Execution &darr;</div>
        <div style="display: flex; justify-content: space-between; gap: 4px;">
          <div class="diagram-box" style="flex: 1; border-color: #22c55e; color: #4ade80;">
            <strong>Transaction 1 (User A)</strong><br>
            Evaluates <code>stock_qty = 1 &gt;= 1</code><br>
            Decrements <code>stock_qty &rarr; 0</code><br>
            <strong>Order CONFIRMED</strong>
          </div>
          <div class="diagram-box" style="flex: 1; border-color: #ef4444; color: #f87171;">
            <strong>Transaction 2 (User B)</strong><br>
            Waits on lock, then reads <code>stock_qty = 0</code><br>
            Sets <code>v_refund_needed = TRUE</code><br>
            <strong>Triggers AUTO-REFUND</strong>
          </div>
        </div>
      </div>
      <p style="font-size: 7.1pt;">
        <strong>Guarantee:</strong> PostgreSQL pessimistic row-level locking (<code class="inline">FOR UPDATE</code>) ensures that physical inventory can never drop below zero. The losing customer is automatically refunded.
      </p>
    </div>

    <!-- Right Column: Refund Creation & Keys -->
    <div class="card">
      <h2 class="section-heading">2. Deterministic Keys &amp; Timeout Handling <span class="tag tag-actual">Actual Implementation</span></h2>
      <p><strong>Deterministic Idempotency Key:</strong></p>
      <ul>
        <li>When invoking the Paytm Refund API, the backend calculates:
          <br><code class="inline">refId = f"refund-{payment_id}"</code></li>
        <li>This unique reference is stored under <code class="inline">refunds.refund_ref</code> with a database-level <code class="inline">UNIQUE</code> index.</li>
        <li>If a network timeout occurs while transmitting to Paytm, retrying with the <em>identical</em> <code class="inline">refId</code> guarantees that Paytm will reject duplicate debit attempts and return the existing refund status.</li>
      </ul>
      <p style="margin-top: 2px;"><strong>Linking to Original Transaction:</strong></p>
      <ul>
        <li>Refund requests explicitly supply <code class="inline">txnId: payments.paytm_txn_id</code> and <code class="inline">orderId: payments.paytm_order_id</code>.</li>
        <li>Partial refunds are supported by transmitting the calculated unfulfillable amount.</li>
      </ul>
    </div>
  </div>

  <h2 class="section-heading">3. Server Crash Resilience Matrix Across 5 Discrete Lifecycle Phases</h2>
  <table class="compact-table">
    <thead>
      <tr>
        <th style="width: 22%;">Failure Phase</th>
        <th style="width: 38%;">System State &amp; Impact</th>
        <th style="width: 40%;">Automated Recovery Mechanism</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Phase 1: Crash Before Gateway Payment</strong></td>
        <td>Order inserted as <code>awaiting_payment</code>; user never paid or completed transaction.</td>
        <td>Order expires automatically after 10 minutes (<code>expires_at &lt; NOW()</code>). No financial charge occurred.</td>
      </tr>
      <tr>
        <td><strong>Phase 2: Crash After Payment / Before Webhook</strong></td>
        <td>Customer debited at Paytm; V Foods backend offline when webhook dispatches.</td>
        <td><strong>1.</strong> Paytm webhook retry engine re-sends payload upon server restart.<br><strong>2.</strong> Background reconcile cron polls <code>/v3/order/status</code> and confirms order.</td>
      </tr>
      <tr>
        <td><strong>Phase 3: Crash During Webhook Execution</strong></td>
        <td>Backend dies during execution of stored procedure; DB transaction uncommitted.</td>
        <td>PostgreSQL rolls back uncommitted transaction. Paytm receives no 200 OK and retries webhook. Entire procedure re-executes idempotently.</td>
      </tr>
      <tr>
        <td><strong>Phase 4: Crash Before Refund API Invocation</strong></td>
        <td>Payment verified as unfulfillable (out of stock), but server dies before calling Paytm Refund API.</td>
        <td>Payment record remains marked <code>status = 'PENDING'</code> with <code>failure_reason = 'OUT_OF_STOCK'</code>. The reconcile cron detects stuck refund and executes <code>_paytm_initiate_refund()</code>.</td>
      </tr>
      <tr>
        <td><strong>Phase 5: Crash During Refund Webhook Processing</strong></td>
        <td>Paytm processed refund, but V Foods crashed before marking <code>refunds.status = 'SUCCESS'</code>.</td>
        <td>Reconciliation task <code>POST /admin/refunds/reconcile</code> polls Paytm Refund Status API (<code>/refund/status</code>) and completes database update.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-footer">
    <span class="confidential">CONFIDENTIAL &bull; V FOODS ENGINEERING ARCHITECTURE</span>
    <span>Page 6 of 7</span>
  </div>
</div>

<!-- =================================================================== -->
<!-- PAGE 7 — PAYTM PROOF + FINAL FLOW                                  -->
<!-- =================================================================== -->
<div class="page" id="page-7">
  <div class="page-header">
    <span class="doc-title">V Foods &bull; Technical Architecture Whitepaper</span>
    <span class="page-topic">Page 7 — Official Documentation Proof &amp; Master Flow</span>
  </div>

  <h1 class="page-title">Page 7 — Paytm Proof &amp; Master Architecture</h1>
  <div class="page-subtitle">Official Documentation Evidence, Visual Artifacts &amp; Unified Master Lifecycle Architecture</div>

  <!-- Official Paytm Documentation Evidence Grid -->
  <h2 class="section-heading">1. Official Paytm Documentation Evidence &amp; Verification <span class="tag tag-paytm">Paytm Official</span></h2>
  <div class="columns-3" style="gap: 4px; margin-bottom: 3px;">
    <!-- Fig 1: Callback & Webhook -->
    <div class="figure-card">
      <img src="__IMG_WEBHOOK__" alt="Paytm Callback and Webhook" style="max-height: 84px; object-fit: contain;">
      <div class="figure-caption">
        <strong>Figure 1: S2S Webhook &amp; Callback Architecture</strong><br>
        Paytm Payment Gateway Developer Documentation<br>
        <a href="https://paytmpayments.com/docs/callback-and-webhook" target="_blank">paytmpayments.com/docs/callback-and-webhook</a>
      </div>
    </div>

    <!-- Fig 2: Transaction Status API -->
    <div class="figure-card">
      <img src="__IMG_TXN_STATUS__" alt="Paytm Transaction Status API" style="max-height: 84px; object-fit: contain;">
      <div class="figure-caption">
        <strong>Figure 2: Transaction Status API (v3 Order Status)</strong><br>
        Order Status Polling &amp; Fallback Specification<br>
        <a href="https://paytmpayments.com/docs/api/v3/transaction-status-api" target="_blank">paytmpayments.com/docs/api/v3/transaction-status-api</a>
      </div>
    </div>

    <!-- Fig 3: Refund API -->
    <div class="figure-card">
      <img src="__IMG_REFUND__" alt="Paytm Refund API" style="max-height: 84px; object-fit: contain;">
      <div class="figure-caption">
        <strong>Figure 3: Automated S2S Refund API Specification</strong><br>
        Merchant-Initiated Reversals &amp; Unique <code>refId</code><br>
        <a href="https://paytmpayments.com/docs/api/refund-api" target="_blank">paytmpayments.com/docs/api/refund-api</a>
      </div>
    </div>
  </div>

  <div class="columns-2" style="gap: 4px; margin-bottom: 4px;">
    <!-- Fig 4: Checksum Verification -->
    <div class="figure-card" style="display: flex; gap: 5px; align-items: center; text-align: left; padding: 2px 4px;">
      <img src="__IMG_CHECKSUM__" alt="Paytm Checksum Verification" style="max-height: 56px; max-width: 130px; object-fit: contain;">
      <div class="figure-caption">
        <strong>Figure 4: Checksum Utility &amp; Security</strong><br>
        HMAC-SHA256 signature verification preventing payload tampering.<br>
        <a href="https://paytmpayments.com/docs/checksum" target="_blank">paytmpayments.com/docs/checksum</a>
      </div>
    </div>

    <!-- Fig 5: Refund Webhook -->
    <div class="figure-card" style="display: flex; gap: 5px; align-items: center; text-align: left; padding: 2px 4px;">
      <img src="__IMG_REFUND_WEBHOOK__" alt="Paytm Refund Webhook" style="max-height: 56px; max-width: 130px; object-fit: contain;">
      <div class="figure-caption">
        <strong>Figure 5: Asynchronous Refund Webhook</strong><br>
        Gateway dispatches final settlement confirmation when funds clear.<br>
        <a href="https://paytmpayments.com/docs/accept-refund-webhook" target="_blank">paytmpayments.com/docs/accept-refund-webhook</a>
      </div>
    </div>
  </div>

  <!-- Master Lifecycle Diagram -->
  <h2 class="section-heading">2. Unified Master Payment &amp; Refund Architecture Diagram</h2>
  <div class="diagram-container" style="font-size: 6.0pt; line-height: 1.18; padding: 4px 6px; margin-bottom: 3px;">
    <div style="text-align: center; font-weight: bold; color: #38bdf8; margin-bottom: 2px;">
      COMPLETE END-TO-END PAYMENT, VERIFICATION &amp; REVERSAL LIFECYCLE
    </div>
    <pre style="margin: 0; font-family: inherit;">
[Client PWA] ──(1. Checkout)──&gt; [FastAPI: /paytm-session] ──(2. InitiateTxn)──&gt; [Paytm Payment Gateway]
                                         │                                                │
                                         ▼ (Inserts PENDING Payment &amp; Order)             ▼ (Customer Pays via UPI/Card)
                               [PostgreSQL / Supabase]                           [Paytm Core Processing]
                                         ▲                                                │
                                         │                                                ▼ (Gateway Result)
                                         │ (3. S2S Webhook /webhooks/paytm) ◄─────────────┤
                                         │ OR (Fallback Status Query /v3/order/status) ───┘
                                         ▼
                   [FastAPI: Checksum Verification &amp; Proc Invocation]
                                         │
                                         ▼
            [PostgreSQL: verify_and_record_payment() with FOR UPDATE Locks]
                       │                                         │
        [Stock &amp; Order Valid]                    [Stock Depleted OR Order Expired]
                       │                                         │
                       ▼                                         ▼
       ┌───────────────────────────────┐         ┌───────────────────────────────┐
       │   SUCCESS: ORDER CONFIRMED    │         │  UNFULFILLABLE: AUTO-REFUND   │
       │ &bull; payments.status = 'SUCCESS' │         │ &bull; payments.status = 'PENDING' │
       │ &bull; orders.status = 'confirmed' │         │ &bull; failure_reason = 'NO_STOCK'│
       │ &bull; stock_qty decremented       │         │ &bull; FastAPI calls /refund/apply │
       │ &bull; KDS token dispatched        │         │ &bull; refunds.status = 'PENDING' │
       └───────────────────────────────┘         └───────────────┬───────────────┘
                                                                 │
                                                                 ▼
                                                  [Paytm S2S Refund Webhook]
                                                                 │
                                                                 ▼
                                                 ┌───────────────────────────────┐
                                                 │       REFUND COMPLETED        │
                                                 │ &bull; refunds.status = 'SUCCESS' │
                                                 │ &bull; payments.status = 'REFUNDED│
                                                 │ &bull; orders.status = 'cancelled'│
                                                 └───────────────────────────────┘
    </pre>
  </div>

  <div class="card" style="padding: 2.5px 5px; font-size: 6.7pt;">
    <strong>Architecture Verification Summary:</strong> All core checkout, signature signing, webhook handling, pessimistic row locking, and auto-refund initiation are strictly verified in active backend source code (<code class="inline">backend/main.py</code>) and PostgreSQL stored procedures (<code class="inline">011_paytm_three_way_split.sql</code>, <code class="inline">013_payment_reliability_and_refunds.sql</code>).
  </div>

  <div class="page-footer">
    <span class="confidential">CONFIDENTIAL &bull; V FOODS ENGINEERING ARCHITECTURE</span>
    <span>Page 7 of 7</span>
  </div>
</div>

</body>
</html>
"""
    # Replace image placeholders
    final_html = raw_html.replace("__IMG_WEBHOOK__", img_webhook)
    final_html = final_html.replace("__IMG_TXN_STATUS__", img_txn_status)
    final_html = final_html.replace("__IMG_CHECKSUM__", img_checksum)
    final_html = final_html.replace("__IMG_REFUND__", img_refund)
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
        if 5 <= count <= 7:
            print(f"SUCCESS: Page count {count} is within requested target (5–7 pages).")
        else:
            print(f"WARNING: Page count {count} is outside requested target (5–7 pages).")
