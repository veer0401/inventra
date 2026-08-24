package com.inventra.inventra_backend.tenant.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BusinessTest {

    @Test
    @DisplayName("Business creation validates required legal name and assigns UUIDv7")
    void testBusinessCreation() {
        Business business = Business.create("Apex Pharmacy Pvt Ltd", "Apex Meds", "DL-12345", "27AAAAA0000A1Z5");

        assertThat(business.getId()).isNotNull();
        assertThat(business.getId().version()).isEqualTo(7);
        assertThat(business.getLegalName()).isEqualTo("Apex Pharmacy Pvt Ltd");
        assertThat(business.getTradeName()).isEqualTo("Apex Meds");
        assertThat(business.getDrugLicenseNumber()).isEqualTo("DL-12345");
        assertThat(business.getGstin()).isEqualTo("27AAAAA0000A1Z5");
        assertThat(business.getStatus()).isEqualTo(BusinessStatus.ACTIVE);
        assertThat(business.isActive()).isTrue();
    }

    @Test
    @DisplayName("Business creation rejects null or blank legal name")
    void testBlankLegalName() {
        assertThatThrownBy(() -> Business.create(null, "Trade", "DL", "GST"))
            .isInstanceOf(NullPointerException.class);

        assertThatThrownBy(() -> Business.create("   ", "Trade", "DL", "GST"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
