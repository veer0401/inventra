using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Data;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Logging;
using Microsoft.Data.Sqlite;

namespace Inventra.Desktop.Infrastructure.Identity;

public sealed record StartupValidationResult(
    StartupState State,
    UserSession? Session,
    DeviceRegistration Device,
    string? Message = null,
    string? SafeReason = null
);

public interface IIdentitySessionService
{
    UserSession? CurrentSession { get; }
    DeviceRegistration? CurrentDevice { get; }
    Task<bool> HasPairedIdentityAsync();
    Task<UserSession?> GetSessionAsync();
    Task<UserSession?> RefreshSessionAsync();
    Task<DeviceRegistration> GetDeviceAsync();
    Task<(bool Success, string? Error)> PairWithCloudAsync(string email, string password, string? targetStoreId = null);
    Task<StartupValidationResult> ValidateStartupSessionAsync(bool isOnline);
    Task ClearSessionAsync();
    Task LogoutAsync();
}

public sealed class IdentitySessionService : IIdentitySessionService
{
    private readonly DatabaseContext _dbContext;
    private readonly IInventraApiClient _apiClient;
    private readonly ISecureStorageService _secureStorage;
    private readonly IAppLogger _logger;

    private UserSession? _cachedSession;
    private DeviceRegistration? _cachedDevice;

    public UserSession? CurrentSession => _cachedSession;
    public DeviceRegistration? CurrentDevice => _cachedDevice;

    public IdentitySessionService(
        DatabaseContext dbContext,
        IInventraApiClient apiClient,
        ISecureStorageService? secureStorage = null,
        IAppLogger? logger = null)
    {
        _dbContext = dbContext;
        _apiClient = apiClient;
        _secureStorage = secureStorage ?? new WindowsSecureStorageService();
        _logger = logger ?? AppLogger.Instance;
    }

    public async Task<DeviceRegistration> GetDeviceAsync()
    {
        if (_cachedDevice != null) return _cachedDevice;

        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var selectCmd = connection.CreateCommand();
        selectCmd.CommandText = @"
            SELECT device_id, device_name, device_code, business_id, store_id, status, registered_at
            FROM device_identity LIMIT 1;
        ";

        await using var reader = await selectCmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            _cachedDevice = new DeviceRegistration
            {
                DeviceId = reader.GetString(0),
                DeviceName = reader.GetString(1),
                DeviceCode = reader.GetString(2),
                BusinessId = reader.IsDBNull(3) ? null : reader.GetString(3),
                StoreId = reader.IsDBNull(4) ? null : reader.GetString(4),
                Status = reader.GetString(5),
                RegisteredAt = reader.GetInt64(6)
            };
            return _cachedDevice;
        }

        // Generate persistent local hardware identity
        var newDeviceId = Guid.NewGuid().ToString();
        var machineName = Environment.MachineName;
        var deviceCode = $"POS-{machineName[..Math.Min(8, machineName.Length)].ToUpperInvariant()}-{Random.Shared.Next(100, 999)}";
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        await using var insertCmd = connection.CreateCommand();
        insertCmd.CommandText = @"
            INSERT INTO device_identity (device_id, device_name, device_code, status, registered_at)
            VALUES (@id, @name, @code, 'ACTIVE', @now);
        ";
        insertCmd.Parameters.AddWithValue("@id", newDeviceId);
        insertCmd.Parameters.AddWithValue("@name", $"Terminal ({machineName})");
        insertCmd.Parameters.AddWithValue("@code", deviceCode);
        insertCmd.Parameters.AddWithValue("@now", now);
        await insertCmd.ExecuteNonQueryAsync();

        _cachedDevice = new DeviceRegistration
        {
            DeviceId = newDeviceId,
            DeviceName = $"Terminal ({machineName})",
            DeviceCode = deviceCode,
            Status = "ACTIVE",
            RegisteredAt = now
        };

        _logger.Log(AppLogLevel.INFO, LogCategory.AUTH,
            $"SECURITY EVENT: [{SecurityAuditEvents.DeviceRegistered}] Generated local device identity: {deviceCode} (ID: {newDeviceId})");

