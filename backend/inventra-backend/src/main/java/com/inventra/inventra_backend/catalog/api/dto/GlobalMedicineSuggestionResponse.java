package com.inventra.inventra_backend.catalog.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.GlobalMedicineSuggestion;
import com.inventra.inventra_backend.catalog.domain.model.SuggestionStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record GlobalMedicineSuggestionResponse(
    UUID id,
    UUID businessId,
    String businessName,
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
    String hsnCode,
    BigDecimal taxRate,
    boolean prescriptionRequired,
    SuggestionStatus status,
    String adminNotes,
    UUID reviewedBy,
    Instant reviewedAt,
    UUID globalMedicineId,
    Instant createdAt,
    Instant updatedAt
) {
    public static GlobalMedicineSuggestionResponse from(GlobalMedicineSuggestion s, String businessName) {
        return new GlobalMedicineSuggestionResponse(
            s.getId(),
            s.getBusinessId(),
            businessName,
            s.getProductId(),
            s.getName(),
            s.getGenericName(),
            s.getBrandName(),
            s.getManufacturer(),
            s.getDosageForm(),
            s.getStrength(),
            s.getBaseUnit(),
            s.getSellingUnit(),
            s.getUnitsPerSellingUnit(),
            s.getHsnCode(),
            s.getTaxRate(),
            s.isPrescriptionRequired(),
            s.getStatus(),
            s.getAdminNotes(),
            s.getReviewedBy(),
            s.getReviewedAt(),
            s.getGlobalMedicineId(),
            s.getCreatedAt(),
            s.getUpdatedAt()
        );
    }
}
