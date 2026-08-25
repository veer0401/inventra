package com.inventra.inventra_backend.purchasing.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record UpdatePurchaseOrderRequest(
    LocalDate expectedDeliveryDate,
    BigDecimal discountAmount,

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    String notes,

    @Valid
    List<CreatePurchaseOrderLineRequest> lines
) {}
