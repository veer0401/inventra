package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.sales.domain.model.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateSalePaymentRequest(
    @NotNull(message = "paymentMethod is required")
    PaymentMethod paymentMethod,

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.0001", message = "amount must be greater than 0")
    BigDecimal amount,

    @DecimalMin(value = "0.0000", message = "tenderedAmount must be non-negative")
    BigDecimal tenderedAmount,

    String transactionReference,

    String notes
) {
}
