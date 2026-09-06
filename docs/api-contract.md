# Inventra Pharmacy ERP — REST API Contract

This document provides the authoritative, production-ready REST API contract for frontend client integrations (Web SPA, Desktop Tauri/Electron, Android).

---

## 1. Global Conventions & Protocol

### Base URL
- **Local Development**: `http://localhost:8080`
- **Default Port**: `8080` (Spring Boot), PostgreSQL: `localhost:5433` (Docker), Frontend: `http://localhost:3000` or `http://localhost:5173`.

### Headers
| Header | Description | Required |
|---|---|---|
| `Authorization` | `Bearer <access_token>` | Yes (all protected endpoints) |
| `Content-Type` | `application/json` | Yes (on POST / PATCH / PUT) |
| `X-Device-Id` | UUID string identifying hardware device | Optional (required for offline sync & device binding) |

### Response Envelopes
#### Standard Success Envelope (`ApiResponse<T>`)
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-08-25T12:00:00.000Z"
}
```

#### Pagination Format (`ApiResponse<Page<T>>`)
```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "page": {
      "size": 20,
      "number": 0,
      "totalElements": 142,
      "totalPages": 8
    }
  },
  "timestamp": "2026-08-25T12:00:00.000Z"
}
```

#### RFC 9457 Problem Details Error Envelope
```json
{
  "type": "https://api.inventra.com/errors/insufficient-stock",
  "title": "Insufficient Stock",
  "status": 422,
  "detail": "Insufficient stock for Paracetamol 500mg. Available: 10.000, Requested: 15.000",
  "instance": "/api/v1/sales",
  "errorCode": "INSUFFICIENT_STOCK",
  "timestamp": "2026-08-25T12:00:00.000Z",
  "violations": [ ... ]
}
```

---

## 2. Public Onboarding & Account Activation

The onboarding model enforces strict administrative verification prior to owner activation:
`PUBLIC APPLICATION → PENDING_REVIEW → PLATFORM ADMIN REVIEW → APPROVAL → INACTIVE OWNER CREATION → ACTIVATION TOKEN → OWNER SETS PASSWORD → ACTIVE OWNER → LOGIN`.

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/onboarding/apply` | Public | Submit pharmacy registration application (`PENDING_REVIEW`) | `201`, `400`, `409` |
| `POST` | `/api/v1/auth/onboarding/activate` | Public | Activate approved owner account and establish password using single-use cryptographic token | `200`, `400`, `422` |

---

## 3. Platform Administration (`/api/v1/admin/onboarding`)

Access restricted strictly to users with `ROLE_PLATFORM_ADMIN`.

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/onboarding/applications` | `PLATFORM_ADMIN` | List onboarding applications with optional `?status=PENDING_REVIEW` filter | `200`, `401`, `403` |
| `GET` | `/api/v1/admin/onboarding/applications/{id}` | `PLATFORM_ADMIN` | Inspect full compliance details for single application | `200`, `401`, `403`, `404` |
| `POST` | `/api/v1/admin/onboarding/applications/{id}/approve` | `PLATFORM_ADMIN` | Approve application; atomically provisions `Business`, `Store`, and `INACTIVE` `User`, issuing single-use activation token | `200`, `401`, `403`, `404`, `422` |
| `POST` | `/api/v1/admin/onboarding/applications/{id}/reject` | `PLATFORM_ADMIN` | Reject application with required auditable `rejectionReason` | `200`, `400`, `401`, `403`, `404`, `422` |

---

## 4. Authentication & Identity (`/api/v1/auth`)

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Login with email, password, and optional device registration (supports active owners & platform admins) | `200`, `401`, `422`, `429` |
| `POST` | `/api/v1/auth/refresh` | Public | Rotate refresh token with token reuse detection and get new access token | `200`, `401`, `422` |
| `POST` | `/api/v1/auth/switch-context` | Authenticated | Switch active `storeId` or `businessId` in JWT | `200`, `403` |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke active refresh token family | `200` |
| `POST` | `/api/v1/auth/logout-all` | Authenticated | Revoke all active sessions for current user | `200`, `401` |
| `POST` | `/api/v1/auth/password/reset-request` | Public | Request password reset token via email | `200` |
| `POST` | `/api/v1/auth/password/reset-confirm` | Public | Reset password using token | `200`, `400`, `422` |
| `POST` | `/api/v1/auth/password/change` | Authenticated | Change password for logged-in user | `200`, `400`, `401` |

---

## 5. Device Management (`/api/v1/devices`)

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/v1/devices` | `OWNER`, `MANAGER` | List all registered devices for tenant | `200` |
| `POST` | `/api/v1/devices/register` | `OWNER`, `MANAGER` | Explicitly register a new POS device | `201`, `400`, `409` |
| `POST` | `/api/v1/devices/{id}/revoke` | `OWNER`, `MANAGER` | Revoke a device's POS access | `200`, `404` |

---

