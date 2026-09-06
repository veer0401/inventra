package com.inventra.inventra_backend.catalog.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateGlobalMedicineRequest(
    @NotBlank(message = "Medicine name is required")
    @Size(max = 200, message = "Medicine name must not exceed 200 characters")
    String name,

    @NotBlank(message = "Generic salt name is required")
    @Size(max = 255, message = "Generic name must not exceed 255 characters")
    String genericName,

    @Size(max = 100, message = "Brand name must not exceed 100 characters")
    String brandName,

    @Size(max = 150, message = "Manufacturer must not exceed 150 characters")
    String manufacturer,

    @NotNull(message = "Dosage form is required")
    DosageForm dosageForm,

    @Size(max = 50, message = "Strength must not exceed 50 characters")
    String strength,

    @NotBlank(message = "Base unit is required")
    @Size(max = 30, message = "Base unit must not exceed 30 characters")
    String baseUnit,

    @Size(max = 50, message = "Selling unit must not exceed 50 characters")
    String sellingUnit,

    @Min(value = 1, message = "unitsPerSellingUnit must be at least 1")
    Integer unitsPerSellingUnit,

    @Size(max = 20, message = "HSN code must not exceed 20 characters")
    String hsnCode,

    @DecimalMin(value = "0.0", message = "Tax rate must be non-negative")
    BigDecimal taxRate,

    Boolean prescriptionRequired,

    @Size(max = 100, message = "Category name must not exceed 100 characters")
    String categoryName,

    @Size(max = 100, message = "Barcode must not exceed 100 characters")
    String barcode,

    String description
) {}
