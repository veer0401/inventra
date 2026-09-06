package com.inventra.inventra_backend.ingestion.api.dto;

import jakarta.validation.constraints.NotBlank;

public record SkipImportRowRequest(
    @NotBlank(message = "Skip reason is mandatory")
    String skipReason
) {}
