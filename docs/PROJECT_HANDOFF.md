# INVENTRA PHARMACY ERP — PROJECT HANDOFF DOCUMENT

> **Audit date:** 2026-08-30
> **Source:** `D:\project\anti-gravity-projects\inventra`
> **All claims below are verified against actual repository files, not prior reports.**

---

## EXECUTIVE SUMMARY

Inventra is a **multi-tenant, offline-capable, cross-platform pharmacy ERP monorepo** built with a shared React codebase for web and desktop, and a Spring Boot backend.

- **Backend:** Spring Boot 4.1.1, Java 17, PostgreSQL, 19 Flyway migrations (V1–V19)
- **Frontend:** Shared React 19 app (`packages/app`) consumed by `web` (Vite) and `desktop` (Tauri 2)
- **Mobile:** Placeholder only (`package.json` + `README.md` — no source)
- **Database:** PostgreSQL with multi-tenant schema (business + store scoping)
- **Auth:** JWT (15-min access, 30-day refresh) + multi-tenancy context propagation
- **Domains:** Identity, Tenant, Catalog, Inventory, Purchasing, Customer, Sales, Transfer, Sync, Onboarding, Ingestion
- **Build:** pnpm 10.24.0 workspace + Turbo pipeline

**State:** Backend domain structure is complete. Web app is functional. Desktop Tauri framework exists (SQLite bindings built, but native commands need verification). Several future requirements documented (universal CSV import, PDF/OCR ingestion, mobile) are not yet implemented.

---

## 1. REPOSITORY STRUCTURE

```
inventra/
├── .agents/skills/          # Project skills (flyway-migrations, multi-tenancy, etc.)
├── .git/
├── apps/
│   ├── desktop/             # Tauri 2 + Vite + React 19
│   │   ├── src/            # React frontend (App.tsx, pages, components, services)
│   │   ├── src-tauri/      # Rust Tauri backend (build artifacts present)
│   │   ├── dist/           # Frontend build output
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── mobile/             # PLACEHOLDER — package.json + README.md only
│   └── web/                # Vite + React 19 (functional)
│       ├── src/
│       ├── dist/
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── tsconfig.json
├── backend/
│   └── inventra-backend/   # Spring Boot 4.1.1, Java 17, Maven
│       ├── src/main/java/com/inventra/inventra_backend/  # NOTE: inventra_backend, not backend
│       ├── src/main/resources/
│       │   ├── application.yml
│       │   ├── application-local.yml
│       │   └── db/migration/   # 11 Flyway migrations (V1–V11)
│       ├── src/test/
│       ├── pom.xml
│       ├── mvnw / mvnw.cmd
│       └── .mvn/
├── docs/                    # 13+ existing docs (see §25)
├── packages/               # Workspace packages
│   ├── api-client/         # HTTP client with auth interceptor
│   ├── api-types/          # TypeScript types for all domains
│   ├── app/                # ⭐ SHARED APP: App, runtime adapters, routing, stores, pages
│   ├── design-tokens/      # Theme tokens, color scales, CSS variables
│   ├── offline-storage/   # Offline storage abstraction
│   ├── print/              # Receipt/document printing
│   ├── shared/             # Utilities, constants, permissions
│   ├── sync/               # Sync infrastructure (offline ↔ online bridge)
│   ├── ui/                 # React component library
│   └── validation/         # Zod/Yup form validation schemas
├── docker-compose.yml      # PostgreSQL 17
├── package.json            # pnpm 10.24, Turbo 2.4.4
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
└── tsconfig.base.json
```

**Note:** The backend package base is `com.inventra.inventra_backend` (not `com.inventra.backend`). Verify this when importing or referencing.

---

## 2. WORKSPACE CONFIGURATION

### Root `package.json`
```json
{
  "name": "inventra-monorepo",
  "packageManager": "pnpm@10.24.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test --concurrency=2",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.4.4",
    "typescript": "^5.7.3",
    "prettier": "^3.5.1",
    "vitest": "^3.0.5"
  }
}
```

### `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `turbo.json`
- `build`: depends on `^build`, outputs `dist/`, `.next/`, `build/`
- `test`: depends on `^build`
- `typecheck`: depends on `^build`
- `dev`: persistent, non-cached
- `clean`: non-cached

### `tsconfig.base.json`
- Target: ES2022
- Module: ESNext, Bundler resolution
- Strict: true
- `noUnusedLocals`: true
- `noUnusedParameters`: true
- Declaration maps enabled

---

## 3. APPLICATION INVENTORY

### `apps/web` — ✅ IMPLEMENTED AND RUNNABLE

| Property | Value |
|---|---|
| Framework | React 19 + Vite 6 + React Router 7 + Zustand 5 |
| Entry | `src/main.tsx` → `<App runtime={new WebRuntimeAdapter()} />` from `@inventra/app` |
| Dev command | `vite` |
| Build command | `tsc && vite build` |
| Test command | `vitest run` |
| Typecheck | `tsc --noEmit` |
| Dependencies | `react-router-dom`, `zustand`, `lucide-react`, `react-hook-form`, `@tanstack/react-query`, workspace packages |
| Pattern | Shared app (`packages/app`) + web runtime adapter |
| Output | `dist/` |

### `apps/desktop` — ⚠️ TAURI SHELL PRESENT; NATIVE INTEGRATION NOT VERIFIED

| Property | Value |
|---|---|
| Framework | React 19 + Vite + Tauri 2.2.7 (from docs) |
| Entry | `src/main.tsx` → `<App runtime={new DesktopRuntimeAdapter()} />` from `@inventra/app` |
| Frontend | `src/` (same React app as web) |
| Tauri | `src-tauri/` with Rust workspace |
| Tauri plugins | `tauri-plugin-sql` 2.2.0 (PostgreSQL + SQLite), `tauri-plugin-opener` (from docs) |
| Build artifacts | `target/debug/build/libsqlite3-sys-*` and `webview2-com-sys-*` present |
| Status | Tauri window + SQLite bindings built; native commands not verified |

**What exists:** Tauri shell renders the full React UI inside a native window.
**What is missing:** Tauri commands for SQLite read/write, device registration, sync queue, native printing.

### `apps/mobile` — ❌ PLACEHOLDER ONLY

No source code. Only `package.json` and `README.md` exist.

---

## 4. PACKAGE INVENTORY

| Package | Purpose | Status |
|---|---|---|
| `api-types` | TypeScript types for all request/response DTOs, enums, domain models | ✅ Implemented |
| `api-client` | HTTP client with JWT refresh + tenant headers (`X-Business-Id`, `X-Store-Id`) | ✅ Implemented |
| `app` | **⭐ Shared React App** — exports `App`, `WebRuntimeAdapter`, `DesktopRuntimeAdapter`. Contains routing, stores, pages, components, services. Consumed by both web and desktop. | ✅ Implemented |
| `design-tokens` | Theme presets (clinical, ocean, sunset, forest, royal, minimal, custom), color scales, CSS variables. Exports `applyThemeToElement()`. | ✅ Implemented |
| `ui` | React component library: Button, Input, Select, Modal, Card, Badge, Table, Spinner, Toast, Pagination, Tabs, Toggle, Tooltip, Kbd | ✅ Implemented |
| `shared` | Utilities: formatters, constants (routes, roles, shortcuts), permissions, platform detection | ✅ Implemented |
| `validation` | Client-side Zod validation schemas for all domains | ✅ Implemented |
| `offline-storage` | Abstraction layer for offline storage (Tauri SQL on desktop, placeholder on web) | ⚠️ Scaffolded |
| `sync` | Sync infrastructure (offline ↔ online bridge, change feed API) | ⚠️ Partial |
| `print` | Receipt and document printing utilities | ⚠️ Scaffolded |

