package com.inventra.inventra_backend.sales.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleReturnRequest;
import com.inventra.inventra_backend.sales.api.dto.SaleReturnResponse;
import com.inventra.inventra_backend.sales.application.SaleReturnService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class SaleReturnController {

    private final SaleReturnService saleReturnService;

    public SaleReturnController(SaleReturnService saleReturnService) {
        this.saleReturnService = saleReturnService;
    }

    @PostMapping("/sales/{id}/returns")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ResponseEntity<ApiResponse<SaleReturnResponse>> processSaleReturn(
        @PathVariable("id") UUID saleId,
        @Valid @RequestBody CreateSaleReturnRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();
        UUID deviceId = null;

        SaleReturnResponse response = saleReturnService.processReturn(businessId, saleId, userId, deviceId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/returns")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ApiResponse<Page<SaleReturnResponse>> listReturns(
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestParam(value = "saleId", required = false) UUID saleId,
        @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(saleReturnService.searchReturns(businessId, storeId, saleId, startDate, endDate, pageable));
    }

    @GetMapping("/returns/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ApiResponse<SaleReturnResponse> getReturn(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(saleReturnService.getSaleReturn(businessId, id));
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
