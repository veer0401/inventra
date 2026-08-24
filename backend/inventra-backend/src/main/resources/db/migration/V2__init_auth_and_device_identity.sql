-- =========================================================================
-- V2: Schema for Devices, Refresh Tokens, and Password Reset Tokens
-- =========================================================================

-- 1. Devices Table
CREATE TABLE devices (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    device_name VARCHAR(100) NOT NULL,
    device_code VARCHAR(50) NOT NULL,
    device_type VARCHAR(30) NOT NULL,
    platform_os VARCHAR(50),
    app_version VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_ip_address VARCHAR(45),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_business_device_code UNIQUE (business_id, device_code),
    CONSTRAINT uq_devices_id_business UNIQUE (id, business_id)
);

CREATE INDEX idx_devices_business_id ON devices (business_id);
CREATE INDEX idx_devices_user_id ON devices (user_id);
CREATE INDEX idx_devices_status ON devices (status);

-- 2. Refresh Tokens Table (SHA-256 Hashed, Family Rotation & Reuse Detection)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_tokens_device ON refresh_tokens (device_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);

-- 3. Password Reset Tokens Table (SHA-256 Hashed)
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pwd_reset_user ON password_reset_tokens (user_id);
CREATE INDEX idx_pwd_reset_hash ON password_reset_tokens (token_hash);
CREATE INDEX idx_pwd_reset_expires ON password_reset_tokens (expires_at);

-- 4. Security Audit Logs Table
CREATE TABLE security_audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    detail VARCHAR(500),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_audit_user ON security_audit_logs (user_id);
CREATE INDEX idx_security_audit_business ON security_audit_logs (business_id);
CREATE INDEX idx_security_audit_occurred ON security_audit_logs (occurred_at);