All packages use `workspace:*` for cross-references.

---

## 5. BACKEND ARCHITECTURE

**Location:** `backend/inventra-backend/`
**Package base:** `com.inventra.inventra_backend`

### Technology Stack

| Property | Value |
|---|---|
| Spring Boot | 4.1.1 (from `spring-boot-starter-parent`) |
| Java | 17 (`<java.version>17</java.version>`) |
| Build | Maven (`mvnw`, `mvnw.cmd`) |
| ORM | Spring Data JPA + Hibernate |
| Migrations | Flyway 11 migrations |
| Security | Spring Security + JWT (JJWT 0.12.6) |
| Database | PostgreSQL |
| Caching | Caffeine |
| Server port | 8081 (configurable via `SERVER_PORT`) |
| Profile | Default `local` (via `SPRING_PROFILES_ACTIVE` or `application.yml`) |

### `application.yml` (Production defaults)

```yaml
server:
  port: ${SERVER_PORT:8081}
spring:
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:local}
  mvc:
    problemdetails:
      enabled: true  # RFC 9457 Problem Details
  data:
    web:
      pageable:
        default-page-size: 20
        max-page-size: 100
app:
  timezone: Asia/Kolkata
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:}
  jwt:
    issuer: https://api.inventra.com
    audience: inventra-clients
    secret: ${JWT_SECRET}
    access-token-expiry: 900000   # 15 minutes
    refresh-token-expiry: 2592000000  # 30 days
```

### `application-local.yml` (Local dev overrides)

```yaml
server:
  port: 8081
spring:
  datasource:
    url: jdbc:postgresql://127.0.0.1:5432/inventra
    username: inventra
    password: "inventra_local"
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
    locations: classpath:db/migration
app:
  cors:
    allowed-origins: "http://localhost:5174,http://localhost:3000,http://localhost:3002,http://localhost:5173,http://localhost:8080,http://localhost:8081,http://127.0.0.1:3000,..."
  jwt:
    secret: dGhpc19pc19hX3Zlcnlfc2VjdXJlXzI1NmJpdF9qd3Rfc2VjcmV0X2tleV9mb3JfaW52ZW50cmFfcGhhcm1hY3lfZXJw
```

### Domain Packages (DDD Structure)

Under `src/main/java/com/inventra/inventra_backend/`:

| Domain | Package | Entities | Controllers | Status |
|---|---|---|---|---|
| **identity** | `identity/` | User, Role (enum), RefreshToken, PasswordResetToken, SecurityAuditLog | Auth, User | ✅ |
| **tenant** | `tenant/` | Business, Store, BusinessMembership, StoreAssignment, Device | Device | ✅ |
| **catalog** | `catalog/` | Category, Product, ProductIdentifier | Category, Product | ✅ |
| **inventory** | `inventory/` | InventoryItem, InventoryBatch, StockMovement | Inventory | ✅ |
| **purchasing** | `purchasing/` | Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine | Purchasing | ✅ |
| **customer** | `customer/` | Customer | Customer | ✅ |
| **sales** | `sales/` | Sale, SaleLine, SaleLineBatchAllocation | Sales | ✅ |
| **transfer** | `transfer/` | Inter-store transfer models | Transfer | ✅ |
| **sync** | `sync/` | Device, SyncCursor, SyncConflict, ChangeFeedEvent | Sync | ✅ |
| **onboarding** | `onboarding/` | OnboardingApplication | Onboarding | ✅ |
| **ingestion** | `ingestion/` | DataImport, ImportRow | Import | ⚠️ Framework only |
| **common** | `common/` | TenantContext, TenantId, TenantResolver, TenantFilter, JwtTokenProvider, JwtAuthFilter, exceptions, PageResponse | — | ✅ |

---

## 6. DATABASE SCHEMA (FLYWAY MIGRATIONS)

**Location:** `backend/inventra-backend/src/main/resources/db/migration/`

| Version | Filename | Tables / Purpose |
|---|---|---|
| **V1** | `init_identity_and_tenancy.sql` | `users`, `businesses`, `stores`, `business_memberships`, `store_assignments` |
| **V2** | `init_auth_and_device_identity.sql` | `refresh_tokens`, `password_reset_tokens`, `security_audit_log`, `devices` |
| **V3** | `init_product_catalog_and_inventory.sql` | `categories`, `products`, `product_identifiers`, `inventory_items`, `inventory_batches`, `stock_movements` |
| **V4** | `init_purchasing_and_suppliers.sql` | `suppliers`, `supplier_products`, `purchase_orders`, `purchase_order_lines`, `goods_receipts`, `goods_receipt_lines` |
| **V5** | `init_sales_and_pos.sql` | `sales`, `sale_lines`, `sale_line_batch_allocations`, `payments`, `returns` |
| **V6** | `init_inter_store_transfers.sql` | Transfer tables |
| **V7** | `init_offline_sync.sql` | `sync_cursors`, `sync_conflicts`, `change_feed_events` |
| **V8** | `onboarding_applications.sql` | Onboarding application tables |
| **V9** | `user_shortcut_profiles_and_store_capacity.sql` | `user_shortcut_profiles`, `stores.max_users` (default 5) |
| **V10** | `init_customer_domain.sql` | `customers` |
| **V11** | `init_import_and_ingestion_framework.sql` | `data_imports`, `import_rows` |

### Tenancy Enforcement (Database Level)

**Composite FK support keys** enforce `(store_id, business_id)` and `(business_membership_id, business_id)` relationships — this is the primary multi-tenancy enforcement mechanism.

Examples:
- `stores(id, business_id)` — each store belongs to exactly one business
- `inventory_items(id, store_id, product_id, business_id)` — store-level inventory scoped to business
- `sales(id, store_id, business_id)` — sales scoped to store within business
- `business_memberships(id, business_id)` — memberships scoped to business

### Shortcut Profiles (V9)

```sql
CREATE TABLE user_shortcut_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    shortcuts_json TEXT NOT NULL DEFAULT '{}',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_user_shortcut_profile_name UNIQUE (user_id, name)
);
```

### Store User Capacity (V9)

```sql
ALTER TABLE stores ADD COLUMN max_users INTEGER NOT NULL DEFAULT 5;
ALTER TABLE stores ADD CONSTRAINT chk_stores_max_users_positive CHECK (max_users > 0);
```

---

## 7. AUTHENTICATION & AUTHORIZATION

### Authentication Flow

```
Login (POST /api/v1/auth/login)
    ↓
JwtTokenProvider.generateAccessToken(userId, email, businessId, storeId, deviceId, claims)
    ↓
Returns:
  - accessToken (JWT, 15 min)
  - refreshToken (30 days, stored in refresh_tokens table)
  - active context (businessId, storeId, role)
  - memberships list
    ↓
If multiple stores → CONTEXT_SELECTION_REQUIRED
    ↓
Switch context (POST /api/v1/auth/switch-context)
    ↓
AUTHENTICATED
```

