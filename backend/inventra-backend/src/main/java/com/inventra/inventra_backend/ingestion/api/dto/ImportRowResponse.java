package com.inventra.inventra_backend.ingestion.api.dto;

import com.inventra.inventra_backend.ingestion.domain.model.ImportRowStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ImportRowResponse(
    UUID id,
    UUID importJobId,
    int rowIndex,
    ImportRowStatus status,
    Map<String, String> rawData,
    Map<String, Object> normalizedData,
    UUID matchedEntityId,
    BigDecimal matchConfidence,
    UUID skippedBy,
    Instant skippedAt,
    String skipReason,
    List<ImportValidationIssueResponse> validationIssues,
    Instant createdAt
) {}
