package com.inventra.inventra_backend.purchasing.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateSupplierProductRequest(
    @NotNull(message = "Product ID is required")
    UUID productId,

    @Size(max = 100, message = "Supplier product code cannot exceed 100 characters")
    String supplierProductCode,

    @Size(max = 255, message = "Supplier product name cannot exceed 255 characters")
    String supplierProductName,

    @NotBlank(message = "Purchase unit is required")
    @Size(max = 50, message = "Purchase unit cannot exceed 50 characters")
    String purchaseUnit,

    @NotNull(message = "Conversion factor is required")
    @Min(value = 1, message = "Conversion factor must be at least 1")
    Integer conversionFactor,

    BigDecimal lastPurchasePrice,
    Boolean isPreferred,
    BigDecimal minOrderQuantity,
    Integer leadTimeDays
) {}
