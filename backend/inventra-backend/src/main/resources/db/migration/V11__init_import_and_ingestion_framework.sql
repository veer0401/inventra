-- V11__init_import_and_ingestion_framework.sql
-- Inventra Universal Ingestion & Draft Verification Framework (Phase F8-D)

-- 1. Import Jobs Table (Aggregate Root)
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    store_id UUID REFERENCES stores(id) ON DELETE RESTRICT,
    import_source VARCHAR(30) NOT NULL, -- 'CSV', 'PDF', 'EMAIL', 'MANUAL'
    import_domain VARCHAR(40) NOT NULL, -- 'PRODUCT_CATALOG', 'CUSTOMERS', 'SUPPLIERS', 'INVENTORY'
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW', -- 'PENDING_REVIEW', 'POSTED', 'PARTIALLY_POSTED', 'CANCELLED', 'FAILED'
    original_filename VARCHAR(255) NOT NULL,
    file_storage_key VARCHAR(500),
    file_hash VARCHAR(64) NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    invalid_rows INTEGER NOT NULL DEFAULT 0,
    skipped_rows INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    confirmed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    confirmed_at TIMESTAMPTZ,
    idempotency_key VARCHAR(100),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_import_jobs_id_business UNIQUE (id, business_id)
);

CREATE INDEX idx_import_jobs_business ON import_jobs (business_id, import_domain, status);
CREATE UNIQUE INDEX uq_import_jobs_idempotency ON import_jobs (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Import Rows Table (With Composite Foreign Key ensuring Business ID consistency)
CREATE TABLE import_rows (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    import_job_id UUID NOT NULL,
    row_index INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'VALID', 'INVALID', 'POSTED', 'SKIPPED'
    raw_data_json JSONB NOT NULL,
    normalized_data_json JSONB,
    matched_entity_id UUID,
    match_confidence NUMERIC(5, 2), -- 0.00 to 1.00
    skipped_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    skipped_at TIMESTAMPTZ,
    skip_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_import_rows_job_index UNIQUE (import_job_id, row_index),
    CONSTRAINT fk_import_rows_job_business FOREIGN KEY (import_job_id, business_id) 
        REFERENCES import_jobs(id, business_id) ON DELETE CASCADE
);

CREATE INDEX idx_import_rows_job ON import_rows (import_job_id, status);
CREATE INDEX idx_import_rows_business ON import_rows (business_id, status);

-- 3. Import Validation Issues Table
CREATE TABLE import_validation_issues (
    id UUID PRIMARY KEY,
    import_row_id UUID NOT NULL REFERENCES import_rows(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    error_code VARCHAR(60) NOT NULL,
    error_message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'ERROR', -- 'ERROR', 'WARNING'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_import_issues_row ON import_validation_issues (import_row_id);
