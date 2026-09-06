package com.inventra.inventra_backend.catalog.application;

import com.inventra.inventra_backend.catalog.api.dto.CategoryResponse;
import com.inventra.inventra_backend.catalog.api.dto.CreateCategoryRequest;
import com.inventra.inventra_backend.catalog.api.dto.UpdateCategoryRequest;
import com.inventra.inventra_backend.catalog.domain.model.Category;
import com.inventra.inventra_backend.catalog.domain.repository.CategoryRepository;
import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import com.inventra.inventra_backend.common.domain.exception.ResourceNotFoundException;
import com.inventra.inventra_backend.sync.domain.model.SyncChangeOperation;
import com.inventra.inventra_backend.sync.infrastructure.ChangeFeedPublisher;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ChangeFeedPublisher changeFeedPublisher;

    public CategoryService(CategoryRepository categoryRepository, ChangeFeedPublisher changeFeedPublisher) {
        this.categoryRepository = categoryRepository;
        this.changeFeedPublisher = changeFeedPublisher;
    }

    @Transactional
    public Category createCategory(UUID businessId, CreateCategoryRequest request) {
        if (request.parentId() != null) {
            Category parent = categoryRepository.findByIdAndBusinessId(request.parentId(), businessId)
                .orElseThrow(() -> new BusinessRuleViolationException(
                    "INVALID_PARENT_CATEGORY",
                    "Parent category not found in the current business context"
                ));
            if (parent.getParentId() != null) {
                throw new BusinessRuleViolationException(
                    "CATEGORY_HIERARCHY_EXCEEDED",
                    "Categories support a maximum of 2 hierarchy levels"
                );
            }
        }

        String normalizedCode = request.code().trim().toUpperCase();
        if (categoryRepository.existsByBusinessIdAndCode(businessId, normalizedCode)) {
            throw new BusinessRuleViolationException(
                "DUPLICATE_CATEGORY_CODE",
                "Category code '" + normalizedCode + "' already exists in this business"
            );
        }

        if (categoryRepository.existsByBusinessIdAndParentIdAndNameIgnoreCase(
            businessId,
            request.parentId(),
            request.name().trim()
        )) {
            throw new BusinessRuleViolationException(
                "DUPLICATE_CATEGORY_NAME",
                "Category name '" + request.name().trim() + "' already exists under this parent"
            );
        }

        Category category = new Category(
            businessId,
            request.parentId(),
            request.name(),
            request.code(),
            request.description()
        );
        Category saved = categoryRepository.save(category);
        changeFeedPublisher.publish(businessId, null, "CATEGORY", saved.getId(), SyncChangeOperation.UPSERT, 1, CategoryResponse.from(saved));
        return saved;
    }

    @Transactional
    public Category updateCategory(UUID businessId, UUID categoryId, UpdateCategoryRequest request) {
        Category category = categoryRepository.findByIdAndBusinessId(categoryId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Category", categoryId));

        if (request.name() != null && !request.name().trim().equalsIgnoreCase(category.getName())) {
            if (categoryRepository.existsByBusinessIdAndParentIdAndNameIgnoreCase(
                businessId,
                category.getParentId(),
                request.name().trim()
            )) {
                throw new BusinessRuleViolationException(
                    "DUPLICATE_CATEGORY_NAME",
                    "Category name '" + request.name().trim() + "' already exists under this parent"
                );
            }
        }

        category.update(request.name(), request.description(), request.status());
        Category saved = categoryRepository.save(category);
        changeFeedPublisher.publish(businessId, null, "CATEGORY", saved.getId(), SyncChangeOperation.UPSERT, 1, CategoryResponse.from(saved));
        return saved;
    }

    @Transactional(readOnly = true)
    public Category getCategory(UUID businessId, UUID categoryId) {
        return categoryRepository.findByIdAndBusinessId(categoryId, businessId)
            .orElseThrow(() -> ResourceNotFoundException.forResource("Category", categoryId));
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories(UUID businessId) {
        return categoryRepository.findByBusinessId(businessId)
            .stream()
            .map(CategoryResponse::from)
            .toList();
    }
}
