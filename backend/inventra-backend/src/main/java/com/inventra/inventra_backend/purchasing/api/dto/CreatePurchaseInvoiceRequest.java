package com.inventra.inventra_backend.purchasing.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreatePurchaseInvoiceRequest(
    @NotNull(message = "Store ID is required")
    UUID storeId,

    @NotNull(message = "Supplier ID is required")
    UUID supplierId,

    UUID purchaseOrderId,
    UUID goodsReceiptId,

    @NotBlank(message = "Supplier invoice number is required")
    @Size(max = 100, message = "Supplier invoice number cannot exceed 100 characters")
    String supplierInvoiceNumber,

    LocalDate invoiceDate,
    LocalDate dueDate,
    BigDecimal discountAmount,
    BigDecimal roundOffAmount,

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    String notes,

    @NotEmpty(message = "At least one purchase invoice line is required")
    @Valid
    List<CreatePurchaseInvoiceLineRequest> lines
) {}
