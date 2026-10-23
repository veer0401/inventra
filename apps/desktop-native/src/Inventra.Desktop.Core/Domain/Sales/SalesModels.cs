using System;
using System.Collections.Generic;

namespace Inventra.Desktop.Core.Domain.Sales;

public enum PaymentMethod
{
    Cash,
    Upi,
    Card,
    Credit
}

public sealed class SaleItemRecord
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SaleId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public double Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public string FormattedPrice => $"₹{UnitPrice:F2}";
    public string FormattedTaxable => $"₹{TaxableAmount:F2}";
    public string FormattedTax => $"₹{TaxAmount:F2}";
    public string FormattedTotal => $"₹{TotalAmount:F2}";
}

public sealed class SaleRecord
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string BusinessId { get; set; } = string.Empty;
    public string StoreId { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentMethod { get; set; } = "CASH";
    public string PaymentStatus { get; set; } = "COMPLETED";
    public string SyncStatus { get; set; } = "PENDING";
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    public List<SaleItemRecord> Items { get; set; } = new();

    public string FormattedTotal => $"₹{TotalAmount:F2}";
    public string FormattedSubtotal => $"₹{Subtotal:F2}";
    public string FormattedTax => $"₹{TaxAmount:F2}";
    public string FormattedDate => DateTimeOffset.FromUnixTimeMilliseconds(CreatedAt).LocalDateTime.ToString("dd-MMM-yyyy hh:mm tt");
    public int ItemCount => Items.Count;
}
