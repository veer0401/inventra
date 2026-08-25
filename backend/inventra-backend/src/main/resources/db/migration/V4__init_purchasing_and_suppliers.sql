-- =========================================================================
-- V4: Schema for Purchasing and Supplier Management
-- =========================================================================

-- 1. Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    supplier_code VARCHAR(50) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    trade_name VARCHAR(200),
    supplier_type VARCHAR(50) NOT NULL DEFAULT 'DISTRIBUTOR',
    gstin VARCHAR(20),
    drug_license_number VARCHAR(100),
    pan VARCHAR(20),
    email VARCHAR(150),
    phone_number VARCHAR(30),
    contact_person_name VARCHAR(150),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    payment_terms_days INTEGER NOT NULL DEFAULT 0,
    credit_limit NUMERIC(12, 2),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    notes VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Key
    CONSTRAINT uq_suppliers_id_business UNIQUE (id, business_id),
    CONSTRAINT uq_suppliers_business_code UNIQUE (business_id, supplier_code),
    CONSTRAINT chk_supplier_payment_terms CHECK (payment_terms_days >= 0),
    CONSTRAINT chk_supplier_credit_limit CHECK (credit_limit IS NULL OR credit_limit >= 0.00)
);

CREATE INDEX idx_suppliers_business ON suppliers (business_id);
CREATE INDEX idx_suppliers_name ON suppliers (business_id, lower(legal_name));
CREATE INDEX idx_suppliers_status ON suppliers (business_id, status);

-- 2. Supplier Products Table (Supplier Catalogue Mapping)
CREATE TABLE supplier_products (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL,
    product_id UUID NOT NULL,
    supplier_product_code VARCHAR(100),
    supplier_product_name VARCHAR(255),
    purchase_unit VARCHAR(50) NOT NULL,
    conversion_factor INTEGER NOT NULL DEFAULT 1,
    last_purchase_price NUMERIC(12, 2),
    is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
    min_order_quantity NUMERIC(12, 3),
    lead_time_days INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Key
    CONSTRAINT uq_supplier_products_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_supplier_product_supplier FOREIGN KEY (supplier_id, business_id)
        REFERENCES suppliers(id, business_id) ON DELETE CASCADE,
    CONSTRAINT fk_supplier_product_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_supplier_product_pair UNIQUE (supplier_id, product_id),
    CONSTRAINT chk_sp_conversion_factor CHECK (conversion_factor >= 1),
    CONSTRAINT chk_sp_lead_time CHECK (lead_time_days IS NULL OR lead_time_days >= 0)
);

CREATE INDEX idx_sp_supplier ON supplier_products (supplier_id);
CREATE INDEX idx_sp_product ON supplier_products (product_id);

-- 3. Purchase Orders Table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    supplier_id UUID NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    subtotal NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    discount_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    total_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    notes VARCHAR(1000),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    cancellation_reason VARCHAR(500),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Keys
    CONSTRAINT uq_purchase_orders_id_business UNIQUE (id, business_id),
    CONSTRAINT uq_purchase_orders_id_store_business UNIQUE (id, store_id, business_id),
    CONSTRAINT fk_po_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id, business_id)
        REFERENCES suppliers(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_purchase_orders_business_number UNIQUE (business_id, order_number),
    CONSTRAINT chk_po_amounts CHECK (subtotal >= 0.0000 AND tax_amount >= 0.0000 AND discount_amount >= 0.0000 AND total_amount >= 0.0000)
);

CREATE INDEX idx_po_store ON purchase_orders (store_id);
CREATE INDEX idx_po_supplier ON purchase_orders (supplier_id);
CREATE INDEX idx_po_business_status ON purchase_orders (business_id, status);

-- 4. Purchase Order Lines Table
CREATE TABLE purchase_order_lines (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    supplier_product_id UUID,
    line_number INTEGER NOT NULL,
    purchase_unit VARCHAR(50) NOT NULL,
    conversion_factor INTEGER NOT NULL DEFAULT 1,
    ordered_quantity NUMERIC(12, 3) NOT NULL,
    ordered_base_quantity NUMERIC(12, 3) NOT NULL,
    received_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    received_base_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    unit_cost NUMERIC(14, 4) NOT NULL,
    base_unit_cost NUMERIC(14, 4) NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    line_total NUMERIC(14, 4) NOT NULL,
    CONSTRAINT uq_purchase_order_lines_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_po_line_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_po_line_sp FOREIGN KEY (supplier_product_id, business_id)
        REFERENCES supplier_products(id, business_id) ON DELETE SET NULL,
    CONSTRAINT uq_po_line_number UNIQUE (purchase_order_id, line_number),
    CONSTRAINT chk_po_line_quantities CHECK (ordered_quantity > 0.000 AND conversion_factor >= 1 AND received_quantity >= 0.000 AND received_quantity <= ordered_quantity),
    CONSTRAINT chk_po_line_costs CHECK (unit_cost >= 0.0000 AND line_total >= 0.0000)
);

CREATE INDEX idx_po_lines_po ON purchase_order_lines (purchase_order_id);
CREATE INDEX idx_po_lines_product ON purchase_order_lines (product_id);

