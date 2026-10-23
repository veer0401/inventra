# Audit Findings Log

Severity: **S1** broken/security/data loss · **S2** wrong behaviour or contract drift · **S3** maintainability/dead code · **S4** cosmetic/docs
Status: `open` · `in-progress` · `fixed` · `wont-fix`

## Baseline (fill in during Phase 1)

| Check | Result | Date |
|---|---|---|
| `pnpm build` (HEAD `04ad1b70` + uncommitted work) | ✅ 12/12 tasks. Warning: web and desktop JS bundles are ~1.86 MB each (no code-splitting); mobile build is a placeholder | 2026-10-20 |
| `pnpm typecheck` | ✅ 21/21 tasks | 2026-10-20 |
| `pnpm test` | ❌ 16/19 tasks. `@inventra/web`: 2 failures (A-013). `@inventra/app`: 1 timeout in `saleReturn.test.tsx` under full-suite load, passes alone (A-014) | 2026-10-20 |
| TS test totals | shared 5, design-tokens 10, api-client 4, validation 81, print 6, ui 3, offline-storage 11, app 196/197, web 79/81 | 2026-10-20 |
| `./mvnw test` (backend) | ✅ 81 test classes, 267 tests, 0 failures. Ran against a local Postgres on 127.0.0.1:5432 (A-015). Docker Desktop was not running | 2026-10-20 |
| Tauri build (`build:native`) | ⏭ not run (needs Rust toolchain/long build) | |
| `dotnet test` (desktop-native) | ⏭ not run | |

## Findings

Items marked **Confirmed** were verified by running code or commands on 2026-10-20. The others are initial observations to confirm in the relevant phase.

