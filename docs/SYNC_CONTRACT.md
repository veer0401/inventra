# Desktop <-> Backend Sync Contract

_Verified 2026-10-27 by reading the code and by running it: 279 backend tests (Spring Boot + PostgreSQL 17 in an isolated container), 119 desktop tests, and an ad-hoc run of the real desktop engine over HTTP against a running backend. Sections 5 and 6 list what that did not cover._

## 1. Event compatibility matrix

"Desktop producer" is what the native app actually queues today. "Server support" is `SyncEventType` in `sync/domain/model/SyncEventType.java`.

| Desktop event | Desktop producer | Server support | Payload (desktop -> server DTO) | Server processing | Tests | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `SALE_CREATED` (before this work `SALE_COMPLETED`) | POS checkout, written atomically with the sale and stock deduction | `SALE_CREATED` -> `SaleService.checkoutSale` | `CreateSaleRequest`: `storeId`, `saleDate`, customer name/phone, `discountAmount`, `notes`, `lines[productId, quantity, batchId, unitPrice]`, `payments[paymentMethod, amount]` | Server re-runs batch/FEFO allocation, GST, totals, stock lock, invoice numbering; verifies `unitPrice` against the batch price; payments must equal the total within 0.05. Key `SYNC-<eventId>` | C# `SyncContractTests`, `SyncReliabilityTests`; Java `SyncDesktopContractIntegrationTest` (8 sale scenarios); existing `Sync*IntegrationTest`; HTTP run | **Supported, verified** |
| `SALE_COMPLETED` (legacy) | Earlier builds (summary only: no lines, no payments) | n/a | Cannot be processed | Engine rebuilds it from the local sale into `SALE_CREATED`, keeping the operation id | C# `LegacySaleCompletedOperations...`; HTTP run | **Migrated** |
| `SUPPLIER_CREATED` | Supplier screen when offline or server unreachable | `SUPPLIER_CREATED` -> `SupplierService.createSupplier` | `CreateSupplierRequest` (16 fields) | Duplicate `supplierCode` -> `REJECTED DUPLICATE_SUPPLIER_CODE` (permanent). Publishes to the change feed | C# fixtures + engine; Java live (apply, idempotent resend, feed); HTTP run | **Supported, verified** |
| `GOODS_RECEIPT_POSTED` | GRN posting, written atomically with stock and batches | `GOODS_RECEIPT_POSTED` -> create + post receipt | `CreateGoodsReceiptRequest` (+ extra informational fields the server ignores) | Key `GRN-<eventId>`; desktop operation id = receipt id so the screen's REST post and this operation are one receipt. A draft left by REST is posted by the sync call | C# fixture + engine result tests; Java live (apply, REST-then-sync, draft recovery) | **Supported, verified (units fixed 2026-10-27)** |
| `PURCHASE_ORDER_CREATED` | Confirming a purchase order: saved and queued in one transaction (the direct REST call is removed). Drafts stay local until confirmed | `PURCHASE_ORDER_CREATED` -> create + confirm | `CreatePurchaseOrderRequest`: `storeId`, `supplierId`, `orderDate`, `discountAmount` (0: discounts are per line), `notes` (carries the local PO number), `lines[productId, purchaseUnit, conversionFactor, orderedQuantity, unitCost, discountPercentage, taxRate]` | The server numbers and confirms the order and assigns its own order and line ids. The desktop reads the order back (manager/owner token) and remaps its ids and any receipts that reference them before marking the operation synced | C# fixture + atomic save + remap + failure tests; Java live (apply/confirm, idempotent resend, receipt against server ids, over-receipt in strips) | **Supported, verified** |
| `SALE_RETURN_CREATED` | none (no returns screen) | supported | n/a | `SaleReturnService.processReturn` | none at sync level | Not applicable yet |
| `TRANSFER_REQUEST_CREATED` | none (menu item is "future module") | supported | n/a | `TransferService.createTransfer` | none at sync level | Not applicable yet |
| `PRODUCT_CREATED`, `PRODUCT_UPDATE`, `STOCK_INWARD`, `STOCK_ADJUSTMENT`, `CUSTOMER_CREATE` | Inventory and POS screens | **none** | n/a | Engine fails them as `UNSUPPORTED_EVENT_TYPE` (visible, kept in the table, re-targetable) | C# `UnsupportedEventAhead...`; HTTP run | **Unsupported** |

