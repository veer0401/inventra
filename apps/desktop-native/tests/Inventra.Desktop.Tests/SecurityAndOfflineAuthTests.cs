using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Core.Domain.Sync;
using Inventra.Desktop.Data;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Logging;
using Inventra.Desktop.Infrastructure.Sync;
using Xunit;

namespace Inventra.Desktop.Tests;

public class SecurityAndOfflineAuthTests : IDisposable
{
    private readonly string _testDbPath;
    private readonly DatabaseContext _dbContext;
    private readonly InMemorySecureStorage _secureStorage;
    private readonly TestLogger _logger;

    public SecurityAndOfflineAuthTests()
    {
        _testDbPath = Path.Combine(Path.GetTempPath(), $"inventra_sec_test_{Guid.NewGuid():N}.db");
        _dbContext = new DatabaseContext(_testDbPath);
        _secureStorage = new InMemorySecureStorage();
        _logger = new TestLogger();
    }

    public void Dispose()
    {
        try
        {
            if (File.Exists(_testDbPath)) File.Delete(_testDbPath);
            var wal = _testDbPath + "-wal";
            if (File.Exists(wal)) File.Delete(wal);
            var shm = _testDbPath + "-shm";
            if (File.Exists(shm)) File.Delete(shm);
        }
        catch
        {
            // Ignore cleanup exceptions
        }
    }

    // =========================================================================
    // 1. SECURE STORAGE TESTS (DPAPI OS-VAULT)
    // =========================================================================

