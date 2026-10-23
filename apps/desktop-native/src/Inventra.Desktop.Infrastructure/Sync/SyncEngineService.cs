using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Sync;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;

namespace Inventra.Desktop.Infrastructure.Sync;

public interface ISyncEngineService
{
    bool IsSyncing { get; }
    Task<SyncStatus> GetStatusAsync(string businessId);
    Task<SyncStatus> RunSyncCycleAsync(string businessId, string deviceId);
}

public sealed class SyncEngineService : ISyncEngineService
{
    private readonly IOfflineQueueRepository _queueRepo;
    private readonly IInventraApiClient _apiClient;
    private bool _isSyncing;
    private string? _lastSyncAt;

    public SyncEngineService(IOfflineQueueRepository queueRepo, IInventraApiClient apiClient)
    {
        _queueRepo = queueRepo;
        _apiClient = apiClient;
    }

    public bool IsSyncing => _isSyncing;

    public async Task<SyncStatus> GetStatusAsync(string businessId)
    {
        var pending = await _queueRepo.GetPendingCountAsync(businessId);
        var conflicts = await _queueRepo.GetConflictCountAsync(businessId);
        var failed = await _queueRepo.GetFailedCountAsync(businessId);
        return new SyncStatus(pending, conflicts, _lastSyncAt, _isSyncing, failed);
    }

    public async Task<SyncStatus> RunSyncCycleAsync(string businessId, string deviceId)
    {
        if (_isSyncing) return await GetStatusAsync(businessId);

        _isSyncing = true;
        try
        {
            var isOnline = await _apiClient.PingAsync();
            if (!isOnline)
            {
                _isSyncing = false;
                return await GetStatusAsync(businessId);
            }

            // 1. Push pending offline operations
            var pending = await _queueRepo.GetPendingOperationsAsync(businessId, 50);
            if (pending.Count > 0)
            {
                var dtos = new List<SyncOperationApiDto>();
                foreach (var op in pending)
                {
                    JsonElement payloadDoc;
                    try
                    {
                        using var doc = JsonDocument.Parse(op.PayloadJson);
                        payloadDoc = doc.RootElement.Clone();
                    }
                    catch
                    {
                        using var doc = JsonDocument.Parse("{}");
                        payloadDoc = doc.RootElement.Clone();
                    }

                    dtos.Add(new SyncOperationApiDto(
                        EventId: op.OperationId,
                        EventType: op.EventType,
                        EventVersion: op.EventVersion,
                        DeviceSequenceNumber: op.DeviceSequenceNumber,
                        OccurredAt: DateTimeOffset.FromUnixTimeMilliseconds(op.CreatedAt).ToString("o"),
                        PayloadChecksum: op.PayloadChecksum,
                        Payload: payloadDoc
                    ));
                }

                var uploadRes = await _apiClient.UploadSyncBatchAsync(deviceId, dtos);
                if (uploadRes?.Results != null)
                {
                    foreach (var res in uploadRes.Results)
                    {
                        if (string.Equals(res.Status, "APPLIED", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(res.Status, "DUPLICATE", StringComparison.OrdinalIgnoreCase))
                        {
                            await _queueRepo.MarkSyncedAsync(res.EventId, res.ServerEntityId);
                        }
                        else
                        {
                            await _queueRepo.MarkFailedAsync(res.EventId, res.ErrorCode ?? "REJECTED", res.ErrorMessage ?? "Server rejected sync event");

                            if (string.Equals(res.ErrorCode, "DEVICE_REVOKED", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(res.ErrorCode, "PERMISSION_REVOKED", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(res.ErrorCode, "TENANT_MISMATCH", StringComparison.OrdinalIgnoreCase))
                            {
                                Logging.AppLogger.Instance.Log(Logging.AppLogLevel.WARN, Logging.LogCategory.SYNC,
                                    $"SECURITY EVENT: [{Core.Domain.Identity.SecurityAuditEvents.SyncAuthRejected}] Operation {res.EventId} rejected by server: [{res.ErrorCode}] {res.ErrorMessage}");
                            }
                        }
                    }
                }
            }

            _lastSyncAt = DateTime.Now.ToString("hh:mm tt");
            _isSyncing = false;
            return await GetStatusAsync(businessId);
        }
        catch
        {
            _isSyncing = false;
            return await GetStatusAsync(businessId);
        }
        finally
        {
            _isSyncing = false;
        }
    }
}
