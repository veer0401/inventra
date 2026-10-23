using System;
using System.Threading;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Infrastructure.Api;

namespace Inventra.Desktop.Infrastructure.Connectivity;

public interface ICloudConnectivityService : IDisposable
{
    ConnectivityState CurrentState { get; }
    bool IsOnline { get; }
    string StatusDisplay { get; }
    event EventHandler<ConnectivityState>? StateChanged;
    Task<bool> CheckConnectivityNowAsync();
    void StartMonitoring(TimeSpan interval);
    void StopMonitoring();
}

public sealed class CloudConnectivityService : ICloudConnectivityService
{
    private readonly IInventraApiClient _apiClient;
    private ConnectivityState _currentState = ConnectivityState.Offline;
    private Timer? _timer;
    private bool _isChecking;

    public bool IsOnline => CurrentState == ConnectivityState.Online;

    public CloudConnectivityService(IInventraApiClient apiClient)
    {
        _apiClient = apiClient;
    }

    public ConnectivityState CurrentState
    {
        get => _currentState;
        private set
        {
            if (_currentState != value)
            {
                var oldState = _currentState;
                _currentState = value;
                Logging.AppLogger.Instance.Info(Logging.LogCategory.API, $"Cloud connectivity transition: {oldState} -> {value}");
                StateChanged?.Invoke(this, _currentState);
            }
        }
    }

    public string StatusDisplay => CurrentState switch
    {
        ConnectivityState.Online => "Cloud Connected",
        ConnectivityState.Connecting => "Connecting to Cloud...",
        ConnectivityState.Syncing => "Syncing Operations...",
        ConnectivityState.Degraded => "Cloud Connection Unstable",
        _ => "Local Mode (Offline)"
    };

    public event EventHandler<ConnectivityState>? StateChanged;

    public async Task<bool> CheckConnectivityNowAsync()
    {
        if (_isChecking) return CurrentState == ConnectivityState.Online;

        _isChecking = true;
        try
        {
            var isOnline = await _apiClient.PingAsync();
            CurrentState = isOnline ? ConnectivityState.Online : ConnectivityState.Offline;
            return isOnline;
        }
        catch
        {
            CurrentState = ConnectivityState.Offline;
            return false;
        }
        finally
        {
            _isChecking = false;
        }
    }

    public void StartMonitoring(TimeSpan interval)
    {
        StopMonitoring();
        _timer = new Timer(async _ => await CheckConnectivityNowAsync(), null, TimeSpan.Zero, interval);
    }

    public void StopMonitoring()
    {
        _timer?.Dispose();
        _timer = null;
    }

    public void Dispose()
    {
        StopMonitoring();
    }
}
