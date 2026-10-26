using System;
using System.Collections.Generic;

namespace Inventra.Desktop.Core.Domain.Purchasing;

public static class SupplierSyncState
{
    public const string Synced = "SYNCED";
    public const string Pending = "PENDING";
    public const string Failed = "FAILED";
}

public sealed class SupplierItem
{
    public string Id { get; set; } = string.Empty;
    public string BusinessId { get; set; } = string.Empty;
    public string SupplierCode { get; set; } = string.Empty;
    public string LegalName { get; set; } = string.Empty;
    public string? TradeName { get; set; }
    public string? Gstin { get; set; }
    public string? ContactPersonName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? AddressLine1 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public int PaymentTermsDays { get; set; } = 0;
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE
    public long UpdatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    /// <summary>SYNCED (on the server), PENDING (saved locally, create queued) or FAILED (server rejected it).</summary>
    public string SyncState { get; set; } = SupplierSyncState.Synced;
    public string? SyncError { get; set; }

    public bool IsSynced => SyncState == SupplierSyncState.Synced;
    public string SyncStateDisplay => SyncState switch
    {
        SupplierSyncState.Pending => "Pending sync",
        SupplierSyncState.Failed => "Sync failed",
        _ => "Synced"
    };
    public string SyncBadgeFg => SyncState switch
    {
        SupplierSyncState.Pending => "#B45309",
        SupplierSyncState.Failed => "#B91C1C",
        _ => "#15803D"
    };

    public string DisplayName => !string.IsNullOrWhiteSpace(TradeName) ? $"{TradeName} ({LegalName})" : LegalName;
    public string GstinDisplay => !string.IsNullOrWhiteSpace(Gstin) ? Gstin : "UNREGISTERED";
    public string PhoneDisplay => !string.IsNullOrWhiteSpace(PhoneNumber) ? PhoneNumber : "—";
    public bool IsActive => string.Equals(Status, "ACTIVE", StringComparison.OrdinalIgnoreCase);

    public string StatusBadgeBg => IsActive ? "#F0FDF4" : "#FEF2F2";
    public string StatusBadgeFg => IsActive ? "#15803D" : "#B91C1C";
    public string StatusBadgeBorder => IsActive ? "#BBF7D0" : "#FECACA";
}

public sealed class PurchaseOrderLineItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PurchaseOrderId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public decimal OrderedQuantity { get; set; } = 1m;
    public decimal FreeQuantity { get; set; } = 0m;
    public decimal ReceivedQuantity { get; set; } = 0m;
    public string PurchaseUnit { get; set; } = "STRIP";

    /// <summary>Base units per <see cref="PurchaseUnit"/> (the product's pack size when the line was added).</summary>
    public int ConversionFactor { get; set; } = 1;

    public decimal UnitPrice { get; set; } = 0m;
    public decimal DiscountAmount { get; set; } = 0m;
    public decimal TaxRate { get; set; } = 12.0m;
    public decimal TaxAmount { get; set; } = 0m;
    public decimal LineTotal { get; set; } = 0m;
    public bool IsTaxInclusive { get; set; } = false;

    public string FormattedRate => $"₹{UnitPrice:F2}";
    public string FormattedTax => $"₹{TaxAmount:F2} ({TaxRate:F0}%)";
    public string FormattedTotal => $"₹{LineTotal:F2}";
    public string FormattedQty => $"{OrderedQuantity:F0}{(FreeQuantity > 0 ? $" + {FreeQuantity:F0} Free" : "")}";
}

