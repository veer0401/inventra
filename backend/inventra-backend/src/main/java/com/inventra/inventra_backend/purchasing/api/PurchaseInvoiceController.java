package com.inventra.inventra_backend.purchasing.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseInvoiceRequest;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseInvoiceResponse;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseInvoiceSummaryResponse;
import com.inventra.inventra_backend.purchasing.application.PurchaseInvoiceService;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseInvoiceStatus;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1/purchase-invoices")
public class PurchaseInvoiceController {

    private final PurchaseInvoiceService purchaseInvoiceService;

    public PurchaseInvoiceController(PurchaseInvoiceService purchaseInvoiceService) {
        this.purchaseInvoiceService = purchaseInvoiceService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<Page<PurchaseInvoiceSummaryResponse>> listPurchaseInvoices(
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestParam(value = "supplierId", required = false) UUID supplierId,
        @RequestParam(value = "status", required = false) PurchaseInvoiceStatus status,
        @RequestParam(value = "dueDateBefore", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDateBefore,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(purchaseInvoiceService.listPurchaseInvoices(businessId, storeId, supplierId, status, dueDateBefore, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<PurchaseInvoiceResponse> getPurchaseInvoice(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(purchaseInvoiceService.getPurchaseInvoice(businessId, id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<ApiResponse<PurchaseInvoiceResponse>> createPurchaseInvoice(
        @Valid @RequestBody CreatePurchaseInvoiceRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        PurchaseInvoiceResponse response = purchaseInvoiceService.createPurchaseInvoice(businessId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PostMapping("/{id}/post")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<PurchaseInvoiceResponse> postPurchaseInvoice(
        @PathVariable("id") UUID id,
        Authentication authentication
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = extractUserId(authentication);
        return ApiResponse.ok(purchaseInvoiceService.postPurchaseInvoice(businessId, id, userId));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<PurchaseInvoiceResponse> cancelPurchaseInvoice(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(purchaseInvoiceService.cancelPurchaseInvoice(businessId, id));
    }

    private UUID getRequiredBusinessId() {
        TenantContext context = TenantContextHolder.requireContext();
        return UUID.fromString(context.tenantId().value());
    }

    private UUID extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UUID uuid) {
            return uuid;
        }
        TenantContext context = TenantContextHolder.requireContext();
        if (context.userId() != null) {
            return UUID.fromString(context.userId());
        }
        throw new BusinessRuleViolationException("USER_CONTEXT_REQUIRED", "Authenticated user identity required for this operation");
    }
}
