package com.inventra.inventra_backend.catalog.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.IdentifierType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AddProductIdentifierRequest(
    @NotNull(message = "Identifier type is required")
    IdentifierType identifierType,
    @NotBlank(message = "Identifier value is required")
    @Size(max = 100, message = "Identifier value must not exceed 100 characters")
    String identifierValue,
    Boolean isPrimary
) {}
