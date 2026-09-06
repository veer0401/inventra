package com.inventra.inventra_backend.identity.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "user_invitations")
public class UserInvitation {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "role", nullable = false, length = 50)
    private String role;

    @Column(name = "target_store_id")
    private UUID targetStoreId;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "token_expires_at", nullable = false)
    private Instant tokenExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "invited_by", nullable = false)
    private UUID invitedBy;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected UserInvitation() {
        // JPA
    }

    public UserInvitation(
        UUID id,
        UUID businessId,
        String email,
        String role,
        UUID targetStoreId,
        String tokenHash,
        Instant tokenExpiresAt,
        UUID invitedBy
    ) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.email = Objects.requireNonNull(email, "email must not be null").toLowerCase().trim();
        this.role = Objects.requireNonNull(role, "role must not be null").toUpperCase().trim();
        this.targetStoreId = targetStoreId;
        this.tokenHash = Objects.requireNonNull(tokenHash, "tokenHash must not be null");
        this.tokenExpiresAt = Objects.requireNonNull(tokenExpiresAt, "tokenExpiresAt must not be null");
        this.invitedBy = Objects.requireNonNull(invitedBy, "invitedBy must not be null");
        this.status = InvitationStatus.PENDING;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public boolean isExpired() {
        return Instant.now().isAfter(tokenExpiresAt);
    }

    public boolean isPending() {
        return status == InvitationStatus.PENDING && !isExpired();
    }

    public void accept() {
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void revoke() {
        this.status = InvitationStatus.REVOKED;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public UUID getTargetStoreId() {
        return targetStoreId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getTokenExpiresAt() {
        return tokenExpiresAt;
    }

    public InvitationStatus getStatus() {
        if (status == InvitationStatus.PENDING && isExpired()) {
            return InvitationStatus.EXPIRED;
        }
        return status;
    }

    public UUID getInvitedBy() {
        return invitedBy;
    }

    public Instant getAcceptedAt() {
        return acceptedAt;
    }

    public Long getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
