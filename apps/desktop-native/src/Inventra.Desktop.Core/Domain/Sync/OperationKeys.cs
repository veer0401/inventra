using System;

namespace Inventra.Desktop.Core.Domain.Sync;

/// <summary>
/// Queued operations carry the id of the local record they belong to inside their idempotency key
/// ("SUPPLIER-&lt;id&gt;", "GRN-&lt;id&gt;"; sales and purchase orders have their own payload classes). These helpers let
/// the Sync Center find the record an operation refers to.
/// </summary>
public static class OperationKeys
{
    public const string SupplierPrefix = "SUPPLIER-";
    public const string GoodsReceiptPrefix = "GRN-";

    public static string? SupplierId(string idempotencyKey) => After(idempotencyKey, SupplierPrefix);
    public static string? GoodsReceiptId(string idempotencyKey) => After(idempotencyKey, GoodsReceiptPrefix);

    private static string? After(string key, string prefix) =>
        key.StartsWith(prefix, StringComparison.Ordinal) ? key[prefix.Length..] : null;
}
