using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;

namespace Inventra.Desktop.Core.Domain.Sales;

/// <summary>
/// Builds the payload of a <c>SALE_CREATED</c> sync operation. It follows the backend's CreateSaleRequest
/// (sales/api/dto/CreateSaleRequest.java) field for field. The server stays authoritative: it allocates
/// batches, computes GST and totals, assigns the invoice number and rejects the sale if stock, price or
/// payment reconciliation no longer hold, so nothing here bypasses those rules.
/// </summary>
public static class SaleSyncPayload
{
    public const string EventType = "SALE_CREATED";
    public const string IdempotencyKeyPrefix = "SALE-";

    public static string IdempotencyKey(string saleId) => IdempotencyKeyPrefix + saleId;

    /// <summary>Returns the local sale id encoded in an idempotency key, or null when it is not a sale key.</summary>
    public static string? SaleIdFromKey(string idempotencyKey) =>
        idempotencyKey.StartsWith(IdempotencyKeyPrefix, StringComparison.Ordinal)
            ? idempotencyKey[IdempotencyKeyPrefix.Length..]
            : null;

    public static string Build(SaleRecord sale)
    {
        var method = MapPaymentMethod(sale.PaymentMethod, out var methodNote);
        var saleDate = DateTimeOffset.FromUnixTimeMilliseconds(sale.CreatedAt).LocalDateTime
            .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        // The server numbers invoices itself; the number printed on the offline receipt is kept in the
        // notes so the two can be reconciled.
        var notes = $"Offline invoice {sale.InvoiceNumber}";
        if (methodNote != null) notes += $"; {methodNote}";

        var lines = new List<object>();
        foreach (var item in sale.Items)
        {
            lines.Add(new Dictionary<string, object?>
            {
                ["productId"] = item.ProductId,
                ["quantity"] = Math.Round((decimal)item.Quantity, 3, MidpointRounding.AwayFromZero),
                ["batchId"] = string.IsNullOrWhiteSpace(item.BatchId) ? null : item.BatchId,
                // Lets the server verify the price the cashier saw against its authoritative batch price.
                ["unitPrice"] = item.UnitPrice
            });
        }

        var payload = new Dictionary<string, object?>
        {
            ["storeId"] = sale.StoreId,
            ["saleDate"] = saleDate,
            ["customerName"] = sale.CustomerName,
            ["customerPhone"] = sale.CustomerPhone,
            ["discountAmount"] = sale.DiscountAmount,
            ["notes"] = notes,
            ["lines"] = lines,
            ["payments"] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["paymentMethod"] = method,
                    ["amount"] = sale.TotalAmount
                }
            }
        };

        return JsonSerializer.Serialize(payload);
    }

    /// <summary>
    /// Maps the desktop's payment label to the backend PaymentMethod enum. Labels the server has no
    /// equivalent for (for example credit) are sent as OTHER and the original label is kept in the notes.
    /// </summary>
    public static string MapPaymentMethod(string? local, out string? note)
    {
        note = null;
        switch ((local ?? string.Empty).Trim().ToUpperInvariant())
        {
            case "CASH": return "CASH";
            case "CARD": return "CARD";
            case "UPI": return "UPI";
            case "BANK_TRANSFER": return "BANK_TRANSFER";
            case "WALLET": return "WALLET";
            default:
                note = $"local payment method '{local}'";
                return "OTHER";
        }
    }
}
