using System;

namespace Inventra.Desktop.Core.Domain.Sync;

public enum SyncOperationStatus
{
    Pending,
    Syncing,
    Synced,
    Rejected,
    Conflict
}

public sealed class OfflineOperation
{
    public string OperationId { get; set; } = Guid.NewGuid().ToString();
    public string BusinessId { get; set; } = string.Empty;
    public string StoreId { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public long DeviceSequenceNumber { get; set; }
    public string EventType { get; set; } = string.Empty;
    public int EventVersion { get; set; } = 1;
    public string PayloadJson { get; set; } = "{}";
    public string PayloadChecksum { get; set; } = string.Empty;
    public string IdempotencyKey { get; set; } = string.Empty;
    public SyncOperationStatus Status { get; set; } = SyncOperationStatus.Pending;
    public int RetryCount { get; set; }
    public long? LastAttemptAt { get; set; }
    public string? ServerEntityId { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}

public sealed record SyncStatus(
    int PendingCount,
    int ConflictCount,
    string? LastSyncAt,
    bool IsSyncing,
    int FailedCount = 0
);