    [Fact]
    public async Task WindowsSecureStorage_ProtectsAndRetrievesSecret()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"inventra_vault_{Guid.NewGuid():N}");
        var storage = new WindowsSecureStorageService(tempDir);
        var secret = "super_secret_refresh_token_12345";

        try
        {
            await storage.SaveRefreshTokenAsync(secret);
            var retrieved = await storage.GetRefreshTokenAsync();
            Assert.Equal(secret, retrieved);

            await storage.ClearCredentialsAsync();
            var cleared = await storage.GetRefreshTokenAsync();
            Assert.Null(cleared);

            // Also test Encrypt / Decrypt
            var plain = "custom_confidential_payload";
            var cipher = storage.Encrypt(plain);
            Assert.NotEqual(plain, cipher);
            var decrypted = storage.Decrypt(cipher);
            Assert.Equal(plain, decrypted);
        }
        finally
        {
            try
            {
                if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
            }
            catch
            {
                // Ignore cleanup
            }
        }
    }

    // =========================================================================
    // 2. SQLITE SECURITY TESTS (NO PASSWORD, NO RAW ACCESS TOKEN IN SQLITE)
    // =========================================================================

    [Fact]
    public async Task SQLite_DoesNotStorePasswordsOrRawTokens()
    {
        await _dbContext.InitializeAsync();

        // Verify SQLite schema contains NO password and NO access token columns in auth_session
        using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "PRAGMA table_info(auth_session);";
        using var reader = await cmd.ExecuteReaderAsync();

        var columnNames = new List<string>();
        while (await reader.ReadAsync())
        {
            columnNames.Add(reader.GetString(1).ToLowerInvariant());
        }

        Assert.DoesNotContain("password", columnNames);
        Assert.DoesNotContain("password_hash", columnNames);
        Assert.DoesNotContain("raw_token", columnNames);
        Assert.DoesNotContain("jwt", columnNames);
        Assert.DoesNotContain("access_token", columnNames);
        Assert.Contains("encrypted_refresh_token", columnNames);
        Assert.Contains("permissions_json", columnNames);
        Assert.Contains("authorized_at", columnNames);
        Assert.Contains("last_cloud_validation_at", columnNames);
        Assert.Contains("offline_policy_max_days", columnNames);
    }

    // =========================================================================
    // 3. AUTHORIZATION & ROLE/PERMISSION ENFORCEMENT
    // =========================================================================

    [Fact]
    public void AppPermissions_MapsRolesToPermissionsCorrectly()
    {
        var ownerPerms = AppPermissions.GetDefaultPermissionsForRole("OWNER");
        Assert.Contains(AppPermissions.SaleCreate, ownerPerms);
        Assert.Contains(AppPermissions.InventoryAdjust, ownerPerms);
        Assert.Contains(AppPermissions.ProductCreate, ownerPerms);
        Assert.Contains(AppPermissions.SettingsManage, ownerPerms);
        Assert.Contains(AppPermissions.DeviceManage, ownerPerms);

        var cashierPerms = AppPermissions.GetDefaultPermissionsForRole("CASHIER");
        Assert.Contains(AppPermissions.SaleCreate, cashierPerms);
        Assert.Contains(AppPermissions.SaleView, cashierPerms);
        Assert.Contains(AppPermissions.InventoryView, cashierPerms);
        Assert.DoesNotContain(AppPermissions.InventoryAdjust, cashierPerms);
        Assert.DoesNotContain(AppPermissions.ProductCreate, cashierPerms);
        Assert.DoesNotContain(AppPermissions.SettingsManage, cashierPerms);
        Assert.DoesNotContain(AppPermissions.DeviceManage, cashierPerms);
    }

    [Fact]
    public void AuthorizationService_EnforcesPermissionsAtDataServiceBoundary()
    {
        var cashierSession = new UserSession
        {
            UserId = "user-cashier",
            Email = "cashier@inventra.com",
            Role = "CASHIER",
            Permissions = AppPermissions.GetDefaultPermissionsForRole("CASHIER"),
            BusinessId = "biz-1",
            StoreId = "store-1"
        };

        var authService = new AuthorizationService(() => cashierSession, _logger);

        // Cashier can create sale
        Assert.True(authService.HasPermission(AppPermissions.SaleCreate));
        authService.RequirePermission(AppPermissions.SaleCreate);

        // Cashier CANNOT adjust inventory -> throws UnauthorizedAccessException
        Assert.False(authService.HasPermission(AppPermissions.InventoryAdjust));
        Assert.Throws<UnauthorizedAccessException>(() =>
            authService.RequirePermission(AppPermissions.InventoryAdjust));

        // Cashier CANNOT create medicine -> throws UnauthorizedAccessException
        Assert.False(authService.HasPermission(AppPermissions.ProductCreate));
        Assert.Throws<UnauthorizedAccessException>(() =>
            authService.RequirePermission(AppPermissions.ProductCreate));
    }

    // =========================================================================
    // 4. STARTUP STATE MACHINE & OFFLINE AUTHORIZATION POLICY
    // =========================================================================

    [Fact]
    public async Task Startup_NoSavedSession_TransitionsToLoginRequired()
    {
        await _dbContext.InitializeAsync();
        var apiClient = new MockInventraApiClient();

        var sessionService = new IdentitySessionService(
            _dbContext,
            apiClient,
            _secureStorage,
            _logger);

        var validation = await sessionService.ValidateStartupSessionAsync(isOnline: false);

        Assert.Equal(StartupState.LoginRequired, validation.State);
    }

    [Fact]
    public async Task Startup_OfflineWithValidSession_EntersReadyOffline()
    {
        await _dbContext.InitializeAsync();

        // Seed paired device and session in SQLite
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        using (var connection = _dbContext.CreateConnection())
        {
            await connection.OpenAsync();
            using var devCmd = connection.CreateCommand();
            devCmd.CommandText = @"
                INSERT OR REPLACE INTO device_identity (device_id, device_name, device_code, business_id, store_id, status, registered_at)
                VALUES ('dev-1', 'Terminal 1', 'POS-001', 'biz-1', 'store-1', 'ACTIVE', @now);
            ";
            devCmd.Parameters.AddWithValue("@now", now);
            await devCmd.ExecuteNonQueryAsync();

            using var sCmd = connection.CreateCommand();
            sCmd.CommandText = @"
                INSERT INTO auth_session (
                    id, user_id, email, full_name, role, business_id, business_name,
                    store_id, store_name, gstin, encrypted_refresh_token,
                    permissions_json, authorized_at, last_cloud_validation_at, offline_policy_max_days,
                    token_expires_at, updated_at
                ) VALUES (
                    'ACTIVE', 'u1', 'owner@inventra.com', 'Owner', 'OWNER', 'biz-1', 'Biz 1',
                    'store-1', 'Store 1', 'GST123', 'ENC:token', '[""SALE_CREATE"",""INVENTORY_VIEW""]',
                    @now, @now, 14, @now, @now
                );
            ";
            sCmd.Parameters.AddWithValue("@now", now);
            await sCmd.ExecuteNonQueryAsync();
        }

        var apiClient = new MockInventraApiClient();
        var sessionService = new IdentitySessionService(
            _dbContext,
            apiClient,
            _secureStorage,
            _logger);

        var validation = await sessionService.ValidateStartupSessionAsync(isOnline: false);

        Assert.Equal(StartupState.ReadyOffline, validation.State);
        Assert.NotNull(validation.Session);
        Assert.Equal("biz-1", validation.Session.BusinessId);
        Assert.Equal("store-1", validation.Session.StoreId);
    }

    [Fact]
    public async Task Startup_OfflineWithExpiredPolicy_EntersOfflinePolicyExpired()
    {
        await _dbContext.InitializeAsync();

        // Establish paired device and session with last validation 20 days ago (> 14 days max)
        var oldValidation = DateTimeOffset.UtcNow.AddDays(-20).ToUnixTimeMilliseconds();
        using (var connection = _dbContext.CreateConnection())
        {
            await connection.OpenAsync();
            using var devCmd = connection.CreateCommand();
            devCmd.CommandText = @"
                INSERT OR REPLACE INTO device_identity (device_id, device_name, device_code, business_id, store_id, status, registered_at)
                VALUES ('dev-1', 'Terminal 1', 'POS-001', 'biz-1', 'store-1', 'ACTIVE', @old);
            ";
            devCmd.Parameters.AddWithValue("@old", oldValidation);
            await devCmd.ExecuteNonQueryAsync();

            using var sCmd = connection.CreateCommand();
            sCmd.CommandText = @"
                INSERT INTO auth_session (
                    id, user_id, email, full_name, role, business_id, business_name,
                    store_id, store_name, gstin, encrypted_refresh_token,
                    permissions_json, authorized_at, last_cloud_validation_at, offline_policy_max_days,
                    token_expires_at, updated_at
                ) VALUES (
                    'ACTIVE', 'u1', 'owner@inventra.com', 'Owner', 'OWNER', 'biz-1', 'Biz 1',
                    'store-1', 'Store 1', 'GST123', 'ENC:token', '[""SALE_CREATE""]',
                    @old, @old, 14, @old, @old
                );
            ";
            sCmd.Parameters.AddWithValue("@old", oldValidation);
            await sCmd.ExecuteNonQueryAsync();
        }

        var apiClient = new MockInventraApiClient();
        var sessionService = new IdentitySessionService(
            _dbContext,
            apiClient,
            _secureStorage,
            _logger);

        var validation = await sessionService.ValidateStartupSessionAsync(isOnline: false);

        Assert.Equal(StartupState.OfflinePolicyExpired, validation.State);
    }

    // =========================================================================
    // 5. CLOUD RE-VALIDATION & DEVICE REVOCATION
    // =========================================================================

    [Fact]
    public async Task Startup_Online_DeviceRevokedByServer_TransitionsToDeviceRevoked()
    {
        await _dbContext.InitializeAsync();

        // Seed paired device and session with a refresh token in secure storage
        await _secureStorage.SaveRefreshTokenAsync("test_refresh_token");

        using (var connection = _dbContext.CreateConnection())
        {
            await connection.OpenAsync();
            using var devCmd = connection.CreateCommand();
            devCmd.CommandText = @"
                INSERT OR REPLACE INTO device_identity (device_id, device_name, device_code, business_id, store_id, status, registered_at)
                VALUES ('dev-1', 'Terminal 1', 'POS-001', 'biz-1', 'store-1', 'ACTIVE', 1000);
            ";
            await devCmd.ExecuteNonQueryAsync();

            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            using var sCmd = connection.CreateCommand();
            sCmd.CommandText = @"
                INSERT INTO auth_session (
                    id, user_id, email, full_name, role, business_id, business_name,
                    store_id, store_name, gstin, encrypted_refresh_token,
                    permissions_json, authorized_at, last_cloud_validation_at, offline_policy_max_days,
                    token_expires_at, updated_at
                ) VALUES (
                    'ACTIVE', 'u1', 'owner@inventra.com', 'Owner', 'OWNER', 'biz-1', 'Biz 1',
                    'store-1', 'Store 1', 'GST123', 'ENC:token', '[""SALE_CREATE""]',
                    @now, @now, 14, @now, @now
                );
            ";
            sCmd.Parameters.AddWithValue("@now", now);
            await sCmd.ExecuteNonQueryAsync();
        }

        // Configure API client to return DEVICE_REVOKED
        var apiClient = new MockInventraApiClient
        {
            RefreshResult = new AuthResult(
                Success: false,
                Data: null,
                ErrorCode: "DEVICE_REVOKED",
                ErrorMessage: "Workstation authorization revoked by administrator.",
                StatusCode: 403,
                IsDeviceRevoked: true)
        };

        var sessionService = new IdentitySessionService(
            _dbContext,
            apiClient,
            _secureStorage,
            _logger);

        var validation = await sessionService.ValidateStartupSessionAsync(isOnline: true);

        Assert.Equal(StartupState.DeviceRevoked, validation.State);
        Assert.Null(await _secureStorage.GetRefreshTokenAsync()); // Secret purged
        Assert.True(validation.Device.IsRevoked);
    }

    // =========================================================================
    // 6. FIRST LOGIN & DEVICE REGISTRATION FLOW
    // =========================================================================

    [Fact]
    public async Task PairWithCloudAsync_FirstLogin_RegistersDeviceAndBindsContext()
    {
        await _dbContext.InitializeAsync();
        var apiClient = new MockInventraApiClient();

        var sessionService = new IdentitySessionService(
            _dbContext,
            apiClient,
            _secureStorage,
            _logger);

        var (success, error) = await sessionService.PairWithCloudAsync("admin@inventra.com", "SecretPass123!");

        Assert.True(success);
        Assert.Null(error);

        // Verify session loaded
        var session = await sessionService.GetSessionAsync();
        Assert.NotNull(session);
        Assert.Equal("admin@inventra.com", session.Email);
        Assert.Equal("biz_test", session.BusinessId);
        Assert.Equal("store_test", session.StoreId);
        Assert.Equal("OWNER", session.Role);
        Assert.Contains(AppPermissions.SaleCreate, session.Permissions);
        Assert.Contains(AppPermissions.InventoryAdjust, session.Permissions);

        // Verify refresh token is stored in OS-protected secure storage
        var token = await _secureStorage.GetRefreshTokenAsync();
        Assert.Equal("rt_test", token);

        // Verify device registration updated
        var device = await sessionService.GetDeviceAsync();
        Assert.True(device.IsPaired);
        Assert.Equal("biz_test", device.BusinessId);
        Assert.Equal("store_test", device.StoreId);
    }

    // =========================================================================
    // 7. LOGOUT PURGES CREDENTIALS AND SESSION CONTEXT
    // =========================================================================

    [Fact]
    public async Task Logout_ClearsSecureCredentialsAndLocalSession()
    {
        await _dbContext.InitializeAsync();
        var apiClient = new MockInventraApiClient();

        var sessionService = new IdentitySessionService(
            _dbContext,
            apiClient,
            _secureStorage,
            _logger);

        // Perform login
        await sessionService.PairWithCloudAsync("user@inventra.com", "Pass123!");
        Assert.NotNull(await sessionService.GetSessionAsync());
        Assert.NotNull(await _secureStorage.GetRefreshTokenAsync());

        // Perform Logout
        await sessionService.LogoutAsync();

        // Verify session and credentials cleared
        Assert.Null(await sessionService.GetSessionAsync());
        Assert.Null(await _secureStorage.GetRefreshTokenAsync());

        // Verify SQLite auth_session table is empty
        using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM auth_session;";
        var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        Assert.Equal(0, count);
    }

    // =========================================================================
    // 8. OFFLINE QUEUE TRACKS SERVER REJECTIONS (NO SILENT DELETION)
    // =========================================================================

    [Fact]
    public async Task OfflineQueue_PreservesFailedOperations_WithoutSilentDeletion()
    {
        await _dbContext.InitializeAsync();
        var queueRepo = new OfflineQueueRepository(_dbContext);

        var op = await queueRepo.EnqueueOperationAsync(
            businessId: "biz-123",
            storeId: "store-456",
            deviceId: "dev-789",
            userId: "user-001",
            eventType: "INVENTORY_ADJUST",
            payloadJson: "{\"quantity\": 10}",
            idempotencyKey: "idemp-001");

        Assert.NotNull(op);

        // Mark failed due to revoked permissions on server
        await queueRepo.MarkFailedAsync(op.OperationId, "PERMISSION_REVOKED", "Server rejected: user lacks INVENTORY_ADJUST permission.");

        var failedCount = await queueRepo.GetFailedCountAsync("biz-123");
        Assert.Equal(1, failedCount);

        var failedList = await queueRepo.GetFailedOperationsAsync("biz-123");
        Assert.Single(failedList);
        Assert.Equal("PERMISSION_REVOKED", failedList[0].ErrorCode);
        Assert.Contains("user lacks INVENTORY_ADJUST", failedList[0].ErrorMessage);
    }

    // =========================================================================
    // 9. SECURITY AUDIT LOGGING CONSTANTS
    // =========================================================================

    [Fact]
    public void SecurityAuditEvents_ContainStandardEventNames()
    {
        Assert.Equal("LOGIN_STARTED", SecurityAuditEvents.LoginStarted);
        Assert.Equal("LOGIN_SUCCESS", SecurityAuditEvents.LoginSuccess);
        Assert.Equal("LOGIN_FAILED", SecurityAuditEvents.LoginFailed);
        Assert.Equal("DEVICE_REGISTERED", SecurityAuditEvents.DeviceRegistered);
        Assert.Equal("DEVICE_AUTHORIZED", SecurityAuditEvents.DeviceAuthorized);
        Assert.Equal("DEVICE_REVOKED", SecurityAuditEvents.DeviceRevoked);
        Assert.Equal("SESSION_REFRESH", SecurityAuditEvents.SessionRefresh);
        Assert.Equal("SESSION_REFRESH_FAILED", SecurityAuditEvents.SessionRefreshFailed);
        Assert.Equal("OFFLINE_MODE_ENTERED", SecurityAuditEvents.OfflineModeEntered);
        Assert.Equal("OFFLINE_AUTH_ACCEPTED", SecurityAuditEvents.OfflineAuthAccepted);
        Assert.Equal("OFFLINE_AUTH_REJECTED", SecurityAuditEvents.OfflineAuthRejected);
        Assert.Equal("PERMISSION_UPDATED", SecurityAuditEvents.PermissionUpdated);
        Assert.Equal("SYNC_AUTH_REJECTED", SecurityAuditEvents.SyncAuthRejected);
        Assert.Equal("LOGOUT", SecurityAuditEvents.Logout);
    }
}

