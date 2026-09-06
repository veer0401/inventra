package com.inventra.inventra_backend.tenant.subscription.api.dto;

import jakarta.validation.constraints.NotBlank;

public record ChangePlanRequest(
    @NotBlank(message = "Plan tier is required")
    String tier,

    @NotBlank(message = "Billing cycle is required (MONTHLY or ANNUALLY)")
    String billingCycle
) {}