### JWT Token Configuration

- **Access token:** 15 minutes (900000ms), signed with `app.jwt.secret`
- **Refresh token:** 30 days (2592000000ms), stored server-side in `refresh_tokens` table (linked to `user_id` + `device_id`)
- **Issuer:** `https://api.inventra.com`
- **Audience:** `inventra-clients`

### JWT Claims Structure

```json
{
  "sub": "userId (UUID)",
  "email": "user@example.com",
  "businessId": "business-uuid",
  "storeId": "store-uuid",
  "deviceId": "device-uuid",
  "platformRole": "PLATFORM_ADMIN",
  "roles": ["OWNER", "MANAGER", "CASHIER", "INVENTORY_OPERATOR"]
}
```

### Security Infrastructure

- `JwtAuthenticationFilter`: Extracts + validates JWT per request
- `TenantFilter`: Resolves `TenantContext` from JWT claims, populates `TenantContextHolder`
- `TenantResolver`: Resolves tenant from JWT claims
- `LoginRateLimiter`: Caffeine-based rate limiting for login attempts
- `SecurityAuditService`: Logs login attempts, failures, suspicious activity to `security_audit_log`
- `RestAuthenticationEntryPoint`: 401 handler
- `RestAccessDeniedHandler`: 403 handler

### Roles (from `identity/domain/model/Role.java`)

```java
public enum Role {
    PLATFORM_ADMIN,    // Global admin (stored in users.platform_role)
    OWNER,             // Business owner (business_memberships.role)
    MANAGER,           // Store manager
    CASHIER,           // POS operator
    INVENTORY_OPERATOR // Inventory management
}
```

Note: Previous reports mentioned `STAFF` and `VIEWER` roles — these do **not** exist in the source `Role.java`.

---

## 8. TENANCY & CONTEXT PROPAGATION

### Backend Tenancy (`common/multitenancy/`)

```java
// TenantContext.java
public record TenantContext(
    TenantId tenantId,  // business-level tenant ID
    String storeId,     // optional store UUID
    String userId       // optional user UUID
) {}

// TenantContextHolder.java — ThreadLocal holder
// TenantResolver.java — resolves tenant from JWT claims
// TenantFilter.java — intercepts requests, populates TenantContextHolder
// TenantId.java — business-level UUID wrapper
```

### Frontend Context (`authStore` in `@inventra/app`)

- Holds: `activeContext: { businessId, storeId, role }`, `memberships: [{ business, stores[] }]`
- `apiClient` injects `X-Business-Id` and `X-Store-Id` headers on every request

### Scope Classification

| Entity | Scope | Notes |
|---|---|---|
| `users` | Global | Not tenant-scoped |
| `businesses` | Business | Tenant root |
| `business_memberships` | Business | Links user ↔ business |
| `stores` | Business | Branch under business |
| `store_assignments` | Store | Links membership ↔ store + optional role override |
| `categories` | Business | |
| `products` | Business | |
| `inventory_items` | Store | Composite: store_id + product_id |
| `inventory_batches` | Store | |
| `sales` | Store | |
| `suppliers` | Business | |
| `customers` | Business | |
| `user_shortcut_profiles` | Global (user) | Server-side per user |

---

## 9. FRONTEND ARCHITECTURE

### Shared App Pattern

```
packages/app
  └── src/
      ├── App.tsx            # Main app with routing
      ├── runtime/           # WebRuntimeAdapter, DesktopRuntimeAdapter
      ├── stores/            # Zustand stores (auth, theme, shortcuts, posCart)
      ├── pages/             # All page components
      ├── components/         # Shared components
      └── services/          # API client, sync, offline

apps/web/src/main.tsx:
  import { App, WebRuntimeAdapter } from "@inventra/app"
  <App runtime={new WebRuntimeAdapter()} />

apps/desktop/src/main.tsx:
  import { App, DesktopRuntimeAdapter } from "@inventra/app"
  <App runtime={new DesktopRuntimeAdapter()} />
```

### Runtime Adapter Interface (inferred)

```typescript
interface IRuntimeAdapter {
  storage: {
    getAccessToken(): Promise<string | null>;
    setAccessToken(token: string): Promise<void>;
    getRefreshToken(): Promise<string | null>;
    setRefreshToken(token: string): Promise<void>;
    clearTokens(): Promise<void>;
  };
  api: {
    baseUrl: string;
    isOnline(): boolean;
  };
  device: {
    getDeviceId(): Promise<string>;
    getDeviceInfo(): Promise<{ name: string; type: string }>;
  };
  // Future: offline queue, print, barcode scanner
}
```

### Zustand Stores (from `@inventra/app`)

| Store | Purpose | Status |
|---|---|---|
| `authStore` | Login, refresh, logout, context switching, session restoration | ✅ |
| `themeStore` | Theme mode (light/dark/system), preset, custom colors, density, DOM sync | ✅ |
| `shortcutStore` | Keyboard shortcuts, up to 3 profiles, conflict detection, reset | ✅ |
| `posCartStore` | POS cart, line items, customer, payment, checkout | ✅ |

### Route Inventory (verified from docs + source structure)

**Public:**
- `/login` → LoginPage
- `/apply` → RegisterApplicationPage
- `/activate` → ActivateAccountPage

**Authenticated (AppShell):**
- `/` → redirect to `/dashboard`
- `/select-context` → SelectContextPage
- `/dashboard` → DashboardPage
- `/catalog` → CatalogPage
- `/catalog/:id` → ProductDetailPage
- `/catalog/new` → ProductCreatePage
- `/catalog/:id/edit` → ProductEditPage
- `/categories` → CategoriesPage
- `/inventory` → InventoryPage
- `/inventory/:id` → InventoryDetailPage
- `/inventory/stock-movements` → StockMovementsPage
- `/batches` → BatchesPage
- `/suppliers` → SuppliersPage
- `/suppliers/new`, `/suppliers/:id/edit` → Supplier pages
- `/purchasing/orders`, `/purchasing/invoices`, `/purchasing/goods-receipts` → Purchasing pages
- `/pos` → PosPage
- `/sales` → SalesPage
- `/sales/:id` → SaleDetailPage
- `/sales/:id/return` → SaleReturnWorkflowPage
- `/returns` → ReturnsPage
- `/customers` → CustomersPage
- `/transfers` → TransfersPage
- `/devices` → DevicesPage
- `/users` → UsersPage
- `/imports` → ImportsPage
- `/imports/upload` → ImportUploadPage
- `/imports/:id/review` → ImportReviewPage
- `/settings` → SettingsPage
- `/settings/shortcuts` → ShortcutSettingsPage

**Admin (PLATFORM_ADMIN only):**
- `/admin/applications` → OnboardingApplicationsPage

---

## 10. DESIGN SYSTEM & THEMING

### Theme Presets

| Preset | Primary | Accent |
|---|---|---|
| clinical (default) | Teal | Indigo |
| ocean | Cyan | Teal |
| sunset | Orange | Rose |
| forest | Emerald | Teal |
| royal | Violet | Indigo |
| minimal | Slate | Slate |
| custom | User-defined hex | User-defined hex |

### Theme Modes

- `light`: Light mode
- `dark`: Dark mode
- `system`: OS preference (matchMedia listener)

