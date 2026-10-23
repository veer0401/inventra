using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Inventra.Desktop.Data;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Logging;

namespace Inventra.Desktop.App.ViewModels;

public sealed partial class DiagnosticsViewModel : ViewModelBase
{
    private readonly IInventraApiClient _apiClient;
    private readonly ICloudConnectivityService _connectivityService;
    private readonly IIdentitySessionService _identityService;
    private readonly IProductRepository _productRepository;
    private readonly ISalesRepository _salesRepository;
    private readonly IOfflineQueueRepository _queueRepository;
    private readonly IGlobalMedicineCacheRepository _globalCacheRepository;
    private readonly IAppLogger _logger;
    private readonly DatabaseContext _dbContext;

    [ObservableProperty]
    private string _appVersion = "2.1.0-native (Phase 3)";

    [ObservableProperty]
    private string _dotNetVersion = Environment.Version.ToString();

    [ObservableProperty]
    private string _osVersion = Environment.OSVersion.ToString();

    [ObservableProperty]
    private string _databasePath = string.Empty;

    [ObservableProperty]
    private string _databaseStatus = "Connected (SQLite WAL)";

    [ObservableProperty]
    private int _productCount;

    [ObservableProperty]
    private int _cachedGlobalMedicineCount;

    [ObservableProperty]
    private int _salesCount;

    [ObservableProperty]
    private int _pendingSyncCount;

    [ObservableProperty]
    private string _cloudStatus = "Checking...";

    [ObservableProperty]
    private string _apiBaseUrl = "http://localhost:8081";

    [ObservableProperty]
    private string _catalogApiStatus = "Idle";

    [ObservableProperty]
    private string _lastCatalogUrl = "Not queried";

    [ObservableProperty]
    private string _lastCatalogError = "None";

    [ObservableProperty]
    private string _lastCatalogLatency = "--";

    [ObservableProperty]
    private string _deviceId = "--";

    [ObservableProperty]
    private string _deviceCode = "--";

    [ObservableProperty]
    private string _businessName = "--";

    [ObservableProperty]
    private string _storeName = "--";

    [ObservableProperty]
    private string _gstin = "--";

    [ObservableProperty]
    private string _authStatus = "Checking...";

    [ObservableProperty]
    private string _deviceAuthStatus = "ACTIVE";

    [ObservableProperty]
    private string _userAccount = "--";

    [ObservableProperty]
    private string _userRole = "--";

    [ObservableProperty]
    private string _permissionsList = "--";

    [ObservableProperty]
    private string _lastCloudAuthAt = "--";

    [ObservableProperty]
    private string _lastSyncTime = "--";

    [ObservableProperty]
    private string _offlinePolicyStatus = "--";

    [ObservableProperty]
    private int _failedSyncCount;

    [ObservableProperty]
    private string _diagnosticMessage = string.Empty;

    public DiagnosticsViewModel(
        IInventraApiClient apiClient,
        ICloudConnectivityService connectivityService,
        IIdentitySessionService identityService,
        IProductRepository productRepository,
        ISalesRepository salesRepository,
        IOfflineQueueRepository queueRepository,
        IGlobalMedicineCacheRepository globalCacheRepository,
        IAppLogger logger,
        DatabaseContext dbContext)
    {
        _apiClient = apiClient;
        _connectivityService = connectivityService;
        _identityService = identityService;
        _productRepository = productRepository;
        _salesRepository = salesRepository;
        _queueRepository = queueRepository;
        _globalCacheRepository = globalCacheRepository;
        _logger = logger;
        _dbContext = dbContext;

        DatabasePath = _dbContext.DatabasePath;
        ApiBaseUrl = _apiClient.BaseUrl;
    }