REST endpoints that already exist for the unsupported group (`PATCH /products/{id}`, `POST /products`, inventory adjustments, `POST /customers`, global-medicine import) are the likely route, or new sync events; that is a product decision for the next task.

## 2. Wire contract

**Upload** `POST /api/v1/sync/upload` (roles OWNER, MANAGER, CASHIER, INVENTORY_OPERATOR). Tenant and store come from the JWT, never from the payload (a payload `storeId` is ignored).

```json
{ "deviceId": "<server device uuid>", "syncSessionId": "<uuid>", "protocolVersion": 1,
  "clientTimestamp": "2026-10-27T00:00:00.000Z",
  "operations": [ { "eventId": "<uuid>", "eventType": "SALE_CREATED", "eventVersion": 1,
                    "deviceSequenceNumber": 1, "occurredAt": "2026-10-26T06:30:00.000Z",
                    "payloadChecksum": "<sha256 hex>", "payload": { } } ] }
```

- 1 to 50 operations. All five envelope fields are required: the earlier desktop sent only `deviceId` + `operations`, so **every upload was refused with HTTP 400**.
- `eventType` is a strict enum: one unknown value fails the **whole** request with HTTP 400 (`"Failed to read request"`).
- Checksum: SHA-256 of canonical JSON (keys sorted, compact, Jackson formatting). The desktop's `CanonicalJson` matches the Java class on all fixtures, including number and escape edge cases. A mismatch is `REJECTED IDEMPOTENCY_PAYLOAD_MISMATCH`.
- The server sorts by sequence, then processes each operation in its own transaction. It does **not** stop at a failure.

**Response** (`data`): `syncSessionId`, `serverTimestamp`, `processedCount`, `results[]` each with `eventId`, `deviceSequenceNumber`, `status` (`APPLIED` | `DUPLICATE` | `REJECTED` | `CONFLICT`), `serverEntityId`, `serverVersion`, `errorCode`, `message`, `retryable`, `conflictDetails`. Captured real responses are in `apps/desktop-native/tests/Inventra.Desktop.Tests/Fixtures/server-*.json`.

**Request-level failures** (ProblemDetail): 400 validation or unreadable body (verified); 401/403 auth; `DEVICE_REVOKED`, `DEVICE_NOT_FOUND`, `DEVICE_TENANT_MISMATCH` and `DEVICE_IMPERSONATION_FORBIDDEN` business-rule errors carry an `errorCode` property (a revoked device was verified to return 422; the desktop treats any `DEVICE_*` code as request-level whatever the status).

**Download** `GET /api/v1/sync/download?cursor=<n>&limit=<1..500>` returns `currentCursor` (the cursor you sent), `nextCursor`, `hasMore`, `changes[]` of `{changeSeq, id, entityType, entityId, operation, entityVersion, payload, createdAt}`, ordered by `changeSeq`, scoped to the token's business and to entries with no store or the token's store. Feed publishers exist for `SUPPLIER`, `PRODUCT`, `CATEGORY`, `CUSTOMER`, `INVENTORY_ITEM`; all are `UPSERT` and `entityVersion` is always 1.

## 3. Server changes made for this contract

1. **Retryable failures are no longer stored as permanent.** `SyncOperationRecorder.recordRejected(..., retryable=true)` used to persist a `REJECTED` row; the duplicate check then returned that stored row (with `retryable=false`) for every retry of the same event id, so a transient fault became permanent. Now only non-retryable rejections are stored. Test: `retryableRejectionsAreNotPersisted`.
2. **Unreadable payloads are permanent.** A malformed UUID or wrong type (any `IllegalArgumentException` or Jackson error in the chain) used to surface as `PROCESSING_ERROR`, `retryable=true`. It is now `INVALID_PAYLOAD`, `retryable=false`. Test: `unreadablePayloadIsPermanent`.
3. **Draft receipts are finished, not called duplicates.** If a receipt with the key exists but is not `POSTED` (REST created it, the post step never ran), the sync call posts it. Before, it answered `DUPLICATE` and no stock was received. Test: `draftReceiptIsPostedBySync`.

## 4. Desktop behaviour

