package com.inventra.inventra_backend.common.mail.application;

import com.inventra.inventra_backend.common.mail.dto.BatchExpiryAlertItem;
import com.inventra.inventra_backend.common.mail.dto.ShipmentNoticeData;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

@Service
public class ThymeleafEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(ThymeleafEmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final SpringTemplateEngine templateEngine;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.mail.from:noreply@inventra.com}")
    private String fromAddress;

    @Value("${app.mail.from-name:Inventra Pharmacy ERP}")
    private String fromName;

    @Value("${app.mail.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public ThymeleafEmailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                                 SpringTemplateEngine templateEngine) {
        this.mailSenderProvider = mailSenderProvider;
        this.templateEngine = templateEngine;
    }

    @Override
    @Async("mailTaskExecutor")
    public void sendHtmlEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        try {
            // Prepare Thymeleaf context with standard variables
            Context context = new Context();
            Map<String, Object> model = new HashMap<>(variables != null ? variables : Map.of());
            model.putIfAbsent("frontendUrl", frontendUrl);
            model.putIfAbsent("companyName", "Inventra Pharmacy Network");
            context.setVariables(model);

            String htmlBody = templateEngine.process("mail/" + templateName, context);

            JavaMailSender mailSender = mailSenderProvider.getIfAvailable();

            if (!mailEnabled || mailSender == null) {
                log.info("[MOCK EMAIL] To: {} | Subject: '{}' | Template: 'mail/{}' | Preview Variables: {}",
                        to, subject, templateName, model);
                return;
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setTo(to);
            helper.setFrom(fromAddress, fromName);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("Email successfully dispatched to: {} | Subject: '{}'", to, subject);

        } catch (Exception e) {
            log.error("Failed to send async email to: {} with template: 'mail/{}'. Error: {}",
                    to, templateName, e.getMessage(), e);
        }
    }

    @Override
    public void sendStaffInvitation(String toEmail, String businessName, String role,
                                    String storeName, String activationUrl, int expiresDays) {
        String subject = "You're invited to join " + (businessName != null ? businessName : "Inventra") + " on Inventra";
        Map<String, Object> variables = Map.of(
                "businessName", businessName != null ? businessName : "Inventra Partner Pharmacy",
                "role", role != null ? role.replace('_', ' ') : "Staff Member",
                "storeName", storeName != null ? storeName : "Primary Workstation",
                "activationUrl", activationUrl != null ? activationUrl : frontendUrl,
                "expiresDays", expiresDays > 0 ? expiresDays : 7
        );
        sendHtmlEmail(toEmail, subject, "staff-invitation", variables);
    }

    @Override
    public void sendAccountActivated(String toEmail, String fullName, String businessName, String loginUrl) {
        String subject = "Welcome to Inventra! Your account is active";
        Map<String, Object> variables = Map.of(
                "fullName", fullName != null ? fullName : "Team Member",
                "businessName", businessName != null ? businessName : "Inventra Pharmacy",
                "loginUrl", loginUrl != null ? loginUrl : (frontendUrl + "/login")
        );
        sendHtmlEmail(toEmail, subject, "account-activated", variables);
    }

    @Override
    public void sendOnboardingSubmitted(String toEmail, String ownerName, String pharmacyName, String applicationNumber) {
        String subject = "Pharmacy Application Received - Reference #" + applicationNumber;
        Map<String, Object> variables = Map.of(
                "ownerName", ownerName != null ? ownerName : "Pharmacy Owner",
                "pharmacyName", pharmacyName != null ? pharmacyName : "Your Pharmacy",
                "applicationNumber", applicationNumber != null ? applicationNumber : "APP-PENDING"
        );
        sendHtmlEmail(toEmail, subject, "onboarding-submitted", variables);
    }

    @Override
    public void sendOnboardingDecision(String toEmail, String ownerName, String pharmacyName,
                                       boolean approved, String reason, String activationUrl) {
        String subject = approved
                ? "Congratulations! Your Inventra Pharmacy Registration is Approved"
                : "Update regarding your Inventra Pharmacy Application";
        Map<String, Object> variables = Map.of(
                "ownerName", ownerName != null ? ownerName : "Pharmacy Owner",
                "pharmacyName", pharmacyName != null ? pharmacyName : "Your Pharmacy",
                "approved", approved,
                "reason", reason != null ? reason : "",
                "activationUrl", activationUrl != null ? activationUrl : frontendUrl
        );
        sendHtmlEmail(toEmail, subject, "onboarding-decision", variables);
    }

    @Override
    public void sendBatchExpiryAlert(String toEmail, String storeName,
                                     List<BatchExpiryAlertItem> expiringBatches, String inventoryUrl) {
        String subject = "Inventory Notice: " + (expiringBatches != null ? expiringBatches.size() : 0)
                + " batches nearing expiry at " + (storeName != null ? storeName : "Store");
        Map<String, Object> variables = Map.of(
                "storeName", storeName != null ? storeName : "Your Store",
                "batches", expiringBatches != null ? expiringBatches : List.of(),
                "batchCount", expiringBatches != null ? expiringBatches.size() : 0,
                "inventoryUrl", inventoryUrl != null ? inventoryUrl : (frontendUrl + "/inventory/batches")
        );
        sendHtmlEmail(toEmail, subject, "batch-expiry-alert", variables);
    }

    @Override
    public void sendShipmentNotification(String toEmail, String storeName,
                                         ShipmentNoticeData shipmentData, String detailsUrl) {
        String subject = "Shipment " + (shipmentData != null ? shipmentData.status() : "Update")
                + " - Transfer #" + (shipmentData != null ? shipmentData.transferNumber() : "");
        Map<String, Object> variables = Map.of(
                "storeName", storeName != null ? storeName : "Store",
                "shipment", shipmentData != null ? shipmentData : Map.of(),
                "detailsUrl", detailsUrl != null ? detailsUrl : (frontendUrl + "/transfers")
        );
        sendHtmlEmail(toEmail, subject, "shipment-notice", variables);
    }

    @Override
    public void sendSubscriptionReceipt(
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
            String razorpayPaymentId,
            String razorpayOrderId,
            String invoiceDateFormatted,
            boolean isUpgrade,
            java.math.BigDecimal unusedCredit
    ) {
        sendSubscriptionReceipt(
            toEmail, businessName, ownerName, invoiceNumber, planName, billingCycle,
            subtotal, cgstAmount, sgstAmount, totalAmount, razorpayPaymentId, razorpayOrderId,
            invoiceDateFormatted, isUpgrade, unusedCredit, null, java.math.BigDecimal.ZERO
        );
    }

    @Override
    public void sendSubscriptionReceipt(
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
            String razorpayPaymentId,
            String razorpayOrderId,
            String invoiceDateFormatted,
            boolean isUpgrade,
            java.math.BigDecimal unusedCredit,
            String couponCode,
            java.math.BigDecimal couponDiscount
    ) {
        String subject = "Payment Confirmed: " + planName + " (" + invoiceNumber + ")";
        Map<String, Object> variables = new HashMap<>();
        variables.put("businessName", businessName != null ? businessName : "Inventra Pharmacy");
        variables.put("ownerName", ownerName != null ? ownerName : "Pharmacy Owner");
        variables.put("invoiceNumber", invoiceNumber);
        variables.put("planName", planName);
        variables.put("billingCycle", billingCycle);
        variables.put("subtotal", subtotal != null ? subtotal : java.math.BigDecimal.ZERO);
        variables.put("cgstAmount", cgstAmount != null ? cgstAmount : java.math.BigDecimal.ZERO);
        variables.put("sgstAmount", sgstAmount != null ? sgstAmount : java.math.BigDecimal.ZERO);
        variables.put("totalAmount", totalAmount != null ? totalAmount : java.math.BigDecimal.ZERO);
        variables.put("razorpayPaymentId", razorpayPaymentId != null ? razorpayPaymentId : "N/A");
        variables.put("razorpayOrderId", razorpayOrderId != null ? razorpayOrderId : "N/A");
        variables.put("invoiceDateFormatted", invoiceDateFormatted);
        variables.put("isUpgrade", isUpgrade);
        variables.put("unusedCredit", unusedCredit != null ? unusedCredit : java.math.BigDecimal.ZERO);
        variables.put("couponCode", couponCode);
        variables.put("couponDiscount", couponDiscount != null ? couponDiscount : java.math.BigDecimal.ZERO);
        variables.put("hsnSac", "997331");
        variables.put("dashboardUrl", frontendUrl + "/settings/subscription");

        sendHtmlEmail(toEmail, subject, "subscription-receipt", variables);
    }

    @Override
    public void sendApplicationStatusUpdate(
            String toEmail,
            String candidateName,
            String jobTitle,
            String status,
            String adminNotes
    ) {
        String subject = "Update regarding your application for " + jobTitle + " at Inventra";
        Map<String, Object> variables = new HashMap<>();
        variables.put("candidateName", candidateName != null ? candidateName : "Applicant");
        variables.put("jobTitle", jobTitle);
        variables.put("status", status != null ? status.toUpperCase() : "REVIEWING");
        variables.put("adminNotes", adminNotes);

        sendHtmlEmail(toEmail, subject, "career-application-status", variables);
    }
}
