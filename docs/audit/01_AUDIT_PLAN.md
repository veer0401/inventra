# Detailed Repository Audit Plan

**Goal:** know exactly what every part of Inventra does, how it connects to the rest, what is broken or dead, and what is risky, then turn that into a prioritised fix list and a living module map.

**Outputs:** a verified `02_MODULE_MAP.md`, a full `04_FINDINGS_LOG.md`, and one short report per phase appended to the log.

---

## 0. Ground rules

- Every finding goes in `04_FINDINGS_LOG.md` with an ID, severity, evidence (`path:line`) and a proposed fix. No fixes during the audit unless they are trivial and safe; the audit maps, the follow-up fixes.
- Severity: **S1** broken/security/data loss · **S2** wrong behaviour or contract drift · **S3** maintainability/dead code · **S4** cosmetic/docs.
- Start from a clean baseline: commit or stash the current uncommitted work (≈40 modified files and untracked `apps/desktop-native`) so the audit has a fixed reference commit.

---

## Phase 1 — Inventory & baseline (1–2 days)

**Aim:** see whether the repo builds and tests cleanly, and list everything that exists.

| Step | Command / action | Record |
|---|---|---|
| 1.1 Install | `pnpm install` | lockfile drift, warnings |
| 1.2 Build all | `pnpm build` | failing packages |
| 1.3 Typecheck | `pnpm typecheck` | error count per package |
| 1.4 Tests (TS) | `pnpm test` | pass/fail/skip per package |
| 1.5 Backend | `docker compose up -d` then `./mvnw verify` in `backend/inventra-backend` | test results, Flyway V1–V19 apply cleanly |
| 1.6 Desktop | `pnpm --filter @inventra/desktop build:native` | Rust/Tauri build status |
| 1.7 Desktop-native | `dotnet build` / `dotnet test` in `apps/desktop-native` | build + 10 test files |
| 1.8 File census | count files/LOC per app, package and backend module | baseline numbers |
| 1.9 Tracked junk | `git ls-files` for build output, logs, `tsbuildinfo`, `hs_err_pid*.log`, `dist/` | list for cleanup |

**Exit:** a baseline table (build ✓/✗, typecheck errors, test counts) at the top of the findings log.

---

## Phase 2 — Frontend structure & linkage (2–3 days)

### 2.1 Workspace graph
- Regenerate the package graph (`pnpm ls -r --depth 0` or a script reading every `package.json`) and diff it against `02_MODULE_MAP.md §2`.
- Check every `@inventra/*` import in source is declared in that package's `package.json` (undeclared deps break isolated builds).
- Detect cycles between packages (e.g. with `madge --circular` per package).
- Check `tsconfig` project references match the declared deps (`tsconfig.base.json`, each `tsconfig.json`).

### 2.2 Dead and duplicated code
- `apps/web/src`: 130 tracked files mirror `packages/app` (pages, services, stores). Confirm nothing imports them and plan removal.
- Run `knip` or `ts-prune` across the workspace for unused exports, files and dependencies.
- Compare `apps/web/tailwind.config.js`, `apps/desktop/tailwind.config.js` and `packages/app` styles for drift.

### 2.3 `packages/app` deep dive (one checklist per domain folder)
For each domain (`auth`, `catalog`, `inventory`, `purchasing`, `sales`, `pos`, `returns`, `customers`, `transfers`, `suppliers`, `imports`, `reports`, `admin`, `settings`, `users`, `devices`, `dashboard`, `modules`, `guide`, `marketing`):

- [ ] Route(s) and guard (role/permission) that expose it
- [ ] Pages → components → hooks/stores → service → backend endpoint chain written down
- [ ] Loading, error and empty states exist
- [ ] Forms use a `packages/validation` schema matching the backend DTO
- [ ] Web vs desktop behaviour differences (runtime adapter use) noted
- [ ] Tests exist; note gaps

### 2.4 Runtime adapters
- List every method on `runtime/types.ts`, and check both `WebRuntimeAdapter` and `DesktopRuntimeAdapter` implement it with the same semantics.
- Check `packages/app` never imports `@tauri-apps/*` outside the desktop adapter (it is currently a direct dependency of `app`).

### 2.5 Shared packages
- `api-client`: auth header, token refresh, error mapping, timeouts, retries.
- `offline-storage`: schema vs backend tables used, queue states, retry/backoff, conflict handling, `tauri-sqlite` vs `sqlite-memory` parity.
- `print`: models vs backend sale/receipt DTOs, adapters tested.
- `design-tokens` / `ui`: tokens actually consumed; theme store duplicated in `apps/web/src/stores/themeStore.ts` and `packages/app/src/stores/themeStore.ts`.
- Lint: most packages have `echo` lint scripts; record which have real ESLint.

**Exit:** verified frontend sections of the module map and a per-domain checklist table.

---

## Phase 3 — Backend structure & linkage (3–4 days)

