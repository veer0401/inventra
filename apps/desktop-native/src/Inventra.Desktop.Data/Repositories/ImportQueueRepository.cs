using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Imports;
using Microsoft.Data.Sqlite;

namespace Inventra.Desktop.Data.Repositories;

public interface IImportQueueRepository
{
    /// <summary>
    /// Queues a medicine for import. If the same medicine is already queued or running nothing is added and the
    /// existing job is returned with Created = false, so a double click or a repeated "queue all" cannot import twice.
    /// </summary>
    Task<(ImportJob Job, bool Created)> EnqueueAsync(string businessId, string globalMedicineId, string name, string? genericName);

    Task<IReadOnlyList<ImportJob>> ListAsync(string businessId, int limit = 300);

    /// <summary>Atomically takes the oldest QUEUED job, marks it RUNNING and counts the attempt. Null when none is waiting.</summary>
    Task<ImportJob?> ClaimNextAsync(string businessId);

    Task CompleteAsync(string jobId, string status, string? message, string? productId);

    /// <summary>Puts a RUNNING job back to QUEUED after a failure that is worth retrying, recording why.</summary>
    Task RequeueAsync(string jobId, string message);

    /// <summary>RUNNING jobs left behind by a crash or forced close go back to QUEUED.</summary>
    Task<int> RecoverInterruptedAsync(string businessId);

    Task<int> RetryFailedAsync(string businessId);
    Task<bool> RemoveAsync(string jobId);
    Task<int> ClearFinishedAsync(string businessId);
    Task<ImportQueueCounts> CountsAsync(string businessId);

    /// <summary>The pause switch survives a restart: a queue paused yesterday is still paused today.</summary>
    Task<bool> IsPausedAsync(string businessId);
    Task SetPausedAsync(string businessId, bool paused);
}

public sealed class ImportQueueRepository : IImportQueueRepository
{
    private const string Columns = "id, business_id, global_medicine_id, name, generic_name, status, attempts, message, product_id, created_at, updated_at";

    private readonly DatabaseContext _dbContext;

    public ImportQueueRepository(DatabaseContext dbContext)
    {
        _dbContext = dbContext;
    }

    private static ImportJob Read(SqliteDataReader r) => new()
    {
        Id = r.GetString(0),
        BusinessId = r.GetString(1),
        GlobalMedicineId = r.GetString(2),
        Name = r.GetString(3),
        GenericName = r.IsDBNull(4) ? null : r.GetString(4),
        Status = r.GetString(5),
        Attempts = r.GetInt32(6),
        Message = r.IsDBNull(7) ? null : r.GetString(7),
        ProductId = r.IsDBNull(8) ? null : r.GetString(8),
        CreatedAt = r.GetInt64(9),
        UpdatedAt = r.GetInt64(10)
    };

    public async Task<(ImportJob Job, bool Created)> EnqueueAsync(string businessId, string globalMedicineId, string name, string? genericName)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        await using (var findCmd = connection.CreateCommand())
        {
            findCmd.Transaction = tx;
            findCmd.CommandText = $@"
                SELECT {Columns} FROM import_jobs
                WHERE business_id = @b AND global_medicine_id = @g AND status IN ('QUEUED', 'RUNNING') LIMIT 1;";
            findCmd.Parameters.AddWithValue("@b", businessId);
            findCmd.Parameters.AddWithValue("@g", globalMedicineId);
            await using var r = await findCmd.ExecuteReaderAsync();
            if (await r.ReadAsync()) return (Read(r), false);
        }

        var job = new ImportJob { BusinessId = businessId, GlobalMedicineId = globalMedicineId, Name = name, GenericName = genericName };
        await using (var insCmd = connection.CreateCommand())
        {
            insCmd.Transaction = tx;
            insCmd.CommandText = @"
                INSERT INTO import_jobs (id, business_id, global_medicine_id, name, generic_name, status, attempts, created_at, updated_at)
                VALUES (@id, @b, @g, @n, @gn, 'QUEUED', 0, @now, @now);";
            insCmd.Parameters.AddWithValue("@id", job.Id);
            insCmd.Parameters.AddWithValue("@b", businessId);
            insCmd.Parameters.AddWithValue("@g", globalMedicineId);
            insCmd.Parameters.AddWithValue("@n", name);
            insCmd.Parameters.AddWithValue("@gn", (object?)genericName ?? DBNull.Value);
            insCmd.Parameters.AddWithValue("@now", job.CreatedAt);
            await insCmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
        return (job, true);
    }

    public async Task<IReadOnlyList<ImportJob>> ListAsync(string businessId, int limit = 300)
    {
        var list = new List<ImportJob>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $@"
            SELECT {Columns} FROM import_jobs WHERE business_id = @b
            ORDER BY CASE status WHEN 'RUNNING' THEN 0 WHEN 'QUEUED' THEN 1 WHEN 'FAILED' THEN 2 ELSE 3 END, created_at, rowid
            LIMIT @lim;";
        cmd.Parameters.AddWithValue("@b", businessId);
        cmd.Parameters.AddWithValue("@lim", limit);
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(Read(r));
        return list;
    }

