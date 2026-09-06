package com.inventra.inventra_backend.sales.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateSaleLineRequest(
    @NotNull(message = "productId is required")
    UUID productId,

    @NotNull(message = "quantity is required")
    @DecimalMin(value = "0.001", message = "quantity must be greater than 0")
    BigDecimal quantity,

    String sellingUnit,

    @DecimalMin(value = "0.00", message = "discountPercentage must be non-negative")
    BigDecimal discountPercentage,

    UUID batchId // Optional manual batch override; if null, automatic FEFO allocation is used
) {
}
