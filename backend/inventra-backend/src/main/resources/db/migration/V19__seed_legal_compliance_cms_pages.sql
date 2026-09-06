-- V17: Seed Legal, Compliance & Office Space CMS Pages (Privacy, Terms, Refund, Security, and enhanced About Us)

-- 1. Update/Enrich ABOUT page with contact channels and Google Space / Office Hub locations
UPDATE platform_cms_pages
SET content_data = jsonb_build_object(
    'mission', 'Our mission is to empower independent chemists and pharmacy chains with enterprise-grade technology that eliminates stockouts, prevents medication expiry, and guarantees 100% regulatory compliance.',
    'vision', 'A connected pharmaceutical supply ecosystem where zero life-saving medicines expire on shelves and every patient receives authentic medications instantly.',
    'contactEmail', 'support@inventra.in',
    'contactPhone', '+91 80 4567 8900',
    'supportHours', 'Monday – Saturday: 8:00 AM – 10:00 PM IST (Emergency 24/7 Critical Triage)',
    'story', jsonb_build_object(
        'heading', 'Empowering 1 Million Chemists Across Bharat',
        'p1', 'Founded by retail pharmacists and distributed systems engineers, Inventra was born out of a real dispensary counter in Mumbai. We experienced first-hand the daily chaos: expired medicines lost in back drawers, long queues under spotty internet, and confusing GST filing reconciliation.',
        'p2', 'We built Inventra from the ground up to be resilient, lightning-fast, and deeply aligned with Indian drug regulations like the Drugs and Cosmetics Act and Schedule H/H1 registers.'
    ),
    'values', jsonb_build_array(
        jsonb_build_object('title', 'Zero Data Loss', 'desc', 'Local-first architecture ensures that offline cashier counters never lose a single rupee or transaction.'),
        jsonb_build_object('title', 'Statutory Compliance', 'desc', 'Automated CDSCO Schedule H and GSTR-1 ledgers built directly into the core transaction engine.'),
        jsonb_build_object('title', 'Pharmacy Empathy', 'desc', 'Every keyboard shortcut and button is optimized for high-speed counter rush hours.')
    ),
    'offices', jsonb_build_array(
        jsonb_build_object(
            'name', 'Bengaluru Technology & Innovation Space',
            'badge', 'Global Headquarters',
            'address', 'Level 4, Inventra Cloud Tower, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038',
            'city', 'Bengaluru, Karnataka',
            'googleSpaceUrl', 'https://www.google.com/maps/search/?api=1&query=Inventra+Technologies+Indiranagar+Bengaluru',
            'coordinates', '12.9716° N, 77.6412° E',
            'phone', '+91 80 4567 8900',
            'email', 'bengaluru@inventra.in'
        ),
        jsonb_build_object(
            'name', 'Mumbai Healthcare & Logistics Center',
            'badge', 'Regional Operations',
            'address', 'Suite 802, The Capital, G Block, Bandra Kurla Complex (BKC), Bandra East, Mumbai, Maharashtra 400051',
            'city', 'Mumbai, Maharashtra',
            'googleSpaceUrl', 'https://www.google.com/maps/search/?api=1&query=Bandra+Kurla+Complex+Mumbai',
            'coordinates', '19.0657° N, 72.8687° E',
            'phone', '+91 22 6789 0123',
            'email', 'mumbai@inventra.in'
        ),
        jsonb_build_object(
            'name', 'New Delhi Regulatory & Government Affairs Hub',
            'badge', 'Regulatory Office',
            'address', 'Regus Cyber City, DLF Phase 2, Gurugram, Delhi-NCR 122002',
            'city', 'Delhi-NCR',
            'googleSpaceUrl', 'https://www.google.com/maps/search/?api=1&query=DLF+Cyber+City+Gurugram',
            'coordinates', '28.4906° N, 77.0886° E',
            'phone', '+91 11 4321 9876',
            'email', 'delhi@inventra.in'
        )
    ),
    'milestones', jsonb_build_array(
        jsonb_build_object('year', '2024', 'title', 'Platform Genesis', 'desc', 'Inventra launched as an offline-first POS designed specifically for high-density retail pharmacies.'),
        jsonb_build_object('year', '2025', 'title', 'Multi-Branch Sync Engine', 'desc', 'Introduced real-time inter-store inventory transfers and centralized warehouse management.'),
        jsonb_build_object('year', '2026', 'title', 'Unified Pan-India Ecosystem', 'desc', 'Serving over 2,400 stores nationwide with automated GST, UPI QR payments, and instant license onboarding.')
    )
),
updated_at = CURRENT_TIMESTAMP
WHERE page_key = 'ABOUT';

