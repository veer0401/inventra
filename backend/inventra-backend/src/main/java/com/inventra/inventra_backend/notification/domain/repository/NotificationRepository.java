package com.inventra.inventra_backend.notification.domain.repository;

import com.inventra.inventra_backend.notification.domain.model.Notification;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query("SELECT n FROM Notification n WHERE n.businessId = :businessId AND (n.userId = :userId OR n.userId IS NULL) ORDER BY n.createdAt DESC")
    Page<Notification> findAccessibleNotifications(
            @Param("businessId") UUID businessId,
            @Param("userId") UUID userId,
            Pageable pageable
    );

    @Query("SELECT n FROM Notification n WHERE n.businessId = :businessId AND (n.userId = :userId OR n.userId IS NULL) AND n.readAt IS NULL ORDER BY n.createdAt DESC")
    Page<Notification> findUnreadNotifications(
            @Param("businessId") UUID businessId,
            @Param("userId") UUID userId,
            Pageable pageable
    );

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.businessId = :businessId AND (n.userId = :userId OR n.userId IS NULL) AND n.readAt IS NULL")
    long countUnread(
            @Param("businessId") UUID businessId,
            @Param("userId") UUID userId
    );

    Optional<Notification> findByIdAndBusinessId(UUID id, UUID businessId);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :now WHERE n.businessId = :businessId AND (n.userId = :userId OR n.userId IS NULL) AND n.readAt IS NULL")
    int markAllAsRead(
            @Param("businessId") UUID businessId,
            @Param("userId") UUID userId,
            @Param("now") Instant now
    );
}
