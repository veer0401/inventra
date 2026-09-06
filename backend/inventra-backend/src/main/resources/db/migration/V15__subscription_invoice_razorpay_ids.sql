-- V15: Add Razorpay transaction references to subscription invoices
ALTER TABLE business_subscription_invoices
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);

-- Update seed invoice for Patwa Medical Store with reference IDs if null
UPDATE business_subscription_invoices
SET razorpay_payment_id = 'pay_sample_patwa_pro',
    razorpay_order_id = 'order_sample_patwa_pro'
WHERE razorpay_payment_id IS NULL AND invoice_number = 'INV-1788638084';
