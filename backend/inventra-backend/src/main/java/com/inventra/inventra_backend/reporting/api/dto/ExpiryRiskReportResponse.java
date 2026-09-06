package com.inventra.inventra_backend.reporting.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExpiryRiskReportResponse(
    long critical30DaysCount,
    BigDecimal critical30DaysValue,
    long warning60DaysCount,
    BigDecimal warning60DaysValue,
    long warning90DaysCount,
    BigDecimal warning90DaysValue,
    long expiredCount,
    BigDecimal expiredValue,
    List<ExpiryBatchDto> batches
) {
    public record ExpiryBatchDto(
        UUID batchId,
        UUID productId,
        String productName,
        String batchNumber,
        LocalDate expiryDate,
        BigDecimal quantity,
        BigDecimal costPrice,
        BigDecimal sellingPrice,
        BigDecimal totalCostValue,
        String riskLevel, // EXPIRED, CRITICAL_30, WARNING_60, WARNING_90
        long daysUntilExpiry
    ) {}
}
