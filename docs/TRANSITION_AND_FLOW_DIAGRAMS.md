# Inventra Pharmacy ERP — Transition State Machines & Architecture Flow Diagrams

> **Authoritative System Architecture & Visual Flow Reference**  
> **Backend Framework**: Spring Boot 3.x / Java 21 / PostgreSQL 16+  
> **Format**: GitHub Flavored Markdown with Mermaid Sequence, State, and Entity-Relationship Diagrams  
> **Related Documents**: [BACKEND_API_REFERENCE.md](file:///d:/project/anti-gravity-projects/inventra/docs/BACKEND_API_REFERENCE.md) | [INVENTORY_LIFECYCLE.md](file:///d:/project/anti-gravity-projects/inventra/docs/INVENTORY_LIFECYCLE.md) | [SYSTEM_DIAGRAMS_AND_FUTURE_ROADMAP.md](file:///d:/project/anti-gravity-projects/inventra/docs/SYSTEM_DIAGRAMS_AND_FUTURE_ROADMAP.md)

---

## Table of Contents

1. [High-Level System & Security Boundary Flow](#1-high-level-system--security-boundary-flow)
2. [Tenant Onboarding & Activation State Machine](#2-tenant-onboarding--activation-state-machine)
3. [Authentication, JWT Rotation & Session Lifecycle](#3-authentication-jwt-rotation--session-lifecycle)
4. [Subscription, Tier Upgrade & Manual Payment Flow](#4-subscription-tier-upgrade--manual-payment-flow)
5. [Crowdsourced Global Medicine Curation & 1-Click Import Flow](#5-crowdsourced-global-medicine-curation--1-click-import-flow)
6. [Procurement Lifecycle: Purchase Order (PO) to Goods Receipt (GRN)](#6-procurement-lifecycle-purchase-order-po-to-goods-receipt-grn)
7. [Comprehensive Inventory & Batch State Transition Machine](#7-comprehensive-inventory--batch-state-transition-machine)
8. [Inter-Store Stock Transfer (Logistics) State Machine](#8-inter-store-stock-transfer-logistics-state-machine)
9. [Point of Sale (POS) Counter Checkout & Concurrency Flow](#9-point-of-sale-pos-counter-checkout--concurrency-flow)
10. [Sales Return, Refund & Quarantine Flow](#10-sales-return-refund--quarantine-flow)
11. [Customer Credit Ledger & B2B Settlement Flow](#11-customer-credit-ledger--b2b-settlement-flow)
12. [Offline-First Terminal Synchronization & Conflict Replay Sequence](#12-offline-first-terminal-synchronization--conflict-replay-sequence)
13. [Bulk CSV Ingestion & Remediation Pipeline](#13-bulk-csv-ingestion--remediation-pipeline)
14. [Entity Relationship & Master Schema Model](#14-entity-relationship--master-schema-model)

---

## 1. High-Level System & Security Boundary Flow

This diagram illustrates how client requests traverse the security perimeter, resolve the tenant context via `ThreadLocal`, and interact with the database under transactional guarantees.

```mermaid
sequenceDiagram
    autonumber
    actor Client as "Client (Web / Desktop / Android)"
    participant Gateway as "Servlet Filter Chain"
    participant JwtFilter as "JwtAuthenticationFilter"
    participant CtxHolder as "TenantContextHolder (ThreadLocal)"
    participant Controller as "REST Controller"
    participant Service as "Application Service (@Transactional)"
    participant DB as "PostgreSQL 16+ (Multi-Tenant)"

    Client->>Gateway: "HTTP Request + Authorization: Bearer <JWT> + X-Device-Id"
    Gateway->>JwtFilter: "Intercept Incoming Request"
    JwtFilter->>JwtFilter: "Validate HMAC-SHA256 Signature & Expiry"
    
    alt "Invalid or Expired Token"
        JwtFilter-->>Client: "HTTP 401 Unauthorized (RFC 9457 ProblemDetail)"
    else "Valid Token"
        JwtFilter->>CtxHolder: "Set TenantContext (businessId, storeId, userId, role)"
        JwtFilter->>Gateway: "Forward to SecurityContext"
        Gateway->>Controller: "Dispatch to @RestController"
        Controller->>Service: "Invoke Service Method"
        Service->>CtxHolder: "TenantContextHolder.requireContext()"
        CtxHolder-->>Service: "Return active Business & Store UUIDs"
        Service->>DB: "Execute SQL with WHERE business_id = :businessId"
        DB-->>Service: "Return Entity Data"
        Service-->>Controller: "Return Result DTO"
        Controller-->>Client: "HTTP 200/201 (ApiResponse Envelope)"
        Gateway->>CtxHolder: "TenantContextHolder.clear() (Prevent Thread Leak)"
    end
```

---

## 2. Tenant Onboarding & Activation State Machine

Governs the regulatory onboarding process from initial pharmacy KYC submission through administrative verification to active account status.

```mermaid
stateDiagram-v2
    [*] --> DRAFT: "Pharmacy initiates form filling"
    DRAFT --> PENDING_REVIEW: "Submit KYC, Drug License & GST (POST /api/v1/onboarding/apply)"
    
    state PENDING_REVIEW {
        [*] --> VerificationQueue: "Appears in Admin Queue"
        VerificationQueue --> ComplianceCheck: "Platform Admin reviews Drug License & GSTIN"
    }

    PENDING_REVIEW --> REJECTED: "Invalid or blurred documents (POST /admin/onboarding/applications/{id}/reject)"
    REJECTED --> PENDING_REVIEW: "Pharmacy re-submits updated documents"

    PENDING_REVIEW --> APPROVED: "Compliance verified (POST /admin/onboarding/applications/{id}/approve)"
    
    state APPROVED {
        [*] --> ProvisionTenant: "Generate business_id & flagship store_id"
        ProvisionTenant --> CreateOwner: "Create user record (Status: INACTIVE)"
        CreateOwner --> StartTrial: "Create 14-day TRIAL subscription"
        StartTrial --> IssueToken: "Generate single-use cryptographic activation token"
    }

    APPROVED --> ACTIVATION_PENDING: "Activation link emailed to Owner"
    ACTIVATION_PENDING --> ACTIVE: "Owner establishes password (POST /api/v1/auth/onboarding/activate)"
    ACTIVE --> [*]: "Owner logs in & starts store setup"
```

---

## 3. Authentication, JWT Rotation & Session Lifecycle

Inventra implements **Refresh Token Family Rotation** to protect counter terminals from token replay attacks.

```mermaid
sequenceDiagram
    autonumber
    actor User as "Pharmacist / Cashier"
    participant Auth as "AuthController & AuthService"
    participant TokenRepo as "Refresh Token Table"
    participant Audit as "User Audit Log"

    User->>Auth: "POST /api/v1/auth/login (email, password, deviceFingerprint)"
    Auth->>Auth: "Verify BCrypt password hash"
    Auth->>TokenRepo: "Insert new Refresh Token (Family ID: F-1, Sequence: 1)"
    Auth->>Audit: "Log LOGIN_SUCCESS (IP, Device, Timestamp)"
    Auth-->>User: "Return Access Token (15m) + Refresh Token R1 (7d)"

    Note over User,Auth: "Access token expires after 15 minutes"

    User->>Auth: "POST /api/v1/auth/refresh (R1)"
    Auth->>TokenRepo: "Lookup R1 by token_hash"
    
    alt "R1 was already revoked (Token Replay Attack Detected!)"
        Auth->>TokenRepo: "UPDATE refresh_tokens SET revoked = true WHERE family_id = 'F-1'"
        Auth->>Audit: "Log SECURITY_ALERT (Token Family Compromised)"
        Auth-->>User: "HTTP 401 Unauthorized (Session Expired)"
    else "R1 is valid and active"
        Auth->>TokenRepo: "Mark R1 as Revoked"
        Auth->>TokenRepo: "Insert new Refresh Token R2 (Family ID: F-1, Sequence: 2)"
        Auth-->>User: "Return New Access Token + New Refresh Token R2"
    end
```

---

## 4. Subscription, Tier Upgrade & Manual Payment Flow

Online checkout is not available. The owner previews the upgrade price, pays through the agreed channel, and a platform administrator records the payment.

```mermaid
sequenceDiagram
    autonumber
    actor Owner as "Pharmacy Owner"
    actor Admin as "Platform Administrator"
    participant SubCtrl as "SubscriptionController"
    participant AdminCtrl as "AdminSubscriptionController"
    participant SubSvc as "SubscriptionService"
    participant DB as "PostgreSQL (Subscriptions & Invoices)"

    Owner->>SubCtrl: "GET /api/v1/subscription/upgrade-preview?targetTier=GROWTH"
    SubCtrl->>SubSvc: "Calculate proration credit"
    SubSvc-->>Owner: "Preview: Base Price, Proration Credit, Tax, Final Amount"

    Owner->>Admin: "Pays and shares the payment reference"

    Admin->>AdminCtrl: "POST /api/v1/admin/subscription/businesses/{id}/payment"
    AdminCtrl->>SubSvc: "recordPaymentForBusiness(businessId, paymentReference)"
    SubSvc->>DB: "UPDATE business_subscriptions (new period, payment method)"
    SubSvc->>DB: "INSERT INTO business_subscription_invoices (status: PAID)"
    SubSvc-->>Admin: "HTTP 200 OK (Subscription renewed)"
    Owner->>SubCtrl: "GET /api/v1/subscription/invoices/{id}/pdf"
```

---

## 5. Crowdsourced Global Medicine Curation & 1-Click Import Flow

Shows how unrecognized drug names entered at pharmacy counters are curated by platform administrators into a standardized master database.

```mermaid
flowchart TD
    A["Pharmacist types medicine at counter"] --> B{"Exists in Global Database?"}
    
    B -- "Yes" --> C["Auto-fill Formulation, Dosage, Schedule & HSN"]
    C --> D["Fast Billing Execution"]

    B -- "No" --> E["Pharmacist enters Custom Drug details"]
    E --> F["System records unlisted entry in 'global_medicine_suggestions'"]
    
    subgraph Platform Admin Curation Pipeline
        F --> G["Platform Admin Dashboard (GET /admin/medicines/suggestions)"]
        G --> H{"Pharmacology Review"}
        H -- "Reject" --> I["Mark REJECTED with compliance reason"]
        H -- "Approve" --> J["Promote to 'global_medicines' Master Catalog"]
    end

    J --> K["Available across all platform stores"]
    K --> L["Other stores: 1-Click Quick Import (POST /global-medicines/{id}/quick-import)"]
    L --> M["Instantly added to store's private 'products' table in <50ms"]
```

---

## 6. Procurement Lifecycle: Purchase Order (PO) to Goods Receipt (GRN)

```mermaid
stateDiagram-v2
    [*] --> DRAFT_PO: "Store creates Purchase Order"
    DRAFT_PO --> CONFIRMED_PO: "Manager approves PO (POST /purchase-orders/{id}/confirm)"
    CONFIRMED_PO --> CANCELLED_PO: "Cancelled by Store/Supplier (POST /purchase-orders/{id}/cancel)"

    CONFIRMED_PO --> GOODS_ARRIVED: "Distributor delivers physical stock"
    
    state GOODS_ARRIVED {
        [*] --> DRAFT_GRN: "Create Goods Receipt Note (GRN) with batch numbers, MRP & expiry"
        DRAFT_GRN --> VERIFY_STOCK: "Verify physical boxes against Challan"
    }

    VERIFY_STOCK --> POSTED_GRN: "Post GRN (POST /goods-receipts/{id}/post)"

    state POSTED_GRN {
        [*] --> Atomic_Tx: "BEGIN TRANSACTION"
        Atomic_Tx --> Upsert_Batch: "Create or increment 'inventory_batches'"
        Upsert_Batch --> Update_Item: "Increment 'inventory_items.total_quantity'"
        Update_Item --> WAC_Calc: "Recalculate Weighted Average Purchase Cost"
        WAC_Calc --> Write_Ledger: "Append 'stock_movements' (PURCHASE_RECEIPT)"
        Write_Ledger --> Commit_Tx: "COMMIT TRANSACTION"
    }

    POSTED_GRN --> MATCH_INVOICE: "Supplier Invoice arrives"
    MATCH_INVOICE --> POSTED_INVOICE: "Post Purchase Invoice (Accounts Payable ledger updated)"
    POSTED_INVOICE --> [*]: "PO marked COMPLETED"
```

---

## 7. Comprehensive Inventory & Batch State Transition Machine

Details how an individual pharmaceutical lot transitions from inwarding to dispensing or disposal.

```mermaid
stateDiagram-v2
    [*] --> INWARDED: "GRN Posted (Batch created with Exp Date & MRP)"
    
    INWARDED --> ACTIVE_FEFO: "Added to Store Stock Pool"
    
    state ACTIVE_FEFO {
        [*] --> Green_Zone: "Days until Expiry > 90"
        Green_Zone --> Yellow_Zone: "30 <= Days until Expiry <= 90 (Near-Expiry Alert)"
    }

    Yellow_Zone --> Red_Zone: "Days until Expiry < 30 (Critical Warning)"
    Red_Zone --> EXPIRED: "Expiry Date < Current Date (Checkout Hard Blocked)"

    ACTIVE_FEFO --> DISPENSED: "Sold via POS Checkout (Pessimistic Lock FOR UPDATE)"
    DISPENSED --> RESTOCKED: "Patient Return (Pack Intact & Sealed)"
    RESTOCKED --> ACTIVE_FEFO: "Re-enters FEFO pool"

    DISPENSED --> QUARANTINED: "Patient Return (Damaged / Broken Seal)"
    EXPIRED --> EXPIRY_DUMP: "Disposed / Written off via Stock Adjustment"
    ACTIVE_FEFO --> SHRINKAGE: "Damaged / Broken in Store Shelf"

    QUARANTINED --> [*]
    EXPIRY_DUMP --> [*]
    SHRINKAGE --> [*]
```

---

## 8. Inter-Store Stock Transfer (Logistics) State Machine

```mermaid
sequenceDiagram
    autonumber
    actor StoreB as "Destination Branch (Store B)"
    actor StoreA as "Source Branch (Store A)"
    participant TransferSvc as "TransferService"
    participant DB as "Database (Batches & Movements)"

    StoreB->>TransferSvc: "POST /api/v1/transfers (Request 50 strips of Augmentin)"
    TransferSvc->>DB: "INSERT INTO inventory_transfers (Status: REQUESTED)"
    TransferSvc-->>StoreA: "Notification: Transfer Requisition Pending"

    alt "Source Manager Rejects"
        StoreA->>TransferSvc: "POST /api/v1/transfers/{id}/reject (reason)"
        TransferSvc->>DB: "UPDATE inventory_transfers SET status = 'REJECTED'"
    else "Source Manager Approves & Ships"
        StoreA->>TransferSvc: "POST /api/v1/transfers/{id}/approve"
        TransferSvc->>DB: "UPDATE inventory_transfers SET status = 'APPROVED'"
        
        StoreA->>TransferSvc: "POST /api/v1/transfers/{id}/ship (dispatched items & tracking)"
        Note over TransferSvc,DB: "CRITICAL: Stock is deducted from Source store immediately"
        TransferSvc->>DB: "SELECT current_quantity FROM inventory_batches WHERE store_id = 'StoreA' FOR UPDATE"
        TransferSvc->>DB: "UPDATE inventory_batches SET current_quantity = current_quantity - 50"
        TransferSvc->>DB: "INSERT INTO stock_movements (movement_type: 'TRANSFER_OUT')"
        TransferSvc->>DB: "UPDATE inventory_transfers SET status = 'IN_TRANSIT'"

        Note over StoreA,StoreB: "Stock is in transit (cannot be sold by either store)"

        StoreB->>TransferSvc: "POST /api/v1/transfers/{id}/receive"
        TransferSvc->>DB: "Upsert batch in Store B with identical Batch #, Expiry & MRP"
        TransferSvc->>DB: "UPDATE inventory_batches SET current_quantity = current_quantity + 50 (Store B)"
        TransferSvc->>DB: "INSERT INTO stock_movements (movement_type: 'TRANSFER_IN')"
        TransferSvc->>DB: "UPDATE inventory_transfers SET status = 'COMPLETED'"
        TransferSvc-->>StoreB: "Transfer Complete (Stock available for billing at Store B)"
    end
```

---

## 9. Point of Sale (POS) Counter Checkout & Concurrency Flow

Demonstrates how two parallel cashiers selling the same batch are handled deterministically without inventory overselling.

```mermaid
sequenceDiagram
    autonumber
    actor Cashier1 as "Cashier 1 (Terminal A)"
    actor Cashier2 as "Cashier 2 (Terminal B)"
    participant POS as "SaleService (@Transactional)"
    participant DB as "PostgreSQL (Row Locks)"

    Note over DB: "Batch B-101 Available Quantity: 5 strips"

    Cashier1->>POS: "POST /api/v1/sales (Requests 5 strips of B-101)"
    Cashier2->>POS: "POST /api/v1/sales (Requests 5 strips of B-101)"

    POS->>DB: "[Tx 1] SELECT current_quantity FROM inventory_batches WHERE id = 'B-101' FOR UPDATE"
    Note over DB: "Tx 1 ACQUIRES PESSIMISTIC LOCK on Batch B-101"

    POS->>DB: "[Tx 2] SELECT current_quantity FROM inventory_batches WHERE id = 'B-101' FOR UPDATE"
    Note over DB: "Tx 2 IS BLOCKED & WAITS for Tx 1 to finish"

    Note over POS,DB: "Tx 1 processes successfully"
    POS->>DB: "[Tx 1] Deduct stock: 5 - 5 = 0"
    POS->>DB: "[Tx 1] Append stock_movements ('SALE', qty: -5)"
    POS->>DB: "[Tx 1] INSERT INTO sales, sale_items, sale_payments"
    POS->>DB: "[Tx 1] COMMIT TRANSACTION"
    Note over DB: "Tx 1 COMMITTED. Lock released on B-101"

    POS-->>Cashier1: "HTTP 201 Created (Invoice INV-001 Printed)"

    Note over DB: "Tx 2 RESUMES and acquires lock on Batch B-101"
    DB-->>POS: "[Tx 2] Reads current_quantity: 0"
    POS->>POS: "[Tx 2] Assertion Check: 0 >= 5 (FAILED!)"
    POS->>DB: "[Tx 2] ROLLBACK TRANSACTION"

    POS-->>Cashier2: "HTTP 422 Unprocessable Entity (INSUFFICIENT_STOCK: Requested 5, Available 0)"
```

---

## 10. Sales Return, Refund & Quarantine Flow

```mermaid
flowchart TD
    A["Patient returns medicine at counter"] --> B["Cashier enters Invoice # & scans returned item"]
    B --> C{"Check: return_qty <= sold_qty?"}
    C -- "No" --> D["HTTP 422: Return quantity exceeds billed quantity"]
    
    C -- "Yes" --> E{"Physical Package Inspection"}
    
    E -- "Intact, Sealed & Unopened" --> F["Select: restock = true"]
    F --> G["Atomic DB Transaction"]
    G --> H["UPDATE inventory_batches SET current_quantity = current_quantity + return_qty"]
    G --> I["UPDATE inventory_items SET total_quantity = total_quantity + return_qty"]
    G --> J["INSERT INTO stock_movements (movement_type: 'SALE_RETURN')"]
    
    E -- "Opened, Damaged or Cold-Chain Breached" --> K["Select: restock = false"]
    K --> L["Batch inventory is NOT increased"]
    K --> M["Routed to Quarantine / Loss Write-Off"]

    J --> N["Issue Refund Payment (Cash / UPI / Customer Credit Note)"]
    M --> N
    N --> O["Print Credit Note / Return Voucher"]
```

---

## 11. Customer Credit Ledger & B2B Settlement Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as "Patient / Institutional Buyer"
    actor Cashier as "Cashier"
    participant SaleSvc as "SaleService"
    participant CustSvc as "CustomerService"
    participant DB as "PostgreSQL (Customer & Ledger)"

    Cashier->>SaleSvc: "POST /api/v1/sales (paymentMethod: 'CREDIT', amount: Rs 1,500)"
    SaleSvc->>DB: "SELECT credit_limit, current_credit_balance FROM customers WHERE id = :id FOR UPDATE"
    
    alt "Credit Limit Exceeded"
        SaleSvc-->>Cashier: "HTTP 422 (CREDIT_LIMIT_EXCEEDED: Available credit Rs 800, Bill Rs 1500)"
    else "Credit Approved"
        SaleSvc->>DB: "UPDATE customers SET current_credit_balance = current_credit_balance + 1500"
        SaleSvc->>DB: "INSERT INTO customer_ledger (type: 'DEBIT', amount: 1500, balance_after: balance + 1500)"
        SaleSvc->>DB: "Complete Sale & Print Bill"
        SaleSvc-->>Cashier: "Sale Completed on Account Credit"
    end

    Note over Customer,Cashier: "Later: Customer settles outstanding dues"

    Customer->>Cashier: "Pays Rs 1,500 via UPI"
    Cashier->>CustSvc: "POST /api/v1/customers/{id}/payments (amount: 1500, mode: 'UPI')"
    CustSvc->>DB: "UPDATE customers SET current_credit_balance = current_credit_balance - 1500"
    CustSvc->>DB: "INSERT INTO customer_ledger (type: 'CREDIT_PAYMENT', amount: 1500, balance_after: balance - 1500)"
    CustSvc-->>Cashier: "Receipt Generated (Account Balance: Rs 0.00)"
```

---

## 12. Offline-First Terminal Synchronization & Conflict Replay Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Terminal as "Desktop POS (Tauri / SQLite)"
    participant SyncAPI as "SyncController (/api/v1/sync)"
    participant SyncSvc as "SyncService"
    participant Domain as "SaleService & InventoryEngine"
    participant DB as "Cloud PostgreSQL"

    Note over Terminal: "Internet Connection Lost!"
    Terminal->>Terminal: "Cashier bills sale to local SQLite"
    Terminal->>Terminal: "Generates unique Idempotency-Key: 'off_uuid_101'"
    Terminal->>Terminal: "Decrements local SQLite stock"
    Terminal->>Terminal: "Queues payload into offline sync queue"

    Note over Terminal: "Internet Connection Restored!"

    Terminal->>SyncAPI: "POST /api/v1/sync/upload (deviceId, syncSequence, transactions)"
    SyncAPI->>SyncSvc: "processUpload(businessId, storeId, deviceId, payload)"
    SyncSvc->>DB: "Verify Device Fingerprint is ACTIVE in 'devices' table"
    
    SyncSvc->>DB: "SELECT COUNT(1) FROM sync_events WHERE idempotency_key = 'off_uuid_101'"
    
    alt "Transaction already processed earlier (Duplicate Sync Replay)"
        SyncSvc-->>Terminal: "Acknowledge as APPLIED (No duplicate deduction)"
    else "First time processing"
        SyncSvc->>Domain: "Execute sale through core domain service"
        Domain->>DB: "Pessimistically lock batch & decrement central inventory"
        Domain->>DB: "Append central stock_movement record"
        Domain->>DB: "INSERT INTO sales (assigned invoice number)"
        SyncSvc->>DB: "INSERT INTO sync_events (idempotency_key: 'off_uuid_101', status: 'APPLIED')"
        SyncSvc-->>Terminal: "HTTP 200 OK (serverCursor: 9942, assignedInvoice: 'INV-2026-00412')"
    end

    Terminal->>SyncAPI: "GET /api/v1/sync/download?cursor=9942"
    SyncAPI->>DB: "SELECT * FROM sync_change_log WHERE sequence_id > 9942"
    DB-->>Terminal: "Delta updates (new products, price changes from other stores)"
```

---

## 13. Bulk CSV Ingestion & Remediation Pipeline

```mermaid
stateDiagram-v2
    [*] --> UPLOADED: "User uploads CSV file (POST /api/v1/imports/upload)"
    
    state UPLOADED {
        [*] --> ParseLines: "Streaming CSV Parser"
        ParseLines --> ValidateSchema: "Verify Header columns & Data types"
        ValidateSchema --> StageRows: "Insert into 'import_rows' table"
    }

    UPLOADED --> PARSED: "Job Status: PARSED"

    state PARSED {
        [*] --> CheckErrors: "Evaluate row validation errors"
        CheckErrors --> ValidRows: "Mark rows with valid format as VALID"
        CheckErrors --> ErrorRows: "Mark rows with missing/malformed cells as ERROR"
    }

    PARSED --> REVIEW: "User reviews errors in UI (GET /imports/{id}/rows?status=ERROR)"

    state REVIEW {
        [*] --> FixCell: "Inline cell update (PATCH /imports/{id}/rows/{rowId})"
        FixCell --> Revalidate: "Row status changes ERROR -> VALID"
        [*] --> SkipCell: "User skips row (POST /imports/{id}/rows/{rowId}/skip)"
    }

    REVIEW --> CONFIRMED: "User confirms job (POST /api/v1/imports/{id}/confirm)"
    
    state CONFIRMED {
        [*] --> BeginTx: "BEGIN TRANSACTION"
        BeginTx --> BatchInsert: "Batch insert all VALID rows into 'products' or 'customers'"
        BatchInsert --> CreateIdentifiers: "Insert barcode/SKU identifiers"
        CreateIdentifiers --> CommitTx: "COMMIT TRANSACTION"
    }

    CONFIRMED --> COMPLETED: "Job Status: COMPLETED"
    REVIEW --> CANCELLED: "User aborts job (POST /api/v1/imports/{id}/cancel)"
    COMPLETED --> [*]
    CANCELLED --> [*]
```

---

## 14. Entity Relationship & Master Schema Model

This ER diagram demonstrates the foreign key relationships connecting procurement, batches, point of sale, customer balances, and immutable audit movements.

```mermaid
erDiagram
    BUSINESSES ||--o{ STORES : owns
    BUSINESSES ||--o{ PRODUCTS : maintains
    BUSINESSES ||--o{ CUSTOMERS : serves
    BUSINESSES ||--o{ SUPPLIERS : purchases_from
    BUSINESSES ||--o{ SUBSCRIPTIONS : billed_for

    STORES ||--o{ INVENTORY_ITEMS : stocks
    STORES ||--o{ INVENTORY_BATCHES : holds
    STORES ||--o{ SALES : executes
    STORES ||--o{ DEVICES : registers

    PRODUCTS ||--o{ PRODUCT_IDENTIFIERS : identified_by
    PRODUCTS ||--o{ INVENTORY_ITEMS : aggregated_in
    PRODUCTS ||--o{ INVENTORY_BATCHES : instantiates

    INVENTORY_BATCHES ||--o{ STOCK_MOVEMENTS : records
    INVENTORY_BATCHES ||--o{ SALE_ITEMS : allocated_to
    INVENTORY_BATCHES ||--o{ GOODS_RECEIPT_ITEMS : received_in

    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : contains
    PURCHASE_ORDERS ||--o{ GOODS_RECEIPT_NOTES : fulfilled_by
    GOODS_RECEIPT_NOTES ||--o{ GOODS_RECEIPT_ITEMS : verifies

    SALES ||--o{ SALE_ITEMS : bills
    SALES ||--o{ SALE_PAYMENTS : receives
    SALES ||--o{ SALE_RETURNS : refunded_by

    SALE_RETURNS ||--o{ SALE_RETURN_ITEMS : details
    CUSTOMERS ||--o{ CUSTOMER_LEDGER : tracks_balance
    CUSTOMERS ||--o{ SALES : purchases

    INVENTORY_TRANSFERS ||--o{ TRANSFER_ITEMS : specifies
```

---

## 15. Cross-Reference Index

| Domain | Key Endpoints | Relevant Diagram | Primary Entities |
|---|---|---|---|
| **Identity & Auth** | `/api/v1/auth/*` | Diagrams 1, 3 | `users`, `refresh_tokens`, `devices` |
| **Onboarding** | `/api/v1/onboarding/*`, `/api/v1/admin/onboarding/*` | Diagram 2 | `onboarding_applications`, `businesses`, `stores` |
| **Subscriptions** | `/api/v1/subscription/*`, `/api/v1/admin/subscription/*` | Diagram 4 | `subscriptions`, `license_invoices`, `coupons` |
| **Global Medicines** | `/api/v1/catalog/global-medicines/*`, `/api/v1/admin/medicines/*` | Diagram 5 | `global_medicines`, `global_medicine_suggestions` |
| **Purchasing** | `/api/v1/purchase-orders/*`, `/api/v1/goods-receipts/*` | Diagram 6 | `purchase_orders`, `goods_receipt_notes` |
| **Inventory & Batches**| `/api/v1/inventory/*` | Diagram 7 | `inventory_items`, `inventory_batches`, `stock_movements` |
| **Transfers** | `/api/v1/transfers/*` | Diagram 8 | `inventory_transfers`, `transfer_items` |
| **POS Billing** | `/api/v1/sales/*`, `/api/v1/pos/*` | Diagram 9 | `sales`, `sale_items`, `sale_payments` |
| **Sales Returns** | `/api/v1/returns/*`, `/api/v1/sales/{id}/returns` | Diagram 10 | `sale_returns`, `sale_return_items` |
| **Customer Credit** | `/api/v1/customers/*` | Diagram 11 | `customers`, `customer_ledger` |
| **Offline Sync** | `/api/v1/sync/*` | Diagram 12 | `sync_events`, `sync_change_log` |
| **CSV Ingestion** | `/api/v1/imports/*` | Diagram 13 | `import_jobs`, `import_rows` |

---
*Inventra Pharmacy ERP Documentation Engine — System Transition & Architecture Specification.*
