package com.inventra.inventra_backend.common.multitenancy;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class TenantFilter extends OncePerRequestFilter {

    private final TenantResolver tenantResolver;

    public TenantFilter(Optional<TenantResolver> tenantResolver) {
        this.tenantResolver = tenantResolver.orElse(request -> Optional.empty());
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            tenantResolver.resolveTenant(request).ifPresent(TenantContextHolder::setContext);
            filterChain.doFilter(request, response);
        } finally {
            TenantContextHolder.clear();
        }
    }
}
