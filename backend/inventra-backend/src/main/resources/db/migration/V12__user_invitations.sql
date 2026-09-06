-- =========================================================================
-- V12: User Invitations for Multi-Tenant Staff Management
-- =========================================================================

CREATE TABLE user_invitations (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    target_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    token_hash VARCHAR(64) NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_invitations_business ON user_invitations (business_id);
CREATE INDEX idx_user_invitations_token_hash ON user_invitations (token_hash);
CREATE INDEX idx_user_invitations_email ON user_invitations (LOWER(email));
CREATE INDEX idx_user_invitations_status ON user_invitations (status);
