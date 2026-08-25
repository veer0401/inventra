package com.inventra.inventra_backend.purchasing.domain.model;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SupplierTest {

    @Test
    @DisplayName("Creates supplier with normalized uppercase code and default status ACTIVE")
    void testCreateSupplier() {
        UUID businessId = UUID.randomUUID();
        Supplier supplier = new Supplier(
            businessId,
            " sup-001 ",
            "Apex Pharma Distributors Ltd",
            "Apex Pharma",
            SupplierType.DISTRIBUTOR,
            "27AABCA1234A1Z5",
            "DL-12345",
            "AABCA1234A",
            "contact@apexpharma.com",
            "9876543210",
            "Mr. Sharma",
            "123 Wholesale Market",
            null,
            "Mumbai",
            "Maharashtra",
            "400001",
            30,
            new BigDecimal("500000.00"),
            "Primary distributor for antibiotics"
        );

        assertThat(supplier.getId()).isNotNull();
        assertThat(supplier.getBusinessId()).isEqualTo(businessId);
        assertThat(supplier.getSupplierCode()).isEqualTo("SUP-001");
        assertThat(supplier.getLegalName()).isEqualTo("Apex Pharma Distributors Ltd");
        assertThat(supplier.getTradeName()).isEqualTo("Apex Pharma");
        assertThat(supplier.getSupplierType()).isEqualTo(SupplierType.DISTRIBUTOR);
        assertThat(supplier.getGstin()).isEqualTo("27AABCA1234A1Z5");
        assertThat(supplier.getPaymentTermsDays()).isEqualTo(30);
        assertThat(supplier.getCreditLimit()).isEqualTo(new BigDecimal("500000.00"));
        assertThat(supplier.getStatus()).isEqualTo(SupplierStatus.ACTIVE);
        assertThat(supplier.isActive()).isTrue();
    }

    @Test
    @DisplayName("Rejects blank supplier code and legal name")
    void testBlankValidation() {
        UUID businessId = UUID.randomUUID();

        assertThatThrownBy(() -> new Supplier(
            businessId,
            "  ",
            "Apex Pharma",
            null,
            SupplierType.WHOLESALER,
            null, null, null, null, null, null, null, null, null, null, null, 0, null, null
        )).isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> new Supplier(
            businessId,
            "SUP-002",
            "  ",
            null,
            SupplierType.WHOLESALER,
            null, null, null, null, null, null, null, null, null, null, null, 0, null, null
        )).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Updates supplier details and status")
    void testUpdateSupplier() {
        UUID businessId = UUID.randomUUID();
        Supplier supplier = new Supplier(
            businessId,
            "SUP-003",
            "Global Meds",
            null,
            SupplierType.WHOLESALER,
            null, null, null, null, null, null, null, null, null, null, null, 0, null, null
        );

        supplier.update(
            "Global Meds Private Limited",
            "Global Meds",
            SupplierType.MANUFACTURER,
            "27AABCG9999A1Z1",
            "DL-9999",
            "AABCG9999A",
            "info@globalmeds.com",
            "9123456780",
            "Jane Doe",
            "456 Industrial Area",
            "Phase 2",
            "Pune",
            "Maharashtra",
            "411001",
            45,
            new BigDecimal("1000000.00"),
            SupplierStatus.INACTIVE,
            "Account on hold"
        );

        assertThat(supplier.getLegalName()).isEqualTo("Global Meds Private Limited");
        assertThat(supplier.getSupplierType()).isEqualTo(SupplierType.MANUFACTURER);
        assertThat(supplier.getPaymentTermsDays()).isEqualTo(45);
        assertThat(supplier.getStatus()).isEqualTo(SupplierStatus.INACTIVE);
        assertThat(supplier.isActive()).isFalse();
    }
}
