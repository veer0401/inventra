package com.inventra.inventra_backend.common.multitenancy;

import com.inventra.inventra_backend.common.domain.exception.TenantAccessDeniedException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TenantContextTest {

    @AfterEach
    void tearDown() {
        TenantContextHolder.clear();
    }

    @Test
    @DisplayName("TenantId requires valid non-empty string")
    void testTenantIdValidation() {
        TenantId tenantId = TenantId.of("pharmacy-001");
        assertThat(tenantId.value()).isEqualTo("pharmacy-001");
        assertThat(tenantId.toString()).isEqualTo("pharmacy-001");

        assertThatThrownBy(() -> TenantId.of(null))
            .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> TenantId.of("   "))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("TenantContextHolder stores and clears context correctly")
    void testTenantContextLifecycle() {
        TenantId tenantId = TenantId.of("pharmacy-001");
        TenantContext context = TenantContext.of(tenantId, "store-1", "user-101");

        TenantContextHolder.setContext(context);

        assertThat(TenantContextHolder.getContext()).isPresent();
        assertThat(TenantContextHolder.requireTenantId()).isEqualTo(tenantId);
        assertThat(TenantContextHolder.requireContext().getStoreId()).contains("store-1");
        assertThat(TenantContextHolder.requireContext().getUserId()).contains("user-101");

        TenantContextHolder.clear();

        assertThat(TenantContextHolder.getContext()).isEmpty();
        assertThatThrownBy(TenantContextHolder::requireContext)
            .isInstanceOf(TenantAccessDeniedException.class);
    }
}
