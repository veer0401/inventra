package com.inventra.inventra_backend.sync.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sync_operations")
public class SyncOperation extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private UUID storeId;

    @Column(name = "device_id", nullable = false, updatable = false)
    private UUID deviceId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "event_id", nullable = false, updatable = false)
    private UUID eventId;

    @Column(name = "device_sequence_number", nullable = false, updatable = false)
    private Long deviceSequenceNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private SyncEventType eventType;

    @Column(name = "event_version", nullable = false)
    private Integer eventVersion = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SyncStatus status;

    @Column(name = "server_entity_id")
    private UUID serverEntityId;

    @Column(name = "payload_checksum", nullable = false, length = 64)
    private String payloadChecksum;

    @Column(name = "error_code", length = 60)
    private String errorCode;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt = Instant.now();

    @Column(name = "applied_at")
    private Instant appliedAt;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    protected SyncOperation() {
        // JPA requirement
    }

    public SyncOperation(
        UUID businessId,
        UUID storeId,
        UUID deviceId,
        UUID userId,
        UUID eventId,
        Long deviceSequenceNumber,
        SyncEventType eventType,
        Integer eventVersion,
        SyncStatus status,
        UUID serverEntityId,
        String payloadChecksum,
        String errorCode,
        String errorMessage,
        Instant occurredAt
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.storeId = Objects.requireNonNull(storeId, "storeId must not be null");
        this.deviceId = Objects.requireNonNull(deviceId, "deviceId must not be null");
        this.userId = Objects.requireNonNull(userId, "userId must not be null");
        this.eventId = Objects.requireNonNull(eventId, "eventId must not be null");
        this.deviceSequenceNumber = Objects.requireNonNull(deviceSequenceNumber, "deviceSequenceNumber must not be null");
        this.eventType = Objects.requireNonNull(eventType, "eventType must not be null");
        this.eventVersion = eventVersion != null ? eventVersion : 1;
        this.status = Objects.requireNonNull(status, "status must not be null");
        this.serverEntityId = serverEntityId;
        this.payloadChecksum = Objects.requireNonNull(payloadChecksum, "payloadChecksum must not be null");
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.occurredAt = Objects.requireNonNull(occurredAt, "occurredAt must not be null");
        this.receivedAt = Instant.now();
        if (status == SyncStatus.APPLIED) {
            this.appliedAt = Instant.now();
        }
    }

    public void incrementRetryCount() {
        this.retryCount++;
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getStoreId() {
        return storeId;
    }

    public UUID getDeviceId() {
        return deviceId;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getEventId() {
        return eventId;
    }

    public Long getDeviceSequenceNumber() {
        return deviceSequenceNumber;
    }

    public SyncEventType getEventType() {
        return eventType;
    }

    public Integer getEventVersion() {
        return eventVersion;
    }

    public SyncStatus getStatus() {
        return status;
    }

    public UUID getServerEntityId() {
        return serverEntityId;
    }

    public String getPayloadChecksum() {
        return payloadChecksum;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public Instant getAppliedAt() {
        return appliedAt;
    }

    public Integer getRetryCount() {
        return retryCount;
    }
}
