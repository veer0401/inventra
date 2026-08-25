-- =========================================================================
-- V5: Schema for Sales, POS Billing, Payments and Returns
-- =========================================================================

-- 1. Sales Table (Commercial & Fiscal Transaction Aggregate Root)
CREATE TABLE sales (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    sale_number VARCHAR(60) NOT NULL,
    invoice_number VARCHAR(60) NOT NULL,
    status VARCHAR(30) NOT NULL,
    sale_date DATE NOT NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(30),
    prescription_required BOOLEAN NOT NULL DEFAULT FALSE,
    subtotal NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    discount_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    round_off_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    total_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    paid_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    change_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(100),
    notes TEXT,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    void_reason TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Keys
    CONSTRAINT uq_sales_id_business UNIQUE (id, business_id),
    CONSTRAINT uq_sales_id_store_business UNIQUE (id, store_id, business_id),
    CONSTRAINT fk_sales_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_sales_store_sale_number UNIQUE (business_id, store_id, sale_number),
    CONSTRAINT uq_sales_business_invoice_number UNIQUE (business_id, invoice_number),
    CONSTRAINT chk_sales_status CHECK (status IN ('COMPLETED', 'VOIDED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED')),
    CONSTRAINT chk_sales_amounts CHECK (
        subtotal >= 0.0000 AND tax_amount >= 0.0000 AND discount_amount >= 0.0000 
        AND total_amount >= 0.0000 AND paid_amount >= 0.0000 AND change_amount >= 0.0000
    )
);

