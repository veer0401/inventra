package com.inventra.inventra_backend.tenant.subscription.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.tenant.domain.model.BusinessMembership;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessMembershipRepository;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.subscription.api.dto.ChangePlanRequest;
import com.inventra.inventra_backend.tenant.subscription.api.dto.LicenseInvoiceResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.SubscriptionDetailsResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.ToggleAutopayRequest;
import com.inventra.inventra_backend.tenant.subscription.application.SubscriptionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/subscription")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final BusinessMembershipRepository membershipRepository;
    private final BusinessRepository businessRepository;

    public SubscriptionController(
        SubscriptionService subscriptionService,
        BusinessMembershipRepository membershipRepository,
        BusinessRepository businessRepository
    ) {
        this.subscriptionService = subscriptionService;
        this.membershipRepository = membershipRepository;
        this.businessRepository = businessRepository;
    }

    @GetMapping("/current")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<SubscriptionDetailsResponse> getCurrentSubscription(Authentication authentication) {
        UUID businessId = resolveBusinessId(authentication);
        return ApiResponse.ok(subscriptionService.getSubscription(businessId));
    }

    @GetMapping("/invoices")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<LicenseInvoiceResponse>> getLicenseInvoices(Authentication authentication) {
        UUID businessId = resolveBusinessId(authentication);
        return ApiResponse.ok(subscriptionService.getInvoices(businessId));
    }

    /**
     * GET /api/v1/subscription/pricing
     * Returns current tier pricing visible to owners (reflects admin-configured prices).
     */
    @GetMapping("/pricing")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<com.inventra.inventra_backend.tenant.subscription.api.dto.PricingConfigResponse> getPricing() {
        return ApiResponse.ok(subscriptionService.getPricing());
    }

    @PostMapping("/change-plan")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'ADMIN', 'PLATFORM_ADMIN')")
    public ApiResponse<SubscriptionDetailsResponse> changePlan(
        @Valid @RequestBody ChangePlanRequest request,
        Authentication authentication
    ) {
        UUID businessId = resolveBusinessId(authentication);
        return ApiResponse.ok(subscriptionService.changePlan(businessId, request));
    }

    @PostMapping("/autopay")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'ADMIN', 'PLATFORM_ADMIN')")
    public ApiResponse<SubscriptionDetailsResponse> toggleAutopay(
        @Valid @RequestBody ToggleAutopayRequest request,
        Authentication authentication
    ) {
        UUID businessId = resolveBusinessId(authentication);
        return ApiResponse.ok(subscriptionService.toggleAutopay(businessId, request.enabled()));
    }

    @GetMapping("/upgrade-preview")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<com.inventra.inventra_backend.tenant.subscription.api.dto.UpgradePreviewResponse> getUpgradePreview(
        @RequestParam String targetTier,
        @RequestParam(defaultValue = "MONTHLY") String targetBillingCycle,
        Authentication authentication
    ) {
        UUID businessId = resolveBusinessId(authentication);
        return ApiResponse.ok(subscriptionService.calculateUpgradePreview(businessId, targetTier, targetBillingCycle));
    }

    @GetMapping("/invoices/{invoiceId}/pdf")
    @PreAuthorize("isAuthenticated()")
    public org.springframework.http.ResponseEntity<byte[]> downloadInvoicePdf(
        @org.springframework.web.bind.annotation.PathVariable UUID invoiceId,
        Authentication authentication
    ) {
        UUID businessId = resolveBusinessId(authentication);
        byte[] pdfBytes = subscriptionService.generateInvoicePdf(businessId, invoiceId);
        return org.springframework.http.ResponseEntity.ok()
            .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Inventra-Invoice-" + invoiceId + ".pdf\"")
            .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
            .body(pdfBytes);
    }

    private UUID resolveBusinessId(Authentication authentication) {
        var contextOpt = TenantContextHolder.getContext();
        if (contextOpt.isPresent()) {
            return UUID.fromString(contextOpt.get().tenantId().value());
        }

        UUID userId = (UUID) authentication.getPrincipal();
        List<BusinessMembership> memberships = membershipRepository.findByUserId(userId);
        if (!memberships.isEmpty()) {
            return memberships.get(0).getBusinessId();
        }

        var allBusinesses = businessRepository.findAll();
        if (!allBusinesses.isEmpty()) {
            return allBusinesses.get(0).getId();
        }

        throw new ResourceNotFoundException("No active business tenancy found for current user", userId.toString());
    }
}
