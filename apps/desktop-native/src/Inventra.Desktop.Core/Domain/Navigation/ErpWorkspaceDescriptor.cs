using System;
using System.Collections.Generic;
using System.Linq;
using Inventra.Desktop.Core.Domain.Identity;

namespace Inventra.Desktop.Core.Domain.Navigation;

public sealed record ErpWorkspaceDescriptor(
    string Key,
    string Title,
    string Module,
    string? RequiredPermission,
    bool CanList,
    bool CanCreate,
    bool CanEdit,
    bool CanView,
    string Description
);

public static class ErpNavigationRegistry
{
    public const string InventoryMedicines = "inventory-medicines";
    public const string InventoryStock = "inventory-stock";
    public const string InventoryBatches = "inventory-batches";

    public const string PurchasesOrders = "purchases-po";
    public const string PurchasesGrn = "purchases-grn";
    public const string PurchasesSuppliers = "purchases-suppliers";

    public const string SalesPos = "sales-pos";
    public const string SalesRegister = "sales-register";
    public const string SalesCustomers = "sales-customers";

    public const string SettingsDiagnostics = "settings-diagnostics";
    public const string SettingsPairing = "settings-pairing";

    private static readonly IReadOnlyList<ErpWorkspaceDescriptor> _allWorkspaces = new List<ErpWorkspaceDescriptor>
    {
        new(
            InventoryMedicines,
            "Medicines & Catalog Master",
            "Inventory",
            AppPermissions.InventoryView,
            CanList: true,
            CanCreate: true,
            CanEdit: true,
            CanView: true,
            "Business medicine master catalog, formulations, units, tax classifications and packaging."
        ),
        new(
            InventoryStock,
            "Stock Levels & Store Inventory",
            "Inventory",
            AppPermissions.InventoryView,
            CanList: true,
            CanCreate: false,
            CanEdit: true,
            CanView: true,
            "Real-time store stock on hand, reorder thresholds, and physical inventory adjustments."
        ),
        new(
            InventoryBatches,
            "Batches & FEFO Expiry Registry",
            "Inventory",
            AppPermissions.InventoryView,
            CanList: true,
            CanCreate: false,
            CanEdit: false,
            CanView: true,
            "First-Expiry-First-Out (FEFO) batch tracking, expiry countdown, MRP, and lot traceability."
        ),
        new(
            PurchasesOrders,
            "Purchase Orders (PO)",
            "Purchases",
            AppPermissions.PurchaseCreate,
            CanList: true,
            CanCreate: true,
            CanEdit: true,
            CanView: true,
            "Vendor purchase orders, line item procurement, GST breakdowns, and order fulfillment tracking."
        ),
        new(
            PurchasesGrn,
            "Goods Receipts (GRN)",
            "Purchases",
            AppPermissions.PurchaseCreate,
            CanList: true,
            CanCreate: true,
            CanEdit: false,
            CanView: true,
            "Physical inward goods receipt notes, lot verification, supplier invoice matching, and stock intake."
        ),
        new(
            PurchasesSuppliers,
            "Supplier Directory",
            "Purchases",
            AppPermissions.PurchaseCreate,
            CanList: true,
            CanCreate: true,
            CanEdit: true,
            CanView: true,
            "Authorized pharmaceutical distributors, GSTIN credentials, payment terms, and contact profiles."
        ),
        new(
            SalesPos,
            "Point of Sale (Retail POS)",
            "Sales",
            AppPermissions.SaleCreate,
            CanList: false,
            CanCreate: true,
            CanEdit: false,
            CanView: false,
            "High-speed retail pharmacy counter checkout, barcode scanning, FEFO batch selection, and GST invoice creation."
        ),
        new(
            SalesRegister,
            "Sales Register & Invoices",
            "Sales",
            AppPermissions.SaleView,
            CanList: true,
            CanCreate: false,
            CanEdit: false,
            CanView: true,
            "Historical sales invoices, customer receipts, tax totals, and offline synchronization audit."
        ),
        new(
            SalesCustomers,
            "Customer Directory & Dues",
            "Sales",
            AppPermissions.SaleView,
            CanList: true,
            CanCreate: true,
            CanEdit: true,
            CanView: true,
            "Patient and customer registry, contact details, GSTIN, and retail credit history."
        ),
        new(
            SettingsDiagnostics,
            "Diagnostics & Telemetry",
            "Settings",
            AppPermissions.SettingsManage,
            CanList: true,
            CanCreate: false,
            CanEdit: false,
            CanView: true,
            "Local database health, cloud latency, device telemetry, and hardware diagnostics."
        ),
        new(
            SettingsPairing,
            "Workstation Device Pairing",
            "Settings",
            null,
            CanList: false,
            CanCreate: true,
            CanEdit: false,
            CanView: true,
            "Workstation hardware identity registration, cloud pairing, and cryptographic session binding."
        )
    };

    public static IReadOnlyList<ErpWorkspaceDescriptor> All => _allWorkspaces;

    public static ErpWorkspaceDescriptor? GetByKey(string key) =>
        _allWorkspaces.FirstOrDefault(w => string.Equals(w.Key, key, StringComparison.OrdinalIgnoreCase));
}
