package com.inventra.inventra_backend.inventory.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InventoryItemTest {

    @Test
    @DisplayName("Should adjust stock accurately and prevent negative stock")
    void testStockAdjustments() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        InventoryItem item = new InventoryItem(
            businessId,
            storeId,
            productId,
            new BigDecimal("10.000"),
            new BigDecimal("50.000"),
            new BigDecimal("5.000"),
            new BigDecimal("200.000"),
            "Rack-A",
            false
        );

        assertThat(item.getCurrentStock()).isEqualByComparingTo(BigDecimal.ZERO);

        item.adjustStock(new BigDecimal("100.000"));
        assertThat(item.getCurrentStock()).isEqualByComparingTo("100.000");

        item.adjustStock(new BigDecimal("-30.000"));
        assertThat(item.getCurrentStock()).isEqualByComparingTo("70.000");

        assertThatThrownBy(() -> item.adjustStock(new BigDecimal("-80.000")))
            .isInstanceOf(BusinessRuleViolationException.class)
            .hasMessageContaining("negative stock");
    }
}
