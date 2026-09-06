package com.inventra.inventra_backend.notification.application;

import com.inventra.inventra_backend.common.mail.application.EmailService;
import com.inventra.inventra_backend.common.mail.dto.BatchExpiryAlertItem;
import com.inventra.inventra_backend.common.mail.dto.ShipmentNoticeData;
import com.inventra.inventra_backend.notification.domain.model.Notification;
import com.inventra.inventra_backend.notification.domain.model.NotificationSeverity;
import com.inventra.inventra_backend.notification.domain.model.NotificationType;
import com.inventra.inventra_backend.notification.domain.repository.NotificationRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private EmailService emailService;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository, emailService);
    }

    @Test
    void testNotifyStaffInvitation() {
        UUID businessId = UUID.randomUUID();
        UUID actorUserId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        String recipientEmail = "pharmacist@example.com";

        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        notificationService.notifyStaffInvitation(
                businessId, storeId, actorUserId, recipientEmail,
                "Health First Pharmacy", "PHARMACIST", "Branch 1",
                "https://app.inventra.in/activate?token=123", 7
        );

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getBusinessId()).isEqualTo(businessId);
        assertThat(saved.getType()).isEqualTo(NotificationType.STAFF_INVITATION);
        assertThat(saved.getSeverity()).isEqualTo(NotificationSeverity.INFO);
        assertThat(saved.getMessage()).contains("Health First Pharmacy");

        verify(emailService).sendStaffInvitation(
                eq(recipientEmail), eq("Health First Pharmacy"), eq("PHARMACIST"),
                eq("Branch 1"), eq("https://app.inventra.in/activate?token=123"), eq(7)
        );
    }

    @Test
    void testNotifyAccountActivated() {
        UUID businessId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        notificationService.notifyAccountActivated(
                businessId, null, userId, "user@example.com",
                "Anita Desai", "Apollo Meds", "https://app.inventra.in/login"
        );

        verify(notificationRepository).save(any(Notification.class));
        verify(emailService).sendAccountActivated(
                eq("user@example.com"), eq("Anita Desai"), eq("Apollo Meds"), eq("https://app.inventra.in/login")
        );
    }

    @Test
    void testNotifyBatchExpiry() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();

        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        BatchExpiryAlertItem item = new BatchExpiryAlertItem(
                "Augmentin 625 Duo", "AUG-991", LocalDate.now().plusDays(2),
                2, 25, "CRITICAL"
        );

        notificationService.notifyBatchExpiry(
                businessId, storeId, "manager@example.com",
                "Main Dispensary", List.of(item), "https://app.inventra.in/inventory"
        );

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getType()).isEqualTo(NotificationType.BATCH_EXPIRY);
        assertThat(saved.getSeverity()).isEqualTo(NotificationSeverity.CRITICAL);

        verify(emailService).sendBatchExpiryAlert(
                eq("manager@example.com"), eq("Main Dispensary"),
                eq(List.of(item)), eq("https://app.inventra.in/inventory")
        );
    }

    @Test
    void testNotifyShipmentNotice() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();

        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ShipmentNoticeData data = new ShipmentNoticeData(
                "TRF-1002", "ARRIVED", "Store A", "Store B",
                "BlueDart", "BD-1234",
                List.of()
        );

        notificationService.notifyShipment(
                businessId, storeId, "logistics@example.com", "Store B", data, "https://app.inventra.in/transfers/1002"
        );

        verify(notificationRepository).save(any(Notification.class));
        verify(emailService).sendShipmentNotification(
                eq("logistics@example.com"), eq("Store B"), eq(data), eq("https://app.inventra.in/transfers/1002")
        );
    }
}
