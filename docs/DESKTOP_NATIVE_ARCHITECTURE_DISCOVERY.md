# Inventra Desktop: Architecture Discovery & Technology Reset Report

**Product:** Inventra Pharmacy ERP — New Desktop Native Application  
**Phase:** 0 / 1: Desktop-Native, Local-First GST ERP Foundation  
**Date:** October 2026  
**Status:** Approved for Implementation  

---

## 1. Current Desktop Architecture
The current desktop implementation in `apps/desktop` uses a hybrid web-wrapper architecture:
- **Presentation Layer:** React 18, TypeScript, Tailwind CSS, Vite, and shared component libraries (`@inventra/ui`, `@inventra/app`).
- **Desktop Container:** Tauri v2 (Rust backend wrapping Windows WebView2 / Chromium).
- **Local Persistence:** Tauri SQL plugin (`@tauri-apps/plugin-sql`) executing raw SQL strings against a local SQLite file.
- **Device Identity:** Stored in web `localStorage` as `DEV-UUID` strings.
- **Hardware Integration:** Browser-level event listeners for barcode scanners (DOM keydown buffer in `useBarcodeScanner.ts`) and simulated/WebUSB ESC/POS printer adapters.
- **Navigation & Layout:** Traditional SaaS layout with a collapsible sidebar, fluid web margins, and large cards.

---

## 2. Problems with Current Desktop Approach
1. **Web-in-Wrapper Constraints:** Running Chromium/WebView2 consumes 250MB–600MB RAM even when idle, introducing GC pauses during rapid barcode scanning and data entry.
2. **SaaS vs. Professional Desktop Feel:** The fluid web UX (soft animations, large spacing, responsive card flows) feels like browsing a web app rather than operating an installed, low-latency business tool like Excel, IntelliJ, or SAP.
3. **Hardware Sandbox Fragility:** Direct interaction with thermal receipt printers, serial barcode scanners, pole displays, and cash drawer RJ11 kick pulses is constrained and unreliable through browser sandboxes.
4. **Keyboard Ergonomics:** Web browsers frequently intercept key combinations (F1–F12, Alt menus, Tab order, arrow keys in tables). Retail pharmacy cashier workflows require 100% keyboard-driven operation without touching a mouse.
5. **Data Virtualization at Scale:** Rendering 10,000+ medicine SKUs, batch FEFO allocations, and complex ledger rows with HTML DOM virtualization leads to perceptible scroll latency and memory churn.

---

## 3. Why .NET 9 + C# + Avalonia UI is Appropriate
- **Native OS Execution & Raw Performance:** .NET 9 running on Windows provides lightning-fast execution, low memory overhead, and direct access to Win32 APIs, Windows Spooler (`winspool.drv`), serial ports (`System.IO.Ports`), and raw socket streams.
- **Avalonia UI 11+ Architecture:** Unlike WPF or WinUI, Avalonia is a cross-platform XAML engine using Skia for pixel-perfect hardware-accelerated rendering. It does not use WebView2 or browser runtimes.
- **Dense ERP Chrome & Grid Virtualization:** Avalonia’s layout system and `DataGrid` handle hundreds of thousands of items with smooth 60fps scrolling, cell recycling, and deterministic keyboard focus.
- **Architecture & Ecosystem:** Industry-standard MVVM (`CommunityToolkit.Mvvm`), Microsoft Dependency Injection, native SQLite (`Microsoft.Data.Sqlite`), and robust async I/O.
- **Cross-Platform Future:** While optimized Windows-first, Avalonia allows the same desktop codebase to run on Linux (e.g., lightweight POS appliances) or macOS if required.

---

