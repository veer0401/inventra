package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.SaleLineBatchAllocation;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SaleLineBatchAllocationResponse(
    UUID id,
    UUID batchId,
    UUID productId,
    String batchNumber,
    LocalDate expiryDate,
    BigDecimal allocatedBaseQuantity,
    BigDecimal unitCost,
    BigDecimal mrp,
    BigDecimal sellingPrice,
    BigDecimal returnedBaseQuantity
) {
    public static SaleLineBatchAllocationResponse from(SaleLineBatchAllocation alloc) {
        return new SaleLineBatchAllocationResponse(
            alloc.getId(),
            alloc.getBatchId(),
            alloc.getProductId(),
            alloc.getBatchNumber(),
            alloc.getExpiryDate(),
            alloc.getAllocatedBaseQuantity(),
            alloc.getUnitCost(),
            alloc.getMrp(),
            alloc.getSellingPrice(),
            alloc.getReturnedBaseQuantity()
        );
    }
}
