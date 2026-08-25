package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.SaleReturnLine;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SaleReturnLineResponse(
    UUID id,
    UUID saleLineId,
    UUID productId,
    Integer lineNumber,
    BigDecimal quantity,
    BigDecimal baseQuantity,
    BigDecimal unitRefundPrice,
    BigDecimal taxRate,
    BigDecimal taxAmount,
    BigDecimal lineTotal,
    List<SaleReturnLineBatchAllocationResponse> batchAllocations
) {
    public static SaleReturnLineResponse from(SaleReturnLine line, List<SaleReturnLineBatchAllocationResponse> allocations) {
        return new SaleReturnLineResponse(
            line.getId(),
            line.getSaleLineId(),
            line.getProductId(),
            line.getLineNumber(),
            line.getQuantity(),
            line.getBaseQuantity(),
            line.getUnitRefundPrice(),
            line.getTaxRate(),
            line.getTaxAmount(),
            line.getLineTotal(),
            allocations
        );
    }
}