- **Atomic outbox writes.** Sale + stock deduction + `SALE_CREATED`, supplier + `SUPPLIER_CREATED`, and GRN + batches + stock + `GOODS_RECEIPT_POSTED` each commit in one SQLite transaction. A failure rolls all of it back (tested).
- **One cycle at a time**, an unpaired workstation (device id not a server UUID) uploads nothing, and the status returned is read after the running flag is released.
- **Classification.** `APPLIED`/`DUPLICATE` confirm. `REJECTED` + `retryable` stays `PENDING` with an incremented retry count and, after 10, fails as `RETRY_LIMIT_EXCEEDED`. Other `REJECTED` and `CONFLICT` fail with the server's code and message, shown on the sale, supplier or receipt. An unknown status or a missing result leaves the operation pending: nothing is marked synchronised without a server confirmation.
- **Fault isolation.** HTTP 5xx, 408, 429 and network errors leave everything pending. A request-level refusal (401/403, `DEVICE_*`) stops the cycle and keeps everything pending. Any other 4xx on the batch triggers one-by-one resend, so only the faulty operation fails (`HTTP_<status>`). A queued payload that is not valid JSON fails alone as `MALFORMED_PAYLOAD`.
- **Crash safety.** Local entity state is reconciled before the operation is marked synced; a re-send answers `DUPLICATE` with the same id and the reconcile repeats harmlessly (tested). Supplier ids are swapped for server ids, including references in local purchases and receipts.
- **Old queue rows** are re-checksummed at send time and legacy sale operations are rebuilt.
- **Download.** Suppliers only. The checkpoint (`download_cursor:<business>:<device>`) advances in the same SQLite transaction as the rows it covers; an interrupted download resumes from it; a malformed entry is skipped without stalling; a cursor that moves backwards is ignored; local PENDING/FAILED suppliers are never overwritten. Other entity types are skipped and rely on their list endpoints.
- **Logging.** Operation ids, event types, error codes and server messages only. Payloads, customer data and tokens are not logged (the logger also redacts bearer tokens).

### 4a. Sync Center, rejected operations and the import queue

- **Needs attention** (Settings -> Sync Center) lists every operation that is `FAILED`, or still `PENDING` after at least one failed attempt, described in words (invoice, customer, amount; supplier name; PO number) with the server's error and what can be done. **Retry** puts the operation and the record it belongs to (sale, supplier, PO, receipt) back to `PENDING` and triggers a sync. Operations that can never succeed by resending (`UNSUPPORTED_EVENT_TYPE`, `MALFORMED_PAYLOAD`, `LOCAL_SALE_MISSING`) cannot be retried. **Dismiss** needs a reason of 5+ characters and `SettingsManage`; the operation becomes `DISMISSED`, is never sent, the reason is stored and a `SYNC_OPERATION_DISMISSED` security line is logged. Dismissing a PO cancels it locally; dismissing a supplier deletes it unless an order or receipt references it. Dismissing a sale does not restore the stock it deducted (see 6).
- **Medicine imports** are a persisted queue (`import_jobs`), not an inline call. Queuing works offline; a job runs when the server is reachable and the queue is not paused, one at a time, and the local product is created only after the server created it (server id, stock 0), so there is no local-only catalog entry. A medicine already in the catalog (by name) is skipped without a server call; HTTP 409 counts as skipped; permanent rejections fail that job only; transient failures requeue it (5 attempts) and stop the run. **Pause** lets the medicine in flight finish, then starts nothing new; the flag is stored in `sync_metadata`, so it survives a restart. **Resume** starts the queue at once. Jobs left `RUNNING` by a crash are put back in the queue.
- Imports no longer enqueue a `GLOBAL_MEDICINE_IMPORTED` operation (the server has no route for it); a leftover one from an older build fails visibly as `UNSUPPORTED_EVENT_TYPE` and can be dismissed.
- `SyncCoordinator` runs a sync cycle plus the import queue when the connection returns and once a minute while online (previously a cycle ran only at startup, after a sale, and on manual request).

## 5. Evidence

