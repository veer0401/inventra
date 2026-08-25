package com.inventra.inventra_backend.sales.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.sales.api.dto.CreateSaleRequest;
import com.inventra.inventra_backend.sales.api.dto.InvoiceResponse;
import com.inventra.inventra_backend.sales.api.dto.ReceiptResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleResponse;
import com.inventra.inventra_backend.sales.api.dto.VoidSaleRequest;
import com.inventra.inventra_backend.sales.application.SaleService;
import com.inventra.inventra_backend.sales.domain.model.SaleStatus;
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
@RequestMapping("/api/v1/sales")
public class SaleController {

    private final SaleService saleService;

    public SaleController(SaleService saleService) {
        this.saleService = saleService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ResponseEntity<ApiResponse<SaleResponse>> checkoutSale(
        @Valid @RequestBody CreateSaleRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();
        UUID deviceId = null;

        SaleResponse response = saleService.checkoutSale(businessId, userId, deviceId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ApiResponse<Page<SaleResponse>> listSales(
        @RequestParam(value = "storeId", required = false) UUID storeId,
        @RequestParam(value = "status", required = false) SaleStatus status,
        @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(saleService.searchSales(businessId, storeId, status, startDate, endDate, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ApiResponse<SaleResponse> getSale(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(saleService.getSale(businessId, id));
    }

    @GetMapping("/{id}/invoice")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ApiResponse<InvoiceResponse> getInvoice(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(saleService.getInvoice(businessId, id));
    }

    @GetMapping("/{id}/receipt")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ApiResponse<ReceiptResponse> getReceipt(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(saleService.getReceipt(businessId, id));
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<SaleResponse> voidSale(
        @PathVariable("id") UUID id,
        @Valid @RequestBody VoidSaleRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();

        return ApiResponse.ok(saleService.voidSale(businessId, id, userId, request));
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
