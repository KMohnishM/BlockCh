# Company Data Upload Guide

This guide explains how to upload your company data from the JSON file to Supabase.

## Prerequisites

1. **Supabase Setup**: Ensure your Supabase project is configured with the database schema
2. **Environment Variables**: Make sure your `.env` file contains:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
3. **JSON File**: The `csvjson_updated.json` file should be in the root of your project

## Steps to Upload

### 1. Prepare the Database

First, add the metadata column to your companies table by running this SQL in your Supabase SQL editor:

```sql
-- Add metadata column to companies table if it doesn't exist
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
```

### 2. Run the Upload Script

Navigate to the backend directory and run:

```bash
cd backend
npm run upload-companies
```

Or directly:
```bash
node scripts/uploadCompanies.js
```

## What the Script Does

1. **Data Validation**: Validates and cleans company data
2. **Batch Processing**: Processes companies in batches of 50 to avoid timeouts
3. **Error Handling**: Provides detailed error reporting and continues processing
4. **Data Mapping**: Maps your JSON fields to the database schema:

### Field Mapping

| JSON Field | Database Field | Notes |
|------------|---------------|-------|
| `CompanyName` | `name` | Company name (required) |
| `Industry` | `industry` | Business sector |
| `Total Funding` | `valuation` & `total_investment` | Financial data |
| `Status` | `is_active` | Active/inactive status |
| All other fields | `metadata` | Stored as JSON for future use |

### Metadata Fields Preserved

The script preserves all original data in the `metadata` JSONB column:
- `original_id`: Original ID from your data
- `headquarters`: Company location
- `employees`: Employee count
- `founded_at`: Founding year
- `funding_rounds`: Number of funding rounds
- `acquisitions`: Number of acquisitions
- `revenue_2023`: FY 2022-23 revenue
- `profit_loss`: Profit/loss data
- `latest_funding_round`: Most recent funding type
- `expenses_2023`: FY 2022-23 expenses
- `cash_flow`: Net cash flow from operations

## Monitoring Progress

The script provides real-time feedback:
- ✅ Successful uploads
- ❌ Errors with details
- 📊 Final summary with statistics

## Troubleshooting

### Common Issues

1. **Connection Error**: Check your Supabase credentials in `.env`
2. **Permission Error**: Ensure your service role key has the necessary permissions
3. **Data Validation Error**: Check for companies with missing names

### Error Recovery

If the upload fails partway through:
- The script continues processing other records
- You can safely re-run the script (it will skip duplicates based on unique constraints)
- Check the error messages for specific issues

## Post-Upload Verification

After successful upload:
1. Check your Supabase dashboard
2. Run queries to verify data integrity
3. Test your API endpoints with the new data

## Example Query to Check Data

```sql
SELECT 
    name,
    industry,
    valuation,
    metadata->>'headquarters' as headquarters,
    metadata->>'employees' as employees,
    created_at
FROM companies 
LIMIT 10;
```

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your JSON file format matches the expected structure
3. Ensure your Supabase schema includes all required tables and columns