package com.inventra.inventra_backend.purchasing.api.dto;

import com.inventra.inventra_backend.purchasing.domain.model.SupplierStatus;
import com.inventra.inventra_backend.purchasing.domain.model.SupplierType;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateSupplierRequest(
    @Size(max = 200, message = "Legal name cannot exceed 200 characters")
    String legalName,

    @Size(max = 200, message = "Trade name cannot exceed 200 characters")
    String tradeName,

    SupplierType supplierType,

    @Size(max = 20, message = "GSTIN cannot exceed 20 characters")
    String gstin,

    @Size(max = 100, message = "Drug license number cannot exceed 100 characters")
    String drugLicenseNumber,

    @Size(max = 20, message = "PAN cannot exceed 20 characters")
    String pan,

    @Size(max = 150, message = "Email cannot exceed 150 characters")
    String email,

    @Size(max = 30, message = "Phone number cannot exceed 30 characters")
    String phoneNumber,

    @Size(max = 150, message = "Contact person name cannot exceed 150 characters")
    String contactPersonName,

    @Size(max = 255, message = "Address line 1 cannot exceed 255 characters")
    String addressLine1,

    @Size(max = 255, message = "Address line 2 cannot exceed 255 characters")
    String addressLine2,

    @Size(max = 100, message = "City cannot exceed 100 characters")
    String city,

    @Size(max = 100, message = "State cannot exceed 100 characters")
    String state,

    @Size(max = 20, message = "Postal code cannot exceed 20 characters")
    String postalCode,

    Integer paymentTermsDays,
    BigDecimal creditLimit,
    SupplierStatus status,

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    String notes
) {}
