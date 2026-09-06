package com.inventra.inventra_backend.ingestion.domain.model;

import com.github.f4b6a3.uuid.UuidCreator;
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
@Table(name = "import_validation_issues")
public class ImportValidationIssue {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "import_row_id", nullable = false, updatable = false)
    private UUID importRowId;

    @Column(name = "field_name", nullable = false, length = 100)
    private String fieldName;

    @Column(name = "error_code", nullable = false, length = 60)
    private String errorCode;

    @Column(name = "error_message", nullable = false, columnDefinition = "text")
    private String errorMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private ValidationIssueSeverity severity;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ImportValidationIssue() {
        // JPA requirement
    }

    public ImportValidationIssue(
        UUID importRowId,
        String fieldName,
        String errorCode,
        String errorMessage,
        ValidationIssueSeverity severity
    ) {
        this.id = UuidCreator.getTimeOrderedEpoch();
        this.importRowId = Objects.requireNonNull(importRowId, "importRowId cannot be null");
        this.fieldName = Objects.requireNonNull(fieldName, "fieldName cannot be null");
        this.errorCode = Objects.requireNonNull(errorCode, "errorCode cannot be null");
        this.errorMessage = Objects.requireNonNull(errorMessage, "errorMessage cannot be null");
        this.severity = severity != null ? severity : ValidationIssueSeverity.ERROR;
        this.createdAt = Instant.now();
    }

    public static ImportValidationIssue error(UUID importRowId, String fieldName, String errorCode, String errorMessage) {
        return new ImportValidationIssue(importRowId, fieldName, errorCode, errorMessage, ValidationIssueSeverity.ERROR);
    }

    public static ImportValidationIssue warning(UUID importRowId, String fieldName, String errorCode, String errorMessage) {
        return new ImportValidationIssue(importRowId, fieldName, errorCode, errorMessage, ValidationIssueSeverity.WARNING);
    }

    public UUID getId() {
        return id;
    }

    public UUID getImportRowId() {
        return importRowId;
    }

    public String getFieldName() {
        return fieldName;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public ValidationIssueSeverity getSeverity() {
        return severity;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ImportValidationIssue that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
