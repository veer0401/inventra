# Native Desktop Baseline (apps/desktop-native)

_Verified 2026-10-26 against the working tree. Everything below was read in source or executed; items that could not be verified are listed explicitly in section 8._

## 1. What was run

| Check | Result |
| :--- | :--- |
| `dotnet build apps/desktop-native/Inventra.Desktop.sln` | Succeeds, 0 errors, 2 pre-existing nullable warnings (`InventoryWorkspaceViewModel.cs:380`, `PosWorkspaceViewModel.cs:696`) |
| `dotnet test` before this session's changes | 46 passed, 0 failed |
| `dotnet test` after the supplier slice (2026-10-26) | 81 passed, 0 failed |
| `dotnet test` after the sync contract work (2026-10-27) | 119 passed, 0 failed |
| Backend tests (`mvnw test`) | 279 passed, 0 failed, against an isolated PostgreSQL 17 container (never the local dev database). See `docs/SYNC_CONTRACT.md` for the exact scope |
| Frontend (Vitest) tests | Not run (out of scope for the native desktop) |
| Native app launched | **Not launched.** It has no database-path override and a real local database exists at `%LOCALAPPDATA%\Inventra\Data\inventra_local.db` |

Toolchain: .NET SDK 9.0.123, Java 17.0.17, Docker 27.5.1 (Docker Desktop was started for the isolated test database).

_Update 2026-10-27: the synchronisation findings below were extended and verified in `docs/SYNC_CONTRACT.md`. Where the two differ, that file is newer._

## 2. Repository state

- `apps/desktop` (Tauri/React) is staged for deletion (`D` in the index). `apps/desktop-native` is tracked and is the only desktop client.
- Solution `Inventra.Desktop.sln`: `Core` (domain, no I/O) <- `Data` (SQLite repositories) <- `Infrastructure` (REST client, identity, sync, hardware, logging) <- `App` (Avalonia views, ViewModels). Tests in `tests/Inventra.Desktop.Tests`.
- About 16k lines of C#/AXAML. The three largest ViewModels (Inventory 1.2k, Purchases 1.3k, POS 0.7k lines) hold most of the workflow logic.

## 3. Verified architecture

- **Local store:** SQLite in WAL mode (`DatabaseContext`). Schema is created with `CREATE TABLE IF NOT EXISTS`; later columns are added with idempotent `TryAddColumnAsync`. There is no migration version table.
- **Offline queue:** `offline_operations` with a per-device monotonic sequence, idempotency key, status (`PENDING`/`SYNCED`/`FAILED`). `SyncEngineService` uploads up to 50 pending operations per cycle to `POST /api/v1/sync/upload` and marks each by the server's per-event result.
- **Server contract for sync:** `SyncOperationRequest.eventType` is a strict Java enum: `SALE_CREATED, SALE_RETURN_CREATED, TRANSFER_REQUEST_CREATED, SUPPLIER_CREATED, PURCHASE_ORDER_CREATED, GOODS_RECEIPT_POSTED`. The server recomputes a **canonical-JSON SHA-256** (sorted keys, compact, Jackson number/string formatting) and rejects a mismatch.
- **Auth/tenancy:** session and device registration live in `IdentitySessionService`; every repository query is scoped by `business_id`. Permissions are enforced in ViewModels via `IAuthorizationService`.
- **Workspaces implemented:** Inventory (medicines, stock, batches), Purchases (register, new PO, GRN, inward entry, suppliers), POS (billing, register, customers), Diagnostics, Device pairing/login.

## 4. Defects found (ranked)

