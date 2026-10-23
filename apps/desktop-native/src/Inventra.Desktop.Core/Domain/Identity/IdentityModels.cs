using System;
using System.Collections.Generic;

namespace Inventra.Desktop.Core.Domain.Identity;

public enum ConnectivityState
{
    Offline,
    Connecting,
    Online,
    Syncing,
    Degraded
}

public sealed class DeviceRegistration
{
    public string DeviceId { get; set; } = string.Empty;
    public string DeviceName { get; set; } = "Workstation Terminal";
    public string DeviceCode { get; set; } = string.Empty;
    public string? BusinessId { get; set; }
    public string? StoreId { get; set; }
    public string DeviceType { get; set; } = "DESKTOP";
    public string PlatformOs { get; set; } = "Windows";
    public string AppVersion { get; set; } = "1.0.0";
    public string Status { get; set; } = "ACTIVE";
    public long RegisteredAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    public bool IsRevoked => string.Equals(Status, "REVOKED", StringComparison.OrdinalIgnoreCase);
    public bool IsPaired => !string.IsNullOrWhiteSpace(BusinessId) && !string.IsNullOrWhiteSpace(StoreId);
}

public sealed class UserSession
{
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = "CASHIER";
    public string BusinessId { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string StoreId { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public string Gstin { get; set; } = string.Empty;
    
    // In-Memory ephemeral access token (NEVER persisted in SQLite or plaintext)
    public string? AccessToken { get; set; }
    
    // Ephemeral in-memory reference to refresh token for runtime rotation
    public string? RefreshToken { get; set; }
    
    public long? ExpiresAt { get; set; }
    public long AuthorizedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public long LastCloudValidationAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public int OfflinePolicyMaxDays { get; set; } = 14;

    public HashSet<string> Permissions { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    public bool IsAuthenticated => !string.IsNullOrEmpty(UserId) && !string.IsNullOrEmpty(BusinessId);

    public bool IsOfflineExpired(long currentUnixMs = 0)
    {
        if (currentUnixMs <= 0)
        {
            currentUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }

        var maxOfflineMs = (long)OfflinePolicyMaxDays * 24 * 60 * 60 * 1000;
        var elapsed = currentUnixMs - LastCloudValidationAt;
        return elapsed > maxOfflineMs;
    }

    public bool HasPermission(string permission)
    {
        if (string.Equals(Role, "OWNER", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(Role, "PLATFORM_ADMIN", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return Permissions.Contains(permission);
    }
}