-- 2. Seed PRIVACY Policy Page
INSERT INTO platform_cms_pages (page_key, title, subtitle, content_data) VALUES (
    'PRIVACY',
    'Inventra Privacy Policy & Data Governance',
    'Our comprehensive commitment to patient data privacy, prescription confidentiality, and compliance with the Digital Personal Data Protection Act (DPDPA) 2023.',
    '{
        "lastUpdated": "September 2026",
        "contactEmail": "privacy@inventra.in",
        "grievanceOfficer": {
            "name": "Arjun Sharma",
            "designation": "Data Protection & Grievance Officer",
            "email": "grievance@inventra.in",
            "phone": "+91 80 4567 8905",
            "address": "Inventra Cloud Tower, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038"
        },
        "sections": [
            {
                "id": "commitment",
                "title": "1. Patient Confidentiality & Medical Records",
                "content": "Inventra operates strictly as a Business-to-Business (B2B) cloud software processor. All patient health records, prescription copies, diagnostic notes, and medication purchase histories entered by your pharmacy remain the confidential property of the respective patient and the licensed dispensing pharmacy. We never sell, monetize, or harvest identifiable patient health records."
            },
            {
                "id": "collection",
                "title": "2. Information We Collect",
                "content": "To provide high-availability pharmacy operations, Inventra processes: (a) Pharmacy account credentials and GSTIN/Drug License verification documentation; (b) Store operational data including item masters, batch numbers, expiry dates, supplier invoices, and cashier logs; (c) Transactional metadata necessary for statutory GSTR-1 returns, electronic receipts, and automated SMS notifications."
            },
            {
                "id": "security",
                "title": "3. Data Security & Encryption Standards",
                "content": "All data in transit is encrypted using TLS 1.3 with HSTS enforcement. Data at rest is encrypted using AES-256 with hardware-backed key rotation. Local offline SQLite sync files on desktop cashier terminals are protected with SQLCipher volume encryption and per-device HMAC token attestation."
            },
            {
                "id": "isolation",
                "title": "4. Multi-Tenant Logical Isolation",
                "content": "Inventra enforces strict tenant isolation at the database layer using tenant-keyed foreign keys and row-level security constraints. No pharmacy store can ever query, inspect, or access another pharmacy store''s inventory, pricing, or customer ledger under any circumstance."
            },
            {
                "id": "retention",
                "title": "5. Statutory Record Retention & Deletion",
                "content": "In accordance with Indian Drugs and Cosmetics Rules (Rule 65) and GST regulations, prescription and tax invoice records must be maintained for a statutory minimum period of 3 to 6 years. Upon subscription termination, pharmacy owners may download an end-of-service encrypted archive containing all historical data."
            },
            {
                "id": "rights",
                "title": "6. Your Rights Under DPDPA 2023",
                "content": "Authorized pharmacy administrators may request access to, correction of, or complete export of their operational data at any time via the Admin Console or by contacting our Data Protection Officer at privacy@inventra.in."
            }
        ]
    }'::jsonb
) ON CONFLICT (page_key) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    content_data = EXCLUDED.content_data,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Seed TERMS of Service Page
INSERT INTO platform_cms_pages (page_key, title, subtitle, content_data) VALUES (
    'TERMS',
    'Terms and Conditions of Service',
    'The legal agreement governing your subscription, use of Inventra cloud software, workstation licensing, and statutory compliance duties.',
    '{
        "lastUpdated": "September 2026",
        "contactEmail": "legal@inventra.in",
        "sections": [
            {
                "id": "eligibility",
                "title": "1. Eligibility & Pharmacy Licensing Verification",
                "content": "To subscribe to and operate Inventra, you warrant that you are a bona fide retail pharmacy, hospital dispensary, or wholesale pharmaceutical distributor possessing valid Drug Licenses (Form 20, 20B, 21, or 21B) issued by the State Drugs Control Administration. Operating Inventra without valid pharmaceutical licenses constitutes a breach of contract."
            },
            {
                "id": "dispensation",
                "title": "2. Dispensing Accountability & Schedule H Warning",
                "content": "Inventra provides automated software prompts and regulatory registers (e.g. Schedule H and Schedule H1 flags). However, the ultimate legal responsibility for verifying registered medical practitioner prescriptions and dispensing accurate drugs lies solely with the registered licensed pharmacist."
            },
            {
                "id": "tiers",
                "title": "3. Subscriptions, Workstations & Concurrent Sessions",
                "content": "Your tier license (Starter Essentials, Pharmacy Pro, Enterprise Suite) determines the maximum number of concurrent cashier workstations and dispensary branches. Attempting to bypass concurrency limits via reverse-proxy spoofing is prohibited and may result in automated workstation session suspension."
            },
            {
                "id": "sla",
                "title": "4. Service Availability & Offline Guarantees",
                "content": "Inventra targets a 99.99% cloud API uptime. In the event of broadband outage or cloud disruptions, Inventra Desktop provides local-first offline transaction recording. Customers agree that billing during internet outages relies on desktop cashier storage which synchronizes automatically upon network restoration."
            },
            {
                "id": "liability",
                "title": "5. Limitation of Liability",
                "content": "To the fullest extent permissible under Indian law, Inventra shall not be held liable for indirect, punitive, or consequential damages resulting from internet service disruptions, hardware scanner malfunctions, or incorrect catalog entries made by pharmacy personnel."
            },
            {
                "id": "jurisdiction",
                "title": "6. Governing Law & Dispute Resolution",
                "content": "These Terms are governed by and construed in accordance with the laws of the Republic of India. Any legal dispute or arbitration arising hereunder shall be subject to the exclusive jurisdiction of the competent courts located in Bengaluru, Karnataka."
            }
        ]
    }'::jsonb
) ON CONFLICT (page_key) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    content_data = EXCLUDED.content_data,
    updated_at = CURRENT_TIMESTAMP;

