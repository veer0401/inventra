package com.inventra.inventra_backend.tenant.subscription.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public record UpdateCouponRequest(
    @NotBlank String description,
    @NotBlank String discountType,
    @NotNull @DecimalMin("0.01") BigDecimal discountValue,
    BigDecimal maxDiscountAmount,
    boolean firstTimeOnly,
    String minTier,
    String minCycle,
    BigDecimal minOrderAmount,
    Integer maxUses,
    Instant validUntil,
    Boolean active
) {}
