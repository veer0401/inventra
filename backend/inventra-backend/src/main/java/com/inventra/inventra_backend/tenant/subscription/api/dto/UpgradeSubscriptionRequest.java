package com.inventra.inventra_backend.tenant.subscription.api.dto;

public record UpgradeSubscriptionRequest(
    String targetTier,
    String targetBillingCycle,
    String couponCode
) {
    public UpgradeSubscriptionRequest(String targetTier, String targetBillingCycle) {
        this(targetTier, targetBillingCycle, null);
    }
}
