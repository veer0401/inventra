package com.inventra.inventra_backend.tenant.subscription.api.dto;

import java.math.BigDecimal;

public record UpgradePreviewResponse(
    String currentTier,
    String currentCycle,
    BigDecimal currentPrice,
    long daysRemaining,
    long totalPeriodDays,
    BigDecimal dailyRate,
    BigDecimal unusedCredit,
    String targetTier,
    String targetCycle,
    BigDecimal targetPrice,
    BigDecimal netSubtotal,
    BigDecimal cgstAmount,
    BigDecimal sgstAmount,
    BigDecimal totalPayable
) {}
