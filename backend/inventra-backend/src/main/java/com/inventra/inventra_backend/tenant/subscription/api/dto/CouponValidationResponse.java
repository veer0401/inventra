package com.inventra.inventra_backend.tenant.subscription.api.dto;

import java.math.BigDecimal;

public record CouponValidationResponse(
    boolean valid,
    String code,
    String message,
    String discountType,
    BigDecimal discountValue,
    BigDecimal discountAmount,
    BigDecimal originalSubtotal,
    BigDecimal newSubtotal,
    BigDecimal cgstAmount,
    BigDecimal sgstAmount,
    BigDecimal totalPayable
) {}