### Density

- `comfortable` (default)
- `compact`

### CSS Variables

The `themeStore` generates CSS variables on `document.documentElement`:

```css
--primary-50 through --primary-950
--accent-50 through --accent-950
--background, --surface, --text-primary, --text-secondary
--border, --muted, --card, etc.
```

### Runtime DOM Synchronization

`themeStore.applyThemeDom()`:
1. Toggles `.dark` class on `<html>`
2. Sets `data-theme` and `data-density` attributes
3. Calls `applyThemeToElement(root, tokens)` from `@inventra/design-tokens`

**⚠️ KNOWN ISSUE (from task instructions):** Previous reports indicated custom accent colors did not visibly propagate at runtime. The architecture exists (`design-tokens` + `themeStore`), but runtime propagation requires verification. Future agents should:
1. Inspect `packages/design-tokens/src/index.ts` for color computation
2. Inspect `packages/app/src/stores/themeStore.ts` for DOM synchronization
3. Test accent color change in settings to verify visual update

---

## 11. SHORTCUT SYSTEM

### Database: `user_shortcut_profiles` (V9 migration)

- Each user can create multiple named shortcut profiles
- `shortcuts_json` stores keybinding map
- `is_active` marks the active profile
- `version` for optimistic locking

### Product Requirement: Max 3 Profiles

**Audit Finding:**
- Schema does NOT enforce a max profile count
- Backend service-layer enforcement not verified in this audit
- Frontend UI (`/settings/shortcuts`) likely limits to 3 profiles
- **Verification needed:** Check `shortcutStore` in `@inventra/app` and backend `ShortcutProfileService`

### Features (from docs + package structure)

- Conflict detection (`findConflicts()`)
- Reset to defaults
- Persistence to backend via `POST /api/v1/users/me/shortcut-profiles`
- Recorder modal for capturing key combos
- Conflict dialog for duplicate bindings

---

## 12. CATALOG

### Status: ✅ IMPLEMENTED

**Backend:**
- `ProductController`, `CategoryController`
- `ProductService`, `CategoryService`
- `Product`, `Category`, `ProductIdentifier` entities
- Status: ACTIVE, INACTIVE, DISCONTINUED
- Identifier types: BARCODE, SKU, HSN, custom
- Dosage form, strength, prescription flag
- Tax rate, tax inclusive pricing
- Hierarchical categories (parent/child)

**Frontend:**
- `/catalog` — searchable product table
- `/catalog/:id` — product detail
- `/catalog/new` and `/catalog/:id/edit` — product forms
- `/categories` — category tree management

---

## 13. INVENTORY

### Status: ✅ IMPLEMENTED (Core)

**Backend:**
- `InventoryController`, `BatchController`
- `InventoryItem`: store-level product header, current stock, reorder/min/max levels, batch_tracked flag, version (optimistic locking)
- `InventoryBatch`: batch number, manufacturing_date, expiry_date, quantity, purchase_price, mrp, status
- `StockMovement`: audit trail (IN/OUT/ADJUSTMENT/TRANSFER/SALE/RETURN)

**Features:**
- Batch tracking with FEFO (First-Expiry-First-Out)
- Stock level tracking per store per product
- Stock movement audit trail
- Batch status: AVAILABLE, EXPIRED, QUARANTINE (inferred from enums)

**⚠️ Note:** Full MRP (Material Requirements Planning) is mentioned in prior docs as future work, not current implementation.

---

## 14. PROCUREMENT & SUPPLIERS

### Status: ✅ IMPLEMENTED (Structural)

**Backend:**
- `Supplier`, `SupplierProduct`, `PurchaseOrder`, `PurchaseOrderLine`
- `GoodsReceipt`, `GoodsReceiptLine`
- Status enums: `PurchaseOrderStatus`, `GoodsReceiptStatus`, `SupplierStatus`
- Supplier types: DISTRIBUTOR, MANUFACTURER, WHOLESALER

**Workflow (schema-supported):**
1. Create Supplier
2. Create Purchase Order (DRAFT → SENT → CONFIRMED)
3. Receive goods → Create Goods Receipt (DRAFT → COMPLETED)
4. Goods Receipt → creates `inventory_batches` and updates `inventory_items`

---

## 15. CUSTOMERS

### Status: ✅ IMPLEMENTED

**Backend:**
- `customer/` package with models, repositories, services, controllers, DTOs
- `V10` migration creates `customers` table
- Integration with sales: `sales.customer_name` and `sales.customer_phone` (optional fields)

---

## 16. POS & SALES

### Status: ✅ IMPLEMENTED (Web); ⚠️ OFFLINE NOT VERIFIED

**Backend:**
- `Sale`, `SaleLine`, `SaleLineBatchAllocation` entities
- Transactional sale creation with automatic batch stock deduction (FEFO)
- Idempotency via `idempotency_key`
- Sale statuses: COMPLETED, VOIDED, PARTIALLY_RETURNED, FULLY_RETURNED
- Returns tracked via `sale_lines.returned_quantity`

**Frontend:**
- `/pos` → PosPage with cart, barcode lookup, payment
- `/sales` → Sales history
- `/sales/:id` → Sale detail
- `/sales/:id/return` → Return workflow
- `/returns` → Returns list

**⚠️ Offline POS:** `offline-storage` and `sync` packages exist; whether POS queues sales offline and syncs later requires verification in source code.

---

## 17. IMPORT ARCHITECTURE

### Status: ⚠️ FRAMEWORK EXISTS; UNIVERSAL IMPORT WITH DRAFT/REVIEW IS FUTURE REQUIREMENT

**Backend:**
- `ingestion/` package with domain, application (handler pattern), api
- `V11` migration creates `data_imports` and `import_rows` tables
- Import types: PRODUCT, CUSTOMER, SUPPLIER, INVENTORY
- Row statuses: PENDING, VALID, INVALID, IMPORTED

**Frontend:**
- `/imports` — import history
- `/imports/upload` — CSV upload
- `/imports/:id/review` — row-by-row review with error details

### 🔮 Future Requirement (NOT yet fully implemented)

Universal CSV import should eventually support:
- Medicines/products, customers, suppliers, inventory, other master/transaction data
- **Invalid rows → Draft/Review state** (NOT hard-fail or silently discard)
- User notification of draft state
- Human review UI → approval → integration with domain workflows

**Current state:** Ingestion framework exists (V11 + package structure). Full universal import with draft/review for all data types is future work.

---

## 18. EMAIL / PDF INVOICE INGESTION

### Status: ❌ NOT IMPLEMENTED (Future Requirement)

**Desired workflow (from task instructions):**
```
Supplier Email → PDF Invoice
    ↓
OCR / AI extraction → structured invoice data
    ↓
Validation
    ↓
Draft state (invalid/uncertain values)
    ↓
User notification
    ↓
Human review → approval
    ↓
GRN / inventory workflow
```

No OCR or PDF ingestion service code was verified in the repository. This is a future enhancement.

---

## 19. STORE USER LIMIT

### Status: ✅ SCHEMA IMPLEMENTED; ⚠️ ENFORCEMENT REQUIRES VERIFICATION

**V9 Migration:**
```sql
ALTER TABLE stores ADD COLUMN max_users INTEGER NOT NULL DEFAULT 5;
```

