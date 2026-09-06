package com.inventra.inventra_backend.sales.api.dto;

import java.math.BigDecimal;

public record ReceiptLineItemDto(
    String name,
    String batch,
    String expiry,
    BigDecimal quantity,
    BigDecimal unitPrice,
    BigDecimal tax,
    BigDecimal total
) {
}
