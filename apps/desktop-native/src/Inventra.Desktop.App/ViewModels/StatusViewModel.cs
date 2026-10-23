using System;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Hardware;
using Inventra.Desktop.Infrastructure.Sync;

namespace Inventra.Desktop.App.ViewModels;

public sealed partial class StatusViewModel : ViewModelBase
{
    private readonly ICloudConnectivityService _connectivityService;
    private readonly ISyncEngineService _syncEngineService;
    private readonly IReceiptPrinterService _printerService;
    private readonly IBarcodeScannerService _scannerService;

    [ObservableProperty]
    private string _storeName = "Workstation";

    [ObservableProperty]
    private string _businessName = "Inventra";

    [ObservableProperty]
    private string _connectivityText = "Local Mode (Offline)";

    [ObservableProperty]
    private bool _isOnline = false;

    [ObservableProperty]
    private string _syncStatusText = "Sync: 0 pending";

    [ObservableProperty]
    private string _printerStatusText = "Printer: Ready";

    [ObservableProperty]
    private string _scannerStatusText = "Scanner: Active";

    [ObservableProperty]
    private string _gstinText = string.Empty;

    [ObservableProperty]
    private string _userText = "Operator";

    [ObservableProperty]
    private string _deviceCode = "POS";

    [ObservableProperty]
    private string _appVersion = "v1.0.0 Native (.NET 9)";

    public StatusViewModel(
        ICloudConnectivityService connectivityService,
        ISyncEngineService syncEngineService,
        IReceiptPrinterService printerService,
        IBarcodeScannerService scannerService)
    {
        _connectivityService = connectivityService;
        _syncEngineService = syncEngineService;
        _printerService = printerService;
        _scannerService = scannerService;

        _connectivityService.StateChanged += OnConnectivityChanged;
        UpdateHardwareStatus();
    }

    private void OnConnectivityChanged(object? sender, ConnectivityState state)
    {
        void Update()
        {
            IsOnline = state == ConnectivityState.Online;
            ConnectivityText = _connectivityService.StatusDisplay;
        }

        if (Avalonia.Threading.Dispatcher.UIThread.CheckAccess())
        {
            Update();
        }
        else
        {
            Avalonia.Threading.Dispatcher.UIThread.Post(Update);
        }
    }

    public void SetContext(UserSession? session, DeviceRegistration device)
    {
        DeviceCode = device.DeviceCode;

        if (session != null && session.IsAuthenticated)
        {
            StoreName = string.IsNullOrWhiteSpace(session.StoreName) ? "Main Store" : session.StoreName;
            BusinessName = string.IsNullOrWhiteSpace(session.BusinessName) ? "Inventra Pharmacy" : session.BusinessName;
            UserText = string.IsNullOrWhiteSpace(session.FullName) ? session.Role : $"{session.FullName} ({session.Role})";
            GstinText = string.IsNullOrWhiteSpace(session.Gstin) ? "" : $"GSTIN: {session.Gstin}";
        }
        else
        {
            StoreName = "Unpaired Terminal";
            BusinessName = "Setup Required";
            UserText = "Sign In Required";
            GstinText = "";
        }
    }

    public async Task RefreshAsync(string businessId)
    {
        if (string.IsNullOrWhiteSpace(businessId)) return;
        var sync = await _syncEngineService.GetStatusAsync(businessId);
        SyncStatusText = $"Sync: {sync.PendingCount} pending";
        UpdateHardwareStatus();
    }

    private void UpdateHardwareStatus()
    {
        PrinterStatusText = $"Printer: {_printerService.PrinterStatus}";
        ScannerStatusText = $"Scanner: {_scannerService.ScannerStatus}";
        ConnectivityText = _connectivityService.StatusDisplay;
        IsOnline = _connectivityService.CurrentState == ConnectivityState.Online;
    }
}
