using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Core.Domain.Purchasing;
using Inventra.Desktop.Core.Domain.Sales;
using Inventra.Desktop.Core.Domain.Sync;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Logging;

namespace Inventra.Desktop.Infrastructure.Sync;

public interface ISyncEngineService
{
    bool IsSyncing { get; }
    Task<SyncStatus> GetStatusAsync(string businessId);
    Task<SyncStatus> RunSyncCycleAsync(string businessId, string deviceId);
}

/// <summary>
/// Pushes the offline outbox to <c>POST /api/v1/sync/upload</c> and pulls supplier changes from
/// <c>GET /api/v1/sync/download</c>. Logs carry operation ids, event types and error codes only, never
/// payloads, so customer and pricing data stay out of the log files.
/// </summary>
public sealed class SyncEngineService : ISyncEngineService
{
    /// <summary>After this many retryable server failures an operation is failed so it surfaces for attention.</summary>
    public const int MaxRetries = 10;

    private const int BatchSize = 50; // the server rejects uploads with more than 50 operations
    private const int DownloadPageSize = 100;
    private const int MaxDownloadPagesPerCycle = 50;

    // Mirrors the backend's SyncEventType enum (sync/domain/model/SyncEventType.java).
    private static readonly HashSet<string> ServerSupportedEvents = new(StringComparer.Ordinal)
    {
        "SALE_CREATED", "SALE_RETURN_CREATED", "TRANSFER_REQUEST_CREATED",
        "SUPPLIER_CREATED", "PURCHASE_ORDER_CREATED", "GOODS_RECEIPT_POSTED"
    };

    private const string GoodsReceiptPostedEvent = "GOODS_RECEIPT_POSTED";
    private const string SupplierCreatedEvent = "SUPPLIER_CREATED";
    private const string LegacySaleEvent = "SALE_COMPLETED";
    private const string SupplierKeyPrefix = "SUPPLIER-";

    private enum PushOutcome { Done, Transient, NotAuthorized }

    private readonly IOfflineQueueRepository _queueRepo;
    private readonly IInventraApiClient _apiClient;
    private readonly IPurchasingRepository _purchasingRepo;
    private readonly ISalesRepository _salesRepo;
    private readonly IAppLogger _logger;
    private int _running;
    private string? _lastSyncAt;

    public SyncEngineService(
        IOfflineQueueRepository queueRepo,
        IInventraApiClient apiClient,
        IPurchasingRepository purchasingRepo,
        ISalesRepository salesRepo,
        IAppLogger? logger = null)
    {
        _queueRepo = queueRepo;
        _apiClient = apiClient;
        _purchasingRepo = purchasingRepo;
        _salesRepo = salesRepo;
        _logger = logger ?? AppLogger.Instance;
    }

    public bool IsSyncing => Volatile.Read(ref _running) == 1;

    public async Task<SyncStatus> GetStatusAsync(string businessId)
    {
        var pending = await _queueRepo.GetPendingCountAsync(businessId);
        var conflicts = await _queueRepo.GetConflictCountAsync(businessId);
        var failed = await _queueRepo.GetFailedCountAsync(businessId);
        return new SyncStatus(pending, conflicts, _lastSyncAt, IsSyncing, failed);
    }

    public async Task<SyncStatus> RunSyncCycleAsync(string businessId, string deviceId)
    {
        // Several triggers (startup, sale, timer, menu) can fire at once; only one cycle may run.
        if (Interlocked.CompareExchange(ref _running, 1, 0) != 0)
            return await GetStatusAsync(businessId);

        try
        {
            await RunCycleAsync(businessId, deviceId);
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.SYNC, "Sync cycle failed unexpectedly; queued operations were left unchanged.", ex);
        }
        finally
        {
            Volatile.Write(ref _running, 0);
        }

