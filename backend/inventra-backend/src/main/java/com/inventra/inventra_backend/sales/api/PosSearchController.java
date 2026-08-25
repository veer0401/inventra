package com.inventra.inventra_backend.sales.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.sales.api.dto.PosProductSearchResponse;
import com.inventra.inventra_backend.sales.application.PosSearchService;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos")
public class PosSearchController {

    private final PosSearchService posSearchService;

    public PosSearchController(PosSearchService posSearchService) {
        this.posSearchService = posSearchService;
    }

    @GetMapping("/products/search")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ApiResponse<Page<PosProductSearchResponse>> searchPosProducts(
        @RequestParam(value = "storeId", required = false) UUID paramStoreId,
        @RequestParam("q") String query,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        TenantContext ctx = TenantContextHolder.requireContext();
        UUID businessId = UUID.fromString(ctx.tenantId().value());

        UUID storeId = paramStoreId != null ? paramStoreId : (ctx.storeId() != null ? UUID.fromString(ctx.storeId()) : null);
        if (storeId == null) {
            throw new BusinessRuleViolationException("NO_STORE_CONTEXT", "Store context or storeId parameter is required for POS search");
        }

        return ApiResponse.ok(posSearchService.searchPosProducts(businessId, storeId, query, pageable));
    }
}
