package com.inventra.inventra_backend.common.mail;

import com.inventra.inventra_backend.common.mail.dto.BatchExpiryAlertItem;
import com.inventra.inventra_backend.common.mail.dto.ShipmentNoticeData;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import static org.assertj.core.api.Assertions.assertThat;

class ThymeleafEmailTemplateRenderTest {

    private SpringTemplateEngine templateEngine;

    @BeforeEach
    void setUp() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/mail/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(false);

        templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);
    }

    @Test
    void testStaffInvitationTemplate() {
        Context context = new Context();
        context.setVariables(Map.of(
                "businessName", "Apollo Pharmacy",
                "role", "PHARMACIST",
                "storeName", "Connaught Place Store",
                "activationUrl", "https://app.inventra.in/activate?token=abc123xyz",
                "expiresDays", 7
        ));

        String html = templateEngine.process("staff-invitation", context);
        assertThat(html).contains("Apollo Pharmacy");
        assertThat(html).contains("PHARMACIST");
        assertThat(html).contains("Activate Account & Set Password");
        assertThat(html).contains("7 Days");
    }

    @Test
    void testAccountActivatedTemplate() {
        Context context = new Context();
        context.setVariables(Map.of(
                "fullName", "Dr. Rajesh Sharma",
                "businessName", "Apollo Pharmacy",
                "loginUrl", "https://app.inventra.in/login"
        ));

        String html = templateEngine.process("account-activated", context);
        assertThat(html).contains("Dr. Rajesh Sharma");
        assertThat(html).contains("Apollo Pharmacy");
        assertThat(html).contains("Sign In to Inventra Terminal");
    }

    @Test
    void testBatchExpiryAlertTemplate() {
        BatchExpiryAlertItem item1 = new BatchExpiryAlertItem(
                "Amoxicillin 500mg", "AMX-882", LocalDate.now().plusDays(5),
                5, 140, "CRITICAL"
        );
        BatchExpiryAlertItem item2 = new BatchExpiryAlertItem(
                "Paracetamol 650mg", "PCM-102", LocalDate.now().plusDays(25),
                25, 300, "WARNING"
        );

        Context context = new Context();
        context.setVariables(Map.of(
                "storeName", "Koramangala Branch",
                "batchCount", 2,
                "inventoryUrl", "https://app.inventra.in/inventory/batches",
                "batches", List.of(item1, item2)
        ));

        String html = templateEngine.process("batch-expiry-alert", context);
        assertThat(html).contains("Koramangala Branch");
        assertThat(html).contains("Amoxicillin 500mg");
        assertThat(html).contains("Paracetamol 650mg");
        assertThat(html).contains("Automated FEFO Expiry Surveillance");
    }

    @Test
    void testShipmentNoticeTemplate() {
        ShipmentNoticeData.ShipmentLineItem item = new ShipmentNoticeData.ShipmentLineItem(
                "Metformin 500mg", 50, 50
        );

        ShipmentNoticeData data = new ShipmentNoticeData(
                "TRF-2026-0089",
                "DISPATCHED",
                "Central Warehouse",
                "Indiranagar Retail Outlet",
                "BlueDart Logistics",
                "BD-98218731",
                List.of(item)
        );

        Context context = new Context();
        context.setVariables(Map.of(
                "storeName", "Indiranagar Retail Outlet",
                "shipment", data,
                "detailsUrl", "https://app.inventra.in/transfers/TRF-2026-0089"
        ));

        String html = templateEngine.process("shipment-notice", context);
        assertThat(html).contains("TRF-2026-0089");
        assertThat(html).contains("Central Warehouse");
        assertThat(html).contains("Indiranagar Retail Outlet");
        assertThat(html).contains("Metformin 500mg");
        assertThat(html).contains("DISPATCHED");
    }

    @Test
    void testOnboardingSubmittedTemplate() {
        Context context = new Context();
        context.setVariables(Map.of(
                "ownerName", "Vikas Patel",
                "pharmacyName", "Shree Ganesh Medicals",
                "applicationNumber", "APP-202609-881"
        ));

        String html = templateEngine.process("onboarding-submitted", context);
        assertThat(html).contains("Vikas Patel");
        assertThat(html).contains("Shree Ganesh Medicals");
        assertThat(html).contains("APP-202609-881");
        assertThat(html).contains("UNDER COMPLIANCE REVIEW");
    }

    @Test
    void testOnboardingDecisionTemplate() {
        Context context = new Context();
        context.setVariables(Map.of(
                "ownerName", "Vikas Patel",
                "pharmacyName", "Shree Ganesh Medicals",
                "approved", true,
                "activationUrl", "https://app.inventra.in/activate",
                "reason", ""
        ));

        String html = templateEngine.process("onboarding-decision", context);
        assertThat(html).contains("Vikas Patel");
        assertThat(html).contains("Shree Ganesh Medicals");
        assertThat(html).contains("Activate Pharmacy Account");
        assertThat(html).contains("APPROVED");
    }
}
