package com.inventra.inventra_backend.onboarding.api.dto;

import com.inventra.inventra_backend.onboarding.domain.model.BusinessRegistrationApplication;
import com.inventra.inventra_backend.onboarding.domain.model.OnboardingApplicationStatus;
import java.time.Instant;
import java.util.UUID;

public record OnboardingApplicationDetailResponse(
    UUID id,
    String applicantName,
    String applicantEmail,
    String applicantPhone,
    String businessName,
    String tradeName,
    String drugLicenseNumber,
    String gstin,
    String storeName,
    String storeCode,
    String addressLine1,
    String addressLine2,
    String city,
    String state,
    String postalCode,
    OnboardingApplicationStatus status,
    Instant submittedAt,
    Instant reviewedAt,
    UUID reviewedBy,
    String rejectionReason,
    Instant activationCompletedAt,
    UUID createdBusinessId,
    UUID createdUserId
) {
    public static OnboardingApplicationDetailResponse from(BusinessRegistrationApplication app) {
        return new OnboardingApplicationDetailResponse(
            app.getId(),
            app.getApplicantName(),
            app.getApplicantEmail(),
            app.getApplicantPhone(),
            app.getBusinessName(),
            app.getTradeName(),
            app.getDrugLicenseNumber(),
            app.getGstin(),
            app.getStoreName(),
            app.getStoreCode(),
            app.getAddressLine1(),
            app.getAddressLine2(),
            app.getCity(),
            app.getState(),
            app.getPostalCode(),
            app.getStatus(),
            app.getSubmittedAt(),
            app.getReviewedAt(),
            app.getReviewedBy(),
            app.getRejectionReason(),
            app.getActivationCompletedAt(),
            app.getCreatedBusinessId(),
            app.getCreatedUserId()
        );
    }
}
