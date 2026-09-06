package com.inventra.inventra_backend.tenant.subscription.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record SubscriptionDetailsResponse(
    String businessId,
    String legalName,
    String gstin,
    String tier,
    String planName,
    String status,
    String billingCycle,
    BigDecimal amount,
    String currency,
    Instant currentPeriodStart,
    Instant currentPeriodEnd,
    long daysRemaining,
    boolean autoRenew,
    String paymentMethodSummary,
    Map<String, Object> quotas,
    List<String> activeFeatures
) {}
