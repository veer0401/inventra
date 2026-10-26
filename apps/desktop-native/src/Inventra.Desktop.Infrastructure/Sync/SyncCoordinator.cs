using System;
using System.Threading;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Imports;
using Inventra.Desktop.Infrastructure.Logging;

namespace Inventra.Desktop.Infrastructure.Sync;

/// <summary>
/// Runs the background work that moves queued data to the server. Until now a sync cycle ran only at startup, after
/// a sale and on a manual request, so operations queued while offline waited for one of those even after the
/// connection came back. The coordinator also runs the sync and the medicine-import queue when the connection
/// returns, and every minute while online.
/// </summary>
public sealed class SyncCoordinator : IDisposable
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    private readonly ISyncEngineService _sync;
    private readonly IImportQueueService _imports;
    private readonly IIdentitySessionService _identity;
    private readonly ICloudConnectivityService _connectivity;
    private readonly IAppLogger _logger;
    private Timer? _timer;
    private int _busy;

    public SyncCoordinator(
        ISyncEngineService sync,
        IImportQueueService imports,
        IIdentitySessionService identity,
        ICloudConnectivityService connectivity,
        IAppLogger? logger = null)
    {
        _sync = sync;
        _imports = imports;
        _identity = identity;
        _connectivity = connectivity;
        _logger = logger ?? AppLogger.Instance;
    }

    public void Start()
    {
        Stop();
        _connectivity.StateChanged += OnConnectivityChanged;
        _timer = new Timer(_ => _ = TriggerAsync(), null, Interval, Interval);
    }

    public void Stop()
    {
        _connectivity.StateChanged -= OnConnectivityChanged;
        _timer?.Dispose();
        _timer = null;
    }

    private void OnConnectivityChanged(object? sender, ConnectivityState state)
    {
        if (state == ConnectivityState.Online) _ = TriggerAsync();
        else _ = RefreshImportStateAsync();
    }

    /// <summary>Runs one sync cycle and the import queue now. Safe to call from anywhere; overlapping calls are ignored.</summary>
    public async Task TriggerAsync()
    {
        if (Interlocked.CompareExchange(ref _busy, 1, 0) != 0) return;

        try
        {
            if (!_connectivity.IsOnline) return;

            var session = await _identity.GetSessionAsync();
            if (session == null) return;
            var device = await _identity.GetDeviceAsync();

            await _sync.RunSyncCycleAsync(session.BusinessId, device.DeviceId);
            await _imports.ProcessAsync(session.BusinessId, session.StoreId);
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.SYNC, "Background sync trigger failed; queued data was left as it was.", ex);
        }
        finally
        {
            Volatile.Write(ref _busy, 0);
        }
    }

    private async Task RefreshImportStateAsync()
    {
        try
        {
            var session = await _identity.GetSessionAsync();
            if (session != null) await _imports.RefreshStateAsync(session.BusinessId);
        }
        catch (Exception ex)
        {
            _logger.Warn(LogCategory.SYNC, $"Could not refresh the import queue state: {ex.Message}");
        }
    }

    public void Dispose() => Stop();
}
