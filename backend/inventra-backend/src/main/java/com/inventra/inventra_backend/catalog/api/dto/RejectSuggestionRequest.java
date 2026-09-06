package com.inventra.inventra_backend.catalog.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectSuggestionRequest(
    @NotBlank(message = "Rejection reason is required")
    @Size(max = 500, message = "Reason must not exceed 500 characters")
    String reason
) {}
