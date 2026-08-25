package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.StockCondition;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateSaleReturnBatchAllocationRequest(
    @NotNull(message = "saleLineBatchAllocationId is required")
    UUID saleLineBatchAllocationId,

    @NotNull(message = "returnedBaseQuantity is required")
    @DecimalMin(value = "0.001", message = "returnedBaseQuantity must be greater than 0")
    BigDecimal returnedBaseQuantity,

    StockCondition stockCondition
) {
}