| Check | Result |
| :--- | :--- |
| Backend, whole suite (`mvnw test`, isolated Postgres 17 container, port 55432) | 279 tests, 0 failures (run before the draft-receipt change) |
| Backend, after the draft-receipt change | the 11 existing `sync.*` tests pass; `SyncDesktopContractIntegrationTest` (16 new tests) passes on its final run. The whole suite was not re-run after that one change |
| Desktop (`dotnet test`) | 119 tests, 0 failures |
| Live HTTP run (real desktop engine and SQLite -> running Spring Boot on :18081 -> Postgres) | 15 of 15 checks passed; Postgres rows verified: 2 sales, 2 payments, 2 stock movements (-20, -10), batch and item 50 -> 20, 1 supplier, 4 `sync_operations` (1 rejected), no extra rows after re-sending |
| Negative controls | Disabling fault isolation and accepting unknown statuses each failed exactly the intended tests |
| Java canonicalizer parity | 8 edge-case payloads, checksums produced by the backend's own class |

The live HTTP run is an ad-hoc harness (not committed). It covered sale, stale-price rejection, legacy sale, unsupported event, supplier and idempotent re-send. GRN was verified against the live stack in-process (MockMvc, real Spring and Postgres) and with captured real responses on the desktop, not over HTTP.

## 6. Known risks and gaps

1. **Quantity units (fixed 2026-10-27).** Stock is kept in base units on both sides; screens work in selling/purchase units. A receipt now adds `(received + free) x pack size` to local stock and sends `conversionFactor = pack size` with the product's selling unit, and a sale deducts `quantity x pack size` locally (the server already converted sales). Verified live: a receipt of 6 strips creates a 60.000-capsule batch and raises item stock by 60. Receipts queued by earlier builds (event version 1) are corrected from the local product's pack size before upload. **Assumption:** received and ordered quantities are entered in the product's selling unit (strips). **Not fixable automatically:** local stock written by earlier builds, and any receipt that earlier builds already posted through REST with factor 1, are understated until stock is re-synced or adjusted.
1a. **Cost per unit is inconsistent inside the server (open, needs a decision).** A receipt stores the batch cost per BASE unit (`unitCost / conversionFactor`, e.g. 3.00 per capsule), but `SaleService` treats `purchasePrice` as per SELLING unit (it divides by the pack size for single-unit sales), so the cost snapshot on a strip sale is a tenth of its true cost. Stock quantities are unaffected; margin and valuation reports that mix the two are.
1b. **Free quantity is not sent to the server (open).** The desktop adds free goods to local stock, but `CreateGoodsReceiptLineRequest` has no free-quantity field, so the server receives only the paid quantity. Needs a field and migration on the server.
2. **A rejected offline sale cannot be undone locally.** The customer already left with the goods; the sale shows `FAILED` and the local stock stays deducted until inventory is refreshed from the server. There is no screen yet to review and resolve failed operations.
3. **Receipt numbers differ.** The printed offline invoice number is not the server's `INV-...` number; it is kept in the sale's `notes`. Totals are recomputed by the server, so GST or rounding differences beyond 0.05 on the payment cause `PAYMENT_AMOUNT_MISMATCH`.
4. **Dependencies.** The server does not halt on failure, so an operation that depends on a failed one fails with `RESOURCE_NOT_FOUND`. The UI blocks purchase orders and receipts against an unsynced supplier, which covers today's only local dependency.
5. **Purchase orders (done 2026-10-27).** Confirmed orders are queued, including those saved by earlier builds that were never sent (their direct REST call used `unitPrice`/`overallDiscountPercentage`, which the server rejects: it needs `unitCost`/`discountAmount`, so they never reached the server). A confirmed order is submitted once and cannot be edited afterwards. Receiving against an order that has not synced is blocked.
5a. **Finishing a PO sync needs a manager/owner login.** Reading the order back is `OWNER/MANAGER/INVENTORY_OPERATOR` only (a cashier token gets 403), so under a cashier login the operation stays pending until one of them is signed in. Nothing is lost; it is visible as pending.
5b. PO line free quantity is kept locally but the server has no field for it, and the server recomputes order totals (they can differ slightly from the screen's).
6. **Unsupported group** (section 1) still diverges offline: product edits, stock adjustments, customers, global-medicine imports.
7. **Download** is suppliers only; the feed publishes only upserts at version 1; the server cannot signal a reset (`currentCursor` echoes the request), so a restored server database is not detected; a feed entry that fails to serialise on the server is silently dropped.
8. **Server price check.** For a line without a batch id the price-snapshot check accepts hard-coded prices (10, 20, 50, 100) when no batch exists (`validateOfflinePrices`). The desktop always sends a batch id when it has one.
9. **Not exercised:** the Avalonia UI (never launched), real printers and barcode scanners, a second device, clock skew.
