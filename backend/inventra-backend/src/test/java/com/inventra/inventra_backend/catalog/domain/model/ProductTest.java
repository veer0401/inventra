package com.inventra.inventra_backend.catalog.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductTest {

    @Test
    @DisplayName("Should create valid product with packaging units and tax metadata")
    void testCreateValidProduct() {
        UUID businessId = UUID.randomUUID();
        Product product = new Product(
            businessId,
            null,
            null,
            "Dolo 650",
            "Paracetamol (650mg)",
            "Dolo",
            "Micro Labs",
            DosageForm.TABLET,
            "650mg",
            "TABLET",
            "STRIP",
            10,
            "30049060",
            new BigDecimal("12.00"),
            true,
            false
        );

        assertThat(product.getId()).isNotNull();
        assertThat(product.getBusinessId()).isEqualTo(businessId);
        assertThat(product.getName()).isEqualTo("Dolo 650");
        assertThat(product.getBaseUnit()).isEqualTo("TABLET");
        assertThat(product.getSellingUnit()).isEqualTo("STRIP");
        assertThat(product.getUnitsPerSellingUnit()).isEqualTo(10);
        assertThat(product.getTaxRate()).isEqualByComparingTo("12.00");
        assertThat(product.getStatus()).isEqualTo(ProductStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should reject product with unitsPerSellingUnit < 1")
    void testInvalidPackagingConversion() {
        UUID businessId = UUID.randomUUID();
        assertThatThrownBy(() -> new Product(
            businessId,
            null,
            null,
            "Dolo 650",
            null,
            null,
            null,
            DosageForm.TABLET,
            null,
            "TABLET",
            "STRIP",
            0,
            null,
            BigDecimal.ZERO,
            true,
            false
        )).isInstanceOf(BusinessRuleViolationException.class)
          .hasMessageContaining("unitsPerSellingUnit");
    }

    @Test
    @DisplayName("Should reject product with negative tax rate")
    void testNegativeTaxRate() {
        UUID businessId = UUID.randomUUID();
        assertThatThrownBy(() -> new Product(
            businessId,
            null,
            null,
            "Dolo 650",
            null,
            null,
            null,
            DosageForm.TABLET,
            null,
            "TABLET",
            "STRIP",
            10,
            null,
            new BigDecimal("-5.00"),
            true,
            false
        )).isInstanceOf(BusinessRuleViolationException.class)
          .hasMessageContaining("taxRate");
    }

    @Test
    @DisplayName("Should reject blank product name")
    void testBlankProductName() {
        UUID businessId = UUID.randomUUID();
        assertThatThrownBy(() -> new Product(
            businessId,
            null,
            null,
            "   ",
            null,
            null,
            null,
            DosageForm.TABLET,
            null,
            "TABLET",
            "STRIP",
            10,
            null,
            BigDecimal.ZERO,
            true,
            false
        )).isInstanceOf(BusinessRuleViolationException.class)
          .hasMessageContaining("name");
    }
}
