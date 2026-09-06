package com.inventra.inventra_backend.tenant.subscription.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.common.mail.application.EmailService;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import com.inventra.inventra_backend.tenant.subscription.api.dto.LicenseInvoiceResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.PaymentInitiateResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.UpgradePreviewResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.UpgradeSubscriptionRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

class SubscriptionServiceTest {

    private BusinessRepository businessRepository;
    private DeviceRepository deviceRepository;
    private StoreRepository storeRepository;
    private ObjectMapper objectMapper;
    private JdbcTemplate jdbcTemplate;
    private EmailService emailService;
    private PdfInvoiceService pdfInvoiceService;
    private CouponService couponService;

    private SubscriptionService subscriptionService;

    private final UUID testBusinessId = UUID.randomUUID();
    private Business mockBusiness;

    @BeforeEach
    void setUp() {
        businessRepository = mock(BusinessRepository.class);
        deviceRepository = mock(DeviceRepository.class);
        storeRepository = mock(StoreRepository.class);
        objectMapper = new ObjectMapper();
        jdbcTemplate = mock(JdbcTemplate.class);
        emailService = mock(EmailService.class);
        pdfInvoiceService = new PdfInvoiceService();
        couponService = mock(CouponService.class);

        subscriptionService = new SubscriptionService(
            businessRepository,
            deviceRepository,
            storeRepository,
            objectMapper,
            jdbcTemplate,
            emailService,
            pdfInvoiceService,
            couponService
        );

        ReflectionTestUtils.setField(subscriptionService, "razorpayKeyId", "rzp_test_TYTAlQlAsfn5D6");
        ReflectionTestUtils.setField(subscriptionService, "razorpayKeySecret", "mcZ576HzdM8Aw2dQhmYyAO5C");

        mockBusiness = new Business(
            testBusinessId,
            "Test Pharmacy Store",
            "Test Pharmacy",
            "DL-12345",
            "27AAAAA0000A1Z5"
        );
        when(businessRepository.findById(testBusinessId)).thenReturn(Optional.of(mockBusiness));
    }

    @Test
    @DisplayName("calculateUpgradePreview accurately prorates unused days credit and calculates 18% GST")
    void testCalculateUpgradePreview() {
        UpgradePreviewResponse preview = subscriptionService.calculateUpgradePreview(
            testBusinessId,
            "ENTERPRISE",
            "MONTHLY"
        );

        assertThat(preview).isNotNull();
        assertThat(preview.currentTier()).isEqualTo("STARTER");
        assertThat(preview.targetTier()).isEqualTo("ENTERPRISE");
        assertThat(preview.targetCycle()).isEqualTo("MONTHLY");
        assertThat(preview.targetPrice()).isEqualByComparingTo(BigDecimal.valueOf(5999.00));

        // Unused credit deduction
        assertThat(preview.unusedCredit()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
        assertThat(preview.netSubtotal()).isLessThanOrEqualTo(preview.targetPrice());

        // CGST (9%) + SGST (9%) = 18% total GST
        BigDecimal totalGst = preview.cgstAmount().add(preview.sgstAmount()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal expectedGst = preview.netSubtotal().multiply(BigDecimal.valueOf(0.18)).setScale(2, RoundingMode.HALF_UP);
        assertThat(totalGst).isEqualByComparingTo(expectedGst);

        // Total payable = netSubtotal + totalGst
        BigDecimal expectedTotal = preview.netSubtotal().add(totalGst).setScale(2, RoundingMode.HALF_UP);
        assertThat(preview.totalPayable()).isEqualByComparingTo(expectedTotal);
    }

    @Test
    @DisplayName("initiatePayment generates dynamic UPI QR code with valid upi://pay URI")
    void testInitiatePaymentGeneratesUpiQr() {
        UpgradeSubscriptionRequest req = new UpgradeSubscriptionRequest("ENTERPRISE", "MONTHLY");

        PaymentInitiateResponse response = subscriptionService.initiatePayment(testBusinessId, req);

        assertThat(response).isNotNull();
        assertThat(response.currency()).isEqualTo("INR");
        assertThat(response.upiQrString()).isNotNull();
        assertThat(response.upiQrString()).startsWith("upi://pay?");
        assertThat(response.upiQrString()).contains("pa=inventra@icici");
        assertThat(response.upiQrString()).contains("am=");
        assertThat(response.upiQrString()).contains("cu=INR");
    }

    @Test
    @DisplayName("PdfInvoiceService generates valid vector PDF bytes with %PDF- header")
    void testPdfInvoiceGeneration() {
        LicenseInvoiceResponse mockInvoice = new LicenseInvoiceResponse(
            UUID.randomUUID().toString(),
            "INV-2026-TEST01",
            Instant.now(),
            "Inventra Pharmacy ERP - Enterprise Plan (Monthly)",
            "ENTERPRISE",
            BigDecimal.valueOf(2999.00),
            BigDecimal.valueOf(269.91),
            BigDecimal.valueOf(269.91),
            BigDecimal.valueOf(3538.82),
            "UPI / Razorpay",
            "PAID",
            "997331",
            "/api/v1/subscription/invoices/test/pdf",
            "pay_TEST123456789",
            "order_TEST987654321"
        );

        byte[] pdfBytes = pdfInvoiceService.generateSubscriptionInvoicePdf(
            mockBusiness,
            mockInvoice
        );

        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(500);

        // PDF file format starts with "%PDF-"
        String header = new String(pdfBytes, 0, 5);
        assertThat(header).isEqualTo("%PDF-");
    }
}
