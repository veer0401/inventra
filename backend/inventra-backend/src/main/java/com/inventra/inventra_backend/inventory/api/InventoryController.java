package com.inventra.inventra_backend.inventory.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.inventory.api.dto.InventoryBatchResponse;
import com.inventra.inventra_backend.inventory.api.dto.InventoryItemResponse;
import com.inventra.inventra_backend.inventory.api.dto.StockAdjustmentRequest;
import com.inventra.inventra_backend.inventory.api.dto.StockMovementResponse;
import com.inventra.inventra_backend.inventory.application.InventoryService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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
@RequestMapping("/api/v1/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<Page<InventoryItemResponse>> listInventory(
        @RequestParam(value = "storeId", required = false) UUID paramStoreId,
        @RequestParam(value = "lowStockOnly", defaultValue = "false") boolean lowStockOnly,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID storeId = resolveStoreId(paramStoreId);

        if (lowStockOnly) {
            return ApiResponse.ok(inventoryService.listLowStockInventory(businessId, storeId, pageable));
        }
        return ApiResponse.ok(inventoryService.listStoreInventory(businessId, storeId, pageable));
    }

    @GetMapping("/batches")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<Page<InventoryBatchResponse>> listBatches(
        @RequestParam(value = "storeId", required = false) UUID paramStoreId,
        @RequestParam(value = "expiringWithinDays", required = false) Integer expiringWithinDays,
        @RequestParam(value = "expiredOnly", defaultValue = "false") boolean expiredOnly,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID storeId = resolveStoreId(paramStoreId);

        if (expiredOnly) {
            return ApiResponse.ok(inventoryService.listExpiredBatches(businessId, storeId, pageable));
        }
        if (expiringWithinDays != null && expiringWithinDays > 0) {
            return ApiResponse.ok(inventoryService.listNearExpiryBatches(businessId, storeId, expiringWithinDays, pageable));
        }
        return ApiResponse.ok(inventoryService.listStoreBatches(businessId, storeId, pageable));
    }

    @GetMapping("/batches/fefo")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<List<InventoryBatchResponse>> listFefoBatches(
        @RequestParam("productId") UUID productId,
        @RequestParam(value = "storeId", required = false) UUID paramStoreId
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID storeId = resolveStoreId(paramStoreId);
        return ApiResponse.ok(inventoryService.listFefoBatches(businessId, storeId, productId));
    }

    @PostMapping("/adjustments")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ResponseEntity<ApiResponse<StockMovementResponse>> adjustStock(
        @RequestParam(value = "storeId", required = false) UUID paramStoreId,
        @Valid @RequestBody StockAdjustmentRequest request,
        Authentication authentication
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID storeId = resolveStoreId(paramStoreId);
        UUID userId = (UUID) authentication.getPrincipal();

        StockMovementResponse response = inventoryService.adjustStock(
            businessId,
            storeId,
            userId,
            null,
            request
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/movements")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<Page<StockMovementResponse>> listMovements(
        @RequestParam(value = "storeId", required = false) UUID paramStoreId,
        @RequestParam(value = "productId", required = false) UUID productId,
        @RequestParam(value = "batchId", required = false) UUID batchId,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID storeId = resolveStoreId(paramStoreId);
        return ApiResponse.ok(inventoryService.listStockMovements(businessId, storeId, productId, batchId, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<InventoryItemResponse> getInventoryItem(
        @PathVariable("id") UUID id,
        @RequestParam(value = "storeId", required = false) UUID paramStoreId
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID authorizedStoreId = resolveAuthorizedStoreId(paramStoreId);
        return ApiResponse.ok(inventoryService.getInventoryItem(businessId, authorizedStoreId, id));
    }

    private UUID getRequiredBusinessId() {
        TenantContext context = TenantContextHolder.requireContext();
        return UUID.fromString(context.tenantId().value());
    }

    private UUID resolveAuthorizedStoreId(UUID paramStoreId) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID contextStoreId = context.storeId() != null ? UUID.fromString(context.storeId()) : null;
        UUID targetStoreId = paramStoreId != null ? paramStoreId : contextStoreId;

        if (targetStoreId == null) {
            return null;
        }

        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isElevated = auth != null && auth.getAuthorities().stream().anyMatch(a ->
            a.getAuthority().equals("ROLE_OWNER") || a.getAuthority().equals("ROLE_MANAGER")
        );

        if (contextStoreId != null && !contextStoreId.equals(targetStoreId) && !isElevated) {
            throw new org.springframework.security.access.AccessDeniedException("User is not authorized to query store " + targetStoreId);
        }

        return targetStoreId;
    }

    private UUID resolveStoreId(UUID paramStoreId) {
        if (paramStoreId != null) {
            return paramStoreId;
        }
        TenantContext context = TenantContextHolder.requireContext();
        if (context.storeId() != null) {
            return UUID.fromString(context.storeId());
        }
        throw new BusinessRuleViolationException("STORE_CONTEXT_REQUIRED", "Store ID is required for inventory operations");
    }
}
