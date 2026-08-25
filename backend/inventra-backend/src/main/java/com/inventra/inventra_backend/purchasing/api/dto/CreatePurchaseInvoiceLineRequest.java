package com.inventra.inventra_backend.purchasing.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record CreatePurchaseInvoiceLineRequest(
    UUID goodsReceiptLineId,

    @NotNull(message = "Product ID is required")
    UUID productId,

    @NotNull(message = "Invoiced quantity is required")
    @DecimalMin(value = "0.001", message = "Invoiced quantity must be greater than 0")
    BigDecimal invoicedQuantity,

    @NotNull(message = "Unit cost is required")
    @DecimalMin(value = "0.0000", message = "Unit cost must be non-negative")
    BigDecimal unitCost,

    BigDecimal discountAmount,
    BigDecimal taxRate
) {}
