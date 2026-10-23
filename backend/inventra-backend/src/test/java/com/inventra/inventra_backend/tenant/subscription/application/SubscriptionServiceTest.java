package com.inventra.inventra_backend.tenant.subscription.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.domain.repository.BusinessRepository;
import com.inventra.inventra_backend.tenant.domain.repository.DeviceRepository;
import com.inventra.inventra_backend.tenant.domain.repository.StoreRepository;
import com.inventra.inventra_backend.tenant.subscription.api.dto.LicenseInvoiceResponse;
import com.inventra.inventra_backend.tenant.subscription.api.dto.UpgradePreviewResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class SubscriptionServiceTest {

    private BusinessRepository businessRepository;
    private DeviceRepository deviceRepository;
    private StoreRepository storeRepository;
    private ObjectMapper objectMapper;
    private JdbcTemplate jdbcTemplate;
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
        pdfInvoiceService = new PdfInvoiceService();
        couponService = mock(CouponService.class);

        subscriptionService = new SubscriptionService(
            businessRepository,
            deviceRepository,
            storeRepository,
            objectMapper,
            jdbcTemplate,
            pdfInvoiceService,
            couponService
        );

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
            "Manual Payment",
            "PAID",
            "997331",
            "/api/v1/subscription/invoices/test/pdf"
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
