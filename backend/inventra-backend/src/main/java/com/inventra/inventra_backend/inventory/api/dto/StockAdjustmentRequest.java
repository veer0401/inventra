package com.inventra.inventra_backend.inventory.api.dto;

import com.inventra.inventra_backend.inventory.domain.model.StockMovementType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record StockAdjustmentRequest(
    @NotNull(message = "Product ID is required")
    UUID productId,
    @NotNull(message = "Movement type is required")
    StockMovementType movementType,
    BigDecimal quantityDelta,
    BatchAdjustmentDto batchAdjustment,
    @Size(max = 255, message = "Reason must not exceed 255 characters")
    String reason,
    UUID referenceId,
    String referenceType
) {}
