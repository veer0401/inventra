using System;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Hardware;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Sync;

namespace Inventra.Desktop.App.ViewModels;

public sealed partial class ShellViewModel : ViewModelBase
{
    private readonly ISyncEngineService _syncEngineService;
    private readonly ICloudConnectivityService _connectivityService;
    private readonly IReceiptPrinterService _printerService;
    private readonly IIdentitySessionService _identityService;
    private readonly IStartupStateMachine _stateMachine;
    private readonly IAuthorizationService _authService;

    [ObservableProperty]
    private object? _currentWorkspace;

    [ObservableProperty]
    private string _activeWorkspaceTitle = "Inventory Master";

    [ObservableProperty]
    private StatusViewModel _statusBar;

    [ObservableProperty]
    private string _notificationBanner = string.Empty;

    [ObservableProperty]
    private bool _hasNotification = false;

    [ObservableProperty]
    private bool _isPaired = false;

    [ObservableProperty]
    private string _authModeBadge = "Offline Authorized";

    public InventoryWorkspaceViewModel InventoryWorkspace { get; }
    public PosWorkspaceViewModel PosWorkspace { get; }
    public PurchasesWorkspaceViewModel PurchasesWorkspace { get; }
    public DevicePairingViewModel PairingWorkspace { get; }
    public DiagnosticsViewModel DiagnosticsWorkspace { get; }
    public SyncCenterViewModel SyncCenterWorkspace { get; }
    private readonly SyncCoordinator _syncCoordinator;
    public IStartupStateMachine StateMachine => _stateMachine;

    public ShellViewModel(
        InventoryWorkspaceViewModel inventoryWorkspace,
        PosWorkspaceViewModel posWorkspace,
        PurchasesWorkspaceViewModel purchasesWorkspace,
        DevicePairingViewModel pairingWorkspace,
        DiagnosticsViewModel diagnosticsWorkspace,
        SyncCenterViewModel syncCenterWorkspace,
        SyncCoordinator syncCoordinator,
        StatusViewModel statusBar,
        ISyncEngineService syncEngineService,
        ICloudConnectivityService connectivityService,
        IReceiptPrinterService printerService,
        IIdentitySessionService identityService,
        IStartupStateMachine stateMachine,
        IAuthorizationService authService)
    {
        InventoryWorkspace = inventoryWorkspace;
        PosWorkspace = posWorkspace;
        PurchasesWorkspace = purchasesWorkspace;
        PairingWorkspace = pairingWorkspace;
        DiagnosticsWorkspace = diagnosticsWorkspace;
        SyncCenterWorkspace = syncCenterWorkspace;
        _syncCoordinator = syncCoordinator;
        StatusBar = statusBar;
        _syncEngineService = syncEngineService;
        _connectivityService = connectivityService;
        _printerService = printerService;
        _identityService = identityService;
        _stateMachine = stateMachine;
        _authService = authService;

        PairingWorkspace.PairingCompleted += OnPairingCompleted;
    }