-- 5. Goods Receipts Table (Physical Intake)
CREATE TABLE goods_receipts (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    supplier_id UUID NOT NULL,
    purchase_order_id UUID,
    receipt_number VARCHAR(50) NOT NULL,
    vendor_delivery_note VARCHAR(100),
    received_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    total_items INTEGER NOT NULL DEFAULT 0,
    total_received_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    total_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    notes VARCHAR(1000),
    idempotency_key VARCHAR(100),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Keys
    CONSTRAINT uq_goods_receipts_id_business UNIQUE (id, business_id),
    CONSTRAINT uq_goods_receipts_id_store_business UNIQUE (id, store_id, business_id),
    CONSTRAINT fk_gr_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_gr_supplier FOREIGN KEY (supplier_id, business_id)
        REFERENCES suppliers(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_gr_po FOREIGN KEY (purchase_order_id, store_id, business_id)
        REFERENCES purchase_orders(id, store_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_goods_receipts_business_number UNIQUE (business_id, receipt_number)
);

CREATE INDEX idx_gr_store ON goods_receipts (store_id);
CREATE INDEX idx_gr_supplier ON goods_receipts (supplier_id);
CREATE INDEX idx_gr_po ON goods_receipts (purchase_order_id);
CREATE INDEX idx_gr_business_status ON goods_receipts (business_id, status);
CREATE UNIQUE INDEX uq_goods_receipts_idempotency ON goods_receipts (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 6. Goods Receipt Lines Table
CREATE TABLE goods_receipt_lines (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
    purchase_order_line_id UUID REFERENCES purchase_order_lines(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL,
    line_number INTEGER NOT NULL,
    received_quantity NUMERIC(12, 3) NOT NULL,
    purchase_unit VARCHAR(50) NOT NULL,
    conversion_factor INTEGER NOT NULL DEFAULT 1,
    received_base_quantity NUMERIC(12, 3) NOT NULL,
    rejected_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    batch_number VARCHAR(100),
    manufacturing_date DATE,
    expiry_date DATE,
    unit_cost NUMERIC(14, 4) NOT NULL,
    base_unit_cost NUMERIC(14, 4) NOT NULL,
    mrp NUMERIC(12, 2),
    selling_price NUMERIC(12, 2),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    line_total NUMERIC(14, 4) NOT NULL,
    inventory_batch_id UUID,
    CONSTRAINT uq_goods_receipt_lines_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_gr_line_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_gr_line_number UNIQUE (goods_receipt_id, line_number),
    CONSTRAINT chk_gr_line_quantities CHECK (received_quantity > 0.000 AND conversion_factor >= 1 AND rejected_quantity >= 0.000),
    CONSTRAINT chk_gr_line_pricing CHECK (unit_cost >= 0.0000 AND line_total >= 0.0000),
    CONSTRAINT chk_gr_line_selling_price_mrp CHECK (selling_price IS NULL OR mrp IS NULL OR selling_price <= mrp)
);

CREATE INDEX idx_gr_lines_gr ON goods_receipt_lines (goods_receipt_id);
CREATE INDEX idx_gr_lines_product ON goods_receipt_lines (product_id);
CREATE INDEX idx_gr_lines_pol ON goods_receipt_lines (purchase_order_line_id);

-- 7. Purchase Invoices Table
CREATE TABLE purchase_invoices (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    supplier_id UUID NOT NULL,
    purchase_order_id UUID,
    goods_receipt_id UUID,
    supplier_invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    subtotal NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    discount_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    round_off_amount NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    notes VARCHAR(1000),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Keys
    CONSTRAINT uq_purchase_invoices_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_pi_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_pi_supplier FOREIGN KEY (supplier_id, business_id)
        REFERENCES suppliers(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_pi_po FOREIGN KEY (purchase_order_id, store_id, business_id)
        REFERENCES purchase_orders(id, store_id, business_id) ON DELETE SET NULL,
    CONSTRAINT fk_pi_gr FOREIGN KEY (goods_receipt_id, store_id, business_id)
        REFERENCES goods_receipts(id, store_id, business_id) ON DELETE SET NULL,
    CONSTRAINT uq_purchase_invoices_vendor_number UNIQUE (business_id, supplier_id, supplier_invoice_number),
    CONSTRAINT chk_pi_amounts CHECK (subtotal >= 0.0000 AND tax_amount >= 0.0000 AND total_amount >= 0.0000)
);

CREATE INDEX idx_pi_store ON purchase_invoices (store_id);
CREATE INDEX idx_pi_supplier ON purchase_invoices (supplier_id);
CREATE INDEX idx_pi_business_status ON purchase_invoices (business_id, status);

-- 8. Purchase Invoice Lines Table
CREATE TABLE purchase_invoice_lines (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    goods_receipt_line_id UUID REFERENCES goods_receipt_lines(id) ON DELETE SET NULL,
    product_id UUID NOT NULL,
    line_number INTEGER NOT NULL,
    invoiced_quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(14, 4) NOT NULL,
    discount_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    line_total NUMERIC(14, 4) NOT NULL,
    CONSTRAINT uq_purchase_invoice_lines_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_pi_line_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_pi_line_number UNIQUE (purchase_invoice_id, line_number),
    CONSTRAINT chk_pi_line_quantities CHECK (invoiced_quantity > 0.000 AND unit_cost >= 0.0000 AND line_total >= 0.0000)
);

CREATE INDEX idx_pi_lines_pi ON purchase_invoice_lines (purchase_invoice_id);
CREATE INDEX idx_pi_lines_product ON purchase_invoice_lines (product_id);
