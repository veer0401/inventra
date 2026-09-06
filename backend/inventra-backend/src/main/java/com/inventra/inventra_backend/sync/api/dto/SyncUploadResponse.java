package com.inventra.inventra_backend.sync.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SyncUploadResponse(
    UUID syncSessionId,
    Instant serverTimestamp,
    int processedCount,
    List<SyncOperationResult> results
) {}
