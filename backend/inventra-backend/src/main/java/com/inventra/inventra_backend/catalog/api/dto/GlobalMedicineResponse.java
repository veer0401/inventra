package com.inventra.inventra_backend.catalog.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicine;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicineStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record GlobalMedicineResponse(
    UUID id,
    String name,
    String genericName,
    String brandName,
    String manufacturer,
    DosageForm dosageForm,
    String strength,
    String baseUnit,
    String sellingUnit,
    int unitsPerSellingUnit,
    String hsnCode,
    BigDecimal taxRate,
    boolean prescriptionRequired,
    String categoryName,
    String barcode,
    String description,
    GlobalMedicineStatus status,
    Instant createdAt,
    Instant updatedAt
) {
    public static GlobalMedicineResponse from(GlobalMedicine m) {
        return new GlobalMedicineResponse(
            m.getId(),
            m.getName(),
            m.getGenericName(),
            m.getBrandName(),
            m.getManufacturer(),
            m.getDosageForm(),
            m.getStrength(),
            m.getBaseUnit(),
            m.getSellingUnit(),
            m.getUnitsPerSellingUnit(),
            m.getHsnCode(),
            m.getTaxRate(),
            m.isPrescriptionRequired(),
            m.getCategoryName(),
            m.getBarcode(),
            m.getDescription(),
            m.getStatus(),
            m.getCreatedAt(),
            m.getUpdatedAt()
        );
    }
}
