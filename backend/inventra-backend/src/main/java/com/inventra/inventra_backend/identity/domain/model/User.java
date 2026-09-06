package com.inventra.inventra_backend.identity.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private AccountStatus status = AccountStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform_role", length = 50)
    private Role platformRole;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    protected User() {
        // Required by JPA
    }

    public User(UUID id, String email, String passwordHash, String fullName, String phoneNumber) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        setEmail(email);
        setPasswordHash(passwordHash);
        setFullName(fullName);
        this.phoneNumber = phoneNumber != null ? phoneNumber.trim() : null;
        this.status = AccountStatus.ACTIVE;
        this.emailVerified = false;
        this.platformRole = null;
    }

    public static User create(String email, String passwordHash, String fullName, String phoneNumber) {
        return new User(UuidUtils.newUuid7(), email, passwordHash, fullName, phoneNumber);
    }

    public static User createPlatformAdmin(String email, String passwordHash, String fullName) {
        User user = new User(UuidUtils.newUuid7(), email, passwordHash, fullName, null);
        user.setPlatformRole(Role.PLATFORM_ADMIN);
        user.setEmailVerified(true);
        return user;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        Objects.requireNonNull(email, "Email cannot be null");
        String normalized = email.trim().toLowerCase();
        if (normalized.isEmpty() || !normalized.contains("@")) {
            throw new IllegalArgumentException("Invalid email format: " + email);
        }
        this.email = normalized;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber != null ? phoneNumber.trim() : null;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        Objects.requireNonNull(passwordHash, "Password hash cannot be null");
        if (passwordHash.trim().isEmpty()) {
            throw new IllegalArgumentException("Password hash cannot be blank");
        }
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        Objects.requireNonNull(fullName, "Full name cannot be null");
        String trimmed = fullName.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Full name cannot be blank");
        }
        this.fullName = trimmed;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = Objects.requireNonNull(status, "Status cannot be null");
    }

    public Role getPlatformRole() {
        return platformRole;
    }

    public void setPlatformRole(Role platformRole) {
        this.platformRole = platformRole;
    }

    public boolean isPlatformAdmin() {
        return this.platformRole == Role.PLATFORM_ADMIN;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public boolean isActive() {
        return this.status == AccountStatus.ACTIVE;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User user)) return false;
        return id != null && id.equals(user.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