// =============================================================================
// TEST DOUBLES / STUBS
// =============================================================================

internal sealed class InMemorySecureStorage : ISecureStorageService
{
    private string? _token;

    public Task SaveRefreshTokenAsync(string refreshToken)
    {
        _token = refreshToken;
        return Task.CompletedTask;
    }

    public Task<string?> GetRefreshTokenAsync() => Task.FromResult(_token);

    public Task ClearCredentialsAsync()
    {
        _token = null;
        return Task.CompletedTask;
    }

    public string Encrypt(string plaintext) => "ENC:" + plaintext;
    public string? Decrypt(string ciphertext) => ciphertext?.StartsWith("ENC:") == true ? ciphertext[4..] : ciphertext;
}

internal sealed class TestLogger : IAppLogger
{
    public string LogsDirectory => "test-logs";
    public List<string> LoggedEvents { get; } = new();

    public void Log(AppLogLevel level, LogCategory category, string message, Exception? ex = null) =>
        LoggedEvents.Add($"{level}:{category}:{message}");

    public void Info(LogCategory category, string message) => LoggedEvents.Add($"INFO:{category}:{message}");
    public void Warn(LogCategory category, string message, Exception? ex = null) => LoggedEvents.Add($"WARN:{category}:{message}");
    public void Error(LogCategory category, string message, Exception? ex = null) => LoggedEvents.Add($"ERROR:{category}:{message}");
    public void Debug(LogCategory category, string message) => LoggedEvents.Add($"DEBUG:{category}:{message}");

