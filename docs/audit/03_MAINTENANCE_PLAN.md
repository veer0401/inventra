# Maintenance Plan

How to keep Inventra healthy after the audit. The aim is that the module map stays true, contracts don't drift, and problems are caught by automation rather than by the next audit.

---

## 1. Rules for every change

1. **Dependency direction.** Frontend: `apps → app → (ui, services) → api-client → api-types`. Leaves (`api-types`, `shared`, `design-tokens`) import nothing internal. Backend: modules depend on `common` and on lower modules only; no new cycles.
2. **One home per thing.** UI lives in `packages/app`; `apps/*` only host the app and add platform-specific pieces. Never copy a page into an app.
3. **Contracts change together.** A backend DTO, `SyncEventType` or migration change must update its mirrors (see `02_MODULE_MAP.md §6`) in the same PR.
4. **Migrations are append-only.** Never edit a released `V*.sql`; add a new version.
5. **Platform code stays behind the runtime adapter.** `@tauri-apps/*` only inside `DesktopRuntimeAdapter`/`apps/desktop`.
6. **Docs follow code.** If a PR changes a flow or dependency shown in `02_MODULE_MAP.md`, it updates that file.

## 2. Automated quality gates (set up first)

There is no CI today. Add a GitHub Actions workflow running on every PR:

| Gate | Command |
|---|---|
| Install | `pnpm install --frozen-lockfile` |
| Build / typecheck / test | `pnpm build && pnpm typecheck && pnpm test` |
| Lint | real ESLint in every package (replace `echo` lint scripts) |
| TS boundaries | `dependency-cruiser` rules enforcing §1.1 and no cycles |
| Unused code | `knip` (warn first, then fail) |
| Backend | `./mvnw verify` with Testcontainers Postgres; ArchUnit/Modulith boundary tests |
| Desktop | `cargo check` for `src-tauri`; `dotnet build && dotnet test` for desktop-native |
| Contracts | regenerate `api-types` from OpenAPI and fail if the diff is non-empty (once generation exists) |
| Security | `pnpm audit --prod`, OWASP dependency-check (weekly job) |

Also: a pre-commit hook (Prettier + lint-staged) and a `.gitignore` that covers `dist/`, `*.tsbuildinfo`, `target/`, `hs_err_pid*.log`, `replay_pid*.log`, `bin/`, `obj/`.

## 3. Cadence

| Frequency | Task | Output |
|---|---|---|
| Every PR | Gates above; PR checklist (§5) | green CI |
| Weekly | Triage `04_FINDINGS_LOG.md`; dependency/security scan results | updated statuses |
| Monthly | Regenerate module graphs (TS + Java) and diff against `02_MODULE_MAP.md`; review test coverage trend | map refreshed, coverage note |
| Monthly | Dependency upgrades (Renovate/Dependabot batch): pnpm packages, Spring Boot, Tauri, .NET | upgrade PR |
| Per release | Run Flyway on a copy of prod data; verify sync with an old desktop client version | release checklist |
| Quarterly | Mini-audit: re-run Phases 2–5 checklists on changed areas only; docs classification review | short report in findings log |
| Yearly | Full audit using `01_AUDIT_PLAN.md` | new baseline |

## 4. Ownership

Assign one owner per area (one person can hold several):

| Area | Covers |
|---|---|
| Frontend platform | `packages/app`, `ui`, `design-tokens`, `apps/web` |
| Desktop & offline | `apps/desktop`, `apps/desktop-native`, `offline-storage`, `print` |
| Contracts | `api-types`, `api-client`, `validation`, OpenAPI generation |
| Backend core | `common`, `identity`, `tenant`, `onboarding`, `notification` |
| Backend operations | `catalog`, `inventory`, `purchasing`, `sales`, `customer`, `transfer` |
| Backend platform | `sync`, `ingestion`, `reporting`, `intelligence`, `content`, `careers`, migrations |
| Docs | `docs/` structure and this folder |

Record owners in a `CODEOWNERS` file once CI exists.

## 5. PR checklist

```
- [ ] Builds, typechecks and tests pass locally
- [ ] No new cross-module/package imports that break the dependency rules
- [ ] DTO / sync event / migration changes mirrored (api-types, validation, offline-storage, desktop-native)
- [ ] New endpoint has auth + tenant scoping + validation + test
- [ ] Flyway migration is new (not edited) and reversible plan noted
- [ ] 02_MODULE_MAP.md updated if links or flows changed
- [ ] Docs updated or marked obsolete
```

## 6. Documentation governance

Proposed layout after the Phase 7 clean-up:

```
docs/
  audit/          ← this folder (plan, map, maintenance, findings)
  architecture/   ← frontend, backend, cross-platform, theming, design system
  reference/      ← one API reference, inventory lifecycle, sync protocol
  history/        ← phase plans/reports (F8, F9, handoff, readiness audits)
  decisions/      ← ADRs: one short file per architectural decision
```

- One canonical doc per topic; others link to it.
- Each doc starts with `Status: current | historical | obsolete` and `Last verified: YYYY-MM-DD`.
- Write an ADR for decisions such as "Tauri vs .NET desktop", "generated API types", "how module cycles are broken".

## 7. Health metrics to track

| Metric | Target |
|---|---|
| CI pass rate on master | 100% |
| Package/module cycles | 0 |
| Contract drift findings open | 0 |
| Test coverage (TS / Java) | set baseline in Phase 1, then never decrease |
| Open S1 / S2 findings | 0 S1; S2 closed within one sprint |
| Dependencies with known high CVEs | 0 |
| Docs with `Last verified` older than 6 months | 0 |