## 6. Product Catalog & Categories (`/api/v1/products`, `/api/v1/categories`)

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/v1/categories` | Authenticated | List all active product categories | `200` |
| `POST` | `/api/v1/categories` | `OWNER`, `MANAGER` | Create product category | `201`, `400`, `409` |
| `PATCH` | `/api/v1/categories/{id}` | `OWNER`, `MANAGER` | Update category name or description | `200`, `404` |
| `GET` | `/api/v1/products` | Authenticated | Paginated product list | `200` |
| `GET` | `/api/v1/products/{id}` | Authenticated | Get single product with identifiers | `200`, `404` |
| `GET` | `/api/v1/products/search?query=...` | Authenticated | Search products by name/generic | `200` |
| `POST` | `/api/v1/products` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | Create product with optional barcodes | `201`, `400`, `409` |
| `PATCH` | `/api/v1/products/{id}` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | Update product attributes | `200`, `404` |
| `POST` | `/api/v1/products/{id}/identifiers` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | Add barcode/SKU to product | `200`, `400`, `409` |
| `DELETE` | `/api/v1/products/{id}/identifiers/{identifierId}` | `OWNER`, `MANAGER` | Remove identifier from product | `200`, `404` |

---

## 7. POS Product Fast Search (`/api/v1/pos/products/search`)

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/v1/pos/products/search?q={query}` | `OWNER`, `MANAGER`, `CASHIER` | High-performance real-time search by barcode or text with bulk FEFO price & stock | `200` |

---

## 8. Inventory & Batches (`/api/v1/inventory`)

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/v1/inventory?storeId=...` | Authenticated | List inventory items for store | `200` |
| `GET` | `/api/v1/inventory/batches?storeId=...` | Authenticated | List inventory batches for store | `200` |
| `GET` | `/api/v1/inventory/batches/fefo?storeId=...&productId=...` | Authenticated | Get active batches in FEFO order | `200` |
| `POST` | `/api/v1/inventory/adjustments` | `OWNER`, `MANAGER` | Record stock adjustment with immutable movement ledger | `201`, `400`, `422` |

---

## 9. Purchasing & Suppliers (`/api/v1/purchases`, `/api/v1/suppliers`)

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/v1/suppliers` | Authenticated | List active suppliers | `200` |
| `POST` | `/api/v1/suppliers` | `OWNER`, `MANAGER` | Create new supplier | `201`, `400`, `409` |
| `PATCH` | `/api/v1/suppliers/{id}` | `OWNER`, `MANAGER` | Update supplier details | `200`, `404` |
| `GET` | `/api/v1/purchases` | Authenticated | List purchase orders | `200` |
| `GET` | `/api/v1/purchases/{id}` | Authenticated | Get purchase order details | `200`, `404` |
| `POST` | `/api/v1/purchases` | `OWNER`, `MANAGER` | Create purchase order | `201`, `400` |
| `POST` | `/api/v1/purchases/{id}/receive` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | Record goods receipt note (GRN), creates inventory batches & stock movements | `200`, `400`, `409`, `422` |
| `POST` | `/api/v1/purchases/{id}/cancel` | `OWNER`, `MANAGER` | Cancel pending purchase order | `200`, `422` |

---

## 10. Point of Sale & Billing (`/api/v1/sales`)

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/sales` | `OWNER`, `MANAGER`, `CASHIER` | Create sale with batch allocations, customer info, payments, and discounts | `201`, `400`, `409`, `422` |
| `GET` | `/api/v1/sales/{id}` | Authenticated | Get complete sales invoice details | `200`, `404` |
| `GET` | `/api/v1/sales` | Authenticated | Paginated sales list with filters | `200` |
| `POST` | `/api/v1/sales/{id}/returns` | `OWNER`, `MANAGER`, `CASHIER` | Process return & refund against completed sale | `201`, `400`, `422` |
| `POST` | `/api/v1/sales/{id}/void` | `OWNER`, `MANAGER` | Void unpaid or draft sale | `200`, `422` |

---

## 11. Inter-Store Inventory Transfers (`/api/v1/transfers`)

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/transfers` | `OWNER`, `MANAGER` | Create inter-store transfer request | `201`, `400`, `422` |
| `GET` | `/api/v1/transfers` | Authenticated | List transfers for current store | `200` |
| `GET` | `/api/v1/transfers/{id}` | Authenticated | Get transfer details | `200`, `404` |
| `POST` | `/api/v1/transfers/{id}/approve` | `OWNER`, `MANAGER` | Approve transfer request (source store) | `200`, `422` |
| `POST` | `/api/v1/transfers/{id}/reject` | `OWNER`, `MANAGER` | Reject transfer request (source store) | `200`, `422` |
| `POST` | `/api/v1/transfers/{id}/ship` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | Dispatch stock from source store (deducts stock) | `200`, `422` |
| `POST` | `/api/v1/transfers/{id}/receive` | `OWNER`, `MANAGER`, `INVENTORY_OPERATOR` | Receive stock at destination store (increases stock) | `200`, `422` |
| `POST` | `/api/v1/transfers/{id}/cancel` | `OWNER`, `MANAGER` | Cancel draft or requested transfer | `200`, `422` |

---

## 12. Offline Synchronization Engine (`/api/v1/sync`)

Available **strictly** on Desktop and Android clients. Not supported on Web.

| Method | Endpoint | Role / Auth | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/v1/sync/push` | `OWNER`, `MANAGER`, `CASHIER` | Push offline batch transactions (idempotent via client UUID) | `200`, `400`, `409` |
| `GET` | `/api/v1/sync/pull?since={timestamp}` | Authenticated | Pull catalog, customer, and batch delta updates | `200` |
| `GET` | `/api/v1/sync/status` | Authenticated | Diagnostic sync health & queue status | `200` |
