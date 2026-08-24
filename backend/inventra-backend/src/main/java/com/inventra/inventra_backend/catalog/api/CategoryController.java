package com.inventra.inventra_backend.catalog.api;

import com.inventra.inventra_backend.catalog.api.dto.CategoryResponse;
import com.inventra.inventra_backend.catalog.api.dto.CreateCategoryRequest;
import com.inventra.inventra_backend.catalog.api.dto.UpdateCategoryRequest;
import com.inventra.inventra_backend.catalog.application.CategoryService;
import com.inventra.inventra_backend.catalog.domain.model.Category;
import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContext;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<List<CategoryResponse>> listCategories() {
        UUID businessId = getRequiredBusinessId();
        return ApiResponse.ok(categoryService.listCategories(businessId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'INVENTORY_OPERATOR', 'CASHIER')")
    public ApiResponse<CategoryResponse> getCategory(@PathVariable("id") UUID categoryId) {
        UUID businessId = getRequiredBusinessId();
        Category category = categoryService.getCategory(businessId, categoryId);
        return ApiResponse.ok(CategoryResponse.from(category));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
        @Valid @RequestBody CreateCategoryRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        Category category = categoryService.createCategory(businessId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(CategoryResponse.from(category)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ApiResponse<CategoryResponse> updateCategory(
        @PathVariable("id") UUID categoryId,
        @Valid @RequestBody UpdateCategoryRequest request
    ) {
        UUID businessId = getRequiredBusinessId();
        Category category = categoryService.updateCategory(businessId, categoryId, request);
        return ApiResponse.ok(CategoryResponse.from(category));
    }

    private UUID getRequiredBusinessId() {
        TenantContext context = TenantContextHolder.requireContext();
        return UUID.fromString(context.tenantId().value());
    }
}
