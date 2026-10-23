# Inventra Pharmacy ERP — Backend REST API Specification & Architecture Reference

> **Authoritative Technical Documentation**  
> **Backend Framework**: Spring Boot 3.x / Java 21  
> **Database Engine**: PostgreSQL 16+ (Managed via Flyway Migrations `V1` through `V19`)  
> **Multi-Tenancy Model**: Logical Row-Level Tenancy (`business_id` & `store_id`) with `TenantContextHolder` ThreadLocal propagation  
> **Default Port**: `8080` (Base URL: `http://localhost:8080`)  
> **Related Architecture Guides**: [INVENTORY_LIFECYCLE.md](file:///d:/project/anti-gravity-projects/inventra/docs/INVENTORY_LIFECYCLE.md) | [TRANSITION_AND_FLOW_DIAGRAMS.md](file:///d:/project/anti-gravity-projects/inventra/docs/TRANSITION_AND_FLOW_DIAGRAMS.md) | [SYSTEM_DIAGRAMS_AND_FUTURE_ROADMAP.md](file:///d:/project/anti-gravity-projects/inventra/docs/SYSTEM_DIAGRAMS_AND_FUTURE_ROADMAP.md)

---

## Table of Contents

1. [Global Architecture & Conventions](#1-global-architecture--conventions)
   - [Authentication & Tenant Context Propagation](#authentication--tenant-context-propagation)
   - [Standard Request Headers](#standard-request-headers)
   - [Standard Response Envelopes](#standard-response-envelopes)
   - [Error Response Format (RFC 9457 Problem Details)](#error-response-format-rfc-9457-problem-details)
   - [Database Persistence, Concurrency & Locking Strategy](#database-persistence-concurrency--locking-strategy)
2. [Domain 1: Authentication & Identity (`/api/v1/auth`)](#2-domain-1-authentication--identity-apiv1auth)
3. [Domain 2: Staff & User Management (`/api/v1/users`)](#3-domain-2-staff--user-management-apiv1users)
4. [Domain 3: User Shortcut Profiles (`/api/v1/users/me/shortcut-profiles`)](#4-domain-3-user-shortcut-profiles-apiv1usersmeshortcut-profiles)
5. [Domain 4: Public Pharmacy Onboarding (`/api/v1/onboarding`)](#5-domain-4-public-pharmacy-onboarding-apiv1onboarding)
6. [Domain 5: Platform Admin Onboarding Approval (`/api/v1/admin/onboarding`)](#6-domain-5-platform-admin-onboarding-approval-apiv1adminonboarding)
7. [Domain 6: Multi-Store & Capacity Management (`/api/v1/stores`)](#7-domain-6-multi-store--capacity-management-apiv1stores)
8. [Domain 7: Device Identity & POS Registration (`/api/v1/devices`)](#8-domain-7-device-identity--pos-registration-apiv1devices)
9. [Domain 8: Subscriptions, Licensing & Payments (`/api/v1/subscription`)](#9-domain-8-subscriptions-licensing--payments-apiv1subscription)
10. [Domain 9: Platform Admin Subscription & Pricing Control (`/api/v1/admin/subscription`)](#10-domain-9-platform-admin-subscription--pricing-control-apiv1adminsubscription)
11. [Domain 10: Coupon Validation & Admin Management (`/api/v1/subscription/coupon` & `/api/v1/admin/subscription/coupons`)](#11-domain-10-coupon-validation--admin-management)
12. [Domain 11: Product Categories (`/api/v1/categories`)](#12-domain-11-product-categories-apiv1categories)
13. [Domain 12: Product Master Catalog (`/api/v1/products`)](#13-domain-12-product-master-catalog-apiv1products)
14. [Domain 13: Global Medicine Master & 1-Click Catalog Import (`/api/v1/catalog/global-medicines`)](#14-domain-13-global-medicine-master--1-click-catalog-import-apiv1catalogglobal-medicines)
15. [Domain 14: Platform Admin Global Medicines & Curation (`/api/v1/admin/medicines`)](#15-domain-14-platform-admin-global-medicines--curation-apiv1adminmedicines)
16. [Domain 15: Customer Management & Credit Ledger (`/api/v1/customers`)](#16-domain-15-customer-management--credit-ledger-apiv1customers)
17. [Domain 16: Suppliers & Master Pricing (`/api/v1/suppliers`)](#17-domain-16-suppliers--master-pricing-apiv1suppliers)
18. [Domain 17: Purchase Orders (`/api/v1/purchase-orders`)](#18-domain-17-purchase-orders-apiv1purchase-orders)
19. [Domain 18: Goods Receipt Notes / GRN (`/api/v1/goods-receipts`)](#19-domain-18-goods-receipt-notes--grn-apiv1goods-receipts)
20. [Domain 19: Supplier Purchase Invoices (`/api/v1/purchase-invoices`)](#20-domain-19-supplier-purchase-invoices-apiv1purchase-invoices)
21. [Domain 20: Pharmacy Inventory, Batches & FEFO (`/api/v1/inventory`)](#21-domain-20-pharmacy-inventory-batches--fefo-apiv1inventory)
22. [Domain 21: High-Performance POS Fast Search (`/api/v1/pos`)](#22-domain-21-high-performance-pos-fast-search-apiv1pos)
23. [Domain 22: Point of Sale, Checkout & Invoicing (`/api/v1/sales`)](#23-domain-22-point-of-sale-checkout--invoicing-apiv1sales)
24. [Domain 23: Sales Returns & Refunds (`/api/v1/returns` & `/api/v1/sales/{id}/returns`)](#24-domain-23-sales-returns--refunds-apiv1returns)
25. [Domain 24: Inter-Store Stock Transfers (`/api/v1/transfers`)](#25-domain-24-inter-store-stock-transfers-apiv1transfers)
26. [Domain 25: Offline-First Synchronization Engine (`/api/v1/sync`)](#26-domain-25-offline-first-synchronization-engine-apiv1sync)
27. [Domain 26: Pharmacy Intelligence & Natural Language NLP (`/api/v1/intelligence`)](#27-domain-26-pharmacy-intelligence--natural-language-nlp-apiv1intelligence)
28. [Domain 27: Business & Regulatory Reporting (`/api/v1/reports`)](#28-domain-27-business--regulatory-reporting-apiv1reports)
29. [Domain 28: In-App User Notifications (`/api/v1/notifications`)](#29-domain-28-in-app-user-notifications-apiv1notifications)
30. [Domain 29: Bulk Data Ingestion & CSV Import Engine (`/api/v1/imports`)](#30-domain-29-bulk-data-ingestion--csv-import-engine-apiv1imports)
31. [Domain 30: Careers Portal — Public & Admin (`/api/v1/public/careers` & `/api/v1/admin/careers`)](#31-domain-30-careers-portal--public--admin)
32. [Domain 31: CMS & Content Management (`/api/v1/public` & `/api/v1/admin/content`)](#32-domain-31-cms--content-management)
33. [Domain 32: Geographic & Pincode Utilities (`/api/v1/geo` & `/api/v1/pincode`)](#33-domain-32-geographic--pincode-utilities)
34. [Database Architecture & Flyway Schema Map](#34-database-architecture--flyway-schema-map)
35. [Summary of System Roles & Permissions](#35-summary-of-system-roles--permissions)

---

## 1. Global Architecture & Conventions

### Authentication & Tenant Context Propagation
1. **JWT Header**: Client sends `Authorization: Bearer <access_token>`.
2. **Context Resolution**: The `JwtAuthenticationFilter` intercepts requests, validates the signature using HMAC-SHA256, extracts claims (`userId`, `role`, `businessId`, `storeId`, `permissions`), creates a Spring Security `Authentication`, and binds `TenantContext` to `TenantContextHolder` (a `ThreadLocal` storage).
3. **Multi-Tenancy Guard**: Every tenant-scoped service queries data with `WHERE business_id = :businessId` and where applicable `store_id = :storeId`. This guarantees 100% strict cross-tenant data isolation.

### Standard Request Headers
| Header | Type | Description | Mandatory |
|---|---|---|---|
| `Authorization` | String | `Bearer <JWT_TOKEN>` | Yes (for protected endpoints) |
| `Content-Type` | String | `application/json` (or `multipart/form-data`) | Yes (on POST/PUT/PATCH) |
| `X-Device-Id` | UUID String | Hardware fingerprint UUID for POS terminals & offline sync | Optional / Contextual |
| `X-Client-Platform` | String | `DESKTOP`, `WEB`, or `ANDROID` | Optional |
| `Idempotency-Key` | String | Client-generated UUID preventing duplicate billing/imports | Optional / Recommended |

### Standard Response Envelopes
All REST endpoints encapsulate payloads in a unified JSON envelope:

#### 1. Single Entity / Command Response (`ApiResponse<T>`)
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-10-03T02:15:00.000Z"
}
```

#### 2. Paginated Response (`ApiResponse<Page<T>>`)
```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "page": {
      "size": 20,
      "number": 0,
      "totalElements": 154,
      "totalPages": 8
    }
  },
  "timestamp": "2026-10-03T02:15:00.000Z"
}
```

### Error Response Format (RFC 9457 Problem Details)
On error (`4xx`/`5xx`), Spring Boot returns an RFC 9457 compliant error structure:
```json
{
  "type": "https://api.inventra.com/errors/insufficient-stock",
  "title": "Insufficient Stock",
  "status": 422,
  "detail": "Requested 50 units for Batch B-101 but only 12 are available in store stock",
  "instance": "/api/v1/sales",
  "errorCode": "INSUFFICIENT_STOCK",
  "timestamp": "2026-10-03T02:15:00.000Z",
  "violations": []
}
```

### Database Persistence, Concurrency & Locking Strategy
- **Pessimistic Row Locking (`PESSIMISTIC_WRITE`)**: Utilized in stock deduction, billing allocations, and batch inventory updates (`SELECT ... FOR UPDATE`) to guarantee zero race conditions during parallel POS checkouts.
- **Optimistic Locking (`@Version`)**: Applied to high-velocity domain entities (`InventoryItem`, `Product`, `PurchaseOrder`) to prevent lost updates without blocking concurrent readers.
- **Audit Logging**: Domain events (`StockMovement`, `UserAuditLog`, `CustomerLedger`) are written immutably with append-only patterns.

---

## 2. Domain 1: Authentication & Identity (`/api/v1/auth`)

**Controller**: `AuthController.java`  
**Underlying Services**: `AuthService.java`, `OnboardingService.java`, `UserManagementService.java`  
**Database Tables Involved**: `users`, `businesses`, `stores`, `business_memberships`, `refresh_tokens`, `devices`, `user_audit_logs`, `password_reset_tokens`

---

### 2.1 Login
- **Method & Route**: `POST /api/v1/auth/login`
- **Access**: Public
- **Use Case**: Authenticates pharmacy owners, branch managers, pharmacists, or platform admins. Verifies password hashes (`BCrypt`), verifies tenant and user status (`ACTIVE`), checks device registration, records user audit logs, and returns access and refresh JWT tokens.
- **Request Payload**:
  ```json
  {
    "email": "owner@apollo-pharmacy.com",
    "password": "StrongPassword@123",
    "deviceType": "DESKTOP",
    "deviceId": "b47c0a6b-9cb1-4f11-8255-7d4041b31521",
    "deviceFingerprint": "hw-mac-00:1A:2B:3C:4D:5E",
    "platform": "Tauri-Desktop-Windows",
    "appVersion": "1.4.0"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "7c88b0ea-52f1-432d-94bb-e349dc17f8a1",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "user": {
        "id": "c1f77d33-4f90-4e20-80ea-340cb27d8250",
        "email": "owner@apollo-pharmacy.com",
        "fullName": "Dr. Rajesh Sharma",
        "role": "OWNER",
        "businessId": "8a32a677-96bf-4ea4-862d-05b1c0bc7fe3",
        "storeId": "3d37a28c-4f10-4ecb-9d41-47703358df8a",
        "permissions": ["BILLING_WRITE", "INVENTORY_READ", "SETTINGS_WRITE", "REPORTS_READ"]
      }
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `SELECT * FROM users WHERE email = :email`
  - Validates `BCryptPasswordEncoder.matches(raw, hash)`
  - `SELECT * FROM business_memberships WHERE user_id = :userId`
  - `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at, family_id)`
  - `INSERT INTO user_audit_logs (user_id, action, ip_address, user_agent, created_at)` (`LOGIN_SUCCESS`)

---

### 2.2 Owner Account Activation
- **Method & Route**: `POST /api/v1/auth/onboarding/activate`
- **Access**: Public (Requires Cryptographic Activation Token)
- **Use Case**: Once an onboarding pharmacy application is approved by the platform admin, an activation token is generated. The pharmacy owner uses this endpoint to establish their password and activate their account.
- **Request Payload**:
  ```json
  {
    "token": "act_88b1f41398c8430b80985da38fae1f",
    "password": "SecurePassword@2026",
    "confirmPassword": "SecurePassword@2026"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Owner account activated successfully. You can now log in."
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `SELECT * FROM activation_tokens WHERE token = :token AND used = false AND expires_at > NOW()`
  - `UPDATE users SET password_hash = :hash, status = 'ACTIVE' WHERE id = :userId`
  - `UPDATE activation_tokens SET used = true, used_at = NOW() WHERE id = :id`

---

### 2.3 Verify Staff Invitation Token
- **Method & Route**: `GET /api/v1/auth/invite/verify?token={token}`
- **Access**: Public
- **Use Case**: Invitee clicks on staff onboarding link. Frontend verifies if token is valid, active, and not expired before presenting password establishment UI.
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "inv_a8e2cb91b0f1",
      "email": "pharmacist@apollo.com",
      "businessName": "Apollo Pharmacy",
      "role": "PHARMACIST",
      "expired": false
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `SELECT * FROM user_invitations ui JOIN businesses b ON ui.business_id = b.id WHERE ui.token = :token`

---

### 2.4 Activate Invited Staff User
- **Method & Route**: `POST /api/v1/auth/invite/activate`
- **Access**: Public
- **Use Case**: Invited employee sets their name, phone, and password to initialize their account.
- **Request Payload**:
  ```json
  {
    "token": "inv_a8e2cb91b0f1",
    "fullName": "Amit Verma",
    "phone": "+919876543210",
    "password": "NewStaffPassword@123",
    "confirmPassword": "NewStaffPassword@123"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Staff account activated successfully. You can now log in."
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `UPDATE user_invitations SET status = 'ACCEPTED', accepted_at = NOW() WHERE token = :token`
  - `INSERT INTO users (id, email, password_hash, full_name, phone, status)`
  - `INSERT INTO business_memberships (business_id, user_id, role, is_active)`
  - `INSERT INTO store_assignments (store_id, user_id, is_primary)`

---

### 2.5 Refresh Access Token
- **Method & Route**: `POST /api/v1/auth/refresh`
- **Access**: Public
- **Use Case**: Client uses long-lived refresh token to obtain a new 15-minute access token. Implements Refresh Token Family Rotation to detect and prevent token reuse/replay attacks.
- **Request Payload**:
  ```json
  {
    "refreshToken": "7c88b0ea-52f1-432d-94bb-e349dc17f8a1"
  }
  ```
- **Response Payload (`200 OK`)**: Same as `AuthResponse` in login.
- **Database Operations**:
  - `SELECT * FROM refresh_tokens WHERE token_hash = :hash`
  - If already revoked: Triggers alert and revokes entire token family (`UPDATE refresh_tokens SET revoked = true WHERE family_id = :familyId`)
  - If valid: Revokes previous token and issues a new token pair.

---

### 2.6 Switch Store / Business Context
- **Method & Route**: `POST /api/v1/auth/switch-context`
- **Access**: Authenticated
- **Use Case**: Allows owners and multi-branch managers to switch active working store context without re-authenticating.
- **Request Payload**:
  ```json
  {
    "businessId": "8a32a677-96bf-4ea4-862d-05b1c0bc7fe3",
    "storeId": "7e491290-77a8-4cbf-84c1-bc7daef74332"
  }
  ```
- **Response Payload (`200 OK`)**: Returns updated JWT containing the new `storeId` claim.
- **Database Operations**:
  - `SELECT * FROM store_assignments WHERE user_id = :userId AND store_id = :storeId`

---

### 2.7 Logout & Session Invalidation
- **Endpoints**:
  - `POST /api/v1/auth/logout` (Revokes single refresh token family)
  - `POST /api/v1/auth/logout-all` (Revokes all active sessions across all devices)
  - `GET /api/v1/auth/sessions` (Lists all active sessions with IP, device type, last active time)
  - `POST /api/v1/auth/sessions/{id}/revoke` (Revokes specific session)
  - `POST /api/v1/auth/sessions/revoke-others` (Revokes all sessions except the current caller)
- **Database Operations**:
  - `UPDATE refresh_tokens SET revoked = true WHERE user_id = :userId`
  - `INSERT INTO user_audit_logs` (`LOGOUT`)

---

### 2.8 Password Reset & Management
- **Endpoints**:
  - `POST /api/v1/auth/password/change`: Requires current password. Updates hash in `users`.
  - `POST /api/v1/auth/password/reset-request`: Checks user existence, generates single-use reset token in `password_reset_tokens`, sends reset email.
  - `POST /api/v1/auth/password/reset-confirm`: Verifies token validity, updates `users.password_hash`, invalidates token.

---

## 3. Domain 2: Staff & User Management (`/api/v1/users`)

**Controller**: `UserController.java`  
**Underlying Service**: `UserManagementService.java`  
**Database Tables**: `users`, `business_memberships`, `store_assignments`, `user_invitations`

---

### 3.1 Invite Staff Member
- **Method & Route**: `POST /api/v1/users/invite`
- **Access**: `ROLE_PLATFORM_ADMIN`, `ROLE_OWNER`, `ROLE_MANAGER`
- **Use Case**: Store owner or manager sends an invitation to onboard a new employee (Pharmacist, Cashier, Inventory Operator) to a specific store.
- **Request Payload**:
  ```json
  {
    "email": "pharmacist.rahul@gmail.com",
    "role": "PHARMACIST",
    "storeId": "3d37a28c-4f10-4ecb-9d41-47703358df8a"
  }
  ```
- **Response Payload (`201 CREATED`)**:
  ```json
  {
    "success": true,
    "data": {
      "invitationId": "4bf02b54-1b48-4cb5-ae01-4475510dd180",
      "email": "pharmacist.rahul@gmail.com",
      "role": "PHARMACIST",
      "expiresAt": "2026-10-10T02:15:00.000Z",
      "invitationUrl": "https://inventra.com/invite?token=inv_a8e2cb91b0f1"
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - Validates tenant user capacity (`stores.max_users` limit check).
  - `INSERT INTO user_invitations (id, business_id, store_id, email, role, token, status, expires_at)`

---

### 3.2 List Business Staff
- **Method & Route**: `GET /api/v1/users`
- **Access**: Authenticated
- **Use Case**: Displays team roster, roles, assigned store branches, and account statuses.
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c1f77d33-4f90-4e20-80ea-340cb27d8250",
        "email": "owner@apollo-pharmacy.com",
        "fullName": "Dr. Rajesh Sharma",
        "phone": "+919876543211",
        "role": "OWNER",
        "status": "ACTIVE",
        "primaryStoreId": "3d37a28c-4f10-4ecb-9d41-47703358df8a",
        "primaryStoreName": "Apollo Main Branch",
        "createdAt": "2026-08-01T10:00:00.000Z"
      }
    ],
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `SELECT u.*, bm.role, sa.store_id FROM users u JOIN business_memberships bm ON u.id = bm.user_id LEFT JOIN store_assignments sa ON u.id = sa.user_id WHERE bm.business_id = :businessId`

---

## 4. Domain 3: User Shortcut Profiles (`/api/v1/users/me/shortcut-profiles`)

**Controller**: `UserShortcutProfileController.java`  
**Underlying Service**: `ShortcutProfileService.java`  
**Database Table**: `user_shortcut_profiles`

---

### Use Case
Provides keyboard shortcut configurations for high-speed POS billing terminals (e.g. `F1` for Search, `F2` for Batch Switch, `F8` for Split Payment, `F10` for Checkout).

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/users/me/shortcut-profiles` | Authenticated | List all shortcut profiles configured by user |
| `POST` | `/api/v1/users/me/shortcut-profiles` | Authenticated | Create a custom keymap profile |
| `GET` | `/api/v1/users/me/shortcut-profiles/{id}` | Authenticated | Get full keymap JSON for a profile |
| `PATCH` | `/api/v1/users/me/shortcut-profiles/{id}` | Authenticated | Update key bindings |
| `DELETE` | `/api/v1/users/me/shortcut-profiles/{id}` | Authenticated | Delete custom profile |
| `POST` | `/api/v1/users/me/shortcut-profiles/{id}/activate` | Authenticated | Sets profile as active default for this user |
| `POST` | `/api/v1/users/me/shortcut-profiles/{id}/reset` | Authenticated | Resets keymap back to Inventra standard pharmacy defaults |

- **Sample Keymap JSON Payload**:
  ```json
  {
    "name": "Superfast Counter 1",
    "keybindings": {
      "FOCUS_SEARCH": "F1",
      "OPEN_BATCH_MODAL": "F2",
      "ADD_CUSTOMER": "F3",
      "APPLY_DISCOUNT": "F4",
      "HOLD_BILL": "F6",
      "RECALL_BILL": "F7",
      "TENDER_CASH": "F9",
      "PRINT_LAST_INVOICE": "Ctrl+P"
    }
  }
  ```
- **Database Operations**:
  - `SELECT / INSERT / UPDATE / DELETE FROM user_shortcut_profiles WHERE user_id = :userId`
  - Atomic deactivation of other profiles when `activate` is invoked: `UPDATE user_shortcut_profiles SET is_active = false WHERE user_id = :userId`.

---

## 5. Domain 4: Public Pharmacy Onboarding (`/api/v1/onboarding`)

**Controller**: `PublicOnboardingController.java`  
**Underlying Service**: `OnboardingService.java`  
**Database Tables**: `onboarding_applications`, `businesses`, `users`

---

### 5.1 Check Availability
- **Method & Route**: `GET /api/v1/onboarding/check-availability?email=...&phone=...&drugLicenseNumber=...`
- **Access**: Public
- **Use Case**: Real-time validation during step-1 registration form filling to confirm email, phone, and Drug License Number (DL) are unique across the platform.
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "emailAvailable": true,
      "phoneAvailable": true,
      "drugLicenseAvailable": true
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `SELECT COUNT(1) FROM users WHERE email = :email`
  - `SELECT COUNT(1) FROM onboarding_applications WHERE drug_license_number = :dl AND status != 'REJECTED'`

---

### 5.2 Submit Pharmacy Onboarding Application
- **Method & Route**: `POST /api/v1/onboarding/apply`
- **Access**: Public
- **Use Case**: New pharmacy business submits its KYC, GST, Drug License, and store branch specifications for administrative compliance verification.
- **Request Payload**:
  ```json
  {
    "businessName": "MedPlus Health Services",
    "ownerName": "Suresh Reddy",
    "ownerEmail": "suresh@medplus.in",
    "ownerPhone": "+919848022338",
    "drugLicenseNumber": "DL-TG-2024-998811",
    "gstNumber": "36AABCM1234F1Z5",
    "panNumber": "AABCM1234F",
    "address": "Plot 42, Hitech City Main Rd",
    "city": "Hyderabad",
    "state": "Telangana",
    "pincode": "500081",
    "storeCount": 1
  }
  ```
- **Response Payload (`201 CREATED`)**:
  ```json
  {
    "success": true,
    "data": {
      "applicationId": "d981aa12-d04b-4b13-91b4-2da99f9c73e0",
      "status": "PENDING_REVIEW",
      "businessName": "MedPlus Health Services",
      "ownerEmail": "suresh@medplus.in",
      "submittedAt": "2026-10-03T02:15:00.000Z"
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `INSERT INTO onboarding_applications (id, business_name, owner_name, owner_email, owner_phone, drug_license_number, gst_number, pan_number, address, city, state, pincode, store_count, status, submitted_at, ip_address, user_agent)`

---

## 6. Domain 5: Platform Admin Onboarding Approval (`/api/v1/admin/onboarding`)

**Controller**: `AdminOnboardingController.java`  
**Underlying Service**: `OnboardingService.java`  
**Database Tables**: `onboarding_applications`, `businesses`, `stores`, `users`, `business_memberships`, `activation_tokens`, `subscriptions`

---

### 6.1 List & Inspect Applications
- **Endpoints**:
  - `GET /api/v1/admin/onboarding/applications?status=PENDING_REVIEW`: Paginated list of registrations awaiting compliance check.
  - `GET /api/v1/admin/onboarding/applications/{id}`: Detailed KYC and compliance metadata for a specific application.
- **Access**: `ROLE_PLATFORM_ADMIN`

---

### 6.2 Approve Application
- **Method & Route**: `POST /api/v1/admin/onboarding/applications/{id}/approve`
- **Access**: `ROLE_PLATFORM_ADMIN`
- **Use Case**: Compliance officer approves the application. Atomically provisions the multi-tenant architecture for this pharmacy and creates the initial 14-day TRIAL subscription.
- **Database Operations (Atomic Transaction)**:
  1. `UPDATE onboarding_applications SET status = 'APPROVED', reviewed_by = :adminId, reviewed_at = NOW() WHERE id = :id`
  2. `INSERT INTO businesses (id, name, registration_number, tax_id, status)` -> generates new tenant `business_id`.
  3. `INSERT INTO stores (id, business_id, name, code, is_headquarters, address, city, state, pincode)` -> provisions flagship store branch.
  4. `INSERT INTO users (id, email, full_name, phone, status)` with status `INACTIVE`.
  5. `INSERT INTO business_memberships (business_id, user_id, role)` (`OWNER`).
  6. `INSERT INTO store_assignments (store_id, user_id, is_primary)`.
  7. `INSERT INTO subscriptions (business_id, plan_tier, billing_cycle, status, start_date, valid_until)` (Defaults to `TRIAL`, 14-day validity).
  8. `INSERT INTO activation_tokens (token, user_id, expires_at)`.
  9. Fires an email/SMS notification to the owner containing their unique activation link.

---

### 6.3 Reject Application
- **Method & Route**: `POST /api/v1/admin/onboarding/applications/{id}/reject`
- **Access**: `ROLE_PLATFORM_ADMIN`
- **Request Payload**:
  ```json
  {
    "rejectionReason": "Drug license document photocopy is blurred and unreadable. Please re-submit."
  }
  ```
- **Database Operations**:
  - `UPDATE onboarding_applications SET status = 'REJECTED', rejection_reason = :reason, reviewed_by = :adminId, reviewed_at = NOW()`

---

## 7. Domain 6: Multi-Store & Capacity Management (`/api/v1/stores`)

**Controller**: `StoreController.java`  
**Underlying Service**: `StoreCapacityService.java`  
**Database Tables**: `stores`, `store_assignments`, `business_memberships`

---

### Endpoints
| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/stores/{storeId}/capacity` | Authenticated | Returns current store seat capacity (`maxUsers`, active assigned staff count, remaining seats) |
| `PATCH` | `/api/v1/stores/{storeId}/capacity` | `OWNER`, `PLATFORM_ADMIN` | Modifies maximum seat limit for store (enforced against subscription plan limits) |
| `POST` | `/api/v1/stores/{storeId}/assignments` | `OWNER`, `MANAGER`, `PLATFORM_ADMIN` | Links a business staff member to this store branch |

- **Sample Assignment Payload**:
  ```json
  {
    "businessMembershipId": "9b12a344-7f12-4c22-b511-9a40552b3121",
    "roleOverride": "CASHIER",
    "isPrimaryStore": true
  }
  ```
- **Database Operations**:
  - `SELECT COUNT(1) FROM store_assignments WHERE store_id = :storeId`
  - Validates `count < store.max_users`
  - `INSERT INTO store_assignments (id, store_id, user_id, role_override, is_primary, created_at)`

---

## 8. Domain 7: Device Identity & POS Registration (`/api/v1/devices`)

**Controller**: `DeviceController.java`  
**Underlying Service**: `DeviceService.java`  
**Database Tables**: `devices`, `user_audit_logs`

---

### 8.1 Register Device
- **Method & Route**: `POST /api/v1/devices/register`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`
- **Use Case**: Authorizes a physical workstation or handheld barcode scanner terminal. Devices must be registered before being allowed to submit offline sync transactions.
- **Request Payload**:
  ```json
  {
    "deviceName": "Counter 1 Desktop",
    "deviceType": "DESKTOP",
    "fingerprint": "hw-uuid-550e8400-e29b-41d4-a716-446655440000",
    "storeId": "3d37a28c-4f10-4ecb-9d41-47703358df8a"
  }
  ```
- **Database Operations**:
  - `INSERT INTO devices (id, business_id, store_id, device_name, device_type, fingerprint, status, registered_by, registered_at)`

---

### 8.2 List & Revoke Devices
- `GET /api/v1/devices`: Lists active terminals for the tenant business.
- `POST /api/v1/devices/{id}/revoke`: Revokes terminal access immediately (`UPDATE devices SET status = 'REVOKED'`). Invalidates any offline sync submissions from that hardware token.

---

## 9. Domain 8: Subscriptions, Licensing & Payments (`/api/v1/subscription`)

**Controller**: `SubscriptionController.java`  
**Underlying Service**: `SubscriptionService.java`  
**Database Tables**: `subscriptions`, `license_invoices`, `businesses`, `pricing_config`

---

### 9.1 Get Current Subscription
- **Method & Route**: `GET /api/v1/subscription/current`
- **Access**: Authenticated
- **Use Case**: Loads tenant licensing plan, expiration date, active quotas (stores, users, sync status), and renewal eligibility.
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "businessId": "8a32a677-96bf-4ea4-862d-05b1c0bc7fe3",
      "tier": "GROWTH",
      "billingCycle": "ANNUAL",
      "status": "ACTIVE",
      "validUntil": "2027-10-01T23:59:59.000Z",
      "autopayEnabled": true,
      "quota": {
        "maxStores": 3,
        "maxUsersPerStore": 10,
        "features": ["OFFLINE_SYNC", "INTELLIGENCE_AI", "MULTI_STORE_TRANSFERS", "ADVANCED_REPORTS"]
      }
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `SELECT * FROM subscriptions WHERE business_id = :businessId`

---

### 9.2 Upgrade / Change Plan Preview
- **Method & Route**: `GET /api/v1/subscription/upgrade-preview?targetTier=GROWTH&targetBillingCycle=ANNUAL`
- **Use Case**: Computes real prorated credit for remaining days on existing plan, applies active discount coupon if provided, and previews the net invoice amount before Razorpay checkout.
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "targetTier": "GROWTH",
      "targetBillingCycle": "ANNUAL",
      "baseAmount": 29990.00,
      "proratedCredit": 4500.00,
      "discountAmount": 2999.00,
      "taxAmount": 4048.38,
      "finalPayableAmount": 26539.38,
      "currency": "INR"
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```

---

### 9.3 Initiate Subscription Payment
- **Method & Route**: `POST /api/v1/subscription/payment/initiate`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_PLATFORM_ADMIN`
- **Use Case**: Creates a Razorpay Order ID and records a pending `license_invoices` record in the database.
- **Request Payload**:
  ```json
  {
    "targetTier": "GROWTH",
    "targetBillingCycle": "ANNUAL",
    "couponCode": "FESTIVE10"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "orderId": "order_Rzp12345678",
      "amount": 2653938,
      "currency": "INR",
      "keyId": "rzp_live_InventraKey99"
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `INSERT INTO license_invoices (id, business_id, invoice_number, tier, billing_cycle, subtotal, tax_amount, total_amount, razorpay_order_id, status, created_at)`

---

### 9.4 Verify Payment & Activate Tier
- **Method & Route**: `POST /api/v1/subscription/payment/verify`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_PLATFORM_ADMIN`
- **Use Case**: Receives Razorpay payment signature from client SDK, computes HMAC-SHA256 signature using the server webhook secret, and atomically transitions subscription to active.
- **Request Payload**:
  ```json
  {
    "razorpayOrderId": "order_Rzp12345678",
    "razorpayPaymentId": "pay_RzpPayment998877",
    "razorpaySignature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "targetTier": "GROWTH",
    "targetBillingCycle": "ANNUAL",
    "couponCode": "FESTIVE10"
  }
  ```
- **Database Operations (Atomic Transaction)**:
  1. Validates signature match.
  2. `UPDATE license_invoices SET razorpay_payment_id = :paymentId, status = 'PAID', paid_at = NOW() WHERE razorpay_order_id = :orderId`
  3. `UPDATE subscriptions SET plan_tier = :targetTier, billing_cycle = :cycle, status = 'ACTIVE', valid_until = NOW() + INTERVAL '1 YEAR' WHERE business_id = :businessId`
  4. If coupon used: `UPDATE coupons SET used_count = used_count + 1 WHERE code = :code`

---

### 9.5 Download Tax Invoice PDF
- **Method & Route**: `GET /api/v1/subscription/invoices/{invoiceId}/pdf`
- **Response**: Binary PDF Stream (`Content-Type: application/pdf; Content-Disposition: attachment; filename="Inventra-Invoice-...pdf"`)
- **Database Operations**:
  - `SELECT * FROM license_invoices li JOIN businesses b ON li.business_id = b.id WHERE li.id = :invoiceId`

---

## 10. Domain 9: Platform Admin Subscription & Pricing Control (`/api/v1/admin/subscription`)

**Controller**: `AdminSubscriptionController.java`  
**Underlying Service**: `SubscriptionService.java`  
**Access**: Strictly `ROLE_PLATFORM_ADMIN`

---

### Endpoints
| Method | Endpoint | Description | Database Persistence |
|---|---|---|---|
| `GET` | `/api/v1/admin/subscription/businesses` | Paginated listing of all platform tenants and active subscription tiers | `SELECT b.*, s.* FROM businesses b LEFT JOIN subscriptions s ...` |
| `GET` | `/api/v1/admin/subscription/businesses/{id}/details` | Full store telemetry: database disk usage, seat count, monthly turnover, invoices | Aggregated SQL querying `sales`, `users`, `stores`, `inventory_items` |
| `GET` | `/api/v1/admin/subscription/pricing` | View platform-wide pricing configuration for STARTER, GROWTH, ENTERPRISE tiers | `SELECT * FROM pricing_config` |
| `PUT` | `/api/v1/admin/subscription/pricing` | Dynamically update monthly/annual prices & feature flags | `UPDATE pricing_config SET monthly_price = ..., annual_price = ...` |
| `POST` | `/api/v1/admin/subscription/businesses/{id}/payment` | Manually mark offline bank transfer/NEFT payment as confirmed | `INSERT INTO license_invoices ...`, updates `subscriptions` |
| `POST` | `/api/v1/admin/subscription/businesses/{id}/autopay` | Enable/disable auto-renewal for a tenant | `UPDATE subscriptions SET autopay_enabled = :flag` |
| `GET` | `/api/v1/admin/subscription/invoices/{invoiceId}/pdf` | Download tax invoice for any platform tenant | Generates PDF on-the-fly |

---

## 11. Domain 10: Coupon Validation & Admin Management

**Controllers**: `CouponController.java` (`/api/v1/subscription/coupon`), `AdminCouponController.java` (`/api/v1/admin/subscription/coupons`)  
**Underlying Service**: `CouponService.java`  
**Database Table**: `coupons`

---

### 11.1 Validate Coupon (Tenant / Owner)
- **Method & Route**: `POST /api/v1/subscription/coupon/validate`
- **Access**: Authenticated
- **Request Payload**:
  ```json
  {
    "code": "LAUNCH50",
    "tier": "GROWTH",
    "billingCycle": "ANNUAL"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "valid": true,
      "code": "LAUNCH50",
      "discountType": "PERCENTAGE",
      "discountValue": 50.00,
      "maxDiscountAmount": 5000.00,
      "calculatedDiscount": 5000.00,
      "message": "Coupon applied successfully"
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `SELECT * FROM coupons WHERE code = :code AND is_active = true AND valid_from <= NOW() AND valid_until >= NOW()`
  - Verifies `used_count < usage_limit`.

---

### 11.2 Coupon Admin Management (Platform Admin)
- `GET /api/v1/admin/subscription/coupons`: List all coupons with redemption statistics.
- `POST /api/v1/admin/subscription/coupons`: Create new promotional coupon (`code`, `discountType`, `discountValue`, `maxDiscountAmount`, `validFrom`, `validUntil`, `usageLimit`).
- `PUT /api/v1/admin/subscription/coupons/{code}`: Update coupon parameters.
- `DELETE /api/v1/admin/subscription/coupons/{code}`: Soft-delete / deactivate coupon.

---

## 12. Domain 11: Product Categories (`/api/v1/categories`)

**Controller**: `CategoryController.java`  
**Underlying Service**: `CategoryService.java`  
**Database Table**: `categories`

---

### Endpoints
| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/categories` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR`, `CASHIER` | List active product categories for current business |
| `GET` | `/api/v1/categories/{id}` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR`, `CASHIER` | Get details of a single category |
| `POST` | `/api/v1/categories` | `OWNER`, `MANAGER` | Create a category |
| `PATCH` | `/api/v1/categories/{id}` | `OWNER`, `MANAGER` | Update name, description, or status |

- **Sample Create Category Request**:
  ```json
  {
    "name": "Antibiotics & Antimicrobials",
    "description": "Prescription oral and injectable antibiotic drugs"
  }
  ```
- **Database Operations**:
  - `INSERT INTO categories (id, business_id, name, description, is_active, created_at)`
  - Enforces `UNIQUE (business_id, name)` constraint.

---

## 13. Domain 12: Product Master Catalog (`/api/v1/products`)

**Controller**: `ProductController.java`  
**Underlying Service**: `ProductService.java`  
**Database Tables**: `products`, `product_identifiers`, `categories`

---

### 13.1 List & Search Products
- **Endpoints**:
  - `GET /api/v1/products`: Paginated list of business products.
  - `GET /api/v1/products/search?q={query}`: Fast query search by product name, generic molecule name, or manufacturer.
  - `POST /api/v1/products/search`: Structured search with store availability and category filters.
- **Request Payload (`POST /api/v1/products/search`)**:
  ```json
  {
    "query": "Amoxicillin",
    "categoryId": "304c44e1-254e-4f7d-a1c2-628d098e21aa",
    "storeId": "3d37a28c-4f10-4ecb-9d41-47703358df8a"
  }
  ```
- **Database Operations**:
  - `SELECT p.* FROM products p WHERE p.business_id = :businessId AND (p.name ILIKE :q OR p.generic_name ILIKE :q) AND p.is_active = true`

---

### 13.2 Create Product
- **Method & Route**: `POST /api/v1/products`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`
- **Use Case**: Registers a new product SKU into the pharmacy's catalog with regulatory Schedule flags and barcode mappings.
- **Request Payload**:
  ```json
  {
    "name": "Augmentin 625 Duo Tablet",
    "genericName": "Amoxicillin and Potassium Clavulanate",
    "categoryId": "304c44e1-254e-4f7d-a1c2-628d098e21aa",
    "manufacturer": "GlaxoSmithKline Pharmaceuticals Ltd",
    "hsnCode": "300410",
    "uom": "STRIP",
    "reorderLevel": 20,
    "schedule": "SCHEDULE_H",
    "isNarcotic": false,
    "barcodes": [
      { "type": "EAN_13", "value": "8901123456789" }
    ]
  }
  ```
- **Response Payload (`201 CREATED`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "e8e19572-8822-491e-9764-1804c861e680",
      "name": "Augmentin 625 Duo Tablet",
      "genericName": "Amoxicillin and Potassium Clavulanate",
      "schedule": "SCHEDULE_H",
      "uom": "STRIP",
      "identifiers": [
        { "id": "4b681992-df66-419b-a010-826c7d23d8c1", "type": "EAN_13", "value": "8901123456789" }
      ]
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - `INSERT INTO products (id, business_id, category_id, name, generic_name, manufacturer, hsn_code, uom, reorder_level, schedule, is_narcotic, is_active, version)`
  - `INSERT INTO product_identifiers (id, product_id, identifier_type, identifier_value)`

---

### 13.3 Add Barcode / Identifier to Product
- **Method & Route**: `POST /api/v1/products/{id}/identifiers`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`
- **Request Payload**:
  ```json
  {
    "identifierType": "BARCODE",
    "identifierValue": "8904001122334"
  }
  ```
- **Database Operations**:
  - `INSERT INTO product_identifiers (id, product_id, identifier_type, identifier_value)`
  - Enforces `UNIQUE (identifier_type, identifier_value)`.

---

## 14. Domain 13: Global Medicine Master & 1-Click Catalog Import (`/api/v1/catalog/global-medicines`)

**Controller**: `GlobalMedicineController.java`  
**Underlying Service**: `GlobalMedicineService.java`  
**Database Tables**: `global_medicines`, `products`, `product_identifiers`

---

### 14.1 Search Global Verified Medicine Master
- **Method & Route**: `GET /api/v1/catalog/global-medicines?query=dolo`
- **Access**: Authenticated Staff
- **Use Case**: Standardized central database containing 50,000+ pre-verified pharmaceutical formulations in India (accurate HSN codes, default GST rates, Schedules H/H1/X, manufacturers, salt compositions). Eliminates manual typing for pharmacists.
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "content": [
        {
          "id": "7139f41b-4d76-46c8-8924-a21235b2e911",
          "name": "Dolo 650mg Tablet",
          "genericName": "Paracetamol (650mg)",
          "manufacturer": "Micro Labs Ltd",
          "category": "Analgesic & Antipyretic",
          "dosageForm": "TABLET",
          "strength": "650mg",
          "schedule": "NON_SCHEDULED",
          "defaultGstRate": 12.00,
          "defaultHsnCode": "300490"
        }
      ]
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```

---

### 14.2 1-Click Quick Import to Store Catalog
- **Method & Route**: `POST /api/v1/catalog/global-medicines/{id}/quick-import`
- **Access**: Authenticated Staff
- **Use Case**: Pharmacist clicks "Add to My Store" on any verified global medicine. Automatically copies product attributes into the tenant's private `products` table in under 50 milliseconds without prompting forms.
- **Database Operations (Atomic Transaction)**:
  1. `SELECT * FROM global_medicines WHERE id = :id`
  2. Checks if product already imported into tenant: `SELECT id FROM products WHERE business_id = :businessId AND name = :name`
  3. `INSERT INTO products (business_id, name, generic_name, manufacturer, hsn_code, schedule, default_gst_rate, is_active)`
  4. Returns the created `ProductResponse`.

---

### 14.3 Get Imported Global IDs
- **Method & Route**: `GET /api/v1/catalog/global-medicines/imported-ids`
- **Use Case**: Allows UI to render "Already in Catalog" badges in the global search interface.
- **Database Operations**:
  - `SELECT p.name FROM products p WHERE p.business_id = :businessId` matches against `global_medicines.name`.

---

## 15. Domain 14: Platform Admin Global Medicines & Curation (`/api/v1/admin/medicines`)

**Controller**: `AdminGlobalMedicineController.java`  
**Underlying Service**: `GlobalMedicineService.java`  
**Access**: Strictly `ROLE_PLATFORM_ADMIN`  
**Database Tables**: `global_medicines`, `global_medicine_suggestions`

---

### 15.1 Silent Suggestion Pipeline
When a pharmacist manually types an unknown medicine at the counter, Inventra automatically logs a row in `global_medicine_suggestions`. The platform administration team curates, approves, or rejects these crowdsourced suggestions.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/medicines/suggestions` | Paginated list of uncurated suggestions from all pharmacy counters |
| `GET` | `/api/v1/admin/medicines/suggestions/count` | Returns badge count of pending unapproved suggestions |
| `POST` | `/api/v1/admin/medicines/suggestions/{id}/approve` | Promotes suggestion into verified platform master catalog `global_medicines` |
| `POST` | `/api/v1/admin/medicines/suggestions/{id}/reject` | Rejects suggestion with compliance reason |
| `POST` | `/api/v1/admin/medicines/import-csv` | Bulk CSV ingestion endpoint uploading 50,000+ formulations |
| `GET` | `/api/v1/admin/medicines/csv-template` | Downloads official CSV bulk formatting template |

- **Sample CSV Import Multipart Request**:
  - `POST /api/v1/admin/medicines/import-csv`
  - `Content-Type: multipart/form-data`
  - Part: `file: medicines_master_2026.csv`
- **Database Operations**:
  - Performs batched bulk inserts into `global_medicines` (batches of 1,000 rows).

---

## 16. Domain 15: Customer Management & Credit Ledger (`/api/v1/customers`)

**Controller**: `CustomerController.java`  
**Underlying Service**: `CustomerService.java`  
**Database Tables**: `customers`, `customer_ledger`, `sales`, `sale_returns`

---

### 16.1 Create Customer
- **Method & Route**: `POST /api/v1/customers`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_CASHIER`
- **Use Case**: Registers a retail patient or B2B customer with credit limits and GSTIN.
- **Request Payload**:
  ```json
  {
    "name": "Sunita Patil",
    "phone": "+919822011223",
    "email": "sunita.patil@gmail.com",
    "address": "Flat 302, Green Valley Apartments",
    "city": "Pune",
    "pincode": "411038",
    "gstNumber": null,
    "dlNumber": null,
    "creditLimit": 5000.00
  }
  ```
- **Database Operations**:
  - `INSERT INTO customers (id, business_id, name, phone, email, address, city, pincode, credit_limit, current_credit_balance, status, created_by, created_at)`

---

### 16.2 Customer Search & History
- `GET /api/v1/customers/search?q={phone_or_name}`: Fast lookup at POS billing counter (returns within 15ms).
- `GET /api/v1/customers/{id}/sales`: Paginated purchase history and invoices for patient.
- `GET /api/v1/customers/{id}/returns`: Return and refund history.
- **Database Operations**:
  - `SELECT * FROM sales WHERE business_id = :businessId AND customer_id = :customerId ORDER BY created_at DESC`

---

## 17. Domain 16: Suppliers & Master Pricing (`/api/v1/suppliers`)

**Controller**: `SupplierController.java`  
**Underlying Service**: `SupplierService.java`  
**Database Tables**: `suppliers`, `supplier_products`

---

### 17.1 Create Supplier
- **Method & Route**: `POST /api/v1/suppliers`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`
- **Request Payload**:
  ```json
  {
    "name": "Venkateshwara Pharma Distributors",
    "code": "SUP-VKP-01",
    "gstin": "27AAACV1234D1Z8",
    "dlNumber": "20B-MH-123456",
    "contactPerson": "Ramesh Gupta",
    "phone": "+919820033445",
    "email": "orders@vkpharma.com",
    "paymentTermsDays": 30,
    "address": "Shop 12, Wholesale Drug Market, Mumbai"
  }
  ```
- **Database Operations**:
  - `INSERT INTO suppliers (id, business_id, name, code, gstin, dl_number, contact_person, phone, email, payment_terms_days, address, is_active, created_at)`

---

### 17.2 Map Supplier Products & Contract Rates
- **Method & Route**: `POST /api/v1/suppliers/{id}/products`
- **Request Payload**:
  ```json
  {
    "productId": "e8e19572-8822-491e-9764-1804c861e680",
    "supplierProductCode": "VK-AUG-625",
    "purchasePrice": 145.50,
    "taxRate": 12.00
  }
  ```
- **Database Operations**:
  - `INSERT INTO supplier_products (id, business_id, supplier_id, product_id, supplier_product_code, purchase_price, tax_rate)`
  - Enforces `UNIQUE (supplier_id, product_id)`.

---

## 18. Domain 17: Purchase Orders (`/api/v1/purchase-orders`)

**Controller**: `PurchaseOrderController.java`  
**Underlying Service**: `PurchaseOrderService.java`  
**Database Tables**: `purchase_orders`, `purchase_order_items`, `suppliers`

---

### 18.1 Create Purchase Order (PO)
- **Method & Route**: `POST /api/v1/purchase-orders`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`
- **Use Case**: Pharmacy creates an official purchase procurement order for a pharmaceutical distributor.
- **Request Payload**:
  ```json
  {
    "supplierId": "5c9044a1-7788-4e12-b102-aa77bb88cc99",
    "storeId": "3d37a28c-4f10-4ecb-9d41-47703358df8a",
    "expectedDeliveryDate": "2026-10-10",
    "notes": "Urgent stock replenishment",
    "items": [
      {
        "productId": "e8e19572-8822-491e-9764-1804c861e680",
        "quantity": 100,
        "unitPrice": 145.50,
        "taxRate": 12.00
      }
    ]
  }
  ```
- **Database Operations**:
  - `INSERT INTO purchase_orders (id, business_id, store_id, supplier_id, order_number, status, total_amount, tax_amount, created_at)` (Status starts as `DRAFT`).
  - Batch insert into `purchase_order_items`.

---

### 18.2 PO Lifecycle Actions
- `POST /api/v1/purchase-orders/{id}/confirm`: Status -> `CONFIRMED`.
- `POST /api/v1/purchase-orders/{id}/cancel`: Status -> `CANCELLED` (Requires cancellation reason).
- `POST /api/v1/purchase-orders/{id}/close`: Status -> `CLOSED` (Once all items received via GRN).

---

## 19. Domain 18: Goods Receipt Notes / GRN (`/api/v1/goods-receipts`)

**Controller**: `GoodsReceiptController.java`  
**Underlying Service**: `GoodsReceiptService.java`  
**Database Tables**: `goods_receipt_notes`, `goods_receipt_items`, `inventory_items`, `inventory_batches`, `stock_movements`, `purchase_orders`

---

### 19.1 Create Draft GRN
- **Method & Route**: `POST /api/v1/goods-receipts`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_INVENTORY_OPERATOR`
- **Use Case**: Warehouse or pharmacy operator unboxes shipments, verifies physical batch numbers, manufacturing dates, expiry dates, and MRPs against the delivery challan.
- **Request Payload**:
  ```json
  {
    "purchaseOrderId": "a1846b01-f112-4d2a-89a1-00aa11bb22cc",
    "supplierInvoiceNumber": "INV-VKP-9921",
    "supplierInvoiceDate": "2026-10-02",
    "items": [
      {
        "purchaseOrderItemId": "31bb7c89-21da-45e1-89a1-5500aa112233",
        "productId": "e8e19572-8822-491e-9764-1804c861e680",
        "batchNumber": "AUG-B2026",
        "expiryDate": "2028-09-30",
        "mfgDate": "2026-08-01",
        "mrp": 210.00,
        "purchaseRate": 145.50,
        "receivedQuantity": 100,
        "freeQuantity": 5,
        "taxRate": 12.00
      }
    ]
  }
  ```
- **Database Operations**:
  - `INSERT INTO goods_receipt_notes (id, business_id, store_id, supplier_id, purchase_order_id, grn_number, status, created_at)` (`DRAFT`).
  - Batch insert into `goods_receipt_items`.

---

### 19.2 Post GRN & Update Inventory
- **Method & Route**: `POST /api/v1/goods-receipts/{id}/post`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_INVENTORY_OPERATOR`
- **Use Case**: Posts and locks the GRN. This is the **critical inventory boundary** that officially adds stock to store batches and recalculates weighted average cost.
- **Database Operations (Atomic Transaction)**:
  1. `UPDATE goods_receipt_notes SET status = 'POSTED', posted_at = NOW(), posted_by = :userId WHERE id = :id`
  2. For each item in GRN:
     - Check or create `inventory_items` record:
       ```sql
       INSERT INTO inventory_items (business_id, store_id, product_id, total_quantity)
       VALUES (:bId, :sId, :pId, :qty)
       ON CONFLICT (store_id, product_id)
       DO UPDATE SET total_quantity = inventory_items.total_quantity + :qty;
       ```
     - Create or update `inventory_batches`:
       ```sql
       INSERT INTO inventory_batches (business_id, store_id, product_id, batch_number, expiry_date, mfg_date, mrp, purchase_rate, current_quantity, is_active)
       VALUES (:bId, :sId, :pId, :batchNo, :exp, :mfg, :mrp, :rate, :qty, true);
       ```
     - Write immutable ledger movement to `stock_movements`:
       ```sql
       INSERT INTO stock_movements (business_id, store_id, product_id, batch_id, movement_type, quantity, reference_id, reference_type, notes)
       VALUES (:bId, :sId, :pId, :batchId, 'PURCHASE_RECEIPT', :qty, :grnId, 'GOODS_RECEIPT', 'GRN Received');
       ```
  3. Updates linked `purchase_orders.status` to `PARTIALLY_RECEIVED` or `COMPLETED`.

---

## 20. Domain 19: Supplier Purchase Invoices (`/api/v1/purchase-invoices`)

**Controller**: `PurchaseInvoiceController.java`  
**Underlying Service**: `PurchaseInvoiceService.java`  
**Database Tables**: `purchase_invoices`, `purchase_invoice_items`, `suppliers`

---

### Endpoints
| Method | Endpoint | Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/purchase-invoices` | `OWNER`, `MANAGER` | Filterable list by store, supplier, due date, payment status |
| `GET` | `/api/v1/purchase-invoices/{id}` | `OWNER`, `MANAGER` | Full invoice breakdown with tax schedule |
| `POST` | `/api/v1/purchase-invoices` | `OWNER`, `MANAGER` | Match GRN to bill, record tax breakdown |
| `POST` | `/api/v1/purchase-invoices/{id}/post` | `OWNER`, `MANAGER` | Locks invoice and records liability in Accounts Payable ledger |
| `POST` | `/api/v1/purchase-invoices/{id}/cancel` | `OWNER`, `MANAGER` | Cancels draft invoice |

- **Database Operations**:
  - `INSERT INTO purchase_invoices (id, business_id, store_id, supplier_id, invoice_number, invoice_date, due_date, total_amount, tax_amount, status)`
  - When posted: Updates `suppliers.current_balance` for financial reporting.

---

## 21. Domain 20: Pharmacy Inventory, Batches & FEFO (`/api/v1/inventory`)

**Controller**: `InventoryController.java`  
**Underlying Service**: `InventoryService.java`  
**Database Tables**: `inventory_items`, `inventory_batches`, `stock_movements`

---

### 21.1 FEFO Batch Allocation (First-Expiry-First-Out)
- **Method & Route**: `GET /api/v1/inventory/batches/fefo?productId={productId}&storeId={storeId}`
- **Access**: Authenticated Staff
- **Use Case**: **Mandatory Pharmacy Rule**: Medicine batches expiring earliest must be dispensed first. Returns active batches sorted strictly by `expiry_date ASC` having `current_quantity > 0`.
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "batchId": "a17721a9-b912-4211-8812-771122334455",
        "batchNumber": "AUG-B2025",
        "expiryDate": "2026-12-31",
        "mrp": 205.00,
        "availableQuantity": 14,
        "daysUntilExpiry": 89,
        "isNearExpiry": true
      },
      {
        "batchId": "b28832b0-c023-5322-9923-882233445566",
        "batchNumber": "AUG-B2026",
        "expiryDate": "2028-09-30",
        "mrp": 210.00,
        "availableQuantity": 105,
        "daysUntilExpiry": 727,
        "isNearExpiry": false
      }
    ],
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  ```sql
  SELECT * FROM inventory_batches
  WHERE business_id = :businessId 
    AND store_id = :storeId 
    AND product_id = :productId 
    AND current_quantity > 0 
    AND is_active = true
  ORDER BY expiry_date ASC;
  ```

---

### 21.2 Manual Stock Adjustments
- **Method & Route**: `POST /api/v1/inventory/adjustments`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_INVENTORY_OPERATOR`
- **Use Case**: Used for inventory shrinkage, breakage, expired medicine dumping, or physical audit reconciliation.
- **Request Payload**:
  ```json
  {
    "productId": "e8e19572-8822-491e-9764-1804c861e680",
    "batchId": "a17721a9-b912-4211-8812-771122334455",
    "adjustmentType": "DECREASE",
    "quantity": 2,
    "reason": "DAMAGED",
    "notes": "Bottle broken during shelf cleaning"
  }
  ```
- **Database Operations (Atomic Transaction)**:
  1. `SELECT * FROM inventory_batches WHERE id = :batchId FOR UPDATE` (Pessimistic Row Lock).
  2. `UPDATE inventory_batches SET current_quantity = current_quantity - :qty WHERE id = :batchId`.
  3. `UPDATE inventory_items SET total_quantity = total_quantity - :qty WHERE store_id = :storeId AND product_id = :productId`.
  4. `INSERT INTO stock_movements (business_id, store_id, product_id, batch_id, movement_type, quantity, before_quantity, after_quantity, reason, notes, user_id)` (`ADJUSTMENT_OUT`).

---

### 21.3 Expiry Risk & Low Stock Queries
- `GET /api/v1/inventory?lowStockOnly=true`: Returns products where `total_quantity <= reorder_level`.
- `GET /api/v1/inventory/batches?expiringWithinDays=90`: Returns batches expiring within 90 days.
- `GET /api/v1/inventory/batches?expiredOnly=true`: Returns batches where `expiry_date < CURRENT_DATE`.

---

## 22. Domain 21: High-Performance POS Fast Search (`/api/v1/pos`)

**Controller**: `PosSearchController.java`  
**Underlying Service**: `PosSearchService.java`  
**Database Tables**: `products`, `product_identifiers`, `inventory_batches`, `inventory_items`

---

### Fast Search
- **Method & Route**: `GET /api/v1/pos/products/search?q={query}&storeId={storeId}`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_CASHIER`
- **Use Case**: **Ultra-low latency counter search** optimized for barcode scanning and typeahead (<15ms execution time). Matches barcode directly or performs case-insensitive prefix search on drug brand/molecule. Automatically embeds real-time FEFO batch pricing and available stock.
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "content": [
        {
          "productId": "e8e19572-8822-491e-9764-1804c861e680",
          "name": "Augmentin 625 Duo Tablet",
          "genericName": "Amoxicillin and Potassium Clavulanate",
          "uom": "STRIP",
          "schedule": "SCHEDULE_H",
          "totalStock": 119,
          "activeBatches": [
            {
              "batchId": "a17721a9-b912-4211-8812-771122334455",
              "batchNumber": "AUG-B2025",
              "expiryDate": "2026-12-31",
              "mrp": 205.00,
              "availableQuantity": 14
            }
          ]
        }
      ]
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - Leverages PostgreSQL Trigram / B-Tree indices on `products(name)`, `products(generic_name)`, and `product_identifiers(identifier_value)`.
  - Joins `inventory_batches` filtering by `store_id = :storeId AND current_quantity > 0`.

---

## 23. Domain 22: Point of Sale, Checkout & Invoicing (`/api/v1/sales`)

**Controller**: `SaleController.java`  
**Underlying Service**: `SaleService.java`  
**Database Tables**: `sales`, `sale_items`, `sale_payments`, `inventory_batches`, `inventory_items`, `stock_movements`, `customers`, `customer_ledger`

---

### 23.1 POS Checkout & Sale Completion
- **Method & Route**: `POST /api/v1/sales`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_CASHIER`
- **Use Case**: Central pharmacy billing transaction. Processes item allocations, verifies stock under lock, validates prescription rules for Schedule H/X drugs, calculates tax & discounts, records payments (Split Cash/Card/UPI/Credit), deducts inventory, and prints invoice.
- **Request Payload**:
  ```json
  {
    "storeId": "3d37a28c-4f10-4ecb-9d41-47703358df8a",
    "customerId": "8f117c22-b01a-4d22-9901-aa1122334455",
    "customerName": "Sunita Patil",
    "customerPhone": "+919822011223",
    "doctorName": "Dr. V. K. Deshmukh (Reg: MH-44321)",
    "prescriptionNumber": "RX-2026-1002",
    "items": [
      {
        "productId": "e8e19572-8822-491e-9764-1804c861e680",
        "batchId": "a17721a9-b912-4211-8812-771122334455",
        "quantity": 2,
        "unitPrice": 205.00,
        "discountPercent": 5.0,
        "taxRate": 12.00
      }
    ],
    "payments": [
      {
        "paymentMethod": "UPI",
        "amount": 389.50,
        "referenceNumber": "UPI/20261003/99887766"
      }
    ],
    "discountAmount": 0.00,
    "notes": "Delivered at counter"
  }
  ```
- **Response Payload (`201 CREATED`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "f5e18239-1144-4cb1-8012-778899aabbcc",
      "invoiceNumber": "INV-2026-000412",
      "status": "COMPLETED",
      "subtotal": 410.00,
      "discountTotal": 20.50,
      "taxTotal": 41.73,
      "netTotal": 389.50,
      "paymentStatus": "PAID",
      "createdAt": "2026-10-03T02:15:00.000Z"
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations (Crucial Atomic Transaction with Row Locking)**:
  1. For each item in sale:
     - `SELECT current_quantity FROM inventory_batches WHERE id = :batchId FOR UPDATE`
     - Asserts `current_quantity >= requested_quantity` (Throws `INSUFFICIENT_STOCK` error if false).
     - `UPDATE inventory_batches SET current_quantity = current_quantity - :qty WHERE id = :batchId`
     - `UPDATE inventory_items SET total_quantity = total_quantity - :qty WHERE store_id = :storeId AND product_id = :productId`
     - `INSERT INTO stock_movements (business_id, store_id, product_id, batch_id, movement_type, quantity, reference_id, reference_type)` (`SALE`).
  2. `INSERT INTO sales (id, business_id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, net_amount, status, payment_status, doctor_name, prescription_number, created_by, created_at)`
  3. Batch insert into `sale_items`.
  4. Batch insert into `sale_payments`.
  5. If `paymentMethod == 'CREDIT'`:
     - Checks customer credit limit: `current_credit_balance + creditAmount <= credit_limit`.
     - `UPDATE customers SET current_credit_balance = current_credit_balance + :creditAmount WHERE id = :customerId`
     - `INSERT INTO customer_ledger (customer_id, transaction_type, debit_amount, credit_amount, balance_after, reference_id)`
  6. Generates sync change log entry if offline sync active.

---

### 23.2 Invoice & Receipt Printing
- `GET /api/v1/sales/{id}/invoice`: Returns full formal GST tax invoice details with CGST/SGST breakdown.
- `GET /api/v1/sales/{id}/receipt`: Returns thermal 80mm/58mm formatted POS receipt string.
- `POST /api/v1/sales/{id}/void`: Voids draft/unpaid sale.

---

## 24. Domain 23: Sales Returns & Refunds (`/api/v1/returns`)

**Controller**: `SaleReturnController.java`  
**Underlying Service**: `SaleReturnService.java`  
**Database Tables**: `sale_returns`, `sale_return_items`, `sales`, `inventory_batches`, `inventory_items`, `stock_movements`, `customer_ledger`

---

### 24.1 Process Sale Return
- **Method & Route**: `POST /api/v1/sales/{id}/returns`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_CASHIER`
- **Use Case**: Patient returns unused or defective medicine strips. Verifies original purchase invoice, calculates refund amount, optionally restocks the batch, and emits refund ledger records.
- **Request Payload**:
  ```json
  {
    "returnReason": "Customer bought incorrect dosage prescribed by doctor",
    "refundPaymentMethod": "CASH",
    "items": [
      {
        "saleItemId": "8a110022-7711-4b22-9988-cc1122334455",
        "batchId": "a17721a9-b912-4211-8812-771122334455",
        "returnQuantity": 1,
        "refundUnitPrice": 194.75,
        "restock": true
      }
    ]
  }
  ```
- **Database Operations (Atomic Transaction)**:
  1. `SELECT * FROM sale_items WHERE id = :saleItemId FOR UPDATE`
  2. Verifies `returned_quantity + current_return <= original_sold_quantity`.
  3. `INSERT INTO sale_returns (id, business_id, store_id, sale_id, return_number, refund_amount, refund_method, reason, created_by, created_at)`
  4. `INSERT INTO sale_return_items (id, sale_return_id, sale_item_id, batch_id, quantity, refund_unit_price, restocked)`
  5. If `restock == true`:
     - `UPDATE inventory_batches SET current_quantity = current_quantity + :qty WHERE id = :batchId`
     - `UPDATE inventory_items SET total_quantity = total_quantity + :qty WHERE store_id = :storeId AND product_id = :productId`
     - `INSERT INTO stock_movements` (`SALE_RETURN`).
  6. If original sale was on customer credit:
     - `UPDATE customers SET current_credit_balance = current_credit_balance - :refundAmount WHERE id = :customerId`
     - `INSERT INTO customer_ledger` (`CREDIT_REFUND`).

---

## 25. Domain 24: Inter-Store Stock Transfers (`/api/v1/transfers`)

**Controller**: `TransferController.java`  
**Underlying Service**: `TransferService.java`  
**Database Tables**: `inventory_transfers`, `transfer_items`, `inventory_batches`, `inventory_items`, `stock_movements`

---

### Workflow & Lifecycle
```
REQUESTED (Destination Store) 
       ↓ 
APPROVED / REJECTED (Source Store Manager)
       ↓ 
SHIPPED (Stock deducted from Source Batches → In Transit)
       ↓ 
RECEIVED (Stock added to Destination Batches)
```

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/transfers` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | Create inter-store transfer requisition |
| `GET` | `/api/v1/transfers` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | List incoming & outgoing transfers |
| `GET` | `/api/v1/transfers/{id}` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | Transfer details & line items |
| `POST` | `/api/v1/transfers/{id}/approve` | `OWNER`, `MANAGER` | Approves requisition at source branch |
| `POST` | `/api/v1/transfers/{id}/reject` | `OWNER`, `MANAGER` | Rejects transfer request |
| `POST` | `/api/v1/transfers/{id}/ship` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | Dispatches stock (deducts stock from source batches) |
| `POST` | `/api/v1/transfers/{id}/receive` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | Acknowledges receipt at destination (adds stock to destination) |
| `POST` | `/api/v1/transfers/{id}/cancel` | `OWNER`, `MANAGER` | Cancels draft transfer |

- **Sample Dispatch / Ship Payload**:
  ```json
  {
    "trackingNumber": "TRK-EXP-4431",
    "dispatchedItems": [
      {
        "transferItemId": "3a11b022-55aa-4c22-8811-dd2233445566",
        "sourceBatchId": "a17721a9-b912-4211-8812-771122334455",
        "shippedQuantity": 50
      }
    ]
  }
  ```
- **Database Operations**:
  - At **Ship**: Deducts source batch stock with pessimistic lock; creates `stock_movements` (`TRANSFER_OUT`).
  - At **Receive**: Upserts destination `inventory_batches` with matching batch number, expiry date, and MRP; creates `stock_movements` (`TRANSFER_IN`).

---

## 26. Domain 25: Offline-First Synchronization Engine (`/api/v1/sync`)

**Controller**: `SyncController.java`  
**Underlying Service**: `SyncService.java`  
**Database Tables**: `sync_change_log`, `sync_events`, `devices`, `sales`, `inventory_batches`

---

### Use Case
Enables Desktop (Tauri/Electron) and Android terminals in remote locations or internet outages to bill sales and adjust stock against a local SQLite database. When connection resumes, terminals push queued batch transactions and pull cloud state.

### 26.1 Upload Sync Batch
- **Method & Route**: `POST /api/v1/sync/upload`
- **Access**: Authenticated Staff
- **Request Payload**:
  ```json
  {
    "deviceId": "b47c0a6b-9cb1-4f11-8255-7d4041b31521",
    "clientSyncSequence": 1042,
    "transactions": [
      {
        "idempotencyKey": "offline_sale_550e8400-e29b-41d4-a716-446655440001",
        "transactionType": "OFFLINE_SALE",
        "occurredAt": "2026-10-02T19:30:00.000Z",
        "payloadJson": "{ ... CreateSaleRequest JSON ... }"
      }
    ]
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "processedCount": 1,
      "failedCount": 0,
      "serverSyncCursor": 88412,
      "acknowledgements": [
        {
          "idempotencyKey": "offline_sale_550e8400-e29b-41d4-a716-446655440001",
          "status": "APPLIED",
          "assignedInvoiceNumber": "INV-2026-000413"
        }
      ]
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```
- **Database Operations**:
  - Validates `devices.status == 'ACTIVE'` for `deviceId`.
  - Checks duplicate prevention: `SELECT * FROM sync_events WHERE idempotency_key = :key`.
  - Replays transaction through internal service layer.
  - `INSERT INTO sync_events (idempotency_key, device_id, status, processed_at)`

---

### 26.2 Download Incremental Changes
- **Method & Route**: `GET /api/v1/sync/download?cursor={cursor}&limit=100`
- **Access**: Authenticated Staff
- **Database Operations**:
  - `SELECT * FROM sync_change_log WHERE business_id = :businessId AND store_id = :storeId AND sequence_id > :cursor ORDER BY sequence_id ASC LIMIT :limit`
  - Returns delta of product price updates, customer additions, and stock movements created by other terminals.

---

## 27. Domain 26: Pharmacy Intelligence & Natural Language NLP (`/api/v1/intelligence`)

**Controller**: `IntelligenceController.java`  
**Underlying Service**: `IntelligenceService.java`

---

### Interpret Natural Language Command
- **Method & Route**: `POST /api/v1/intelligence/interpret`
- **Access**: Authenticated Staff
- **Use Case**: Pharmacist speaks or types human language into search bar (e.g., *"Show me all expired pediatric syrups"*, *"Find lowest stock paracetamol"*, *"What are today's sales?"*). Returns structured UI action intent, route, and parameters.
- **Request Payload**:
  ```json
  {
    "text": "Show me batches of Augmentin expiring in next 60 days"
  }
  ```
- **Response Payload (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "intent": "INVENTORY_EXPIRY_LOOKUP",
      "targetRoute": "/inventory/batches",
      "confidence": 0.96,
      "extractedParameters": {
        "medicine": "Augmentin",
        "expiringWithinDays": 60
      },
      "humanReadableSummary": "Filtering inventory batches for Augmentin expiring within 60 days"
    },
    "timestamp": "2026-10-03T02:15:00.000Z"
  }
  ```

---

## 28. Domain 27: Business & Regulatory Reporting (`/api/v1/reports`)

**Controller**: `ReportController.java`  
**Underlying Service**: `ReportService.java`  
**Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_PHARMACIST`

---

### Reporting Endpoints & Real Database Telemetry
| Method | Route | Description | Database Queries |
|---|---|---|---|
| `GET` | `/api/v1/reports/summary` | Executive dashboard: today's revenue, net profit, low stock count, pending PO count | Aggregates `sales`, `purchase_orders`, `inventory_items` |
| `GET` | `/api/v1/reports/sales` | Detailed sales breakdown with date range, tax totals, margins | `SELECT DATE(created_at), SUM(net_amount), SUM(tax_amount) FROM sales GROUP BY ...` |
| `GET` | `/api/v1/reports/inventory-valuation` | Total stock value at purchase cost vs MRP value | `SELECT SUM(current_quantity * purchase_rate), SUM(current_quantity * mrp) FROM inventory_batches` |
| `GET` | `/api/v1/reports/expiry-risk` | Financial capital tied up in batches expiring in next 30/60/90 days | Aggregates `inventory_batches` where `expiry_date <= CURRENT_DATE + interval` |
| `GET` | `/api/v1/reports/product-velocity` | Fast-moving vs dead-stock inventory analysis | Joins `products` with `sale_items` ordered by sum of sold quantity |
| `GET` | `/api/v1/reports/schedule-h` | **Statutory Drug Regulatory Register**: Narcotics & Schedule H/H1 dispensed register with doctor name and patient info | `SELECT s.invoice_number, s.created_at, s.doctor_name, s.patient_name, p.name, si.quantity, ib.batch_number FROM sales s JOIN sale_items si ... WHERE p.schedule IN ('SCHEDULE_H', 'SCHEDULE_H1', 'SCHEDULE_X')` |

---

## 29. Domain 28: In-App User Notifications (`/api/v1/notifications`)

**Controller**: `NotificationController.java`  
**Underlying Service**: `NotificationService.java`  
**Database Table**: `notifications`

---

### Endpoints
| Method | Endpoint | Description | Database Operations |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | Paginated notification feed with `?unreadOnly=true` option | `SELECT * FROM notifications WHERE business_id = :bId AND (user_id = :uId OR user_id IS NULL) ORDER BY created_at DESC` |
| `GET` | `/api/v1/notifications/unread-count` | Real-time counter for bell icon badge | `SELECT COUNT(1) FROM notifications WHERE is_read = false ...` |
| `PATCH` | `/api/v1/notifications/{id}/read` | Mark individual notification as read | `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = :id` |
| `PATCH` | `/api/v1/notifications/mark-all-read` | Mark all user notifications as read | `UPDATE notifications SET is_read = true, read_at = NOW() WHERE business_id = :bId` |

---

## 30. Domain 29: Bulk Data Ingestion & CSV Import Engine (`/api/v1/imports`)

**Controller**: `ImportController.java`  
**Underlying Service**: `ImportJobService.java`  
**Database Tables**: `import_jobs`, `import_rows`, `products`, `customers`, `suppliers`

---

### 30.1 Upload Import File
- **Method & Route**: `POST /api/v1/imports/upload`
- **Consumes**: `multipart/form-data`
- **Access**: `ROLE_OWNER`, `ROLE_MANAGER`, `ROLE_PLATFORM_ADMIN`
- **Parameters**: `file`, `domain` (`PRODUCT`, `CUSTOMER`, `SUPPLIER`), `storeId` (optional)
- **Use Case**: Allows store owners migrating from legacy software (e.g. Marg, Busy, Tally) to upload CSV files. The engine parses lines, stores them in `import_rows` with validation state (`VALID`, `ERROR`), and allows manual corrections before final insertion.
- **Database Operations**:
  - `INSERT INTO import_jobs (id, business_id, store_id, domain, filename, total_rows, status, created_by, created_at)` (`PARSED`).
  - Batch insert into `import_rows (id, job_id, row_index, raw_data, parsed_data, status, error_message)`.

---

### 30.2 Review, Fix & Confirm Import
- `GET /api/v1/imports/{id}/rows?status=ERROR`: View failed rows with error descriptions.
- `PATCH /api/v1/imports/{id}/rows/{rowId}`: Correct cell values directly in UI.
- `POST /api/v1/imports/{id}/rows/{rowId}/skip`: Skip invalid row.
- `POST /api/v1/imports/{id}/confirm`: **Atomically commits all valid rows into master tables**:
  - If `domain == PRODUCT`: Inserts into `products` and `product_identifiers`.
  - If `domain == CUSTOMER`: Inserts into `customers`.
  - If `domain == SUPPLIER`: Inserts into `suppliers`.
  - Transitions `import_jobs.status` to `COMPLETED`.
- `GET /api/v1/imports/templates/{domain}`: Returns column specification metadata for spreadsheet templates.

---

## 31. Domain 30: Careers Portal — Public & Admin

**Controllers**: `PublicCareerController.java` (`/api/v1/public/careers`), `AdminCareerController.java` (`/api/v1/admin/careers`)  
**Underlying Service**: `CareerService.java`  
**Database Tables**: `career_jobs`, `job_applications`

---

### Endpoints
| Area | Method | Endpoint | Role | Description |
|---|---|---|---|---|
| **Public** | `GET` | `/api/v1/public/careers/jobs` | Public | List active public job vacancies at Inventra |
| **Public** | `GET` | `/api/v1/public/careers/jobs/{id}` | Public | Detailed job description, requirements, benefits |
| **Public** | `POST` | `/api/v1/public/careers/jobs/{id}/apply` | Public | Submit job application (name, email, phone, resume link) |
| **Admin** | `GET` | `/api/v1/admin/careers/jobs` | `PLATFORM_ADMIN` | List all job openings (active, draft, closed) |
| **Admin** | `POST` | `/api/v1/admin/careers/jobs` | `PLATFORM_ADMIN` | Post new vacancy |
| **Admin** | `PUT` | `/api/v1/admin/careers/jobs/{id}` | `PLATFORM_ADMIN` | Update vacancy details |
| **Admin** | `DELETE` | `/api/v1/admin/careers/jobs/{id}` | `PLATFORM_ADMIN` | Archive/delete job opening |
| **Admin** | `GET` | `/api/v1/admin/careers/applications` | `PLATFORM_ADMIN` | Filter applications by job, status (`REVIEWED`, `SHORTLISTED`, `HIRED`) |
| **Admin** | `PATCH` | `/api/v1/admin/careers/applications/{id}/status` | `PLATFORM_ADMIN` | Advance applicant recruitment stage |

- **Sample Candidate Application Request**:
  ```json
  {
    "fullName": "Ananya Sen",
    "email": "ananya.sen@gmail.com",
    "phone": "+919830011223",
    "resumeUrl": "https://storage.inventra.com/resumes/ananya_sen_cv.pdf",
    "coverLetter": "5 years of experience leading pharmaceutical ERP deployments."
  }
  ```

---

## 32. Domain 31: CMS & Content Management

**Controllers**: `PublicCmsController.java` (`/api/v1/public`), `AdminCmsController.java` (`/api/v1/admin/content`)  
**Underlying Service**: `CmsService.java`  
**Database Table**: `cms_pages`

---

### Endpoints
| Area | Method | Endpoint | Role | Description |
|---|---|---|---|---|
| **Public** | `GET` | `/api/v1/public/content/{pageKey}` | Public | Retrieve published page by key (e.g. `privacy-policy`, `terms`, `about`) |
| **Public** | `GET` | `/api/v1/public/content` | Public | List all active public legal and marketing pages |
| **Public** | `GET` | `/api/v1/public/pricing` | Public | Return public pricing tiers without authentication |
| **Admin** | `GET` | `/api/v1/admin/content` | `PLATFORM_ADMIN` | Full CMS editor list |
| **Admin** | `GET` | `/api/v1/admin/content/{pageKey}` | `PLATFORM_ADMIN` | Fetch raw markdown & SEO metadata for editing |
| **Admin** | `PUT` | `/api/v1/admin/content/{pageKey}` | `PLATFORM_ADMIN` | Save published content updates & audit timestamp |

- **Sample Update CMS Request**:
  ```json
  {
    "title": "Privacy Policy & Data Security",
    "contentMarkdown": "# Privacy Policy\n\nInventra complies with Indian Digital Personal Data Protection (DPDP) Act 2023...",
    "metaDescription": "Inventra Pharmacy ERP privacy and security standards"
  }
  ```
- **Database Operations**:
  - `UPDATE cms_pages SET title = :title, content_markdown = :content, meta_description = :meta, updated_by = :user, updated_at = NOW() WHERE page_key = :pageKey`

---

## 33. Domain 32: Geographic & Pincode Utilities

**Controllers**: `GeoController.java` (`/api/v1/geo`), `PincodeController.java` (`/api/v1/pincode`)  
**Underlying Services**: `GeoService.java`, `PincodeService.java`  
**Access**: Public / Authenticated

---

### Endpoints
| Method | Endpoint | Description | Response Details |
|---|---|---|---|
| `GET` | `/api/v1/geo/states` | Returns alphabetical list of all Indian States and Union Territories | `["Andhra Pradesh", "Delhi", "Karnataka", "Maharashtra", ...]` |
| `GET` | `/api/v1/geo/cities?state=Maharashtra` | Returns list of verified commercial cities in selected state | `["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", ...]` |
| `GET` | `/api/v1/pincode/{pincode}` | Fast 6-digit postal code lookup auto-filling city, district, state | `{ "pincode": "400001", "city": "Mumbai", "district": "Mumbai City", "state": "Maharashtra" }` |

---

## 34. Database Architecture & Flyway Schema Map

The Inventra PostgreSQL database is constructed through 19 structured, forward-only Flyway migrations:

| Migration | Domain | Core Tables Created / Altered |
|---|---|---|
| `V1__init_identity_and_tenancy.sql` | Tenancy & Identity | `businesses`, `stores`, `users`, `business_memberships` |
| `V2__init_auth_and_device_identity.sql` | Security & Sessions | `refresh_tokens`, `devices`, `user_audit_logs`, `password_reset_tokens` |
| `V3__init_product_catalog_and_inventory.sql` | Catalog & Inventory | `categories`, `products`, `product_identifiers`, `inventory_items`, `inventory_batches`, `stock_movements` |
| `V4__init_purchasing_and_suppliers.sql` | Supply Chain | `suppliers`, `supplier_products`, `purchase_orders`, `purchase_order_items`, `goods_receipt_notes`, `goods_receipt_items`, `purchase_invoices`, `purchase_invoice_items` |
| `V5__init_sales_and_pos.sql` | Billing & POS | `sales`, `sale_items`, `sale_payments`, `sale_returns`, `sale_return_items` |
| `V6__init_inter_store_transfers.sql` | Multi-Store Logistics | `inventory_transfers`, `transfer_items`, `transfer_shipments`, `transfer_receipts` |
| `V7__init_offline_sync.sql` | Offline Engine | `sync_change_log`, `sync_events`, `client_sync_state` |
| `V8__onboarding_applications.sql` | KYC & Activation | `onboarding_applications`, `activation_tokens` |
| `V9__user_shortcut_profiles_and_store_capacity.sql` | POS Shortcuts & Seats | `user_shortcut_profiles`, `stores.max_users` |
| `V10__init_customer_domain.sql` | Patient & Credit | `customers`, `customer_ledger` |
| `V11__init_import_and_ingestion_framework.sql` | CSV Data Ingestion | `import_jobs`, `import_rows` |
| `V12__user_invitations.sql` | Staff Invitations | `user_invitations` |
| `V13__notifications.sql` | In-App Alerting | `notifications` |
| `V14__subscription_persistence.sql` | Subscription Tiers | `subscriptions`, `license_invoices`, `coupons` |
| `V15__subscription_invoice_razorpay_ids.sql` | Payment Gateways | `license_invoices.razorpay_order_id`, `razorpay_payment_id` |
| `V16__dynamic_cms_and_prorated_invoices.sql` | CMS & Pricing | `cms_pages`, `pricing_config` |
| `V17__careers_and_coupon_cap.sql` | Careers & Promotions | `career_jobs`, `job_applications`, `coupons.max_discount_amount` |
| `V18__global_medicine_database.sql` | Master Formulations | `global_medicines`, `global_medicine_suggestions` |
| `V19__seed_legal_compliance_cms_pages.sql` | Compliance Seed | Seed data for privacy policy, terms of service, and refund guidelines |

---

## 35. Summary of System Roles & Permissions

| Role | Primary Responsibilities | Permitted Endpoint Domains |
|---|---|---|
| `ROLE_PLATFORM_ADMIN` | Global platform administration, compliance, pricing, CMS, careers, global medicines | Admin Onboarding, Admin Subscription, Admin Coupons, Admin Medicines, Admin CMS, Admin Careers |
| `ROLE_OWNER` | Pharmacy owner, full tenant administrator | All tenant domains: Billing, Inventory, Staff Invitations, Devices, Purchasing, Subscription, Reports, Imports |
| `ROLE_MANAGER` | Branch pharmacy manager | Store-level operations: Billing, Inventory Adjustments, Purchasing (PO & GRN), Staff Invitations, Transfers |
| `ROLE_PHARMACIST` | Drug dispensing & patient compliance | POS Fast Search, Billing, Schedule H Register, Reports, Global Medicine Search |
| `ROLE_INVENTORY_OPERATOR` | Warehouse & stock logistics | Goods Receipt Notes (GRN), Inventory Batches, Inter-Store Transfers, Stock Adjustments, Product Barcodes |
| `ROLE_CASHIER` | Counter checkout & returns | POS Fast Search, Create Sale, Sale Return, Print Receipts, Customer Quick Search |

---
*Inventra Pharmacy ERP Documentation Engine — Generated for Production Enterprise Architecture.*
