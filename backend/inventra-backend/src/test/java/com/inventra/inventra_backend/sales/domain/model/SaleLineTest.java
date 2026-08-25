package com.inventra.inventra_backend.sales.domain.model;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SaleLineTest {

    @Test
    @DisplayName("Calculates base quantity and line totals correctly with discounts and taxes")
    void testSaleLineCalculations() {
        UUID businessId = UUID.randomUUID();
        UUID saleId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        // 3 strips @ ₹150.00/strip, 10 tablets/strip, 10% line discount, 12% tax
        SaleLine line = new SaleLine(
            businessId,
            saleId,
            productId,
            1,
            "Amoxicillin 500mg",
            "Amoxicillin",
            "CAPSULE",
            "500mg",
            "STRIP",
            10,
            new BigDecimal("3.000"),
            new BigDecimal("150.0000"),
            new BigDecimal("10.00"),
            new BigDecimal("12.00")
        );

        assertThat(line.getBaseQuantity()).isEqualByComparingTo("30.000"); // 3 * 10 = 30
        assertThat(line.getGrossAmount()).isEqualByComparingTo("450.0000"); // 3 * 150 = 450
        assertThat(line.getDiscountAmount()).isEqualByComparingTo("45.0000"); // 10% of 450 = 45
        // Net taxable = 450 - 45 = 405.00
        // Tax (12%) = 48.60
        assertThat(line.getTaxAmount()).isEqualByComparingTo("48.6000");
        assertThat(line.getLineTotal()).isEqualByComparingTo("453.6000"); // 405 + 48.60 = 453.60
    }

    @Test
    @DisplayName("Enforces bounded return quantity constraints")
    void testSaleLineReturnBounds() {
        UUID businessId = UUID.randomUUID();
        UUID saleId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        SaleLine line = new SaleLine(
            businessId,
            saleId,
            productId,
            1,
            "Paracetamol 500mg",
            null, null, null,
            "STRIP",
            1,
            new BigDecimal("5.000"),
            new BigDecimal("20.0000"),
            BigDecimal.ZERO,
            BigDecimal.ZERO
        );

        assertThat(line.getRemainingReturnableQuantity()).isEqualByComparingTo("5.000");

        line.addReturnedQuantity(new BigDecimal("2.000"));
        assertThat(line.getReturnedQuantity()).isEqualByComparingTo("2.000");
        assertThat(line.getRemainingReturnableQuantity()).isEqualByComparingTo("3.000");

        // Attempting to return more than remaining 3.000 should fail
        assertThatThrownBy(() -> line.addReturnedQuantity(new BigDecimal("4.000")))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
