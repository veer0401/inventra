namespace Inventra.Desktop.Core.Domain.Identity;

public enum StartupState
{
    Starting,
    LoadingDeviceIdentity,
    CheckingLocalAuthorization,
    CheckingConnectivity,
    LoginRequired,
    DeviceRevoked,
    SessionExpired,
    OfflinePolicyExpired,
    ReadyOnline,
    ReadyOffline
}
