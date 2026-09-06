package com.inventra.inventra_backend.customer.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.customer.api.dto.CreateCustomerRequest;
import com.inventra.inventra_backend.customer.api.dto.CustomerResponse;
import com.inventra.inventra_backend.customer.api.dto.CustomerSummaryResponse;
import com.inventra.inventra_backend.customer.api.dto.UpdateCustomerRequest;
import com.inventra.inventra_backend.customer.application.CustomerService;
import com.inventra.inventra_backend.customer.domain.model.CustomerStatus;
import com.inventra.inventra_backend.sales.api.dto.SaleResponse;
import com.inventra.inventra_backend.sales.api.dto.SaleReturnResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ResponseEntity<ApiResponse<CustomerResponse>> createCustomer(
        @Valid @RequestBody CreateCustomerRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();
        CustomerResponse response = customerService.createCustomer(businessId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER')")
    public ApiResponse<CustomerResponse> updateCustomer(
        @PathVariable("id") UUID id,
        @Valid @RequestBody UpdateCustomerRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = getRequiredUserId();
        return ApiResponse.ok(customerService.updateCustomer(businessId, id, userId, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER', 'INVENTORY_OPERATOR')")
    public ApiResponse<CustomerResponse> getCustomer(@PathVariable("id") UUID id) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(customerService.getCustomer(businessId, id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER', 'INVENTORY_OPERATOR')")
    public ApiResponse<Page<CustomerSummaryResponse>> listCustomers(
        @RequestParam(value = "search", required = false) String search,
        @RequestParam(value = "status", required = false) CustomerStatus status,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(customerService.searchCustomers(businessId, search, status, pageable));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER', 'INVENTORY_OPERATOR')")
    public ApiResponse<Page<CustomerSummaryResponse>> quickSearch(
        @RequestParam(value = "q", required = false, defaultValue = "") String query
    ) {
        UUID businessId = getRequiredBusinessId();
        Pageable limit20 = PageRequest.of(0, 20);
        return ApiResponse.ok(customerService.quickSearchActiveCustomers(businessId, query, limit20));
    }

    @GetMapping("/{id}/sales")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER', 'INVENTORY_OPERATOR')")
    public ApiResponse<Page<SaleResponse>> getCustomerSales(
        @PathVariable("id") UUID id,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(customerService.getCustomerSales(businessId, id, pageable));
    }

    @GetMapping("/{id}/returns")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'CASHIER', 'INVENTORY_OPERATOR')")
    public ApiResponse<Page<SaleReturnResponse>> getCustomerReturns(
        @PathVariable("id") UUID id,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(customerService.getCustomerReturns(businessId, id, pageable));
    }

    private UUID getRequiredBusinessId() {
        TenantContext context = TenantContextHolder.requireContext();
        if (context.tenantId() == null || context.tenantId().value() == null) {
            throw new BusinessRuleViolationException("TENANT_CONTEXT_REQUIRED", "Active tenant context required");
        }
        return UUID.fromString(context.tenantId().value());
    }

    private UUID getRequiredUserId() {
        TenantContext context = TenantContextHolder.requireContext();
        if (context.userId() == null) {
            throw new BusinessRuleViolationException("USER_CONTEXT_REQUIRED", "Authenticated user identity required");
        }
        return UUID.fromString(context.userId());
    }
}
