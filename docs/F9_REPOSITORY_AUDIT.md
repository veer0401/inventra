# Inventra Phase F9: Comprehensive Repository Audit & Baseline Assessment

**Document Status:** Approved Baseline Audit  
**Phase Target:** F9 — Desktop Offline Operations + Thermal POS Printing  
**Monorepo Root:** `d:\project\anti-gravity-projects\inventra`  
**Date:** 2026-08-28  

---

## 1. Executive Summary & Existing Architecture

The Inventra Pharmacy ERP monorepo is architected as a modular, domain-driven multi-tenant application powered by:
- **Monorepo / Build System:** Turborepo 2.4.4, pnpm 10.24.0 workspaces, TypeScript 5.7.3.
- **Backend:** Spring Boot 3.x / Java 21, Spring Security (stateless JWT RBAC), Spring Data JPA, Hibernate, Flyway database migrations (V1–V11 applied), PostgreSQL.
- **Frontend Core:** React 19, Vite, TailwindCSS (design-token driven), Zustand 5.x state management, TanStack Query 5.x, React Router 6.x.
- **Shared Packages (`packages/`):**
  - `@inventra/api-types`: Canonical DTO contracts and domain types across web, desktop, and mobile.
  - `@inventra/api-client`: Axios-based HTTP client with JWT interceptor and RFC 9457 error normalization.
  - `@inventra/design-tokens`: 5 curated theme presets (`clinical`, `slate`, `emerald`, `midnight`, `corporate`), CSS custom property generator, OKLCH primary/accent runtime computations.
  - `@inventra/ui`: Core UI component library (`Button`, `Input`, `Dialog`, `Toast`, `Table`, `Badge`, `ShortcutHint`, status badges).
  - `@inventra/validation`: Zod schemas for authentication, onboarding, shortcuts, and input validation.
  - `@inventra/shared`: Canonical JSON serializer (`canonicalizeJson`) and Web Crypto SHA-256 checksum utility (`computePayloadChecksum`).

---

## 2. Existing Desktop / Tauri Status

- **Repository Path:** `apps/desktop`
- **Current State:** **Scaffold / Placeholder Only**
- **Files Present:**
  - `apps/desktop/package.json`: Private package `@inventra/desktop` referencing workspace dependencies (`@inventra/api-client`, `@inventra/api-types`, `@inventra/shared`, `@inventra/ui`, `@inventra/validation`). Scripts contain placeholder commands (`"build": "echo 'Desktop build placeholder for Phase F8'"`).
  - `apps/desktop/README.md`: 7-line placeholder document.
- **Missing Desktop Artifacts:**
  - No `src-tauri/` directory.
  - No `tauri.conf.json`, `Cargo.toml`, or Rust backend code.
  - No `tauri-plugin-sql`, native window lifecycle hooks, or native titlebar integration.
- **Finding:** A genuine Tauri 2.x desktop shell must be constructed from scratch, reusing the existing React UI, design-token system, shortcut engine, and API contracts.

---

## 3. Existing Synchronization Status

### Backend (`com.inventra.inventra_backend.sync`) — Fully Implemented & Verified
- **Flyway Migration `V7__init_offline_sync.sql`:**
  - `sync_operations`: Tracks client-submitted operations with composite foreign keys `(business_id, store_id)`, `(business_id, device_id)`, `(business_id, event_id)`, and `(business_id, device_sequence_number)`. Includes `payload_checksum`, `status`, `server_entity_id`, `error_code`, `retry_count`, and timestamps.
  - `sync_change_feed`: Monotonic change stream with `change_seq BIGSERIAL PRIMARY KEY`, `business_id`, `store_id`, `entity_type`, `entity_id`, `operation` (`UPSERT`/`DELETE`), `entity_version`, and `payload JSONB`.
  - `sync_device_states`: Tracks `last_synced_sequence_number`, `last_downloaded_cursor`, and `last_sync_at` per device.
