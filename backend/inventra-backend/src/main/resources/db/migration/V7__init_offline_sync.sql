-- V7__init_offline_sync.sql
-- Phase 8: Offline Synchronization & Device Sync Tables

-- 1. Sync Operations Table (Unified Idempotency, Operation Tracking & Audit)
CREATE TABLE sync_operations (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL,
    store_id UUID NOT NULL,
    device_id UUID NOT NULL,
    user_id UUID NOT NULL,
    event_id UUID NOT NULL,
    device_sequence_number BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_version INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL,
    server_entity_id UUID,
    payload_checksum VARCHAR(64) NOT NULL,
    error_code VARCHAR(60),
    error_message TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_at TIMESTAMPTZ,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sync_ops_device_event UNIQUE (business_id, device_id, event_id),
    CONSTRAINT uq_sync_ops_device_seq UNIQUE (business_id, device_id, device_sequence_number),
    CONSTRAINT fk_sync_ops_business FOREIGN KEY (business_id)
        REFERENCES businesses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sync_ops_store FOREIGN KEY (store_id, business_id)
        REFERENCES stores(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sync_ops_device FOREIGN KEY (device_id, business_id)
        REFERENCES devices(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sync_ops_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_sync_ops_lookup ON sync_operations (business_id, device_id, status);
CREATE INDEX idx_sync_ops_event ON sync_operations (business_id, event_id);

-- 2. Server Change Feed Table (Monotonic Download Stream)
CREATE TABLE sync_change_feed (
    change_seq BIGSERIAL PRIMARY KEY,
    id UUID NOT NULL,
    business_id UUID NOT NULL,
    store_id UUID,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL,
    entity_version INT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_change_feed_id UNIQUE (business_id, id),
    CONSTRAINT fk_change_feed_business FOREIGN KEY (business_id)
        REFERENCES businesses(id) ON DELETE RESTRICT
);

CREATE INDEX idx_change_feed_cursor ON sync_change_feed (business_id, store_id, change_seq);

-- 3. Device Sync States Table (Cursor & Sequence Tracking)
CREATE TABLE sync_device_states (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL,
    device_id UUID NOT NULL,
    last_synced_sequence_number BIGINT NOT NULL DEFAULT 0,
    last_downloaded_cursor BIGINT NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_device_sync_state UNIQUE (business_id, device_id),
    CONSTRAINT fk_device_sync_state_device FOREIGN KEY (device_id, business_id)
        REFERENCES devices(id, business_id) ON DELETE RESTRICT
);
