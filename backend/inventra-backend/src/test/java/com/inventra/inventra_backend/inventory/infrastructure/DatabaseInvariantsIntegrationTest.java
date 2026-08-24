package com.inventra.inventra_backend.inventory.infrastructure;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class DatabaseInvariantsIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @Transactional
    @DisplayName("PostgreSQL constraint rejects cross-tenant category parent reference")
    void testCrossTenantCategoryParentRejection() {
        UUID bizA = UUID.randomUUID();
        UUID bizB = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();
        UUID childId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", bizA, "Biz A", "BA-DB");
        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", bizB, "Biz B", "BB-DB");

        // Insert parent in Biz A
        jdbcTemplate.update(
            "INSERT INTO categories (id, business_id, name, code, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
            parentId,
            bizA,
            "Parent A",
            "PARENT_A"
        );

        // Attempt to insert child in Biz B referencing Parent in Biz A
        assertThatThrownBy(() -> jdbcTemplate.update(
            "INSERT INTO categories (id, business_id, parent_id, name, code, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
            childId,
            bizB,
            parentId,
            "Child B",
            "CHILD_B"
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("PostgreSQL check constraint rejects negative inventory item current_stock")
    void testNegativeCurrentStockRejection() {
        UUID biz = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID prodId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", biz, "Biz C", "BC-DB");
        jdbcTemplate.update("INSERT INTO stores (id, business_id, store_code, store_name, is_headquarters, status) VALUES (?, ?, ?, ?, false, 'ACTIVE')", storeId, biz, "SC-DB", "Store C");
        jdbcTemplate.update("INSERT INTO products (id, business_id, name, dosage_form, base_unit, selling_unit, units_per_selling_unit, tax_rate, status) VALUES (?, ?, ?, 'TABLET', 'TABLET', 'STRIP', 10, 0, 'ACTIVE')", prodId, biz, "Prod C");

        assertThatThrownBy(() -> jdbcTemplate.update(
            "INSERT INTO inventory_items (id, business_id, store_id, product_id, current_stock, version) VALUES (?, ?, ?, ?, ?, 0)",
            itemId,
            biz,
            storeId,
            prodId,
            new BigDecimal("-5.000")
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("PostgreSQL check constraint rejects batch selling price exceeding MRP")
    void testSellingPriceExceedsMrpRejection() {
        UUID biz = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID prodId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        UUID batchId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", biz, "Biz D", "BD-DB");
        jdbcTemplate.update("INSERT INTO stores (id, business_id, store_code, store_name, is_headquarters, status) VALUES (?, ?, ?, ?, false, 'ACTIVE')", storeId, biz, "SD-DB", "Store D");
        jdbcTemplate.update("INSERT INTO products (id, business_id, name, dosage_form, base_unit, selling_unit, units_per_selling_unit, tax_rate, status) VALUES (?, ?, ?, 'TABLET', 'TABLET', 'STRIP', 10, 0, 'ACTIVE')", prodId, biz, "Prod D");
        jdbcTemplate.update("INSERT INTO inventory_items (id, business_id, store_id, product_id, current_stock, version) VALUES (?, ?, ?, ?, 0, 0)", itemId, biz, storeId, prodId);

        assertThatThrownBy(() -> jdbcTemplate.update(
            "INSERT INTO inventory_batches (id, business_id, store_id, product_id, inventory_item_id, batch_number, expiry_date, quantity, purchase_price, mrp, selling_price, status, version) VALUES (?, ?, ?, ?, ?, 'B-99', CURRENT_DATE + 100, 10, 5.0, 10.0, 15.0, 'ACTIVE', 0)",
            batchId,
            biz,
            storeId,
            prodId,
            itemId
        )).isInstanceOf(DataIntegrityViolationException.class);
    }
}
