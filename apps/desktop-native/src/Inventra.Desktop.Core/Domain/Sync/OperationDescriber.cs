using System;
using System.Globalization;
using System.Text.Json;

namespace Inventra.Desktop.Core.Domain.Sync;

public sealed record OperationDescription(string Title, string Detail);

/// <summary>
/// Turns a queued operation into words a cashier or manager can act on ("Sale INV-12 for Asha, 110.00") instead of
/// an event code and a JSON blob. Never throws: an unreadable payload simply yields a generic description.
/// </summary>
public static class OperationDescriber
{
    public static OperationDescription Describe(string eventType, string payloadJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            var root = doc.RootElement;
            return eventType switch
            {
                "SALE_CREATED" => DescribeSale(root),
                "SUPPLIER_CREATED" => new("New supplier", Join(Str(root, "legalName"), Wrap(Str(root, "supplierCode")))),
                "PURCHASE_ORDER_CREATED" => new("Purchase order", Join(AfterPrefix(Str(root, "notes"), "Offline PO "), Count(root, "lines", "line"))),
                "GOODS_RECEIPT_POSTED" => new("Goods receipt", Join(Str(root, "receiptNumber"), Count(root, "lines", "line"))),
                "PRODUCT_CREATED" or "PRODUCT_UPDATE" => new("Product change", Str(root, "name") ?? Str(root, "productName") ?? string.Empty),
                "GLOBAL_MEDICINE_IMPORTED" => new("Medicine import", Str(root, "name") ?? string.Empty),
                "STOCK_INWARD" or "STOCK_ADJUSTMENT" => new("Stock change", Str(root, "productName") ?? Str(root, "name") ?? string.Empty),
                "CUSTOMER_CREATE" => new("New customer", Str(root, "name") ?? Str(root, "fullName") ?? string.Empty),
                _ => new(eventType, string.Empty)
            };
        }
        catch (JsonException)
        {
            return new(eventType, string.Empty);
        }
    }

    private static OperationDescription DescribeSale(JsonElement root)
    {
        var invoice = AfterPrefix(Str(root, "notes"), "Offline invoice ");
        // "Offline invoice STR-1; local payment method 'x'": keep only the invoice number.
        var semicolon = invoice?.IndexOf(';') ?? -1;
        if (invoice != null && semicolon >= 0) invoice = invoice[..semicolon];

        string? amount = null;
        if (root.TryGetProperty("payments", out var payments) && payments.ValueKind == JsonValueKind.Array)
        {
            decimal total = 0;
            foreach (var p in payments.EnumerateArray())
                if (p.TryGetProperty("amount", out var a) && a.TryGetDecimal(out var d)) total += d;
            amount = "₹" + total.ToString("F2", CultureInfo.InvariantCulture);
        }

        return new("Sale", Join(invoice, Str(root, "customerName"), amount, Count(root, "lines", "item")));
    }

    private static string? Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(v.GetString())
            ? v.GetString()
            : null;

    private static string? AfterPrefix(string? text, string prefix) =>
        text != null && text.StartsWith(prefix, StringComparison.Ordinal) ? text[prefix.Length..].Trim() : text;

    private static string? Wrap(string? text) => text == null ? null : $"({text})";

    private static string? Count(JsonElement e, string array, string noun)
    {
        if (!e.TryGetProperty(array, out var a) || a.ValueKind != JsonValueKind.Array) return null;
        var n = a.GetArrayLength();
        return $"{n} {noun}{(n == 1 ? string.Empty : "s")}";
    }

    private static string Join(params string?[] parts) =>
        string.Join(" · ", Array.FindAll(parts, p => !string.IsNullOrWhiteSpace(p)));
}
