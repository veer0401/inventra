using System;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Infrastructure.Logging;

namespace Inventra.Desktop.Infrastructure.Identity;

public sealed record StartupStateChangedEventArgs(
    StartupState PreviousState,
    StartupState NewState,
    string? Message,
    string? SafeReason
);

public interface IStartupStateMachine
{
    StartupState CurrentState { get; }
    string? StateMessage { get; }
    string? SafeReason { get; }
    event EventHandler<StartupStateChangedEventArgs>? StateChanged;

    void TransitionTo(StartupState newState, string? message = null, string? safeReason = null);
}

public sealed class StartupStateMachine : IStartupStateMachine
{
    private readonly IAppLogger _logger;
    private StartupState _currentState = StartupState.Starting;
    private string? _stateMessage;
    private string? _safeReason;

    public event EventHandler<StartupStateChangedEventArgs>? StateChanged;

    public StartupState CurrentState => _currentState;
    public string? StateMessage => _stateMessage;
    public string? SafeReason => _safeReason;

    public StartupStateMachine(IAppLogger? logger = null)
    {
        _logger = logger ?? AppLogger.Instance;
    }

    public void TransitionTo(StartupState newState, string? message = null, string? safeReason = null)
    {
        var prevState = _currentState;
        _currentState = newState;
        _stateMessage = message;
        _safeReason = safeReason;

        _logger.Log(AppLogLevel.INFO, LogCategory.STARTUP,
            $"Startup state transition: {prevState} -> {newState}. Detail: {message ?? "None"}" +
            (!string.IsNullOrEmpty(safeReason) ? $" [Reason: {safeReason}]" : ""));

        // Audit log specific security milestones
        switch (newState)
        {
            case StartupState.ReadyOnline:
                _logger.Log(AppLogLevel.INFO, LogCategory.AUTH, "SECURITY EVENT: [ONLINE_ERP_READY] Session revalidated, device authorized.");
                break;
            case StartupState.ReadyOffline:
                _logger.Log(AppLogLevel.INFO, LogCategory.AUTH, $"SECURITY EVENT: [{SecurityAuditEvents.OfflineModeEntered}] Operating under last established cloud authorization snapshot.");
                break;
            case StartupState.DeviceRevoked:
                _logger.Log(AppLogLevel.WARN, LogCategory.AUTH, $"SECURITY EVENT: [{SecurityAuditEvents.DeviceRevoked}] Device revoked by cloud administrator. ERP access blocked.");
                break;
            case StartupState.OfflinePolicyExpired:
                _logger.Log(AppLogLevel.WARN, LogCategory.AUTH, $"SECURITY EVENT: [{SecurityAuditEvents.OfflineAuthRejected}] Offline authorization validity period expired. Internet re-validation required.");
                break;
            case StartupState.SessionExpired:
                _logger.Log(AppLogLevel.WARN, LogCategory.AUTH, $"SECURITY EVENT: [{SecurityAuditEvents.SessionRefreshFailed}] Cloud session expired or invalid. User must authenticate.");
                break;
            case StartupState.LoginRequired:
                _logger.Log(AppLogLevel.INFO, LogCategory.AUTH, "SECURITY EVENT: [LOGIN_REQUIRED] No valid workstation authorization exists.");
                break;
        }

        StateChanged?.Invoke(this, new StartupStateChangedEventArgs(prevState, newState, message, safeReason));
    }
}
