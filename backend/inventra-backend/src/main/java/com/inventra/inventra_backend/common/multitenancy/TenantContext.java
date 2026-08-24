package com.inventra.inventra_backend.common.multitenancy;

import java.util.Optional;

public record TenantContext(
    TenantId tenantId,
    String storeId,
    String userId
) {
    public static TenantContext of(TenantId tenantId) {
        return new TenantContext(tenantId, null, null);
    }

    public static TenantContext of(TenantId tenantId, String storeId, String userId) {
        return new TenantContext(tenantId, storeId, userId);
    }

    public Optional<String> getStoreId() {
        return Optional.ofNullable(storeId);
    }

    public Optional<String> getUserId() {
        return Optional.ofNullable(userId);
    }
}
