namespace Inventra.Desktop.Core.Domain.Identity;

public static class SecurityAuditEvents
{
    public const string LoginStarted = "LOGIN_STARTED";
    public const string LoginSuccess = "LOGIN_SUCCESS";
    public const string LoginFailed = "LOGIN_FAILED";
    public const string DeviceRegistered = "DEVICE_REGISTERED";
    public const string DeviceAuthorized = "DEVICE_AUTHORIZED";
    public const string DeviceRevoked = "DEVICE_REVOKED";
    public const string SessionRefresh = "SESSION_REFRESH";
    public const string SessionRefreshFailed = "SESSION_REFRESH_FAILED";
    public const string OfflineModeEntered = "OFFLINE_MODE_ENTERED";
    public const string OfflineAuthAccepted = "OFFLINE_AUTH_ACCEPTED";
    public const string OfflineAuthRejected = "OFFLINE_AUTH_REJECTED";
    public const string PermissionUpdated = "PERMISSION_UPDATED";
    public const string SyncAuthRejected = "SYNC_AUTH_REJECTED";
    public const string SyncOperationDismissed = "SYNC_OPERATION_DISMISSED";
    public const string Logout = "LOGOUT";
}