1. **Sync checksum never matched the server (fixed this session).** The desktop hashed the raw payload string; the backend hashes canonical JSON. Evidence: for the same supplier payload the real `CanonicalJsonUtils` gives `628ebd67...` and a raw SHA-256 gives `b7ad0224...`. Every queued operation would have been rejected `IDEMPOTENCY_PAYLOAD_MISMATCH`.
2. **Unsupported event types block the queue (mitigated).** The desktop queues `SALE_COMPLETED`, `PRODUCT_CREATED`, `PRODUCT_UPDATE`, `STOCK_ADJUSTMENT`, `STOCK_INWARD`, `CUSTOMER_CREATE` and `GLOBAL_MEDICINE_IMPORTED`. None exist in the server enum, so Jackson fails the whole batch with a 400 and the same oldest 50 operations are retried forever. The engine now uploads only supported types and marks the rest `FAILED / UNSUPPORTED_EVENT_TYPE`. **Sales are now fixed (`SALE_CREATED`, verified); stock adjustments, product edits, customers and global-medicine imports still do not reach the cloud when offline.**
2a. **The upload request was missing three required fields (fixed, verified live).** The server requires `syncSessionId`, `protocolVersion` and `clientTimestamp`; the desktop sent only `deviceId` and `operations`, so every upload was refused with HTTP 400. The result DTO also read `errorMessage`/`totalProcessed` where the server sends `message`/`processedCount`, and ignored `retryable`.
2b. **The queued sale had no lines or payments (fixed, verified live).** `SALE_COMPLETED` carried only an invoice number and totals. Sales are now `SALE_CREATED` with the server's `CreateSaleRequest` shape, written atomically with the stock deduction; operations queued by earlier builds are rebuilt from the local sale.
2c. **Goods receipts would have been received twice (fixed, verified live).** The screen posted to REST with key `GRN-<receipt id>` and the queued operation used a different, random key, so once uploads worked the server would create two receipts. The operation id is now the receipt id. The payload also sent `manufacturingDate` as `YYYY-MM`, which the server's date field rejects (fixed).
3. **Supplier save reported false success (fixed).** Cloud failures were swallowed, nothing was queued, the client-generated id differed from the server id (duplicates on the next refresh), and the UI said "created successfully".
4. **Non-functional menu items.** Eight items only show "scheduled for a future development phase" (Inter-Store Transfer, Sales Return, Day Shift Closing, Purchase Returns, GST Register, Stock Valuation Ledger, Schedule H Register, Daily Cash & Bank Book). "Sales Summary & Analytics" and "General Ledger Accounts" only change the title bar and show a toast. "Pharmacy Store Profile" opens Diagnostics.
5. **Whole-batch failure was not attributable (fixed).** A refused batch is now re-sent one operation at a time so only the faulty one fails.
6. **Silent catch-all in `RunSyncCycleAsync` (fixed).** Unexpected errors are logged with context; operation ids, codes and messages are logged, never payloads or tokens.
7. **Transient server errors failed permanently (fixed on both sides).** The desktop now keeps retryable rejections pending (up to 10 attempts) and the server no longer stores a retryable failure as a permanent rejection.
8. **Cloud list refresh only read the first 50 suppliers** (fixed: all pages are read now).
9. **Unit-of-measure mismatch on goods receipts (open).** A receipt of 6 strips creates 6 base units on the server (the desktop sends `conversionFactor 1`). See `docs/SYNC_CONTRACT.md` section 6.1.

## 5. Outdated or inaccurate documentation

- `docs/PROJECT_HANDOFF.md` (2026-08-30) describes the Tauri desktop as the desktop client and gives conflicting migration counts (11 in its tree, 19 in its summary; the migration folder holds 20 files). The Tauri app is being removed.
- `apps/desktop-native/README.md` says "17 unit and integration tests"; there were 46 before this session.
- `apps/desktop-native/README.md` describes `SyncEngineService` as a "Push and pull (delta change feed) sync orchestrator". Before 2026-10-27 it only pushed (`DownloadSyncChangesAsync` was never called) and the push path was non-functional (defects 1, 2, 2a). It now pushes and pulls **supplier** changes only.

## 6. Delivered this session: supplier register vertical slice

New Supplier -> validate -> save -> refresh -> restart -> verify, with honest sync state.

- Validation (`SupplierValidator`) mirrors the backend limits; duplicate code is checked locally and by the server.
- Online create: server first. A server **rejection** (for example duplicate code) saves nothing and shows the server's reason. Success stores the server id and `SYNCED`.
- Offline or server-unreachable create: the supplier and its `SUPPLIER_CREATED` operation are written in **one SQLite transaction**, shown as **Pending sync**, and sent automatically. The message says it is not on the server yet.
- Sync result: `APPLIED` swaps the local id for the server id (and repoints local purchase orders and GRNs); a rejection shows **Sync failed** with the server's reason as a tooltip.
- Edit: requires connectivity and a synced supplier (the backend has no offline supplier-update event). Cleared fields are sent as empty strings because PATCH treats `null` as "unchanged"; supplier type, code and licence fields are never overwritten.
- PO and GRN posting are blocked against a supplier that has not synced, because the server would not recognise its local id.
- Schema: `cache_suppliers.sync_state` (default `SYNCED`) and `sync_error`, added by an idempotent migration that keeps existing rows.
- Checksums: `CanonicalJson` reproduces the backend's canonical form. It is verified against checksums produced by the backend's own `CanonicalJsonUtils` for 8 edge-case payloads (unsorted keys, decimals, exponents, unicode, escapes, big integers, nested arrays). Queued rows created before the fix are re-checksummed at send time.

## 7. Recommended next priorities

1. Decide the unit of measure for received quantities and fix the goods-receipt `conversionFactor`, then align the local stock cache (the POS deducts selling-unit quantities from stock cached in base units). Wrong units corrupt stock silently.
2. Give the remaining queued event types a server route: product edits, stock adjustments, customers and global-medicine imports (existing REST endpoints or new sync events). Queue purchase orders created offline (`PURCHASE_ORDER_CREATED` has a server handler but no desktop producer).
3. Build a screen to review and resolve `FAILED` operations (a rejected offline sale needs a human decision), and show the pending/failed counts where cashiers can see them.
4. Extend the download slice beyond suppliers (products, batches, customers) once each entity's local merge rules are defined.
5. Remove or hide the non-functional menu items until their workspaces exist.

## 8. Not verified

- Sales, suppliers, idempotent re-send, rejection and the supplier download were run **over HTTP** against a running backend and Postgres (an ad-hoc harness, not committed). Goods receipts were verified against the live stack in-process, not over HTTP.
- The Avalonia UI was compiled (compiled bindings succeed) but not launched or visually inspected.
- Printer and barcode hardware were not exercised.
- Legacy local rows created by earlier builds all read as `SYNCED` after migration even if they never reached the server; there is no way to tell them apart.
