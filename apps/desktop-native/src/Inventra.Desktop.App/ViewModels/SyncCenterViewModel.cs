using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using Avalonia.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Core.Domain.Imports;
using Inventra.Desktop.Core.Domain.Sync;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Imports;
using Inventra.Desktop.Infrastructure.Logging;
using Inventra.Desktop.Infrastructure.Sync;

namespace Inventra.Desktop.App.ViewModels;

/// <summary>One row of "Needs attention": a queued operation in words, with what went wrong and what can be done.</summary>
public sealed class OperationReviewItem
{
    public OperationReviewItem(OfflineOperation operation, bool canRetry)
    {
        Operation = operation;
        CanRetry = canRetry;
        var description = OperationDescriber.Describe(operation.EventType, operation.PayloadJson);
        Title = description.Title;
        Detail = description.Detail;
        Guidance = OperationGuidance.For(operation.ErrorCode);
    }

    public OfflineOperation Operation { get; }
    public string OperationId => Operation.OperationId;
    public string Title { get; }
    public string Detail { get; }
    public string Guidance { get; }
    public bool CanRetry { get; }

    public string StatusText => Operation.RawStatus == "FAILED" ? "Failed" : "Retrying";
    public string StatusColor => Operation.RawStatus == "FAILED" ? "#B91C1C" : "#B45309";
    public int Attempts => Operation.RetryCount;

    public string ErrorText =>
        string.IsNullOrWhiteSpace(Operation.ErrorMessage)
            ? Operation.ErrorCode ?? string.Empty
            : $"{Operation.ErrorCode}: {Operation.ErrorMessage}";

    public string WhenText =>
        DateTimeOffset.FromUnixTimeMilliseconds(Operation.CreatedAt).LocalDateTime.ToString("dd-MMM-yyyy hh:mm tt");
}

public sealed partial class SyncCenterViewModel : ViewModelBase
{
    private readonly IOfflineQueueRepository _queue;
    private readonly IOperationResolutionService _resolver;
    private readonly IImportQueueService _imports;
    private readonly IImportQueueRepository _jobRepo;
    private readonly IIdentitySessionService _identity;
    private readonly IAuthorizationService _auth;
    private readonly SyncCoordinator _coordinator;
    private readonly IAppLogger _logger;
    private int _importRefreshQueued;

    public SyncCenterViewModel(
        IOfflineQueueRepository queue,
        IOperationResolutionService resolver,
        IImportQueueService imports,
        IImportQueueRepository importJobs,
        IIdentitySessionService identity,
        IAuthorizationService auth,
        SyncCoordinator coordinator,
        IAppLogger? logger = null)
    {
        _queue = queue;
        _resolver = resolver;
        _imports = imports;
        _jobRepo = importJobs;
        _identity = identity;
        _auth = auth;
        _coordinator = coordinator;
        _logger = logger ?? AppLogger.Instance;

        _imports.Changed += OnImportsChanged;
    }

    // ----------------------------------------------------------- state

    [ObservableProperty] private ObservableCollection<OperationReviewItem> _operations = new();
    [ObservableProperty] private OperationReviewItem? _selectedOperation;
    [ObservableProperty] private ObservableCollection<ImportJob> _importJobs = new();
    [ObservableProperty] private int _selectedTabIndex;
    [ObservableProperty] private bool _isBusy;
    [ObservableProperty] private string _message = string.Empty;
    [ObservableProperty] private string _errorMessage = string.Empty;

    [ObservableProperty] private string _attentionSummary = string.Empty;
    [ObservableProperty] private bool _hasOperations;

    [ObservableProperty] private string _importStateText = string.Empty;
    [ObservableProperty] private string _importCountsText = string.Empty;
    [ObservableProperty] private string _pauseResumeLabel = "Pause imports";
    [ObservableProperty] private bool _hasImportJobs;

    // dismiss confirmation
    [ObservableProperty] private bool _showDismissDialog;
    [ObservableProperty] private string _dismissTitle = string.Empty;
    [ObservableProperty] private string _dismissWarning = string.Empty;
    [ObservableProperty] private string _dismissReason = string.Empty;
    private OperationReviewItem? _dismissTarget;

