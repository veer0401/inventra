package com.inventra.inventra_backend.common.multitenancy;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;

@FunctionalInterface
public interface TenantResolver {
    Optional<TenantContext> resolveTenant(HttpServletRequest request);
}