## 4. Alternative Technologies Considered
| Technology | Pros | Cons | Verdict |
|---|---|---|---|
| **WPF (.NET)** | Mature Windows desktop support | Strictly Windows-only, legacy styling system | Rejected |
| **WinUI 3 / MAUI** | Official Microsoft Windows UI | MAUI desktop is notoriously buggy; WinUI 3 has heavy WinRT dependencies | Rejected |
| **Flutter Desktop** | Fast rendering engine | C++ FFI required for native printer/scanner interop; weak enterprise spreadsheet grids | Rejected |
| **Electron** | Huge ecosystem | Higher resource consumption than Tauri; same web wrapper flaws | Rejected |
| **Qt / C++** | Maximum performance | High development friction, memory management overhead, slow UI velocity | Rejected |
| **Avalonia UI (.NET 9)** | Skia-rendered, cross-platform, enterprise XAML, excellent data grid, native hardware access | Requires XAML/C# expertise | **Selected** |

---

## 5. Recommended Desktop Technology
- **Language / Runtime:** C# 13, .NET 9.0 SDK
- **UI Framework:** Avalonia UI 11.2+ (Fluent Theme, Compact Density)
- **MVVM Framework:** `CommunityToolkit.Mvvm` 8.3+
- **Local Persistence:** `Microsoft.Data.Sqlite` 9.0+
- **HTTP / REST Client:** `System.Net.Http.Json` with resilient timeout and token injection
- **Logging:** `Microsoft.Extensions.Logging` + file sink

---

## 6. New Desktop Project Structure
The native desktop application lives in `apps/desktop-native/` alongside the legacy `apps/desktop` to enable safe incremental transition:

```text
apps/desktop-native/
├── Inventra.Desktop.sln
├── src/
│   ├── Inventra.Desktop.Core/           # Domain models, Enums, DTOs, GST calculations
│   │   ├── Domain/
│   │   │   ├── Inventory/
│   │   │   ├── Sales/
│   │   │   ├── Gst/
│   │   │   └── Sync/
│   │   └── Common/
│   ├── Inventra.Desktop.Data/           # SQLite database, EF Core/Direct ADO, Migrations
│   │   ├── DatabaseContext.cs
│   │   ├── Migrations/
│   │   └── Repositories/
│   ├── Inventra.Desktop.Infrastructure/ # API Client, Device Identity, Hardware Adapters, Sync Worker
│   │   ├── Api/
│   │   ├── Sync/
│   │   ├── Hardware/
│   │   └── Identity/
│   └── Inventra.Desktop.App/            # Avalonia UI application
│       ├── App.axaml / App.axaml.cs
│       ├── Program.cs
│       ├── Views/
│       │   ├── ShellWindow.axaml        # Top bar, workspace host, status bar
│       │   ├── Workspaces/              # InventoryWorkspace, SalesWorkspace, ReportsWorkspace
│       │   └── Dialogs/
│       ├── ViewModels/
│       │   ├── ShellViewModel.cs
│       │   ├── InventoryWorkspaceViewModel.cs
│       │   └── StatusViewModel.cs
│       └── Styles/
│           ├── CompactTheme.axaml       # Dense, professional ERP styling
│           └── Icons.axaml
└── tests/
    └── Inventra.Desktop.Tests/
```

---

## 7. Local Database Architecture
SQLite is configured with WAL mode (`PRAGMA journal_mode=WAL`) and foreign keys enabled:
- **`cache_products`:** Local product catalog (ID, name, SKU, generic name, dosage form, tax rate, MRP, price, stock).
- **`cache_batches`:** Local FEFO batches (ID, product ID, batch number, expiry date, available quantity, MRP, price).
- **`cache_customers`:** Local customer directory (phone, name, GSTIN, credit limit).
- **`offline_operations`:** Durable outbox queue storing pending mutations with monotonic sequence numbers, SHA-256 payload checksums, and idempotency keys.
- **`sync_metadata`:** Tracks `last_downloaded_cursor`, `last_sync_timestamp`, and store/business configuration.
- **`device_identity`:** Persists terminal UUID, device code, and authorization tokens.

---

