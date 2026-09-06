package com.inventra.inventra_backend.ingestion.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record UpdateImportRowRequest(
    @NotNull(message = "Updated fields map cannot be null")
    Map<String, String> fields
) {}
