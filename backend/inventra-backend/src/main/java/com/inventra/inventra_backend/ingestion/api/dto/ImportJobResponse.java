package com.inventra.inventra_backend.ingestion.api.dto;

import com.inventra.inventra_backend.ingestion.domain.model.ImportDomain;
import com.inventra.inventra_backend.ingestion.domain.model.ImportJobStatus;
import com.inventra.inventra_backend.ingestion.domain.model.ImportSource;
import java.time.Instant;
import java.util.UUID;

public record ImportJobResponse(
    UUID id,
    UUID businessId,
    UUID storeId,
    ImportSource importSource,
    ImportDomain importDomain,
    ImportJobStatus status,
    String originalFilename,
    String fileHash,
    int totalRows,
    int validRows,
    int invalidRows,
    int skippedRows,
    UUID createdBy,
    UUID confirmedBy,
    Instant confirmedAt,
    Long version,
    Instant createdAt,
    Instant updatedAt
) {}
