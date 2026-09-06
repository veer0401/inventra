package com.inventra.inventra_backend.ingestion.domain.model;

import com.github.f4b6a3.uuid.UuidCreator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "import_rows")
public class ImportRow {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "import_job_id", nullable = false, updatable = false)
    private UUID importJobId;

    @Column(name = "row_index", nullable = false)
    private int rowIndex;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ImportRowStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_data_json", nullable = false, columnDefinition = "jsonb")
    private String rawDataJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "normalized_data_json", columnDefinition = "jsonb")
    private String normalizedDataJson;

    @Column(name = "matched_entity_id")
    private UUID matchedEntityId;

    @Column(name = "match_confidence", precision = 5, scale = 2)
    private BigDecimal matchConfidence;

    @Column(name = "skipped_by")
    private UUID skippedBy;

    @Column(name = "skipped_at")
    private Instant skippedAt;

    @Column(name = "skip_reason")
    private String skipReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ImportRow() {
        // JPA requirement
    }

    public ImportRow(
        UUID businessId,
        UUID importJobId,
        int rowIndex,
        String rawDataJson
    ) {
        this.id = UuidCreator.getTimeOrderedEpoch();
        this.businessId = Objects.requireNonNull(businessId, "businessId cannot be null");
        this.importJobId = Objects.requireNonNull(importJobId, "importJobId cannot be null");
        this.rowIndex = rowIndex;
        this.rawDataJson = Objects.requireNonNull(rawDataJson, "rawDataJson cannot be null");
        this.status = ImportRowStatus.DRAFT;
        this.createdAt = Instant.now();
    }

    public void updateValidationAndMatch(
        String normalizedDataJson,
        ImportRowStatus status,
        UUID matchedEntityId,
        BigDecimal matchConfidence
    ) {
        this.normalizedDataJson = normalizedDataJson;
        this.status = Objects.requireNonNull(status, "status cannot be null");
        this.matchedEntityId = matchedEntityId;
        this.matchConfidence = matchConfidence;
    }

    public void updateRawData(String rawDataJson) {
        this.rawDataJson = Objects.requireNonNull(rawDataJson, "rawDataJson cannot be null");
    }

    public void markSkipped(UUID skippedBy, String skipReason) {
        this.status = ImportRowStatus.SKIPPED;
        this.skippedBy = Objects.requireNonNull(skippedBy, "skippedBy cannot be null");
        this.skipReason = Objects.requireNonNull(skipReason, "skipReason cannot be null");
        this.skippedAt = Instant.now();
    }

    public void unmarkSkipped(ImportRowStatus newStatus) {
        this.status = Objects.requireNonNull(newStatus, "newStatus cannot be null");
        this.skippedBy = null;
        this.skipReason = null;
        this.skippedAt = null;
    }

    public void markPosted() {
        this.status = ImportRowStatus.POSTED;
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getImportJobId() {
        return importJobId;
    }

    public int getRowIndex() {
        return rowIndex;
    }

    public ImportRowStatus getStatus() {
        return status;
    }

    public String getRawDataJson() {
        return rawDataJson;
    }

    public String getNormalizedDataJson() {
        return normalizedDataJson;
    }

    public UUID getMatchedEntityId() {
        return matchedEntityId;
    }

    public BigDecimal getMatchConfidence() {
        return matchConfidence;
    }

    public UUID getSkippedBy() {
        return skippedBy;
    }

    public Instant getSkippedAt() {
        return skippedAt;
    }

    public String getSkipReason() {
        return skipReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ImportRow that)) return false;
        return Objects.equals(id, that.id) && Objects.equals(businessId, that.businessId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, businessId);
    }
}
