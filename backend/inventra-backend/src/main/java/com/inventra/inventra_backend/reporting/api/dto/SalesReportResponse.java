package com.inventra.inventra_backend.reporting.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SalesReportResponse(
    LocalDate startDate,
    LocalDate endDate,
    BigDecimal totalRevenue,
    long totalSalesCount,
    BigDecimal totalTax,
    BigDecimal totalDiscount,
    BigDecimal cashAmount,
    BigDecimal cardAmount,
    BigDecimal upiAmount,
    BigDecimal otherAmount,
    List<DailySalesPointDto> dailyBreakdown
) {
    public record DailySalesPointDto(
        LocalDate date,
        long count,
        BigDecimal revenue,
        BigDecimal tax,
        BigDecimal discount
    ) {}
}
