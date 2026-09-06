package com.inventra.inventra_backend.identity.domain.model;

import com.inventra.inventra_backend.common.domain.BaseAuditableEntity;
import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "user_shortcut_profiles")
public class UserShortcutProfile extends BaseAuditableEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = false;

    @Column(name = "shortcuts_json", nullable = false, columnDefinition = "TEXT")
    private String shortcutsJson = "{}";

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    protected UserShortcutProfile() {
        // Required by JPA
    }

    public UserShortcutProfile(
        UUID id,
        UUID userId,
        String name,
        String description,
        boolean isActive,
        String shortcutsJson
    ) {
        this.id = id != null ? id : UuidUtils.newUuid7();
        this.userId = Objects.requireNonNull(userId, "User ID cannot be null");
        setName(name);
        this.description = description != null ? description.trim() : null;
        this.isActive = isActive;
        this.shortcutsJson = shortcutsJson != null ? shortcutsJson.trim() : "{}";
    }

    public static UserShortcutProfile create(
        UUID userId,
        String name,
        String description,
        boolean isActive,
        String shortcutsJson
    ) {
        return new UserShortcutProfile(
            UuidUtils.newUuid7(),
            userId,
            name,
            description,
            isActive,
            shortcutsJson
        );
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        Objects.requireNonNull(name, "Profile name cannot be null");
        String trimmed = name.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Profile name cannot be blank");
        }
        if (trimmed.length() > 100) {
            throw new IllegalArgumentException("Profile name cannot exceed 100 characters");
        }
        this.name = trimmed;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description != null ? description.trim() : null;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public String getShortcutsJson() {
        return shortcutsJson;
    }

    public void setShortcutsJson(String shortcutsJson) {
        this.shortcutsJson = (shortcutsJson != null && !shortcutsJson.trim().isEmpty())
            ? shortcutsJson.trim()
            : "{}";
    }

    public Long getVersion() {
        return version;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserShortcutProfile that)) return false;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
