package com.inventra.inventra_backend.transfer.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TransferLineBatchAllocationTest {

    @Test
    @DisplayName("Batch allocation preserves complete metadata and enforces receipt bounds")
    void testBatchAllocationSnapshotAndReceipt() {
        UUID bizId = UUID.randomUUID();
        UUID srcStore = UUID.randomUUID();
        UUID dstStore = UUID.randomUUID();
        UUID transferId = UUID.randomUUID();
        UUID lineId = UUID.randomUUID();
        UUID srcBatchId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        LocalDate mfgDate = LocalDate.now().minusMonths(2);
        LocalDate expDate = LocalDate.now().plusMonths(18);

        TransferLineBatchAllocation alloc = new TransferLineBatchAllocation(
            bizId,
            srcStore,
            dstStore,
            transferId,
            lineId,
            srcBatchId,
            productId,
            "BATCH-AUG-99",
            mfgDate,
            expDate,
            new BigDecimal("50.000"),
            new BigDecimal("15.5000"),
            new BigDecimal("30.0000"),
            new BigDecimal("28.0000")
        );

        assertThat(alloc.getBatchNumber()).isEqualTo("BATCH-AUG-99");
        assertThat(alloc.getManufacturingDate()).isEqualTo(mfgDate);
        assertThat(alloc.getExpiryDate()).isEqualTo(expDate);
        assertThat(alloc.getUnitCost()).isEqualByComparingTo("15.5000");
        assertThat(alloc.getMrp()).isEqualByComparingTo("30.0000");
        assertThat(alloc.getSellingPrice()).isEqualByComparingTo("28.0000");
        assertThat(alloc.getShippedBaseQuantity()).isEqualByComparingTo("50.000");

        // Partial receipt of 30 units
        UUID dstBatchId = UUID.randomUUID();
        alloc.recordReceipt(new BigDecimal("30.000"), dstBatchId);
        assertThat(alloc.getReceivedBaseQuantity()).isEqualByComparingTo("30.000");
        assertThat(alloc.getDestinationBatchId()).isEqualTo(dstBatchId);

        // Cannot receive more than remaining 20 units
        assertThatThrownBy(() -> alloc.recordReceipt(new BigDecimal("25.000"), dstBatchId))
            .isInstanceOf(BusinessRuleViolationException.class)
            .hasMessageContaining("cannot exceed shipped quantity");
    }
}