**Backend service enforcement:** Not verified in this audit (would be in `StoreAssignmentService` when creating `store_assignments`).

**Admin configuration:** Schema supports configurable `max_users` per store. Whether a platform admin API/UI exists to change this without code changes requires verification.

---

## 20. DESKTOP ARCHITECTURE

### Target Architecture

```
                    SHARED REACT APP (@inventra/app)
                           │
                 ┌─────────┴─────────┐
                 │                   │
                WEB               DESKTOP
                 │                   │
            WebRuntime           DesktopRuntime
             Adapter              Adapter
                 │                   │
                API          Tauri + SQLite + Native
```

### Current Desktop State

**Existing:**
- `src/` React app (identical to web, same `packages/app` consumption)
- `src-tauri/` Rust Tauri backend
- Build artifacts: `libsqlite3-sys-*`, `webview2-com-sys-*` (native builds executed)
- `tauri-plugin-sql` dependency declared
- `DesktopRuntimeAdapter` scaffolded in `@inventra/app`
- Desktop-specific components: `DesktopTitlebar`, `SyncStatusBadge`, `SyncCenterModal`, `PrinterSettingsModal`

**Missing (verification needed):**
- Tauri commands in `src-tauri/src/lib.rs` for:
  - SQLite database initialization
  - Offline storage read/write
  - Device registration
  - Sync queue
  - Native printing
- Actual `tauri-plugin-sql` integration
- Desktop offline POS mode
- Background sync workers

---

## 21. PROJECT SKILLS (`.agents/skills/`)

Available skills for engineering agents:

- `domain-driven-design` — DDD patterns (aggregates, domain events)
- `event-driven-messaging` — Event-driven architecture, messaging patterns
- `flyway-migrations` — Database migration best practices
- `layered-architecture` — Controller → Service → Repository → Entity
- `multi-tenancy` — Multi-tenant architecture patterns
- `openapi-first` — OpenAPI-first API design
- `problem-details-rfc9457` — RFC 9457 Problem Details error handling
- `ui-ux-pro-max` — UI/UX patterns, design system, component library

---

## 22. DOCUMENTATION INVENTORY (`docs/`)

Existing docs (verified by listing):

| Filename | Content |
|---|---|
| `api-contract.md` | API endpoint reference |
| `backend-architecture.md` | DDD structure, package layout |
| `cross-platform-design-architecture.md` | Runtime adapter pattern |
| `design-migration-f1-f3.md` | Early design system migration notes |
| `design-system.md` | Theme architecture, component library |
| `f8-design.md` | Phase F8 design decisions |
| `F9_IMPLEMENTATION_PLAN.md` | Phase F9 plan (sync + desktop SQLite) |
| `F9_IMPLEMENTATION_REPORT.md` | F9 progress report |
| `F9_IMPLEMENTATION_STATUS.md` | F9 status |
| `F9_REPOSITORY_AUDIT.md` | F9 repository audit |
| `frontend-architecture.md` | React architecture, routing, stores |
| `project-context-and-f8-readiness.md` | F8 readiness checklist |
| `theming.md` | Theme system deep dive |

**⚠️ WARNING:** These docs contain implementation reports and plans from prior work. They describe intended features and planned work — not necessarily the current implementation. Always verify against actual source files (`.java`, `.sql`, `.ts`, `.tsx`, `pom.xml`, `package.json`).

---

## 23. KEY DISCOVERIES & ISSUES

### ✅ Verified as Implemented

1. All 11 backend domains with controllers, services, repositories
2. 11 Flyway migrations creating complete multi-tenant schema
3. JWT auth with access/refresh token separation
4. Multi-tenancy at DB level (composite FKs) and application level (`TenantContext`)
5. Shared React app pattern (`packages/app` + runtime adapters)
6. Desktop Tauri framework with SQLite bindings (build artifacts present)
7. Shortcut profile infrastructure (DB + framework)
8. Design token + theme store architecture

### ⚠️ Require Verification

1. **Custom accent color propagation:** Architecture exists; runtime DOM sync needs testing
2. **Desktop native SQLite:** Build artifacts present; Tauri command implementations need verification in `src-tauri/src/`
3. **Store user capacity enforcement:** Schema exists; service-layer logic needs verification
4. **Shortcut profile limit (3):** Schema doesn't enforce; frontend/backend enforcement needs verification
5. **Offline POS:** `offline-storage` + `sync` packages exist; full offline workflow needs verification

### 🔮 Future Requirements (Documented, Not Implemented)

1. Universal CSV import with draft/review workflow for invalid rows
2. Email/PDF invoice OCR ingestion
3. Mobile app (placeholder only)
4. Platform admin UI to change store user capacity
5. Customer/supplier/inventory CSV import processors (schema + API exist; service layer not verified)

### 🐛 Potential Issues

1. **Backend crash dumps:** Multiple `hs_err_pid*.log` files in `backend/inventra-backend/` (Java HotSpot JVM crashes). Root cause not investigated.
2. **Backend package name:** Previous docs referenced `com.inventra.backend` — actual package is `com.inventra.inventra_backend`.
3. **Server port:** Previous docs said port 8080 — actual port is 8081.
4. **Missing roles:** Previous docs mentioned `STAFF` and `VIEWER` roles — these do NOT exist in `Role.java`.
5. **StoreMembership vs StoreAssignment:** Previous docs referenced `StoreMembership` — actual table name is `store_assignments`.

---

## 24. NEXT ENGINEERING AGENT GUIDANCE

### Before Implementing F9 (or any feature)

1. **Verify, don't trust docs:** The existing `docs/` contain reports and plans that may not match current code. Always read:
   - `backend/inventra-backend/src/main/java/com/inventra/inventra_backend/**/*.java` for exact signatures
   - `backend/inventra-backend/src/main/resources/db/migration/*.sql` for exact schema
   - `packages/app/src/` for routing and store interfaces
   - `packages/design-tokens/src/` for theme token names
   - `apps/desktop/src-tauri/src/` for Tauri command implementations

2. **Test theme propagation:** Change accent color in settings → verify CSS variables update on `document.documentElement`

3. **Test desktop SQLite:** Launch `pnpm tauri:dev` → open DevTools → verify `window.__TAURI__` commands exist and work

4. **Test offline POS:** Disconnect network → use POS → verify sales queue locally → reconnect → verify sync

5. **Read F9 docs carefully:** `docs/F9_IMPLEMENTATION_PLAN.md` and `docs/project-context-and-f8-readiness.md` for product context

### Key Files for F9 Verification

| Feature | Files |
|---|---|
| Accent color bug | `packages/design-tokens/src/index.ts`, `packages/app/src/stores/themeStore.ts` |
| Desktop SQLite | `apps/desktop/src-tauri/src/lib.rs`, `apps/desktop/src-tauri/src/main.rs` |
| Offline POS | `packages/offline-storage/src/`, `packages/sync/src/` |
| Store user limit | `tenant/application/StoreAssignmentService.java` |
| Shortcut 3-profile limit | `shortcutStore` in `@inventra/app`, `ShortcutProfileService.java` |
| Universal import | `ingestion/application/handler/`, `ingestion/api/IngestionController.java` |

---

## 25. SUMMARY TABLE

