package com.inventra.inventra_backend.purchasing.api.dto;

import com.inventra.inventra_backend.purchasing.domain.model.Supplier;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierStatus;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SupplierResponse(
    UUID id,
    UUID businessId,
    String supplierCode,
    String legalName,
    String tradeName,
    SupplierType supplierType,
    String gstin,
    String drugLicenseNumber,
    String pan,
    String email,
    String phoneNumber,
    String contactPersonName,
    String addressLine1,
    String addressLine2,
    String city,
    String state,
    String postalCode,
    int paymentTermsDays,
    BigDecimal creditLimit,
    SupplierStatus status,
    String notes,
    Instant createdAt,
    Instant updatedAt
) {
    public static SupplierResponse from(Supplier s) {
        return new SupplierResponse(
            s.getId(),
            s.getBusinessId(),
            s.getSupplierCode(),
            s.getLegalName(),
            s.getTradeName(),
            s.getSupplierType(),
            s.getGstin(),
            s.getDrugLicenseNumber(),
            s.getPan(),
            s.getEmail(),
            s.getPhoneNumber(),
            s.getContactPersonName(),
            s.getAddressLine1(),
            s.getAddressLine2(),
            s.getCity(),
            s.getState(),
            s.getPostalCode(),
            s.getPaymentTermsDays(),
            s.getCreditLimit(),
            s.getStatus(),
            s.getNotes(),
            s.getCreatedAt(),
            s.getUpdatedAt()
        );
    }
}
