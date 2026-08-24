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
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "store_assignments")
public class StoreAssignment extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Column(name = "business_membership_id", nullable = false)
    private UUID businessMembershipId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_override", length = 50)
    private Role roleOverride;

    @Column(name = "is_primary_store", nullable = false)
    private boolean isPrimaryStore = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private AssignmentStatus status = AssignmentStatus.ACTIVE;

    protected StoreAssignment() {
        // Required by JPA
    }

    public StoreAssignment(
        UUID id,
        UUID businessId,
        UUID storeId,
        UUID businessMembershipId,
        Role roleOverride,
        boolean isPrimaryStore
    ) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "Business ID cannot be null");
        this.storeId = Objects.requireNonNull(storeId, "Store ID cannot be null");
        this.businessMembershipId = Objects.requireNonNull(businessMembershipId, "Business Membership ID cannot be null");
        this.roleOverride = roleOverride;
        this.isPrimaryStore = isPrimaryStore;
        this.status = AssignmentStatus.ACTIVE;
    }

    public static StoreAssignment create(
        UUID businessId,
        UUID storeId,
        UUID businessMembershipId,
        Role roleOverride,
        boolean isPrimaryStore
    ) {
        return new StoreAssignment(
            UuidUtils.newUuid7(),
            businessId,
            storeId,
            businessMembershipId,
            roleOverride,
            isPrimaryStore
        );
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getStoreId() {
        return storeId;
    }

    public UUID getBusinessMembershipId() {
        return businessMembershipId;
    }

    public Optional<Role> getRoleOverride() {
        return Optional.ofNullable(roleOverride);
    }

    public void setRoleOverride(Role roleOverride) {
        this.roleOverride = roleOverride;
    }

    public boolean isPrimaryStore() {
        return isPrimaryStore;
    }

    public void setPrimaryStore(boolean primaryStore) {
        isPrimaryStore = primaryStore;
    }

    public AssignmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssignmentStatus status) {
        this.status = Objects.requireNonNull(status, "Status cannot be null");
    }

    public boolean isActive() {
        return this.status == AssignmentStatus.ACTIVE;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StoreAssignment that)) return false;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
