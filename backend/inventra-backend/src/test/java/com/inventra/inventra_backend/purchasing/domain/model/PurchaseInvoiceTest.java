package com.inventra.inventra_backend.purchasing.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PurchaseInvoiceTest {

    @Test
    @DisplayName("Calculates invoice totals including discount and round-off")
    void testPurchaseInvoiceTotals() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID supplierId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        PurchaseInvoice invoice = new PurchaseInvoice(
            businessId,
            storeId,
            supplierId,
            null,
            null,
            "INV-2026-0987",
            LocalDate.now(),
            LocalDate.now().plusDays(30),
            new BigDecimal("20.0000"), // invoice level discount
            new BigDecimal("0.50"), // round off
            "Monthly settlement"
        );

        // 10 units @ 50.00 each = 500.00, line discount 10.00 -> net 490.00, 10% tax = 49.00 -> line total 539.00
        PurchaseInvoiceLine line = new PurchaseInvoiceLine(
            businessId,
            invoice.getId(),
            null,
            productId,
            1,
            new BigDecimal("10.000"),
            new BigDecimal("50.0000"),
            new BigDecimal("10.0000"),
            new BigDecimal("10.00")
        );

        invoice.addLine(line);

        assertThat(line.getTaxAmount()).isEqualByComparingTo("49.0000");
        assertThat(line.getLineTotal()).isEqualByComparingTo("539.0000");

        // Subtotal: 490.0000, Tax: 49.0000, Discount: 20.0000, Roundoff: 0.50 -> Total: 519.5000
        assertThat(invoice.getSubtotal()).isEqualByComparingTo("490.0000");
        assertThat(invoice.getTaxAmount()).isEqualByComparingTo("49.0000");
        assertThat(invoice.getDiscountAmount()).isEqualByComparingTo("20.0000");
        assertThat(invoice.getTotalAmount()).isEqualByComparingTo("519.5000");
        assertThat(invoice.getStatus()).isEqualTo(PurchaseInvoiceStatus.DRAFT);
    }

    @Test
    @DisplayName("Transitions invoice lifecycle from DRAFT to POSTED and CANCELLED")
    void testInvoiceLifecycle() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID supplierId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        PurchaseInvoice invoice = new PurchaseInvoice(
            businessId,
            storeId,
            supplierId,
            null,
            null,
            "INV-2026-9999",
            LocalDate.now(),
            null,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            null
        );

        PurchaseInvoiceLine line = new PurchaseInvoiceLine(
            businessId,
            invoice.getId(),
            null,
            productId,
            1,
            new BigDecimal("1.000"),
            new BigDecimal("100.0000"),
            BigDecimal.ZERO,
            BigDecimal.ZERO
        );
        invoice.addLine(line);

        invoice.post(userId);
        assertThat(invoice.getStatus()).isEqualTo(PurchaseInvoiceStatus.POSTED);
        assertThat(invoice.getPostedBy()).isEqualTo(userId);
        assertThat(invoice.getPostedAt()).isNotNull();

        invoice.cancel();
        assertThat(invoice.getStatus()).isEqualTo(PurchaseInvoiceStatus.CANCELLED);

        assertThatThrownBy(invoice::cancel)
            .isInstanceOf(IllegalStateException.class);
    }
}
