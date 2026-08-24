package com.inventra.inventra_backend.catalog.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.IdentifierType;
import com.inventra.inventra_backend.catalog.domain.model.ProductIdentifier;
import java.time.Instant;
import java.util.UUID;

public record ProductIdentifierResponse(
    UUID id,
    UUID productId,
    IdentifierType identifierType,
    String identifierValue,
    boolean isPrimary,
    Instant createdAt
) {
    public static ProductIdentifierResponse from(ProductIdentifier identifier) {
        return new ProductIdentifierResponse(
            identifier.getId(),
            identifier.getProductId(),
            identifier.getIdentifierType(),
            identifier.getIdentifierValue(),
            identifier.isPrimary(),
            identifier.getCreatedAt()
        );
    }
}
