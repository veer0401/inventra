package com.inventra.inventra_backend.tenant.subscription.api.dto;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

public record PricingConfigResponse(
    List<TierPricing> tiers,
    int currentAnnualDiscountPct
) {
    public record TierPricing(
        String tier,
        String planName,
        BigDecimal monthlyPrice,
        String description,
        int annualDiscountPct,
        List<String> features,
        int workstationLimit,
        int branchLimit,
        double storageLimitGb,
        int alertLimit
    ) {
        public TierPricing(
            String tier,
            String planName,
            BigDecimal monthlyPrice,
            String description,
            int annualDiscountPct
        ) {
            this(
                tier,
                planName,
                monthlyPrice,
                description,
                annualDiscountPct,
                Collections.emptyList(),
                1,
                1,
                2.0,
                500
            );
        }
    }
}
