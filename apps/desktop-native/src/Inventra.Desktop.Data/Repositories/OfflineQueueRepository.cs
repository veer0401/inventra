using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Sync;
using Microsoft.Data.Sqlite;

namespace Inventra.Desktop.Data.Repositories;

public interface IOfflineQueueRepository
{
    Task<OfflineOperation> EnqueueOperationAsync(
        string businessId,
        string storeId,
        string deviceId,
        string userId,
        string eventType,
        string payloadJson,
        string idempotencyKey);

    Task<IReadOnlyList<OfflineOperation>> GetPendingOperationsAsync(string businessId, int limit = 50);
    Task<int> GetPendingCountAsync(string businessId);
    Task<int> GetConflictCountAsync(string businessId);
    Task<int> GetFailedCountAsync(string businessId);
    Task<IReadOnlyList<OfflineOperation>> GetFailedOperationsAsync(string businessId, int limit = 20);
    Task MarkSyncedAsync(string operationId, string? serverEntityId);
    Task MarkFailedAsync(string operationId, string errorCode, string errorMessage);

    /// <summary>Keeps the operation PENDING for another attempt after a retryable failure, recording why.</summary>
    Task MarkRetryAsync(string operationId, string errorCode, string errorMessage);

    /// <summary>
    /// Operations of the given event type that are still PENDING, or were failed only because the server
    /// did not support that type. Used to migrate operations queued by earlier builds.
    /// </summary>
    Task<IReadOnlyList<OfflineOperation>> GetRetargetableOperationsAsync(string businessId, string eventType);

    /// <summary>Operations a person should look at: FAILED ones, and PENDING ones that have already failed an attempt.</summary>
    Task<IReadOnlyList<OfflineOperation>> GetOperationsNeedingAttentionAsync(string businessId, int limit = 300);

    Task<OfflineOperation?> GetOperationAsync(string operationId);

    /// <summary>FAILED -> PENDING with the attempt counter and error cleared. False if it was not FAILED.</summary>
    Task<bool> ResetForRetryAsync(string operationId);

    /// <summary>Takes a FAILED or PENDING operation out of the queue on a person's decision, keeping the reason. It is never sent.</summary>
    Task<bool> DismissAsync(string operationId, string reason);

    /// <summary>Re-targets an operation to a new event type, payload and idempotency key and resets it to PENDING.</summary>
    Task RewriteOperationAsync(string operationId, string eventType, string payloadJson, string idempotencyKey, int? eventVersion = null);
}

public sealed class OfflineQueueRepository : IOfflineQueueRepository
{
    private readonly DatabaseContext _dbContext;

