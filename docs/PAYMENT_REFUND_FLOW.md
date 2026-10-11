# V FOODS — Payment & Refund Flow Specification
## Sequence Diagrams, State Machines & Idempotency Controls

**Status**: Active Production Specification  
**Component**: Payment Verification, Refund Engine & Reconciliation  

---

## 1. Direct Order Payment & Confirmation Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User App
    participant API as FastAPI Backend
    participant Paytm as Paytm Gateway
    participant DB as PostgreSQL (Supabase)
    actor Kitchen as Kitchen KDS Display

    User->>API: POST /order/checkout/paytm-session (order_id, amount)
    API->>DB: INSERT payments (status: 'PENDING', paytm_order_id: 'ORD-...')
    API->>Paytm: Generate HMAC-SHA256 Checksum Signature
    API-->>User: Return mid, orderId, txnToken, checksum
    User->>Paytm: Opens Paytm UPI / Netbanking Checkout
    Paytm-->>User: Amount Debited (User Bank Screen)
    
    rect rgb(240, 248, 255)
        Note over Paytm,API: Server-to-Server Async Notification (Fastest Path)
        Paytm->>API: POST /webhooks/paytm (STATUS: 'TXN_SUCCESS', CHECKSUMHASH)
        API->>API: Verify HMAC-SHA256 signature
        API->>DB: RPC verify_and_record_payment()
        Note over DB: Lock item rows FOR UPDATE<br/>Check stock_count >= qty
        alt Stock Available
            DB-->>API: v_action: 'CONFIRMED', v_refund_needed: FALSE
            API->>DB: UPDATE orders SET status = 'placed', token = '104'
            DB-->>Kitchen: Supabase Realtime Push: Ticket #104 Placed
            DB-->>User: Supabase Realtime Push: Order Confirmed #104
        else Stock Depleted (Sold out during checkout)
            DB-->>API: v_action: 'REFUND_TRIGGERED', v_refund_needed: TRUE
            API->>DB: UPDATE orders SET status = 'cancelled'
            API->>Paytm: POST /refund/apply (refId: 'refund-501', amount: 120.0)
            Paytm-->>API: Refund Accepted (status: 'PENDING')
            API->>DB: INSERT refunds (status: 'PENDING', refund_ref: 'refund-501')
            DB-->>User: Realtime Push: Order Cancelled & 100% Refund Initiated
        end
        API-->>Paytm: HTTP 200 OK {"status": "SUCCESS"}
    end
```

---

## 2. Payment Debited But Order Not Confirmed Flow (Failure Recovery)

This is the primary failure path when campus mobile networks disconnect immediately after the user's bank accounts are debited.

```mermaid
sequenceDiagram
    autonumber
    actor User as User App
    participant API as FastAPI Backend
    participant Paytm as Paytm Gateway
    participant DB as PostgreSQL (Supabase)

    Note over User,Paytm: User pays ₹120. Network drops before browser receives response.
    User->>User: App displays "Order Pending Verification"
    User->>API: POST /order/1048/check-payment-status
    API->>API: Verify Rate Limit Cooldown (10s per order)
    API->>DB: Query local payment status for order #1048
    
    alt Payment is already marked SUCCESS
        API-->>User: Return current confirmed order status & token
    else Local Payment is PENDING
        API->>Paytm: POST /v2/transaction/status (ORDERID: 'ORD-1048-...')
        Paytm-->>API: Return Paytm Status (STATUS: 'TXN_SUCCESS', TXNID: 'PTM9988...')
        API->>DB: RPC verify_and_record_payment()
        API->>DB: INSERT reconciliation_records (discrepancy resolved)
        alt Stock Available
            API->>DB: Confirm order & decrement inventory
            API-->>User: Return { "order_status": "placed", "payment_status": "SUCCESS" }
        else Stock Depleted
            API->>DB: Cancel order
            API->>Paytm: POST /refund/apply (refId: 'refund-1048')
            API->>DB: INSERT refunds (status: 'PENDING', refund_ref: 'refund-1048')
            API-->>User: Return { "order_status": "cancelled", "refund_status": "REFUND_INITIATED" }
        end
    end
