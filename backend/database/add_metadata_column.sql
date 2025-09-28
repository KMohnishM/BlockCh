-- Add metadata column to companies table if it doesn't exist
-- Run this in your Supabase SQL editor before running the upload script

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE companies ADD COLUMN metadata JSONB;
        CREATE INDEX IF NOT EXISTS idx_companies_metadata ON companies USING gin(metadata);
        COMMENT ON COLUMN companies.metadata IS 'Additional company data from external sources';
    END IF;
END $$;