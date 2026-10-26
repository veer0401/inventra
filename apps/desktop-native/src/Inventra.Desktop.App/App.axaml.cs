using System;
using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using Avalonia.Threading;
using Inventra.Desktop.App.ViewModels;
using Inventra.Desktop.App.Views;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Data;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Device;
using Inventra.Desktop.Infrastructure.Hardware;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Logging;
using Inventra.Desktop.Infrastructure.Imports;
using Inventra.Desktop.Infrastructure.Sync;
using Microsoft.Extensions.DependencyInjection;

namespace Inventra.Desktop.App;

public partial class App : Application
{
    private IServiceProvider? _serviceProvider;

    public override void Initialize()
    {
        Program.LogDiagnostic("App.Initialize() called - Loading Avalonia XAML");
        AvaloniaXamlLoader.Load(this);
        Program.LogDiagnostic("App.Initialize() completed");
    }

    public override void OnFrameworkInitializationCompleted()
    {
        Program.LogDiagnostic("App.OnFrameworkInitializationCompleted() entered");

        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            Program.LogDiagnostic("Lifetime is IClassicDesktopStyleApplicationLifetime");

            try
            {
                var services = new ServiceCollection();
                ConfigureServices(services);
                _serviceProvider = services.BuildServiceProvider();
                Program.LogDiagnostic("Service provider configured and built");

                // 1. Initialize local SQLite persistence and schema synchronously
                Program.LogDiagnostic("Initializing DatabaseContext...");
                var dbContext = _serviceProvider.GetRequiredService<DatabaseContext>();
                dbContext.InitializeAsync().GetAwaiter().GetResult();
                Program.LogDiagnostic($"DatabaseContext initialized successfully at: {dbContext.DatabasePath}");

                // 2. Initialize device identity & session service
                Program.LogDiagnostic("Initializing IdentitySessionService...");
                var identityService = _serviceProvider.GetRequiredService<IIdentitySessionService>();
                var device = identityService.GetDeviceAsync().GetAwaiter().GetResult();
                Program.LogDiagnostic($"Device identity resolved: {device.DeviceCode} (ID: {device.DeviceId})");

                // 3. Resolve Shell ViewModel
                Program.LogDiagnostic("Resolving ShellViewModel...");
                var shellVm = _serviceProvider.GetRequiredService<ShellViewModel>();

                // 4. Construct and assign ShellWindow FIRST so the window opens immediately
                Program.LogDiagnostic("Constructing ShellWindow...");
                var window = new ShellWindow(shellVm);
                Program.LogDiagnostic("ShellWindow constructed successfully");

                desktop.MainWindow = window;
                Program.LogDiagnostic("desktop.MainWindow assigned to ShellWindow");
                window.Show();

                // 5. Post ShellViewModel.InitializeAsync to UI dispatcher so it executes asynchronously without blocking window rendering
                Dispatcher.UIThread.Post(async () =>
                {
                    try
                    {
                        Program.LogDiagnostic("Executing ShellViewModel.InitializeAsync() asynchronously on UI thread...");
                        await shellVm.InitializeAsync();
                        Program.LogDiagnostic("ShellViewModel.InitializeAsync() completed successfully");
                    }
                    catch (Exception ex)
                    {
                        Program.LogDiagnostic($"Error in ShellViewModel.InitializeAsync: {ex}");
                    }
                });
            }
            catch (Exception ex)
            {
                Program.LogDiagnostic($"FATAL ERROR in OnFrameworkInitializationCompleted: {ex}");
                throw;
            }
        }
        else
        {
            Program.LogDiagnostic($"WARNING: ApplicationLifetime is not IClassicDesktopStyleApplicationLifetime. Actual type: {ApplicationLifetime?.GetType().FullName ?? "null"}");
        }

        base.OnFrameworkInitializationCompleted();
        Program.LogDiagnostic("App.OnFrameworkInitializationCompleted() completed");
    }

    private static void ConfigureServices(IServiceCollection services)
    {
        // Logging
        services.AddSingleton<IAppLogger>(AppLogger.Instance);

        // Persistence
        services.AddSingleton<DatabaseContext>();
        services.AddSingleton<IProductRepository, ProductRepository>();
        services.AddSingleton<ISalesRepository, SalesRepository>();
        services.AddSingleton<IPurchasingRepository, PurchasingRepository>();
        services.AddSingleton<IOfflineQueueRepository, OfflineQueueRepository>();
        services.AddSingleton<IGlobalMedicineCacheRepository, GlobalMedicineCacheRepository>();
        services.AddSingleton<IImportQueueRepository, ImportQueueRepository>();

        // Infrastructure, Security & Hardware
        services.AddSingleton<ISecureStorageService, WindowsSecureStorageService>();
        services.AddSingleton<IStartupStateMachine, StartupStateMachine>();
        services.AddSingleton<IDeviceIdentityService, DeviceIdentityService>();
        services.AddSingleton<IIdentitySessionService, IdentitySessionService>();
        services.AddSingleton<IAuthorizationService>(sp =>
        {
            var identity = sp.GetRequiredService<IIdentitySessionService>();
            return new AuthorizationService(() => identity.CurrentSession);
        });
        services.AddSingleton<IReceiptPrinterService, ReceiptPrinterService>();
        services.AddSingleton<IBarcodeScannerService, BarcodeScannerService>();
        services.AddSingleton<IInventraApiClient, InventraApiClient>();
        services.AddSingleton<ICloudConnectivityService, CloudConnectivityService>();
        services.AddSingleton<ISyncEngineService, SyncEngineService>();
        services.AddSingleton<IOperationResolutionService, OperationResolutionService>();
        services.AddSingleton<IImportQueueService, ImportQueueService>();
        services.AddSingleton<SyncCoordinator>();

        // ViewModels
        services.AddSingleton<StatusViewModel>();
        services.AddSingleton<DevicePairingViewModel>();
        services.AddSingleton<InventoryWorkspaceViewModel>();
        services.AddSingleton<PosWorkspaceViewModel>();
        services.AddSingleton<PurchasesWorkspaceViewModel>();
        services.AddSingleton<DiagnosticsViewModel>();
        services.AddSingleton<SyncCenterViewModel>();
        services.AddSingleton<ShellViewModel>();
    }
}