- **REST Endpoints (`SyncController.java`):**
  - `POST /api/v1/sync/upload`: Accepts `SyncUploadRequest` containing up to 50 `SyncOperationRequest` items sorted by sequence number.
  - `GET /api/v1/sync/download`: Returns `SyncDownloadResponse` with cursor-paginated `ChangeFeedEntry` items.
- **Application Services & Security:**
  - `SyncService.java`: Enforces device registration, tenant matching, active device status (`DEVICE_REVOKED` rejection), and prevents device impersonation.
  - `SyncOperationProcessor.java`: Processes operations in isolated transactions (`PROPAGATION_REQUIRES_NEW`), validates canonical JSON SHA-256 checksums, enforces idempotency via `sync_operations` and `Sale.idempotencyKey`, verifies price snapshots against current master records, and dispatches to authoritative services (`SaleService.checkoutSale`, `SaleReturnService.createReturn`, `TransferService.requestTransfer`).
  - `ChangeFeedPublisher.java`: Integrated with `ProductService`, `CategoryService`, and `InventoryService`.
- **Backend Test Coverage:** 27 automated tests passing (`SyncControllerIntegrationTest`, `SyncCrashRecoveryIntegrationTest`, `SyncConcurrencyIntegrationTest`).

### Frontend Sync Status — Types Ready, Client Engine Missing
- `packages/api-types/src/sync.ts` defines `SyncOperationRequest`, `SyncBatchUploadRequest`, `SyncOperationResponse`, `SyncBatchUploadResponse`, `SyncChangeFeedItem`, and `SyncDownloadResponse`.
- `packages/shared/src/canonical.ts` provides `canonicalizeJson` and `computePayloadChecksum` matching backend SHA-256 hashing.
- **Missing Frontend Artifacts:** No client-side SQLite storage, offline queue store, network monitor, or sync background worker currently exists.

---

## 4. Existing POS Status

- **Web Implementation:** `apps/web/src/pages/pos/PosPage.tsx` (628 lines).
- **Core Capabilities:**
  - Fast product search via TanStack Query (`/api/v1/sales/pos-products/search`).
  - Cart state in `apps/web/src/stores/posCartStore.ts` (supports item addition, batch tracking, quantity modification, discounts, customer assignment, GST/tax calculation, round-off).
  - Modals: `PosCheckoutModal.tsx` (multi-tender payments: `CASH`, `UPI`, `CARD`, `CREDIT`), `PosSaleSuccessModal.tsx`, `CustomerSelectModal.tsx`.
- **Online/Offline Boundary in Web:**
  - Web UI listens to `navigator.onLine` and renders a warning banner: `Terminal Offline — Sales checkout disabled`. Checkout button is disabled when offline.
- **Finding for Desktop:** Desktop must replace the disabled offline behavior with local SQLite product lookup and offline sale queueing.

---

## 5. Existing Printer-Related Code

- **Frontend Component:** `apps/web/src/components/pos/PosReceiptView.tsx` (164 lines).
- **Current Behavior:** Renders an 80mm printable HTML preview and invokes `window.print()`.
- **Backend Receipt Model:** `ReceiptResponse` in `com/inventra/inventra_backend/sales/api/dto/ReceiptResponse.java` and `packages/api-types/src/sales.ts`.
- **Missing Printing Artifacts:**
  - No ESC/POS byte generator (raw printer control commands).
  - No hardware transport abstraction (USB, Network/TCP, Serial, OS Spooler).
  - No local printer configuration (paper size, baud rate, codepage, cut options).
  - No print job persistence or retry state.

---

## 6. Existing Device Identity & Security

- **Database Model (`devices` table in `V2__init_auth_and_device_identity.sql`):**
  - Fields: `id`, `business_id`, `user_id`, `device_name`, `device_code`, `device_type` (`DESKTOP`, `MOBILE_ANDROID`, `MOBILE_IOS`, `BROWSER`), `platform_os`, `app_version`, `status` (`ACTIVE`, `SUSPENDED`, `REVOKED`), `last_seen_at`.
- **Backend Service (`DeviceService.java`):**
  - `registerDevice`: Enforces unique `(business_id, device_code)`.
  - `revokeDevice`: Sets status to `REVOKED`, records audit log, and immediately deletes all associated `refresh_tokens`.
