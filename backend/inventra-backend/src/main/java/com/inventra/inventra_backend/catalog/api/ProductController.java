package com.inventra.inventra_backend.catalog.api;

import com.inventra.inventra_backend.catalog.api.dto.AddProductIdentifierRequest;
import com.inventra.inventra_backend.catalog.api.dto.CreateProductRequest;
import com.inventra.inventra_backend.catalog.api.dto.ProductIdentifierResponse;
import com.inventra.inventra_backend.catalog.api.dto.ProductResponse;
import com.inventra.inventra_backend.catalog.api.dto.ProductSummaryResponse;
import com.inventra.inventra_backend.catalog.api.dto.UpdateProductRequest;
import com.inventra.inventra_backend.catalog.application.ProductService;
import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import jakarta.validation.Valid;
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

import com.inventra.inventra_backend.catalog.api.dto.ProductSearchRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<Page<ProductSummaryResponse>> listProducts(
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(productService.listProducts(businessId, pageable));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<Page<ProductSummaryResponse>> searchProducts(
        @RequestParam(value = "q", required = false) String query,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(productService.searchProducts(businessId, query, pageable));
    }

    @PostMapping("/search")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<Page<ProductSummaryResponse>> searchProductsStructured(
        @RequestParam(value = "storeId", required = false) UUID paramStoreId,
        @Valid @RequestBody(required = false) ProductSearchRequest request,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID businessId = getRequiredBusinessId();
        ProductSearchRequest searchRequest = request != null ? request : new ProductSearchRequest(null, null, null);
        UUID requestedStoreId = paramStoreId != null ? paramStoreId : searchRequest.storeId();
        UUID resolvedStoreId = resolveAuthorizedStoreId(requestedStoreId);
        return ApiResponse.ok(productService.searchProductsStructured(businessId, resolvedStoreId, searchRequest, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<ProductResponse> getProduct(@PathVariable("id") UUID productId) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(productService.getProduct(businessId, productId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
        @Valid @RequestBody CreateProductRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        ProductResponse response = productService.createProduct(businessId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<ProductResponse> updateProduct(
        @PathVariable("id") UUID productId,
        @Valid @RequestBody UpdateProductRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(productService.updateProduct(businessId, productId, request));
    }

    @PostMapping("/{id}/identifiers")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<ApiResponse<ProductIdentifierResponse>> addIdentifier(
        @PathVariable("id") UUID productId,
        @Valid @RequestBody AddProductIdentifierRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        ProductIdentifierResponse response = productService.addIdentifier(businessId, productId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    private UUID getRequiredBusinessId() {
        TenantContext context = TenantContextHolder.requireContext();
        return UUID.fromString(context.tenantId().value());
    }

    private UUID resolveAuthorizedStoreId(UUID requestedStoreId) {
        TenantContext context = TenantContextHolder.requireContext();
        UUID contextStoreId = context.storeId() != null ? UUID.fromString(context.storeId()) : null;
        UUID targetStoreId = requestedStoreId != null ? requestedStoreId : contextStoreId;

        if (targetStoreId == null) {
            return null;
        }

        var auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isElevated = auth != null && auth.getAuthorities().stream().anyMatch(a ->
            a.getAuthority().equals("ROLE_OWNER") || a.getAuthority().equals("ROLE_MANAGER")
        );

        if (contextStoreId != null && !contextStoreId.equals(targetStoreId) && !isElevated) {
            throw new AccessDeniedException("User is not authorized to query store " + targetStoreId);
        }

        return targetStoreId;
    }
}