    public OfflineQueueRepository(DatabaseContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<OfflineOperation> EnqueueOperationAsync(
        string businessId,
        string storeId,
        string deviceId,
        string userId,
        string eventType,
        string payloadJson,
        string idempotencyKey)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        // Compute next monotonic sequence number for this device
        await using var seqCmd = connection.CreateCommand();
        seqCmd.CommandText = @"
            SELECT COALESCE(MAX(device_sequence_number), 0) + 1
            FROM offline_operations
            WHERE business_id = @biz AND device_id = @dev;
        ";
        seqCmd.Parameters.AddWithValue("@biz", businessId);
        seqCmd.Parameters.AddWithValue("@dev", deviceId);
        long nextSeq = Convert.ToInt64(await seqCmd.ExecuteScalarAsync());

        string checksum = CanonicalJson.ComputeChecksum(payloadJson);
        var op = new OfflineOperation
        {
            OperationId = Guid.NewGuid().ToString(),
            BusinessId = businessId,
            StoreId = storeId,
            DeviceId = deviceId,
            UserId = userId,
            DeviceSequenceNumber = nextSeq,
            EventType = eventType,
            PayloadJson = payloadJson,
            PayloadChecksum = checksum,
            IdempotencyKey = idempotencyKey,
            Status = SyncOperationStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        await using var insertCmd = connection.CreateCommand();
        insertCmd.CommandText = @"
            INSERT INTO offline_operations (
                operation_id, business_id, store_id, device_id, user_id,
                device_sequence_number, event_type, event_version, payload_json,
                payload_checksum, idempotency_key, status, retry_count, created_at
            ) VALUES (
                @opId, @biz, @store, @dev, @usr,
                @seq, @evt, 1, @json,
                @csum, @idem, 'PENDING', 0, @created
            );
        ";

        insertCmd.Parameters.AddWithValue("@opId", op.OperationId);
        insertCmd.Parameters.AddWithValue("@biz", op.BusinessId);
        insertCmd.Parameters.AddWithValue("@store", op.StoreId);
        insertCmd.Parameters.AddWithValue("@dev", op.DeviceId);
        insertCmd.Parameters.AddWithValue("@usr", op.UserId);
        insertCmd.Parameters.AddWithValue("@seq", op.DeviceSequenceNumber);
        insertCmd.Parameters.AddWithValue("@evt", op.EventType);
        insertCmd.Parameters.AddWithValue("@json", op.PayloadJson);
        insertCmd.Parameters.AddWithValue("@csum", op.PayloadChecksum);
        insertCmd.Parameters.AddWithValue("@idem", op.IdempotencyKey);
        insertCmd.Parameters.AddWithValue("@created", op.CreatedAt);

        await insertCmd.ExecuteNonQueryAsync();
        return op;
    }

    public async Task<IReadOnlyList<OfflineOperation>> GetPendingOperationsAsync(string businessId, int limit = 50)
    {
        var list = new List<OfflineOperation>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT operation_id, business_id, store_id, device_id, user_id,
                   device_sequence_number, event_type, event_version, payload_json,
                   payload_checksum, idempotency_key, status, retry_count, created_at
            FROM offline_operations
            WHERE business_id = @biz AND status = 'PENDING'
            ORDER BY device_sequence_number ASC
            LIMIT @lim;
        ";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@lim", limit);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new OfflineOperation
            {
                OperationId = reader.GetString(0),
                BusinessId = reader.GetString(1),
                StoreId = reader.GetString(2),
                DeviceId = reader.GetString(3),
                UserId = reader.GetString(4),
                DeviceSequenceNumber = reader.GetInt64(5),
                EventType = reader.GetString(6),
                EventVersion = reader.GetInt32(7),
                PayloadJson = reader.GetString(8),
                PayloadChecksum = reader.GetString(9),
                IdempotencyKey = reader.GetString(10),
                Status = SyncOperationStatus.Pending,
                RetryCount = reader.GetInt32(12),
                CreatedAt = reader.GetInt64(13)
            });
        }

        return list;
    }

    public async Task<int> GetPendingCountAsync(string businessId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM offline_operations WHERE business_id = @biz AND status = 'PENDING';";
        cmd.Parameters.AddWithValue("@biz", businessId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    public async Task<int> GetConflictCountAsync(string businessId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM offline_operations WHERE business_id = @biz AND status = 'CONFLICT';";
        cmd.Parameters.AddWithValue("@biz", businessId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    public async Task<int> GetFailedCountAsync(string businessId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM offline_operations WHERE business_id = @biz AND status = 'FAILED';";
        cmd.Parameters.AddWithValue("@biz", businessId);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    public async Task<IReadOnlyList<OfflineOperation>> GetFailedOperationsAsync(string businessId, int limit = 20)
    {
        var list = new List<OfflineOperation>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT operation_id, business_id, store_id, device_id, user_id,
                   device_sequence_number, event_type, event_version, payload_json,
                   payload_checksum, idempotency_key, status, retry_count, created_at,
                   error_code, error_message, last_attempt_at
            FROM offline_operations
            WHERE business_id = @biz AND status = 'FAILED'
            ORDER BY last_attempt_at DESC
            LIMIT @lim;
        ";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@lim", limit);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new OfflineOperation
            {
                OperationId = reader.GetString(0),
                BusinessId = reader.GetString(1),
                StoreId = reader.GetString(2),
                DeviceId = reader.GetString(3),
                UserId = reader.GetString(4),
                DeviceSequenceNumber = reader.GetInt64(5),
                EventType = reader.GetString(6),
                EventVersion = reader.GetInt32(7),
                PayloadJson = reader.GetString(8),
                PayloadChecksum = reader.GetString(9),
                IdempotencyKey = reader.GetString(10),
                Status = SyncOperationStatus.Rejected,
                RetryCount = reader.GetInt32(12),
                CreatedAt = reader.GetInt64(13),
                ErrorCode = reader.IsDBNull(14) ? null : reader.GetString(14),
                ErrorMessage = reader.IsDBNull(15) ? null : reader.GetString(15),
                LastAttemptAt = reader.IsDBNull(16) ? null : reader.GetInt64(16)
            });
        }

        return list;
    }

    public async Task MarkSyncedAsync(string operationId, string? serverEntityId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE offline_operations
            SET status = 'SYNCED', server_entity_id = @srvId, last_attempt_at = @now
            WHERE operation_id = @opId;
        ";
        cmd.Parameters.AddWithValue("@opId", operationId);
        cmd.Parameters.AddWithValue("@srvId", (object?)serverEntityId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@now", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task MarkFailedAsync(string operationId, string errorCode, string errorMessage)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE offline_operations
            SET status = 'FAILED', error_code = @errCode, error_message = @errMsg,
                retry_count = retry_count + 1, last_attempt_at = @now
            WHERE operation_id = @opId;
        ";
        cmd.Parameters.AddWithValue("@opId", operationId);
        cmd.Parameters.AddWithValue("@errCode", errorCode);
        cmd.Parameters.AddWithValue("@errMsg", errorMessage);
        cmd.Parameters.AddWithValue("@now", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task MarkRetryAsync(string operationId, string errorCode, string errorMessage)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE offline_operations
            SET error_code = @errCode, error_message = @errMsg,
                retry_count = retry_count + 1, last_attempt_at = @now
            WHERE operation_id = @opId AND status = 'PENDING';
        ";
        cmd.Parameters.AddWithValue("@opId", operationId);
        cmd.Parameters.AddWithValue("@errCode", errorCode);
        cmd.Parameters.AddWithValue("@errMsg", errorMessage);
        cmd.Parameters.AddWithValue("@now", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        await cmd.ExecuteNonQueryAsync();
    }

    private const string ReviewColumns = @"
        operation_id, business_id, store_id, device_id, user_id, device_sequence_number, event_type, event_version,
        payload_json, payload_checksum, idempotency_key, status, retry_count, created_at, error_code, error_message,
        last_attempt_at, server_entity_id";

    private static OfflineOperation ReadForReview(SqliteDataReader r) => new()
    {
        OperationId = r.GetString(0),
        BusinessId = r.GetString(1),
        StoreId = r.GetString(2),
        DeviceId = r.GetString(3),
        UserId = r.GetString(4),
        DeviceSequenceNumber = r.GetInt64(5),
        EventType = r.GetString(6),
        EventVersion = r.GetInt32(7),
        PayloadJson = r.GetString(8),
        PayloadChecksum = r.GetString(9),
        IdempotencyKey = r.GetString(10),
        RawStatus = r.GetString(11),
        RetryCount = r.GetInt32(12),
        CreatedAt = r.GetInt64(13),
        ErrorCode = r.IsDBNull(14) ? null : r.GetString(14),
        ErrorMessage = r.IsDBNull(15) ? null : r.GetString(15),
        LastAttemptAt = r.IsDBNull(16) ? null : r.GetInt64(16),
        ServerEntityId = r.IsDBNull(17) ? null : r.GetString(17)
    };

    public async Task<IReadOnlyList<OfflineOperation>> GetOperationsNeedingAttentionAsync(string businessId, int limit = 300)
    {
        var list = new List<OfflineOperation>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $@"
            SELECT {ReviewColumns}
            FROM offline_operations
            WHERE business_id = @biz AND (status = 'FAILED' OR (status = 'PENDING' AND retry_count > 0))
            ORDER BY created_at DESC
            LIMIT @lim;";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@lim", limit);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) list.Add(ReadForReview(reader));
        return list;
    }

    public async Task<OfflineOperation?> GetOperationAsync(string operationId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $"SELECT {ReviewColumns} FROM offline_operations WHERE operation_id = @id;";
        cmd.Parameters.AddWithValue("@id", operationId);
        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? ReadForReview(reader) : null;
    }

    public async Task<bool> ResetForRetryAsync(string operationId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE offline_operations
            SET status = 'PENDING', retry_count = 0, error_code = NULL, error_message = NULL
            WHERE operation_id = @id AND status = 'FAILED';";
        cmd.Parameters.AddWithValue("@id", operationId);
        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    public async Task<bool> DismissAsync(string operationId, string reason)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE offline_operations
            SET status = 'DISMISSED', error_code = 'DISMISSED', error_message = @reason, last_attempt_at = @now
            WHERE operation_id = @id AND status IN ('FAILED', 'PENDING');";
        cmd.Parameters.AddWithValue("@id", operationId);
        cmd.Parameters.AddWithValue("@reason", reason);
        cmd.Parameters.AddWithValue("@now", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        return await cmd.ExecuteNonQueryAsync() > 0;
    }

    public async Task<IReadOnlyList<OfflineOperation>> GetRetargetableOperationsAsync(string businessId, string eventType)
    {
        var list = new List<OfflineOperation>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT operation_id, business_id, store_id, device_id, user_id,
                   device_sequence_number, event_type, event_version, payload_json,
                   payload_checksum, idempotency_key, retry_count, created_at
            FROM offline_operations
            WHERE business_id = @biz AND event_type = @evt
              AND (status = 'PENDING' OR (status = 'FAILED' AND error_code = 'UNSUPPORTED_EVENT_TYPE'))
            ORDER BY device_sequence_number ASC;
        ";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@evt", eventType);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new OfflineOperation
            {
                OperationId = reader.GetString(0),
                BusinessId = reader.GetString(1),
                StoreId = reader.GetString(2),
                DeviceId = reader.GetString(3),
                UserId = reader.GetString(4),
                DeviceSequenceNumber = reader.GetInt64(5),
                EventType = reader.GetString(6),
                EventVersion = reader.GetInt32(7),
                PayloadJson = reader.GetString(8),
                PayloadChecksum = reader.GetString(9),
                IdempotencyKey = reader.GetString(10),
                RetryCount = reader.GetInt32(11),
                CreatedAt = reader.GetInt64(12)
            });
        }

        return list;
    }

    public async Task RewriteOperationAsync(string operationId, string eventType, string payloadJson, string idempotencyKey, int? eventVersion = null)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE offline_operations
            SET event_type = @evt, payload_json = @json, payload_checksum = @csum, idempotency_key = @idem,
                event_version = COALESCE(@ver, event_version),
                status = 'PENDING', retry_count = 0, error_code = NULL, error_message = NULL
            WHERE operation_id = @opId;
        ";
        cmd.Parameters.AddWithValue("@ver", (object?)eventVersion ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@opId", operationId);
        cmd.Parameters.AddWithValue("@evt", eventType);
        cmd.Parameters.AddWithValue("@json", payloadJson);
        cmd.Parameters.AddWithValue("@csum", CanonicalJson.ComputeChecksum(payloadJson));
        cmd.Parameters.AddWithValue("@idem", idempotencyKey);
        await cmd.ExecuteNonQueryAsync();
    }

    /// <summary>
    /// Appends an operation using the caller's connection and transaction, so the outbox row commits or
    /// rolls back together with the business change it describes.
    /// </summary>
    internal static async Task<OfflineOperation> EnqueueInTransactionAsync(
        SqliteConnection connection,
        SqliteTransaction tx,
        string businessId,
        string storeId,
        string deviceId,
        string userId,
        string eventType,
        string payloadJson,
        string idempotencyKey,
        long createdAt)
    {
        long nextSeq;
        await using (var seqCmd = connection.CreateCommand())
        {
            seqCmd.Transaction = tx;
            seqCmd.CommandText = @"
                SELECT COALESCE(MAX(device_sequence_number), 0) + 1
                FROM offline_operations
                WHERE business_id = @biz AND device_id = @dev;
            ";
            seqCmd.Parameters.AddWithValue("@biz", businessId);
            seqCmd.Parameters.AddWithValue("@dev", deviceId);
            nextSeq = Convert.ToInt64(await seqCmd.ExecuteScalarAsync());
        }

        var op = new OfflineOperation
        {
            OperationId = Guid.NewGuid().ToString(),
            BusinessId = businessId,
            StoreId = storeId,
            DeviceId = deviceId,
            UserId = userId,
            DeviceSequenceNumber = nextSeq,
            EventType = eventType,
            PayloadJson = payloadJson,
            PayloadChecksum = CanonicalJson.ComputeChecksum(payloadJson),
            IdempotencyKey = idempotencyKey,
            Status = SyncOperationStatus.Pending,
            CreatedAt = createdAt
        };

        await using var insertCmd = connection.CreateCommand();
        insertCmd.Transaction = tx;
        insertCmd.CommandText = @"
            INSERT INTO offline_operations (
                operation_id, business_id, store_id, device_id, user_id,
                device_sequence_number, event_type, event_version, payload_json,
                payload_checksum, idempotency_key, status, retry_count, created_at
            ) VALUES (
                @opId, @biz, @store, @dev, @usr,
                @seq, @evt, 1, @json,
                @csum, @idem, 'PENDING', 0, @created
            );
        ";
        insertCmd.Parameters.AddWithValue("@opId", op.OperationId);
        insertCmd.Parameters.AddWithValue("@biz", op.BusinessId);
        insertCmd.Parameters.AddWithValue("@store", op.StoreId);
        insertCmd.Parameters.AddWithValue("@dev", op.DeviceId);
        insertCmd.Parameters.AddWithValue("@usr", op.UserId);
        insertCmd.Parameters.AddWithValue("@seq", op.DeviceSequenceNumber);
        insertCmd.Parameters.AddWithValue("@evt", op.EventType);
        insertCmd.Parameters.AddWithValue("@json", op.PayloadJson);
        insertCmd.Parameters.AddWithValue("@csum", op.PayloadChecksum);
        insertCmd.Parameters.AddWithValue("@idem", op.IdempotencyKey);
        insertCmd.Parameters.AddWithValue("@created", op.CreatedAt);
        await insertCmd.ExecuteNonQueryAsync();

        return op;
    }
}