    public void LogApi(string method, string endpoint, int statusCode, long durationMs, string? error = null) { }
    public void LogSync(string action, int pendingCount, string status, string? details = null) { }
    public void LogCatalog(string action, string query, int resultCount, long durationMs, string status, string? error = null) { }
    public IReadOnlyList<string> GetRecentLogLines(string fileName = "inventra.log", int maxLines = 100) => LoggedEvents;
}

internal sealed class MockInventraApiClient : IInventraApiClient
{
    public string BaseUrl { get; set; } = "http://localhost:8081";
    public string? LastCatalogRequestUrl { get; set; }
    public int LastCatalogStatusCode { get; set; }
    public string? LastCatalogErrorMessage { get; set; }
    public long LastCatalogDurationMs { get; set; }
    public DateTime? LastCatalogSuccessfulSearchTime { get; set; }
    public int LastCatalogResultCount { get; set; }

    public AuthResult? RefreshResult { get; set; }
    public AuthResult? LoginResult { get; set; }

    public void SetAuthToken(string? token) { }

    public bool PingResult { get; set; } = true;
    public Func<string, List<SyncOperationApiDto>, SyncUploadApiResponse?>? UploadHandler { get; set; }
    public List<List<SyncOperationApiDto>> UploadedBatches { get; } = new();
    public Func<CreateSupplierApiRequest, ApiResult<SupplierApiDto>>? CreateSupplierHandler { get; set; }
    public Func<string, UpdateSupplierApiRequest, ApiResult<SupplierApiDto>>? UpdateSupplierHandler { get; set; }
    public int CreateSupplierCalls { get; private set; }

