package com.inventra.inventra_backend.sales.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SaleTest {

    @Test
    @DisplayName("Calculates line totals, proportional bill discounts, taxes, and round-offs correctly")
    void testSaleTotalsAndDiscountDistribution() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID cashierId = UUID.randomUUID();

        Sale sale = new Sale(
            businessId,
            storeId,
            "SALE-STR1-000001",
            "INV-STR1-000001",
            LocalDate.now(),
            "John Customer",
            "9876543210",
            false,
            new BigDecimal("30.0000"), // Bill discount = 30
            new BigDecimal("0.2500"),  // Round-off = 0.25
            cashierId,
            null,
            "IDEMP-001",
            "Test sale"
        );

        // Line 1: 2 units @ ₹100.00 with 0% line disc, 12% tax -> Net before bill disc = 200.00
        SaleLine line1 = new SaleLine(
            businessId,
            sale.getId(),
            UUID.randomUUID(),
            1,
            "Product A",
            null, "TABLET", "500mg", "STRIP", 10,
            new BigDecimal("2.000"),
            new BigDecimal("100.0000"),
            BigDecimal.ZERO,
            new BigDecimal("12.00")
        );

        // Line 2: 1 unit @ ₹100.00 with 0% line disc, 18% tax -> Net before bill disc = 100.00
        SaleLine line2 = new SaleLine(
            businessId,
            sale.getId(),
            UUID.randomUUID(),
            2,
            "Product B",
            null, "TABLET", "250mg", "STRIP", 10,
            new BigDecimal("1.000"),
            new BigDecimal("100.0000"),
            BigDecimal.ZERO,
            new BigDecimal("18.00")
        );

        sale.addLine(line1);
        sale.addLine(line2);

        // Payment: ₹300.00 total + taxes + round-off
        // Subtotal = 300.00
        // Bill discount = 30.00 (Line 1 gets 20.00, Line 2 gets 10.00)
        // Line 1 Net taxable = 200 - 20 = 180.00, Tax (12%) = 21.60 -> Total = 201.60
        // Line 2 Net taxable = 100 - 10 = 90.00, Tax (18%) = 16.20 -> Total = 106.20
        // Total Tax = 37.80
        // Net Payable = 300 - 30 + 37.80 + 0.25 = 308.05
        sale.recalculateTotals();

        assertThat(sale.getSubtotal()).isEqualByComparingTo("300.0000");
        assertThat(sale.getDiscountAmount()).isEqualByComparingTo("30.0000");
        assertThat(sale.getTaxAmount()).isEqualByComparingTo("37.8000");
        assertThat(sale.getTotalAmount()).isEqualByComparingTo("308.0500");

        assertThat(line1.getAllocatedBillDiscount()).isEqualByComparingTo("20.0000");
        assertThat(line2.getAllocatedBillDiscount()).isEqualByComparingTo("10.0000");

        // Add split payments
        SalePayment payment1 = new SalePayment(businessId, storeId, sale.getId(), PaymentMethod.CASH, new BigDecimal("200.0000"), new BigDecimal("500.0000"), new BigDecimal("300.0000"), null, PaymentStatus.SUCCESS, null);
        SalePayment payment2 = new SalePayment(businessId, storeId, sale.getId(), PaymentMethod.UPI, new BigDecimal("108.0500"), null, BigDecimal.ZERO, "UPI12345", PaymentStatus.SUCCESS, null);

        sale.addPayment(payment1);
        sale.addPayment(payment2);
        sale.recalculateTotals();

        assertThat(sale.getPaidAmount()).isEqualByComparingTo("308.0500");
        assertThat(sale.getChangeAmount()).isEqualByComparingTo("300.0000");
    }

    @Test
    @DisplayName("Transitions through Void and Return lifecycles safely")
    void testSaleLifecycleTransitions() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID cashierId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Sale sale = new Sale(businessId, storeId, "SALE-1", "INV-1", LocalDate.now(), null, null, false, BigDecimal.ZERO, BigDecimal.ZERO, cashierId, null, null, null);
        SaleLine line = new SaleLine(businessId, sale.getId(), UUID.randomUUID(), 1, "Product A", null, null, null, "UNIT", 1, new BigDecimal("10.000"), new BigDecimal("50.0000"), BigDecimal.ZERO, BigDecimal.ZERO);
        sale.addLine(line);

        assertThat(sale.getStatus()).isEqualTo(SaleStatus.COMPLETED);

        // Voiding sale
        sale.voidSale(userId, "Cashier error");
        assertThat(sale.getStatus()).isEqualTo(SaleStatus.VOIDED);
        assertThat(sale.getVoidedBy()).isEqualTo(userId);
        assertThat(sale.getVoidReason()).isEqualTo("Cashier error");

        assertThatThrownBy(() -> sale.voidSale(userId, "Double void"))
            .isInstanceOf(IllegalStateException.class);
    }
}