    // ------------------------------------------------------- loading

    [RelayCommand]
    public async Task RefreshAsync()
    {
        var session = await _identity.GetSessionAsync();
        if (session == null) return;

        var ops = await _queue.GetOperationsNeedingAttentionAsync(session.BusinessId);
        var selectedId = SelectedOperation?.OperationId;
        Operations = new ObservableCollection<OperationReviewItem>(ops.Select(o => new OperationReviewItem(o, _resolver.CanRetry(o))));
        SelectedOperation = Operations.FirstOrDefault(o => o.OperationId == selectedId);
        HasOperations = Operations.Count > 0;

        var failed = ops.Count(o => o.RawStatus == "FAILED");
        var retrying = ops.Count - failed;
        AttentionSummary = ops.Count == 0
            ? "Nothing needs attention. Everything saved on this workstation has reached the server or is waiting its turn."
            : $"{failed} failed, {retrying} still retrying. Retry sends an operation again; Dismiss closes it without sending and keeps your reason.";

        await RefreshImportsAsync();
    }

    private async Task RefreshImportsAsync()
    {
        var session = await _identity.GetSessionAsync();
        if (session == null) return;

        var state = await _imports.RefreshStateAsync(session.BusinessId);
        var jobs = await _jobRepo.ListAsync(session.BusinessId);
        var counts = await _jobRepo.CountsAsync(session.BusinessId);

        ImportJobs = new ObservableCollection<ImportJob>(jobs);
        HasImportJobs = jobs.Count > 0;
        ImportStateText = state switch
        {
            ImportQueueState.Running => "Importing...",
            ImportQueueState.Pausing => "Pausing: finishing the medicine being imported, then stopping.",
            ImportQueueState.Paused => "Paused. Nothing is imported until you resume.",
            ImportQueueState.WaitingForConnection => "Waiting for the server. Imports start by themselves when the connection returns.",
            _ => counts.Queued > 0 ? "Ready." : "Idle."
        };
        ImportCountsText = $"{counts.Queued} waiting · {counts.Done} imported · {counts.Skipped} already there · {counts.Failed} failed";
        PauseResumeLabel = state is ImportQueueState.Paused or ImportQueueState.Pausing ? "Resume imports" : "Pause imports";
    }

    private void OnImportsChanged(object? sender, EventArgs e)
    {
        // Raised from background threads and often in bursts: coalesce into one refresh on the UI thread.
        if (System.Threading.Interlocked.Exchange(ref _importRefreshQueued, 1) == 1) return;
        Dispatcher.UIThread.Post(async () =>
        {
            System.Threading.Volatile.Write(ref _importRefreshQueued, 0);
            try { await RefreshImportsAsync(); }
            catch (Exception ex) { _logger.Warn(LogCategory.CATALOG, $"Could not refresh the import list: {ex.Message}"); }
        });
    }

    // ------------------------------------------------------ operations

    private bool Allowed(string permission)
    {
        try
        {
            _auth.RequirePermission(permission);
            return true;
        }
        catch (UnauthorizedAccessException ex)
        {
            ErrorMessage = $"Access Denied: {ex.Message}";
            Message = string.Empty;
            return false;
        }
    }

    private void Report(ResolutionResult result)
    {
        Message = result.Success ? result.Message : string.Empty;
        ErrorMessage = result.Success ? string.Empty : result.Message;
    }

    [RelayCommand]
    public async Task RetryAsync(OperationReviewItem? item)
    {
        if (item == null || !Allowed(AppPermissions.SettingsManage)) return;
        var session = await _identity.GetSessionAsync();
        if (session == null) return;

        Report(await _resolver.RetryAsync(session.BusinessId, item.OperationId));
        _ = _coordinator.TriggerAsync();
        await RefreshAsync();
    }

    [RelayCommand]
    public async Task RetryAllAsync()
    {
        if (!Allowed(AppPermissions.SettingsManage)) return;
        var session = await _identity.GetSessionAsync();
        if (session == null) return;

        var count = await _resolver.RetryAllAsync(session.BusinessId);
        Report(new ResolutionResult(true, count == 0
            ? "Nothing could be retried. Items the server cannot accept can only be dismissed."
            : $"{count} operation(s) queued again. They are sent on the next sync."));
        _ = _coordinator.TriggerAsync();
        await RefreshAsync();
    }

