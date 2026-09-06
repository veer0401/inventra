package com.inventra.inventra_backend.onboarding.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.inventra.inventra_backend.onboarding.domain.model.OnboardingApplicationStatus;
import java.time.Instant;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record OnboardingApprovalResponse(
    UUID applicationId,
    UUID businessId,
    UUID userId,
    OnboardingApplicationStatus status,
    Instant reviewedAt,
    String devActivationToken,
    String devActivationUrl
) {}
