using System;
using System.Linq;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Core.Domain.Purchasing;
using Inventra.Desktop.Core.Domain.Sales;
using Inventra.Desktop.Core.Domain.Sync;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Logging;

namespace Inventra.Desktop.Infrastructure.Sync;

public sealed record ResolutionResult(bool Success, string Message);

public interface IOperationResolutionService
{
    /// <summary>Puts a FAILED operation (and the record it belongs to) back in the queue to be sent again.</summary>
    Task<ResolutionResult> RetryAsync(string businessId, string operationId);

    /// <summary>Retries every FAILED operation that can be retried. Returns how many were queued again.</summary>
    Task<int> RetryAllAsync(string businessId);

    /// <summary>
    /// Takes an operation out of the queue on a person's decision. It is never sent and the reason is kept.
    /// The record it belongs to is closed off so it no longer looks like it is waiting for the server.
    /// </summary>
    Task<ResolutionResult> DismissAsync(string businessId, string operationId, string reason, string userId);

    /// <summary>False for operations that can never succeed by sending them again.</summary>
    bool CanRetry(OfflineOperation op);
}

public sealed class OperationResolutionService : IOperationResolutionService
{
    public const int MinReasonLength = 5;

    private readonly IOfflineQueueRepository _queue;
    private readonly IPurchasingRepository _purchasing;
    private readonly ISalesRepository _sales;
    private readonly IAppLogger _logger;

    public OperationResolutionService(
        IOfflineQueueRepository queue,
        IPurchasingRepository purchasing,
        ISalesRepository sales,
        IAppLogger? logger = null)
    {
        _queue = queue;
        _purchasing = purchasing;
        _sales = sales;
        _logger = logger ?? AppLogger.Instance;
    }

    public bool CanRetry(OfflineOperation op) =>
        op.RawStatus == "FAILED" &&
        // Sending these again fails the same way: there is no server route, or the queued data itself is unusable.
        op.ErrorCode is not ("UNSUPPORTED_EVENT_TYPE" or "MALFORMED_PAYLOAD" or "LOCAL_SALE_MISSING");

    public async Task<ResolutionResult> RetryAsync(string businessId, string operationId)
    {
        var op = await _queue.GetOperationAsync(operationId);
        if (op == null || op.BusinessId != businessId)
            return new(false, "That operation no longer exists.");
        if (op.RawStatus != "FAILED")
            return new(false, "Only failed operations can be retried.");
        if (!CanRetry(op))
            return new(false, op.ErrorCode == "UNSUPPORTED_EVENT_TYPE"
                ? "The server has no route for this kind of change yet, so sending it again would fail the same way."
                : "The queued data for this operation is unusable, so it cannot be sent again. Dismiss it instead.");

        if (!await _queue.ResetForRetryAsync(operationId))
            return new(false, "The operation changed while you were looking at it. Refresh and try again.");

        await SetEntityStateAsync(businessId, op, pending: true, error: null);
        _logger.Info(LogCategory.SYNC, $"Retry requested for {op.EventType} {op.OperationId}.");
        return new(true, "Queued again. It will be sent on the next sync.");
    }

    public async Task<int> RetryAllAsync(string businessId)
    {
        var retried = 0;
        foreach (var op in (await _queue.GetOperationsNeedingAttentionAsync(businessId)).Where(CanRetry))
        {
            if ((await RetryAsync(businessId, op.OperationId)).Success) retried++;
        }
        return retried;
    }

    public async Task<ResolutionResult> DismissAsync(string businessId, string operationId, string reason, string userId)
    {
        reason = (reason ?? string.Empty).Trim();
        if (reason.Length < MinReasonLength)
            return new(false, $"Enter a reason of at least {MinReasonLength} characters so the decision can be reviewed later.");

        var op = await _queue.GetOperationAsync(operationId);
        if (op == null || op.BusinessId != businessId)
            return new(false, "That operation no longer exists.");
        if (op.RawStatus is not ("FAILED" or "PENDING"))
            return new(false, "Only waiting or failed operations can be dismissed.");

        if (!await _queue.DismissAsync(operationId, reason))
            return new(false, "The operation changed while you were looking at it. Refresh and try again.");

        await SetEntityStateAsync(businessId, op, pending: false, error: reason);

        _logger.Warn(LogCategory.SYNC,
            $"SECURITY EVENT: [{SecurityAuditEvents.SyncOperationDismissed}] {op.EventType} {op.OperationId} dismissed by user {userId}. Reason: {reason}");
        return new(true, "Dismissed. It will not be sent to the server.");
    }

    /// <summary>
    /// Retry: the record goes back to PENDING. Dismiss: it is closed off (DISMISSED), and a supplier or order that
    /// never reached the server is removed or cancelled so nothing keeps waiting for a server that will never see it.
    /// </summary>
    private async Task SetEntityStateAsync(string businessId, OfflineOperation op, bool pending, string? error)
    {
        switch (op.EventType)
        {
            case "SUPPLIER_CREATED":
                var supplierId = OperationKeys.SupplierId(op.IdempotencyKey);
                if (supplierId == null) break;
                if (pending)
                    await _purchasing.MarkSupplierSyncStateAsync(businessId, supplierId, SupplierSyncState.Pending, null);
                else if (!await _purchasing.DeleteFailedSupplierAsync(businessId, supplierId))
                    await _purchasing.MarkSupplierSyncStateAsync(businessId, supplierId, SupplierSyncState.Failed,
                        $"Dismissed: {error}"); // still referenced by an order or receipt: keep it, but visibly closed
                break;

            case "SALE_CREATED":
                var saleId = SaleSyncPayload.SaleIdFromKey(op.IdempotencyKey);
                if (saleId != null)
                    await _sales.MarkSaleSyncResultAsync(saleId, pending ? "PENDING" : "DISMISSED", null, pending ? null : error);
                break;

            case "PURCHASE_ORDER_CREATED":
                var purchaseId = PurchaseOrderSyncPayload.PurchaseOrderIdFromKey(op.IdempotencyKey);
                if (purchaseId == null) break;
                if (pending)
                {
                    await _purchasing.MarkPurchaseSyncStateAsync(purchaseId, "PENDING");
                }
                else
                {
                    await _purchasing.UpdatePurchaseStatusAsync(purchaseId, "CANCELLED");
                    await _purchasing.MarkPurchaseSyncStateAsync(purchaseId, "DISMISSED");
                }
                break;

            case "GOODS_RECEIPT_POSTED":
                var receiptId = OperationKeys.GoodsReceiptId(op.IdempotencyKey);
                if (receiptId != null)
                    await _purchasing.MarkGoodsReceiptSyncStateAsync(receiptId, pending ? "PENDING" : "DISMISSED");
                break;
        }
    }
}