    public Task<bool> PingAsync(CancellationToken ct = default) => Task.FromResult(PingResult);

    public Task<AuthResult> LoginWithResultAsync(string email, string password, string? deviceId = null, string? deviceCode = null, CancellationToken ct = default) =>
        Task.FromResult(LoginResult ?? new AuthResult(
            Success: true,
            Data: new AuthApiResponse(
                AccessToken: "at_test",
                RefreshToken: "rt_test",
                ExpiresIn: 3600,
                User: new UserSummaryApiDto("user_test", email, "Test User", null, "ACTIVE"),
                ActiveContext: new ActiveContextApiDto("biz_test", "Test Biz", "store_test", "Main Store", "ST01", "OWNER", deviceId),
                Memberships: null),
            ErrorCode: null,
            ErrorMessage: null,
            StatusCode: 200));

    public Task<AuthApiResponse?> LoginAsync(string email, string password, string? deviceId = null, string? deviceCode = null, CancellationToken ct = default) =>
        Task.FromResult<AuthApiResponse?>(null);

    public Task<AuthResult> RefreshTokenWithResultAsync(string refreshToken, CancellationToken ct = default) =>
        Task.FromResult(RefreshResult ?? new AuthResult(
            Success: true,
            Data: new AuthApiResponse(
                AccessToken: "at_refreshed",
                RefreshToken: "rt_refreshed",
                ExpiresIn: 3600,
                User: new UserSummaryApiDto("user_test", "test@inventra.com", "Test User", null, "ACTIVE"),
                ActiveContext: new ActiveContextApiDto("biz_test", "Test Biz", "store_test", "Main Store", "ST01", "OWNER", null),
                Memberships: null),
            ErrorCode: null,
            ErrorMessage: null,
            StatusCode: 200));

