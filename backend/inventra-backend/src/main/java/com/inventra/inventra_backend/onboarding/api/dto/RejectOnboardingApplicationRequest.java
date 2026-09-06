package com.inventra.inventra_backend.onboarding.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectOnboardingApplicationRequest(
    @NotBlank(message = "Rejection reason is required")
    @Size(min = 5, max = 1000, message = "Rejection reason must be between 5 and 1000 characters")
    String rejectionReason
) {}
