package com.inventra.inventra_backend.inventory.api.dto;

import com.inventra.inventra_backend.inventory.domain.model.StockMovement;
import com.inventra.inventra_backend.inventory.domain.model.StockMovementType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record StockMovementResponse(
    UUID id,
    UUID businessId,
    UUID storeId,
    UUID productId,
    UUID batchId,
    StockMovementType movementType,
    BigDecimal quantityDelta,
    BigDecimal unitCost,
    BigDecimal balanceAfter,
    String referenceType,
    UUID referenceId,
    String reason,
    UUID userId,
    UUID deviceId,
    Instant occurredAt,
    Instant createdAt
) {
    public static StockMovementResponse from(StockMovement movement) {
        return new StockMovementResponse(
            movement.getId(),
            movement.getBusinessId(),
            movement.getStoreId(),
            movement.getProductId(),
            movement.getBatchId(),
            movement.getMovementType(),
            movement.getQuantityDelta(),
            movement.getUnitCost(),
            movement.getBalanceAfter(),
            movement.getReferenceType(),
            movement.getReferenceId(),
            movement.getReason(),
            movement.getUserId(),
            movement.getDeviceId(),
            movement.getOccurredAt(),
            movement.getCreatedAt()
        );
    }
}
