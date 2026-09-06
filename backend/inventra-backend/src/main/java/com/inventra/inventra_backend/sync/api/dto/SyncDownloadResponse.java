package com.inventra.inventra_backend.sync.api.dto;

import java.util.List;

public record SyncDownloadResponse(
    Long currentCursor,
    Long nextCursor,
    boolean hasMore,
    List<ChangeFeedEntry> changes
) {}
