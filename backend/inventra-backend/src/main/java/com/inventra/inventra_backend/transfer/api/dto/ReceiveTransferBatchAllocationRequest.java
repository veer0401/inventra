package com.inventra.inventra_backend.transfer.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record ReceiveTransferBatchAllocationRequest(
    @NotNull(message = "transferLineBatchAllocationId is required")
    UUID transferLineBatchAllocationId,

    @NotNull(message = "receivedBaseQuantity is required")
    @DecimalMin(value = "0.001", message = "receivedBaseQuantity must be positive")
    BigDecimal receivedBaseQuantity
) {}