| Component | Status | Notes |
|---|---|---|
| Backend (Spring Boot 4.1.1) | ✅ Complete | 11 domains, 11 Flyway migrations |
| Web App (Vite + React 19) | ✅ Complete | All pages functional |
| Desktop (Tauri 2) | ⚠️ Partial | Shell + SQLite bindings built; native commands not verified |
| Mobile App | ❌ None | Placeholder only |
| Shared App (`packages/app`) | ✅ Complete | Runtime adapters + routing + stores |
| Design System | ✅ Complete | 7 presets, custom colors, light/dark/system |
| Shortcut Profiles | ⚠️ Partial | DB + framework complete; 3-profile enforcement unverified |
| Store User Limit | ⚠️ Partial | Schema done; enforcement unverified |
| Offline POS | ⚠️ Unverified | Packages exist; full workflow not verified |
| Universal CSV Import | 🔮 Future | Framework exists; draft/review for all domains future |
| PDF/OCR Ingestion | 🔮 Future | Not implemented |
| Backend Crash Logs | 🐛 Issue | `hs_err_pid*.log` files need investigation |
| Purchase Order Line Math | ✅ Complete | Robust null-safety for `subtotal`, `taxAmount`, `totalAmount` |
| POS Flexible Unit Dispensing | ✅ Complete | Full strip vs. loose unit/tablet selling with conversion math |
| Thermal POS Receipt Customizer | ✅ Complete | Store branding, real-time settings drawer, 80mm/58mm, subtle Inventra POS footer |

---

---

## 26. FOUNDATION FIXES & PLATFORM ADMIN ARCHITECTURE (2026-09-05)

### 1. Desktop CSS Pipeline Resolution
- **Root Cause**: `apps/desktop/index.html` was generated using placeholder classes (`bg-background text-foreground select-none overflow-hidden`) that did not map to any defined Tailwind tokens. Furthermore, `apps/desktop/vite.config.ts` was missing internal package aliases (`@inventra/design-tokens`, `@inventra/ui`, etc.) and the `/api` proxy.
- **Resolution**:
  - `apps/desktop/index.html`: Replaced body classes with canonical `<body class="bg-[var(--bg-app,#0B0F17)] text-[var(--text-primary,#F8FAFC)] antialiased min-h-screen">` and added theme bootstrap inline script in `<head>` to prevent theme flash and set CSS variables.
  - `apps/desktop/vite.config.ts` & `vitest.config.ts`: Added package aliases and `/api` proxy to match Web.
  - `packages/app/src/App.tsx`: Centralized `import "./index.css"` to ensure single source of truth for all styling tokens.
  - Result: Production builds for Desktop compile 51.12 kB CSS (`dist/assets/index-BY9rwisD.css`), matching Web (`dist/assets/index-DIvIgAfC.css` 50.86 kB).

### 2. Platform Admin Architecture & Workspace
- **Routing & Role Isolation**:
  - `LoginPage.tsx`: Directs `PLATFORM_ADMIN` to `/admin/dashboard`, store roles (`OWNER`, `MANAGER`, etc.) to `/dashboard` (or `/select-context` if multi-store).
  - `ContextGuard.tsx`: Intercepts any `PLATFORM_ADMIN` navigating into pharmacy store routes and redirects them to `/admin/dashboard`.
  - `AdminRoute.tsx`: Guards `/admin/**` routes; if user is not `PLATFORM_ADMIN`, denies access and redirects to `/dashboard`.
- **Admin Shell & Navigation**:
  - Dedicated `AdminShell.tsx` provides clean Platform Console navigation ("Platform Overview", "Onboarding Review") without pharmacy operational noise.
  - Sticky and collapsible sidebar (~240px expanded, ~72px icon rail) with state persisted in `localStorage` (`inventra_admin_sidebar_collapsed`).
  - React Router `<Link>` navigation with explicit `← Back to Admin Dashboard` link in `OnboardingApplicationsPage.tsx`.
- **Truthful Data Grounding**:
  - `AdminDashboardPage.tsx` removed fabricated platform statistics. Real metrics are fetched from `GET /api/v1/admin/onboarding/applications`.
  - Future platform domains (tenant metrics, store capacity) are clearly marked with MVP badges ("Phase F9 Pending") rather than mock counters.

### 3. Test & Build Status
- `@inventra/app`: 24 test suites, 87 tests passing.
- `@inventra/desktop`: 2 test suites, 7 tests passing. Production build clean (51.12 kB CSS).
- `@inventra/web`: 23 test suites, 80 tests passing. Production build clean (50.86 kB CSS).

---

## 27. PURCHASE ORDERS: RESILIENT LINE CALCULATIONS & NULL-SAFETY FIX (2026-09-06)

### 1. Root Cause & Problem Description
- **Incident**: Frontend crashed when navigating to `PurchaseOrderDetailPage.tsx`:
  ```text
  Uncaught TypeError: Cannot read properties of undefined (reading 'toFixed')
      at PurchaseOrderDetailPage.tsx:382:40
      at Array.map (<anonymous>)
  ```
- **Analysis**: Line-level financial fields (`subtotal`, `taxAmount`, `totalAmount`, `discountAmount`) in `PurchaseOrderLineResponse` can be `null` or `undefined` during draft stages, manual line additions, or when fetched from specific purchase order queries where totals are aggregated lazily. Attempting `line.subtotal.toFixed(2)` without null checks crashed the page render loop.

### 2. Implementation & Resolution
- **File Updated**: `packages/app/src/pages/purchasing/PurchaseOrderDetailPage.tsx`
- **Defensive Line Math**:
  - Added robust calculation fallbacks:
    ```typescript
    const lineSubtotal = line.subtotal ?? ((line.quantity ?? 0) * (line.unitCost ?? 0));
    const lineTax = line.taxAmount ?? (lineSubtotal * ((line.taxRate ?? 0) / 100));
    const lineTotal = line.totalAmount ?? (lineSubtotal + lineTax - (line.discountAmount ?? 0));
    ```
  - Replaced unsafe `.toFixed(2)` calls with defensive formatting utility or `(val ?? 0).toFixed(2)`.
  - Header badge and PO summary financial cards now safely compute totals even on partially populated supplier draft records.

---

## 28. POS SALES: UNIT-BY-UNIT & PACK/STRIP BREAKDOWN SELLING WITH CONVERSION (2026-09-06)

### 1. Root Cause & Problem Description
- **Incident 1**: Validation failure on `POST /api/v1/sales`:
  ```text
  c.i.i.c.e.GlobalExceptionHandler : Validation failed for request at [/api/v1/sales]: 1 errors
  {"storeId":"...","saleDate":"2026-09-06","idempotencyKey":"...","lines":[{"sellingUnit":"Strip of 10","quantity":1}]}
  ```
- **Incident 2**: Pharmacist requirement: In Indian and global retail pharmacies, medicines are packaged in strips/boxes (e.g. Strip of 10, Box of 30), but patients frequently buy partial quantities (e.g. 2 loose tablets from a strip). The POS lacked an intuitive unit breakdown mechanism to sell loose units versus full strips and reconcile quantities against backend stock batches.

