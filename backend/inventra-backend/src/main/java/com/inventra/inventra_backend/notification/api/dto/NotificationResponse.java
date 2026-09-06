package com.inventra.inventra_backend.notification.api.dto;

import com.inventra.inventra_backend.notification.domain.model.Notification;
import com.inventra.inventra_backend.notification.domain.model.NotificationSeverity;
import com.inventra.inventra_backend.notification.domain.model.NotificationType;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
    UUID id,
    UUID businessId,
    UUID storeId,
    UUID userId,
    NotificationType type,
    NotificationSeverity severity,
    String title,
    String message,
    String actionUrl,
    Instant readAt,
    boolean isRead,
    Instant createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getBusinessId(),
                n.getStoreId(),
                n.getUserId(),
                n.getType(),
                n.getSeverity(),
                n.getTitle(),
                n.getMessage(),
                n.getActionUrl(),
                n.getReadAt(),
                n.isRead(),
                n.getCreatedAt()
        );
    }
}
