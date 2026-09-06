package com.inventra.inventra_backend.tenant.subscription.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.subscription.api.dto.AdminBusinessSubscriptionResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.AdminStoreDetailsResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.PricingConfigResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.RecordPaymentRequest;
import com.inventra.inventra_backend.tenant.subscription.api.dto.SubscriptionDetailsResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.ToggleAutopayRequest;
import com.inventra.inventra_backend.tenant.subscription.api.dto.UpdatePricingRequest;
import com.inventra.inventra_backend.tenant.subscription.application.SubscriptionService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/subscription")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class AdminSubscriptionController {

    private final SubscriptionService subscriptionService;
    private final BusinessRepository businessRepository;

    public AdminSubscriptionController(
        SubscriptionService subscriptionService,
        BusinessRepository businessRepository
    ) {
        this.subscriptionService = subscriptionService;
        this.businessRepository = businessRepository;
    }

    /**
     * GET /api/v1/admin/subscription/businesses
     * Lists all tenant businesses with their current subscription snapshot (paginated).
     */
    @GetMapping("/businesses")
    public ApiResponse<org.springframework.data.domain.Page<AdminBusinessSubscriptionResponse>> getAllBusinessSubscriptions(
        @org.springframework.web.bind.annotation.RequestParam(required = false) String search,
        @org.springframework.data.web.PageableDefault(size = 10, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC)
        org.springframework.data.domain.Pageable pageable
    ) {
        return ApiResponse.ok(subscriptionService.getAllBusinessSubscriptions(search, pageable));
    }

    /**
     * GET /api/v1/admin/subscription/businesses/{businessId}/details
     * Returns real database telemetry, quota usage, user accounts, branches, and invoices for this store.
     */
    @GetMapping("/businesses/{businessId}/details")
    public ApiResponse<AdminStoreDetailsResponse> getStoreDetails(@PathVariable UUID businessId) {
        requireBusinessExists(businessId);
        return ApiResponse.ok(subscriptionService.getStoreDetails(businessId));
    }

    /**
     * GET /api/v1/admin/subscription/pricing
     * Returns the current platform-wide pricing configuration for all tiers.
     */
    @GetMapping("/pricing")
    public ApiResponse<PricingConfigResponse> getPricing() {
        return ApiResponse.ok(subscriptionService.getPricing());
    }

    /**
     * PUT /api/v1/admin/subscription/pricing
     * Admin updates the price, description, or annual discount for a tier.
     */
    @PutMapping("/pricing")
    public ApiResponse<PricingConfigResponse> updatePricing(@Valid @RequestBody UpdatePricingRequest request) {
        return ApiResponse.ok(subscriptionService.updatePricing(request));
    }

    /**
     * POST /api/v1/admin/subscription/businesses/{businessId}/payment
     * Admin manually records a confirmed payment for a business.
     */
    @PostMapping("/businesses/{businessId}/payment")
    public ApiResponse<SubscriptionDetailsResponse> recordPayment(
        @PathVariable UUID businessId,
        @Valid @RequestBody RecordPaymentRequest request
    ) {
        requireBusinessExists(businessId);
        return ApiResponse.ok(subscriptionService.recordPaymentForBusiness(businessId, request.paymentReference()));
    }

    /**
     * POST /api/v1/admin/subscription/businesses/{businessId}/autopay
     * Admin toggles autopay status for a specific business.
     */
    @PostMapping("/businesses/{businessId}/autopay")
    public ApiResponse<SubscriptionDetailsResponse> toggleAutopay(
        @PathVariable UUID businessId,
        @Valid @RequestBody ToggleAutopayRequest request
    ) {
        requireBusinessExists(businessId);
        return ApiResponse.ok(subscriptionService.toggleAutopayForBusiness(businessId, request.enabled()));
    }

    /**
     * GET /api/v1/admin/subscription/invoices/{invoiceId}/pdf
     * Downloads official PDF tax invoice for any tenant store.
     */
    @GetMapping("/invoices/{invoiceId}/pdf")
    public org.springframework.http.ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable UUID invoiceId) {
        byte[] pdfBytes = subscriptionService.generateInvoicePdfForAdmin(invoiceId);
        return org.springframework.http.ResponseEntity.ok()
            .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Inventra-Invoice-" + invoiceId + ".pdf\"")
            .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
            .body(pdfBytes);
    }

    private void requireBusinessExists(UUID businessId) {
        if (!businessRepository.existsById(businessId)) {
            throw new ResourceNotFoundException("Business", businessId.toString());
        }
    }
}
