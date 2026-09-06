-- V17: Career Jobs, Candidate Applications & Optional Maximum Discount Cap for Coupons

-- 1. Extend subscription_coupons with optional max discount amount (ceiling cap for percentage discounts)
ALTER TABLE subscription_coupons
    ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC(12, 2);

-- Update INVENTRAFIRST with an optional max discount cap of ₹2,500
UPDATE subscription_coupons
SET max_discount_amount = 2500.00
WHERE code = 'INVENTRAFIRST';

-- 2. Create Career Jobs table
CREATE TABLE IF NOT EXISTS career_jobs (
    id UUID PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL, -- e.g. 'Engineering', 'Clinical', 'Operations', 'Sales', 'Product'
    location VARCHAR(150) NOT NULL, -- e.g. 'Bengaluru / Remote', 'Mumbai (Hybrid)'
    employment_type VARCHAR(50) NOT NULL DEFAULT 'Full-time', -- 'Full-time', 'Part-time', 'Contract', 'Internship'
    experience_level VARCHAR(100) NOT NULL, -- e.g. '3-5 years', '1-3 years', '5+ years'
    salary_range VARCHAR(100), -- e.g. '₹18L - ₹28L / annum', 'Competitive'
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_career_jobs_active ON career_jobs(active);
CREATE INDEX IF NOT EXISTS idx_career_jobs_department ON career_jobs(department);

-- Seed initial default job openings
INSERT INTO career_jobs (
    id, title, department, location, employment_type, experience_level, salary_range, summary, description, responsibilities, requirements, benefits, active
) VALUES 
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c50',
    'Senior Fullstack Engineer (React & Spring Boot 4)',
    'Engineering',
    'Bengaluru / Remote (India)',
    'Full-time',
    '4-7 years',
    '₹24L - ₹36L + Equity',
    'Build high-performance, offline-capable pharmacy POS microservices and cloud synchronization infrastructure.',
    'As a Senior Fullstack Engineer at Inventra, you will design sub-second billing systems, real-time batch allocation engines, and offline-first desktop/web clients that power high-volume dispensaries across India.',
    '[
        "Architect and optimize mission-critical transactional POS flows in Spring Boot 4 and PostgreSQL.",
        "Build modular, responsive UI components with React 19, TypeScript, and Tailwind CSS.",
        "Implement reliable offline sync queues and conflict resolution for multi-counter desktop clients.",
        "Ensure bank-grade security, RBAC, and audit logging for CDSCO and GST compliance.",
        "Mentor junior engineers and champion clean code standards with comprehensive test suites."
    ]'::jsonb,
    '[
        "4+ years of production experience with Java / Spring Boot and relational databases (PostgreSQL preferred).",
        "3+ years of modern React with TypeScript, state management, and modern component design.",
        "Deep understanding of ACID transactions, concurrency, database indexing, and query optimization.",
        "Hands-on experience with WebSocket / REST APIs and offline-first architectural paradigms.",
        "Strong focus on automated testing (JUnit 5, Mockito, Jest / Vitest) and CI/CD pipelines."
    ]'::jsonb,
    '[
        "Competitive salary with high-upside stock options (ESOPs).",
        "Comprehensive health and medical insurance for you and your dependents.",
        "Flexible remote-first work culture with modern M-series MacBook Pro provided.",
        "Annual learning stipend for conferences, books, and certifications.",
        "Generous paid time off and wellness leave."
    ]'::jsonb,
    true
),
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c51',
    'Pharmacy Domain & Regulatory Specialist (CDSCO Compliance)',
    'Clinical & Operations',
    'Mumbai (Hybrid)',
    'Full-time',
    '3-6 years',
    '₹14L - ₹22L / annum',
    'Lead compliance validation, Schedule H/H1 drug workflows, and pharmacy operations product standards.',
    'Help us bridge the gap between Indian drug statutory regulations and modern cloud software. You will oversee pharmaceutical taxonomies, dosage algorithms, and Schedule X/H drug governance in the Inventra platform.',
    '[
        "Audit and standardize drug catalog taxonomies, salt compositions, and Schedule H/H1 regulatory markers.",
        "Design clinical safety check algorithms, drug interaction warnings, and prescription validation rules.",
        "Collaborate closely with product and engineering teams to model real-world pharmacy workflows.",
        "Conduct user training and pilot deployment reviews with licensed pharmacists and hospital dispensaries.",
        "Monitor state and central CDSCO regulatory amendments to keep the ERP system ahead of compliance requirements."
    ]'::jsonb,
    '[
        "B.Pharm / M.Pharm degree with active registered pharmacist certification in India.",
        "3+ years of hands-on experience in hospital pharmacy operations, retail chain management, or healthtech QA.",
        "Thorough understanding of the Drugs and Cosmetics Act, Schedule H/H1 guidelines, and GST rules for pharmaceuticals.",
        "Excellent communication skills and eagerness to translate domain rules into software specifications.",
        "Proficiency with Excel / CSV catalog structures and modern SaaS tools."
    ]'::jsonb,
    '[
        "Competitive compensation package with performance incentives.",
        "Full family medical coverage and health wellness allowance.",
        "Opportunity to reshape pharmaceutical operations at nationwide scale.",
        "Quarterly company offsites and team retreats."
    ]'::jsonb,
    true
),
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c52',
    'Enterprise Account Executive (Pharmacy Retail Chains)',
    'Sales & Growth',
    'Delhi NCR / Bengaluru (Field)',
    'Full-time',
    '3-5 years',
    '₹15L - ₹25L + Uncapped Incentives',
    'Drive commercial adoption of Inventra ERP across multi-branch retail pharmacy chains and hospital dispensaries.',
    'We are looking for an ambitious sales professional to lead our enterprise outreach. You will pitch Inventra to pharmacy chain owners, directors, and CIOs, demonstrating tangible cost savings in inventory wastage and billing speed.',
    '[
        "Identify, prospect, and close multi-store retail pharmacy chains across assigned regional territories.",
        "Deliver compelling product demonstrations focusing on FEFO batch reduction, theft prevention, and unified reporting.",
        "Negotiate contracts, multi-branch licenses, and pilot deployment agreements.",
        "Coordinate onboarding and account transitions with the customer success and implementation teams.",
        "Achieve quarterly ARR targets and build long-term advisory relationships with pharmacy leadership."
    ]'::jsonb,
    '[
        "3+ years of proven B2B SaaS or healthcare/pharmaceutical enterprise sales track record.",
        "Established network and familiarity with pharmacy retail, FMCG, or hospital supply chains in India.",
        "Exceptional consultative pitching, objection handling, and executive stakeholder management skills.",
        "Comfort with CRM tools (HubSpot / Salesforce) and data-driven pipeline forecasting.",
        "Willingness to travel locally for in-person product demos and customer meetings."
    ]'::jsonb,
    '[
        "Uncapped performance commission and sales achievement accelerators.",
        "Executive health cover and corporate travel allowances.",
        "Clear career progression to Regional Sales Director.",
        "Collaborative and high-energy growth environment."
    ]'::jsonb,
    true
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Job Applications table
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES career_jobs(id) ON DELETE CASCADE,
    job_title VARCHAR(200) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    current_location VARCHAR(150) NOT NULL,
    linkedin_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    experience_years NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    current_company VARCHAR(150),
    current_role_title VARCHAR(150),
    notice_period_days INT,
    current_ctc VARCHAR(100),
    expected_ctc VARCHAR(100),
    resume_url TEXT NOT NULL,
    cover_letter TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'NEW', -- 'NEW', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'HIRED', 'REJECTED'
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);