    public async Task RefreshDiagnosticsAsync()
    {
        try
        {
            var device = await _identityService.GetDeviceAsync();
            DeviceId = device.DeviceId;
            DeviceCode = device.DeviceCode;
            DeviceAuthStatus = device.Status;

            var session = await _identityService.GetSessionAsync();
            if (session != null && session.IsAuthenticated)
            {
                BusinessName = $"{session.BusinessName} ({session.BusinessId})";
                StoreName = $"{session.StoreName} ({session.StoreId})";
                Gstin = session.Gstin ?? "Not Configured";
                UserAccount = $"{session.FullName} ({session.Email})";
                UserRole = session.Role;
                PermissionsList = string.Join(", ", session.Permissions);

                LastCloudAuthAt = DateTimeOffset.FromUnixTimeMilliseconds(session.LastCloudValidationAt).ToString("yyyy-MM-dd HH:mm:ss");

                var nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                var remainingDays = Math.Max(0, session.OfflinePolicyMaxDays - (int)((nowMs - session.LastCloudValidationAt) / (24L * 60 * 60 * 1000)));
                OfflinePolicyStatus = session.IsOfflineExpired(nowMs)
                    ? $"EXPIRED ({session.OfflinePolicyMaxDays} days limit exceeded)"
                    : $"Valid ({remainingDays} days remaining of {session.OfflinePolicyMaxDays}-day policy)";

                AuthStatus = device.IsRevoked
                    ? "REVOKED (Access Blocked)"
                    : (_connectivityService.IsOnline ? "Authenticated & Online" : "Offline Authorized");

                ProductCount = await _productRepository.GetProductCountAsync(session.BusinessId);
                var recentSales = await _salesRepository.GetRecentSalesAsync(session.BusinessId, session.StoreId, 1000);
                SalesCount = recentSales.Count;
                PendingSyncCount = await _queueRepository.GetPendingCountAsync(session.BusinessId);
                FailedSyncCount = await _queueRepository.GetFailedCountAsync(session.BusinessId);
            }
            else
            {
                AuthStatus = "Login Required";
                OfflinePolicyStatus = "Not Established";
                UserAccount = "None";
                UserRole = "None";
                PermissionsList = "None";
                LastCloudAuthAt = "Never";
            }

            CachedGlobalMedicineCount = await _globalCacheRepository.GetCachedCountAsync();

            CloudStatus = _connectivityService.IsOnline ? "ONLINE (Connected)" : "OFFLINE (Local Mode)";
            LastCatalogUrl = _apiClient.LastCatalogRequestUrl ?? "Not yet queried";
            LastCatalogLatency = $"{_apiClient.LastCatalogDurationMs} ms";
            LastCatalogError = string.IsNullOrEmpty(_apiClient.LastCatalogErrorMessage) ? "None" : _apiClient.LastCatalogErrorMessage;
            CatalogApiStatus = _apiClient.LastCatalogStatusCode > 0
                ? $"HTTP {_apiClient.LastCatalogStatusCode} ({_apiClient.LastCatalogResultCount} records)"
                : (_connectivityService.IsOnline ? "Ready" : "Offline");
        }
        catch (Exception ex)
        {
            _logger.Error(LogCategory.STARTUP, "Failed refreshing diagnostics", ex);
        }
    }

    [RelayCommand]
    public void OpenLogsFolder()
    {
        try
        {
            var logsDir = _logger.LogsDirectory;
            if (!Directory.Exists(logsDir)) Directory.CreateDirectory(logsDir);
            Process.Start(new ProcessStartInfo
            {
                FileName = logsDir,
                UseShellExecute = true,
                Verb = "open"
            });
            DiagnosticMessage = $"Opened logs directory: {logsDir}";
        }
        catch (Exception ex)
        {
            DiagnosticMessage = $"Could not open logs folder: {ex.Message}";
        }
    }

    [RelayCommand]
    public void OpenDataFolder()
    {
        try
        {
            var dataDir = Path.GetDirectoryName(DatabasePath) ?? DatabasePath;
            if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
            Process.Start(new ProcessStartInfo
            {
                FileName = dataDir,
                UseShellExecute = true,
                Verb = "open"
            });
            DiagnosticMessage = $"Opened data directory: {dataDir}";
        }
        catch (Exception ex)
        {
            DiagnosticMessage = $"Could not open data folder: {ex.Message}";
        }
    }

