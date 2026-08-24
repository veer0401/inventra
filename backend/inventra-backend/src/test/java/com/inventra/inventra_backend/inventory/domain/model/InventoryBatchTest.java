package com.inventra.inventra_backend.inventory.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InventoryBatchTest {

    @Test
    @DisplayName("Should create batch and enforce selling price <= MRP")
    void testCreateBatch() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        InventoryBatch batch = new InventoryBatch(
            businessId,
            storeId,
            productId,
            itemId,
            "b-100",
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2027, 1, 1),
            new BigDecimal("50.000"),
            new BigDecimal("6.50"),
            new BigDecimal("10.00"),
            new BigDecimal("9.50")
        );

        assertThat(batch.getBatchNumber()).isEqualTo("B-100");
        assertThat(batch.getQuantity()).isEqualByComparingTo("50.000");
        assertThat(batch.getStatus()).isEqualTo(BatchStatus.ACTIVE);

        // Deplete batch
        batch.adjustQuantity(new BigDecimal("-50.000"));
        assertThat(batch.getQuantity()).isEqualByComparingTo("0.000");
        assertThat(batch.getStatus()).isEqualTo(BatchStatus.DEPLETED);

        // Re-stock batch
        batch.adjustQuantity(new BigDecimal("20.000"));
        assertThat(batch.getQuantity()).isEqualByComparingTo("20.000");
        assertThat(batch.getStatus()).isEqualTo(BatchStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should reject selling price exceeding MRP")
    void testSellingPriceExceedsMrp() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        assertThatThrownBy(() -> new InventoryBatch(
            businessId,
            storeId,
            productId,
            itemId,
            "B-101",
            null,
            LocalDate.of(2027, 1, 1),
            new BigDecimal("10.000"),
            new BigDecimal("5.00"),
            new BigDecimal("10.00"),
            new BigDecimal("12.00") // Exceeds MRP 10.00
        )).isInstanceOf(BusinessRuleViolationException.class)
          .hasMessageContaining("Selling price");
    }
}
