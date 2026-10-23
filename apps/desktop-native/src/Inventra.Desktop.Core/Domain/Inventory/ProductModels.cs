using System;

namespace Inventra.Desktop.Core.Domain.Inventory;

public sealed class ProductItem
{
    public string Id { get; set; } = string.Empty;
    public string BusinessId { get; set; } = string.Empty;
    public string? StoreId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? GenericName { get; set; }
    public string? DosageForm { get; set; }
    public string? Strength { get; set; }
    public string BaseUnit { get; set; } = "UNIT";
    public string SellingUnit { get; set; } = "STRIP";
    public double UnitsPerSellingUnit { get; set; } = 1.0;
    public decimal TaxRate { get; set; }
    public bool IsTaxInclusive { get; set; }
    public bool PrescriptionRequired { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal Mrp { get; set; }
    public double CurrentStock { get; set; }
    public long UpdatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    // Derived operational properties for Grid and POS
    public string FormattedPrice => $"₹{SellingPrice:F2}";
    public string FormattedMrp => $"₹{Mrp:F2}";
    public string FormattedStock => $"{CurrentStock:F0}";
    public string FormattedTaxRate => $"{TaxRate:F1}%";

    public string PrescriptionBadge => PrescriptionRequired ? "Rx" : "OTC";
    public string PrescriptionBadgeBg => PrescriptionRequired ? "#FEF2F2" : "#F1F5F9";
    public string PrescriptionBadgeFg => PrescriptionRequired ? "#B91C1C" : "#64748B";
    public string PrescriptionBadgeBorder => PrescriptionRequired ? "#FECACA" : "#E2E8F0";

    public string StockStatus => CurrentStock switch
    {
        <= 0 => "OUT OF STOCK",
        < 15 => "LOW STOCK",
        _ => "IN STOCK"
    };

    public string StockStatusClass => CurrentStock switch
    {
        <= 0 => "Danger",
        < 15 => "Warning",
        _ => "Success"
    };

    public string StockStatusBg => CurrentStock switch
    {
        <= 0 => "#FEF2F2",
        < 15 => "#FFFBEB",
        _ => "#F0FDF4"
    };

    public string StockStatusFg => CurrentStock switch
    {
        <= 0 => "#B91C1C",
        < 15 => "#B45309",
        _ => "#15803D"
    };

    public string StockStatusBorder => CurrentStock switch
    {
        <= 0 => "#FECACA",
        < 15 => "#FDE68A",
        _ => "#BBF7D0"
    };
}

public sealed class BatchItem
{
    public string Id { get; set; } = string.Empty;
    public string BusinessId { get; set; } = string.Empty;
    public string StoreId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public string ExpiryDate { get; set; } = string.Empty; // Format YYYY-MM
    public double AvailableQuantity { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal Mrp { get; set; }
    public decimal PurchasePrice { get; set; }
    public string? ManufacturingDate { get; set; }

    public bool IsExpired
    {
        get
        {
            if (string.IsNullOrWhiteSpace(ExpiryDate)) return false;
            if (DateTime.TryParse(ExpiryDate + "-01", out var date))
            {
                // Expired if month is before current month
                var endOfMonth = date.AddMonths(1).AddDays(-1);
                return endOfMonth < DateTime.UtcNow.Date;
            }
            return false;
        }
    }

    public bool IsNearExpiry
    {
        get
        {
            if (string.IsNullOrWhiteSpace(ExpiryDate)) return false;
            if (DateTime.TryParse(ExpiryDate + "-01", out var date))
            {
                var endOfMonth = date.AddMonths(1).AddDays(-1);
                var daysUntilExpiry = (endOfMonth - DateTime.UtcNow.Date).TotalDays;
                return daysUntilExpiry is >= 0 and <= 90;
            }
            return false;
        }
    }

    public string FormattedCost => $"₹{PurchasePrice:F2}";
    public string FormattedPrice => $"₹{SellingPrice:F2}";
    public string FormattedMrp => $"₹{Mrp:F2}";
    public string FormattedQty => $"{AvailableQuantity:F0}";
    public string ExpiryStatusText => IsExpired ? "EXPIRED" : (IsNearExpiry ? "EXPIRING" : "OK");
    public string ExpiryBadgeBg => IsExpired ? "#FEF2F2" : (IsNearExpiry ? "#FFFBEB" : "#F0FDF4");
    public string ExpiryBadgeFg => IsExpired ? "#B91C1C" : (IsNearExpiry ? "#B45309" : "#15803D");
    public string ExpiryBadgeBorder => IsExpired ? "#FECACA" : (IsNearExpiry ? "#FDE68A" : "#BBF7D0");
}
