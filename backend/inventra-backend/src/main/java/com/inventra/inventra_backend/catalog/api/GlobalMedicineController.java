package com.inventra.inventra_backend.catalog.api;

import com.inventra.inventra_backend.catalog.api.dto.GlobalMedicineResponse;
import com.inventra.inventra_backend.catalog.application.GlobalMedicineService;
import com.inventra.inventra_backend.common.api.ApiResponse;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/catalog/global-medicines")
@PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'PHARMACIST', 'CASHIER', 'INVENTORY_OPERATOR', 'ADMIN', 'PLATFORM_ADMIN')")
public class GlobalMedicineController {

    private final GlobalMedicineService globalMedicineService;

    public GlobalMedicineController(GlobalMedicineService globalMedicineService) {
        this.globalMedicineService = globalMedicineService;
    }

    /**
     * Search active global medicines for importing or auto-filling product master data.
     */
    @GetMapping
    public ApiResponse<Page<GlobalMedicineResponse>> searchGlobalMedicines(
        @RequestParam(required = false) String query,
        @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ApiResponse.ok(globalMedicineService.searchActiveGlobalMedicines(query, pageable));
    }

    /**
     * Get specific global medicine details.
     */
    @GetMapping("/{id}")
    public ApiResponse<GlobalMedicineResponse> getGlobalMedicine(@PathVariable UUID id) {
        return ApiResponse.ok(globalMedicineService.getGlobalMedicine(id));
    }

    /**
     * 1-Click Automatic Quick-Import of a global medicine directly into caller store catalog.
     * Inherits formulation defaults without showing a modal form.
     */
    @PostMapping("/{id}/quick-import")
    public ApiResponse<com.inventra.inventra_backend.catalog.api.dto.ProductResponse> quickImport(
        @PathVariable UUID id
    ) {
        UUID businessId = resolveBusinessId();
        return ApiResponse.ok(globalMedicineService.quickImportToStore(businessId, id));
    }

    /**
     * Fast retrieval of global medicine IDs that this store has already imported.
     */
    @GetMapping("/imported-ids")
    public ApiResponse<java.util.List<UUID>> getImportedIds() {
        UUID businessId = resolveBusinessId();
        return ApiResponse.ok(globalMedicineService.getImportedGlobalMedicineIds(businessId));
    }

    private UUID resolveBusinessId() {
        com.inventra.inventra_backend.common.multitenancy.TenantContext context =
            com.inventra.inventra_backend.common.multitenancy.TenantContextHolder.requireContext();
        return UUID.fromString(context.tenantId().value());
    }
}
