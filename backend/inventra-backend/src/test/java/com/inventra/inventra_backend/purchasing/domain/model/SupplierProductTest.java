package com.inventra.inventra_backend.purchasing.domain.model;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SupplierProductTest {

    @Test
    @DisplayName("Creates supplier product mapping with conversion factor and reference price")
    void testCreateSupplierProduct() {
        UUID businessId = UUID.randomUUID();
        UUID supplierId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        SupplierProduct sp = new SupplierProduct(
            businessId,
            supplierId,
            productId,
            "SKU-VEND-100",
            "Paracetamol 500mg (Box of 10 Strips)",
            "BOX",
            10,
            new BigDecimal("150.00"),
            true,
            new BigDecimal("5.000"),
            3
        );

        assertThat(sp.getId()).isNotNull();
        assertThat(sp.getBusinessId()).isEqualTo(businessId);
        assertThat(sp.getSupplierId()).isEqualTo(supplierId);
        assertThat(sp.getProductId()).isEqualTo(productId);
        assertThat(sp.getSupplierProductCode()).isEqualTo("SKU-VEND-100");
        assertThat(sp.getPurchaseUnit()).isEqualTo("BOX");
        assertThat(sp.getConversionFactor()).isEqualTo(10);
        assertThat(sp.getLastPurchasePrice()).isEqualTo(new BigDecimal("150.00"));
        assertThat(sp.isPreferred()).isTrue();
        assertThat(sp.getLeadTimeDays()).isEqualTo(3);
        assertThat(sp.getStatus()).isEqualTo(SupplierProductStatus.ACTIVE);
    }

    @Test
    @DisplayName("Rejects conversion factor less than 1")
    void testInvalidConversionFactor() {
        UUID businessId = UUID.randomUUID();
        UUID supplierId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        SupplierProduct sp = new SupplierProduct(
            businessId,
            supplierId,
            productId,
            null,
            null,
            "STRIP",
            1,
            null,
            false,
            null,
            null
        );

        assertThatThrownBy(() -> sp.setConversionFactor(0))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