    [RelayCommand]
    public void BeginDismiss(OperationReviewItem? item)
    {
        if (item == null || !Allowed(AppPermissions.SettingsManage)) return;

        _dismissTarget = item;
        DismissReason = string.Empty;
        DismissTitle = $"Dismiss {item.Title.ToLowerInvariant()}: {item.Detail}";
        DismissWarning = item.Operation.EventType switch
        {
            "SALE_CREATED" => "The server will never receive this sale. It stays in this terminal's register marked as dismissed, and stock on this terminal stays deducted: correct it in Inventory if the goods were not actually sold.",
            "PURCHASE_ORDER_CREATED" => "The purchase order is cancelled on this terminal and never sent.",
            "SUPPLIER_CREATED" => "The supplier is removed from this terminal (unless an order or receipt still uses it).",
            "GOODS_RECEIPT_POSTED" => "The stock added by this receipt stays on this terminal only; the server will never receive it.",
            _ => "The change is not sent to the server."
        };
        ShowDismissDialog = true;
    }

    [RelayCommand]
    public void CancelDismiss()
    {
        ShowDismissDialog = false;
        _dismissTarget = null;
    }

    [RelayCommand]
    public async Task ConfirmDismissAsync()
    {
        if (_dismissTarget == null || !Allowed(AppPermissions.SettingsManage)) return;
        var session = await _identity.GetSessionAsync();
        if (session == null) return;

        var result = await _resolver.DismissAsync(session.BusinessId, _dismissTarget.OperationId, DismissReason, session.UserId);
        if (!result.Success)
        {
            // Keep the dialog open so the reason can be corrected.
            ErrorMessage = result.Message;
            return;
        }

        ShowDismissDialog = false;
        _dismissTarget = null;
        Report(result);
        await RefreshAsync();
    }

    [RelayCommand]
    public async Task SyncNowAsync()
    {
        IsBusy = true;
        try
        {
            await _coordinator.TriggerAsync();
            Message = "Sync finished.";
            ErrorMessage = string.Empty;
            await RefreshAsync();
        }
        finally
        {
            IsBusy = false;
        }
    }

    // --------------------------------------------------------- imports

    [RelayCommand]
    public async Task TogglePauseAsync()
    {
        if (!Allowed(AppPermissions.ProductCreate)) return;
        var session = await _identity.GetSessionAsync();
        if (session == null) return;

        if (_imports.State is ImportQueueState.Paused or ImportQueueState.Pausing)
        {
            Message = "Resumed. Waiting imports start now.";
            ErrorMessage = string.Empty;
            _ = _imports.ResumeAsync(session.BusinessId, session.StoreId);
        }
        else
        {
            await _imports.PauseAsync(session.BusinessId);
            Message = "Paused. The medicine being imported finishes first; nothing new starts.";
            ErrorMessage = string.Empty;
        }
        await RefreshImportsAsync();
    }

    [RelayCommand]
    public async Task RetryFailedImportsAsync()
    {
        if (!Allowed(AppPermissions.ProductCreate)) return;
        var session = await _identity.GetSessionAsync();
        if (session == null) return;

        var count = await _jobRepo.RetryFailedAsync(session.BusinessId);
        Message = count == 0 ? "No failed imports to retry." : $"{count} failed import(s) queued again.";
        _ = _imports.ProcessAsync(session.BusinessId, session.StoreId);
        await RefreshImportsAsync();
    }

    [RelayCommand]
    public async Task RemoveImportAsync(ImportJob? job)
    {
        if (job == null || !Allowed(AppPermissions.ProductCreate)) return;
        if (!await _jobRepo.RemoveAsync(job.Id))
            ErrorMessage = "That import has already started or finished, so it can no longer be removed.";
        await RefreshImportsAsync();
    }

    [RelayCommand]
    public async Task ClearFinishedImportsAsync()
    {
        var session = await _identity.GetSessionAsync();
        if (session == null) return;
        await _jobRepo.ClearFinishedAsync(session.BusinessId);
        await RefreshImportsAsync();
    }
}
