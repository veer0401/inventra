package com.inventra.inventra_backend.purchasing.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PurchaseOrderTest {

    @Test
    @DisplayName("Calculates line totals, discounts, taxes and order total")
    void testPurchaseOrderTotalCalculations() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID supplierId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        PurchaseOrder po = new PurchaseOrder(
            businessId,
            storeId,
            supplierId,
            "PO-MAIN-00001",
            LocalDate.now(),
            LocalDate.now().plusDays(7),
            new BigDecimal("50.0000"), // order-level discount
            "Urgent restocking"
        );

        // Line 1: 10 boxes @ 100.00 each, 10% line discount, 12% tax
        // Gross: 1000.00, Net: 900.00, Tax: 108.00, Line Total: 1008.00
        PurchaseOrderLine line1 = new PurchaseOrderLine(
            businessId,
            po.getId(),
            productId,
            null,
            1,
            "BOX",
            10,
            new BigDecimal("10.000"),
            new BigDecimal("100.0000"),
            new BigDecimal("10.00"),
            new BigDecimal("12.00")
        );

        po.addLine(line1);

        assertThat(line1.getOrderedBaseQuantity()).isEqualByComparingTo("100.000");
        assertThat(line1.getBaseUnitCost()).isEqualByComparingTo("10.0000");
        assertThat(line1.getTaxAmount()).isEqualByComparingTo("108.0000");
        assertThat(line1.getLineTotal()).isEqualByComparingTo("1008.0000");

        // Subtotal: 900.0000, Tax: 108.0000, Discount: 50.0000, Total: 958.0000
        assertThat(po.getSubtotal()).isEqualByComparingTo("900.0000");
        assertThat(po.getTaxAmount()).isEqualByComparingTo("108.0000");
        assertThat(po.getDiscountAmount()).isEqualByComparingTo("50.0000");
        assertThat(po.getTotalAmount()).isEqualByComparingTo("958.0000");
    }

    @Test
    @DisplayName("Enforces valid purchase order state machine transitions")
    void testStateTransitions() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID supplierId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        PurchaseOrder po = new PurchaseOrder(
            businessId,
            storeId,
            supplierId,
            "PO-MAIN-00002",
            LocalDate.now(),
            null,
            BigDecimal.ZERO,
            null
        );

        PurchaseOrderLine line = new PurchaseOrderLine(
            businessId,
            po.getId(),
            productId,
            null,
            1,
            "STRIP",
            1,
            new BigDecimal("100.000"),
            new BigDecimal("5.0000"),
            BigDecimal.ZERO,
            BigDecimal.ZERO
        );
        po.addLine(line);

        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.DRAFT);

        // DRAFT -> CONFIRMED
        po.confirm(userId);
        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.CONFIRMED);
        assertThat(po.getConfirmedBy()).isEqualTo(userId);
        assertThat(po.getConfirmedAt()).isNotNull();

        // Adding lines after confirmation fails
        assertThatThrownBy(() -> po.addLine(line))
            .isInstanceOf(IllegalStateException.class);

        // Record partial receipt: 40 units
        line.recordReceipt(new BigDecimal("40.000"));
        po.updateReceivingStatus();
        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.PARTIALLY_RECEIVED);

        // Cancelling order with received items fails
        assertThatThrownBy(() -> po.cancel(userId, "Supplier ran out"))
            .isInstanceOf(IllegalStateException.class);

        // Record remaining receipt: 60 units
        line.recordReceipt(new BigDecimal("60.000"));
        po.updateReceivingStatus();
        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.FULLY_RECEIVED);

        // Over-receipt beyond ordered quantity fails
        assertThatThrownBy(() -> line.recordReceipt(new BigDecimal("5.000")))
            .isInstanceOf(IllegalArgumentException.class);

        // FULLY_RECEIVED -> CLOSED
        po.close();
        assertThat(po.getStatus()).isEqualTo(PurchaseOrderStatus.CLOSED);
    }
}
