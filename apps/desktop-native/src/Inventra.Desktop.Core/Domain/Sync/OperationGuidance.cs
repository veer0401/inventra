namespace Inventra.Desktop.Core.Domain.Sync;

/// <summary>
/// What a person can do about a failed operation, in plain words, keyed by the error code the server (or the
/// desktop) recorded. The advice only describes options the Sync Center really offers: Retry and Dismiss.
/// </summary>
public static class OperationGuidance
{
    public static string For(string? errorCode) => errorCode switch
    {
        "INSUFFICIENT_STOCK" or "INSUFFICIENT_BATCH_STOCK" =>
            "The server has less stock for this item than the sale needed. Correct the stock on the server, then Retry.",
        "PRICE_SNAPSHOT_INVALID" =>
            "The price on the server changed after this sale was made. Update the batch price on the server to match, then Retry, or Dismiss it once the sale is settled.",
        "PAYMENT_AMOUNT_MISMATCH" =>
            "The server's GST or rounding differs from the receipt by more than 5 paise, so it will not accept the sale as is. Record the sale another way, then Dismiss this.",
        "BATCH_EXPIRED" or "BATCH_MISMATCH" =>
            "The batch sold is expired or no longer matches this product on the server. Check the batch on the server, then Retry or Dismiss.",
        "RESOURCE_NOT_FOUND" =>
            "The server does not have a product, batch or supplier this refers to. Let the catalog and suppliers sync, then Retry.",
        "DUPLICATE_SUPPLIER_CODE" =>
            "A supplier with this code already exists on the server. Dismiss this one; the existing supplier appears after the next sync.",
        "SUPPLIER_INACTIVE" =>
            "The supplier is inactive on the server. Reactivate it there then Retry, or Dismiss to cancel the order.",
        "OVER_RECEIPT_NOT_PERMITTED" or "INVALID_PO_STATUS_FOR_RECEIPT" =>
            "The server will not accept this receipt against its purchase order (already fully received or not open). Check the order on the server, then Retry or Dismiss.",
        "PO_LINE_MAPPING_FAILED" =>
            "The order reached the server but its lines did not match this terminal's. Retry; if it keeps failing, check the order on the server.",
        "UNSUPPORTED_EVENT_TYPE" =>
            "The server has no route for this kind of change yet, so it cannot be sent. Redo the change while online, then Dismiss this.",
        "MALFORMED_PAYLOAD" or "LOCAL_SALE_MISSING" or "INVALID_PAYLOAD" =>
            "The saved data for this operation is unusable, so sending it again cannot work. Dismiss it and redo the work if needed.",
        "RETRY_LIMIT_EXCEEDED" =>
            "The server kept failing temporarily. Retry when the server is healthy.",
        "DEVICE_REVOKED" or "DEVICE_NOT_FOUND" =>
            "This workstation is no longer authorised. Ask an administrator to re-authorise it.",
        _ => "Retry sends it again. Dismiss closes it without sending it, and records your reason."
    };
}
