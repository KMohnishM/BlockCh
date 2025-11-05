-- Add verification and risk analysis tables
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS verified_domain TEXT;

-- Company verifications table
CREATE TABLE IF NOT EXISTS company_verifications (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    cin TEXT,
    company_name TEXT,
    registered_address TEXT,
    incorporation_date DATE,
    status TEXT,
    pan TEXT,
    industry TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    domain TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk analysis reports table
CREATE TABLE IF NOT EXISTS risk_analysis_reports (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    factors JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_verifications_company_id ON company_verifications(company_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_risk_analysis_reports_company_id ON risk_analysis_reports(company_id);