package com.inventra.inventra_backend.catalog.api.dto;

import com.inventra.inventra_backend.catalog.domain.model.CategoryStatus;
import jakarta.validation.constraints.Size;

public record UpdateCategoryRequest(
    @Size(max = 100, message = "Name must not exceed 100 characters")
    String name,
    @Size(max = 255, message = "Description must not exceed 255 characters")
    String description,
    CategoryStatus status
) {}
