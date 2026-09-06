package com.inventra.inventra_backend.reporting.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProductVelocityReportResponse(
    List<ProductVelocityItemDto> fastMovers,
    List<ProductVelocityItemDto> slowMovers,
    List<ProductVelocityItemDto> nonMovingItems
) {
    public record ProductVelocityItemDto(
        UUID productId,
        String productName,
        String sku,
        BigDecimal totalQuantitySold,
        BigDecimal totalRevenue,
        long salesCount,
        BigDecimal currentStock
    ) {}
}
