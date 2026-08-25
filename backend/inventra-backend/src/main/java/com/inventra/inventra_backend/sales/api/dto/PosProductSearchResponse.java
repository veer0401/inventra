package com.inventra.inventra_backend.sales.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PosProductSearchResponse(
    UUID productId,
    String name,
    String genericName,
    String brandName,
    String manufacturer,
    DosageForm dosageForm,
    String strength,
    String baseUnit,
    String sellingUnit,
    int unitsPerSellingUnit,
    BigDecimal taxRate,
    boolean isTaxInclusive,
    boolean prescriptionRequired,
    BigDecimal currentStock,
    boolean isBatchTracked,
    BigDecimal defaultSellingPrice,
    BigDecimal defaultMrp,
    String fefoBatchNumber,
    LocalDate fefoExpiryDate,
    BigDecimal fefoSellingPrice,
    BigDecimal fefoMrp
) {
}
