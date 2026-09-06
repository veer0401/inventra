package com.inventra.inventra_backend.tenant.subscription.api.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CouponResponse(
    String code,
    String description,
    String discountType,
    BigDecimal discountValue,
    BigDecimal maxDiscountAmount,
    boolean firstTimeOnly,
    String minTier,
    String minCycle,
    BigDecimal minOrderAmount,
    int maxUses,
    int currentUses,
    Instant validUntil,
    boolean active,
    Instant createdAt
) {}
