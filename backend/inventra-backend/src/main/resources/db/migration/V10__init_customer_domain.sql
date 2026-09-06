-- =========================================================================
-- V10: Customer Domain Foundation & Sale Association
-- =========================================================================

-- 1. Customers Table (Business-Scoped Customer Aggregate Root)
CREATE TABLE customers (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    customer_code VARCHAR(30) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    address TEXT,
    gstin VARCHAR(20),
    notes VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_customers_id_business UNIQUE (id, business_id),
    CONSTRAINT uq_customers_code_business UNIQUE (business_id, customer_code),
    CONSTRAINT chk_customers_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))
);

CREATE INDEX idx_customers_business ON customers (business_id);
CREATE INDEX idx_customers_search ON customers (business_id, status, full_name text_pattern_ops);
CREATE INDEX idx_customers_phone ON customers (business_id, phone text_pattern_ops);
CREATE INDEX idx_customers_code ON customers (business_id, customer_code text_pattern_ops);

-- 2. Associate Sale with Customer (Preserving denormalized customer_name & customer_phone)
ALTER TABLE sales ADD COLUMN customer_id UUID;
ALTER TABLE sales ADD CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id, business_id)
    REFERENCES customers(id, business_id) ON DELETE SET NULL;

CREATE INDEX idx_sales_customer ON sales (business_id, customer_id);
