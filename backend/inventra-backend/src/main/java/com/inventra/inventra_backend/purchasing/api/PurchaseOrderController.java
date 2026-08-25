package com.inventra.inventra_backend.purchasing.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.purchasing.api.dto.CancelOrderRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreatePurchaseOrderRequest;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseOrderResponse;
import com.inventra.inventra_backend.purchasing.api.dto.PurchaseOrderSummaryResponse;
import com.inventra.inventra_backend.purchasing.api.dto.UpdatePurchaseOrderRequest;
import com.inventra.inventra_backend.purchasing.application.PurchaseOrderService;
import com.inventra.inventra_backend.purchasing.domain.model.PurchaseOrderStatus;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<Page<PurchaseOrderSummaryResponse>> listPurchaseOrders(
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestParam(value = "supplierId", required = false) UUID supplierId,
        @RequestParam(value = "status", required = false) PurchaseOrderStatus status,
        @RequestParam(value = "fromDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam(value = "toDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(purchaseOrderService.listPurchaseOrders(businessId, storeId, supplierId, status, fromDate, toDate, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<PurchaseOrderResponse> getPurchaseOrder(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(purchaseOrderService.getPurchaseOrder(businessId, id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> createPurchaseOrder(
        @Valid @RequestBody CreatePurchaseOrderRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        PurchaseOrderResponse response = purchaseOrderService.createPurchaseOrder(businessId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<PurchaseOrderResponse> updatePurchaseOrder(
        @PathVariable("id") UUID id,
        @Valid @RequestBody UpdatePurchaseOrderRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(purchaseOrderService.updatePurchaseOrder(businessId, id, request));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<PurchaseOrderResponse> confirmPurchaseOrder(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();
        return ApiResponse.ok(purchaseOrderService.confirmPurchaseOrder(businessId, id, userId));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<PurchaseOrderResponse> cancelPurchaseOrder(
        @PathVariable("id") UUID id,
        @Valid @RequestBody(required = false) CancelOrderRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();
        String reason = request != null ? request.reason() : null;
        return ApiResponse.ok(purchaseOrderService.cancelPurchaseOrder(businessId, id, userId, reason));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<PurchaseOrderResponse> closePurchaseOrder(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(purchaseOrderService.closePurchaseOrder(businessId, id));
    }

    private UUID getRequiredBusinessId() {
        TenantContext context = TenantContextHolder.requireContext();
        return UUID.fromString(context.tenantId().value());
    }

    private UUID getRequiredUserId() {
        TenantContext context = TenantContextHolder.requireContext();
        return context.userId() != null
            ? UUID.fromString(context.userId())
            : throwUserContextRequired();
    }

    private UUID throwUserContextRequired() {
        throw new BusinessRuleViolationException("USER_CONTEXT_REQUIRED", "Authenticated user identity required for this operation");
    }
}