- **Auth Integration (`AuthService.java`):**
  - Accepts `deviceId` in `LoginRequest`.
  - Embeds `did` claim in JWT access token and links `refresh_tokens.device_id`.
  - Rejects logins for revoked devices with `DEVICE_REVOKED`.
- **Frontend Device Management (F8-B):** `apps/web/src/pages/devices/DevicesPage.tsx` allows business owners/managers to view, register, and revoke devices.

---

## 7. Existing Sales & Receipt Domain

- **Backend Entities (`com/inventra/inventra_backend/sales/domain/model`):**
  - `Sale`: `id`, `businessId`, `storeId`, `saleNumber`, `invoiceNumber`, `saleDate`, `status` (`COMPLETED`, `VOIDED`, `PARTIALLY_RETURNED`, `FULLY_RETURNED`), `subtotal`, `discountAmount`, `taxAmount`, `roundOffAmount`, `totalAmount`, `paidAmount`, `changeAmount`, `cashierId`, `deviceId`, `idempotencyKey`.
  - `SaleLine`: Itemized lines with selling unit, base quantity, unit price, discounts, tax.
  - `SaleLineBatchAllocation`: FEFO batch allocation records linking specific batches to sales lines.
  - `SalePayment`: Payment records (`CASH`, `UPI`, `CARD`, `CREDIT`).
- **Endpoints:** `POST /api/v1/sales` (checkout), `GET /api/v1/sales/{id}/receipt`, `GET /api/v1/sales/{id}/invoice`, `POST /api/v1/sales/{id}/void`.

---

## 8. Database Schema Relevant to Offline Operation

| Table Name | Scope | Role in Offline / Sync Operations |
| :--- | :--- | :--- |
| `businesses` | Global Cloud | Tenant root authority. |
| `stores` | Tenant Cloud | Branch store context and capacity limits. |
| `devices` | Tenant Cloud | Device hardware identity and revocation status. |
| `users` & `business_memberships` | Tenant Cloud | Cashier/operator identity and store role permissions. |
| `products` & `product_identifiers` | Tenant Cloud | Product master catalog, barcode lookup, pricing. |
| `inventory_items` & `inventory_batches` | Store Cloud | Store stock levels and FEFO batch lots. |
| `sync_operations` | Device Cloud | Ingestion audit, idempotency lock, and per-event commit log. |
| `sync_change_feed` | Business Cloud | Monotonic delta change feed for client cache downloads. |
| `sync_device_states` | Device Cloud | High-water mark sequence and cursor checkpoint tracking. |

---

## 9. Reusable Frontend Components for Desktop

- **Core UI (`packages/ui`):** `Button`, `Input`, `Dialog`, `Toast`, `Table`, `Badge`, `ShortcutHint`, `Alert`, `EmptyState`, `TransferStatusBadge`, `DeviceStatusBadge`, `MatchConfidenceBadge`.
- **Application Shell Components (`apps/web/src/components/shell`):**
  - `Sidebar.tsx`: Sticky rail with expanded/collapsed states and tooltips.
  - `Header.tsx`: Context badge, store indicator, user dropdown.
  - `CommandPalette.tsx`: Global search and action runner (`Ctrl+K`).
- **POS Components (`apps/web/src/components/pos`):**
  - `PosCheckoutModal.tsx`, `PosSaleSuccessModal.tsx`, `PosReceiptView.tsx`, `CustomerSelectModal.tsx`.

---

## 10. Design Token & Theme Reuse Path

- **Architecture:** `packages/design-tokens` provides pure TypeScript token definitions.
- **Theme Store (`themeStore.ts`):** Injects CSS variables (`--bg-app`, `--color-primary`, `--color-accent`, etc.) into `document.documentElement`.
- **Desktop Strategy:** Desktop React frontend imports `@inventra/design-tokens` and `themeStore.ts` directly. Tauri native window decorations inherit background/surface colors.

---

## 11. Keyboard Shortcut Architecture

