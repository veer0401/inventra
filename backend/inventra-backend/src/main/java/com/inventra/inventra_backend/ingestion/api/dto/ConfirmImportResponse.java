package com.inventra.inventra_backend.ingestion.api.dto;

import com.inventra.inventra_backend.ingestion.domain.model.ImportJobStatus;
import java.time.Instant;
import java.util.UUID;

public record ConfirmImportResponse(
    UUID importJobId,
    ImportJobStatus status,
    int totalRows,
    int postedRows,
    int skippedRows,
    Instant confirmedAt
) {}
