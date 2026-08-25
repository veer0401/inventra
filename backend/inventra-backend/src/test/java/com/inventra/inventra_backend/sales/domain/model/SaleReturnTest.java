package com.inventra.inventra_backend.sales.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SaleReturnTest {

    @Test
    @DisplayName("Calculates sale return lines and refund totals correctly")
    void testSaleReturnCalculations() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID saleId = UUID.randomUUID();
        UUID returnedBy = UUID.randomUUID();

        SaleReturn saleReturn = new SaleReturn(
            businessId,
            storeId,
            saleId,
            "RET-STR1-000001",
            LocalDate.now(),
            "Wrong medicine purchased",
            returnedBy,
            null,
            "IDEMP-RET-01"
        );

        SaleReturnLine returnLine = new SaleReturnLine(
            businessId,
            saleReturn.getId(),
            UUID.randomUUID(),
            UUID.randomUUID(),
            1,
            new BigDecimal("2.000"),
            new BigDecimal("20.000"),
            new BigDecimal("100.0000"),
            new BigDecimal("12.00")
        );

        saleReturn.addLine(returnLine);

        // Subtotal = 2 * 100 = 200.00
        // Tax (12%) = 24.00
        // Total refund = 224.00
        saleReturn.recalculateTotals();

        assertThat(saleReturn.getSubtotal()).isEqualByComparingTo("200.0000");
        assertThat(saleReturn.getTaxAmount()).isEqualByComparingTo("24.0000");
        assertThat(saleReturn.getTotalRefundAmount()).isEqualByComparingTo("224.0000");

        SaleRefund refund = new SaleRefund(businessId, storeId, saleReturn.getId(), RefundMethod.CASH, new BigDecimal("224.0000"), null, returnedBy, "Cash refund handed to customer");
        saleReturn.addRefund(refund);

        assertThat(saleReturn.getRefunds()).hasSize(1);
        assertThat(saleReturn.getStatus()).isEqualTo(SaleReturnStatus.COMPLETED);
    }
}
