package com.inventra.inventra_backend.sync.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sync_device_states")
public class SyncDeviceState extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "device_id", nullable = false, updatable = false)
    private UUID deviceId;

    @Column(name = "last_synced_sequence_number", nullable = false)
    private Long lastSyncedSequenceNumber = 0L;

    @Column(name = "last_downloaded_cursor", nullable = false)
    private Long lastDownloadedCursor = 0L;

    @Column(name = "last_sync_at", nullable = false)
    private Instant lastSyncAt = Instant.now();

    protected SyncDeviceState() {
        // JPA requirement
    }

    public SyncDeviceState(UUID businessId, UUID deviceId) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.deviceId = Objects.requireNonNull(deviceId, "deviceId must not be null");
        this.lastSyncedSequenceNumber = 0L;
        this.lastDownloadedCursor = 0L;
        this.lastSyncAt = Instant.now();
    }

    public void updateSyncState(Long sequenceNumber, Long cursor) {
        if (sequenceNumber != null && sequenceNumber > this.lastSyncedSequenceNumber) {
            this.lastSyncedSequenceNumber = sequenceNumber;
        }
        if (cursor != null && cursor > this.lastDownloadedCursor) {
            this.lastDownloadedCursor = cursor;
        }
        this.lastSyncAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getDeviceId() {
        return deviceId;
    }

    public Long getLastSyncedSequenceNumber() {
        return lastSyncedSequenceNumber;
    }

    public Long getLastDownloadedCursor() {
        return lastDownloadedCursor;
    }

    public Instant getLastSyncAt() {
        return lastSyncAt;
    }
}
