# Inventra Pharmacy ERP — System Diagrams & Future Engineering Roadmap

> **Authoritative Technical Blueprint**  
> **Backend Stack**: Spring Boot 3.x / Java 21 / PostgreSQL 16+  
> **Architecture Pattern**: Domain-Driven Design (DDD), Modular Layered Monolith, Row-Level Logical Multi-Tenancy  
> **Related Architecture Documents**:
> - [BACKEND_API_REFERENCE.md](file:///d:/project/anti-gravity-projects/inventra/docs/BACKEND_API_REFERENCE.md)
> - [INVENTORY_LIFECYCLE.md](file:///d:/project/anti-gravity-projects/inventra/docs/INVENTORY_LIFECYCLE.md)
> - [TRANSITION_AND_FLOW_DIAGRAMS.md](file:///d:/project/anti-gravity-projects/inventra/docs/TRANSITION_AND_FLOW_DIAGRAMS.md)

---

## Table of Contents

1. [Architectural Overview & Core Aggregates](#1-architectural-overview--core-aggregates)
2. [Domain-Specific Relational ER Diagrams](#2-domain-specific-relational-er-diagrams)
   - [2.1 Identity, Tenancy & Security Schema](#21-identity-tenancy--security-schema)
   - [2.2 Catalog, Categories & Global Medicine Master Schema](#22-catalog-categories--global-medicine-master-schema)
   - [2.3 Procurement, Suppliers & Goods Receipt (GRN) Schema](#23-procurement-suppliers--goods-receipt-grn-schema)
   - [2.4 Inventory, Discrete Batches & Movement Ledger Schema](#24-inventory-discrete-batches--movement-ledger-schema)
   - [2.5 Point of Sale (POS), Sales & Customer Credit Ledger Schema](#25-point-of-sale-pos-sales--customer-credit-ledger-schema)
   - [2.6 Subscriptions, Licensing & Content (CMS) Schema](#26-subscriptions-licensing--content-cms-schema)
   - [2.7 Bulk Data Ingestion & Offline Sync Schema](#27-bulk-data-ingestion--offline-sync-schema)
3. [Object-Oriented Domain Class Diagrams](#3-object-oriented-domain-class-diagrams)
   - [3.1 Sales & Billing Aggregate Class Diagram](#31-sales--billing-aggregate-class-diagram)
   - [3.2 Inventory & Stock Movement Aggregate Class Diagram](#32-inventory--stock-movement-aggregate-class-diagram)
   - [3.3 Purchasing & Inwarding Aggregate Class Diagram](#33-purchasing--inwarding-aggregate-class-diagram)
4. [Advanced Algorithmic Flowcharts](#4-advanced-algorithmic-flowcharts)
   - [4.1 Statutory Prescription & Narcotics (Schedule H/H1/X) Validation Flow](#41-statutory-prescription--narcotics-schedule-hh1x-validation-flow)
   - [4.2 Dynamic Pricing, Discount & Proration Calculation Flow](#42-dynamic-pricing-discount--proration-calculation-flow)
   - [4.3 Multi-Tenant Resolution & Execution Interceptor Flow](#43-multi-tenant-resolution--execution-interceptor-flow)
5. [Future Scope: What Is Yet to Be Implemented](#5-future-scope-what-is-yet-to-be-implemented)
   - [5.1 AI-Powered PDF / OCR Invoice Ingestion](#51-ai-powered-pdf--ocr-invoice-ingestion)
   - [5.2 WhatsApp & Automated SMS Patient Engagement](#52-whatsapp--automated-sms-patient-engagement)
   - [5.3 Ayushman Bharat Digital Mission (ABDM) & e-Prescription Network](#53-ayushman-bharat-digital-mission-abdm--e-prescription-network)
   - [5.4 Distributor B2B Electronic Data Interchange (EDI)](#54-distributor-b2b-electronic-data-interchange-edi)
   - [5.5 Predictive AI Stock Replenishment & Demand Forecasting](#55-predictive-ai-stock-replenishment--demand-forecasting)
   - [5.6 Direct Hardware Peripheral WebUSB / Serial Drivers](#56-direct-hardware-peripheral-webusb--serial-drivers)
   - [5.7 Statutory GST e-Invoicing & e-Way Bill Integration](#57-statutory-gst-e-invoicing--e-way-bill-integration)
   - [5.8 Native Android / iOS Field Application](#58-native-android--ios-field-application)
6. [Feature Matrix: Current State vs. Future Roadmap](#6-feature-matrix-current-state-vs-future-roadmap)

---

## 1. Architectural Overview & Core Aggregates

Inventra is built upon Domain-Driven Design (DDD) principles to prevent anemic CRUD models and guarantee financial and stock invariant protections. The application organizes domain logic into bounded aggregates:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INVENTRA CORE BOUNDED CONTEXT                   │
├─────────────────┬───────────────────┬─────────────────┬────────────────┤
│ TENANCY & AUTH  │ CATALOG & FORMULA │ INVENTORY & LOT │ SALES & POS    │
│ - Business      │ - Product         │ - Batch         │ - Sale         │
│ - Store         │ - Category        │ - StockMovement │ - SaleItem     │
│ - User          │ - GlobalMedicine  │ - Transfer      │ - SalePayment  │
│ - Device        │ - Identifier      │ - Adjustment    │ - SaleReturn   │
├─────────────────┼───────────────────┼─────────────────┼────────────────┤
│ PURCHASING      │ CUSTOMER & LEDGER │ LICENSING & SUB │ INGESTION/SYNC │
│ - Supplier      │ - Customer        │ - Subscription  │ - ImportJob    │
│ - PurchaseOrder │ - CustomerLedger  │ - LicenseInvoice│ - ImportRow    │
│ - GoodsReceipt  │ - CreditLimit     │ - Coupon        │ - SyncEvent    │
│ - PurchaseBill  │ - PatientHistory  │ - PricingConfig │ - SyncChangeLog│
└─────────────────┴───────────────────┴─────────────────┴────────────────┘
```

---

## 2. Domain-Specific Relational ER Diagrams

### 2.1 Identity, Tenancy & Security Schema
Manages pharmacy enterprise hierarchies, multi-store branch configurations, role-based access control (RBAC), and hardware POS terminal authorizations.

```mermaid
erDiagram
    BUSINESSES {
        uuid id PK
        varchar name
        varchar registration_number
        varchar tax_id
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    STORES {
        uuid id PK
        uuid business_id FK
        varchar name
        varchar code
        boolean is_headquarters
        varchar address
        varchar city
        varchar state
        varchar pincode
        int max_users
        timestamp created_at
    }

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar phone
        varchar status
        timestamp created_at
    }

    BUSINESS_MEMBERSHIPS {
        uuid id PK
        uuid business_id FK
        uuid user_id FK
        varchar role
        boolean is_active
        timestamp created_at
    }

    STORE_ASSIGNMENTS {
        uuid id PK
        uuid store_id FK
        uuid user_id FK
        varchar role_override
        boolean is_primary
        timestamp created_at
    }

    DEVICES {
        uuid id PK
        uuid business_id FK
        uuid store_id FK
        varchar device_name
        varchar device_type
        varchar fingerprint UK
        varchar status
        uuid registered_by FK
        timestamp registered_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        varchar family_id
        boolean revoked
        timestamp expires_at
        timestamp created_at
    }

    USER_AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar ip_address
        varchar user_agent
        timestamp created_at
    }

    BUSINESSES ||--o{ STORES : owns
    BUSINESSES ||--o{ BUSINESS_MEMBERSHIPS : binds
    BUSINESSES ||--o{ DEVICES : registers
    USERS ||--o{ BUSINESS_MEMBERSHIPS : holds
    USERS ||--o{ STORE_ASSIGNMENTS : assigned_to
    USERS ||--o{ REFRESH_TOKENS : owns
    USERS ||--o{ USER_AUDIT_LOGS : generates
    STORES ||--o{ STORE_ASSIGNMENTS : hosts
    STORES ||--o{ DEVICES : operates_at
```

---

### 2.2 Catalog, Categories & Global Medicine Master Schema
Handles localized pharmacy stock-keeping units (SKUs), multiple barcode aliases, and connects to the centralized 50,000+ formulation master.

```mermaid
erDiagram
    CATEGORIES {
        uuid id PK
        uuid business_id FK
        varchar name
        varchar description
        boolean is_active
        timestamp created_at
    }

    PRODUCTS {
        uuid id PK
        uuid business_id FK
        uuid category_id FK
        varchar name
        varchar generic_name
        varchar manufacturer
        varchar hsn_code
        varchar uom
        int reorder_level
        varchar schedule
        boolean is_narcotic
        boolean is_active
        int version
        timestamp created_at
    }

    PRODUCT_IDENTIFIERS {
        uuid id PK
        uuid product_id FK
        varchar identifier_type
        varchar identifier_value UK
        timestamp created_at
    }

    GLOBAL_MEDICINES {
        uuid id PK
        varchar name
        varchar generic_name
        varchar manufacturer
        varchar category
        varchar dosage_form
        varchar strength
        varchar schedule
        decimal default_gst_rate
        varchar default_hsn_code
        boolean is_verified
        timestamp created_at
    }

    GLOBAL_MEDICINE_SUGGESTIONS {
        uuid id PK
        uuid business_id FK
        uuid store_id FK
        varchar suggested_name
        varchar suggested_generic
        varchar suggested_manufacturer
        varchar status
        uuid reviewed_by FK
        text review_notes
        timestamp created_at
    }

    CATEGORIES ||--o{ PRODUCTS : classifies
    PRODUCTS ||--o{ PRODUCT_IDENTIFIERS : has_barcodes
```

---

### 2.3 Procurement, Suppliers & Goods Receipt (GRN) Schema
Maintains wholesale vendor relationships, contract rates, procurement orders, and formal shipment receipt vouchers.

```mermaid
erDiagram
    SUPPLIERS {
        uuid id PK
        uuid business_id FK
        varchar name
        varchar code
        varchar gstin
        varchar dl_number
        varchar contact_person
        varchar phone
        varchar email
        int payment_terms_days
        decimal current_balance
        boolean is_active
        timestamp created_at
    }

    SUPPLIER_PRODUCTS {
        uuid id PK
        uuid business_id FK
        uuid supplier_id FK
        uuid product_id FK
        varchar supplier_product_code
        decimal purchase_price
        decimal tax_rate
        timestamp created_at
    }

    PURCHASE_ORDERS {
        uuid id PK
        uuid business_id FK
        uuid store_id FK
        uuid supplier_id FK
        varchar order_number UK
        varchar status
        date expected_delivery_date
        decimal total_amount
        decimal tax_amount
        text notes
        timestamp created_at
    }

    PURCHASE_ORDER_ITEMS {
        uuid id PK
        uuid purchase_order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
        decimal tax_rate
        decimal total_amount
    }

    GOODS_RECEIPT_NOTES {
        uuid id PK
        uuid business_id FK
        uuid store_id FK
        uuid supplier_id FK
        uuid purchase_order_id FK
        varchar grn_number UK
        varchar supplier_invoice_number
        date supplier_invoice_date
        varchar status
        uuid posted_by FK
        timestamp posted_at
        timestamp created_at
    }

    GOODS_RECEIPT_ITEMS {
        uuid id PK
        uuid goods_receipt_id FK
        uuid purchase_order_item_id FK
        uuid product_id FK
        varchar batch_number
        date expiry_date
        date mfg_date
        decimal mrp
        decimal purchase_rate
        int received_quantity
        int free_quantity
        decimal tax_rate
    }

    SUPPLIERS ||--o{ SUPPLIER_PRODUCTS : supplies
    SUPPLIERS ||--o{ PURCHASE_ORDERS : receives
    SUPPLIERS ||--o{ GOODS_RECEIPT_NOTES : ships
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : contains
    PURCHASE_ORDERS ||--o{ GOODS_RECEIPT_NOTES : fulfilled_by
    GOODS_RECEIPT_NOTES ||--o{ GOODS_RECEIPT_ITEMS : verifies
```

---

### 2.4 Inventory, Discrete Batches & Movement Ledger Schema
The operational heart of the system. Balances are fast-read caches; `stock_movements` is the immutable source of truth.

```mermaid
erDiagram
    INVENTORY_ITEMS {
        uuid id PK
        uuid business_id FK
        uuid store_id FK
        uuid product_id FK
        int total_quantity
        int version
        timestamp updated_at
    }

    INVENTORY_BATCHES {
        uuid id PK
        uuid business_id FK
        uuid store_id FK
        uuid product_id FK
        varchar batch_number
        date expiry_date
        date mfg_date
        decimal mrp
        decimal purchase_rate
        int current_quantity
        boolean is_active
        timestamp created_at
    }

    STOCK_MOVEMENTS {
        uuid id PK
        uuid business_id FK
        uuid store_id FK
        uuid product_id FK
        uuid batch_id FK
        varchar movement_type
        int quantity
        int before_quantity
        int after_quantity
        varchar reference_type
        uuid reference_id
        varchar reason
        text notes
        uuid user_id FK
        timestamp created_at
    }

    INVENTORY_TRANSFERS {
        uuid id PK
        uuid business_id FK
        uuid source_store_id FK
        uuid destination_store_id FK
        varchar transfer_number UK
        varchar status
        varchar tracking_number
        uuid requested_by FK
        uuid approved_by FK
        uuid shipped_by FK
        uuid received_by FK
        timestamp created_at
    }

    TRANSFER_ITEMS {
        uuid id PK
        uuid transfer_id FK
        uuid product_id FK
        uuid source_batch_id FK
        int requested_quantity
        int shipped_quantity
        int received_quantity
    }

    INVENTORY_ITEMS ||--o{ INVENTORY_BATCHES : groups
    INVENTORY_BATCHES ||--o{ STOCK_MOVEMENTS : logs
    INVENTORY_TRANSFERS ||--o{ TRANSFER_ITEMS : lists
```

---

### 2.5 Point of Sale (POS), Sales & Customer Credit Ledger Schema

```mermaid
erDiagram
    CUSTOMERS {
        uuid id PK
        uuid business_id FK
        varchar name
        varchar phone
        varchar email
        varchar address
        varchar city
        varchar pincode
        decimal credit_limit
        decimal current_credit_balance
        varchar status
        timestamp created_at
    }

    CUSTOMER_LEDGER {
        uuid id PK
        uuid customer_id FK
        varchar transaction_type
        decimal debit_amount
        decimal credit_amount
        decimal balance_after
        varchar reference_type
        uuid reference_id
        text notes
        timestamp created_at
    }

    SALES {
        uuid id PK
        uuid business_id FK
        uuid store_id FK
        uuid customer_id FK
        varchar invoice_number UK
        decimal subtotal
        decimal discount_amount
        decimal tax_amount
        decimal net_amount
        varchar status
        varchar payment_status
        varchar doctor_name
        varchar prescription_number
        uuid created_by FK
        timestamp created_at
    }

    SALE_ITEMS {
        uuid id PK
        uuid sale_id FK
        uuid product_id FK
        uuid batch_id FK
        int quantity
        decimal unit_price
        decimal discount_percent
        decimal tax_rate
        decimal total_amount
    }

    SALE_PAYMENTS {
        uuid id PK
        uuid sale_id FK
        varchar payment_method
        decimal amount
        varchar reference_number
        timestamp created_at
    }

    SALE_RETURNS {
        uuid id PK
        uuid business_id FK
        uuid store_id FK
        uuid sale_id FK
        varchar return_number UK
        decimal refund_amount
        varchar refund_method
        text return_reason
        uuid created_by FK
        timestamp created_at
    }

    SALE_RETURN_ITEMS {
        uuid id PK
        uuid sale_return_id FK
        uuid sale_item_id FK
        uuid batch_id FK
        int quantity
        decimal refund_unit_price
        boolean restocked
    }

    CUSTOMERS ||--o{ CUSTOMER_LEDGER : tracks
    CUSTOMERS ||--o{ SALES : buys
    SALES ||--o{ SALE_ITEMS : items
    SALES ||--o{ SALE_PAYMENTS : tender
    SALES ||--o{ SALE_RETURNS : refunded_by
    SALE_RETURNS ||--o{ SALE_RETURN_ITEMS : line_returns
```

---

### 2.6 Subscriptions, Licensing & Content (CMS) Schema

```mermaid
erDiagram
    SUBSCRIPTIONS {
        uuid id PK
        uuid business_id FK UK
        varchar plan_tier
        varchar billing_cycle
        varchar status
        timestamp start_date
        timestamp valid_until
        boolean autopay_enabled
        timestamp updated_at
    }

    LICENSE_INVOICES {
        uuid id PK
        uuid business_id FK
        varchar invoice_number UK
        varchar tier
        varchar billing_cycle
        decimal subtotal
        decimal tax_amount
        decimal total_amount
        varchar razorpay_order_id UK
        varchar razorpay_payment_id
        varchar status
        timestamp paid_at
        timestamp created_at
    }

    COUPONS {
        uuid id PK
        varchar code UK
        varchar discount_type
        decimal discount_value
        decimal max_discount_amount
        timestamp valid_from
        timestamp valid_until
        int usage_limit
        int used_count
        boolean is_active
    }

    CMS_PAGES {
        uuid id PK
        varchar page_key UK
        varchar title
        text content_markdown
        varchar meta_description
        varchar updated_by
        timestamp updated_at
    }

    CAREER_JOBS {
        uuid id PK
        varchar title
        varchar department
        varchar location
        varchar employment_type
        text description
        text requirements
        varchar status
        timestamp created_at
    }

    JOB_APPLICATIONS {
        uuid id PK
        uuid job_id FK
        varchar full_name
        varchar email
        varchar phone
        varchar resume_url
        varchar status
        timestamp created_at
    }

    CAREER_JOBS ||--o{ JOB_APPLICATIONS : applications
```

---

### 2.7 Bulk Data Ingestion & Offline Sync Schema

```mermaid
erDiagram
    IMPORT_JOBS {
        uuid id PK
        uuid business_id FK
        uuid store_id FK
        varchar domain
        varchar filename
        varchar source_format
        int total_rows
        int valid_rows
        int error_rows
        varchar status
        uuid created_by FK
        timestamp created_at
    }

    IMPORT_ROWS {
        uuid id PK
        uuid job_id FK
        int row_index
        jsonb raw_data
        jsonb parsed_data
        varchar status
        text error_message
    }

    SYNC_EVENTS {
        uuid id PK
        varchar idempotency_key UK
        uuid device_id FK
        varchar event_type
        varchar status
        timestamp processed_at
    }

    SYNC_CHANGE_LOG {
        bigserial sequence_id PK
        uuid business_id FK
        uuid store_id FK
        varchar entity_type
        uuid entity_id
        varchar change_type
        jsonb entity_snapshot
        timestamp created_at
    }

    IMPORT_JOBS ||--o{ IMPORT_ROWS : parses
```

---

## 3. Object-Oriented Domain Class Diagrams

### 3.1 Sales & Billing Aggregate Class Diagram
Illustrates the encapsulation boundaries, rich domain behaviors, value objects, and domain events emitted during counter checkout.

```mermaid
classDiagram
    class Sale {
        -UUID id
        -TenantId businessId
        -StoreId storeId
        -CustomerId customerId
        -InvoiceNumber invoiceNumber
        -SaleStatus status
        -PaymentStatus paymentStatus
        -Money subtotal
        -Money discountTotal
        -Money taxTotal
        -Money netTotal
        -PrescriptionInfo prescriptionInfo
        -List~SaleItem~ items
        -List~SalePayment~ payments
        +addItem(Product product, Batch batch, Quantity qty, Money price)
        +applyDiscount(Discount discount)
        +addPayment(PaymentMethod method, Money amount)
        +completeSale(UserId cashier)
        +voidSale(UserId manager, String reason)
    }

    class SaleItem {
        -UUID id
        -UUID productId
        -UUID batchId
        -Quantity quantity
        -Money unitPrice
        -Percentage discountPercent
        -Percentage taxRate
        -Money lineTotal
        +calculateTotals()
    }

    class SalePayment {
        -UUID id
        -PaymentMethod paymentMethod
        -Money amount
        -String referenceNumber
    }

    class PrescriptionInfo {
        -String doctorName
        -String doctorRegistrationNumber
        -String prescriptionNumber
        -String patientName
        -String prescriptionDocumentUrl
        +boolean isValidForScheduleH()
    }

    class PaymentMethod {
        <<enumeration>>
        CASH
        CARD
        UPI
        CREDIT
    }

    class SaleStatus {
        <<enumeration>>
        DRAFT
        COMPLETED
        VOIDED
        RETURNED
    }

    Sale "1" *-- "1..*" SaleItem : contains
    Sale "1" *-- "1..*" SalePayment : tender
    Sale "1" *-- "0..1" PrescriptionInfo : validated_by
    Sale --> SaleStatus : has
    SalePayment --> PaymentMethod : uses
```

---

### 3.2 Inventory & Stock Movement Aggregate Class Diagram

```mermaid
classDiagram
    class InventoryItem {
        -UUID id
        -UUID businessId
        -UUID storeId
        -UUID productId
        -Quantity totalQuantity
        -Long version
        +recalculateTotal(List~InventoryBatch~ batches)
        +assertStockAvailable(Quantity requested)
    }

    class InventoryBatch {
        -UUID id
        -UUID businessId
        -UUID storeId
        -UUID productId
        -BatchNumber batchNumber
        -LocalDate expiryDate
        -LocalDate mfgDate
        -Money mrp
        -Money purchaseRate
        -Quantity currentQuantity
        -boolean isActive
        +boolean isExpired()
        +boolean isNearExpiry(int thresholdDays)
        +deductStock(Quantity qty)
        +restoreStock(Quantity qty)
    }

    class StockMovement {
        -UUID id
        -UUID businessId
        -UUID storeId
        -UUID productId
        -UUID batchId
        -MovementType movementType
        -Quantity quantityDelta
        -Quantity beforeQuantity
        -Quantity afterQuantity
        -ReferenceType referenceType
        -UUID referenceId
        -String reason
        -UUID userId
        -Instant timestamp
        +static StockMovement createSaleMovement(...)
        +static StockMovement createReceiptMovement(...)
    }

    class MovementType {
        <<enumeration>>
        PURCHASE_RECEIPT
        SALE
        SALE_RETURN
        TRANSFER_OUT
        TRANSFER_IN
        ADJUSTMENT_IN
        ADJUSTMENT_OUT
        EXPIRY_DUMP
    }

    InventoryItem "1" *-- "0..*" InventoryBatch : aggregates
    InventoryBatch "1" --> "0..*" StockMovement : history
    StockMovement --> MovementType : classified_by
```

---

### 3.3 Purchasing & Inwarding Aggregate Class Diagram

```mermaid
classDiagram
    class PurchaseOrder {
        -UUID id
        -TenantId businessId
        -StoreId storeId
        -SupplierId supplierId
        -OrderNumber orderNumber
        -POStatus status
        -LocalDate expectedDeliveryDate
        -Money totalAmount
        -List~PurchaseOrderItem~ items
        +confirmOrder()
        +cancelOrder(String reason)
        +recordReceiptProgress()
    }

    class GoodsReceiptNote {
        -UUID id
        -UUID purchaseOrderId
        -GRNNumber grnNumber
        -String supplierInvoiceNumber
        -GRNStatus status
        -List~GoodsReceiptItem~ items
        +addItem(BatchDetails batch, Quantity qty, Money rate)
        +postGRN(UserId receiver)
    }

    class GoodsReceiptItem {
        -UUID id
        -UUID productId
        -BatchNumber batchNumber
        -LocalDate expiryDate
        -Quantity receivedQuantity
        -Quantity freeQuantity
        -Money purchaseRate
        -Money mrp
    }

    PurchaseOrder "1" --> "0..*" GoodsReceiptNote : fulfills
    GoodsReceiptNote "1" *-- "1..*" GoodsReceiptItem : details
```

---

## 4. Advanced Algorithmic Flowcharts

### 4.1 Statutory Prescription & Narcotics (Schedule H/H1/X) Validation Flow

Ensures full adherence to the Indian Drugs and Cosmetics Act (1940). Pharmacists cannot bypass mandatory regulatory fields when dispensing scheduled antibiotics or narcotics.

```mermaid
flowchart TD
    Start["Item Scanned / Selected at POS"] --> CheckSchedule{"Product Schedule?"}
    
    CheckSchedule -- "NON_SCHEDULED (OTC)" --> AllowLineItem["Add directly to Bill Line Items"]
    
    CheckSchedule -- "SCHEDULE_H / H1 / X" --> CheckPrescription{"Prescription Info Provided?"}
    
    CheckPrescription -- "No" --> PromptModal["Display Mandatory Prescription Modal in UI"]
    PromptModal --> UserInput["Pharmacist enters: Doctor Reg #, Doctor Name, Patient Name"]
    
    UserInput --> ValidateReg{"Doctor Reg # Valid Format?"}
    ValidateReg -- "No" --> ErrorBlock["Error: Valid Medical Council Reg # Required"]
    ErrorBlock --> PromptModal

    ValidateReg -- "Yes" --> CheckNarcotic{"Is Schedule X (Narcotic)?"}
    
    CheckNarcotic -- "Yes" --> RequireUpload["Require Scanned Prescription Upload URL"]
    RequireUpload --> LogStatutory["Log into Government Narcotics Daily Register"]
    
    CheckNarcotic -- "No" --> LogScheduleH["Log into Statutory Schedule H/H1 Register"]
    
    LogScheduleH --> AllowLineItem
    LogStatutory --> AllowLineItem
```

---

### 4.2 Dynamic Pricing, Discount & Proration Calculation Flow

The exact computation pipeline executed when owners upgrade subscriptions or cashiers apply tiered discounts.

```mermaid
flowchart TD
    A["Initiate Upgrade (Target Tier & Cycle)"] --> B["Fetch Active Subscription & Current Plan Price"]
    B --> C["Compute Remaining Days on Current Plan"]
    C --> D["Calculate Proration Credit = (Current Price / Total Days) * Remaining Days"]
    
    D --> E["Calculate Target Tier Base Price (Monthly vs Annual)"]
    E --> F{"Coupon Code Provided?"}
    
    F -- "Yes" --> G{"Validate Coupon: Active & In-Date & Limit Available?"}
    G -- "Valid" --> H["Calculate Discount = min(Base * Percent, max_discount_amount)"]
    G -- "Invalid" --> I["Discount = Rs 0.00 (Notify User Invalid Code)"]
    F -- "No" --> I
    
    H --> J["Net Pre-Tax = max(0, Target Base - Proration Credit - Discount)"]
    I --> J
    
    J --> K["Compute GST @ 18% (CGST 9% + SGST 9% or IGST 18%)"]
    K --> L["Final Payable Amount = Net Pre-Tax + GST"]
    L --> M["Generate Razorpay Order Payload"]
```

---

### 4.3 Multi-Tenant Resolution & Execution Interceptor Flow

```mermaid
flowchart TD
    Req["Incoming HTTP Request"] --> F1["JwtAuthenticationFilter"]
    F1 --> F2{"Authorization Header Present?"}
    
    F2 -- "No" --> PublicCheck{"Is Route Public (/auth/login, /onboarding, /public/*)?"}
    PublicCheck -- "Yes" --> Permit["Proceed without Tenant Context"]
    PublicCheck -- "No" --> Err401["HTTP 401 Unauthorized"]
    
    F2 -- "Yes" --> F3["Extract Claims: userId, businessId, storeId, role"]
    F3 --> F4["Create TenantContext Object"]
    F4 --> F5["TenantContextHolder.setContext(context) (ThreadLocal)"]
    
    F5 --> Service["Execute Application Service"]
    Service --> Repo["Repository executes JPQL / SQL"]
    Repo --> SQL["Appends 'WHERE business_id = :businessId' automatically"]
    
    SQL --> Res["HTTP Response Generated"]
    Res --> Finally["Filter finally block: TenantContextHolder.clear()"]
```

---

## 5. Future Scope: What Is Yet to Be Implemented

While Inventra currently features a complete, battle-tested core across billing, inventory, multi-store logistics, subscriptions, and offline synchronization, several advanced platform capabilities are documented in the architecture roadmap for future release phases:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     INVENTRA FUTURE ROADMAP PHASES                     │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ PHASE F10: AI & OCR      │ PHASE F11: ENGAGEMENT    │ PHASE F12: B2B   │
│ - Universal PDF Ingest   │ - WhatsApp Business API  │ - Superstockist  │
│ - Vision OCR Challan Scn │ - Automated SMS Alerts   │   EDI Direct PO  │
│ - Supplier Format Learner│ - Refill Reminders       │ - Auto Reorder   │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ PHASE F13: GOVT DIGITAL  │ PHASE F14: HARDWARE      │ PHASE F15: MOBILE│
│ - ABDM Healthcare M1/M2  │ - WebUSB ESC/POS Printer │ - Kotlin/Android │
│ - National Health ID     │ - Serial Weighing Scale  │   Store Audit App│
│ - GST e-Way Bill & IRN   │ - Electronic Cash Drawer │ - Tablet POS App │
└──────────────────────────┴──────────────────────────┴──────────────────┘
```

---

### 5.1 AI-Powered PDF / OCR Invoice Ingestion
* **Current State**: Manual entry via Goods Receipt Note (GRN) or bulk CSV ingestion via `ImportController`.
* **Future Architecture**:
  1. Distributors email purchase bills as PDFs or cashiers photograph paper challans with mobile cameras.
  2. OCR pipeline (Tesseract / Google Cloud Vision / Gemini Vision) extracts table columns: Item Name, Batch, Expiry, MRP, Rate, HSN, and CGST/SGST.
  3. **Supplier Format Learning Engine**: Learns column coordinate maps for major distributors (e.g. Vardhman Pharma, Religare) to reach >99.5% optical parse accuracy.
  4. Automatically stages extracted rows in `import_rows` ready for 1-click confirmation into `goods_receipt_notes`.

---

### 5.2 WhatsApp & Automated SMS Patient Engagement
* **Current State**: Receipts printed via 80mm/58mm thermal printers or viewed on-screen.
* **Future Architecture**:
  1. **Paperless Green Invoicing**: On counter checkout, the system triggers a WhatsApp Business Cloud API webhook delivering a digital PDF invoice directly to the customer's phone.
  2. **Automated Chronic Refill Reminders**: For patients taking daily cardiovascular, diabetes, or hypertension maintenance drugs, background cron jobs calculate when their 30-day supply reaches day 27 and send automated replenishment notifications with 1-click WhatsApp order confirmation.

---

### 5.3 Ayushman Bharat Digital Mission (ABDM) & e-Prescription Network
* **Current State**: Manual doctor registration number logging into Schedule H statutory registers.
* **Future Architecture**:
  1. **ABHA (Ayushman Bharat Health Account) Integration**: Verification and generation of 14-digit national patient ABHA IDs at counter checkout.
  2. **National Health Claims Exchange (NHCX)**: Electronic transmission of cashless outpatient insurance claims directly from the pharmacy POS to insurance TPAs.
  3. **Direct e-Prescription Ingestion**: Pulls verified digital prescriptions directly from hospital EMRs via ABDM Milestone 1, 2, and 3 certified APIs.

---

### 5.4 Distributor B2B Electronic Data Interchange (EDI)
* **Current State**: Store generates PO PDF and emails/calls distributor manually.
* **Future Architecture**:
  1. Automated API ordering connecting directly to regional super-stockist ERPs (PharmEasy Wholesale, API Holdings, Ascent Health, Entero Healthcare).
  2. POs placed electronically inside Inventra are dispatched directly into the distributor's order queue with live delivery tracking.

---

### 5.5 Predictive AI Stock Replenishment & Demand Forecasting
* **Current State**: Threshold-based reorder alerts (`total_quantity <= reorder_level`).
* **Future Architecture**:
  1. Time-series machine learning models (ARIMA / Prophet / LightGBM) factoring in seasonality (e.g. monsoon dengue/paracetamol surges, winter allergy syrup surges).
  2. Dynamically calculates optimal **Economic Order Quantity (EOQ)** and suggests automated purchase orders before stockout risks emerge.

---

### 5.6 Direct Hardware Peripheral WebUSB / Serial Drivers
* **Current State**: Standard OS system print dialog (`window.print()`) rendering styled thermal receipts.
* **Future Architecture**:
  1. WebUSB and WebSerial API connectors allowing the browser and desktop app to bypass Windows/CUPS spoolers and fire raw binary **ESC/POS byte commands** directly to thermal printers (<100ms print latency).
  2. Hardware COM-port integration with electronic weighing scales (for Ayurvedic raw powders) and automated 24V cash drawer kick pulses.

---

### 5.7 Statutory GST e-Invoicing & e-Way Bill Integration
* **Current State**: Detailed GST calculation (CGST/SGST/IGST) with HSN codes; reports exportable to Excel/CSV for accountants.
* **Future Architecture**:
  1. Direct integration with the GST Network (GSTN) Invoice Registration Portal (IRP).
  2. For B2B wholesale transactions exceeding statutory turnover limits, the system uploads JSON invoices in real-time, receives a 64-character **Invoice Reference Number (IRN)**, and embeds the mandatory signed QR code onto the invoice PDF.

---

### 5.8 Native Android / iOS Field Application
* **Current State**: Web application (responsive React SPA) and Desktop application (Tauri + SQLite).
* **Future Architecture**:
  1. Dedicated React Native / Kotlin mobile application designed for smartphone camera barcode scanning.
  2. Allows warehouse staff to perform walking physical inventory audits, barcode shelf mapping, and inter-store delivery dispatch scanning.

---

## 6. Feature Matrix: Current State vs. Future Roadmap

| Subsystem | Feature / Capability | Implementation Status | Implementation Phase |
|---|---|---|---|
| **Identity & Security** | Multi-Tenancy Context & RBAC | ✅ **Complete in Production** | Core / V1 |
| **Identity & Security** | JWT Access & Refresh Token Family Rotation | ✅ **Complete in Production** | Core / V2 |
| **Catalog** | Product Master & Multiple Barcodes | ✅ **Complete in Production** | Core / V3 |
| **Catalog** | 50,000+ Global Medicine Master & 1-Click Import | ✅ **Complete in Production** | Core / V18 |
| **Purchasing** | PO & Goods Receipt (GRN) Inwarding | ✅ **Complete in Production** | Core / V4 |
| **Inventory** | Discrete Batch Expiry & FEFO Allocation | ✅ **Complete in Production** | Core / V3 |
| **Inventory** | Immutable Stock Movement Ledger | ✅ **Complete in Production** | Core / V3 |
| **Logistics** | Inter-Store Stock Transfer & In-Transit Tracking | ✅ **Complete in Production** | Core / V6 |
| **Point of Sale** | Fast Search (<15ms) & Pessimistic Lock Billing | ✅ **Complete in Production** | Core / V5 |
| **Point of Sale** | Split Tender (Cash / Card / UPI / Credit) | ✅ **Complete in Production** | Core / V5 |
| **Sales Returns** | Restock Validation & Credit Reversals | ✅ **Complete in Production** | Core / V5 |
| **Compliance** | Schedule H/H1/X Statutory Drug Registers | ✅ **Complete in Production** | Core / V5 |
| **Offline Sync** | Desktop SQLite Queuing & Idempotent Replay | ✅ **Complete in Production** | Core / V7 |
| **Data Ingestion** | CSV Bulk Upload with Error Review & Inline Fix | ✅ **Complete in Production** | Core / V11 |
| **Billing & Plans** | Razorpay Gateway, Proration & Coupons | ✅ **Complete in Production** | Core / V14–V17 |
| **AI / Ingestion** | Vision OCR Distributor Bill & Challan Scanner | 🔮 **Planned Future Scope** | Phase F10 |
| **Patient Comms** | WhatsApp Business Digital Bills & Refill Bot | 🔮 **Planned Future Scope** | Phase F11 |
| **Healthcare** | ABDM ABHA ID & National e-Prescription | 🔮 **Planned Future Scope** | Phase F13 |
| **Supply Chain** | Superstockist EDI Real-Time Auto-Ordering | 🔮 **Planned Future Scope** | Phase F12 |
| **Intelligence** | Predictive Machine Learning Demand Forecasting | 🔮 **Planned Future Scope** | Phase F12 |
| **Hardware** | WebUSB Direct ESC/POS Driver & Cash Drawer Kick | 🔮 **Planned Future Scope** | Phase F14 |
| **Compliance** | Real-Time GST e-Invoicing (IRN) & e-Way Bill | 🔮 **Planned Future Scope** | Phase F13 |
| **Mobile App** | Native Android/iOS Warehouse Barcode Scanner App | 🔮 **Planned Future Scope** | Phase F15 |

---

*Inventra Pharmacy ERP Documentation Suite — Authoritative Technical Reference.*