-- 4. Seed REFUND & Cancellation Policy Page
INSERT INTO platform_cms_pages (page_key, title, subtitle, content_data) VALUES (
    'REFUND',
    'Cancellation, Refund & Proration Policy',
    'Clear guidelines on subscription cancellations, pro-rated billing adjustments, cloud tier upgrades, and eligible refunds.',
    '{
        "lastUpdated": "September 2026",
        "contactEmail": "billing@inventra.in",
        "sections": [
            {
                "id": "guarantee",
                "title": "1. 14-Day Zero-Risk Money-Back Guarantee",
                "content": "For first-time pharmacy subscribers, we offer an unconditional 14-day money-back guarantee on all Monthly and Annual SaaS subscriptions. If you find that Inventra does not meet your counter workflow needs, simply notify billing@inventra.in within 14 days of activation for a 100% refund."
            },
            {
                "id": "proration",
                "title": "2. Mid-Cycle Plan Upgrades & Credit Proration",
                "content": "When upgrading from Starter to Pro or Enterprise mid-billing cycle, our automated billing engine calculates the unused value of your current cycle down to the minute and applies it as an instant credit against your new tier invoice."
            },
            {
                "id": "cancellation",
                "title": "3. Subscription Cancellation & Data Retention",
                "content": "You may cancel recurring subscription auto-debit at any time from your Store Admin Console. Upon cancellation, your cloud access remains active until the end of your prepaid period. You retain a 60-day grace period to download all GST ledgers, purchase orders, and inventory audits in Excel format."
            },
            {
                "id": "nonrefundable",
                "title": "4. Non-Refundable Services",
                "content": "Charges for dedicated on-site hardware installation, custom legacy software database migration, and consumable SMS notification packs consumed prior to cancellation are non-refundable."
            },
            {
                "id": "timeline",
                "title": "5. Refund Processing Timeline",
                "content": "Approved refunds are processed to the original payment source (UPI, Net Banking, or Credit/Debit Card) via Razorpay / Cashfree within 5 to 7 business banking days."
            }
        ]
    }'::jsonb
) ON CONFLICT (page_key) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    content_data = EXCLUDED.content_data,
    updated_at = CURRENT_TIMESTAMP;

-- 5. Seed SECURITY & Trust Center Page
INSERT INTO platform_cms_pages (page_key, title, subtitle, content_data) VALUES (
    'SECURITY',
    'Security, Compliance & Trust Center',
    'How Inventra protects critical pharmacy records with bank-grade AES-256 encryption, role-based access control, and ISO 27001 certified cloud infrastructure.',
    '{
        "lastUpdated": "September 2026",
        "contactEmail": "security@inventra.in",
        "certifications": [
            {"badge": "ISO 27001", "label": "Information Security Management Certified"},
            {"badge": "AES-256", "label": "Hardware Encrypted Cloud & Local Storage"},
            {"badge": "CDSCO Ready", "label": "Schedule H & H1 Regulatory Audit Trail"},
            {"badge": "DPDPA 2023", "label": "Indian Data Protection Law Aligned"}
        ],
        "sections": [
            {
                "id": "cloud_arch",
                "title": "1. Multi-Availability Zone Cloud Infrastructure",
                "content": "Inventra is hosted in ISO 27001 and SOC 2 Type II certified data centers in Mumbai and Hyderabad. All services run in isolated Virtual Private Clouds (VPC) with continuous automated failover, load balancing, and anti-DDoS perimeter mitigation."
            },
            {
                "id": "encryption",
                "title": "2. End-to-End Encryption & Key Management",
                "content": "Every HTTP transaction is secured via TLS 1.3 using ECDSA-384 certificates. Database volumes are encrypted with AES-256 with keys managed through hardware security modules (HSM) featuring automated annual rotation."
            },
            {
                "id": "rbac",
                "title": "3. Role-Based Access & Tamper-Evident Audit Trails",
                "content": "Pharmacists, cashiers, store accountants, and regional managers have strictly segregated permission sets. Every discount override, bill cancellation, stock adjustment, and price edit is recorded with timestamp, operator ID, and IP address in an immutable audit ledger."
            },
            {
                "id": "offline_sec",
                "title": "4. Secure Local Storage in Offline Mode",
                "content": "When cashiers work offline on desktop devices, pending transactions are stored in an encrypted local database. Before syncing with the cloud, transactions are signed with a cryptographically verifiable device token to prevent replay or forgery attacks."
            },
            {
                "id": "vulnerability",
                "title": "5. Vulnerability Disclosure & Bug Bounty",
                "content": "We take security vulnerabilities seriously. Security researchers and ethical hackers who discover potential security issues may report them directly to security@inventra.in for coordinated triage and remediation."
            }
        ]
    }'::jsonb
) ON CONFLICT (page_key) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    content_data = EXCLUDED.content_data,
    updated_at = CURRENT_TIMESTAMP;
