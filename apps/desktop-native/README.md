# Inventra Desktop Native (Phase 0 / 1)

Welcome to the new **Inventra Desktop** native application. This is a ground-up, desktop-native, local-first Pharmacy ERP application built with **C#**, **.NET 9**, **Avalonia UI**, and **SQLite**.

---

## Architecture Overview

```text
                                INVENTRA CLOUD
                             Spring Boot 4 Backend
                                     │
                          REST / Sync / Auth APIs
                                     │
               ┌─────────────────────┴─────────────────────┐
               │                                           │
      INVENTRA DESKTOP                                WEB / MOBILE
       C# + .NET 9 + Avalonia UI                    Management Portals
               │
        Local Application
               │
          SQLite (WAL)
   (%LocalAppData%/Inventra/Data)
               │
      Local ERP Operations
   (100% Offline Capability)
```

### Solution Structure (`apps/desktop-native/`)

- **`Inventra.Desktop.sln`**: The visual studio / dotnet solution linking all projects.
- **`src/Inventra.Desktop.Core/`**:
  - `Domain/Gst/GstCalculator.cs`: Statutory Indian GST calculation engine (Intra-state CGST+SGST, Inter-state IGST, inclusive/exclusive price modes).
  - `Domain/Inventory/ProductModels.cs`: Products, FEFO batches, and stock status thresholds.
  - `Domain/Sync/SyncModels.cs`: Offline operations with monotonic sequence numbers, SHA-256 checksums, idempotency keys, and status.
  - `Domain/Identity/IdentityModels.cs`: Device registration, user sessions, role-based authorization, and connectivity states.
- **`src/Inventra.Desktop.Data/`**:
  - `DatabaseContext.cs`: High-performance SQLite database context with WAL mode (`PRAGMA journal_mode = WAL`), schema creation, and real pharmacy catalog seeding.
  - `Repositories/ProductRepository.cs`: SQLite data access for catalog exploration, instant search, and FEFO lot queries.
  - `Repositories/OfflineQueueRepository.cs`: Durable offline outbox queue for local mutation tracking.
- **`src/Inventra.Desktop.Infrastructure/`**:
  - `Api/InventraApiClient.cs`: Strongly typed HTTP client connecting to Spring Boot backend (`/api/v1/auth`, `/api/v1/sync`, `/api/v1/products`).
  - `Connectivity/CloudConnectivityService.cs`: Heartbeat monitor managing `Offline`, `Online`, and `Syncing` states.
  - `Device/DeviceIdentityService.cs`: Machine GUID enrollment and persistent terminal identity (`POS-XXX`).
  - `Hardware/ReceiptPrinterService.cs`: Native ESC/POS thermal receipt byte generator (58mm/80mm) with cash drawer kick support.
  - `Hardware/BarcodeScannerService.cs`: Barcode wedge listener.
  - `Sync/SyncEngineService.cs`: Push (pending queue) and pull (delta change feed) sync orchestrator.
- **`src/Inventra.Desktop.App/`**:
  - `Views/ShellWindow.axaml`: Native desktop chrome with Top MenuBar (`Inventory`, `Sales`, `Purchases`, `Reports`, `Finance`, `Settings`), Quick Action Ribbon (`[F2]`–`[F10]`), Workspace Host, and Bottom Status Bar.
  - `Views/Workspaces/InventoryWorkspaceView.axaml`: Dense, spreadsheet-style DataGrid workspace with real-time search, low stock filtering, KPI metrics, and FEFO batch drill-down.
  - `ViewModels/`: MVVM architecture powered by `CommunityToolkit.Mvvm`.
- **`tests/Inventra.Desktop.Tests/`**:
  - 17 unit and integration tests covering GST statutory rules, SQLite concurrency, offline queue sequence numbers, hardware adapters, and connectivity states.

---

## Build and Run Instructions

### Prerequisites
- **.NET 9 SDK** (already installed on this machine)
- Windows 10/11 (or Linux with X11/Wayland)

### Running Tests
To run all 17 automated tests:
```powershell
dotnet test apps/desktop-native/Inventra.Desktop.sln
```

### Building the Application
To build the solution:
```powershell
dotnet build apps/desktop-native/Inventra.Desktop.sln
```

### Launching the Desktop Application
To launch the desktop application:
```powershell
dotnet run --project apps/desktop-native/src/Inventra.Desktop.App
```
Or directly run the compiled executable:
```powershell
.\apps\desktop-native\src\Inventra.Desktop.App\bin\Debug\net9.0\Inventra.Desktop.App.exe
```

---

## Verifying Offline Operation
1. The application stores its SQLite database at:
   `%LocalAppData%\Inventra\Data\inventra_local.db`
2. Disconnecting the internet or stopping the backend transitions the bottom status bar to `Local Mode (Offline)`.
3. All catalog searches, stock lookups, FEFO batch views, and local stock adjustments execute directly against local SQLite with zero latency and append events to `offline_operations`.
4. When cloud connectivity is restored, clicking `[F9] Sync Cloud` flushes the offline queue to the backend.