    [RelayCommand]
    public async Task RunConnectivityTestAsync()
    {
        DiagnosticMessage = "Testing connectivity to Inventra Cloud...";
        _logger.Info(LogCategory.API, $"Manual connectivity test initiated to {ApiBaseUrl}");

        var sw = Stopwatch.StartNew();
        var online = await _connectivityService.CheckConnectivityNowAsync();
        sw.Stop();

        await RefreshDiagnosticsAsync();
        CloudStatus = online ? $"ONLINE (Ping: {sw.ElapsedMilliseconds}ms)" : "OFFLINE (Host Unreachable)";
        DiagnosticMessage = online
            ? $"Cloud server reachable in {sw.ElapsedMilliseconds}ms. All sync endpoints active."
            : $"Could not reach Inventra Cloud at {ApiBaseUrl}. Running in resilient local offline mode.";
    }

    [RelayCommand]
    public async Task RunDatabaseCheckAsync()
    {
        DiagnosticMessage = "Running SQLite database integrity check...";
        _logger.Info(LogCategory.DATABASE, "Manual database integrity check initiated");

        try
        {
            await using var conn = _dbContext.CreateConnection();
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "PRAGMA integrity_check;";
            var result = (string?)await cmd.ExecuteScalarAsync();

            DatabaseStatus = result == "ok" ? "Healthy (PRAGMA integrity_check: ok)" : $"Warning: {result}";
            DiagnosticMessage = $"Database integrity: {result}. Total products: {ProductCount}, Batches cached: {CachedGlobalMedicineCount}, Sales: {SalesCount}.";
            await RefreshDiagnosticsAsync();
        }
        catch (Exception ex)
        {
            DatabaseStatus = $"Error: {ex.Message}";
            DiagnosticMessage = $"Database check failed: {ex.Message}";
            _logger.Error(LogCategory.DATABASE, "Database check failed", ex);
        }
    }

    public string BuildDiagnosticsReport()
    {
        var sb = new StringBuilder();
        sb.AppendLine("=== INVENTRA DESKTOP ERP DIAGNOSTIC REPORT ===");
        sb.AppendLine($"Generated At: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
        sb.AppendLine($"App Version: {AppVersion}");
        sb.AppendLine($".NET Runtime: {DotNetVersion}");
        sb.AppendLine($"Operating System: {OsVersion}");
        sb.AppendLine($"Terminal Device Code: {DeviceCode}");
        sb.AppendLine($"Terminal Device ID: {DeviceId}");
        sb.AppendLine($"Assigned Business: {BusinessName}");
        sb.AppendLine($"Assigned Store: {StoreName}");
        sb.AppendLine($"GSTIN: {Gstin}");
        sb.AppendLine($"Cloud Connectivity: {CloudStatus}");
        sb.AppendLine($"API Endpoint: {ApiBaseUrl}");
        sb.AppendLine($"Catalog API Status: {CatalogApiStatus}");
        sb.AppendLine($"Last Catalog URL: {LastCatalogUrl}");
        sb.AppendLine($"Last Catalog Error: {LastCatalogError}");
        sb.AppendLine($"Last Catalog Latency: {LastCatalogLatency}");
        sb.AppendLine($"Local Database Path: {DatabasePath}");
        sb.AppendLine($"Database Status: {DatabaseStatus}");
        sb.AppendLine($"Catalog Products Count: {ProductCount}");
        sb.AppendLine($"Global Medicines Cached: {CachedGlobalMedicineCount}");
        sb.AppendLine($"Local Sales Count: {SalesCount}");
        sb.AppendLine($"Pending Sync Operations: {PendingSyncCount}");
        sb.AppendLine($"Logs Location: {_logger.LogsDirectory}");
        sb.AppendLine("===============================================");
        return sb.ToString();
    }
}
