-- V16: Dynamic CMS, Persistent Tier Configs, Prorated Invoices & Coupon/Gift Code Governance

-- 1. Extend business_subscription_invoices to store exact discount breakdowns & coupon codes
ALTER TABLE business_subscription_invoices 
    ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- Backfill existing invoices
UPDATE business_subscription_invoices 
SET original_amount = subtotal 
WHERE original_amount IS NULL;

-- 2. Subscription Tier Configurations (Admin editable: prices, descriptions, feature bullet lists)
CREATE TABLE IF NOT EXISTS subscription_tier_configs (
    tier VARCHAR(50) PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    monthly_price NUMERIC(12, 2) NOT NULL,
    annual_discount_pct INT NOT NULL DEFAULT 20,
    description TEXT NOT NULL,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    workstation_limit INT NOT NULL DEFAULT 1,
    branch_limit INT NOT NULL DEFAULT 1,
    storage_limit_gb NUMERIC(8, 2) NOT NULL DEFAULT 2.0,
    alert_limit INT NOT NULL DEFAULT 500,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed defaults for STARTER, PRO, and ENTERPRISE
INSERT INTO subscription_tier_configs (
    tier, plan_name, monthly_price, annual_discount_pct, description, features, workstation_limit, branch_limit, storage_limit_gb, alert_limit
) VALUES 
(
    'STARTER',
    'Inventra Starter Essentials',
    999.00,
    20,
    'Essential cloud billing, basic barcode inventory control, and single-counter POS for neighborhood chemist stores.',
    '[
        "Single High-Speed POS Counter Terminal",
        "Barcode Scanning & Thermal Slip Printing",
        "Standard Stock & Batch Tracking",
        "Statutory GST Billing & Daily Reports",
        "Offline POS Cashier Mode (Sync on Reconnect)",
        "Email Support & Automated Daily Backups"
    ]'::jsonb,
    1, 1, 2.0, 500
),
(
    'PRO',
    'Inventra Pharmacy Pro',
    2499.00,
    20,
    'Multi-terminal synchronized POS, FEFO batch expiry auto-allocation, universal Excel catalog import, and dual branch management.',
    '[
        "Up to 5 Synchronized Workstation Terminals",
        "Dual Dispensary Branch Management",
        "Batch & Expiry Date (FEFO) Auto-Allocation",
        "Universal CSV / Excel Master Catalog Importer",
        "Automated Expiry Email & SMS Reminders",
        "Schedule H & H1 Regulatory Drug Register Log",
        "Granular Operator Roles & Security Audit Log",
        "Direct Inter-Store Stock Requisitions"
    ]'::jsonb,
    5, 2, 10.0, 2000
),
(
    'ENTERPRISE',
    'Inventra Enterprise Suite',
    5999.00,
    20,
    'Unlimited POS counters, multi-warehouse stock transfers, real-time GST filing logs, automated SMS/email alerts, and dedicated account SLAs.',
    '[
        "Unlimited High-Speed POS Counters",
        "Central Multi-Warehouse Stock Transfers",
        "Automated Expiry & Batch FEFO Routing",
        "Real-time Automated GST Filing Reports (GSTR-1)",
        "Enterprise Scheduled Email & SMS Dispatch",
        "Dedicated Account Manager & 99.99% Cloud SLA",
        "Zero Data-Loss Local Offline Sync Engine",
        "Custom API Access & Custom Reports Builder"
    ]'::jsonb,
    25, 10, 100.0, 10000
)
ON CONFLICT (tier) DO NOTHING;