    public async Task<ImportJob?> ClaimNextAsync(string businessId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        string? id;
        await using (var pickCmd = connection.CreateCommand())
        {
            pickCmd.Transaction = tx;
            pickCmd.CommandText = "SELECT id FROM import_jobs WHERE business_id = @b AND status = 'QUEUED' ORDER BY created_at, rowid LIMIT 1;";
            pickCmd.Parameters.AddWithValue("@b", businessId);
            id = await pickCmd.ExecuteScalarAsync() as string;
        }
        if (id == null) return null;

        await using (var claimCmd = connection.CreateCommand())
        {
            claimCmd.Transaction = tx;
            claimCmd.CommandText = "UPDATE import_jobs SET status = 'RUNNING', attempts = attempts + 1, updated_at = @now WHERE id = @id;";
            claimCmd.Parameters.AddWithValue("@id", id);
            claimCmd.Parameters.AddWithValue("@now", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
            await claimCmd.ExecuteNonQueryAsync();
        }

        ImportJob? job;
        await using (var readCmd = connection.CreateCommand())
        {
            readCmd.Transaction = tx;
            readCmd.CommandText = $"SELECT {Columns} FROM import_jobs WHERE id = @id;";
            readCmd.Parameters.AddWithValue("@id", id);
            await using var r = await readCmd.ExecuteReaderAsync();
            job = await r.ReadAsync() ? Read(r) : null;
        }

        await tx.CommitAsync();
        return job;
    }

    public async Task CompleteAsync(string jobId, string status, string? message, string? productId)
    {
        await ExecCountAsync(
            "UPDATE import_jobs SET status = @s, message = @m, product_id = COALESCE(@p, product_id), updated_at = @now WHERE id = @id;",
            ("@id", jobId), ("@s", status), ("@m", (object?)message ?? DBNull.Value), ("@p", (object?)productId ?? DBNull.Value));
    }

    public async Task RequeueAsync(string jobId, string message)
    {
        await ExecCountAsync(
            "UPDATE import_jobs SET status = 'QUEUED', message = @m, updated_at = @now WHERE id = @id AND status = 'RUNNING';",
            ("@id", jobId), ("@m", message));
    }

    public Task<int> RecoverInterruptedAsync(string businessId) => ExecCountAsync(
        "UPDATE import_jobs SET status = 'QUEUED', message = 'Interrupted by a restart; will retry.', updated_at = @now WHERE business_id = @b AND status = 'RUNNING';",
        ("@b", businessId));

    public Task<int> RetryFailedAsync(string businessId) => ExecCountAsync(
        @"UPDATE import_jobs SET status = 'QUEUED', attempts = 0, message = NULL, updated_at = @now
          WHERE business_id = @b AND status = 'FAILED'
            AND NOT EXISTS (SELECT 1 FROM import_jobs x WHERE x.business_id = import_jobs.business_id
                            AND x.global_medicine_id = import_jobs.global_medicine_id AND x.status IN ('QUEUED', 'RUNNING'));",
        ("@b", businessId));

    public async Task<bool> RemoveAsync(string jobId) =>
        await ExecCountAsync("DELETE FROM import_jobs WHERE id = @id AND status IN ('QUEUED', 'FAILED');", ("@id", jobId)) > 0;

    public Task<int> ClearFinishedAsync(string businessId) => ExecCountAsync(
        "DELETE FROM import_jobs WHERE business_id = @b AND status IN ('DONE', 'SKIPPED');", ("@b", businessId));

    public async Task<ImportQueueCounts> CountsAsync(string businessId)
    {
        int queued = 0, running = 0, done = 0, skipped = 0, failed = 0;
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT status, COUNT(*) FROM import_jobs WHERE business_id = @b GROUP BY status;";
        cmd.Parameters.AddWithValue("@b", businessId);
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            var n = r.GetInt32(1);
            switch (r.GetString(0))
            {
                case ImportJobStatus.Queued: queued = n; break;
                case ImportJobStatus.Running: running = n; break;
                case ImportJobStatus.Done: done = n; break;
                case ImportJobStatus.Skipped: skipped = n; break;
                case ImportJobStatus.Failed: failed = n; break;
            }
        }
        return new ImportQueueCounts(queued, running, done, skipped, failed);
    }

    public async Task<bool> IsPausedAsync(string businessId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT value FROM sync_metadata WHERE key = @k;";
        cmd.Parameters.AddWithValue("@k", PauseKey(businessId));
        return await cmd.ExecuteScalarAsync() as string == "1";
    }

    public Task SetPausedAsync(string businessId, bool paused) => ExecCountAsync(
        @"INSERT INTO sync_metadata (key, value, updated_at) VALUES (@k, @v, @now)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;",
        ("@k", PauseKey(businessId)), ("@v", paused ? "1" : "0"));

    private static string PauseKey(string businessId) => $"import_paused:{businessId}";

    // Every statement may use @now; unused parameters are ignored by SQLite.
    private async Task<int> ExecCountAsync(string sql, params (string Name, object Value)[] ps)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v);
        cmd.Parameters.AddWithValue("@now", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        return await cmd.ExecuteNonQueryAsync();
    }
}
