package com.inventra.inventra_backend.common.mail.application;

import com.inventra.inventra_backend.common.mail.dto.BatchExpiryAlertItem;
import com.inventra.inventra_backend.common.mail.dto.ShipmentNoticeData;
import java.util.List;
import java.util.Map;

public interface EmailService {

    void sendHtmlEmail(String to, String subject, String templateName, Map<String, Object> variables);

    void sendStaffInvitation(String toEmail, String businessName, String role, String storeName, String activationUrl, int expiresDays);

    void sendAccountActivated(String toEmail, String fullName, String businessName, String loginUrl);

    void sendOnboardingSubmitted(String toEmail, String ownerName, String pharmacyName, String applicationNumber);

    void sendOnboardingDecision(String toEmail, String ownerName, String pharmacyName, boolean approved, String reason, String activationUrl);

    void sendBatchExpiryAlert(String toEmail, String storeName, List<BatchExpiryAlertItem> expiringBatches, String inventoryUrl);

    void sendShipmentNotification(String toEmail, String storeName, ShipmentNoticeData shipmentData, String detailsUrl);

    void sendSubscriptionReceipt(
        String toEmail,
        String businessName,
        String ownerName,
        String invoiceNumber,
        String planName,
        String billingCycle,
        java.math.BigDecimal subtotal,
        java.math.BigDecimal cgstAmount,
        java.math.BigDecimal sgstAmount,
        java.math.BigDecimal totalAmount,
        String invoiceDateFormatted,
        boolean isUpgrade,
        java.math.BigDecimal unusedCredit
    );

    default void sendSubscriptionReceipt(
        String toEmail,
        String businessName,
        String ownerName,
        String invoiceNumber,
        String planName,
        String billingCycle,
        java.math.BigDecimal subtotal,
        java.math.BigDecimal cgstAmount,
        java.math.BigDecimal sgstAmount,
        java.math.BigDecimal totalAmount,
        String invoiceDateFormatted,
        boolean isUpgrade,
        java.math.BigDecimal unusedCredit,
        String couponCode,
        java.math.BigDecimal couponDiscount
    ) {
        sendSubscriptionReceipt(
            toEmail, businessName, ownerName, invoiceNumber, planName, billingCycle,
            subtotal, cgstAmount, sgstAmount, totalAmount,
            invoiceDateFormatted, isUpgrade, unusedCredit
        );
    }

    void sendApplicationStatusUpdate(
        String toEmail,
        String candidateName,
        String jobTitle,
        String status,
        String adminNotes
    );
}
