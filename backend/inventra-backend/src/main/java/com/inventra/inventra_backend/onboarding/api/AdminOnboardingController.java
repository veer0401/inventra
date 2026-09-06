package com.inventra.inventra_backend.onboarding.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingApplicationDetailResponse;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingApplicationSummaryResponse;
import com.inventra.inventra_backend.onboarding.api.dto.OnboardingApprovalResponse;
import com.inventra.inventra_backend.onboarding.api.dto.RejectOnboardingApplicationRequest;
import com.inventra.inventra_backend.onboarding.application.OnboardingService;
import com.inventra.inventra_backend.onboarding.domain.model.OnboardingApplicationStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/onboarding/applications")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class AdminOnboardingController {

    private final OnboardingService onboardingService;

    public AdminOnboardingController(OnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    @GetMapping
    public ApiResponse<Page<OnboardingApplicationSummaryResponse>> listApplications(
        @RequestParam(required = false) OnboardingApplicationStatus status,
        @PageableDefault(size = 20, sort = "submittedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ApiResponse.ok(onboardingService.listApplications(status, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<OnboardingApplicationDetailResponse> getApplication(@PathVariable UUID id) {
        return ApiResponse.ok(onboardingService.getApplication(id));
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<OnboardingApprovalResponse> approveApplication(
        @PathVariable UUID id,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID adminUserId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        return ApiResponse.ok(onboardingService.approveApplication(id, adminUserId, ipAddress, userAgent));
    }

    @PostMapping("/{id}/reject")
    public ApiResponse<OnboardingApplicationDetailResponse> rejectApplication(
        @PathVariable UUID id,
        @Valid @RequestBody RejectOnboardingApplicationRequest request,
        Authentication authentication,
        HttpServletRequest httpRequest
    ) {
        UUID adminUserId = (UUID) authentication.getPrincipal();
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        return ApiResponse.ok(onboardingService.rejectApplication(id, adminUserId, request, ipAddress, userAgent));
    }
}
