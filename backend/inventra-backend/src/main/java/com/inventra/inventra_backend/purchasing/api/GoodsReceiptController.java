package com.inventra.inventra_backend.purchasing.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.purchasing.api.dto.CreateGoodsReceiptRequest;
import com.inventra.inventra_backend.purchasing.api.dto.GoodsReceiptResponse;
import com.inventra.inventra_backend.purchasing.api.dto.GoodsReceiptSummaryResponse;
import com.inventra.inventra_backend.purchasing.api.dto.UpdateGoodsReceiptRequest;
import com.inventra.inventra_backend.purchasing.application.GoodsReceiptService;
import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptStatus;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/goods-receipts")
public class GoodsReceiptController {

    private final GoodsReceiptService goodsReceiptService;

    public GoodsReceiptController(GoodsReceiptService goodsReceiptService) {
        this.goodsReceiptService = goodsReceiptService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<Page<GoodsReceiptSummaryResponse>> listGoodsReceipts(
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestParam(value = "supplierId", required = false) UUID supplierId,
        @RequestParam(value = "status", required = false) GoodsReceiptStatus status,
        @RequestParam(value = "purchaseOrderId", required = false) UUID purchaseOrderId,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(goodsReceiptService.listGoodsReceipts(businessId, storeId, supplierId, status, purchaseOrderId, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<GoodsReceiptResponse> getGoodsReceipt(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(goodsReceiptService.getGoodsReceipt(businessId, id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ResponseEntity<ApiResponse<GoodsReceiptResponse>> createGoodsReceipt(
        @Valid @RequestBody CreateGoodsReceiptRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        GoodsReceiptResponse response = goodsReceiptService.createGoodsReceipt(businessId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<GoodsReceiptResponse> updateGoodsReceipt(
        @PathVariable("id") UUID id,
        @Valid @RequestBody UpdateGoodsReceiptRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(goodsReceiptService.updateGoodsReceipt(businessId, id, request));
    }

    @PostMapping("/{id}/post")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<GoodsReceiptResponse> postGoodsReceipt(
        @PathVariable("id") UUID id,
        Authentication authentication
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = extractUserId(authentication);
        return ApiResponse.ok(goodsReceiptService.postGoodsReceipt(businessId, id, userId, null));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<GoodsReceiptResponse> cancelGoodsReceipt(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(goodsReceiptService.cancelGoodsReceipt(businessId, id));
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
