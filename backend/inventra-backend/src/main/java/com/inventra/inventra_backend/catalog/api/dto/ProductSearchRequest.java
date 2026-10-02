package com.inventra.inventra_backend.catalog.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.ProductQueryCondition;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

/**
 * Structured product search request payload.
 */
public record ProductSearchRequest(
    String query,
    @Valid List<ProductQueryCondition> conditions,
    UUID storeId
) {
    public ProductSearchRequest {
        if (conditions == null) {
            conditions = List.of();
        }
    }

    public ProductSearchRequest(List<ProductQueryCondition> conditions, UUID storeId) {
        this(null, conditions, storeId);
    }

    public ProductSearchRequest(List<ProductQueryCondition> conditions) {
        this(null, conditions, null);
    }
}
