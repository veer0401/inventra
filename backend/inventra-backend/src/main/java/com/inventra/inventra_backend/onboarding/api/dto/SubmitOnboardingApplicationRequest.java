package com.inventra.inventra_backend.onboarding.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubmitOnboardingApplicationRequest(
    @NotBlank(message = "Applicant name is required")
    @Size(max = 150, message = "Applicant name must not exceed 150 characters")
    String applicantName,

    @NotBlank(message = "Applicant email is required")
    @Email(message = "Valid email is required")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    String applicantEmail,

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    String applicantPhone,

    @NotBlank(message = "Business name is required")
    @Size(max = 255, message = "Business name must not exceed 255 characters")
    String businessName,

    @Size(max = 255, message = "Trade name must not exceed 255 characters")
    String tradeName,

    @Size(max = 100, message = "Drug license number must not exceed 100 characters")
    String drugLicenseNumber,

    @Size(max = 20, message = "GSTIN must not exceed 20 characters")
    String gstin,

    @NotBlank(message = "Store name is required")
    @Size(max = 200, message = "Store name must not exceed 200 characters")
    String storeName,

    @Size(max = 50, message = "Store code must not exceed 50 characters")
    String storeCode,

    @Size(max = 255, message = "Address line 1 must not exceed 255 characters")
    String addressLine1,

    @Size(max = 255, message = "Address line 2 must not exceed 255 characters")
    String addressLine2,

    @Size(max = 100, message = "City must not exceed 100 characters")
    String city,

    @Size(max = 100, message = "State must not exceed 100 characters")
    String state,

    @Size(max = 20, message = "Postal code must not exceed 20 characters")
    String postalCode
) {}
