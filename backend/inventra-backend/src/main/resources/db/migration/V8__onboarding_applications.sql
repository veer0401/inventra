-- =========================================================================
-- V8: Admin-Approved Business Onboarding and Platform Admin Roles
-- =========================================================================

-- 1. Add platform_role to users table for platform-level administrators
ALTER TABLE users ADD COLUMN platform_role VARCHAR(50) DEFAULT NULL;
CREATE INDEX idx_users_platform_role ON users (platform_role);

-- 2. Business Registration Applications Table
CREATE TABLE business_registration_applications (
    id UUID PRIMARY KEY,
    applicant_name VARCHAR(150) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(20),
    business_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    drug_license_number VARCHAR(100),
    gstin VARCHAR(20),
    store_name VARCHAR(200) NOT NULL,
    store_code VARCHAR(50) NOT NULL DEFAULT 'MAIN-01',
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason VARCHAR(1000),
    activation_token_hash VARCHAR(64),
    activation_token_expires_at TIMESTAMPTZ,
    activation_completed_at TIMESTAMPTZ,
    created_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    created_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_biz_reg_apps_status ON business_registration_applications (status);
CREATE INDEX idx_biz_reg_apps_email ON business_registration_applications (LOWER(applicant_email));
CREATE INDEX idx_biz_reg_apps_token_hash ON business_registration_applications (activation_token_hash);
CREATE INDEX idx_biz_reg_apps_submitted_at ON business_registration_applications (submitted_at DESC);
