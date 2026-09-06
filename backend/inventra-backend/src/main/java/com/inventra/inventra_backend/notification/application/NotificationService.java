package com.inventra.inventra_backend.notification.application;

import com.inventra.inventra_backend.common.mail.application.EmailService;
import com.inventra.inventra_backend.common.mail.dto.BatchExpiryAlertItem;
import com.inventra.inventra_backend.common.mail.dto.ShipmentNoticeData;
import com.inventra.inventra_backend.notification.api.dto.NotificationResponse;
import com.inventra.inventra_backend.notification.domain.model.Notification;
import com.inventra.inventra_backend.notification.domain.model.NotificationSeverity;
import com.inventra.inventra_backend.notification.domain.model.NotificationType;
import com.inventra.inventra_backend.notification.domain.repository.NotificationRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    public NotificationService(NotificationRepository notificationRepository, EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.emailService = emailService;
    }

    @Transactional
    public Notification notifyStaffInvitation(UUID businessId, UUID storeId, UUID userId, String recipientEmail,
                                              String businessName, String role, String storeName,
                                              String activationUrl, int expiresDays) {
        Notification notification = new Notification(
                businessId,
                storeId,
                userId,
                NotificationType.STAFF_INVITATION,
                NotificationSeverity.INFO,
                "Staff Invitation Created",
                "An invitation to join " + businessName + " as " + role + " has been generated.",
                activationUrl
        );
        Notification saved = notificationRepository.save(notification);

        if (recipientEmail != null && !recipientEmail.isBlank()) {
            emailService.sendStaffInvitation(recipientEmail, businessName, role, storeName, activationUrl, expiresDays);
        }
        return saved;
    }

    @Transactional
    public Notification notifyAccountActivated(UUID businessId, UUID storeId, UUID userId, String recipientEmail,
                                               String fullName, String businessName, String loginUrl) {
        Notification notification = new Notification(
                businessId,
                storeId,
                userId,
                NotificationType.ACCOUNT_ACTIVATED,
                NotificationSeverity.SUCCESS,
                "Account Activated",
                "Your user profile at " + businessName + " is now active and ready for POS operations.",
                loginUrl
        );
        Notification saved = notificationRepository.save(notification);

        if (recipientEmail != null && !recipientEmail.isBlank()) {
            emailService.sendAccountActivated(recipientEmail, fullName, businessName, loginUrl);
        }
        return saved;
    }

    @Transactional
    public Notification notifyBatchExpiry(UUID businessId, UUID storeId, String recipientEmail,
                                          String storeName, List<BatchExpiryAlertItem> expiringBatches,
                                          String inventoryUrl) {
        int count = expiringBatches != null ? expiringBatches.size() : 0;
        NotificationSeverity severity = expiringBatches != null && expiringBatches.stream().anyMatch(b -> b.daysRemaining() <= 30)
                ? NotificationSeverity.CRITICAL
                : NotificationSeverity.WARNING;

        Notification notification = new Notification(
                businessId,
                storeId,
                null, // broadcast to store staff
                NotificationType.BATCH_EXPIRY,
                severity,
                "Batch Expiry Alert: " + count + " items nearing expiry",
                count + " medicine batch(es) at " + storeName + " require immediate FEFO rotation or quarantine.",
                inventoryUrl
        );
        Notification saved = notificationRepository.save(notification);

        if (recipientEmail != null && !recipientEmail.isBlank() && count > 0) {
            emailService.sendBatchExpiryAlert(recipientEmail, storeName, expiringBatches, inventoryUrl);
        }
        return saved;
    }

    @Transactional
    public Notification notifyShipment(UUID businessId, UUID storeId, String recipientEmail,
                                       String storeName, ShipmentNoticeData shipmentData, String detailsUrl) {
        NotificationSeverity severity = "ARRIVED".equalsIgnoreCase(shipmentData.status())
                ? NotificationSeverity.SUCCESS
                : NotificationSeverity.INFO;

        Notification notification = new Notification(
                businessId,
                storeId,
                null,
                "ARRIVED".equalsIgnoreCase(shipmentData.status())
                        ? NotificationType.SHIPMENT_ARRIVAL
                        : NotificationType.SHIPMENT_DISPATCH,
                severity,
                "Stock Transfer " + shipmentData.status() + " (#" + shipmentData.transferNumber() + ")",
                "Requisition delivery between " + shipmentData.originStoreName() + " and " + shipmentData.destinationStoreName() + " is " + shipmentData.status() + ".",
                detailsUrl
        );
        Notification saved = notificationRepository.save(notification);

        if (recipientEmail != null && !recipientEmail.isBlank()) {
            emailService.sendShipmentNotification(recipientEmail, storeName, shipmentData, detailsUrl);
        }
        return saved;
    }

    @Transactional
    public Notification notifyOnboardingSubmitted(UUID businessId, String recipientEmail, String ownerName,
                                                  String pharmacyName, String applicationNumber) {
        Notification notification = new Notification(
                businessId,
                null,
                null,
                NotificationType.ONBOARDING_APPLICATION,
                NotificationSeverity.INFO,
                "Pharmacy Registration Submitted (#" + applicationNumber + ")",
                "Application for " + pharmacyName + " is under compliance review.",
                null
        );
        Notification saved = notificationRepository.save(notification);

        if (recipientEmail != null && !recipientEmail.isBlank()) {
            emailService.sendOnboardingSubmitted(recipientEmail, ownerName, pharmacyName, applicationNumber);
        }
        return saved;
    }

    @Transactional
    public Notification notifyOnboardingDecision(UUID businessId, String recipientEmail, String ownerName,
                                                 String pharmacyName, boolean approved, String reason, String activationUrl) {
        NotificationSeverity severity = approved ? NotificationSeverity.SUCCESS : NotificationSeverity.CRITICAL;
        Notification notification = new Notification(
                businessId,
                null,
                null,
                NotificationType.ONBOARDING_APPLICATION,
                severity,
                approved ? "Pharmacy Registration Approved!" : "Pharmacy Registration Not Approved",
                approved ? "Workspace for " + pharmacyName + " has been provisioned." : ("Application was rejected: " + reason),
                activationUrl
        );
        Notification saved = notificationRepository.save(notification);

        if (recipientEmail != null && !recipientEmail.isBlank()) {
            emailService.sendOnboardingDecision(recipientEmail, ownerName, pharmacyName, approved, reason, activationUrl);
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getAccessibleNotifications(UUID businessId, UUID userId, boolean unreadOnly, Pageable pageable) {
        Page<Notification> page = unreadOnly
                ? notificationRepository.findUnreadNotifications(businessId, userId, pageable)
                : notificationRepository.findAccessibleNotifications(businessId, userId, pageable);
        return page.map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID businessId, UUID userId) {
        return notificationRepository.countUnread(businessId, userId);
    }

    @Transactional
    public void markAsRead(UUID businessId, UUID notificationId) {
        notificationRepository.findByIdAndBusinessId(notificationId, businessId)
                .ifPresent(Notification::markAsRead);
    }

    @Transactional
    public int markAllAsRead(UUID businessId, UUID userId) {
        return notificationRepository.markAllAsRead(businessId, userId, Instant.now());
    }
}
