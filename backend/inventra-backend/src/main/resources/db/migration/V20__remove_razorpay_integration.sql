-- V20: Remove the Razorpay payment-gateway integration.
-- Earlier migrations (V14, V15, V19) are left untouched so Flyway checksums stay valid.

-- 1. Drop the gateway transaction references from subscription invoices.
ALTER TABLE business_subscription_invoices
    DROP COLUMN IF EXISTS razorpay_payment_id,
    DROP COLUMN IF EXISTS razorpay_order_id;

-- 2. Relabel records that were stamped with the gateway name.
UPDATE business_subscriptions
SET payment_method = 'Manual Payment'
WHERE payment_method ILIKE '%razorpay%';

UPDATE business_subscription_invoices
SET payment_method = 'Manual Payment'
WHERE payment_method ILIKE '%razorpay%';

-- 3. Remove the gateway name from the seeded refund-policy page.
UPDATE platform_cms_pages
SET content_data = replace(content_data::text, ' via Razorpay / Cashfree', '')::jsonb
WHERE content_data::text LIKE '%via Razorpay / Cashfree%';
