-- =========================================================================
-- V9: User Shortcut Profiles and Store User Capacity Foundation
-- =========================================================================

-- 1. Add configurable max_users to stores table (default = 5)
ALTER TABLE stores ADD COLUMN max_users INTEGER NOT NULL DEFAULT 5;
ALTER TABLE stores ADD CONSTRAINT chk_stores_max_users_positive CHECK (max_users > 0);

-- 2. User Shortcut Profiles Table (Authoritative Server-side Custom Keybindings)
CREATE TABLE user_shortcut_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    shortcuts_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_user_shortcut_profile_name UNIQUE (user_id, name)
);

CREATE INDEX idx_user_shortcut_profiles_user_id ON user_shortcut_profiles (user_id);
CREATE INDEX idx_user_shortcut_profiles_active ON user_shortcut_profiles (user_id, is_active);
