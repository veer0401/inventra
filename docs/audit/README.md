# Inventra Repository Audit & Maintenance

This folder holds the plan for a full audit of the Inventra monorepo, the current map of how its modules connect, and how to keep the codebase healthy after the audit.

| File | Purpose | When to update |
|---|---|---|
| [01_AUDIT_PLAN.md](01_AUDIT_PLAN.md) | Phased plan for the audit: scope, method, checklists, exit criteria | Before each audit cycle |
| [02_MODULE_MAP.md](02_MODULE_MAP.md) | How every app, package and backend module links to the others, plus the main runtime flows | Whenever a dependency or flow changes |
| [03_MAINTENANCE_PLAN.md](03_MAINTENANCE_PLAN.md) | Ongoing rules, cadences, quality gates and doc governance | Quarterly review |
| [04_FINDINGS_LOG.md](04_FINDINGS_LOG.md) | Running list of audit findings with severity, owner and status | Continuously during and after the audit |

## Repository at a glance (snapshot 2026-10-20)

| Layer | Location | Tech |
|---|---|---|
| Web app | `apps/web` | Vite + React, thin shell over `@inventra/app` |
| Desktop app (current) | `apps/desktop` | Tauri 2 (Rust) + React, SQLite via `@tauri-apps/plugin-sql` |
| Desktop app (new) | `apps/desktop-native` | .NET / Avalonia (App, Core, Data, Infrastructure, Tests) — untracked |
| Mobile | `apps/mobile` | Placeholder only (Phase F11) |
| Shared frontend | `packages/*` | 9 TS packages: `app`, `ui`, `design-tokens`, `api-client`, `api-types`, `validation`, `shared`, `offline-storage`, `print` |
| Backend | `backend/inventra-backend` | Spring Boot 4.1, Java 17, PostgreSQL 17, Flyway (V1–V19), JWT |
| Tooling | root | pnpm 10 workspaces, Turborepo, Vitest, Docker Compose (Postgres on 5433) |

## How to use this folder

1. Read `02_MODULE_MAP.md` first; it shows how the system is wired today.
2. Run the audit phase by phase from `01_AUDIT_PLAN.md`, logging every issue in `04_FINDINGS_LOG.md`.
3. After the audit, follow `03_MAINTENANCE_PLAN.md` to keep the map and the code in sync.