        // Read after the running flag is released so the returned status never claims a finished cycle is running.
        return await GetStatusAsync(businessId);
    }

    private async Task RunCycleAsync(string businessId, string deviceId)
    {
        if (!Guid.TryParse(deviceId, out _))
        {
            _logger.Warn(LogCategory.SYNC, "Sync skipped: this workstation has no server-issued device id (it is not paired).");
            return;
        }

        if (!await _apiClient.PingAsync()) return;

        await MigrateLegacySalesAsync(businessId);

        var push = await PushAsync(businessId, deviceId);
        if (push != PushOutcome.NotAuthorized)
            await PullAsync(businessId, deviceId);

        _lastSyncAt = DateTime.Now.ToString("hh:mm tt");
    }

    // ------------------------------------------------------------------ push

    private async Task<PushOutcome> PushAsync(string businessId, string deviceId)
    {
        var queued = await _queueRepo.GetPendingOperationsAsync(businessId, BatchSize);
        var batch = new List<(OfflineOperation Op, SyncOperationApiDto Dto)>();

        foreach (var op in queued)
        {
            if (!ServerSupportedEvents.Contains(op.EventType))
            {
                // The server types eventType as a strict enum: one unknown value would fail the whole upload
                // with a 400. Fail it visibly (it stays in the table and can be re-targeted later) instead.
                await FailPermanentlyAsync(businessId, op, "UNSUPPORTED_EVENT_TYPE",
                    $"The server does not accept '{op.EventType}' events yet, so this operation was not uploaded.");
                continue;
            }

            var dto = BuildOperationDto(op);
            if (dto == null)
            {
                await FailPermanentlyAsync(businessId, op, "MALFORMED_PAYLOAD",
                    "The queued payload is not valid JSON and cannot be uploaded.");
                continue;
            }

            batch.Add((op, dto));
        }

        if (batch.Count == 0) return PushOutcome.Done;

        _logger.Info(LogCategory.SYNC, $"Uploading {batch.Count} operation(s): {Summarize(batch.Select(b => b.Op))}");
        var result = await _apiClient.UploadSyncBatchAsync(deviceId, batch.Select(b => b.Dto).ToList());

        if (result.IsSuccess)
        {
            await ApplyResultsAsync(businessId, batch.Select(b => b.Op).ToList(), result.Data!);
            return PushOutcome.Done;
        }

        if (result.IsTransient)
        {
            _logger.Warn(LogCategory.SYNC, $"Upload deferred, operations stay pending: {result.Error}");
            return PushOutcome.Transient;
        }

        if (IsNotAuthorized(result))
        {
            LogNotAuthorized(result);
            return PushOutcome.NotAuthorized;
        }

        // The server refused the whole request (for example a validation error). It does not say which
        // operation caused it, so send them one at a time: the bad one is failed, the rest proceed.
        _logger.Warn(LogCategory.SYNC,
            $"Batch rejected (HTTP {result.StatusCode} {result.ErrorCode}); isolating {batch.Count} operation(s) to find the faulty one.");

        foreach (var (op, dto) in batch)
        {
            var single = await _apiClient.UploadSyncBatchAsync(deviceId, new List<SyncOperationApiDto> { dto });
            if (single.IsSuccess)
            {
                await ApplyResultsAsync(businessId, new List<OfflineOperation> { op }, single.Data!);
            }
            else if (single.IsTransient)
            {
                _logger.Warn(LogCategory.SYNC, $"Isolation paused, remaining operations stay pending: {single.Error}");
                return PushOutcome.Transient;
            }
            else if (IsNotAuthorized(single))
            {
                LogNotAuthorized(single);
                return PushOutcome.NotAuthorized;
            }
            else
            {
                await FailPermanentlyAsync(businessId, op, single.ErrorCode ?? $"HTTP_{single.StatusCode}",
                    single.Error ?? "The server rejected this operation.");
            }
        }

        return PushOutcome.Done;
    }

    private async Task ApplyResultsAsync(string businessId, IReadOnlyList<OfflineOperation> sent, SyncUploadApiResponse response)
    {
        var byId = sent.ToDictionary(o => o.OperationId, StringComparer.OrdinalIgnoreCase);
        var answered = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var res in response.Results ?? new List<SyncOperationResultApiDto>())
        {
            if (!byId.TryGetValue(res.EventId, out var op))
            {
                _logger.Warn(LogCategory.SYNC, $"Server answered for unknown operation {res.EventId}; ignored.");
                continue;
            }

            answered.Add(op.OperationId);

            switch ((res.Status ?? string.Empty).ToUpperInvariant())
            {
                case "APPLIED":
                case "DUPLICATE":
                    await OnConfirmedAsync(businessId, op, res.ServerEntityId);
                    break;

                case "REJECTED" when res.Retryable:
                    await RetryOrFailAsync(businessId, op, res.ErrorCode ?? "RETRYABLE_ERROR",
                        res.Message ?? "The server could not process this operation yet.");
                    break;

                case "REJECTED":
                    await FailPermanentlyAsync(businessId, op, res.ErrorCode ?? "REJECTED",
                        res.Message ?? "The server rejected this operation.");
                    break;

                case "CONFLICT":
                    await FailPermanentlyAsync(businessId, op, res.ErrorCode ?? "CONFLICT",
                        res.Message ?? "The server reported a conflict for this operation.");
                    break;

                default:
                    // Unknown status: do not assume success. The operation stays pending.
                    _logger.Warn(LogCategory.SYNC, $"Operation {op.OperationId} got unrecognised status '{res.Status}'; left pending.");
                    break;
            }
        }

        foreach (var op in sent.Where(o => !answered.Contains(o.OperationId)))
        {
            _logger.Warn(LogCategory.SYNC, $"Server returned no result for {op.EventType} {op.OperationId}; left pending.");
        }
    }

    private async Task OnConfirmedAsync(string businessId, OfflineOperation op, string? serverEntityId)
    {
        // Local entity state is reconciled BEFORE the operation is marked synced. If the app stops between
        // the two steps the operation is simply re-sent, the server answers DUPLICATE with the same id, and
        // the (idempotent) reconcile runs again, so nothing is left half-synchronised.
        switch (op.EventType)
        {
            case SupplierCreatedEvent:
                if (string.IsNullOrEmpty(serverEntityId))
                {
                    await FailPermanentlyAsync(businessId, op, "SERVER_RESPONSE_INVALID",
                        "The server confirmed the supplier but returned no id.");
                    return;
                }
                var supplierId = LocalSupplierId(op);
                if (supplierId != null)
                    await _purchasingRepo.ReconcileSupplierCreatedAsync(businessId, supplierId, serverEntityId);
                break;

            case "SALE_CREATED":
                var saleId = SaleSyncPayload.SaleIdFromKey(op.IdempotencyKey);
                if (saleId != null)
                    await _salesRepo.MarkSaleSyncResultAsync(saleId, "SYNCED", serverEntityId, null);
                break;

            case GoodsReceiptPostedEvent:
                var receiptId = GoodsReceiptIdFromKey(op.IdempotencyKey);
                if (receiptId != null)
                    await _purchasingRepo.MarkGoodsReceiptSyncStateAsync(receiptId, "SYNCED");
                break;
        }

        await _queueRepo.MarkSyncedAsync(op.OperationId, serverEntityId);
        _logger.Info(LogCategory.SYNC, $"Confirmed {op.EventType} {op.OperationId} (server id {serverEntityId ?? "n/a"}).");
    }

    private async Task RetryOrFailAsync(string businessId, OfflineOperation op, string code, string message)
    {
        if (op.RetryCount + 1 >= MaxRetries)
        {
            await FailPermanentlyAsync(businessId, op, "RETRY_LIMIT_EXCEEDED", $"{code}: {message}");
            return;
        }

        await _queueRepo.MarkRetryAsync(op.OperationId, code, message);
        _logger.Warn(LogCategory.SYNC, $"{op.EventType} {op.OperationId} will be retried (attempt {op.RetryCount + 1}/{MaxRetries}): {code}");
    }

    private async Task FailPermanentlyAsync(string businessId, OfflineOperation op, string code, string message)
    {
        await _queueRepo.MarkFailedAsync(op.OperationId, code, message);

        switch (op.EventType)
        {
            case SupplierCreatedEvent:
                var supplierId = LocalSupplierId(op);
                if (supplierId != null)
                    await _purchasingRepo.MarkSupplierSyncStateAsync(businessId, supplierId, SupplierSyncState.Failed, message);
                break;

            case "SALE_CREATED":
                var saleId = SaleSyncPayload.SaleIdFromKey(op.IdempotencyKey);
                if (saleId != null)
                    await _salesRepo.MarkSaleSyncResultAsync(saleId, "FAILED", null, $"{code}: {message}");
                break;

            case GoodsReceiptPostedEvent:
                var receiptId = GoodsReceiptIdFromKey(op.IdempotencyKey);
                if (receiptId != null)
                    await _purchasingRepo.MarkGoodsReceiptSyncStateAsync(receiptId, "FAILED");
                break;
        }

        _logger.Warn(LogCategory.SYNC, $"Failed {op.EventType} {op.OperationId}: [{code}] {message}");
    }

    // ------------------------------------------------------- legacy migration

    /// <summary>
    /// Earlier builds queued completed sales as a summary event named SALE_COMPLETED with no lines or
    /// payments, which the server cannot process. The full sale is still in the local database, so such
    /// operations are rebuilt into proper SALE_CREATED operations (keeping their operation id).
    /// </summary>
    private async Task MigrateLegacySalesAsync(string businessId)
    {
        var legacy = await _queueRepo.GetRetargetableOperationsAsync(businessId, LegacySaleEvent);
        foreach (var op in legacy)
        {
            try
            {
                var saleId = TryReadSaleId(op.PayloadJson);
                var sale = saleId == null ? null : await _salesRepo.GetSaleByIdAsync(saleId);
                if (sale == null)
                {
                    await _queueRepo.MarkFailedAsync(op.OperationId, "LOCAL_SALE_MISSING",
                        "The sale this operation refers to is not in the local database, so it cannot be rebuilt.");
                    continue;
                }

                sale.Items = (await _salesRepo.GetSaleItemsAsync(sale.Id)).ToList();
                await _queueRepo.RewriteOperationAsync(op.OperationId, SaleSyncPayload.EventType,
                    SaleSyncPayload.Build(sale), SaleSyncPayload.IdempotencyKey(sale.Id));
                _logger.Info(LogCategory.SYNC, $"Rebuilt legacy sale operation {op.OperationId} as SALE_CREATED.");
            }
            catch (Exception ex)
            {
                _logger.Error(LogCategory.SYNC, $"Could not rebuild legacy sale operation {op.OperationId}.", ex);
            }
        }
    }

    // -------------------------------------------------------------- download

    /// <summary>
    /// Downloads supplier changes from the server change feed. The checkpoint advances in the same database
    /// transaction as the data it covers, so an interrupted download resumes where it stopped and replaying
    /// a page is harmless. Other entity types are skipped: they are loaded through their own list endpoints.
    /// </summary>
    private async Task PullAsync(string businessId, string deviceId)
    {
        var cursorKey = $"download_cursor:{businessId}:{deviceId}";
        var cursor = await _purchasingRepo.GetDownloadCursorAsync(cursorKey);

        for (var page = 0; page < MaxDownloadPagesPerCycle; page++)
        {
            var result = await _apiClient.DownloadSyncChangesAsync(cursor, DownloadPageSize);
            if (!result.IsSuccess)
            {
                _logger.Warn(LogCategory.SYNC, $"Download stopped at cursor {cursor}: {result.Error}");
                return;
            }

            var data = result.Data!;
            if (data.NextCursor < cursor)
            {
                _logger.Warn(LogCategory.SYNC, $"Download ignored: server cursor {data.NextCursor} is behind local cursor {cursor}.");
                return;
            }

            var suppliers = new List<SupplierItem>();
            foreach (var change in data.Changes ?? new List<SyncChangeApiDto>())
            {
                if (!string.Equals(change.EntityType, "SUPPLIER", StringComparison.Ordinal) ||
                    !string.Equals(change.Operation, "UPSERT", StringComparison.Ordinal))
                    continue;

                try
                {
                    var dto = change.Payload.Deserialize<SupplierApiDto>();
                    if (dto != null && !string.IsNullOrEmpty(dto.Id))
                        suppliers.Add(ToSupplier(dto, businessId));
                }
                catch (JsonException)
                {
                    // A malformed entry must not stall the checkpoint forever; it is skipped and reported.
                    _logger.Warn(LogCategory.SYNC, $"Skipped malformed supplier change #{change.ChangeSeq}.");
                }
            }

            await _purchasingRepo.ApplyDownloadedSuppliersAsync(businessId, suppliers, cursorKey, data.NextCursor);
            _logger.Info(LogCategory.SYNC, $"Downloaded {suppliers.Count} supplier change(s); cursor {cursor} -> {data.NextCursor}.");
            cursor = data.NextCursor;

            if (!data.HasMore || (data.Changes?.Count ?? 0) == 0) return;
        }
    }

    // --------------------------------------------------------------- helpers

    private static SupplierItem ToSupplier(SupplierApiDto dto, string businessId) => new()
    {
        Id = dto.Id,
        BusinessId = businessId,
        SupplierCode = dto.SupplierCode,
        LegalName = dto.LegalName,
        TradeName = dto.TradeName,
        Gstin = dto.Gstin,
        PhoneNumber = dto.PhoneNumber,
        Email = dto.Email,
        ContactPersonName = dto.ContactPersonName,
        AddressLine1 = dto.AddressLine1,
        City = dto.City,
        State = dto.State,
        PostalCode = dto.PostalCode,
        PaymentTermsDays = dto.PaymentTermsDays,
        Status = dto.Status ?? "ACTIVE",
        SyncState = SupplierSyncState.Synced,
        UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
    };

    // Rebuilds the wire DTO from the stored operation. The checksum is recomputed from the exact payload
    // being sent, so rows queued before the canonical-checksum fix are not rejected by the server.
    public static SyncOperationApiDto? BuildOperationDto(OfflineOperation op)
    {
        try
        {
            using var doc = JsonDocument.Parse(op.PayloadJson);
            var payload = doc.RootElement.Clone();
            return new SyncOperationApiDto(
                EventId: op.OperationId,
                EventType: op.EventType,
                EventVersion: op.EventVersion,
                DeviceSequenceNumber: op.DeviceSequenceNumber,
                OccurredAt: DateTimeOffset.FromUnixTimeMilliseconds(op.CreatedAt)
                    .ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", System.Globalization.CultureInfo.InvariantCulture),
                PayloadChecksum: CanonicalJson.ComputeChecksum(payload.GetRawText()),
                Payload: payload);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? TryReadSaleId(string payloadJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            return doc.RootElement.TryGetProperty("saleId", out var id) && id.ValueKind == JsonValueKind.String
                ? id.GetString()
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    // Queued supplier creates carry the local supplier id in their idempotency key ("SUPPLIER-{id}").
    private static string? LocalSupplierId(OfflineOperation op) =>
        op.IdempotencyKey.StartsWith(SupplierKeyPrefix, StringComparison.Ordinal)
            ? op.IdempotencyKey[SupplierKeyPrefix.Length..]
            : null;

    // Queued goods receipts carry the local receipt id in their idempotency key ("GRN-{id}").
    private static string? GoodsReceiptIdFromKey(string key) =>
        key.StartsWith("GRN-", StringComparison.Ordinal) ? key["GRN-".Length..] : null;

    // 401/403 and DEVICE_* (revoked, unknown or wrong-tenant device) concern the whole request, not one
    // operation, so operations stay pending instead of being failed one by one.
    private static bool IsNotAuthorized<T>(ApiResult<T> result) =>
        result.StatusCode is 401 or 403 ||
        (result.ErrorCode?.StartsWith("DEVICE_", StringComparison.Ordinal) ?? false);

    private void LogNotAuthorized<T>(ApiResult<T> result) =>
        _logger.Warn(LogCategory.SYNC,
            $"SECURITY EVENT: [{SecurityAuditEvents.SyncAuthRejected}] Sync refused by the server: HTTP {result.StatusCode} {result.ErrorCode}. Operations stay pending.");

    private static string Summarize(IEnumerable<OfflineOperation> ops) =>
        string.Join(", ", ops.GroupBy(o => o.EventType).Select(g => $"{g.Key} x{g.Count()}"));
}
