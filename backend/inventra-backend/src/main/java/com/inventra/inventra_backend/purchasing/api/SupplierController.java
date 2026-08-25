package com.inventra.inventra_backend.purchasing.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.purchasing.api.dto.CreateSupplierProductRequest;
import com.inventra.inventra_backend.purchasing.api.dto.CreateSupplierRequest;
import com.inventra.inventra_backend.purchasing.api.dto.SupplierProductResponse;
import com.inventra.inventra_backend.purchasing.api.dto.SupplierResponse;
import com.inventra.inventra_backend.purchasing.api.dto.UpdateSupplierRequest;
import com.inventra.inventra_backend.purchasing.application.SupplierService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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
@RequestMapping("/api/v1/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<Page<SupplierResponse>> listSuppliers(
        @RequestParam(value = "search", required = false) String search,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        if (search != null && !search.isBlank()) {
            return ApiResponse.ok(supplierService.searchSuppliers(businessId, search, pageable));
        }
        return ApiResponse.ok(supplierService.listSuppliers(businessId, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<SupplierResponse> getSupplier(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(supplierService.getSupplier(businessId, id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<ApiResponse<SupplierResponse>> createSupplier(
        @Valid @RequestBody CreateSupplierRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        SupplierResponse response = supplierService.createSupplier(businessId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<SupplierResponse> updateSupplier(
        @PathVariable("id") UUID id,
        @Valid @RequestBody UpdateSupplierRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(supplierService.updateSupplier(businessId, id, request));
    }

    @GetMapping("/{id}/products")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR')")
    public ApiResponse<List<SupplierProductResponse>> listSupplierProducts(
        @PathVariable("id") UUID supplierId
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(supplierService.listSupplierProducts(businessId, supplierId));
    }

    @PostMapping("/{id}/products")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<ApiResponse<SupplierProductResponse>> addOrUpdateSupplierProduct(
        @PathVariable("id") UUID supplierId,
        @Valid @RequestBody CreateSupplierProductRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        SupplierProductResponse response = supplierService.addOrUpdateSupplierProduct(businessId, supplierId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    private UUID getRequiredBusinessId() {
        TenantContext context = TenantContextHolder.requireContext();
        return UUID.fromString(context.tenantId().value());
    }
}
