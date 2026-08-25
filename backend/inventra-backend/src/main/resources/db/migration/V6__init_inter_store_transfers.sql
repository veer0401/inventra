-- =========================================================================
-- V6: Schema for Inter-Store Inventory Transfers
-- =========================================================================

-- 1. Inventory Transfers Table (Aggregate Root)
CREATE TABLE inventory_transfers (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    source_store_id UUID NOT NULL,
    destination_store_id UUID NOT NULL,
    transfer_number VARCHAR(60) NOT NULL,
    status VARCHAR(30) NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ,
    shipped_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    shipped_at TIMESTAMPTZ,
    received_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    received_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    rejection_reason TEXT,
    expected_delivery_date DATE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    create_idempotency_key VARCHAR(100),
    ship_idempotency_key VARCHAR(100),
    notes TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Composite FK Support Keys
    CONSTRAINT uq_transfers_id_business UNIQUE (id, business_id),
    CONSTRAINT uq_transfers_id_src_business UNIQUE (id, source_store_id, business_id),
    CONSTRAINT uq_transfers_id_dst_business UNIQUE (id, destination_store_id, business_id),
    CONSTRAINT fk_transfers_src_store FOREIGN KEY (source_store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfers_dst_store FOREIGN KEY (destination_store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT chk_transfers_diff_stores CHECK (source_store_id <> destination_store_id),
    CONSTRAINT uq_transfers_biz_number UNIQUE (business_id, transfer_number),
    CONSTRAINT chk_transfers_status CHECK (
        status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')
    )
);

CREATE UNIQUE INDEX idx_transfers_create_idemp ON inventory_transfers (business_id, create_idempotency_key) WHERE create_idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_transfers_ship_idemp ON inventory_transfers (business_id, ship_idempotency_key) WHERE ship_idempotency_key IS NOT NULL;
CREATE INDEX idx_transfers_src ON inventory_transfers (business_id, source_store_id, status);
CREATE INDEX idx_transfers_dst ON inventory_transfers (business_id, destination_store_id, status);

-- 2. Inventory Transfer Lines Table
CREATE TABLE inventory_transfer_lines (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    transfer_id UUID NOT NULL,
    product_id UUID NOT NULL,
    line_number INTEGER NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    selling_unit VARCHAR(50) NOT NULL,
    conversion_factor INTEGER NOT NULL DEFAULT 1,
    requested_quantity NUMERIC(12, 3) NOT NULL,
    requested_base_quantity NUMERIC(12, 3) NOT NULL,
    approved_quantity NUMERIC(12, 3),
    approved_base_quantity NUMERIC(12, 3),
    shipped_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    shipped_base_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    received_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    received_base_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    unit_cost NUMERIC(14, 4),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Composite FK Support Key
    CONSTRAINT uq_transfer_lines_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_transfer_lines_transfer FOREIGN KEY (transfer_id, business_id)
        REFERENCES inventory_transfers(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfer_lines_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_transfer_lines_num UNIQUE (transfer_id, line_number),
    CONSTRAINT chk_transfer_lines_quantities CHECK (
        requested_quantity > 0.000 AND requested_base_quantity > 0.000 AND conversion_factor >= 1
        AND shipped_quantity >= 0.000 AND received_quantity >= 0.000 AND received_quantity <= shipped_quantity
    )
);

CREATE INDEX idx_transfer_lines_transfer ON inventory_transfer_lines (transfer_id);

-- 3. Inventory Transfer Line Batch Allocations Table (Full Snapshot)
CREATE TABLE inventory_transfer_line_batch_allocations (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    source_store_id UUID NOT NULL,
    destination_store_id UUID NOT NULL,
    transfer_id UUID NOT NULL,
    transfer_line_id UUID NOT NULL,
    source_batch_id UUID NOT NULL,
    destination_batch_id UUID,
    product_id UUID NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    shipped_base_quantity NUMERIC(12, 3) NOT NULL,
    received_base_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    unit_cost NUMERIC(14, 4) NOT NULL,
    mrp NUMERIC(14, 4),
    selling_price NUMERIC(14, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Composite FK Support Key
    CONSTRAINT uq_transfer_alloc_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_transfer_alloc_transfer FOREIGN KEY (transfer_id, business_id)
        REFERENCES inventory_transfers(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfer_alloc_line FOREIGN KEY (transfer_line_id, business_id)
        REFERENCES inventory_transfer_lines(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfer_alloc_src_batch FOREIGN KEY (source_batch_id, source_store_id, product_id, business_id)
        REFERENCES inventory_batches(id, store_id, product_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT chk_transfer_alloc_qty CHECK (
        shipped_base_quantity > 0.000 AND received_base_quantity >= 0.000 AND received_base_quantity <= shipped_base_quantity
    )
);

CREATE INDEX idx_transfer_alloc_line ON inventory_transfer_line_batch_allocations (transfer_line_id);

-- 4. Inventory Transfer Receipts Table (Tranche Records)
CREATE TABLE inventory_transfer_receipts (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    transfer_id UUID NOT NULL,
    receipt_number VARCHAR(60) NOT NULL,
    receipt_date DATE NOT NULL,
    received_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idempotency_key VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transfer_receipts_transfer FOREIGN KEY (transfer_id, business_id)
        REFERENCES inventory_transfers(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfer_receipts_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_transfer_receipts_num UNIQUE (business_id, store_id, receipt_number)
);

CREATE UNIQUE INDEX idx_transfers_receipt_idemp ON inventory_transfer_receipts (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_transfer_receipts_transfer ON inventory_transfer_receipts (transfer_id);

-- 5. Inventory Transfer Receipt Lines Table
CREATE TABLE inventory_transfer_receipt_lines (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    transfer_receipt_id UUID NOT NULL,
    transfer_line_id UUID NOT NULL,
    transfer_line_batch_allocation_id UUID NOT NULL,
    destination_batch_id UUID NOT NULL,
    product_id UUID NOT NULL,
    received_base_quantity NUMERIC(12, 3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rec_lines_receipt FOREIGN KEY (transfer_receipt_id)
        REFERENCES inventory_transfer_receipts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_rec_lines_line FOREIGN KEY (transfer_line_id, business_id)
        REFERENCES inventory_transfer_lines(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_rec_lines_alloc FOREIGN KEY (transfer_line_batch_allocation_id, business_id)
        REFERENCES inventory_transfer_line_batch_allocations(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT chk_rec_lines_qty CHECK (received_base_quantity > 0.000)
);

CREATE INDEX idx_rec_lines_receipt ON inventory_transfer_receipt_lines (transfer_receipt_id);
