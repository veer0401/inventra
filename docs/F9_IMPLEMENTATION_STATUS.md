# Phase F9: Implementation Status & Execution Roadmap

**Document Status:** Active Tracking Document  
**Phase:** F9 — Desktop Offline Operations + Thermal POS Printing  
**Monorepo:** `D:\project\anti-gravity-projects\inventra`  
**Date:** 2026-08-28  

---

## 1. Existing Architecture & Baseline

| Component | Current State | F9 Responsibility |
| :--- | :--- | :--- |
| **Monorepo / Turborepo** | Turborepo 2.4.4, pnpm 10.24.0, TypeScript 5.7.3. 9 workspace packages. | Add `@inventra/print`, `@inventra/offline-storage`, and real `@inventra/desktop`. |
| **Backend Core** | Spring Boot 3.x / Java 21, PostgreSQL, Flyway migrations V1–V11. | Incremental change feed updates (`CustomerService`, `SupplierService`). |
| **Backend Sync Framework** | `sync_operations`, `sync_change_feed`, `sync_device_states` active. 27 passing tests. | Reused as authoritative cloud ledger gateway via `/api/v1/sync/*`. |
| **Web Frontend (`apps/web`)** | React 19, Vite, TanStack Query, Zustand, TailwindCSS design tokens. | Preserved as online-first SPA. Reuses shared packages. |
| **Desktop Client (`apps/desktop`)** | Placeholder `package.json` and 7-line `README.md`. No runnable shell. | **F9.1 Critical Fix:** Implement native Tauri 2.x desktop application. |
| **Design Tokens & Theme** | `@inventra/design-tokens` with 5 presets, OKLCH custom colors, CSS vars in DOM. | Shared directly with desktop; native titlebar styled with theme vars. |
| **Keyboard Shortcuts** | `@inventra/validation` Zod schemas, `shortcutStore.ts` centralized registry. | Reused in desktop (`F2`, `F4`, `F8`, `F9`, `F10`, `Ctrl+K`, `Ctrl+B`, `?`). |
| **Device Security** | `devices` table, `DeviceService.java`, JWT `did` claim, remote revocation. | Desktop persists persistent device ID and locks on `DEVICE_REVOKED`. |

---

## 2. Invariant Architectural Rules for F9

1. **Zero Direct PostgreSQL Access:** Desktop connects exclusively via `POST /api/v1/sync/upload` and `GET /api/v1/sync/download`.
2. **Offline Sale Durability:** An offline sale is only committed when canonicalized, hashed with SHA-256, assigned `deviceSequenceNumber`, and committed inside an atomic local SQLite transaction.
3. **Receipt Safety Decoupling:** Printer failures (`OUT_OF_PAPER`, `DISCONNECTED`) never invalidate, roll back, or duplicate a financially committed sale.
4. **No Silent Data Loss:** Conflict states (e.g. oversold inventory) preserve historical sales and flag discrepancy records.
5. **No Regressions in Web:** `apps/web` remains 100% operational and online-first.

---

## 3. Files to Create & Modify

### Packages to Create
- `packages/print/package.json`, `tsconfig.json`, `src/index.ts`
  - `src/models/receipt.ts` (`ReceiptDocument` canonical interface)
  - `src/renderer/escpos.ts` (`EscPosRenderer` binary buffer generator)
  - `src/adapters/types.ts` (`PrinterAdapter` interface, `PrinterStatus`, `PrintJob`)
  - `src/adapters/virtual.ts` (`VirtualPrinterAdapter`)
  - `src/adapters/usb.ts` (`UsbPrinterAdapter`)
  - `src/adapters/network.ts` (`NetworkPrinterAdapter`)
  - `src/__tests__/escpos.test.ts`
- `packages/offline-storage/package.json`, `tsconfig.json`, `src/index.ts`
  - `src/driver/types.ts` (`IOfflineStorageDriver`, transaction interfaces)
  - `src/driver/sqlite-memory.ts` (In-memory driver for tests and fallback)
  - `src/driver/tauri-sqlite.ts` (Native Tauri SQL plugin driver)
  - `src/schema/init.sql` (SQLite DDL for cache, queue, metadata, conflicts, print jobs)
  - `src/repositories/product-cache.ts` (`ProductCacheRepository`)
  - `src/repositories/customer-cache.ts` (`CustomerCacheRepository`)
  - `src/repositories/offline-queue.ts` (`OfflineQueueRepository`)
  - `src/repositories/print-job.ts` (`PrintJobRepository`)
  - `src/sync/client.ts` (`SyncClientWorker` push/pull coordinator)
  - `src/__tests__/offline-storage.test.ts`
  - `src/__tests__/sync-client.test.ts`

### Backend Files to Modify
- `backend/inventra-backend/src/main/java/com/inventra/inventra_backend/customer/application/CustomerService.java`
  - Inject `ChangeFeedPublisher` and publish `CUSTOMER` upsert events.
- `backend/inventra-backend/src/main/java/com/inventra/inventra_backend/purchasing/application/SupplierService.java`
  - Inject `ChangeFeedPublisher` and publish `SUPPLIER` upsert events.

### Desktop Application (`apps/desktop`)
- `apps/desktop/package.json`
- `apps/desktop/vite.config.ts`
- `apps/desktop/index.html`
- `apps/desktop/src/main.tsx`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/components/shell/DesktopTitlebar.tsx`
- `apps/desktop/src/components/sync/SyncStatusBadge.tsx`
- `apps/desktop/src/components/sync/SyncCenterModal.tsx`
- `apps/desktop/src/components/printer/PrinterSettingsModal.tsx`
- `apps/desktop/src/hooks/useBarcodeScanner.ts`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/capabilities/default.json`
- `apps/desktop/src-tauri/src/main.rs`
- `apps/desktop/src-tauri/src/lib.rs`

---

## 4. Execution Step Tracker

## Execution Progress

- [x] **F9.0** — Repository Audit & Baseline Verification
- [x] **F9.1** — Runnable Native Tauri 2.x Desktop Shell (`apps/desktop`)
- [x] **F9.2** — Shared Package Infrastructure (`@inventra/print`, `@inventra/offline-storage`)
- [x] **F9.3** — Backend Sync Enhancements (`CustomerService`, `SupplierService` Change Feed)
- [x] **F9.4** — ESC/POS Thermal Printing Engine (80mm / 58mm, byte buffers, cut, drawer kick)
- [x] **F9.5** — SQLite Local Storage & DDL Schema (8 tables, FEFO indexing)
- [x] **F9.6** — Offline Transaction Queue & SHA-256 Monotonic Sequence Engine
- [x] **F9.7** — Bidirectional Sync Engine (`SyncClientWorker`, cursor delta pull, conflict logging)
- [x] **F9.8** — Hardware Barcode Scanner Driver ($<40\text{ms}$ burst detection) & Offline POS
- [x] **F9.9** — Sync Center & Thermal Printer Settings UI
- [x] **F9.10** — Native Desktop Titlebar & Window Chrome
- [x] **F9.11** — Full Verification (192 backend tests + 205 frontend/package tests passing)
- [x] **F9.12** — POS Flexible Dispensing & Unit Conversion (Strip vs. loose unit selling, price prorating, line validation)
- [x] **F9.13** — Thermal Printing Customizer & Store Branding (Prominent store header, 80mm/58mm interactive settings panel, terminal local storage persistence, subtle Inventra POS branding)
