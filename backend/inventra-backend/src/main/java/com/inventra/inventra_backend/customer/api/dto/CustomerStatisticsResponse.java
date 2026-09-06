package com.inventra.inventra_backend.customer.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CustomerStatisticsResponse(
    long totalSalesCount,
    BigDecimal totalSpendAmount,
    long totalReturnsCount,
    BigDecimal totalRefundAmount,
    LocalDate lastPurchaseDate
) {
    public static CustomerStatisticsResponse empty() {
        return new CustomerStatisticsResponse(0L, BigDecimal.ZERO, 0L, BigDecimal.ZERO, null);
    }
}
