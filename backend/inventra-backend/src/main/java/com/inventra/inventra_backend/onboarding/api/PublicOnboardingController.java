package com.inventra.inventra_backend.onboarding.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingApplicationSummaryResponse;
import com.inventra.inventra_backend.onboarding.api.dto.SubmitOnboardingApplicationRequest;
import com.inventra.inventra_backend.onboarding.application.OnboardingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.inventra.inventra_backend.onboarding.api.dto.OnboardingAvailabilityResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/v1/onboarding")
public class PublicOnboardingController {

    private final OnboardingService onboardingService;

    public PublicOnboardingController(OnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    @GetMapping("/check-availability")
    public ResponseEntity<ApiResponse<OnboardingAvailabilityResponse>> checkAvailability(
        @RequestParam(required = false) String email,
        @RequestParam(required = false) String phone,
        @RequestParam(required = false) String drugLicenseNumber
    ) {
        OnboardingAvailabilityResponse response = onboardingService.checkAvailability(email, phone, drugLicenseNumber);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/apply")
    public ResponseEntity<ApiResponse<OnboardingApplicationSummaryResponse>> apply(
        @Valid @RequestBody SubmitOnboardingApplicationRequest request,
        HttpServletRequest httpRequest
    ) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        OnboardingApplicationSummaryResponse response = onboardingService.submitApplication(request, ipAddress, userAgent);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }
}