public sealed class PurchaseOrderItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string BusinessId { get; set; } = string.Empty;
    public string StoreId { get; set; } = string.Empty;
    public string SupplierId { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string? SupplierInvoiceNumber { get; set; }
    public string OrderDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string? ExpectedDeliveryDate { get; set; }
    public string Status { get; set; } = "DRAFT"; // DRAFT, CONFIRMED, PARTIALLY_RECEIVED, COMPLETED, CANCELLED
    public int PaymentTermsDays { get; set; } = 0;
    public string? Notes { get; set; }
    public decimal Subtotal { get; set; } = 0m;
    public decimal DiscountAmount { get; set; } = 0m;
    public decimal TaxAmount { get; set; } = 0m;
    public decimal TotalAmount { get; set; } = 0m;
    public string SyncStatus { get; set; } = "PENDING"; // PENDING, SYNCED, FAILED
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public string CreatedBy { get; set; } = string.Empty;

    public List<PurchaseOrderLineItem> Lines { get; set; } = new();

    public string FormattedTotal => $"₹{TotalAmount:F2}";
    public string FormattedTax => $"₹{TaxAmount:F2}";
    public int LineCount => Lines.Count;

    public string StatusBadgeBg => Status switch
    {
        "DRAFT" => "#F8FAFC",
        "CONFIRMED" => "#EFF6FF",
        "PARTIALLY_RECEIVED" => "#FFFBEB",
        "COMPLETED" => "#F0FDF4",
        "CANCELLED" => "#FEF2F2",
        _ => "#F1F5F9"
    };

    public string StatusBadgeFg => Status switch
    {
        "DRAFT" => "#475569",
        "CONFIRMED" => "#1D4ED8",
        "PARTIALLY_RECEIVED" => "#B45309",
        "COMPLETED" => "#15803D",
        "CANCELLED" => "#B91C1C",
        _ => "#334155"
    };

    public string StatusBadgeBorder => Status switch
    {
        "DRAFT" => "#CBD5E1",
        "CONFIRMED" => "#BFDBFE",
        "PARTIALLY_RECEIVED" => "#FDE68A",
        "COMPLETED" => "#BBF7D0",
        "CANCELLED" => "#FECACA",
        _ => "#E2E8F0"
    };
}

public sealed class GoodsReceiptLineItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string GoodsReceiptId { get; set; } = string.Empty;
    public string? PurchaseOrderLineId { get; set; }
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;

    /// <summary>Unit the quantities on this line are entered in (the product's selling unit).</summary>
    public string PurchaseUnit { get; set; } = "STRIP";

    /// <summary>Base units per <see cref="PurchaseUnit"/>; set when the receipt is posted and sent to the server.</summary>
    public int ConversionFactor { get; set; } = 1;

    public decimal ReceivedQuantity { get; set; } = 0m;
    public decimal RejectedQuantity { get; set; } = 0m;
    public decimal FreeQuantity { get; set; } = 0m;
    public string BatchNumber { get; set; } = string.Empty;
    public string? ManufacturingDate { get; set; }
    public string ExpiryDate { get; set; } = string.Empty; // Format YYYY-MM
    public decimal UnitCost { get; set; } = 0m;
    public decimal Mrp { get; set; } = 0m;
    public decimal SellingPrice { get; set; } = 0m;
    public decimal TaxRate { get; set; } = 12.0m;
    public decimal TaxAmount { get; set; } = 0m;
    public decimal LineTotal { get; set; } = 0m;
    public string? AssignedBatchId { get; set; }

    public string FormattedCost => $"₹{UnitCost:F2}";
    public string FormattedMrp => $"₹{Mrp:F2}";
    public string FormattedQty => $"{ReceivedQuantity:F0}{(FreeQuantity > 0 ? $" + {FreeQuantity:F0} Free" : "")}";
}

public sealed class GoodsReceiptItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string BusinessId { get; set; } = string.Empty;
    public string StoreId { get; set; } = string.Empty;
    public string SupplierId { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public string? PurchaseOrderId { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public string? VendorDeliveryNote { get; set; }
    public string ReceivedDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");
    public string Status { get; set; } = "DRAFT"; // DRAFT, POSTED, CANCELLED
    public string? Notes { get; set; }
    public decimal TotalAmount { get; set; } = 0m;
    public string ReceivedBy { get; set; } = string.Empty;
    public string SyncStatus { get; set; } = "PENDING"; // PENDING, SYNCED, FAILED
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    public List<GoodsReceiptLineItem> Lines { get; set; } = new();

    public string FormattedTotal => $"₹{TotalAmount:F2}";
    public int LineCount => Lines.Count;

    public string StatusBadgeBg => Status switch
    {
        "DRAFT" => "#F8FAFC",
        "POSTED" => "#F0FDF4",
        "CANCELLED" => "#FEF2F2",
        _ => "#F1F5F9"
    };

    public string StatusBadgeFg => Status switch
    {
        "DRAFT" => "#475569",
        "POSTED" => "#15803D",
        "CANCELLED" => "#B91C1C",
        _ => "#334155"
    };

    public string StatusBadgeBorder => Status switch
    {
        "DRAFT" => "#CBD5E1",
        "POSTED" => "#BBF7D0",
        "CANCELLED" => "#FECACA",
        _ => "#E2E8F0"
    };
}
