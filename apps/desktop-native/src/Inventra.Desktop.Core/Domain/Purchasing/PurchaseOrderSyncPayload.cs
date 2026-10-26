using System;
using System.Collections.Generic;
using System.Text.Json;

namespace Inventra.Desktop.Core.Domain.Purchasing;

/// <summary>
/// Builds the payload of a <c>PURCHASE_ORDER_CREATED</c> sync operation, following the backend's
/// CreatePurchaseOrderRequest / CreatePurchaseOrderLineRequest. The server creates the order, numbers it and
/// confirms it, so the local order number is kept in the notes. Quantities are in the line's purchase unit
/// (strips) with the pack size as <c>conversionFactor</c>, exactly as goods receipts are.
/// </summary>
public static class PurchaseOrderSyncPayload
{
    public const string EventType = "PURCHASE_ORDER_CREATED";
    public const string IdempotencyKeyPrefix = "PO-";

    public static string IdempotencyKey(string purchaseOrderId) => IdempotencyKeyPrefix + purchaseOrderId;

    public static string? PurchaseOrderIdFromKey(string idempotencyKey) =>
        idempotencyKey.StartsWith(IdempotencyKeyPrefix, StringComparison.Ordinal)
            ? idempotencyKey[IdempotencyKeyPrefix.Length..]
            : null;

    public static string Build(PurchaseOrderItem po)
    {
        var notes = $"Offline PO {po.OrderNumber}";
        if (!string.IsNullOrWhiteSpace(po.Notes)) notes += $"; {po.Notes.Trim()}";
        if (notes.Length > 1000) notes = notes[..1000];

        var lines = new List<object>();
        foreach (var l in po.Lines)
        {
            // The screen stores a discount AMOUNT per line; the server takes a percentage of the gross line value.
            var gross = l.OrderedQuantity * l.UnitPrice;
            var discountPercentage = gross > 0
                ? Math.Round(l.DiscountAmount / gross * 100m, 4, MidpointRounding.AwayFromZero)
                : 0m;

            lines.Add(new Dictionary<string, object?>
            {
                ["productId"] = l.ProductId,
                ["purchaseUnit"] = string.IsNullOrWhiteSpace(l.PurchaseUnit) ? "STRIP" : l.PurchaseUnit,
                ["conversionFactor"] = Math.Max(1, l.ConversionFactor),
                ["orderedQuantity"] = l.OrderedQuantity,
                ["unitCost"] = l.UnitPrice,
                ["discountPercentage"] = discountPercentage,
                ["taxRate"] = l.TaxRate
            });
        }

        var payload = new Dictionary<string, object?>
        {
            ["storeId"] = po.StoreId,
            ["supplierId"] = po.SupplierId,
            ["orderDate"] = po.OrderDate,
            ["expectedDeliveryDate"] = string.IsNullOrWhiteSpace(po.ExpectedDeliveryDate) ? null : po.ExpectedDeliveryDate,
            // Discounts travel per line; the document total on the screen is only their sum.
            ["discountAmount"] = 0m,
            ["notes"] = notes,
            ["lines"] = lines
        };

        return JsonSerializer.Serialize(payload);
    }
}
