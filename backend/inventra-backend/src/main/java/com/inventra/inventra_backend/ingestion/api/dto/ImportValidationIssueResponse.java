package com.inventra.inventra_backend.ingestion.api.dto;

import com.inventra.inventra_backend.ingestion.domain.model.ValidationIssueSeverity;
import java.util.UUID;

public record ImportValidationIssueResponse(
    UUID id,
    String fieldName,
    String errorCode,
    String errorMessage,
    ValidationIssueSeverity severity
) {}
