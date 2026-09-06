package com.inventra.inventra_backend.tenant.subscription.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public record CreateCouponRequest(
    @NotBlank String code,
    @NotBlank String description,
    @NotBlank String discountType, // 'PERCENTAGE' or 'FLAT'
    @NotNull @DecimalMin("0.01") BigDecimal discountValue,
    BigDecimal maxDiscountAmount, // Optional maximum discount cap for percentage discounts
    boolean firstTimeOnly,
    String minTier,
    String minCycle,
    BigDecimal minOrderAmount,
    Integer maxUses,
    Instant validUntil,
    Boolean active
) {}
