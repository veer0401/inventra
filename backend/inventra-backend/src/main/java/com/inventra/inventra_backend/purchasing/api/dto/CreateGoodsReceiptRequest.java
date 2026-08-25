package com.inventra.inventra_backend.purchasing.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateGoodsReceiptRequest(
    @NotNull(message = "Store ID is required")
    UUID storeId,

    @NotNull(message = "Supplier ID is required")
    UUID supplierId,

    UUID purchaseOrderId,

    @Size(max = 100, message = "Vendor delivery note cannot exceed 100 characters")
    String vendorDeliveryNote,

    LocalDate receivedDate,

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    String notes,

    @Size(max = 100, message = "Idempotency key cannot exceed 100 characters")
    String idempotencyKey,

    @NotEmpty(message = "At least one goods receipt line is required")
    @Valid
    List<CreateGoodsReceiptLineRequest> lines
) {}
