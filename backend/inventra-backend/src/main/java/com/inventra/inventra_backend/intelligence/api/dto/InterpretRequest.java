package com.inventra.inventra_backend.intelligence.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for natural language command interpretation.
 */
public record InterpretRequest(
    @NotBlank(message = "Text cannot be blank")
    @Size(max = 500, message = "Text exceeds maximum allowed length of 500 characters")
    String text
) {}