    public Task<AuthApiResponse?> RefreshTokenAsync(string refreshToken, CancellationToken ct = default) =>
        Task.FromResult<AuthApiResponse?>(null);

    public Task<bool> LogoutAsync(string refreshToken, CancellationToken ct = default) => Task.FromResult(true);

    public Task<DeviceApiResponse?> RegisterDeviceAsync(RegisterDeviceApiRequest request, CancellationToken ct = default) =>
        Task.FromResult<DeviceApiResponse?>(new DeviceApiResponse("dev-1", request.DeviceName, request.DeviceCode, "ACTIVE"));

    public Task<PageResponse<GlobalMedicineApiDto>?> SearchGlobalMedicinesAsync(string? query, int page = 0, int size = 20, CancellationToken ct = default) =>
        Task.FromResult<PageResponse<GlobalMedicineApiDto>?>(new PageResponse<GlobalMedicineApiDto>(new List<GlobalMedicineApiDto>(), 0, 0, size, page));

    public Task<CatalogSearchResult> QueryGlobalMedicinesWithDiagnosticsAsync(string? query, int page = 0, int size = 20, CancellationToken ct = default) =>
        Task.FromResult(new CatalogSearchResult(true, null, null, 200, 50));

    public Task<ProductApiDto?> QuickImportGlobalMedicineAsync(string globalMedicineId, CancellationToken ct = default) =>
        Task.FromResult<ProductApiDto?>(null);

