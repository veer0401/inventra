package com.inventra.inventra_backend.ingestion.domain.model;

import com.github.f4b6a3.uuid.UuidCreator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "import_jobs")
public class ImportJob {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "store_id")
    private UUID storeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "import_source", nullable = false, length = 30)
    private ImportSource importSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "import_domain", nullable = false, length = 40)
    private ImportDomain importDomain;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ImportJobStatus status;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "file_storage_key", length = 500)
    private String fileStorageKey;

    @Column(name = "file_hash", nullable = false, length = 64)
    private String fileHash;

    @Column(name = "total_rows", nullable = false)
    private int totalRows;

    @Column(name = "valid_rows", nullable = false)
    private int validRows;

    @Column(name = "invalid_rows", nullable = false)
    private int invalidRows;

    @Column(name = "skipped_rows", nullable = false)
    private int skippedRows;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "confirmed_by")
    private UUID confirmedBy;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ImportJob() {
        // JPA requirement
    }

    public ImportJob(
        UUID businessId,
        UUID storeId,
        ImportSource importSource,
        ImportDomain importDomain,
        String originalFilename,
        String fileStorageKey,
        String fileHash,
        String idempotencyKey,
        UUID createdBy
    ) {
        this.id = UuidCreator.getTimeOrderedEpoch();
        this.businessId = Objects.requireNonNull(businessId, "businessId cannot be null");
        this.storeId = storeId;
        this.importSource = Objects.requireNonNull(importSource, "importSource cannot be null");
        this.importDomain = Objects.requireNonNull(importDomain, "importDomain cannot be null");
        this.status = ImportJobStatus.PENDING_REVIEW;
        this.originalFilename = Objects.requireNonNull(originalFilename, "originalFilename cannot be null");
        this.fileStorageKey = fileStorageKey;
        this.fileHash = Objects.requireNonNull(fileHash, "fileHash cannot be null");
        this.idempotencyKey = idempotencyKey;
        this.createdBy = Objects.requireNonNull(createdBy, "createdBy cannot be null");
        this.totalRows = 0;
        this.validRows = 0;
        this.invalidRows = 0;
        this.skippedRows = 0;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void updateCounters(int totalRows, int validRows, int invalidRows, int skippedRows) {
        this.totalRows = totalRows;
        this.validRows = validRows;
        this.invalidRows = invalidRows;
        this.skippedRows = skippedRows;
        this.updatedAt = Instant.now();
    }

    public void markPosted(UUID confirmedBy, boolean hasSkippedRows) {
        this.confirmedBy = Objects.requireNonNull(confirmedBy, "confirmedBy cannot be null");
        this.confirmedAt = Instant.now();
        this.status = hasSkippedRows ? ImportJobStatus.PARTIALLY_POSTED : ImportJobStatus.POSTED;
        this.updatedAt = Instant.now();
    }

    public void markCancelled() {
        this.status = ImportJobStatus.CANCELLED;
        this.updatedAt = Instant.now();
    }

    public void markFailed() {
        this.status = ImportJobStatus.FAILED;
        this.updatedAt = Instant.now();
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

    public ImportSource getImportSource() {
        return importSource;
    }

    public ImportDomain getImportDomain() {
        return importDomain;
    }

    public ImportJobStatus getStatus() {
        return status;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getFileStorageKey() {
        return fileStorageKey;
    }

    public String getFileHash() {
        return fileHash;
    }

    public int getTotalRows() {
        return totalRows;
    }

    public int getValidRows() {
        return validRows;
    }

    public int getInvalidRows() {
        return invalidRows;
    }

    public int getSkippedRows() {
        return skippedRows;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public UUID getConfirmedBy() {
        return confirmedBy;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public Long getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ImportJob that)) return false;
        return Objects.equals(id, that.id) && Objects.equals(businessId, that.businessId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, businessId);
    }
}
