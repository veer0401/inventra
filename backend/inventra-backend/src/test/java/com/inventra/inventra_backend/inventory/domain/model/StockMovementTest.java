package com.inventra.inventra_backend.inventory.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StockMovementTest {

    @Test
    @DisplayName("Should create immutable movement ledger entry")
    void testCreateMovement() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        UUID batchId = UUID.randomUUID();

        StockMovement movement = new StockMovement(
            businessId,
            storeId,
            productId,
            batchId,
            StockMovementType.INITIAL_STOCK,
            new BigDecimal("100.000"),
            new BigDecimal("5.50"),
            new BigDecimal("100.000"),
            "MANUAL_ENTRY",
            null,
            "Initial setup",
            UUID.randomUUID(),
            UUID.randomUUID(),
            Instant.now()
        );

        assertThat(movement.getId()).isNotNull();
        assertThat(movement.getQuantityDelta()).isEqualByComparingTo("100.000");
        assertThat(movement.getBalanceAfter()).isEqualByComparingTo("100.000");
        assertThat(movement.getMovementType()).isEqualTo(StockMovementType.INITIAL_STOCK);
    }

    @Test
    @DisplayName("Should reject movement with zero quantity delta")
    void testZeroQuantityDelta() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        assertThatThrownBy(() -> new StockMovement(
            businessId,
            storeId,
            productId,
            null,
            StockMovementType.ADJUSTMENT_IN,
            BigDecimal.ZERO,
            null,
            BigDecimal.ZERO,
            null,
            null,
            null,
            null,
            null,
            Instant.now()
        )).isInstanceOf(BusinessRuleViolationException.class)
          .hasMessageContaining("delta must not be zero");
    }
}