### 3.1 Module boundaries
- Regenerate the import matrix (script in §Tooling) and diff with `02_MODULE_MAP.md §3`.
- Confirm or rule out each listed cycle (identity⇄tenant, identity⇄onboarding, catalog⇄inventory, catalog/inventory⇄sync, catalog⇄ingestion). For each, decide: event, interface in `common`, or merge.
- Check controllers only call `application` services, never repositories of other modules directly.
- Consider adding Spring Modulith or ArchUnit tests to lock boundaries in.

### 3.2 Per-module checklist
For each of the 17 modules:
- [ ] Controllers and endpoints listed (≈179 mappings in total); compare with `docs/BACKEND_API_REFERENCE.md`
- [ ] Authorisation on every endpoint (role checks, tenant scoping)
- [ ] DTO validation annotations present
- [ ] Transaction boundaries (`@Transactional`) on writes; stock-changing paths are atomic
- [ ] Entities map to a Flyway migration; no `ddl-auto` drift
- [ ] Domain exceptions map through `GlobalExceptionHandler`
- [ ] Unit/integration tests (81 test files total) — list gaps

### 3.3 Data layer
- Walk V1–V19 migrations in order; draw an ER diagram per domain.
- Check every tenant-owned table has `tenant_id`, indexes on foreign keys and tenant filters, and that queries always filter by tenant.
- Check seed migrations (V18 global medicine, V19 legal CMS) are idempotent.

### 3.4 Sync subsystem
- Map every `SyncEventType` to its handler in `SyncOperationProcessor`, its producer on the client and its TS/C# mirror.
- Test idempotency (same event twice), ordering, and conflict response.

**Exit:** verified backend sections of the module map, ER diagrams, a list of cycles with decisions.

---

## Phase 4 — Contracts & cross-layer consistency (2 days)

Use `02_MODULE_MAP.md §6`. For each contract, diff the source of truth against every mirror:

- Java DTOs ↔ `api-types` ↔ desktop-native models (field names, nullability, enums, date formats).
- `SyncEventType` ↔ TS ↔ C#.
- Jakarta validation ↔ Zod schemas.
- Flyway schema ↔ `offline-storage/schema/init.ts` ↔ `DatabaseContext.cs`.
- Permissions ↔ route guards ↔ `AppPermissions.cs`.
- GST calculation backend ↔ frontend ↔ `GstCalculator.cs` (same inputs, same rupee/paise outputs).
- Consider generating `api-types` from an OpenAPI spec (springdoc) to end manual mirroring.

**Exit:** a contract-drift table; each mismatch logged as S2.

---

## Phase 5 — Security, config & operations (1–2 days)

- JWT: secret source, expiry, refresh, revocation; device identity for desktop.
- `SecurityConfig`: public vs protected routes, CORS, CSRF stance.
- Secrets: `application*.yml`, `docker-compose.yml`, Tauri config, desktop-native config; nothing real committed.
- Tauri `capabilities/default.json`: least privilege.
- Razorpay webhooks: signature verification.
- Dependencies: `pnpm audit`, `./mvnw dependency-check` (OWASP), `cargo audit`, `dotnet list package --vulnerable`.
- Logging: no PII/tokens in logs; JVM crash logs (`hs_err_pid*.log`, `replay_pid*.log`) in the backend folder point to memory issues worth investigating.
- No CI exists (`.github/` missing); record as S2.

---

## Phase 6 — Desktop strategy (1 day)

Two desktop clients exist: Tauri (`apps/desktop`) and .NET Avalonia (`apps/desktop-native`, see `docs/DESKTOP_NATIVE_ARCHITECTURE_DISCOVERY.md`).
- Feature parity matrix (POS, inventory, purchases, sync, printing, pairing, diagnostics).
- Decide which is canonical, and the sunset or freeze plan for the other.
- If both stay, decide how contracts are shared (generated clients).

---

## Phase 7 — Documentation audit (1 day)

`docs/` has 20 files with heavy overlap (three F9 docs, two API references, several architecture/diagram docs).
- Classify each doc: **current reference**, **historical (phase report)**, or **obsolete**.
- Move phase reports to `docs/history/`; keep one canonical doc per topic.
- Check every doc claim against code for the topics in §6 of the module map.

---

## Phase 8 — Report & roadmap (1 day)

- Summarise findings by severity and area.
- Group fixes into work packages (e.g. "Remove dead `apps/web/src` copy", "Break identity⇄tenant cycle", "Add CI", "Generate API types").
- Hand off to `03_MAINTENANCE_PLAN.md` for ongoing upkeep.

---

## Tooling

| Need | Tool |
|---|---|
| TS cycles / graph | `madge`, `dependency-cruiser` |
| Unused code/deps | `knip` |
| Java boundaries | ArchUnit or Spring Modulith; quick check: `grep -rhoE 'import com\.inventra\.inventra_backend\.[a-z_]+'` per module |
| Coverage | Vitest `--coverage`, JaCoCo |
| Vulnerabilities | `pnpm audit`, OWASP dependency-check, `cargo audit`, `dotnet list package --vulnerable` |
| API spec | springdoc-openapi → `openapi-typescript` |

## Estimated effort

About 12–17 working days for one person; Phases 2 and 3 can run in parallel with two people.