| ID | Sev | Area | Finding | Evidence | Proposed fix | Owner | Status |
|---|---|---|---|---|---|---|---|
| A-001 | S3 | apps/web | **Confirmed.** 126 tracked files in `apps/web/src` are unreachable at runtime: `main.tsx` imports only `@inventra/app` and `./index.css`, and nothing else in the repo imports from `apps/web`. They still cost build time (`tsc` compiles them) and run tests | `apps/web/src/main.tsx`, `apps/web/src/App.tsx` | Delete everything except `main.tsx`, `App.tsx`, `index.css`, `vite-env.d.ts`; move any test worth keeping to `packages/app` | | open |
| A-002 | S2 | tooling | No CI pipeline | no `.github/` directory | Add workflow per `03_MAINTENANCE_PLAN.md §2` | | open |
| A-003 | S3 | tooling | Most packages have `echo` lint scripts, so `pnpm lint` checks almost nothing | `packages/*/package.json` | Shared ESLint config | | open |
| A-004 | S2 | backend | Module cycles: identity⇄tenant, identity⇄onboarding, catalog⇄inventory, catalog/inventory⇄sync, catalog⇄ingestion | import matrix in `02_MODULE_MAP.md §3` | Events or interfaces; ArchUnit tests | | open |
| A-005 | S3 | repo hygiene | 9 `tsconfig.tsbuildinfo` files are tracked (one per package) and change on every build | `git ls-files \| grep tsbuildinfo` | Ignore and untrack | | open |
| A-006 | S3 | backend ops | 11 JVM crash logs (`hs_err_pid*.log`) and 3 `replay_pid*.log` in the backend folder. Checked: they are git-ignored (`*.log`), not tracked. They still show the JVM crashed repeatedly | `backend/inventra-backend/` | Read one crash log for the cause (memory, native lib); delete the old files | | open |
| A-007 | S2 | desktop | Two desktop clients (Tauri and .NET Avalonia) with overlapping scope; desktop-native is untracked | `apps/desktop`, `apps/desktop-native` | Decide canonical client (Phase 6), record an ADR | | open |
| A-008 | S2 | contracts | DTOs mirrored by hand in TS (`api-types`) and C# (`desktop-native Core/Domain`) | `02_MODULE_MAP.md §6` | Generate from OpenAPI | | open |
| A-009 | S3 | frontend | `packages/app` depends directly on `@tauri-apps/api` | `packages/app/package.json` | Keep Tauri inside the desktop adapter or app | | open |
| A-010 | S3 | frontend | Theme store exists in both `apps/web/src/stores/themeStore.ts` and `packages/app/src/stores/themeStore.ts` | both files | Keep one (part of A-001) | | open |
| A-011 | S4 | docs | 20 docs with overlap (3× F9, 2× API reference, several diagram/architecture docs) | `docs/` | Re-organise per `03_MAINTENANCE_PLAN.md §6` | | open |
| A-012 | S2 | process | ~40 modified and several untracked files not committed; audit needs a fixed baseline commit | git status | Commit or stash before Phase 1 | | open |
| A-013 | S3 | apps/web tests | 2 stale tests fail: `themeStore.test.ts` expects default mode `system`, but the legacy `apps/web/src/stores/themeStore.ts` now defaults to `light` (uncommitted edit). Proves the legacy copy is drifting | `apps/web/src/stores/themeStore.test.ts` | Resolved by deleting the legacy copy (A-001) | | open |
| A-014 | S3 | tests | `packages/app` `saleReturn.test.tsx` timed out (5 s) when the whole suite ran in parallel; passes alone in ~4 s. Flaky | `packages/app/src/pages/sales/saleReturn.test.tsx` | Raise the test timeout or reduce render cost; consider `--pool=forks` limits | | open |
| A-015 | S2 | backend tests | Backend integration tests hit a real local Postgres at 127.0.0.1:5432 (`application-local.yml`) rather than an isolated container; they pass only if that DB exists and could pollute dev data. `docker-compose.yml` exposes 5433, a different port | `application-local.yml`, `docker-compose.yml` | Use Testcontainers or a dedicated test DB; align ports | | open |
| A-016 | S2 | contracts | **Sync event type drift.** Backend `SyncEventType` = SALE_CREATED, SALE_RETURN_CREATED, TRANSFER_REQUEST_CREATED, SUPPLIER_CREATED, PURCHASE_ORDER_CREATED, GOODS_RECEIPT_POSTED. TS `api-types/src/sync.ts` = SALE_CREATED, SALE_VOIDED, SALE_RETURNED. The two TS-only values are rejected by the backend (`UNSUPPORTED_EVENT_TYPE`) and nothing in TS knows the four new backend types. The offline client currently only emits SALE_CREATED. The backend additions are uncommitted | `sync/domain/model/SyncEventType.java`, `packages/api-types/src/sync.ts`, `packages/offline-storage/src/sync/client.ts:131` | Update the TS union to match; add a test comparing the two lists | | open |
| A-017 | S3 | dependencies | Dependency declarations don't match usage. Declared but never imported: `desktop` → api-client, api-types, design-tokens, shared, ui, validation; `app` and `web` → shared; `print` → api-types, shared; `ui` → design-tokens; `validation` → api-types (some may be type-only or used via Vite aliases, so verify). Undeclared: `offline-storage` imports `@tauri-apps/plugin-sql` without declaring it | `packages/*/package.json`, `packages/offline-storage/src/driver/tauri-sqlite.ts` | Run `knip`; fix manifests | | open |
| A-018 | S3 | build | `apps/web/vite.config.ts` aliases only 6 packages to source (not `app`, `offline-storage`, `print`), so dev and build resolve some packages from `src` and others from `dist`. Mobile build task emits no outputs (turbo warning) | `apps/web/vite.config.ts`, `turbo.json` | Use one resolution strategy for all packages | | open |
| A-019 | S3 | performance | Web and desktop bundles are each ~1.86 MB (about 426 KB gzip) in a single chunk | build output | Route-level `React.lazy` code-splitting | | open |

## Phase reports

### 2026-10-20 — Phases 1–4 (automated pass)

- **Phase 1 baseline:** done for TS and backend (table above). Tauri and .NET builds not run.
- **Phase 2 workspace graph:** the package graph in `02_MODULE_MAP.md §2` matches the manifests. No package cycles. No undeclared internal imports. Dead code confirmed (A-001). Dependency declaration issues raised as A-017.
- **Phase 3 backend:** the import matrix in `02_MODULE_MAP.md §3` was generated from source and is accurate; cycle decisions still to do. Manual per-module checklists not started.
- **Phase 4 contracts:** sync event types checked (A-016 drift). DTO, Zod, permission and GST comparisons still to do.
- **Not started:** Phase 5 (security), Phase 6 (desktop strategy), Phase 7 (docs), Phase 8 (report), and the manual per-domain and per-module checklists in Phases 2–3.
