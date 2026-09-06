package com.inventra.inventra_backend.tenant.api.dto;

import jakarta.validation.constraints.Min;

public record UpdateStoreCapacityRequest(
    @Min(value = 1, message = "Maximum users must be at least 1")
    int maxUsers
) {}