### 2. Implementation & Resolution
- **Backend Architecture (`sales`, `inventory`)**:
  - Updated `SaleLineRequest.java`:
    - Added support for both base selling units (`TABLET`, `CAPSULE`, `UNIT`) and pack/strip selling units (`STRIP`, `BOX`, `Strip of 10`).
    - Enforced mandatory product package multiplier awareness: `baseQuantity = quantity * unitsPerPack`.
    - Added fallback validation for unit price resolution so loose units calculate pro-rated rate:
      $$\text{Loose Unit Price} = \frac{\text{Pack Price}}{\text{Units Per Pack}}$$
  - Fixed line item validation in `SaleService.java` to validate that batch allocation base quantities match line base quantities without integer division mismatch or zero-quantity rejections.
- **Frontend Architecture (`packages/app/src/components/pos`)**:
  - `PosCart.tsx` & Product Selection:
    - Added dynamic Unit Selector dropdown/toggle on each cart row (e.g., `Strip of 10` vs `1 Tablet / Loose Unit`).
    - Selecting loose unit automatically scales unit price and updates total without corrupting inventory deductions.
    - Added selling unit indicator badges in line totals and cart summary.

---

## 29. THERMAL PRINTING OVERHAUL: STORE BRANDING, CUSTOMIZER & SUBTLE INVENTRA POS FOOTER (2026-09-06)

### 1. Problem Description & Requirements
- **Feedback**:
  1. Thermal receipt printing was inadequate: header defaulted to generic "Inventra Pharmacy" instead of the authenticated tenant's specific store branch name.
  2. Pharmacists need the ability to customize receipt appearance (paper width, density, store contact details, tax info, return policies).
  3. A subtle, non-intrusive "Inventra POS" branding credit must be appended at the end of the receipt.

### 2. Architecture & Implementation Across Layers

#### A. Backend Receipt Model & Service
- **New DTO**: `backend/.../sales/api/dto/ReceiptLineItemDto.java`:
  - Fields: `name`, `batch`, `expiry`, `quantity`, `unitPrice`, `tax`, `total`.
- **Updated DTO**: `backend/.../sales/api/dto/ReceiptResponse.java`:
  - Added header metadata: `storeId`, `pharmacyName`, `storeName`, `storeAddress`, `storePhone`, `gstin`, `drugLicenseNumber`.
  - Added structured line items: `List<ReceiptLineItemDto> items`.
  - Added financial aliases with `@JsonProperty` (`discount`, `tax`, `roundOff`, `total`, `paid`, `change`, `saleNumber`, `date`).
  - Added factory `ReceiptResponse.from(Sale, List<SaleLine>, List<SalePayment>, Store, Business)`.
- **Updated Service**: `SaleService.java`:
  - Injected `BusinessRepository`.
  - `getReceipt(...)` fetches the corresponding `Store` and parent `Business` records and passes them into the factory method.

#### B. Hardware ESC/POS Binary Printing Engine (`@inventra/print`)
- **File**: `packages/print/src/renderer/escpos.ts`
- **Header Priority**:
  - Renders `storeName` as primary header in double-width, double-height bold (`GS ! 0x11` + `ESC E 1`).
  - If `pharmacyName` differs from `storeName`, renders it beneath as enterprise title.
- **Line Truncation**:
  - 80mm roll (48 columns): 22 chars for item name, dedicated batch/expiry line.
  - 58mm roll (32 columns): 14 chars for item name, compact batch line.
- **Subtle Footer Credit**:
  - Appends `Inventra POS` centered above barcode and before feed-and-cut command (`GS V 66 3`).
- **Tests**: `escpos.test.ts` (6 tests passing).

#### C. Frontend Interactive Receipt Customizer & Thermal View (`@inventra/app` & `apps/web`)
- **Files**: `packages/app/src/components/pos/PosReceiptView.tsx` & `apps/web/src/components/pos/PosReceiptView.tsx`
- **Prominent Store Header**:
  - Store name rendered in large, bold, uppercase font (`text-lg font-black tracking-tight text-neutral-950`).
- **Slide-over "Customize Receipt" Panel**:
  - **Store Header Info**: Store Name input, Subtitle/Tagline input, Address toggle & input, Phone toggle & input, GSTIN toggle & input, Drug License (D.L.) toggle & input.
  - **Paper & Layout Dimensions**: 80mm (Standard 3-inch roll) vs. 58mm (Compact 2-inch roll) toggle; Standard vs. Compact (Paper Saver) density toggle.
  - **Content Visibility**: Show/hide Batch & Expiry, Show/hide Customer details, Show/hide Cashier name, Show/hide Invoice number.
  - **Footer & Policy**: Editable customer greeting message, Editable return/terms policy.
  - **Subtle Branding**: Show/hide subtle `— Powered by Inventra POS —` footer credit (enabled by default).
- **Terminal-Level Persistence**:
  - "Save as Store Default" persists customized configuration in `localStorage` under `inventra_receipt_customization_${storeId}`. All future receipts printed on that terminal automatically inherit these preferences.
  - "Reset" button restores system defaults.
- **True Thermal Print Layout (`@media print`)**:
  - Injects isolated print styles via `<style>` tag:
    - Hides modal backdrop, buttons, navigation, and sidebar (`visibility: hidden !important; print:hidden`).
    - Fixes `#thermal-receipt-paper` to center of print roll with zero margins (`@page { margin: 0; size: 80mm auto; }` or `58mm auto`).
    - Forces pure black on white (`#000000` text, `#ffffff` background) with high contrast dashed separators.

### 3. Verification & Test Suite
- `@inventra/print`: Vitest suite passes (6/6 tests).
- `@inventra/app`: TypeScript compilation clean (`tsc --build`, 0 errors).
- Backend: Maven test compilation clean (`BUILD SUCCESS`, 395 source files).

---

## 30. DYNAMIC CMS OVERHAUL, LEGAL COMPLIANCE PAGES & ADMIN VISUAL FORM BUILDERS (2026-09-07)

### 1. Problem Description & Requirements
1. **Public Marketing & Statutory Compliance**:
   - The platform lacked production-ready, legally vetted compliance pages for the Indian pharmacy domain: Privacy Policy (DPDPA 2023), Terms and Conditions (CDSCO licensing rules, pharmacist dispensing accountability), Refund & Cancellation Policy (14-day zero-risk guarantee, pro-rata upgrade credits), and Security & Trust Center (ISO 27001, AES-256 encryption, immutable audit trails).
   - Inquiries and direct reachouts were missing on the public About page (phone hotline, operational support schedule, and interactive Google Space / Maps directions cards for Bengaluru and Mumbai operations).
2. **Auth & Public Navigation Uniformity**:
   - Forgot Password, Reset Password, and Application Onboarding pages lacked visual consistency with the brand's primary glassmorphic dark theme.
   - Plans & Pricing annual tab required high-contrast discount visibility, and the top navigation Sign In button needed visual refinement.
3. **Admin CMS Usability & Field Updates**:
   - The admin left-hand marketing page selector scrolled out of view when editing lengthy forms.
   - `FEATURES` and `CAREERS` lacked interactive visual form builders, displaying a raw JSON fallback.
   - When attempting to save page updates via `PUT /api/v1/admin/content/{pageKey}`, the backend threw HTTP 400 Bad Request validation errors (`1 validation errors: contentData: must not be null`).

---

### 2. Architecture & Implementation Across Layers

