package com.inventra.inventra_backend.content.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record CmsPageResponse(
    String pageKey,
    String title,
    String subtitle,
    @JsonProperty("contentData") Object contentData,
    Instant updatedAt,
    String updatedBy
) {
    @JsonProperty("content")
    public Object content() {
        return contentData;
    }
}
