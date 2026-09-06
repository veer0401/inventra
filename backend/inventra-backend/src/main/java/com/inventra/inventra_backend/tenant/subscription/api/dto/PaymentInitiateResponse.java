package com.inventra.inventra_backend.tenant.subscription.api.dto;

import java.math.BigDecimal;

public record PaymentInitiateResponse(
    String orderId,
    String businessId,
    BigDecimal amount,
    String currency,
    String gatewayKey,
    String description,
    String upiQrString,
    BigDecimal unusedCredit,
    String couponCode,
    BigDecimal couponDiscount
) {
    public PaymentInitiateResponse(
        String orderId,
        String businessId,
        BigDecimal amount,
        String currency,
        String gatewayKey,
        String description,
        String upiQrString,
        BigDecimal unusedCredit
    ) {
        this(orderId, businessId, amount, currency, gatewayKey, description, upiQrString, unusedCredit, null, BigDecimal.ZERO);
    }
}
