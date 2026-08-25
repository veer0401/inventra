package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.SaleReturnLineBatchAllocation;
import com.inventra.inventra_backend.sales.domain.model.StockCondition;
import java.math.BigDecimal;
import java.util.UUID;

public record SaleReturnLineBatchAllocationResponse(
    UUID id,
    UUID saleLineBatchAllocationId,
    UUID batchId,
    UUID productId,
    BigDecimal returnedBaseQuantity,
    StockCondition stockCondition
) {
    public static SaleReturnLineBatchAllocationResponse from(SaleReturnLineBatchAllocation alloc) {
        return new SaleReturnLineBatchAllocationResponse(
            alloc.getId(),
            alloc.getSaleLineBatchAllocationId(),
            alloc.getBatchId(),
            alloc.getProductId(),
            alloc.getReturnedBaseQuantity(),
            alloc.getStockCondition()
        );
    }
}
