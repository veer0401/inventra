package com.inventra.inventra_backend.tenant.subscription.api.dto;

import jakarta.validation.constraints.NotBlank;

public record RecordPaymentRequest(
    @NotBlank String paymentReference,
    String notes
) {}
