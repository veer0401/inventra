CREATE TABLE IF NOT EXISTS business_subscriptions (
    business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL DEFAULT 'PRO',
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    payment_method VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_subscription_invoices (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date TIMESTAMPTZ NOT NULL,
    description VARCHAR(255) NOT NULL,
    plan_tier VARCHAR(50) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    cgst_amount NUMERIC(12, 2) NOT NULL,
    sgst_amount NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PAID',
    hsn_sac VARCHAR(20) NOT NULL DEFAULT '997331',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed active subscription for Patwa Medical Store dynamically by legal_name
INSERT INTO business_subscriptions (
    business_id, tier, billing_cycle, status, current_period_start, current_period_end, auto_renew, payment_method
)
SELECT id, 'PRO', 'MONTHLY', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', true, 'Razorpay (Verified)'
FROM businesses
WHERE legal_name ILIKE '%Patwa Medical%'
LIMIT 1
ON CONFLICT (business_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    billing_cycle = EXCLUDED.billing_cycle,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    auto_renew = EXCLUDED.auto_renew,
    payment_method = EXCLUDED.payment_method,
    updated_at = CURRENT_TIMESTAMP;

-- Seed paid invoice for Patwa Medical Store
INSERT INTO business_subscription_invoices (
    id, business_id, invoice_number, invoice_date, description, plan_tier, subtotal, cgst_amount, sgst_amount, total_amount, payment_method, status, hsn_sac
)
SELECT gen_random_uuid(), id, 'INV-1788638084', CURRENT_TIMESTAMP, 'Pharmacy Pro - Monthly Subscription', 'PRO', 2499.00, 224.91, 224.91, 2948.82, 'Razorpay', 'PAID', '997331'
FROM businesses
WHERE legal_name ILIKE '%Patwa Medical%'
LIMIT 1
ON CONFLICT (id) DO NOTHING;