- **Zod Schemas (`packages/validation/src/shortcuts.ts`):** Max 3 profiles per user.
- **Shortcut Store (`apps/web/src/stores/shortcutStore.ts`):** 30+ registered commands across scopes (`GLOBAL`, `NAVIGATION`, `POS`, `DIALOG`) with custom bindings persisted in localStorage and synced to backend `/api/v1/users/me/shortcuts`.
- **POS Shortcuts:** `F2` (Focus Search), `F4` (Customer Modal), `F8` (Checkout), `Enter` (Submit/Add), `Esc` (Dismiss).
- **Desktop Strategy:** Reuses `shortcutStore.ts` without modifying shortcuts architecture.

---

## 12. Missing Capabilities for F9

1. **Desktop Shell:** Tauri 2.x project structure, window state persistence, native menus, and build configuration.
2. **Local SQLite Storage:** SQLite schema and DAO abstraction for offline catalog cache, batch snapshot cache, customer cache, offline queue (`pending_operations`), sync metadata (`sync_cursor`), and print queue (`print_jobs`).
3. **Offline Queue Engine:** Client-side durable queue with status lifecycle (`PENDING`, `SYNCING`, `SYNCED`, `FAILED`, `CONFLICT`, `CANCELLED`), backoff, and retry handling.
4. **Sync Background Worker:** Connectivity listener, batch upload worker (`POST /api/v1/sync/upload`), incremental delta pull worker (`GET /api/v1/sync/download`), and conflict state notifier.
5. **ESC/POS Engine & Printer Abstraction:** Platform-neutral `ReceiptDocument` builder, ESC/POS byte encoder, `PrinterAdapter` transport layer (USB/Network/Virtual), printer settings store, and test print routine.
6. **Barcode Scanner Buffer:** Rapid keystroke buffer hook (`useBarcodeScanner`) with inter-key timing detection (<50ms) and suffix handling (`Enter`/`Tab`).
7. **Sync Status Dashboard (Sync Center):** Desktop UI surface displaying pending queue, last sync time, failed operations, and conflict resolution details.
8. **Backend Change Feed Coverage:** `CustomerService` and `SupplierService` must call `ChangeFeedPublisher` on create/update to stream master changes to clients.

---

## 13. Potential Architectural Conflicts & Guardrails

1. **Direct Mutation Prohibition:** Desktop must NEVER write directly to PostgreSQL. All offline mutations must pass through the `SyncController` $\rightarrow$ `SyncOperationProcessor` $\rightarrow$ `SaleService` pipeline.
2. **Tenancy Context Switching:** Changing business or store context in desktop must immediately flush or isolate local caches and verify that pending offline operations for previous stores are not mixed or corrupted.
3. **Pessimistic vs Optimistic Offline Stock:** Local SQLite stock is a cache snapshot, not global authority. When two offline terminals sell the same final stock unit, the cloud backend preserves both historical sales and flags an inventory discrepancy rather than deleting or modifying completed sales.
4. **Print Safety Invariant:** Printing failure must never roll back a financially committed sale. Print jobs are independent asynchronous tasks.

---

## 14. Recommended F9 Implementation Sequence

```text
F9.1: Repository Audit & Authoritative Design Plan (Current Step)
  ↓
F9.2: Monorepo Package Setup (packages/offline-storage, packages/print)
  ↓
F9.3: Backend Incremental Enhancements (Customer/Supplier ChangeFeedPublisher)
  ↓
F9.4: Local SQLite Persistence & Cache Engine
  ↓
F9.5: Offline Operation Queue & Idempotent Client Pipeline
  ↓
F9.6: Bidirectional Sync Engine (Push/Pull/Cursor/Recovery)
  ↓
F9.7: ESC/POS Thermal Receipt Engine & Printer Abstraction
  ↓
F9.8: Hardware Barcode Scanner Buffering & POS Offline Integration
  ↓
F9.9: Sync Center & Printer Management UI
  ↓
F9.10: Desktop Shell (Tauri 2.0 Native Wrapper & Packaging)
  ↓
F9.11: Comprehensive Test Verification (Unit, Integration, Monorepo Typecheck, Builds)
```