## 8. Cloud Connectivity Architecture
- **State Machine:** `Offline` (Local Mode), `Connecting`, `Online` (Cloud Connected), `Syncing`, `Degraded` (Network error).
- **Resilience:** If the network drops, the application continues processing without blocking or throwing user-facing network error alerts. Local operations commit to SQLite and append an event to `offline_operations`.
- **Heartbeat:** Lightweight background poll to check cloud availability without saturating connections.

---

## 9. Device Pairing Architecture
1. Terminal generates machine identifier based on BIOS/CPU hash or machine GUID.
2. User authenticates via pairing flow or initial owner/manager login.
3. Terminal invokes `POST /api/v1/devices/register` with:
   - `deviceName`: (e.g. "Main Counter Terminal 1")
   - `deviceType`: `DESKTOP`
   - `platformOs`: `Windows 11 / .NET 9`
   - `appVersion`: `1.0.0`
4. Backend provisions device record in PostgreSQL and issues device-scoped credentials.
5. Terminal stores device UUID securely in local database/configuration.

---

## 10. Sync Architecture
Dual-channel synchronization:
1. **Push (Upload Queue):**
   - Reads uncommitted rows from `offline_operations` ordered by `device_sequence_number ASC`.
   - Sends payload to `POST /api/v1/sync/upload`.
   - On response `APPLIED` or `DUPLICATE`: marks row `SYNCED`.
   - On `REJECTED`: records conflict in `sync_conflicts` for manual or rule-based resolution.
2. **Pull (Download Feed):**
   - Retrieves delta stream from `GET /api/v1/sync/download?cursor={last_seq}`.
   - Updates local SQLite caches inside a single database transaction.
   - Advances and commits the local cursor.

---

## 11. Hardware Integration Architecture
- **Barcode Scanner:** Two modes supported:
  1. *Keyboard Wedge:* Low-latency global input handler with threshold timing (rapid characters followed by Enter) to intercept barcode reads without requiring focus in a specific textbox.
  2. *Serial / COM Port:* Direct listener on designated serial/virtual COM port.
- **Receipt Printer:** Ported binary ESC/POS stream generator communicating via:
  - Standard Windows Print Spooler (`RawPrinterHelper` using Win32 `WritePrinter`).
  - Raw TCP/IP Socket (`9100` for network thermal printers).
- **Cash Drawer:** ESC/POS pulse command (`0x1B 0x70 0x00 0x19 0xFA`) dispatched on cash sale completion.

---

## 12. Printing Architecture
- **Thermal Receipts (58mm / 80mm):** High-speed raw ESC/POS byte generator format with pharmacy header, DL number, GSTIN, batch lines, tax summaries, and QR/barcodes.
- **A4 / A5 Tax Invoices & Reports:** Generated using SkiaSharp / Avalonia Print Document or exported to standard PDF.

---

## 13. Authentication & RBAC Approach
- Direct integration with existing Spring Boot JWT auth (`/api/v1/auth/login`, `/refresh`, `/switch-context`).
- Roles: `OWNER`, `MANAGER`, `INVENTORY_OPERATOR`, `CASHIER`, `PHARMACIST`.
- Token Refresh: Automatic background refresh before 15-minute access token expiration.
- Offline Auth: If network is offline, cashiers can unlock local terminal using cached password hash / local PIN established during paired session.
- Menu Bar & Workspace RBAC: Controls in the top bar dynamically enable or disable workspaces according to authorized roles.

---

## 14. Desktop / Web / Mobile Boundaries
- **Desktop:** Primary high-volume point of sale, goods receipt, batch expiry control, barcode generation, local ledger lookup. Works 100% offline.
- **Cloud Backend:** Source of truth for multi-store inventory balances, purchase orders, compliance reports, global catalogs, and multi-tenant isolation.
- **Web:** Administrative portal for pharmacy owners (financial reports, master settings, staff management).
- **Mobile:** Mobile companion (stock auditing, quick price check, owner approval notifications).

---

