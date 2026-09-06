package com.inventra.inventra_backend.content.api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateCmsPageRequest(
    @NotBlank String title,
    String subtitle,
    @NotNull JsonNode contentData
) {}
