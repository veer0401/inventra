package com.inventra.inventra_backend.tenant.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import com.inventra.inventra_backend.identity.domain.model.Role;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StoreAssignmentTest {

    @Test
    @DisplayName("StoreAssignment creation assigns UUIDv7 and sets role override")
    void testAssignmentCreation() {
        UUID businessId = UuidUtils.newUuid7();
        UUID storeId = UuidUtils.newUuid7();
        UUID membershipId = UuidUtils.newUuid7();

        StoreAssignment assignment = StoreAssignment.create(
            businessId,
            storeId,
            membershipId,
            Role.CASHIER,
            true
        );

        assertThat(assignment.getId()).isNotNull();
        assertThat(assignment.getId().version()).isEqualTo(7);
        assertThat(assignment.getBusinessId()).isEqualTo(businessId);
        assertThat(assignment.getStoreId()).isEqualTo(storeId);
        assertThat(assignment.getBusinessMembershipId()).isEqualTo(membershipId);
        assertThat(assignment.getRoleOverride()).contains(Role.CASHIER);
        assertThat(assignment.isPrimaryStore()).isTrue();
        assertThat(assignment.getStatus()).isEqualTo(AssignmentStatus.ACTIVE);
        assertThat(assignment.isActive()).isTrue();
    }

    @Test
    @DisplayName("StoreAssignment creation rejects null business, store, or membership IDs")
    void testNullIdentifiers() {
        UUID id = UuidUtils.newUuid7();

        assertThatThrownBy(() -> StoreAssignment.create(null, id, id, null, false))
            .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> StoreAssignment.create(id, null, id, null, false))
            .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> StoreAssignment.create(id, id, null, null, false))
            .isInstanceOf(NullPointerException.class);
    }
}
