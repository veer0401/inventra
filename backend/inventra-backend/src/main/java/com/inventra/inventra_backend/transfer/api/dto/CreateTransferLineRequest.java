package com.inventra.inventra_backend.transfer.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateTransferLineRequest(
    @NotNull(message = "productId is required")
    UUID productId,

    @NotNull(message = "requestedQuantity is required")
    @DecimalMin(value = "0.001", message = "requestedQuantity must be positive")
    BigDecimal requestedQuantity,

    @NotBlank(message = "sellingUnit is required")
    String sellingUnit,

    String notes
) {}
