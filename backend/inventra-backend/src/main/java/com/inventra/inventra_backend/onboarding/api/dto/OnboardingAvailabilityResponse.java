package com.inventra.inventra_backend.onboarding.api.dto;

public record OnboardingAvailabilityResponse(
    boolean emailAvailable,
    String emailMessage,
    boolean phoneAvailable,
    String phoneMessage,
    boolean drugLicenseAvailable,
    String drugLicenseMessage,
    boolean allAvailable
) {
    public static OnboardingAvailabilityResponse available() {
        return new OnboardingAvailabilityResponse(true, null, true, null, true, null, true);
    }
}
