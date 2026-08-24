-- =========================================================================
-- V3: Schema for Product Catalog and Store Inventory Foundation
-- =========================================================================

-- 1. Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    parent_id UUID,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Key (allows child categories in same business to reference parent)
    CONSTRAINT uq_categories_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id, business_id)
        REFERENCES categories(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_categories_business_code UNIQUE (business_id, code)
);

CREATE INDEX idx_categories_business ON categories (business_id);
CREATE INDEX idx_categories_parent ON categories (parent_id);

-- 2. Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    category_id UUID,
    global_product_id UUID,
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(255),
    brand_name VARCHAR(100),
    manufacturer VARCHAR(150),
    dosage_form VARCHAR(50) NOT NULL,
    strength VARCHAR(50),
    base_unit VARCHAR(30) NOT NULL,
    selling_unit VARCHAR(50) NOT NULL DEFAULT 'Unit',
    units_per_selling_unit INTEGER NOT NULL DEFAULT 1,
    hsn_code VARCHAR(20),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_tax_inclusive BOOLEAN NOT NULL DEFAULT TRUE,
    prescription_required BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Key (allows inventory items, batches, and movements to reference product)
    CONSTRAINT uq_products_id_business UNIQUE (id, business_id),
    CONSTRAINT fk_product_category FOREIGN KEY (category_id, business_id)
        REFERENCES categories(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT chk_units_per_selling_unit_positive CHECK (units_per_selling_unit >= 1),
    CONSTRAINT chk_tax_rate_positive CHECK (tax_rate >= 0.00)
);

CREATE INDEX idx_products_business ON products (business_id);
CREATE INDEX idx_products_name ON products (business_id, lower(name));
CREATE INDEX idx_products_generic ON products (business_id, lower(generic_name));
CREATE INDEX idx_products_status ON products (business_id, status);

-- 3. Product Identifiers Table
CREATE TABLE product_identifiers (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL,
    identifier_type VARCHAR(30) NOT NULL,
    identifier_value VARCHAR(100) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_identifier_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE CASCADE,
    CONSTRAINT uq_business_identifier UNIQUE (business_id, identifier_type, identifier_value)
);

CREATE INDEX idx_product_identifiers_search ON product_identifiers (business_id, identifier_value);
CREATE UNIQUE INDEX uq_product_primary_identifier ON product_identifiers (product_id, identifier_type) WHERE is_primary = TRUE;

-- 4. Inventory Items Table (Store + Product Header)
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    product_id UUID NOT NULL,
    current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    reorder_level NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    reorder_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    min_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    max_stock NUMERIC(12, 3),
    location_rack VARCHAR(50),
    is_batch_tracked BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Keys
    CONSTRAINT uq_inventory_items_id_business UNIQUE (id, business_id),
    CONSTRAINT uq_inventory_items_composite UNIQUE (id, store_id, product_id, business_id),
    CONSTRAINT fk_inventory_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_store_product UNIQUE (store_id, product_id),
    CONSTRAINT chk_current_stock_non_negative CHECK (current_stock >= 0.000)
);

CREATE INDEX idx_inventory_store ON inventory_items (store_id);
CREATE INDEX idx_inventory_product ON inventory_items (product_id);
CREATE INDEX idx_inventory_low_stock ON inventory_items (store_id, current_stock, reorder_level);

-- 5. Inventory Batches Table
CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    product_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FK Support Keys
    CONSTRAINT uq_inventory_batches_id_business UNIQUE (id, business_id),
    CONSTRAINT uq_inventory_batches_composite UNIQUE (id, store_id, product_id, business_id),
    CONSTRAINT fk_batch_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_batch_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_batch_inventory_item FOREIGN KEY (inventory_item_id, store_id, product_id, business_id)
        REFERENCES inventory_items(id, store_id, product_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT uq_store_product_batch UNIQUE (store_id, product_id, batch_number),
    CONSTRAINT chk_batch_quantity_non_negative CHECK (quantity >= 0.000),
    CONSTRAINT chk_batch_prices_non_negative CHECK (purchase_price >= 0.00 AND mrp >= 0.00 AND selling_price >= 0.00),
    CONSTRAINT chk_batch_selling_price_lte_mrp CHECK (selling_price <= mrp)
);

CREATE INDEX idx_batches_fefo ON inventory_batches (store_id, product_id, expiry_date, status);
CREATE INDEX idx_batches_expiry ON inventory_batches (store_id, expiry_date);

-- 6. Stock Movements Table (Append-Only Immutable Ledger)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    product_id UUID NOT NULL,
    batch_id UUID,
    movement_type VARCHAR(40) NOT NULL,
    quantity_delta NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(12, 2),
    balance_after NUMERIC(12, 3) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    reason VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movement_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_movement_product FOREIGN KEY (product_id, business_id)
        REFERENCES products(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_movement_batch FOREIGN KEY (batch_id, store_id, product_id, business_id)
        REFERENCES inventory_batches(id, store_id, product_id, business_id) ON DELETE RESTRICT
);

CREATE INDEX idx_movements_store_product ON stock_movements (store_id, product_id, occurred_at);
CREATE INDEX idx_movements_batch ON stock_movements (batch_id);
CREATE INDEX idx_movements_reference ON stock_movements (reference_type, reference_id);