    public async Task InitializeAsync()
    {
        _stateMachine.TransitionTo(StartupState.Starting, "Initializing Inventra Desktop runtime...");

        // Start background cloud connectivity monitoring
        _connectivityService.StartMonitoring(TimeSpan.FromSeconds(10));

        _stateMachine.TransitionTo(StartupState.LoadingDeviceIdentity, "Loading persistent hardware identity...");
        var device = await _identityService.GetDeviceAsync();

        _stateMachine.TransitionTo(StartupState.CheckingConnectivity, "Probing cloud connectivity...");
        var isOnline = await _connectivityService.CheckConnectivityNowAsync();

        _stateMachine.TransitionTo(StartupState.CheckingLocalAuthorization, "Validating session and workstation authorization...");
        var validation = await _identityService.ValidateStartupSessionAsync(isOnline);

        _stateMachine.TransitionTo(validation.State, validation.Message, validation.SafeReason);

        switch (validation.State)
        {
            case StartupState.LoginRequired:
                IsPaired = false;
                CurrentWorkspace = PairingWorkspace;
                ActiveWorkspaceTitle = "Workstation Authentication";
                StatusBar.SetContext(null, device);
                PairingWorkspace.SetNotice("");
                ShowNotification("Workstation authorization required. Please authenticate with your Inventra account.");
                break;

            case StartupState.DeviceRevoked:
                IsPaired = false;
                CurrentWorkspace = PairingWorkspace;
                ActiveWorkspaceTitle = "Workstation Revoked";
                StatusBar.SetContext(null, device);
                PairingWorkspace.SetNotice(validation.SafeReason ?? "This workstation has been revoked by the administrator.");
                ShowNotification("SECURITY ALERT: This terminal has been revoked. Access to protected ERP data is blocked.");
                break;

            case StartupState.SessionExpired:
                IsPaired = false;
                CurrentWorkspace = PairingWorkspace;
                ActiveWorkspaceTitle = "Session Expired";
                StatusBar.SetContext(null, device);
                PairingWorkspace.SetNotice("Cloud session expired. Please sign in to reconnect.");
                ShowNotification("Cloud session expired. An internet connection is required to re-authenticate.");
                break;

            case StartupState.OfflinePolicyExpired:
                IsPaired = false;
                CurrentWorkspace = PairingWorkspace;
                ActiveWorkspaceTitle = "Offline Policy Expired";
                StatusBar.SetContext(null, device);
                PairingWorkspace.SetNotice($"Offline authorization expired ({validation.Session?.OfflinePolicyMaxDays ?? 14} days maximum without cloud contact). Connect to the internet to re-validate.");
                ShowNotification("Offline authorization period expired. Internet connection required to re-validate workstation credentials.");
                break;

            case StartupState.ReadyOnline:
                IsPaired = true;
                AuthModeBadge = "Cloud Connected";
                StatusBar.SetContext(validation.Session, validation.Device);

                await InventoryWorkspace.InitializeAsync();
                await PosWorkspace.InitializeAsync();
                await PurchasesWorkspace.InitializeAsync();

                CurrentWorkspace = InventoryWorkspace;
                ActiveWorkspaceTitle = "Inventory & Catalog Master";

                if (!string.IsNullOrEmpty(validation.Session?.BusinessId))
                {
                    await StatusBar.RefreshAsync(validation.Session.BusinessId);
                    _ = _syncEngineService.RunSyncCycleAsync(validation.Session.BusinessId, device.DeviceId);
                }

                ShowNotification($"Workstation authorized & online: {validation.Session?.BusinessName} ({validation.Session?.StoreName}).");
                break;

            case StartupState.ReadyOffline:
                IsPaired = true;
                AuthModeBadge = "Offline Authorized";
                StatusBar.SetContext(validation.Session, validation.Device);

                await InventoryWorkspace.InitializeAsync();
                await PosWorkspace.InitializeAsync();
                await PurchasesWorkspace.InitializeAsync();

                CurrentWorkspace = InventoryWorkspace;
                ActiveWorkspaceTitle = "Inventory & Catalog Master";

                if (!string.IsNullOrEmpty(validation.Session?.BusinessId))
                {
                    await StatusBar.RefreshAsync(validation.Session.BusinessId);
                }

                ShowNotification($"Operating in Offline Mode under authorized snapshot ({validation.Session?.BusinessName} - {validation.Session?.StoreName}).");
                break;
        }
    }

    private async void OnPairingCompleted(object? sender, EventArgs e)
    {
        var device = await _identityService.GetDeviceAsync();
        var session = await _identityService.GetSessionAsync();

        IsPaired = true;
        AuthModeBadge = "Cloud Connected";
        _stateMachine.TransitionTo(StartupState.ReadyOnline, "Workstation paired and session established.");
        StatusBar.SetContext(session, device);

        await InventoryWorkspace.InitializeAsync();
        await PosWorkspace.InitializeAsync();
        await PurchasesWorkspace.InitializeAsync();

        CurrentWorkspace = InventoryWorkspace;
        ActiveWorkspaceTitle = "Inventory & Catalog Master";
        ShowNotification($"Workstation authorized for {session?.BusinessName} ({session?.StoreName}). Ready for operations.");

        _connectivityService.StartMonitoring(TimeSpan.FromSeconds(10));
        _syncCoordinator.Start(); // syncs and imports queued data when the connection returns, and once a minute
        if (session != null && !string.IsNullOrEmpty(session.BusinessId))
        {
            _ = _syncEngineService.RunSyncCycleAsync(session.BusinessId, device.DeviceId);
        }
    }

