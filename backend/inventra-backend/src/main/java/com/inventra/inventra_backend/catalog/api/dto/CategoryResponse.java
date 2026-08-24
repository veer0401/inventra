package com.inventra.inventra_backend.catalog.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.Category;
import com.inventra.inventra_backend.catalog.domain.model.CategoryStatus;
import java.time.Instant;
import java.util.UUID;

public record CategoryResponse(
    UUID id,
    UUID businessId,
    UUID parentId,
    String name,
    String code,
    String description,
    CategoryStatus status,
    Instant createdAt,
    Instant updatedAt
) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
            category.getId(),
            category.getBusinessId(),
            category.getParentId(),
            category.getName(),
            category.getCode(),
            category.getDescription(),
            category.getStatus(),
            category.getCreatedAt(),
            category.getUpdatedAt()
        );
    }
}
