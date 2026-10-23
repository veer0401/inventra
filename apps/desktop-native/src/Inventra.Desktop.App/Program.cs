using System;
using System.IO;
using Avalonia;
using Inventra.Desktop.Infrastructure.Logging;

namespace Inventra.Desktop.App;

public static class Program
{
    public static void LogDiagnostic(string message)
    {
        AppLogger.Instance.Info(LogCategory.STARTUP, message);
    }

    [STAThread]
    public static void Main(string[] args)
    {
        LogDiagnostic("=== Inventra Desktop Starting ===");
        LogDiagnostic($"Process ID: {Environment.ProcessId}, OS: {Environment.OSVersion}, .NET: {Environment.Version}");

        AppDomain.CurrentDomain.UnhandledException += (s, e) =>
        {
            LogDiagnostic($"FATAL UNHANDLED EXCEPTION in AppDomain: {e.ExceptionObject}");
        };

        try
        {
            LogDiagnostic("Calling BuildAvaloniaApp().StartWithClassicDesktopLifetime(args)...");
            var builder = BuildAvaloniaApp();
            var exitCode = builder.StartWithClassicDesktopLifetime(args);
            LogDiagnostic($"StartWithClassicDesktopLifetime returned with exit code: {exitCode}");
        }
        catch (Exception ex)
        {
            LogDiagnostic($"FATAL EXCEPTION in Main: {ex}");
            throw;
        }
        finally
        {
            LogDiagnostic("=== Inventra Desktop Terminated ===");
        }
    }

    public static AppBuilder BuildAvaloniaApp()
        => AppBuilder.Configure<App>()
            .UsePlatformDetect()
#if DEBUG
            .WithDeveloperTools()
#endif
            .WithInterFont()
            .LogToTrace();
}
