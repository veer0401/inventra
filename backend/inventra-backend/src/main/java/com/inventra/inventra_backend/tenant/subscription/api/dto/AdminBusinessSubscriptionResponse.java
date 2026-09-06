package com.inventra.inventra_backend.tenant.subscription.api.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record AdminBusinessSubscriptionResponse(
    String businessId,
    String legalName,
    String gstin,
    String tier,
    String planName,
    String status,
    String billingCycle,
    BigDecimal amount,
    long daysRemaining,
    boolean autoRenew,
    Instant currentPeriodEnd,
    int activeWorkstations,
    int branchCount,
    int userCount
) {}
