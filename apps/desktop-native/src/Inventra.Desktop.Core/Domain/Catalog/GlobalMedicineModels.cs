using System;

namespace Inventra.Desktop.Core.Domain.Catalog;

public sealed class GlobalMedicineItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? GenericName { get; set; }
    public string? BrandName { get; set; }
    public string? Manufacturer { get; set; }
    public string DosageForm { get; set; } = "TABLET";
    public string? Strength { get; set; }
    public string BaseUnit { get; set; } = "UNIT";
    public string SellingUnit { get; set; } = "STRIP";
    public int UnitsPerSellingUnit { get; set; } = 1;
    public string? HsnCode { get; set; }
    public decimal TaxRate { get; set; } = 12.0m;
    public bool PrescriptionRequired { get; set; }
    public string? Barcode { get; set; }
    public string? Description { get; set; }
    public string? CategoryName { get; set; }
    public long CachedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    // Presentation Helpers
    public string FormAndStrength => string.IsNullOrWhiteSpace(Strength) ? DosageForm : $"{DosageForm} ({Strength})";
    public string PackDisplay => UnitsPerSellingUnit > 1 ? $"{SellingUnit} ({UnitsPerSellingUnit} {BaseUnit}s)" : SellingUnit;
    public string TaxRateDisplay => $"{TaxRate:F1}%";
    public string PrescriptionBadge => PrescriptionRequired ? "Rx Required" : "OTC";
    public string PrescriptionBadgeBg => PrescriptionRequired ? "#FEF2F2" : "#F1F5F9";
    public string PrescriptionBadgeFg => PrescriptionRequired ? "#B91C1C" : "#64748B";
    public string PrescriptionBadgeBorder => PrescriptionRequired ? "#FECACA" : "#E2E8F0";
}
