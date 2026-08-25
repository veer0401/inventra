package com.inventra.inventra_backend.sales.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateSaleRequest(
    @NotNull(message = "storeId is required")
    UUID storeId,

    LocalDate saleDate,

    String customerName,

    String customerPhone,

    @DecimalMin(value = "0.00", message = "discountAmount must be non-negative")
    BigDecimal discountAmount,

    BigDecimal roundOffAmount,

    String idempotencyKey,

    String notes,

    @NotEmpty(message = "Sale must contain at least one line item")
    List<@Valid CreateSaleLineRequest> lines,

    @NotEmpty(message = "Sale must contain at least one payment")
    List<@Valid CreateSalePaymentRequest> payments
) {
}
