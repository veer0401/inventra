using System;

namespace Inventra.Desktop.Core.Domain.Imports;

public static class ImportJobStatus
{
    public const string Queued = "QUEUED";
    public const string Running = "RUNNING";
    public const string Done = "DONE";
    public const string Skipped = "SKIPPED";
    public const string Failed = "FAILED";
}

/// <summary>What the import queue is doing right now.</summary>
public enum ImportQueueState
{
    /// <summary>Nothing queued or running.</summary>
    Idle,

    /// <summary>Jobs are queued but the server cannot be reached; they start when the connection returns.</summary>
    WaitingForConnection,

    Running,

    /// <summary>Pause was requested; the medicine being imported finishes, then the queue stops.</summary>
    Pausing,

    /// <summary>Stopped on request. Nothing starts until resumed.</summary>
    Paused
}

/// <summary>One global-catalog medicine waiting to be imported into the business catalog.</summary>
public sealed class ImportJob
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string BusinessId { get; set; } = string.Empty;
    public string GlobalMedicineId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? GenericName { get; set; }
    public string Status { get; set; } = ImportJobStatus.Queued;
    public int Attempts { get; set; }
    public string? Message { get; set; }
    public string? ProductId { get; set; }
    public long CreatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public long UpdatedAt { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    public string StatusText => Status switch
    {
        ImportJobStatus.Queued => "Waiting",
        ImportJobStatus.Running => "Importing...",
        ImportJobStatus.Done => "Imported",
        ImportJobStatus.Skipped => "Already in catalog",
        ImportJobStatus.Failed => "Failed",
        _ => Status
    };

    public bool CanRemove => Status is ImportJobStatus.Queued or ImportJobStatus.Failed;
}

public sealed record ImportQueueCounts(int Queued, int Running, int Done, int Skipped, int Failed)
{
    public int Active => Queued + Running;
}