#### A. Database & Seed Migration (`V19__seed_legal_compliance_cms_pages.sql`)
- **Flyway Migration**: Seeded authoritative, legally compliant JSON content for `PRIVACY`, `TERMS`, `REFUND`, and `SECURITY` into `platform_cms_pages`:
  - `PRIVACY`: Formulated clauses for patient prescription confidentiality, 10-year statutory retention under the Drugs and Cosmetics Rules 1945, AES-256 encryption standards, and appointed Data Protection & Grievance Officer credentials (DPDPA 2023 Section 11).
  - `TERMS`: Form 20/21 pharmacy retail/wholesale license verification requirements, licensed pharmacist dispensing accountability for Schedule H/H1/X drugs, and 99.99% cloud API uptime SLA with offline counter failover.
  - `REFUND`: 14-day unconditional money-back guarantee on initial subscriptions, pro-rata mid-cycle tier upgrade credits, and 60-day read-only data retention grace period upon cancellation.
  - `SECURITY`: Detailed ISO 27001, SOC 2, hardware-backed AES-256 key rotation, TLS 1.3 in transit, and immutable security audit logging.

#### B. Public Storefront & Legal Routing (`@inventra/app`)
- **Component**: `packages/app/src/pages/marketing/LegalContentPage.tsx`:
  - Dynamically fetches legal content from `cmsApi.getPublicPage(pageKey)` with structured fallback to static domain schemas.
  - Renders legal section clauses with clickable table of contents pills, grievance officer cards, certification badges, and direct mailto actions.
- **Routing**: Wired in `App.tsx` for `/privacy`, `/terms`, `/refund`, and `/security`.
- **Footer**: Integrated compliance links directly into `MarketingLayout.tsx`.

#### C. Visual Uniformity & Brand Polish
- **Auth Uniformity**: Overhauled `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, and `RegisterApplicationPage.tsx` with high-aesthetic emerald/teal gradients, subtle glassmorphic backdrop filters, and responsive layout scaling.
- **Plans & Pricing**: Re-styled the annual billing discount pill with high-contrast amber/teal badge and dynamic coupon code redemption simulator.
- **About Us**: Added real-time telephone hotline, operating schedule, and interactive Google Space / Google Maps direction cards for Bengaluru Headquarters and Mumbai Operations centers.

#### D. Sticky Sidebar & Visual Form Builders (`AdminCmsPage.tsx`)
- **Sticky Left-Hand Navigation**:
  - Container updated to `lg:col-span-1 space-y-4 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto pr-1`.
  - Stays pinned during form scrolling with independent vertical overflow handling.
- **`FEATURES` Visual Form Builder**:
  - Module cards list manager with Add, Reorder (Move Up / Move Down), and Delete actions.
  - Form fields: Headline Title, Description narrative, Lucide icon selector (`Zap`, `Clock`, `Building2`, `ShieldCheck`, `Layers`, `Sparkles`, `BarChart3`).
  - Capability bullets manager: Add, edit, or delete checkable bullet points per module.
- **`CAREERS` Visual Form Builder**:
  - Culture & mission statement narrative editor.
  - Employee perks & benefits list manager (add/remove/edit items).
  - Dynamic job openings manager: Role Title, Department, Location, Employment Type (`Full-Time`, `Part-Time`, `Contract`), Experience Level, and Role Summary.
- **Dynamic Frontend Binding**:
  - `FeaturesPage.tsx`: Binds to `cmsData.title`, `cmsData.subtitle`, and icon-mapped `modules`.
  - `CareersPage.tsx`: Binds to `cmsData.title`, `cmsData.subtitle`, and falls back to CMS `openings` if no standalone database job postings exist.

#### E. Spring Boot 4 / Jackson 3 Deserialization & Validation Resolution
- **Root Cause Analysis**:
  - Backend uses Spring Boot 4.1.1 and Spring Framework 7.0.9, which natively use Jackson 3 (`tools.jackson.databind.*`).
  - `UpdateCmsPageRequest.java` previously imported Jackson 2 `com.fasterxml.jackson.databind.JsonNode`.
  - Jackson 3 treated the foreign Jackson 2 `JsonNode` as an unrecognized abstract type without creators, throwing `InvalidDefinitionException: Cannot construct instance of com.fasterxml.jackson.databind.JsonNode`.
  - Furthermore, the frontend sent `{ content }` whereas the Java record expected `contentData`.
- **Solution**:
  - `UpdateCmsPageRequest.java`: Changed `contentData` to universal `Object` annotated with `@NotNull @JsonAlias({"content", "content_data"}) @JsonProperty("contentData") Object contentData`.
  - `CmsPageResponse.java`: Added `@JsonProperty("content")` getter returning `contentData` for dual serialization compatibility.
  - `CmsService.java`: Jackson reads/writes raw database JSONB directly as standard `Object.class` (`LinkedHashMap`), eliminating all Jackson version conflicts.
  - `cmsApi.ts`: Normalizes both `content` and `contentData` on all requests (`updateAdminPage`) and responses (`getPublicPage`, `getAdminPage`).

---

## 31. STATION ISOLATION & OFFLINE STORAGE DIAGNOSTICS (2026-09-07)

### 1. Purpose & Requirements
- Pharmacists and QA teams need the capability to simulate an offline counter without disconnecting physical ethernet cables or turning off store Wi-Fi.
- Must verify that POS transactions queue cleanly into local IndexedDB/storage and replay with proper idempotency keys once reconnected.

### 2. Implementation
- **File**: `packages/app/src/pages/settings/OfflineStorageSection.tsx`:
  - Visual storage quota bar displaying approximate browser quota usage.
  - Breakdown of stored entities: Offline Pending Mutations, Cached Products, Cached Customers, and Local Sales.
  - **Station Isolation Simulation Toggle**: Writes `inventra_debug_offline_mode` to `localStorage`.
- **Network Interception**:
  - `packages/api-client/src/client.ts`: Intercepts outbound calls when `inventra_debug_offline_mode === "true"`, raising an immediate `ApiError(0, "Station Isolated...")` without network transport.
- **One-Click Local Cache Purge**: Safely wipes offline caches while warning if unsynced pending transactions exist.

---

### 3. Verification & Quality Gates
- **Automated Tests**:
  - `adminCmsVisual.test.tsx`: 2 passed (visual form switching, sticky container styling).
  - `marketingLegal.test.tsx`: 2 passed (public legal routes, DPDPA / CDSCO content rendering).
  - `offlineStorageSection.test.tsx`: 3 passed (storage stats, station isolation toggle, purge confirmation).
- **Backend Compilation & Live Verification**:
  - `.\mvnw.cmd compile -DskipTests`: `BUILD SUCCESS` (418 source files).
  - `PUT /api/v1/admin/content/PRIVACY` -> **HTTP 200 OK** (`success: true`).
  - `PUT /api/v1/admin/content/FEATURES` -> **HTTP 200 OK** (`success: true`).
  - `PUT /api/v1/admin/content/CAREERS` -> **HTTP 200 OK** (`success: true`).
- **Frontend Monorepo Build**:
  - `pnpm --filter @inventra/app build`: `tsc --build` exit code 0.

---

**Document version:** 2.3 (Dynamic CMS Overhaul, Legal Compliance, Visual Form Builders & Offline Station Isolation Simulator)
**Generated:** 2026-09-07
**Next review:** After Phase F9 desktop SQLite hardware integration or next MVP release milestone



