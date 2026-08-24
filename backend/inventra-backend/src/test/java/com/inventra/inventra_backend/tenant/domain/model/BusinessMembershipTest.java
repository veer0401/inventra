package com.inventra.inventra_backend.tenant.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import com.inventra.inventra_backend.identity.domain.model.Role;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BusinessMembershipTest {

    @Test
    @DisplayName("BusinessMembership creation assigns UUIDv7 and initializes ACTIVE status")
    void testMembershipCreation() {
        UUID businessId = UuidUtils.newUuid7();
        UUID userId = UuidUtils.newUuid7();

        BusinessMembership membership = BusinessMembership.create(businessId, userId, Role.MANAGER);

        assertThat(membership.getId()).isNotNull();
        assertThat(membership.getId().version()).isEqualTo(7);
        assertThat(membership.getBusinessId()).isEqualTo(businessId);
        assertThat(membership.getUserId()).isEqualTo(userId);
        assertThat(membership.getRole()).isEqualTo(Role.MANAGER);
        assertThat(membership.getStatus()).isEqualTo(MembershipStatus.ACTIVE);
        assertThat(membership.isActive()).isTrue();
    }

    @Test
    @DisplayName("BusinessMembership creation rejects null business, user, or role")
    void testNullArguments() {
        UUID id = UuidUtils.newUuid7();

        assertThatThrownBy(() -> BusinessMembership.create(null, id, Role.OWNER))
            .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> BusinessMembership.create(id, null, Role.OWNER))
            .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> BusinessMembership.create(id, id, null))
            .isInstanceOf(NullPointerException.class);
    }
}
