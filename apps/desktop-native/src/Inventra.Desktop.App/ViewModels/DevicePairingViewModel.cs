using System;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Identity;

namespace Inventra.Desktop.App.ViewModels;

public sealed partial class DevicePairingViewModel : ViewModelBase
{
    private readonly IIdentitySessionService _identityService;
    private readonly IInventraApiClient _apiClient;

    public event EventHandler? PairingCompleted;

    [ObservableProperty]
    private string _cloudUrl = "http://localhost:8081";

    [ObservableProperty]
    private string _email = string.Empty;

    [ObservableProperty]
    private string _password = string.Empty;

    [ObservableProperty]
    private string _storeCode = string.Empty;

    [ObservableProperty]
    private bool _isLoading = false;

    [ObservableProperty]
    private string _statusMessage = string.Empty;

    [ObservableProperty]
    private string _securityNotice = string.Empty;

    [ObservableProperty]
    private bool _hasError = false;

    public DevicePairingViewModel(IIdentitySessionService identityService, IInventraApiClient apiClient)
    {
        _identityService = identityService;
        _apiClient = apiClient;
    }

    public void SetNotice(string notice)
    {
        SecurityNotice = notice;
    }

    [RelayCommand]
    public async Task ConnectAndPairAsync()
    {
        if (string.IsNullOrWhiteSpace(Email) || string.IsNullOrWhiteSpace(Password))
        {
            StatusMessage = "Please enter both Email and Password.";
            HasError = true;
            return;
        }

        IsLoading = true;
        HasError = false;
        StatusMessage = "Connecting to Inventra Cloud & authorizing workstation...";

        try
        {
            _apiClient.BaseUrl = CloudUrl.Trim();
            var (success, error) = await _identityService.PairWithCloudAsync(
                Email.Trim(),
                Password,
                string.IsNullOrWhiteSpace(StoreCode) ? null : StoreCode.Trim()
            );

            if (success)
            {
                StatusMessage = "Workstation authorized and paired successfully! Launching ERP...";
                Password = string.Empty; // Zero out password from memory immediately
                SecurityNotice = string.Empty;
                PairingCompleted?.Invoke(this, EventArgs.Empty);
            }
            else
            {
                HasError = true;
                StatusMessage = error ?? "Failed to authorize device. Verify cloud URL and credentials.";
            }
        }
        catch (Exception ex)
        {
            HasError = true;
            StatusMessage = $"Connection failed: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }
}
