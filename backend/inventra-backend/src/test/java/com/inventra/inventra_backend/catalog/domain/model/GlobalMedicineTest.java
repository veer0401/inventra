package com.inventra.inventra_backend.catalog.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GlobalMedicineTest {

    @Test
    @DisplayName("Should create valid GlobalMedicine master entity with generic salt and dosage form")
    void testCreateValidGlobalMedicine() {
        GlobalMedicine medicine = new GlobalMedicine(
            "Dolo 650 Tablet",
            "Paracetamol",
            "Dolo",
            "Micro Labs Ltd",
            DosageForm.TABLET,
            "650 mg",
            "Tablet",
            "Strip of 15",
            15,
            "30049060",
            new BigDecimal("12.00"),
            false,
            "Analgesic / Antipyretic",
            "8901148210012",
            "Pain and fever management"
        );

        assertThat(medicine.getId()).isNotNull();
        assertThat(medicine.getName()).isEqualTo("Dolo 650 Tablet");
        assertThat(medicine.getGenericName()).isEqualTo("Paracetamol");
        assertThat(medicine.getDosageForm()).isEqualTo(DosageForm.TABLET);
        assertThat(medicine.getStatus()).isEqualTo(GlobalMedicineStatus.ACTIVE);
        assertThat(medicine.getUnitsPerSellingUnit()).isEqualTo(15);
        assertThat(medicine.getTaxRate()).isEqualByComparingTo("12.00");
    }

    @Test
    @DisplayName("Should throw BusinessRuleViolationException when medicine name or generic salt is blank")
    void testValidationOnBlankFields() {
        assertThatThrownBy(() -> new GlobalMedicine(
            "",
            "Paracetamol",
            null,
            null,
            DosageForm.TABLET,
            null,
            "Tablet",
            "Unit",
            1,
            null,
            BigDecimal.ZERO,
            false,
            null,
            null,
            null
        )).isInstanceOf(BusinessRuleViolationException.class);

        assertThatThrownBy(() -> new GlobalMedicine(
            "Dolo",
            "",
            null,
            null,
            DosageForm.TABLET,
            null,
            "Tablet",
            "Unit",
            1,
            null,
            BigDecimal.ZERO,
            false,
            null,
            null,
            null
        )).isInstanceOf(BusinessRuleViolationException.class);
    }
}
