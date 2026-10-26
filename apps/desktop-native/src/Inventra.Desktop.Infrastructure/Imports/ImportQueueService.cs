using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Catalog;
using Inventra.Desktop.Core.Domain.Imports;
using Inventra.Desktop.Core.Domain.Inventory;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Logging;

namespace Inventra.Desktop.Infrastructure.Imports;

public interface IImportQueueService
{
    ImportQueueState State { get; }

    /// <summary>Raised whenever the state or the jobs change (possibly from a background thread).</summary>
    event EventHandler? Changed;

    /// <summary>Queues the medicines (online or offline). Returns how many were newly queued; repeats are ignored.</summary>
    Task<int> EnqueueAsync(string businessId, IEnumerable<GlobalMedicineItem> medicines);

    /// <summary>Stops starting new imports. The medicine already being imported finishes first.</summary>
    Task PauseAsync(string businessId);

    /// <summary>Clears the pause and starts importing again (if the server is reachable).</summary>
    Task ResumeAsync(string businessId, string? storeId);

    /// <summary>Imports queued medicines one by one until the queue is empty, paused, or the server is unreachable.</summary>
    Task ProcessAsync(string businessId, string? storeId);

    /// <summary>Reloads the pause flag and queue size from the database and returns the resulting state.</summary>
    Task<ImportQueueState> RefreshStateAsync(string businessId);
}

/// <summary>
/// Imports global-catalog medicines into the business catalog through the server, one at a time, in the background.
/// A medicine is created locally only after the server has created it, so the local product always carries the
/// server's id (an import that is only queued never produces a catalog entry that cannot be sold or synced).
/// The pause switch is stored in the database, so it survives a restart.
/// </summary>
public sealed class ImportQueueService : IImportQueueService
{
    /// <summary>Retryable failures (server down, 5xx) are tried this many times before the job is failed.</summary>
    public const int MaxAttempts = 5;

    private readonly IImportQueueRepository _jobs;
    private readonly IProductRepository _products;
    private readonly IInventraApiClient _api;
    private readonly ICloudConnectivityService _connectivity;
    private readonly IAppLogger _logger;

    private int _running;
    private volatile bool _paused;
    private volatile bool _waiting;
    private bool _recovered;

    public ImportQueueService(
        IImportQueueRepository jobs,
        IProductRepository products,
        IInventraApiClient api,
        ICloudConnectivityService connectivity,
        IAppLogger? logger = null)
    {
        _jobs = jobs;
        _products = products;
        _api = api;
        _connectivity = connectivity;
        _logger = logger ?? AppLogger.Instance;
    }

    public event EventHandler? Changed;

    public ImportQueueState State
    {
        get
        {
            var running = Volatile.Read(ref _running) == 1;
            if (_paused) return running ? ImportQueueState.Pausing : ImportQueueState.Paused;
            if (running) return ImportQueueState.Running;
            return _waiting ? ImportQueueState.WaitingForConnection : ImportQueueState.Idle;
        }
    }

    public async Task<int> EnqueueAsync(string businessId, IEnumerable<GlobalMedicineItem> medicines)
    {
        var created = 0;
        foreach (var med in medicines)
        {
            var (_, isNew) = await _jobs.EnqueueAsync(businessId, med.Id, med.Name, med.GenericName);
            if (isNew) created++;
        }

        if (created > 0)
        {
            _logger.Info(LogCategory.CATALOG, $"Queued {created} medicine import(s).");
            await RefreshStateAsync(businessId);
        }

        return created;
    }

    public async Task PauseAsync(string businessId)
    {
        await _jobs.SetPausedAsync(businessId, true);
        _paused = true;
        _logger.Info(LogCategory.CATALOG, "Medicine import paused.");
        Raise();
    }

    public async Task ResumeAsync(string businessId, string? storeId)
    {
        await _jobs.SetPausedAsync(businessId, false);
        _paused = false;
        _logger.Info(LogCategory.CATALOG, "Medicine import resumed.");
        Raise();
        await ProcessAsync(businessId, storeId);
    }

    public async Task<ImportQueueState> RefreshStateAsync(string businessId)
    {
        _paused = await _jobs.IsPausedAsync(businessId);
        var counts = await _jobs.CountsAsync(businessId);
        _waiting = counts.Queued > 0 && !_connectivity.IsOnline;
        Raise();
        return State;
    }

