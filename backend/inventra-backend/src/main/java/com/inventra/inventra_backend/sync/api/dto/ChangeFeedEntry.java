package com.inventra.inventra_backend.sync.api.dto;

import com.inventra.inventra_backend.sync.domain.model.SyncChangeOperation;
import java.time.Instant;
import java.util.UUID;

public record ChangeFeedEntry(
    Long changeSeq,
    UUID id,
    String entityType,
    UUID entityId,
    SyncChangeOperation operation,
    Integer entityVersion,
    Object payload,
    Instant createdAt
) {}