    [RelayCommand]
    public async Task LogoutAsync()
    {
        await _identityService.LogoutAsync();
        _stateMachine.TransitionTo(StartupState.LoginRequired, "User explicitly logged out.");

        IsPaired = false;
        CurrentWorkspace = PairingWorkspace;
        ActiveWorkspaceTitle = "Workstation Authentication";
        PairingWorkspace.SetNotice("");

        var device = await _identityService.GetDeviceAsync();
        StatusBar.SetContext(null, device);

        ShowNotification("Workstation logged out. Secure credentials removed.");
    }

    [RelayCommand]
    public void SwitchToInventory()
    {
        SwitchToMedicines();
    }

    [RelayCommand]
    public void SwitchToMedicines()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.InventoryView))
        {
            ShowNotification("Access Denied: You do not have permission to view inventory.");
            return;
        }
        InventoryWorkspace.SwitchToMedicines();
        CurrentWorkspace = InventoryWorkspace;
        ActiveWorkspaceTitle = "Inventory — Medicines & Catalog Master";
    }

    [RelayCommand]
    public void SwitchToStock()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.InventoryView))
        {
            ShowNotification("Access Denied: You do not have permission to view inventory.");
            return;
        }
        InventoryWorkspace.SwitchToStock();
        CurrentWorkspace = InventoryWorkspace;
        ActiveWorkspaceTitle = "Inventory — Store Stock & Balances";
    }

    [RelayCommand]
    public void SwitchToBatches()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.InventoryView))
        {
            ShowNotification("Access Denied: You do not have permission to view inventory.");
            return;
        }
        InventoryWorkspace.SwitchToBatches();
        CurrentWorkspace = InventoryWorkspace;
        ActiveWorkspaceTitle = "Inventory — Batch & FEFO Expiry Registry";
    }

    [RelayCommand]
    public void SwitchToSales()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.SaleView))
        {
            ShowNotification("Access Denied: You do not have permission to access sales.");
            return;
        }
        PosWorkspace.SwitchToBilling();
        CurrentWorkspace = PosWorkspace;
        ActiveWorkspaceTitle = "Sales & POS Billing [F2]";
    }

    [RelayCommand]
    public void SwitchToSalesRegister()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.SaleView))
        {
            ShowNotification("Access Denied: You do not have permission to view sales.");
            return;
        }
        PosWorkspace.SwitchToRegister();
        CurrentWorkspace = PosWorkspace;
        ActiveWorkspaceTitle = "Sales — Invoice Register & History";
    }

    [RelayCommand]
    public void SwitchToCustomers()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.SaleView))
        {
            ShowNotification("Access Denied: You do not have permission to access customers.");
            return;
        }
        PosWorkspace.SwitchToCustomers();
        CurrentWorkspace = PosWorkspace;
        ActiveWorkspaceTitle = "Sales — Customer Directory & Accounts";
    }

    [RelayCommand]
    public void NotifyFutureModule(string moduleName)
    {
        ShowNotification($"Module '{moduleName}' is scheduled for a future development phase.");
    }

    [RelayCommand]
    public void SwitchToPurchases()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.PurchaseCreate))
        {
            ShowNotification("Access Denied: You do not have permission to manage purchases.");
            return;
        }
        PurchasesWorkspace.OpenPurchaseRegister();
        CurrentWorkspace = PurchasesWorkspace;
        ActiveWorkspaceTitle = "Purchases — Order Register [F6]";
    }

    [RelayCommand]
    public void SwitchToNewPurchase()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.PurchaseCreate))
        {
            ShowNotification("Access Denied: You do not have permission to create purchases.");
            return;
        }
        PurchasesWorkspace.OpenNewPurchase();
        CurrentWorkspace = PurchasesWorkspace;
        ActiveWorkspaceTitle = "Purchases — New Purchase Order [F6]";
    }

    [RelayCommand]
    public void SwitchToGrn()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.PurchaseCreate))
        {
            ShowNotification("Access Denied: You do not have permission to manage goods receipt notes.");
            return;
        }
        PurchasesWorkspace.OpenGrnRegister();
        CurrentWorkspace = PurchasesWorkspace;
        ActiveWorkspaceTitle = "Purchases — Goods Receipt Inward [F7]";
    }

    [RelayCommand]
    public void SwitchToSuppliers()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.PurchaseCreate))
        {
            ShowNotification("Access Denied: You do not have permission to manage suppliers.");
            return;
        }
        PurchasesWorkspace.OpenSuppliers();
        CurrentWorkspace = PurchasesWorkspace;
        ActiveWorkspaceTitle = "Purchases — Supplier Directory";
    }

    [RelayCommand]
    public void SwitchToReports()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.ReportView))
        {
            ShowNotification("Access Denied: You do not have permission to view reports.");
            return;
        }
        ActiveWorkspaceTitle = "Tax & ERP Analytical Reports";
        ShowNotification("Reporting & GSTR Register workspace.");
    }

    [RelayCommand]
    public void SwitchToFinance()
    {
        if (!IsPaired) return;
        if (!_authService.HasPermission(AppPermissions.SettingsManage))
        {
            ShowNotification("Access Denied: You do not have permission to access financial administration.");
            return;
        }
        ActiveWorkspaceTitle = "Finance & General Ledger";
        ShowNotification("General Ledger & Financial Periods.");
    }

    [RelayCommand]
    public async Task SwitchToSettingsAsync()
    {
        await SwitchToDiagnosticsAsync();
    }

    [RelayCommand]
    public async Task SwitchToPairingAsync()
    {
        var session = await _identityService.GetSessionAsync();
        if (session != null && !string.IsNullOrEmpty(session.Email))
        {
            PairingWorkspace.Email = session.Email;
            PairingWorkspace.StatusMessage = "Please enter your password to renew session and synchronize cloud data.";
        }
        CurrentWorkspace = PairingWorkspace;
        ActiveWorkspaceTitle = "Workstation Cloud Pairing & Authentication";
    }

    [RelayCommand]
    public async Task SwitchToDiagnosticsAsync()
    {
        if (!IsPaired) return;
        await DiagnosticsWorkspace.RefreshDiagnosticsAsync();
        CurrentWorkspace = DiagnosticsWorkspace;
        ActiveWorkspaceTitle = "Settings → System Diagnostics & Telemetry";
    }

    [RelayCommand]
    public async Task SwitchToSyncCenterAsync()
    {
        if (!IsPaired) return;
        await SyncCenterWorkspace.RefreshAsync();
        CurrentWorkspace = SyncCenterWorkspace;
        ActiveWorkspaceTitle = "Settings → Sync Center";
    }

    [RelayCommand]
    public async Task SyncNowAsync()
    {
        var session = await _identityService.GetSessionAsync();
        var device = await _identityService.GetDeviceAsync();
        var bizId = session?.BusinessId ?? "DEFAULT";

        ShowNotification("Synchronizing local database with Inventra Cloud...");
        var status = await _syncEngineService.RunSyncCycleAsync(bizId, device.DeviceId);
        await StatusBar.RefreshAsync(bizId);
        await InventoryWorkspace.LoadProductsAsync();
        await PurchasesWorkspace.InitializeAsync();

        if (status.FailedCount > 0)
        {
            ShowNotification($"Sync completed with issues: {status.PendingCount} pending, {status.FailedCount} operations rejected by server.");
        }
        else
        {
            ShowNotification($"Sync complete: {status.PendingCount} operations pending.");
        }
    }

    [RelayCommand]
    public async Task PrintTestReceiptAsync()
    {
        var session = await _identityService.GetSessionAsync();
        var pharmacyName = session?.BusinessName ?? "Inventra Pharmacy";
        var gstin = session?.Gstin ?? "";
        var storeName = session?.StoreName ?? "Main Counter";

        var rawEscPos = _printerService.GenerateTestReceipt(pharmacyName, gstin, storeName);
        await _printerService.PrintBytesAsync(rawEscPos);
        ShowNotification("ESC/POS test receipt dispatched to virtual spooler.");
    }

    [RelayCommand]
    public void DismissNotification()
    {
        HasNotification = false;
        NotificationBanner = string.Empty;
    }

    public void ShowNotification(string message)
    {
        NotificationBanner = message;
        HasNotification = true;
    }
}
