require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');

// Helper function to safely parse numbers
function safeParseFloat(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Helper function to safely parse integers
function safeParseInt(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = parseInt(value);
  return isNaN(parsed) ? 0 : parsed;
}

async function uploadCompanies() {
  try {
    console.log('Starting company data upload...');
    
    // Test Supabase connection first
    console.log('Testing Supabase connection...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('companies')
      .select('count', { count: 'exact', head: true });

    if (testError) {
      console.error('Supabase connection failed:', testError);
      return;
    }
    console.log('✅ Supabase connection successful');

    // Read the JSON file
    const jsonFilePath = path.join(__dirname, '../../csvjson_updated.json');
    console.log('Reading JSON file from:', jsonFilePath);
    
    if (!fs.existsSync(jsonFilePath)) {
      console.error('JSON file not found at:', jsonFilePath);
      return;
    }

    const rawData = fs.readFileSync(jsonFilePath, 'utf8');
    const companiesData = JSON.parse(rawData);

    console.log(`Found ${companiesData.length} companies to upload`);

    // Create or get a system user
    let ownerId = '00000000-0000-0000-0000-000000000000'; // Default UUID
    
    console.log('Using owner ID:', ownerId);

    // Process companies in smaller batches to avoid timeouts
    const batchSize = 50;
    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < companiesData.length; i += batchSize) {
      const batch = companiesData.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(companiesData.length/batchSize)} (${batch.length} companies)...`);
      
      // Transform data to match database schema
      const transformedBatch = [];
      
      for (const company of batch) {
        // Skip companies with missing essential data
        if (!company.CompanyName || company.CompanyName.trim() === '') {
          console.log(`Skipping company with missing name: ${JSON.stringify(company)}`);
          skipped++;
          continue;
        }

        // Clean and validate company name
        const companyName = company.CompanyName.trim();
        if (companyName.length > 255) {
          console.log(`Truncating long company name: ${companyName}`);
        }

        const transformedCompany = {
          name: companyName.substring(0, 255),
          description: `${companyName} is a ${company.Industry || 'Technology'} company${company['Founded At'] ? ` founded in ${company['Founded At']}` : ''}. ${company.Headquarters ? `Based in ${company.Headquarters}` : 'Based in India'}${company.Employees ? ` with ${company.Employees} employees` : ''}.`,
          industry: (company.Industry || 'Technology').substring(0, 100),
          valuation: safeParseFloat(company['Total Funding']),
          total_investment: safeParseFloat(company['Total Funding']),
          owner_id: ownerId,
          is_active: company.Status === 1 || company.Status === '1',
          metadata: {
            original_id: company.id,
            headquarters: company.Headquarters,
            employees: safeParseInt(company.Employees),
            founded_at: safeParseInt(company['Founded At']),
            funding_rounds: safeParseInt(company['Funding Rounds']),
            acquisitions: safeParseInt(company['Number of Acquisitions']),
            revenue_2023: safeParseFloat(company['FY 2022-23 Revenue']),
            profit_loss: safeParseFloat(company['Profit_Loss']),
            latest_funding_round: company['Latest Funding Round'],
            expenses_2023: safeParseFloat(company['FY 2022-23 Expenses']),
            cash_flow: safeParseFloat(company['Net Cash Flow From Operations'])
          }
        };

        transformedBatch.push(transformedCompany);
      }

      if (transformedBatch.length === 0) {
        console.log('No valid companies in this batch, skipping...');
        continue;
      }

      try {
        const { data, error } = await supabaseAdmin
          .from('companies')
          .insert(transformedBatch)
          .select('id, name');

        if (error) {
          console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error.message);
          
          // Try inserting one by one to identify problematic records
          console.log('Attempting individual inserts...');
          for (const company of transformedBatch) {
            try {
              const { data: singleData, error: singleError } = await supabaseAdmin
                .from('companies')
                .insert([company])
                .select('id, name');

              if (singleError) {
                console.error(`Failed to insert ${company.name}:`, singleError.message);
                errors++;
              } else {
                processed++;
                console.log(`✅ Inserted: ${company.name}`);
              }
            } catch (singleErr) {
              console.error(`Exception inserting ${company.name}:`, singleErr.message);
              errors++;
            }
          }
        } else {
          processed += data.length;
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} completed: ${data.length} companies inserted`);
        }
      } catch (batchError) {
        console.error(`Batch exception:`, batchError.message);
        errors += transformedBatch.length;
      }

      // Add delay between batches
      if (i + batchSize < companiesData.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log('\n=== Upload Summary ===');
    console.log(`Total companies in file: ${companiesData.length}`);
    console.log(`Successfully processed: ${processed}`);
    console.log(`Errors: ${errors}`);
    console.log(`Skipped (invalid data): ${skipped}`);
    console.log(`Success rate: ${((processed / (companiesData.length - skipped)) * 100).toFixed(2)}%`);

    // Verify the upload
    const { data: verificationCount, error: verifyError } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true });

    if (!verifyError) {
      console.log(`Total companies now in database: ${verificationCount}`);
    }

    console.log('\n✅ Upload process completed!');

  } catch (error) {
    console.error('Upload failed:', error);
  }
}

// Run the upload
async function main() {
  console.log('🚀 Starting Vyaapar.AI Company Data Upload');
  console.log('==========================================\n');
  
  await uploadCompanies();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadCompanies };