package com.inventra.inventra_backend.tenant.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StoreTest {

    @Test
    @DisplayName("Store creation normalizes store code to uppercase and assigns UUIDv7")
    void testStoreCreation() {
        UUID businessId = UuidUtils.newUuid7();
        Store store = Store.create(businessId, "branch-01", "Apex Downtown Branch", true);

        assertThat(store.getId()).isNotNull();
        assertThat(store.getId().version()).isEqualTo(7);
        assertThat(store.getBusinessId()).isEqualTo(businessId);
        assertThat(store.getStoreCode()).isEqualTo("BRANCH-01");
        assertThat(store.getStoreName()).isEqualTo("Apex Downtown Branch");
        assertThat(store.isHeadquarters()).isTrue();
        assertThat(store.getStatus()).isEqualTo(StoreStatus.ACTIVE);
    }

    @Test
    @DisplayName("Store creation rejects blank code or name")
    void testBlankCodeOrName() {
        UUID businessId = UuidUtils.newUuid7();

        assertThatThrownBy(() -> Store.create(businessId, "  ", "Store Name", false))
            .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> Store.create(businessId, "CODE", "  ", false))
            .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> Store.create(null, "CODE", "Name", false))
            .isInstanceOf(NullPointerException.class);
    }
}
