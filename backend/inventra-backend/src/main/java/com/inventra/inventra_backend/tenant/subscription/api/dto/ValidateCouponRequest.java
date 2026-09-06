package com.inventra.inventra_backend.tenant.subscription.api.dto;

import java.math.BigDecimal;

public record ValidateCouponRequest(
    String code,
    String tier,
    String billingCycle,
    BigDecimal subtotal
) {}
