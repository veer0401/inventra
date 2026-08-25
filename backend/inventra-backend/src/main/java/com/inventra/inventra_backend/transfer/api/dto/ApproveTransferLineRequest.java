package com.inventra.inventra_backend.transfer.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record ApproveTransferLineRequest(
    @NotNull(message = "transferLineId is required")
    UUID transferLineId,

    @NotNull(message = "approvedQuantity is required")
    @DecimalMin(value = "0.000", message = "approvedQuantity cannot be negative")
    BigDecimal approvedQuantity
) {}
