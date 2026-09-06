package com.inventra.inventra_backend.tenant.subscription.api.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyPaymentRequest(
    @NotBlank String razorpayPaymentId,
    @NotBlank String razorpayOrderId,
    @NotBlank String razorpaySignature
) {}
