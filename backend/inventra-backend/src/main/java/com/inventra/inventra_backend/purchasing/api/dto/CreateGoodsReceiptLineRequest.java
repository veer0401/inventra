package com.inventra.inventra_backend.purchasing.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreateGoodsReceiptLineRequest(
    UUID purchaseOrderLineId,

    @NotNull(message = "Product ID is required")
    UUID productId,

    @NotNull(message = "Received quantity is required")
    @DecimalMin(value = "0.001", message = "Received quantity must be greater than 0")
    BigDecimal receivedQuantity,

    @NotBlank(message = "Purchase unit is required")
    @Size(max = 50, message = "Purchase unit cannot exceed 50 characters")
    String purchaseUnit,

    @NotNull(message = "Conversion factor is required")
    @Min(value = 1, message = "Conversion factor must be at least 1")
    Integer conversionFactor,

    BigDecimal rejectedQuantity,

    @Size(max = 100, message = "Batch number cannot exceed 100 characters")
    String batchNumber,

    LocalDate manufacturingDate,
    LocalDate expiryDate,

    @NotNull(message = "Unit cost is required")
    @DecimalMin(value = "0.0000", message = "Unit cost must be non-negative")
    BigDecimal unitCost,

    BigDecimal mrp,
    BigDecimal sellingPrice,
    BigDecimal taxRate
) {}