CREATE UNIQUE INDEX idx_sales_idempotency ON sales (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_sales_store_date ON sales (business_id, store_id, sale_date DESC);
CREATE INDEX idx_sales_cashier ON sales (business_id, cashier_id);

-- 2. Sale Lines Table (Immutable Financial Line Items)
CREATE TABLE sale_lines (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    sale_id UUID NOT NULL,
    product_id UUID NOT NULL,
    line_number INTEGER NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(255),
    dosage_form VARCHAR(50),
    strength VARCHAR(50),
    selling_unit VARCHAR(50) NOT NULL,
    conversion_factor INTEGER NOT NULL DEFAULT 1,
    quantity NUMERIC(12, 3) NOT NULL,
    base_quantity NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(14, 4) NOT NULL,
    gross_amount NUMERIC(14, 4) NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    allocated_bill_discount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    line_total NUMERIC(14, 4) NOT NULL,
    returned_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Key
    CONSTRAINT uq_sale_lines_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_sale_lines_sale FOREIGN KEY (sale_id, business_id)
        REFERENCES sales(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sale_lines_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_sale_lines_sale_line_num UNIQUE (sale_id, line_number),
    CONSTRAINT chk_sale_lines_quantities CHECK (
        quantity > 0.000 AND base_quantity > 0.000 AND conversion_factor >= 1 
        AND returned_quantity >= 0.000 AND returned_quantity <= quantity
    ),
    CONSTRAINT chk_sale_lines_financials CHECK (
        unit_price >= 0.0000 AND gross_amount >= 0.0000 AND discount_amount >= 0.0000 
        AND allocated_bill_discount >= 0.0000 AND tax_rate >= 0.00 AND tax_amount >= 0.0000 AND line_total >= 0.0000
    )
);

CREATE INDEX idx_sale_lines_sale ON sale_lines (sale_id);
CREATE INDEX idx_sale_lines_product ON sale_lines (business_id, product_id);

-- 3. Sale Line Batch Allocations Table (Multi-Batch FEFO Traceability)
CREATE TABLE sale_line_batch_allocations (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL,
    sale_line_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    product_id UUID NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    allocated_base_quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(14, 4) NOT NULL,
    mrp NUMERIC(14, 4),
    selling_price NUMERIC(14, 4),
    returned_base_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Key
    CONSTRAINT uq_sale_line_batch_alloc_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_alloc_sale FOREIGN KEY (sale_id, store_id, business_id)
        REFERENCES sales(id, store_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_alloc_line FOREIGN KEY (sale_line_id, business_id)
        REFERENCES sale_lines(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_alloc_batch FOREIGN KEY (batch_id, store_id, product_id, business_id)
        REFERENCES inventory_batches(id, store_id, product_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT chk_alloc_quantities CHECK (
        allocated_base_quantity > 0.000 AND returned_base_quantity >= 0.000 
        AND returned_base_quantity <= allocated_base_quantity
    )
);

CREATE INDEX idx_alloc_sale_line ON sale_line_batch_allocations (sale_line_id);
CREATE INDEX idx_alloc_batch ON sale_line_batch_allocations (business_id, batch_id);

-- 4. Sale Payments Table (Split Payments & Tendered Audit)
CREATE TABLE sale_payments (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    amount NUMERIC(14, 4) NOT NULL,
    tendered_amount NUMERIC(14, 4),
    change_amount NUMERIC(14, 4) DEFAULT 0.0000,
    transaction_reference VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_sale FOREIGN KEY (sale_id, store_id, business_id)
        REFERENCES sales(id, store_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT chk_payments_method CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'WALLET', 'OTHER')),
    CONSTRAINT chk_payments_status CHECK (status IN ('SUCCESS', 'FAILED')),
    CONSTRAINT chk_payments_amount CHECK (amount > 0.0000)
);

CREATE INDEX idx_payments_sale ON sale_payments (business_id, sale_id);

-- 5. Sale Returns Table
CREATE TABLE sale_returns (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL,
    return_number VARCHAR(60) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    return_date DATE NOT NULL,
    subtotal NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    discount_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    round_off_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    total_refund_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    reason TEXT NOT NULL,
    returned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(100),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Keys
    CONSTRAINT uq_sale_returns_id_business UNIQUE (id, business_id),
    CONSTRAINT uq_sale_returns_id_store_business UNIQUE (id, store_id, business_id),
    CONSTRAINT fk_returns_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_returns_sale FOREIGN KEY (sale_id, store_id, business_id)
        REFERENCES sales(id, store_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_returns_store_number UNIQUE (business_id, store_id, return_number),
    CONSTRAINT chk_returns_status CHECK (status IN ('COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_returns_amounts CHECK (
        subtotal >= 0.0000 AND tax_amount >= 0.0000 AND total_refund_amount >= 0.0000
    )
);

CREATE UNIQUE INDEX idx_returns_idempotency ON sale_returns (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_returns_sale ON sale_returns (business_id, sale_id);

-- 6. Sale Return Lines Table
CREATE TABLE sale_return_lines (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    sale_return_id UUID NOT NULL,
    sale_line_id UUID NOT NULL,
    product_id UUID NOT NULL,
    line_number INTEGER NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    base_quantity NUMERIC(12, 3) NOT NULL,
    unit_refund_price NUMERIC(14, 4) NOT NULL,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    line_total NUMERIC(14, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Key
    CONSTRAINT uq_sale_return_lines_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_ret_lines_return FOREIGN KEY (sale_return_id, business_id)
        REFERENCES sale_returns(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ret_lines_saleline FOREIGN KEY (sale_line_id, business_id)
        REFERENCES sale_lines(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ret_lines_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_sale_return_lines_num UNIQUE (sale_return_id, line_number),
    CONSTRAINT chk_ret_lines_qty CHECK (quantity > 0.000 AND base_quantity > 0.000),
    CONSTRAINT chk_ret_lines_prices CHECK (unit_refund_price >= 0.0000 AND line_total >= 0.0000)
);

CREATE INDEX idx_ret_lines_return ON sale_return_lines (sale_return_id);
CREATE INDEX idx_ret_lines_saleline ON sale_return_lines (sale_line_id);

-- 7. Sale Return Line Batch Allocations Table (Multi-Batch Return Traceability)
CREATE TABLE sale_return_line_batch_allocations (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    sale_return_id UUID NOT NULL,
    sale_return_line_id UUID NOT NULL,
    sale_line_batch_allocation_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    product_id UUID NOT NULL,
    returned_base_quantity NUMERIC(12, 3) NOT NULL,
    stock_condition VARCHAR(30) NOT NULL DEFAULT 'RESTOCKABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ret_alloc_return FOREIGN KEY (sale_return_id, store_id, business_id)
        REFERENCES sale_returns(id, store_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ret_alloc_line FOREIGN KEY (sale_return_line_id, business_id)
        REFERENCES sale_return_lines(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ret_alloc_sale_alloc FOREIGN KEY (sale_line_batch_allocation_id, business_id)
        REFERENCES sale_line_batch_allocations(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ret_alloc_batch FOREIGN KEY (batch_id, store_id, product_id, business_id)
        REFERENCES inventory_batches(id, store_id, product_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT chk_ret_alloc_condition CHECK (stock_condition IN ('RESTOCKABLE', 'DAMAGED', 'EXPIRED')),
    CONSTRAINT chk_ret_alloc_qty CHECK (returned_base_quantity > 0.000)
);

CREATE INDEX idx_ret_alloc_line ON sale_return_line_batch_allocations (sale_return_line_id);
CREATE INDEX idx_ret_alloc_batch ON sale_return_line_batch_allocations (batch_id);

-- 8. Sale Refunds Table (Refund Records)
CREATE TABLE sale_refunds (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    sale_return_id UUID NOT NULL,
    refund_method VARCHAR(30) NOT NULL,
    amount NUMERIC(14, 4) NOT NULL,
    transaction_reference VARCHAR(100),
    refunded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refunded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refunds_return FOREIGN KEY (sale_return_id, store_id, business_id)
        REFERENCES sale_returns(id, store_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_refunds_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT chk_refunds_method CHECK (refund_method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'WALLET', 'OTHER')),
    CONSTRAINT chk_refunds_amount CHECK (amount > 0.0000)
);

CREATE INDEX idx_refunds_return ON sale_refunds (sale_return_id);
