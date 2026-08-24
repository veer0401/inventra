-- =========================================================================
-- V1: Initial Schema for Identity, Business, and Store Domain Foundation
-- =========================================================================

-- 1. Users Table (Global Identity)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_users_email ON users (LOWER(email));
CREATE INDEX idx_users_phone ON users (phone_number);
CREATE INDEX idx_users_status ON users (status);

-- 2. Businesses Table (Tenants)
CREATE TABLE businesses (
    id UUID PRIMARY KEY,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    drug_license_number VARCHAR(100),
    gstin VARCHAR(20),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_businesses_status ON businesses (status);
CREATE INDEX idx_businesses_gstin ON businesses (gstin);

-- 3. Stores Table (Branches)
CREATE TABLE stores (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_code VARCHAR(50) NOT NULL,
    store_name VARCHAR(200) NOT NULL,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_stores_business_code UNIQUE (business_id, store_code),
    CONSTRAINT uq_stores_id_business UNIQUE (id, business_id)
);

CREATE UNIQUE INDEX uq_stores_one_headquarters_per_business
    ON stores (business_id)
    WHERE is_headquarters = TRUE;

CREATE INDEX idx_stores_business_id ON stores (business_id);
CREATE INDEX idx_stores_status ON stores (status);

-- 4. Business Memberships Table
CREATE TABLE business_memberships (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_memberships_business_user UNIQUE (business_id, user_id),
    CONSTRAINT uq_memberships_id_business UNIQUE (id, business_id)
);

CREATE INDEX idx_memberships_business_id ON business_memberships (business_id);
CREATE INDEX idx_memberships_user_id ON business_memberships (user_id);
CREATE INDEX idx_memberships_status ON business_memberships (status);

-- 5. Store Assignments Table (Cross-Business Assignment Enforced via Composite FKs)
CREATE TABLE store_assignments (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL,
    business_membership_id UUID NOT NULL,
    role_override VARCHAR(50),
    is_primary_store BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_store_assignment UNIQUE (store_id, business_membership_id),
    CONSTRAINT fk_assignment_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_assignment_membership FOREIGN KEY (business_membership_id, business_id)
        REFERENCES business_memberships(id, business_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_one_primary_store_per_membership
    ON store_assignments (business_membership_id)
    WHERE is_primary_store = TRUE;

CREATE INDEX idx_store_assignments_business ON store_assignments (business_id);
CREATE INDEX idx_store_assignments_store ON store_assignments (store_id);
CREATE INDEX idx_store_assignments_membership ON store_assignments (business_membership_id);
CREATE INDEX idx_store_assignments_status ON store_assignments (status);