    public async Task ProcessAsync(string businessId, string? storeId)
    {
        // One runner at a time: the coordinator, a resume click and a new enqueue can all ask at once.
        if (Interlocked.CompareExchange(ref _running, 1, 0) != 0) return;

        try
        {
            if (!_recovered)
            {
                var recovered = await _jobs.RecoverInterruptedAsync(businessId);
                if (recovered > 0) _logger.Info(LogCategory.CATALOG, $"{recovered} interrupted import(s) put back in the queue.");
                _recovered = true;
            }

            Raise();
            while (true)
            {
                _paused = await _jobs.IsPausedAsync(businessId);
                if (_paused) break;

                if (!_connectivity.IsOnline)
                {
                    _waiting = (await _jobs.CountsAsync(businessId)).Queued > 0;
                    break;
                }

                var job = await _jobs.ClaimNextAsync(businessId);
                if (job == null)
                {
                    _waiting = false;
                    break;
                }

                Raise();
                var keepGoing = await ImportOneAsync(job, businessId, storeId);
                Raise();
                if (!keepGoing) break;
            }
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.CATALOG, "Medicine import run stopped unexpectedly; queued items were kept.", ex);
        }
        finally
        {
            Volatile.Write(ref _running, 0);
            Raise();
        }
    }

    /// <returns>False when the run should stop (the server is failing, so hammering it would not help).</returns>
    private async Task<bool> ImportOneAsync(ImportJob job, string businessId, string? storeId)
    {
        try
        {
            var existing = (await _products.GetProductsByBusinessAsync(businessId, storeId))
                .FirstOrDefault(p => string.Equals(p.Name, job.Name, StringComparison.OrdinalIgnoreCase));
            if (existing != null)
            {
                await _jobs.CompleteAsync(job.Id, ImportJobStatus.Skipped, "Already in your catalog.", existing.Id);
                return true;
            }

            var result = await _api.QuickImportWithDiagnosticsAsync(job.GlobalMedicineId);

            if (result.Success && result.Product != null)
            {
                await _products.UpsertProductAsync(ToProduct(result.Product, businessId, storeId));
                await _jobs.CompleteAsync(job.Id, ImportJobStatus.Done, null, result.Product.Id);
                _logger.Info(LogCategory.CATALOG, $"Imported '{job.Name}' into the catalog (stock 0).");
                return true;
            }

            // 409: the server already has it. Nothing to create; the catalog refresh brings it in.
            if (result.StatusCode == 409)
            {
                await _jobs.CompleteAsync(job.Id, ImportJobStatus.Skipped,
                    "Already imported on the server; it appears in your catalog after the next refresh.", null);
                return true;
            }

            var transient = result.StatusCode is 0 or 408 or 429 or >= 500;
            var message = result.ErrorMessage ?? $"Import failed (HTTP {result.StatusCode}).";
            if (transient && job.Attempts < MaxAttempts)
            {
                await _jobs.RequeueAsync(job.Id, message);
                _logger.Warn(LogCategory.CATALOG, $"Import of '{job.Name}' will be retried (attempt {job.Attempts}/{MaxAttempts}): {message}");
                return false; // stop this run; the next trigger retries
            }

            await _jobs.CompleteAsync(job.Id, ImportJobStatus.Failed, message, null);
            _logger.Warn(LogCategory.CATALOG, $"Import of '{job.Name}' failed: {message}");
            return !transient; // a permanent rejection of one medicine does not stop the rest
        }
        catch (Exception ex)
        {
            await _jobs.RequeueAsync(job.Id, $"Unexpected error: {ex.Message}");
            _logger.Error(LogCategory.CATALOG, $"Import of '{job.Name}' hit an unexpected error.", ex);
            return false;
        }
    }

    // The same mapping the catalog refresh uses, so an imported product looks like one loaded from the server.
    private static ProductItem ToProduct(ProductApiDto dto, string businessId, string? storeId) => new()
    {
        Id = dto.Id,
        BusinessId = businessId,
        StoreId = storeId,
        Code = string.IsNullOrEmpty(dto.HsnCode) ? $"PRD-{dto.Id[..Math.Min(8, dto.Id.Length)].ToUpperInvariant()}" : dto.HsnCode,
        Name = dto.Name,
        GenericName = dto.GenericName ?? string.Empty,
        DosageForm = dto.DosageForm ?? "TABLET",
        Strength = dto.Strength ?? string.Empty,
        BaseUnit = dto.BaseUnit ?? "Unit",
        SellingUnit = dto.SellingUnit ?? "Unit",
        UnitsPerSellingUnit = dto.UnitsPerSellingUnit > 0 ? dto.UnitsPerSellingUnit : 1,
        TaxRate = dto.TaxRate,
        IsTaxInclusive = true,
        PrescriptionRequired = dto.PrescriptionRequired,
        SellingPrice = 0m,
        Mrp = 0m,
        CurrentStock = 0.0, // an import creates the product with no stock and no batches
        UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
    };

    private void Raise() => Changed?.Invoke(this, EventArgs.Empty);
}
