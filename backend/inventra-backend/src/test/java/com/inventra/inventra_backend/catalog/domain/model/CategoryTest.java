package com.inventra.inventra_backend.catalog.domain.model;

import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CategoryTest {

    @Test
    @DisplayName("Should create category with normalized uppercase code")
    void testCreateCategory() {
        UUID businessId = UUID.randomUUID();
        Category category = new Category(
            businessId,
            null,
            "Medicines",
            "med",
            "All prescription and OTC medicines"
        );

        assertThat(category.getId()).isNotNull();
        assertThat(category.getBusinessId()).isEqualTo(businessId);
        assertThat(category.getCode()).isEqualTo("MED");
        assertThat(category.getName()).isEqualTo("Medicines");
        assertThat(category.getStatus()).isEqualTo(CategoryStatus.ACTIVE);
    }
}
