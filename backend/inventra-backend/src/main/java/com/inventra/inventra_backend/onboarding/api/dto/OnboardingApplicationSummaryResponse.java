package com.inventra.inventra_backend.onboarding.api.dto;

import com.inventra.inventra_backend.onboarding.domain.model.BusinessRegistrationApplication;
import com.inventra.inventra_backend.onboarding.domain.model.OnboardingApplicationStatus;
import java.time.Instant;
import java.util.UUID;

public record OnboardingApplicationSummaryResponse(
    UUID id,
    String applicantName,
    String applicantEmail,
    String applicantPhone,
    String businessName,
    String storeName,
    OnboardingApplicationStatus status,
    Instant submittedAt,
    Instant reviewedAt
) {
    public static OnboardingApplicationSummaryResponse from(BusinessRegistrationApplication app) {
        return new OnboardingApplicationSummaryResponse(
            app.getId(),
            app.getApplicantName(),
            app.getApplicantEmail(),
            app.getApplicantPhone(),
            app.getBusinessName(),
            app.getStoreName(),
            app.getStatus(),
            app.getSubmittedAt(),
            app.getReviewedAt()
        );
    }
}
