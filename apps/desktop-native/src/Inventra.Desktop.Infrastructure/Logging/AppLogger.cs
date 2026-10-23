using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

namespace Inventra.Desktop.Infrastructure.Logging;

public enum LogCategory
{
    STARTUP,
    AUTH,
    DEVICE,
    API,
    SYNC,
    DATABASE,
    CATALOG,
    INVENTORY,
    POS,
    PRINT,
    ERROR
}

public enum AppLogLevel
{
    DEBUG,
    INFO,
    WARN,
    ERROR
}

public interface IAppLogger
{
    string LogsDirectory { get; }
    void Log(AppLogLevel level, LogCategory category, string message, Exception? ex = null);
    void Info(LogCategory category, string message);
    void Warn(LogCategory category, string message, Exception? ex = null);
    void Error(LogCategory category, string message, Exception? ex = null);
    void Debug(LogCategory category, string message);

    void LogApi(string method, string endpoint, int statusCode, long durationMs, string? error = null);
    void LogSync(string action, int pendingCount, string status, string? details = null);
    void LogCatalog(string action, string query, int resultCount, long durationMs, string status, string? error = null);

    IReadOnlyList<string> GetRecentLogLines(string fileName = "inventra.log", int maxLines = 100);
}

public sealed class AppLogger : IAppLogger
{
    private static readonly Lazy<AppLogger> _lazyInstance = new(() => new AppLogger());
    public static AppLogger Instance => _lazyInstance.Value;

    private readonly string _logsDir;
    private readonly object _lockObj = new();
    private const long MaxLogFileSizeBytes = 10 * 1024 * 1024; // 10 MB per log file
    private const int MaxBackups = 5;

    private static readonly Regex TokenRegex = new(
        @"(bearer\s+[A-Za-z0-9\-\._~\+\/]+=*|""(?:password|accessToken|refreshToken|secret)""\s*:\s*""[^""]+"")",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public string LogsDirectory => _logsDir;

    public AppLogger(string? customLogsDir = null)
    {
        if (string.IsNullOrWhiteSpace(customLogsDir))
        {
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            _logsDir = Path.Combine(localAppData, "Inventra", "Logs");
        }
        else
        {
            _logsDir = customLogsDir;
        }

        try
        {
            Directory.CreateDirectory(_logsDir);
        }
        catch
        {
            // Fallback or ignore
        }
    }

    public void Info(LogCategory category, string message) => Log(AppLogLevel.INFO, category, message);
    public void Warn(LogCategory category, string message, Exception? ex = null) => Log(AppLogLevel.WARN, category, message, ex);
    public void Error(LogCategory category, string message, Exception? ex = null) => Log(AppLogLevel.ERROR, category, message, ex);
    public void Debug(LogCategory category, string message) => Log(AppLogLevel.DEBUG, category, message);

    public void Log(AppLogLevel level, LogCategory category, string message, Exception? ex = null)
    {
        var sanitized = Sanitize(message);
        var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
        var line = $"[{timestamp}] [{level,-5}] [{category,-8}] {sanitized}";

        if (ex != null)
        {
            line += $"{Environment.NewLine}Exception: {ex.GetType().FullName}: {ex.Message}{Environment.NewLine}{ex.StackTrace}";
        }

        lock (_lockObj)
        {
            try
            {
                // 1. Primary rolling application log
                AppendToFileWithRoll("inventra.log", line);

                // 2. Specialized rolling logs by concern
                if (level is AppLogLevel.WARN or AppLogLevel.ERROR)
                {
                    AppendToFileWithRoll("errors.log", line);
                }

                switch (category)
                {
                    case LogCategory.STARTUP:
                        AppendToFileWithRoll("startup.log", line);
                        break;
                    case LogCategory.API:
                        AppendToFileWithRoll("api.log", line);
                        break;
                    case LogCategory.SYNC:
                        AppendToFileWithRoll("sync.log", line);
                        break;
                    case LogCategory.CATALOG:
                        AppendToFileWithRoll("catalog.log", line);
                        break;
                }

                Console.WriteLine(line);
            }
            catch
            {
                // Failsafe: logging should never crash the host application
            }
        }
    }

    public void LogApi(string method, string endpoint, int statusCode, long durationMs, string? error = null)
    {
        var sanitizedEndpoint = Sanitize(endpoint);
        var msg = $"{method} {sanitizedEndpoint} -> HTTP {statusCode} ({durationMs}ms)";
        if (!string.IsNullOrEmpty(error))
        {
            msg += $" | Error: {Sanitize(error)}";
        }

        var level = statusCode >= 400 || !string.IsNullOrEmpty(error) ? AppLogLevel.WARN : AppLogLevel.INFO;
        Log(level, LogCategory.API, msg);
    }

    public void LogSync(string action, int pendingCount, string status, string? details = null)
    {
        var msg = $"Action: {action} | Pending: {pendingCount} | Status: {status}";
        if (!string.IsNullOrEmpty(details))
        {
            msg += $" | Details: {Sanitize(details)}";
        }
        Log(AppLogLevel.INFO, LogCategory.SYNC, msg);
    }

    public void LogCatalog(string action, string query, int resultCount, long durationMs, string status, string? error = null)
    {
        var msg = $"Action: {action} | Query: '{Sanitize(query)}' | Results: {resultCount} | Latency: {durationMs}ms | Status: {status}";
        if (!string.IsNullOrEmpty(error))
        {
            msg += $" | Error: {Sanitize(error)}";
        }
        var level = !string.IsNullOrEmpty(error) && !error.Contains("Offline") ? AppLogLevel.WARN : AppLogLevel.INFO;
        Log(level, LogCategory.CATALOG, msg);
    }

    public IReadOnlyList<string> GetRecentLogLines(string fileName = "inventra.log", int maxLines = 100)
    {
        lock (_lockObj)
        {
            try
            {
                var filePath = Path.Combine(_logsDir, fileName);
                if (!File.Exists(filePath)) return Array.Empty<string>();

                var lines = File.ReadAllLines(filePath, Encoding.UTF8);
                if (lines.Length <= maxLines) return lines;
                return lines.Skip(lines.Length - maxLines).ToArray();
            }
            catch
            {
                return Array.Empty<string>();
            }
        }
    }

    private void AppendToFileWithRoll(string fileName, string line)
    {
        var filePath = Path.Combine(_logsDir, fileName);
        RollIfNeeded(filePath);
        File.AppendAllText(filePath, line + Environment.NewLine, Encoding.UTF8);
    }

    private void RollIfNeeded(string filePath)
    {
        if (!File.Exists(filePath)) return;

        var fileInfo = new FileInfo(filePath);
        if (fileInfo.Length < MaxLogFileSizeBytes) return;

        try
        {
            // Roll: file.4.log -> file.5.log, ..., file.log -> file.1.log
            for (int i = MaxBackups - 1; i >= 1; i--)
            {
                var oldFile = $"{filePath}.{i}";
                var newFile = $"{filePath}.{i + 1}";
                if (File.Exists(oldFile))
                {
                    if (File.Exists(newFile)) File.Delete(newFile);
                    File.Move(oldFile, newFile);
                }
            }

            var firstBackup = $"{filePath}.1";
            if (File.Exists(firstBackup)) File.Delete(firstBackup);
            File.Move(filePath, firstBackup);
        }
        catch
        {
            // Ignore rotation errors
        }
    }

    private static string Sanitize(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        return TokenRegex.Replace(input, "[REDACTED_CREDENTIAL]");
    }
}
