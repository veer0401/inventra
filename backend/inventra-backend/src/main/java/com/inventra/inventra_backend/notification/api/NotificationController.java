package com.inventra.inventra_backend.notification.api;

import com.inventra.inventra_backend.common.api.ApiResponse;
import com.inventra.inventra_backend.common.multitenancy.TenantContextHolder;
import com.inventra.inventra_backend.notification.api.dto.NotificationResponse;
import com.inventra.inventra_backend.notification.application.NotificationService;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotifications(
            @RequestParam(name = "unreadOnly", defaultValue = "false") boolean unreadOnly,
            @PageableDefault(size = 20) Pageable pageable,
            Authentication authentication
    ) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = (UUID) authentication.getPrincipal();

        Page<NotificationResponse> result = notificationService.getAccessibleNotifications(
                businessId, userId, unreadOnly, pageable
        );
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(Authentication authentication) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = (UUID) authentication.getPrincipal();

        long count = notificationService.getUnreadCount(businessId, userId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("unreadCount", count)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable("id") UUID id,
            Authentication authentication
    ) {
        UUID businessId = getRequiredBusinessId();
        notificationService.markAsRead(businessId, id);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PatchMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> markAllAsRead(Authentication authentication) {
        UUID businessId = getRequiredBusinessId();
        UUID userId = (UUID) authentication.getPrincipal();

        int updated = notificationService.markAllAsRead(businessId, userId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("markedReadCount", updated)));
    }

    private UUID getRequiredBusinessId() {
        return TenantContextHolder.getTenantId()
            .map(t -> UUID.fromString(t.value()))
            .orElseThrow(() -> new IllegalStateException("Active business context is required for notification operations"));
    }
}