## 15. Reusable Existing Inventra Infrastructure
- **Backend APIs:** Complete REST endpoints for `/api/v1/products`, `/inventory`, `/sales`, `/sync`, `/devices`, `/auth`, `/reports`.
- **Database Rules:** PostgreSQL schemas V1–V18 defining the authoritative relational structure.
- **Offline Sync Contracts:** `SyncUploadRequest`, `SyncUploadResponse`, `SyncDownloadResponse`, and sequence number logic.
- **Design Language:** Color tokens and typography hierarchy from `@inventra/design-tokens` mapped to Avalonia XAML resources.

---

## 16. Infrastructure That Should Be Abandoned
- Tauri Rust harness and WebView2 container for the desktop client.
- Browser `localStorage` for device and offline persistence.
- React DOM table virtualization for dense operational ERP datasets.
- Generic SaaS card layout paradigms for daily counter workflows.

---

## 17. Backend / API Gaps Identified
- **Catalog Initial Bootstrap:** While `/api/v1/sync/download` handles delta streams, newly enrolled offline terminals need a bulk bootstrap API to download the store's initial product and batch snapshot in chunks. (Can currently be satisfied by paging `/api/v1/products`).
- **Granular GST Line Item Split:** Current `SaleLineResponse` carries `taxRate` and `taxAmount`; dedicated `cgstAmount`, `sgstAmount`, and `igstAmount` properties are derived rather than explicitly separated in some endpoints.

---

## 18. GST Architectural Considerations
Inventra Desktop implements core Indian GST calculation rules:
- **Intra-State:** Place of Supply = Store State $\implies$ CGST (50%) + SGST (50%).
- **Inter-State:** Place of Supply $\ne$ Store State $\implies$ IGST (100%).
- **Tax Exclusive Mode:**
  $$\text{Taxable Value} = \text{Unit Price} \times \text{Qty} - \text{Discount}$$
  $$\text{GST Amount} = \text{Taxable Value} \times \frac{\text{GST Rate}}{100}$$
  $$\text{Total} = \text{Taxable Value} + \text{GST Amount}$$
- **Tax Inclusive Mode:**
  $$\text{Total} = \text{Unit Price} \times \text{Qty} - \text{Discount}$$
  $$\text{Taxable Value} = \frac{\text{Total}}{1 + \frac{\text{GST Rate}}{100}}$$
  $$\text{GST Amount} = \text{Total} - \text{Taxable Value}$$
- All monetary arithmetic uses `decimal` in C# to eliminate floating-point rounding errors.

---

## 19. Global Medicine Master Integration Point
- Cloud hosts verified catalog (`global_medicines` in V18 migration).
- Desktop searches local SQLite `cache_products` first.
- If not found and online, queries `/api/v1/catalog/global-medicines/search` to autofill medicine name, generic composition, dosage form, manufacturer, and standard HSN/GST rates into the local store catalog.

---

## 20. Phase 1 Implementation Plan
1. **Solution Setup:** Initialize `Inventra.Desktop.sln` under `apps/desktop-native/` with Core, Data, Infrastructure, and App projects.
2. **Data & Persistence Layer:** Implement `DatabaseContext`, SQLite tables, product/batch repositories, and offline queue in C#.
3. **Core Services:** Implement device identity service, cloud API client, and connectivity monitoring.
4. **Shell & Navigation UI:** Build native Avalonia window with top menu bar (Inventory, Sales, Purchases, Reports, Finance, Settings), workspace host, and bottom status bar.
5. **Representative Workspace:** Build the **Inventory & Stock Management Workspace** featuring:
   - Dense spreadsheet-style `DataGrid`.
   - Real product and batch data from local SQLite with cloud fetch capability.
   - Instant search/filtering by product name, generic name, or SKU.
   - Status indicators for stock level, FEFO batch count, and GST tax rate.
   - Keyboard interaction (shortcuts, table navigation).
   - Bottom status bar reflecting actual store, user, device ID, printer status, and connectivity state.
6. **Build & Runtime Verification:** Verify compilation, launch, and operations without regressions.
