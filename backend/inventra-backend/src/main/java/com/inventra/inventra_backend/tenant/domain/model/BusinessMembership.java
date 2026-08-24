package com.inventra.inventra_backend.tenant.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import com.inventra.inventra_backend.identity.domain.model.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "business_memberships")
public class BusinessMembership extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 50)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private MembershipStatus status = MembershipStatus.ACTIVE;

    protected BusinessMembership() {
        // Required by JPA
    }

    public BusinessMembership(UUID id, UUID businessId, UUID userId, Role role) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "Business ID cannot be null");
        this.userId = Objects.requireNonNull(userId, "User ID cannot be null");
        this.role = Objects.requireNonNull(role, "Role cannot be null");
        this.status = MembershipStatus.ACTIVE;
    }

    public static BusinessMembership create(UUID businessId, UUID userId, Role role) {
        return new BusinessMembership(UuidUtils.newUuid7(), businessId, userId, role);
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getUserId() {
        return userId;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = Objects.requireNonNull(role, "Role cannot be null");
    }

    public MembershipStatus getStatus() {
        return status;
    }

    public void setStatus(MembershipStatus status) {
        this.status = Objects.requireNonNull(status, "Status cannot be null");
    }

    public boolean isActive() {
        return this.status == MembershipStatus.ACTIVE;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BusinessMembership that)) return false;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