    public Task<QuickImportResult> QuickImportWithDiagnosticsAsync(string globalMedicineId, CancellationToken ct = default) =>
        Task.FromResult(new QuickImportResult(true, null, null, 200, 50));

    public Task<PageResponse<ProductApiDto>?> ListProductsAsync(int page = 0, int size = 50, CancellationToken ct = default) =>
        Task.FromResult<PageResponse<ProductApiDto>?>(null);

    public Task<ProductApiDto?> CreateProductAsync(CreateProductApiRequest request, CancellationToken ct = default) =>
        Task.FromResult<ProductApiDto?>(null);

    public Func<string, List<SyncOperationApiDto>, ApiResult<SyncUploadApiResponse>>? UploadResultHandler { get; set; }
    public Func<long, ApiResult<SyncDownloadApiResponse>>? DownloadHandler { get; set; }
    public List<long> DownloadCursors { get; } = new();

    public Task<ApiResult<SyncUploadApiResponse>> UploadSyncBatchAsync(string deviceId, List<SyncOperationApiDto> ops, CancellationToken ct = default)
    {
        UploadedBatches.Add(ops);
        if (UploadResultHandler != null) return Task.FromResult(UploadResultHandler(deviceId, ops));

        var response = UploadHandler?.Invoke(deviceId, ops);
        return Task.FromResult(response != null
            ? ApiResult<SyncUploadApiResponse>.Ok(response, 200)
            : ApiResult<SyncUploadApiResponse>.Transient("mock server unreachable"));
    }

    public Task<ApiResult<SyncDownloadApiResponse>> DownloadSyncChangesAsync(long cursor, int limit = 100, CancellationToken ct = default)
    {
        DownloadCursors.Add(cursor);
        return Task.FromResult(DownloadHandler?.Invoke(cursor)
            ?? ApiResult<SyncDownloadApiResponse>.Transient("mock server unreachable"));
    }

    public Task<PageResponse<SupplierApiDto>?> ListSuppliersAsync(string? query = null, int page = 0, int size = 50, CancellationToken ct = default) =>
        Task.FromResult<PageResponse<SupplierApiDto>?>(new PageResponse<SupplierApiDto>(new List<SupplierApiDto>(), 0, 0, size, page));

