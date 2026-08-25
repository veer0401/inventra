package com.inventra.inventra_backend.transfer.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InventoryTransferLineTest {

    @Test
    @DisplayName("Line calculations, packaging conversion factors, and approval bounds")
    void testLineCalculationsAndInvariants() {
        UUID bizId = UUID.randomUUID();
        UUID transferId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        // 10 strips of 10 tablets -> 100 base units
        InventoryTransferLine line = new InventoryTransferLine(
            bizId,
            transferId,
            productId,
            1,
            "Paracetamol 500mg",
            "STRIP",
            10,
            new BigDecimal("10.000"),
            new BigDecimal("25.0000"),
            "Notes"
        );

        assertThat(line.getRequestedQuantity()).isEqualByComparingTo("10.000");
        assertThat(line.getRequestedBaseQuantity()).isEqualByComparingTo("100.000");
        assertThat(line.getApprovedQuantity()).isEqualByComparingTo("10.000");

        // Cannot approve more than requested
        assertThatThrownBy(() -> line.setApprovedQuantity(new BigDecimal("15.000")))
            .isInstanceOf(BusinessRuleViolationException.class)
            .hasMessageContaining("Approved quantity cannot exceed requested quantity");

        // Approve 8 strips
        line.setApprovedQuantity(new BigDecimal("8.000"));
        assertThat(line.getApprovedQuantity()).isEqualByComparingTo("8.000");
        assertThat(line.getApprovedBaseQuantity()).isEqualByComparingTo("80.000");

        // Shipment must be All-or-Nothing (shipped == approved)
        assertThatThrownBy(() -> line.recordShipment(new BigDecimal("5.000"), new BigDecimal("25.00")))
            .isInstanceOf(BusinessRuleViolationException.class)
            .hasMessageContaining("Shipped quantity must exactly match approved quantity");

        line.recordShipment(new BigDecimal("8.000"), new BigDecimal("25.00"));
        assertThat(line.getShippedQuantity()).isEqualByComparingTo("8.000");
        assertThat(line.getShippedBaseQuantity()).isEqualByComparingTo("80.000");

        // Receive 40 base units (4 strips)
        line.recordReceipt(new BigDecimal("40.000"));
        assertThat(line.getReceivedBaseQuantity()).isEqualByComparingTo("40.000");
        assertThat(line.getReceivedQuantity()).isEqualByComparingTo("4.000");

        // Cannot receive more than shipped (attempting 50 more exceeds 80 total)
        assertThatThrownBy(() -> line.recordReceipt(new BigDecimal("50.000")))
            .isInstanceOf(BusinessRuleViolationException.class)
            .hasMessageContaining("cannot exceed shipped base quantity");
    }
}
