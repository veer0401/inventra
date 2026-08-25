package com.inventra.inventra_backend.transfer.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record ShipTransferBatchAllocationRequest(
    @NotNull(message = "sourceBatchId is required")
    UUID sourceBatchId,

    @NotNull(message = "shippedBaseQuantity is required")
    @DecimalMin(value = "0.001", message = "shippedBaseQuantity must be positive")
    BigDecimal shippedBaseQuantity
) {}
