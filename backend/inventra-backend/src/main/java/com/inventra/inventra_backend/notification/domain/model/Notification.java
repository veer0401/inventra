package com.inventra.inventra_backend.notification.domain.model;

import com.inventra.inventra_backend.common.util.UuidUtils;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false)
    private UUID businessId;

    @Column(name = "store_id")
    private UUID storeId;

    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private NotificationSeverity severity = NotificationSeverity.INFO;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "action_url", length = 500)
    private String actionUrl;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Notification() {}

    public Notification(UUID businessId, UUID storeId, UUID userId, NotificationType type,
                        NotificationSeverity severity, String title, String message, String actionUrl) {
        this.id = UuidUtils.newUuid7();
        this.businessId = Objects.requireNonNull(businessId, "businessId must not be null");
        this.storeId = storeId;
        this.userId = userId;
        this.type = Objects.requireNonNull(type, "type must not be null");
        this.severity = severity != null ? severity : NotificationSeverity.INFO;
        this.title = Objects.requireNonNull(title, "title must not be null");
        this.message = Objects.requireNonNull(message, "message must not be null");
        this.actionUrl = actionUrl;
        this.createdAt = Instant.now();
    }

    public void markAsRead() {
        if (this.readAt == null) {
            this.readAt = Instant.now();
        }
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

    public UUID getUserId() {
        return userId;
    }

    public NotificationType getType() {
        return type;
    }

    public NotificationSeverity getSeverity() {
        return severity;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public String getActionUrl() {
        return actionUrl;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public boolean isRead() {
        return readAt != null;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