-- 3. Promotional Coupons & Gift Codes
CREATE TABLE IF NOT EXISTS subscription_coupons (
    code VARCHAR(50) PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- 'PERCENTAGE' or 'FLAT'
    discount_value NUMERIC(12, 2) NOT NULL,
    first_time_only BOOLEAN NOT NULL DEFAULT false,
    min_tier VARCHAR(50), -- e.g. 'PRO', 'ENTERPRISE', or NULL for any
    min_cycle VARCHAR(20), -- 'ANNUALLY', 'MONTHLY', or NULL for any
    min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    max_uses INT NOT NULL DEFAULT 1000,
    current_uses INT NOT NULL DEFAULT 0,
    valid_until TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial default coupons with strict conditions
INSERT INTO subscription_coupons (
    code, description, discount_type, discount_value, first_time_only, min_tier, min_cycle, min_order_amount, max_uses, active
) VALUES
(
    'INVENTRAFIRST',
    '50% discount for first-time pharmacy registration & onboarding',
    'PERCENTAGE',
    50.00,
    true,
    NULL,
    NULL,
    0.00,
    500,
    true
),
(
    'WELCOME10',
    '10% welcome discount for all plans',
    'PERCENTAGE',
    10.00,
    false,
    NULL,
    NULL,
    0.00,
    1000,
    true
),
(
    'PROLAUNCH500',
    'Flat ₹500 off on Pharmacy Pro plan',
    'FLAT',
    500.00,
    false,
    'PRO',
    NULL,
    2000.00,
    200,
    true
),
(
    'ENTERPRISEANNUAL',
    'Flat ₹3,000 off on Enterprise Annual Subscription',
    'FLAT',
    3000.00,
    false,
    'ENTERPRISE',
    'ANNUALLY',
    10000.00,
    100,
    true
)
ON CONFLICT (code) DO NOTHING;

-- 4. Platform Marketing CMS Pages (Home, About, Features, Careers)
CREATE TABLE IF NOT EXISTS platform_cms_pages (
    page_key VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    content_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) DEFAULT 'System Admin'
);

