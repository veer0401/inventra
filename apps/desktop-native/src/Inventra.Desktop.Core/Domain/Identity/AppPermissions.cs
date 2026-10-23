using System;
using System.Collections.Generic;

namespace Inventra.Desktop.Core.Domain.Identity;

public static class AppPermissions
{
    public const string SaleCreate = "SALE_CREATE";
    public const string SaleView = "SALE_VIEW";
    public const string InventoryView = "INVENTORY_VIEW";
    public const string InventoryAdjust = "INVENTORY_ADJUST";
    public const string ProductCreate = "PRODUCT_CREATE";
    public const string ProductEdit = "PRODUCT_EDIT";
    public const string PurchaseCreate = "PURCHASE_CREATE";
    public const string ReportView = "REPORT_VIEW";
    public const string SettingsManage = "SETTINGS_MANAGE";
    public const string DeviceManage = "DEVICE_MANAGE";

    public static readonly IReadOnlyList<string> All = new[]
    {
        SaleCreate,
        SaleView,
        InventoryView,
        InventoryAdjust,
        ProductCreate,
        ProductEdit,
        PurchaseCreate,
        ReportView,
        SettingsManage,
        DeviceManage
    };

    public static HashSet<string> GetDefaultPermissionsForRole(string? role)
    {
        var normRole = (role ?? "CASHIER").Trim().ToUpperInvariant();
        return normRole switch
        {
            "OWNER" or "PLATFORM_ADMIN" or "ADMIN" => new HashSet<string>(All, StringComparer.OrdinalIgnoreCase),
            "MANAGER" => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                SaleCreate, SaleView, InventoryView, InventoryAdjust, ProductCreate, ProductEdit,
                PurchaseCreate, ReportView, SettingsManage
            },
            "PHARMACIST" => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                SaleCreate, SaleView, InventoryView, ReportView
            },
            "INVENTORY_OPERATOR" => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                InventoryView, InventoryAdjust, ProductCreate, ProductEdit, PurchaseCreate
            },
            "CASHIER" or "OPERATOR" => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                SaleCreate, SaleView, InventoryView
            },
            _ => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                SaleCreate, SaleView, InventoryView
            }
        };
    }
}