    public Task<ApiResult<SupplierApiDto>> CreateSupplierAsync(CreateSupplierApiRequest request, CancellationToken ct = default)
    {
        CreateSupplierCalls++;
        return Task.FromResult(CreateSupplierHandler?.Invoke(request)
            ?? ApiResult<SupplierApiDto>.Transient("mock server unreachable"));
    }

    public Task<PageResponse<PurchaseOrderApiDto>?> ListPurchaseOrdersAsync(string? status = null, string? supplierId = null, string? query = null, int page = 0, int size = 50, CancellationToken ct = default) =>
        Task.FromResult<PageResponse<PurchaseOrderApiDto>?>(new PageResponse<PurchaseOrderApiDto>(new List<PurchaseOrderApiDto>(), 0, 0, size, page));

    public Func<string, PurchaseOrderApiDto?>? GetPurchaseOrderHandler { get; set; }

    public Task<PurchaseOrderApiDto?> GetPurchaseOrderAsync(string id, CancellationToken ct = default) =>
        Task.FromResult(GetPurchaseOrderHandler?.Invoke(id));

    public Task<PurchaseOrderApiDto?> CreatePurchaseOrderAsync(CreatePurchaseOrderApiRequest request, CancellationToken ct = default) =>
        Task.FromResult<PurchaseOrderApiDto?>(null);

    public Task<PurchaseOrderApiDto?> ConfirmPurchaseOrderAsync(string id, CancellationToken ct = default) =>
        Task.FromResult<PurchaseOrderApiDto?>(null);

    public Task<PageResponse<GoodsReceiptApiDto>?> ListGoodsReceiptsAsync(string? status = null, string? purchaseOrderId = null, string? supplierId = null, string? query = null, int page = 0, int size = 50, CancellationToken ct = default) =>
        Task.FromResult<PageResponse<GoodsReceiptApiDto>?>(new PageResponse<GoodsReceiptApiDto>(new List<GoodsReceiptApiDto>(), 0, 0, size, page));

    public Task<GoodsReceiptApiDto?> GetGoodsReceiptAsync(string id, CancellationToken ct = default) =>
        Task.FromResult<GoodsReceiptApiDto?>(null);

    public Task<GoodsReceiptApiDto?> CreateGoodsReceiptAsync(CreateGoodsReceiptApiRequest request, CancellationToken ct = default) =>
        Task.FromResult<GoodsReceiptApiDto?>(null);

    public Task<GoodsReceiptApiDto?> PostGoodsReceiptAsync(string id, CancellationToken ct = default) =>
        Task.FromResult<GoodsReceiptApiDto?>(null);

    public Task<ApiResult<SupplierApiDto>> UpdateSupplierAsync(string id, UpdateSupplierApiRequest request, CancellationToken ct = default) =>
        Task.FromResult(UpdateSupplierHandler?.Invoke(id, request)
            ?? ApiResult<SupplierApiDto>.Transient("mock server unreachable"));

    public Task<ProductApiDto?> UpdateProductAsync(string id, UpdateProductApiRequest request, CancellationToken ct = default) =>
        Task.FromResult<ProductApiDto?>(null);

    public Task<PageResponse<CustomerApiDto>?> ListCustomersAsync(string? query = null, int page = 0, int size = 50, CancellationToken ct = default) =>
        Task.FromResult<PageResponse<CustomerApiDto>?>(new PageResponse<CustomerApiDto>(new List<CustomerApiDto>(), 0, 0, size, page));

    public Task<CustomerApiDto?> CreateCustomerAsync(CreateCustomerApiRequest request, CancellationToken ct = default) =>
        Task.FromResult<CustomerApiDto?>(null);

    public Task<PageResponse<InventoryBatchApiDto>?> ListInventoryBatchesAsync(string? storeId = null, int? expiringWithinDays = null, bool expiredOnly = false, int page = 0, int size = 50, CancellationToken ct = default) =>
        Task.FromResult<PageResponse<InventoryBatchApiDto>?>(new PageResponse<InventoryBatchApiDto>(new List<InventoryBatchApiDto>(), 0, 0, size, page));
}
