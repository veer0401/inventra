package com.inventra.inventra_backend.content.api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public record CmsPageResponse(
    String pageKey,
    String title,
    String subtitle,
    JsonNode contentData,
    Instant updatedAt,
    String updatedBy
) {}