```

---

## 3. The V Foods Refund State Machine

V Foods enforces an explicit 7-state refund lifecycle:

```mermaid
stateDiagram-v2
    [*] --> REFUND_NOT_REQUIRED : Successful Order Completed
    [*] --> REFUND_PENDING : Order Cancelled / Stock Unavailable
    REFUND_PENDING --> REFUND_INITIATED : API calls Paytm Initiate Refund
    REFUND_INITIATED --> REFUND_PROCESSING : Paytm accepts refund request (ACCEPT)
    REFUND_PROCESSING --> REFUND_SUCCESS : Paytm S2S Webhook / Status confirms SUCCESS
    REFUND_PROCESSING --> REFUND_FAILED : Bank rejects refund or invalid account
    REFUND_INITIATED --> REFUND_FAILED : Gateway API rejection (HTTP 400/500)
    REFUND_INITIATED --> REFUND_UNKNOWN : Timeout / Network error during initiation
    REFUND_UNKNOWN --> REFUND_PROCESSING : Reconciliation verifies with Paytm
    REFUND_FAILED --> [*] : Support / Counter resolution
    REFUND_SUCCESS --> [*] : Credited to user payment source
```

### State Definitions & Database Mapping

| Internal V Foods State | Paytm Gateway Event / Status | Trigger / Condition | UI Guidance Shown to User |
| :--- | :--- | :--- | :--- |
| `REFUND_NOT_REQUIRED` | `N/A` | Payment succeeded and order is preparing/completed. | Normal order progress. |
| `REFUND_PENDING` | `N/A` | Payment received but order cancelled/unfulfillable before gateway API call. | "Refund queued for processing." |
| `REFUND_INITIATED` | `ACCEPT` | Backend successfully submitted refund request to Paytm gateway. | "100% refund initiated to source account." |
| `REFUND_PROCESSING` | `PENDING` | Gateway forwarded refund to customer's issuing bank. | "Refund processing with issuing bank." |
| `REFUND_SUCCESS` | `TXN_SUCCESS` / `SUCCESS` | Gateway confirmed settlement back to user source account. | "Refund completed to original payment source." |
| `REFUND_FAILED` | `TXN_FAILURE` / `FAILURE` | Gateway or bank rejected refund (e.g., closed bank account). | "Refund issue detected. Tap Contact Outlet." |
| `REFUND_UNKNOWN` | `N/A (Timeout)` | Network failure during Paytm refund API request. | "Verifying refund status with gateway." |

---

## 4. Refund Idempotency Architecture

To prevent duplicate refund requests across network retries, automated jobs, and manual administrative triggers:

1. **Deterministic Idempotency Key**:
   The Paytm refund reference is constructed deterministically:
   ```python
   refId = f"refund-{payment_id}"
   ```
2. **Database Uniqueness Constraint**:
   ```sql
   ALTER TABLE public.refunds ADD CONSTRAINT uq_refunds_refund_ref UNIQUE (refund_ref);
   ```
3. **Atomic Verification Pre-Condition**:
   Before initiating a gateway refund, the backend queries existing refund rows:
   ```python
   existing_refund = sb.from_("refunds").select("id, status, refund_ref").eq("payment_id", payment_id).execute().data
   if existing_refund and existing_refund[0]["status"] in ("SUCCESS", "PROCESSING", "PENDING"):
       logger.info(f"Refund already active for payment {payment_id}: skipping duplicate API call")
       return existing_refund[0]
   ```
4. **Paytm Gateway Idempotency Guarantee**:
   According to official Paytm documentation, sending the same `refId` with identical amount returns the status of the existing refund rather than creating a duplicate financial debit.
