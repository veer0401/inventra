package com.inventra.inventra_backend.inventory.api.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BatchAdjustmentDto(
    UUID batchId,
    String batchNumber,
    LocalDate manufacturingDate,
    LocalDate expiryDate,
    BigDecimal purchasePrice,
    BigDecimal mrp,
    BigDecimal sellingPrice,
    @NotNull(message = "Batch quantity delta is required")
    BigDecimal quantityDelta
) {}