        return _cachedDevice;
    }

    public async Task<bool> HasPairedIdentityAsync()
    {
        var device = await GetDeviceAsync();
        if (!device.IsPaired) return false;

        var session = await GetSessionAsync();
        return session != null && session.IsAuthenticated;
    }

    public async Task<UserSession?> GetSessionAsync()
    {
        if (_cachedSession != null)
        {
            return _cachedSession;
        }

        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT user_id, email, full_name, role, business_id, business_name, store_id, store_name,
                   gstin, encrypted_refresh_token, token_expires_at, permissions_json,
                   authorized_at, last_cloud_validation_at, offline_policy_max_days
            FROM auth_session LIMIT 1;
        ";

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            var encRefresh = reader.IsDBNull(9) ? null : reader.GetString(9);
            var permissionsJson = reader.IsDBNull(11) ? "[]" : reader.GetString(11);

            // Attempt to retrieve refresh token from Windows DPAPI OS-vault first, then fallback to encrypted column
            var refreshToken = await _secureStorage.GetRefreshTokenAsync();
            if (string.IsNullOrEmpty(refreshToken) && !string.IsNullOrEmpty(encRefresh))
            {
                refreshToken = _secureStorage.Decrypt(encRefresh);
            }

            var permissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(permissionsJson);
                if (parsed != null && parsed.Count > 0)
                {
                    foreach (var p in parsed) permissions.Add(p);
                }
            }
            catch
            {
                // Fallback to role defaults
            }

            var role = reader.GetString(3);
            if (permissions.Count == 0)
            {
                permissions = AppPermissions.GetDefaultPermissionsForRole(role);
            }

            _cachedSession = new UserSession
            {
                UserId = reader.GetString(0),
                Email = reader.GetString(1),
                FullName = reader.GetString(2),
                Role = role,
                BusinessId = reader.GetString(4),
                BusinessName = reader.GetString(5),
                StoreId = reader.GetString(6),
                StoreName = reader.GetString(7),
                Gstin = reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
                RefreshToken = refreshToken,
                ExpiresAt = reader.IsDBNull(10) ? null : reader.GetInt64(10),
                Permissions = permissions,
                AuthorizedAt = reader.IsDBNull(12) ? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() : reader.GetInt64(12),
                LastCloudValidationAt = reader.IsDBNull(13) ? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() : reader.GetInt64(13),
                OfflinePolicyMaxDays = reader.IsDBNull(14) ? 14 : reader.GetInt32(14)
            };

            return _cachedSession;
        }

        return null;
    }

    public async Task<StartupValidationResult> ValidateStartupSessionAsync(bool isOnline)
    {
        var device = await GetDeviceAsync();
        var session = await GetSessionAsync();

        // 1. Missing local device binding or session metadata -> Prompt Login
        if (session == null || !device.IsPaired || !session.IsAuthenticated)
        {
            return new StartupValidationResult(
                StartupState.LoginRequired,
                null,
                device,
                "No authorized workstation session found. Please sign in."
            );
        }

        // 2. Locally flagged as revoked
        if (device.IsRevoked)
        {
            return new StartupValidationResult(
                StartupState.DeviceRevoked,
                session,
                device,
                "This terminal has been revoked.",
                "Workstation identity revoked by business administrator."
            );
        }

        // 3. Online path: Perform cloud re-validation & token refresh
        if (isOnline)
        {
            if (!string.IsNullOrEmpty(session.RefreshToken))
            {
                var refreshResult = await _apiClient.RefreshTokenWithResultAsync(session.RefreshToken);

                if (refreshResult.IsDeviceRevoked)
                {
                    await MarkDeviceRevokedAsync(device.DeviceId);
                    await ClearSessionCredentialsOnlyAsync();
                    device.Status = "REVOKED";

                    _logger.Log(AppLogLevel.WARN, LogCategory.AUTH,
                        $"SECURITY EVENT: [{SecurityAuditEvents.DeviceRevoked}] Cloud confirmed terminal revocation.");

                    return new StartupValidationResult(
                        StartupState.DeviceRevoked,
                        session,
                        device,
                        "This device is no longer authorized.",
                        refreshResult.ErrorMessage ?? "Terminal revoked by business administrator."
                    );
                }

                if (refreshResult.IsTokenExpired || refreshResult.StatusCode == 401 || refreshResult.StatusCode == 422)
                {
                    _logger.Log(AppLogLevel.WARN, LogCategory.AUTH,
                        $"SECURITY EVENT: [{SecurityAuditEvents.SessionRefreshFailed}] Cloud session expired or invalid.");

                    return new StartupValidationResult(
                        StartupState.SessionExpired,
                        session,
                        device,
                        "Cloud session expired. Please sign in to reconnect.",
                        refreshResult.ErrorMessage ?? "Session renewal token expired or invalid."
                    );
                }

                if (refreshResult.Success && refreshResult.Data != null)
                {
                    // Refresh token rotation (RTR)
                    var authData = refreshResult.Data;
                    var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    var expiresAt = now + (authData.ExpiresIn * 1000);

                    session.AccessToken = authData.AccessToken;
                    _apiClient.SetAuthToken(authData.AccessToken);

                    if (!string.IsNullOrEmpty(authData.RefreshToken))
                    {
                        session.RefreshToken = authData.RefreshToken;
                        await _secureStorage.SaveRefreshTokenAsync(authData.RefreshToken);
                    }

                    session.ExpiresAt = expiresAt;
                    session.LastCloudValidationAt = now;

                    // Update permissions snapshot from role
                    session.Permissions = AppPermissions.GetDefaultPermissionsForRole(session.Role);

                    // Update SQLite metadata (without storing raw access token!)
                    await UpdateSessionValidationMetadataAsync(session.UserId, expiresAt, now, session.RefreshToken, session.Permissions);

                    _logger.Log(AppLogLevel.INFO, LogCategory.AUTH,
                        $"SECURITY EVENT: [{SecurityAuditEvents.SessionRefresh}] Cloud session revalidated. Token valid until {DateTimeOffset.FromUnixTimeMilliseconds(expiresAt):u}");

                    return new StartupValidationResult(
                        StartupState.ReadyOnline,
                        session,
                        device,
                        "Cloud connected and workstation authorized."
                    );
                }
            }
        }

        // 4. Offline path (or network failed during check): Verify offline policy
        var currentNow = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (session.IsOfflineExpired(currentNow))
        {
            _logger.Log(AppLogLevel.WARN, LogCategory.AUTH,
                $"SECURITY EVENT: [{SecurityAuditEvents.OfflineAuthRejected}] Offline policy expired (> {session.OfflinePolicyMaxDays} days without cloud contact).");

            return new StartupValidationResult(
                StartupState.OfflinePolicyExpired,
                session,
                device,
                $"Offline authorization expired ({session.OfflinePolicyMaxDays} days policy exceeded).",
                "Internet connectivity required to re-validate workstation credentials."
            );
        }

        _logger.Log(AppLogLevel.INFO, LogCategory.AUTH,
            $"SECURITY EVENT: [{SecurityAuditEvents.OfflineAuthAccepted}] Offline authorization accepted. Operating under snapshot from {DateTimeOffset.FromUnixTimeMilliseconds(session.LastCloudValidationAt):u}.");

        return new StartupValidationResult(
            StartupState.ReadyOffline,
            session,
            device,
            "Operating in Offline Mode under authorized local snapshot."
        );
    }

    public async Task<UserSession?> RefreshSessionAsync()
    {
        var session = await GetSessionAsync();
        if (session == null || string.IsNullOrEmpty(session.RefreshToken)) return null;

        var res = await _apiClient.RefreshTokenWithResultAsync(session.RefreshToken);
        if (res.Success && res.Data != null)
        {
            var authData = res.Data;
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var expiresAt = now + (authData.ExpiresIn * 1000);

            session.AccessToken = authData.AccessToken;
            _apiClient.SetAuthToken(authData.AccessToken);

            if (!string.IsNullOrEmpty(authData.RefreshToken))
            {
                session.RefreshToken = authData.RefreshToken;
                await _secureStorage.SaveRefreshTokenAsync(authData.RefreshToken);
            }

            session.ExpiresAt = expiresAt;
            session.LastCloudValidationAt = now;

            await UpdateSessionValidationMetadataAsync(session.UserId, expiresAt, now, session.RefreshToken, session.Permissions);
            return session;
        }

        return session;
    }

    public async Task<(bool Success, string? Error)> PairWithCloudAsync(string email, string password, string? targetStoreId = null)
    {
        var device = await GetDeviceAsync();
        _logger.Log(AppLogLevel.INFO, LogCategory.AUTH,
            $"SECURITY EVENT: [{SecurityAuditEvents.LoginStarted}] Initiating cloud login for {email} on device {device.DeviceCode}");

        var authResult = await _apiClient.LoginWithResultAsync(email, password, device.DeviceId, device.DeviceCode);
        if (!authResult.Success || authResult.Data == null || string.IsNullOrEmpty(authResult.Data.AccessToken))
        {
            _logger.Log(AppLogLevel.WARN, LogCategory.AUTH,
                $"SECURITY EVENT: [{SecurityAuditEvents.LoginFailed}] Cloud login failed for {email}: {authResult.ErrorMessage}");

            if (authResult.IsDeviceRevoked)
            {
                await MarkDeviceRevokedAsync(device.DeviceId);
                return (false, "This device is revoked by the cloud administrator. Contact your pharmacy manager.");
            }

            return (false, authResult.ErrorMessage ?? "Invalid credentials or unable to reach Inventra Cloud.");
        }

        var authRes = authResult.Data;
        _apiClient.SetAuthToken(authRes.AccessToken);

        // Determine business and store context from server-authoritative response
        var businessId = authRes.ActiveContext?.BusinessId;
        var businessName = authRes.ActiveContext?.BusinessName ?? "Inventra Pharmacy";
        var storeId = targetStoreId ?? authRes.ActiveContext?.StoreId;
        var storeName = authRes.ActiveContext?.StoreName ?? "Main Counter";
        var role = authRes.ActiveContext?.Role ?? "CASHIER";
        var userId = authRes.User?.Id ?? Guid.NewGuid().ToString();
        var fullName = authRes.User?.FullName ?? "Staff";

        if (string.IsNullOrEmpty(businessId) && authRes.Memberships?.Count > 0)
        {
            var firstBiz = authRes.Memberships[0];
            businessId = firstBiz.BusinessId;
            businessName = firstBiz.BusinessName;
            role = firstBiz.Role;
            if (firstBiz.Stores?.Count > 0)
            {
                storeId = firstBiz.Stores[0].StoreId;
                storeName = firstBiz.Stores[0].StoreName;
            }
        }

        if (string.IsNullOrEmpty(businessId))
        {
            return (false, "Authenticated user does not belong to an active Inventra Business.");
        }

        storeId ??= "STORE-MAIN";

        // Register device with cloud backend
        var devRegRes = await _apiClient.RegisterDeviceAsync(new RegisterDeviceApiRequest(
            DeviceName: device.DeviceName,
            DeviceCode: device.DeviceCode,
            DeviceType: "DESKTOP",
            PlatformOs: "Windows",
            AppVersion: "1.0.0"
        ));

        // Persist device pairing locally
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var devCmd = connection.CreateCommand();
        devCmd.CommandText = @"
            UPDATE device_identity 
            SET business_id = @biz, store_id = @store, status = 'ACTIVE' 
            WHERE device_id = @did;
        ";
        devCmd.Parameters.AddWithValue("@biz", businessId);
        devCmd.Parameters.AddWithValue("@store", storeId);
        devCmd.Parameters.AddWithValue("@did", device.DeviceId);
        await devCmd.ExecuteNonQueryAsync();

        device.BusinessId = businessId;
        device.StoreId = storeId;
        device.Status = "ACTIVE";
        _cachedDevice = device;

        // Persist refresh token in OS-protected secure storage (Windows DPAPI)
        await _secureStorage.SaveRefreshTokenAsync(authRes.RefreshToken);
        var encRefresh = _secureStorage.Encrypt(authRes.RefreshToken);

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var expiresAt = now + (authRes.ExpiresIn * 1000);
        var permissions = AppPermissions.GetDefaultPermissionsForRole(role);
        var permissionsJson = JsonSerializer.Serialize(permissions);

        // Persist non-secret auth session metadata in SQLite (NO ACCESS TOKEN, NO PASSWORDS!)
        await using var sessionCmd = connection.CreateCommand();
        sessionCmd.CommandText = @"
            DELETE FROM auth_session;
            INSERT INTO auth_session (
                id, user_id, email, full_name, role, business_id, business_name,
                store_id, store_name, gstin, encrypted_refresh_token,
                permissions_json, authorized_at, last_cloud_validation_at, offline_policy_max_days,
                token_expires_at, updated_at
            ) VALUES (
                'ACTIVE', @uid, @email, @name, @role, @biz, @bname,
                @store, @sname, '27AABCU9603R1ZM', @encRef,
                @perm, @now, @now, 14,
                @exp, @now
            );
        ";
        sessionCmd.Parameters.AddWithValue("@uid", userId);
        sessionCmd.Parameters.AddWithValue("@email", email);
        sessionCmd.Parameters.AddWithValue("@name", fullName);
        sessionCmd.Parameters.AddWithValue("@role", role);
        sessionCmd.Parameters.AddWithValue("@biz", businessId);
        sessionCmd.Parameters.AddWithValue("@bname", businessName);
        sessionCmd.Parameters.AddWithValue("@store", storeId);
        sessionCmd.Parameters.AddWithValue("@sname", storeName);
        sessionCmd.Parameters.AddWithValue("@encRef", (object?)encRefresh ?? DBNull.Value);
        sessionCmd.Parameters.AddWithValue("@perm", permissionsJson);
        sessionCmd.Parameters.AddWithValue("@now", now);
        sessionCmd.Parameters.AddWithValue("@exp", expiresAt);
        await sessionCmd.ExecuteNonQueryAsync();

        _cachedSession = new UserSession
        {
            UserId = userId,
            Email = email,
            FullName = fullName,
            Role = role,
            BusinessId = businessId,
            BusinessName = businessName,
            StoreId = storeId,
            StoreName = storeName,
            Gstin = "27AABCU9603R1ZM",
            AccessToken = authRes.AccessToken,
            RefreshToken = authRes.RefreshToken,
            ExpiresAt = expiresAt,
            AuthorizedAt = now,
            LastCloudValidationAt = now,
            OfflinePolicyMaxDays = 14,
            Permissions = permissions
        };

        _logger.Log(AppLogLevel.INFO, LogCategory.AUTH,
            $"SECURITY EVENT: [{SecurityAuditEvents.LoginSuccess}] Account bound to business '{businessName}', store '{storeName}', role '{role}'");
        _logger.Log(AppLogLevel.INFO, LogCategory.AUTH,
            $"SECURITY EVENT: [{SecurityAuditEvents.DeviceAuthorized}] Terminal '{device.DeviceCode}' authorized.");

        return (true, null);
    }

    public async Task LogoutAsync()
    {
        var session = _cachedSession ?? await GetSessionAsync();
        var refreshToken = session?.RefreshToken ?? await _secureStorage.GetRefreshTokenAsync();

        if (!string.IsNullOrEmpty(refreshToken))
        {
            try
            {
                await _apiClient.LogoutAsync(refreshToken);
            }
            catch
            {
                // Proceed with local logout regardless of network
            }
        }

        await _secureStorage.ClearCredentialsAsync();
        _cachedSession = null;
        _apiClient.SetAuthToken(null);

        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM auth_session;";
        await cmd.ExecuteNonQueryAsync();

        _logger.Log(AppLogLevel.INFO, LogCategory.AUTH,
            $"SECURITY EVENT: [{SecurityAuditEvents.Logout}] Workstation session terminated. Secure credentials removed.");
    }

    public async Task ClearSessionAsync()
    {
        await LogoutAsync();

        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE device_identity SET business_id = NULL, store_id = NULL;";
        await cmd.ExecuteNonQueryAsync();

        if (_cachedDevice != null)
        {
            _cachedDevice.BusinessId = null;
            _cachedDevice.StoreId = null;
        }
    }

    private async Task MarkDeviceRevokedAsync(string deviceId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE device_identity SET status = 'REVOKED' WHERE device_id = @did;";
        cmd.Parameters.AddWithValue("@did", deviceId);
        await cmd.ExecuteNonQueryAsync();

        if (_cachedDevice != null)
        {
            _cachedDevice.Status = "REVOKED";
        }
    }

    private async Task ClearSessionCredentialsOnlyAsync()
    {
        await _secureStorage.ClearCredentialsAsync();
        if (_cachedSession != null)
        {
            _cachedSession.AccessToken = null;
            _cachedSession.RefreshToken = null;
        }
        _apiClient.SetAuthToken(null);

        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE auth_session SET encrypted_refresh_token = NULL;";
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task UpdateSessionValidationMetadataAsync(
        string userId,
        long tokenExpiresAt,
        long validationTimestamp,
        string? newRefreshToken,
        HashSet<string> permissions)
    {
        var encRefresh = !string.IsNullOrEmpty(newRefreshToken) ? _secureStorage.Encrypt(newRefreshToken) : null;
        var permJson = JsonSerializer.Serialize(permissions);

        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE auth_session
            SET encrypted_refresh_token = COALESCE(@ref, encrypted_refresh_token),
                token_expires_at = @exp,
                last_cloud_validation_at = @val,
                permissions_json = @perm,
                updated_at = @now
            WHERE user_id = @uid;
        ";
        cmd.Parameters.AddWithValue("@ref", (object?)encRefresh ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@exp", tokenExpiresAt);
        cmd.Parameters.AddWithValue("@val", validationTimestamp);
        cmd.Parameters.AddWithValue("@perm", permJson);
        cmd.Parameters.AddWithValue("@now", validationTimestamp);
        cmd.Parameters.AddWithValue("@uid", userId);
        await cmd.ExecuteNonQueryAsync();
    }
}
