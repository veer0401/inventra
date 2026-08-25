package com.inventra.inventra_backend.inventory.infrastructure;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    @Test
    @Transactional
    @DisplayName("PostgreSQL composite FK rejects cross-tenant supplier in purchase order")
    void testCrossTenantPurchaseOrderSupplierRejection() {
        UUID bizA = UUID.randomUUID();
        UUID bizB = UUID.randomUUID();
        UUID storeB = UUID.randomUUID();
        UUID supplierA = UUID.randomUUID();
        UUID poId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", bizA, "Biz E-A", "BEA-DB");
        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", bizB, "Biz E-B", "BEB-DB");
        jdbcTemplate.update("INSERT INTO stores (id, business_id, store_code, store_name, is_headquarters, status) VALUES (?, ?, ?, ?, false, 'ACTIVE')", storeB, bizB, "SEB-DB", "Store EB");
        jdbcTemplate.update("INSERT INTO suppliers (id, business_id, supplier_code, legal_name, supplier_type, status) VALUES (?, ?, ?, ?, 'DISTRIBUTOR', 'ACTIVE')", supplierA, bizA, "SUP-A", "Supplier A");

        assertThatThrownBy(() -> jdbcTemplate.update(
            "INSERT INTO purchase_orders (id, business_id, store_id, supplier_id, order_number, order_date, status, version) VALUES (?, ?, ?, ?, 'PO-ERR-1', CURRENT_DATE, 'DRAFT', 0)",
            poId,
            bizB,
            storeB,
            supplierA
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("PostgreSQL composite FK rejects cross-tenant product in purchase order line")
    void testCrossTenantPurchaseOrderLineProductRejection() {
        UUID bizA = UUID.randomUUID();
        UUID bizB = UUID.randomUUID();
        UUID storeB = UUID.randomUUID();
        UUID supplierB = UUID.randomUUID();
        UUID productA = UUID.randomUUID();
        UUID poId = UUID.randomUUID();
        UUID poLineId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", bizA, "Biz F-A", "BFA-DB");
        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", bizB, "Biz F-B", "BFB-DB");
        jdbcTemplate.update("INSERT INTO stores (id, business_id, store_code, store_name, is_headquarters, status) VALUES (?, ?, ?, ?, false, 'ACTIVE')", storeB, bizB, "SFB-DB", "Store FB");
        jdbcTemplate.update("INSERT INTO suppliers (id, business_id, supplier_code, legal_name, supplier_type, status) VALUES (?, ?, ?, ?, 'DISTRIBUTOR', 'ACTIVE')", supplierB, bizB, "SUP-B", "Supplier B");
        jdbcTemplate.update("INSERT INTO products (id, business_id, name, dosage_form, base_unit, selling_unit, units_per_selling_unit, tax_rate, status) VALUES (?, ?, ?, 'TABLET', 'TABLET', 'STRIP', 10, 0, 'ACTIVE')", productA, bizA, "Prod FA");

        jdbcTemplate.update(
            "INSERT INTO purchase_orders (id, business_id, store_id, supplier_id, order_number, order_date, status, version) VALUES (?, ?, ?, ?, 'PO-FB-01', CURRENT_DATE, 'DRAFT', 0)",
            poId,
            bizB,
            storeB,
            supplierB
        );

        assertThatThrownBy(() -> jdbcTemplate.update(
            "INSERT INTO purchase_order_lines (id, business_id, purchase_order_id, product_id, line_number, purchase_unit, conversion_factor, ordered_quantity, ordered_base_quantity, unit_cost, base_unit_cost, line_total) VALUES (?, ?, ?, ?, 1, 'BOX', 1, 10, 10, 100, 100, 1000)",
            poLineId,
            bizB,
            poId,
            productA
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("PostgreSQL composite FK rejects cross-tenant store in sales")
    void testCrossTenantSaleRejection() {
        UUID bizA = UUID.randomUUID();
        UUID bizB = UUID.randomUUID();
        UUID storeA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        UUID saleId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", bizA, "Biz S-A", "BSA-DB");
        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", bizB, "Biz S-B", "BSB-DB");
        jdbcTemplate.update("INSERT INTO stores (id, business_id, store_code, store_name, is_headquarters, status) VALUES (?, ?, ?, ?, false, 'ACTIVE')", storeA, bizA, "SSA-DB", "Store SA");
        jdbcTemplate.update("INSERT INTO users (id, email, password_hash, full_name, status) VALUES (?, ?, 'hash', 'Cashier B', 'ACTIVE')", userB, "cashier." + userB + "@bizb.local");

        // Attempt to insert sale under bizB with storeA (which belongs to bizA) -> rejected by fk_sales_store
        assertThatThrownBy(() -> jdbcTemplate.update(
            "INSERT INTO sales (id, business_id, store_id, sale_number, invoice_number, status, sale_date, cashier_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, version) VALUES (?, ?, ?, 'SALE-01', 'INV-01', 'COMPLETED', CURRENT_DATE, ?, 100, 0, 0, 100, 100, 0)",
            saleId,
            bizB,
            storeA,
            userB
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("PostgreSQL composite FK rejects cross-tenant product in sale lines")
    void testCrossTenantSaleLineProductRejection() {
        UUID bizA = UUID.randomUUID();
        UUID bizB = UUID.randomUUID();
        UUID storeB = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        UUID productA = UUID.randomUUID();
        UUID saleId = UUID.randomUUID();
        UUID saleLineId = UUID.randomUUID();

        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", bizA, "Biz SL-A", "BSLA-DB");
        jdbcTemplate.update("INSERT INTO businesses (id, legal_name, trade_name, status) VALUES (?, ?, ?, 'ACTIVE')", bizB, "Biz SL-B", "BSLB-DB");
        jdbcTemplate.update("INSERT INTO stores (id, business_id, store_code, store_name, is_headquarters, status) VALUES (?, ?, ?, ?, false, 'ACTIVE')", storeB, bizB, "SSLB-DB", "Store SLB");
        jdbcTemplate.update("INSERT INTO users (id, email, password_hash, full_name, status) VALUES (?, ?, 'hash', 'Cashier SLB', 'ACTIVE')", userB, "cashier." + userB + "@bizb.local");
        jdbcTemplate.update("INSERT INTO products (id, business_id, name, dosage_form, base_unit, selling_unit, units_per_selling_unit, tax_rate, status) VALUES (?, ?, ?, 'TABLET', 'TABLET', 'STRIP', 10, 0, 'ACTIVE')", productA, bizA, "Prod SLA");

        // Insert valid sale under bizB with storeB
        jdbcTemplate.update(
            "INSERT INTO sales (id, business_id, store_id, sale_number, invoice_number, status, sale_date, cashier_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, version) VALUES (?, ?, ?, 'SALE-01', 'INV-01', 'COMPLETED', CURRENT_DATE, ?, 100, 0, 0, 100, 100, 0)",
            saleId,
            bizB,
            storeB,
            userB
        );

        // Attempt to insert sale_line under bizB referencing productA (which belongs to bizA) -> rejected by fk_sale_lines_product
        assertThatThrownBy(() -> jdbcTemplate.update(
            "INSERT INTO sale_lines (id, business_id, sale_id, product_id, line_number, product_name, selling_unit, conversion_factor, quantity, base_quantity, unit_price, gross_amount, line_total) VALUES (?, ?, ?, ?, 1, 'Prod SLA', 'STRIP', 10, 1, 10, 100, 100, 100)",
            saleLineId,
            bizB,
            saleId,
            productA
        )).isInstanceOf(DataIntegrityViolationException.class);
    }
}
