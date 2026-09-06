package com.inventra.inventra_backend.reporting.api.dto;

import java.math.BigDecimal;

public record ReportSummaryResponse(
    BigDecimal totalSalesRevenue,
    long totalSalesCount,
    BigDecimal averageOrderValue,
    long totalItemsSold,
    BigDecimal totalTaxCollected,
    BigDecimal totalDiscountGiven,
    long totalReturnsCount,
    BigDecimal totalRefundAmount,
    BigDecimal inventoryCostValuation,
    BigDecimal inventoryRetailValuation,
    long totalActiveBatches,
    long nearExpiryBatchCount,
    long expiredBatchCount,
    long lowStockItemCount
) {}
