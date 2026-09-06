package com.inventra.inventra_backend.tenant.api.dto;

import java.util.UUID;

public record StoreCapacityResponse(
    UUID storeId,
    String storeName,
    String storeCode,
    int maxUsers,
    long currentActiveUsers,
    boolean atCapacity
) {}
