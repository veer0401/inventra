package com.inventra.inventra_backend.sales.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateSaleReturnLineRequest(
    @NotNull(message = "saleLineId is required")
    UUID saleLineId,

    @NotNull(message = "quantity is required")
    @DecimalMin(value = "0.001", message = "quantity must be greater than 0")
    BigDecimal quantity,

    List<@Valid CreateSaleReturnBatchAllocationRequest> batchAllocations
) {
}
