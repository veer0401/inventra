package com.inventra.inventra_backend.common.multitenancy;

import com.inventra.inventra_backend.common.domain.exception.TenantAccessDeniedException;
import java.util.Optional;

public final class TenantContextHolder {

    private static final ThreadLocal<TenantContext> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContextHolder() {
    }

    public static void setContext(TenantContext context) {
        CURRENT_TENANT.set(context);
    }

    public static Optional<TenantContext> getContext() {
        return Optional.ofNullable(CURRENT_TENANT.get());
    }

    public static Optional<TenantId> getTenantId() {
        return getContext().map(TenantContext::tenantId);
    }

    public static TenantContext requireContext() {
        return getContext().orElseThrow(() -> new TenantAccessDeniedException("No active tenant context found for the current operation"));
    }

    public static TenantId requireTenantId() {
        return requireContext().tenantId();
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
