package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.RefundMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateSaleRefundRequest(
    @NotNull(message = "refundMethod is required")
    RefundMethod refundMethod,

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.0001", message = "Refund amount must be greater than 0")
    BigDecimal amount,

    String transactionReference,

    String notes
) {
}
