package com.inventra.inventra_backend.identity.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "device_id")
    private UUID deviceId;

    @Column(name = "family_id", nullable = false)
    private UUID familyId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used", nullable = false)
    private boolean used = false;

    @Column(name = "revoked", nullable = false)
    private boolean revoked = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected RefreshToken() {
        // Required by JPA
    }

    public RefreshToken(
        UUID id,
        UUID userId,
        UUID deviceId,
        UUID familyId,
        String tokenHash,
        Instant expiresAt
    ) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        this.userId = Objects.requireNonNull(userId, "User ID cannot be null");
        this.deviceId = deviceId;
        this.familyId = familyId != null ? familyId : UuidUtils.newUuid7();
        this.tokenHash = Objects.requireNonNull(tokenHash, "Token hash cannot be null");
        this.expiresAt = Objects.requireNonNull(expiresAt, "Expires at cannot be null");
        this.createdAt = Instant.now();
        this.used = false;
        this.revoked = false;
    }

    public static RefreshToken create(
        UUID userId,
        UUID deviceId,
        UUID familyId,
        String tokenHash,
        Instant expiresAt
    ) {
        return new RefreshToken(
            UuidUtils.newUuid7(),
            userId,
            deviceId,
            familyId,
            tokenHash,
            expiresAt
        );
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getDeviceId() {
        return deviceId;
    }

    public UUID getFamilyId() {
        return familyId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isUsed() {
        return used;
    }

    public void setUsed(boolean used) {
        this.used = used;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public void setRevoked(boolean revoked) {
        this.revoked = revoked;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(this.expiresAt);
    }

    public boolean isValid() {
        return !used && !revoked && !isExpired();
    }

    public void markUsed() {
        this.used = true;
    }

    public void revoke() {
        this.revoked = true;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RefreshToken that)) return false;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
