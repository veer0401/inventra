package com.inventra.inventra_backend.reporting.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record InventoryValuationReportResponse(
    long totalProducts,
    long inStockProducts,
    long lowStockProducts,
    long outOfStockProducts,
    BigDecimal totalQuantityOnHand,
    BigDecimal valuationAtCost,
    BigDecimal valuationAtRetail,
    BigDecimal potentialProfit,
    BigDecimal profitMarginPercent,
    List<CategoryValuationDto> categoryBreakdown
) {
    public record CategoryValuationDto(
        String categoryName,
        long productCount,
        BigDecimal totalQuantity,
        BigDecimal valuationAtCost,
        BigDecimal valuationAtRetail
    ) {}
}