-- Seed Home page CMS content
INSERT INTO platform_cms_pages (page_key, title, subtitle, content_data) VALUES (
    'HOME',
    'The Modern Operating System for Independent & Multi-Branch Pharmacies',
    'High-speed POS billing, statutory Schedule H drug compliance, FEFO batch routing, and offline-first synchronization engineered for Indian pharmacy retail.',
    '{
        "heroBadge": "New: Integrated GST E-Invoicing & UPI Dynamic Payments",
        "primaryCtaText": "Start 14-Day Free Trial",
        "primaryCtaLink": "/apply",
        "secondaryCtaText": "Explore Plans & Pricing",
        "secondaryCtaLink": "/plans",
        "stats": [
            {"label": "Billing Speed", "value": "< 300ms", "subtext": "Counter checkout speed"},
            {"label": "Active Stores", "value": "2,400+", "subtext": "Pan-India pharmacies"},
            {"label": "Prescriptions Handled", "value": "12M+", "subtext": "Zero compliance errors"},
            {"label": "Uptime Guarantee", "value": "99.99%", "subtext": "Offline resilient"}
        ],
        "highlights": [
            {
                "title": "Sub-Second Fast POS Billing",
                "desc": "Process over 30 items per minute with full barcode integration, strip-level fractional sales, and quick hotkey shortcuts."
            },
            {
                "title": "Smart FEFO & Expiry Routing",
                "desc": "Automated First-Expiry-First-Out logic alerts dispensers before stock expires, preventing costly unsold inventory wastage."
            },
            {
                "title": "Multi-Branch Warehouse Transfers",
                "desc": "Coordinate inventory across multiple dispensary locations and central warehouses with transparent transit tracking."
            },
            {
                "title": "Bulletproof Offline Resilience",
                "desc": "Never halt billing during internet drops. Counters automatically queue sales locally and sync to the cloud seamlessly."
            }
        ]
    }'::jsonb
),
(
    'ABOUT',
    'Transforming Healthcare Logistics & Pharmacy Retail Across India',
    'Inventra was founded by healthcare technologists and retail pharmacists to replace obsolete desktop software with an intelligent, compliance-first operating platform.',
    '{
        "mission": "Our mission is to empower independent chemists and pharmacy chains with enterprise-grade technology that eliminates stockouts, prevents medication expiry, and guarantees 100% regulatory compliance.",
        "vision": "A connected pharmaceutical supply ecosystem where zero life-saving medicines expire on shelves and every patient receives authentic medications instantly.",
        "values": [
            {"title": "Regulatory Rigor", "desc": "Built from the ground up adhering strictly to CDSCO, Drugs and Cosmetics Act, Schedule H/H1, and GST mandates."},
            {"title": "Retail Speed", "desc": "Counter staff handle rush hours effortlessly with keyboard-driven workflows and split-second catalog search."},
            {"title": "Zero Lock-In & Open Cloud", "desc": "Your inventory and transaction ledger belong to you. Instant export to Excel, PDF, or statutory JSON formats."}
        ],
        "milestones": [
            {"year": "2024", "title": "Platform Genesis", "desc": "Inventra launched as an offline-first POS designed specifically for high-density retail pharmacies."},
            {"year": "2025", "title": "Multi-Branch Sync Engine", "desc": "Introduced real-time inter-store inventory transfers and centralized warehouse management."},
            {"year": "2026", "title": "Unified Pan-India Ecosystem", "desc": "Serving over 2,400 stores nationwide with automated GST, UPI QR payments, and instant license onboarding."}
        ]
    }'::jsonb
),
(
    'FEATURES',
    'Engineered for Peak Pharmacy Efficiency & Zero Compliance Risk',
    'Every feature in Inventra is designed around the daily operational realities of Indian retail pharmacies, hospitals, and wholesale distributors.',
    '{
        "categories": [
            {
                "category": "Dispensary & POS Billing",
                "items": [
                    {"title": "Barcode & QR Code Scanning", "desc": "Instant product lookup using global barcodes or custom store batch labels."},
                    {"title": "Strip & Fractional Sales", "desc": "Sell whole strips, single tablets, or bottles with automated per-unit price recalculation."},
                    {"title": "Split & Instant UPI Payments", "desc": "Generate scannable dynamic UPI QR codes directly at POS checkout for exact bill amounts."},
                    {"title": "Patient Prescription Warning", "desc": "Visual flags for Schedule H, H1, and Narcotic medications requiring registered doctor details."}
                ]
            },
            {
                "category": "Smart Inventory & Expiry",
                "items": [
                    {"title": "Automated FEFO Routing", "desc": "Dispense the earliest expiring batches first with zero manual sorting by counter staff."},
                    {"title": "30/60/90 Day Expiry Alerts", "desc": "Configurable proactive alerts notifying store managers of near-expiry stocks for return to supplier."},
                    {"title": "Supplier Return (Debit Notes)", "desc": "Generate debit notes and supplier return slips with pre-calculated GST input adjustments."}
                ]
            },
            {
                "category": "Multi-Store & Cloud Sync",
                "items": [
                    {"title": "Inter-Store Stock Transfers", "desc": "Send transfer requests and receipts between dispensary branches with real-time in-transit logs."},
                    {"title": "Offline-First POS Terminal", "desc": "Cashiers can bill customers seamlessly even during total internet or power cuts."},
                    {"title": "Centralized Pricing & Discounts", "desc": "Head office can push standardized catalog pricing and promotional rules across all locations."}
                ]
            }
        ]
    }'::jsonb
),
(
    'CAREERS',
    'Build the Future of Pharmacy Healthcare Infrastructure',
    'Join our mission-driven team of engineers, healthcare experts, and product designers transforming pharmaceutical supply chains and retail medicine delivery.',
    '{
        "culture": "We value ownership, deep operational empathy for pharmacy owners, and rigorous engineering standards. We solve real-world problems that directly impact public healthcare accessibility.",
        "perks": [
            "Competitive equity packages and health coverage",
            "Flexible hybrid work environment (Bengaluru / Remote)",
            "Annual learning and conference stipends",
            "Wellness benefits and ergonomic home-office allowances"
        ],
        "openings": [
            {
                "id": "eng-01",
                "title": "Senior Full-Stack Engineer (React / Java)",
                "department": "Engineering",
                "location": "Bengaluru / Hybrid",
                "type": "Full-Time",
                "experience": "4-7 Years",
                "description": "Lead the architecture of our offline-first synchronization engine and high-throughput POS checkout client."
            },
            {
                "id": "eng-02",
                "title": "Backend Systems Architect (Spring Boot / PostgreSQL)",
                "department": "Platform",
                "location": "Bengaluru / Remote",
                "type": "Full-Time",
                "experience": "5-8 Years",
                "description": "Scale our multi-tenant cloud backend processing millions of daily pharmacy ledger entries and automated GST reports."
            },
            {
                "id": "prod-01",
                "title": "Product Designer (Design Systems & POS UX)",
                "department": "Design",
                "location": "Bengaluru",
                "type": "Full-Time",
                "experience": "3-5 Years",
                "description": "Design lightning-fast keyboard-first interfaces for retail cashiers and intuitive analytics dashboards for store owners."
            },
            {
                "id": "growth-01",
                "title": "Pharmacy Enterprise Solutions Manager",
                "department": "Growth & Partnerships",
                "location": "Mumbai / Delhi / Bengaluru",
                "type": "Full-Time",
                "experience": "3-6 Years",
                "description": "Partner with pharmacy retail chains and hospital dispensaries to deploy Inventra across multi-store networks."
            }
        ]
    }'::jsonb
)
ON CONFLICT (page_key) DO NOTHING;
