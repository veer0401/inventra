# Inventra Frontend Architecture — Web, Desktop & Mobile

This document establishes the frontend architecture for the Inventra Pharmacy ERP system across its three client applications:
1. **Web Application** (`apps/web`): React 19 + TypeScript + Vite (**Strictly Online-Only**)
2. **Desktop Application** (`apps/desktop`): Tauri 2.0 + React 19 + TypeScript (**Offline-Capable POS**)
3. **Mobile Application** (`apps/mobile`): React Native + TypeScript (**Offline-Capable Mobile POS**)

---

## 1. Core Principles & Client Boundaries

### The Online-Only Web Boundary
> [!IMPORTANT]
> The **Web Application is strictly online-only**. It does not use IndexedDB, local database engines, offline queues, or background sync engines. If network connectivity is lost, the web client halts mutating operations and presents an appropriate connection error banner.

### Offline-Capable Desktop & Mobile Clients
- The **Desktop** application provides high-speed counter POS, ESC/POS receipt printing, cash drawer kickout, and local durable SQLite storage with Phase 8 synchronization.
- The **Mobile** application provides touch-optimized mobile billing, stock checking, camera barcode scanning, and durable JSI SQLite storage with Phase 8 synchronization.

---

## 2. Monorepo Structure

```text
inventra/
├── backend/
│   └── inventra-backend/          # Spring Boot 4.1.1 REST API
│
├── apps/
│   ├── web/                       # React 19 + Vite (Admin, Back-Office & Online POS)
│   ├── desktop/                   # Tauri 2.0 + React 19 (Offline Counter POS)
│   └── mobile/                    # React Native (Mobile POS & Floor Stock)
│
├── packages/
│   ├── api-types/                 # Typed DTO interfaces & ProblemDetail models
│   ├── api-client/                # Platform-agnostic HTTP Client with token lifecycle
│   ├── validation/                # Zod schemas matching backend Bean Validation
│   ├── shared/                    # Currency (INR), DateTime (Asia/Kolkata), Checksum utils
│   └── ui/                        # Shared React DOM UI component library (shadcn/ui)
│
├── docs/
│   ├── api-contract.md
│   └── frontend-architecture.md
│
├── package.json                   # pnpm workspace root
├── pnpm-workspace.yaml
└── turbo.json                     # Turborepo task pipeline
```

---

## 3. Shared Packages Responsibility

- **`@inventra/api-types`**: Pure TypeScript contracts matching backend DTOs, request/response models, `ApiResponse<T>`, RFC 9457 `ProblemDetail`, and pagination metadata.
- **`@inventra/api-client`**: Typed fetch client supporting Authorization headers, `X-Device-Id`, timeout, ProblemDetail error parsing, and token refresh hooks.
- **`@inventra/validation`**: Zod validation schemas for forms, inputs, and domain constraints.
- **`@inventra/shared`**: Currency formatting (`₹`), date formatting (`Asia/Kolkata`), canonical JSON hashing for sync checksum verification, and common constants.
- **`@inventra/ui`**: Shared UI design system using Tailwind CSS and Radix UI / shadcn/ui primitives.
