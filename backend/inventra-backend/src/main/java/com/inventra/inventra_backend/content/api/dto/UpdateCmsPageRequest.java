package com.inventra.inventra_backend.content.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateCmsPageRequest(
    @NotBlank String title,
    String subtitle,
    @NotNull @JsonAlias({"content", "content_data"}) @JsonProperty("contentData") Object contentData
) {}
