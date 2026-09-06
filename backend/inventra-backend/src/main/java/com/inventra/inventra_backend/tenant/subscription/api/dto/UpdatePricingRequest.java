package com.inventra.inventra_backend.tenant.subscription.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record UpdatePricingRequest(
    @NotBlank String tier,
    @NotNull @DecimalMin("0.00") BigDecimal monthlyPrice,
    @NotBlank String description,
    @Min(0) @Max(100) int annualDiscountPct,
    String planName,
    List<String> features,
    Integer workstationLimit,
    Integer branchLimit,
    Double storageLimitGb,
    Integer alertLimit
) {
    public UpdatePricingRequest(
        String tier,
        BigDecimal monthlyPrice,
        String description,
        int annualDiscountPct
    ) {
        this(
            tier,
            monthlyPrice,
            description,
            annualDiscountPct,
            null,
            null,
            null,
            null,
            null,
            null
        );
    }
}
