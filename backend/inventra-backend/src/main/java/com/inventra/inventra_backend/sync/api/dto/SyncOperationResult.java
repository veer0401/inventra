package com.inventra.inventra_backend.sync.api.dto;

import com.inventra.inventra_backend.sync.domain.model.SyncStatus;
import java.util.Map;
import java.util.UUID;

public record SyncOperationResult(
    UUID eventId,
    Long deviceSequenceNumber,
    SyncStatus status,
    UUID serverEntityId,
    Integer serverVersion,
    String errorCode,
    String message,
    boolean retryable,
    Map<String, Object> conflictDetails
) {
    public static SyncOperationResult applied(UUID eventId, Long sequenceNumber, UUID serverEntityId, String message) {
        return new SyncOperationResult(eventId, sequenceNumber, SyncStatus.APPLIED, serverEntityId, 0, null, message, false, null);
    }

    public static SyncOperationResult duplicate(UUID eventId, Long sequenceNumber, UUID serverEntityId, String message) {
        return new SyncOperationResult(eventId, sequenceNumber, SyncStatus.DUPLICATE, serverEntityId, 0, null, message, false, null);
    }

    public static SyncOperationResult rejected(UUID eventId, Long sequenceNumber, String errorCode, String message, boolean retryable) {
        return new SyncOperationResult(eventId, sequenceNumber, SyncStatus.REJECTED, null, null, errorCode, message, retryable, null);
    }

    public static SyncOperationResult conflict(UUID eventId, Long sequenceNumber, String errorCode, String message, Map<String, Object> conflictDetails) {
        return new SyncOperationResult(eventId, sequenceNumber, SyncStatus.CONFLICT, null, null, errorCode, message, false, conflictDetails);
    }
}
