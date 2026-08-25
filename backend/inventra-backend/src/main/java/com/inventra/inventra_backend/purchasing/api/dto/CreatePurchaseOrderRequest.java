package com.inventra.inventra_backend.purchasing.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreatePurchaseOrderRequest(
    @NotNull(message = "Store ID is required")
    UUID storeId,

    @NotNull(message = "Supplier ID is required")
    UUID supplierId,

    LocalDate orderDate,
    LocalDate expectedDeliveryDate,
    BigDecimal discountAmount,

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    String notes,

    @NotEmpty(message = "At least one purchase order line is required")
    @Valid
    List<CreatePurchaseOrderLineRequest> lines
) {}
