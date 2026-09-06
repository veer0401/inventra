package com.inventra.inventra_backend.sync.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "sync_change_feed")
public class SyncChangeFeed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "change_seq", nullable = false, updatable = false)
    private Long changeSeq;

    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id", updatable = false)
    private UUID storeId;

    @Column(name = "entity_type", nullable = false, updatable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id", nullable = false, updatable = false)
    private UUID entityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation", nullable = false, updatable = false, length = 20)
    private SyncChangeOperation operation;

    @Column(name = "entity_version", nullable = false, updatable = false)
    private Integer entityVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, updatable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected SyncChangeFeed() {
        // JPA requirement
    }

    public SyncChangeFeed(
        UUID businessId,
        UUID storeId,
        String entityType,
        UUID entityId,
        SyncChangeOperation operation,
        Integer entityVersion,
        String payload
    ) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.storeId = storeId;
        this.entityType = Objects.requireNonNull(entityType, "entityType must not be null");
        this.entityId = Objects.requireNonNull(entityId, "entityId must not be null");
        this.operation = Objects.requireNonNull(operation, "operation must not be null");
        this.entityVersion = entityVersion != null ? entityVersion : 1;
        this.payload = Objects.requireNonNull(payload, "payload must not be null");
        this.createdAt = Instant.now();
    }

    public Long getChangeSeq() {
        return changeSeq;
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

    public String getEntityType() {
        return entityType;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public SyncChangeOperation getOperation() {
        return operation;
    }

    public Integer getEntityVersion() {
        return entityVersion;
    }

    public String getPayload() {
        return payload;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
