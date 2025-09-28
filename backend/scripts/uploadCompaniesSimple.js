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

    // Check if we need to create a user profile first
    let ownerId = '00000000-0000-0000-0000-000000000000'; // Default UUID
    
    // Try to create or get an actual user for ownership
    try {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      if (!profile) {
        console.log('No profiles found. The companies will use a default owner ID.');
        console.log('You may want to create user profiles first for proper ownership.');
      } else {
        ownerId = profile.id;
        console.log('Using existing profile as owner:', ownerId);
      }
    } catch (err) {
      console.log('Using default owner ID for companies');
    }

    // Process companies in smaller batches to avoid timeouts
    const batchSize = 50;
    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < companiesData.length; i += batchSize) {
      const batch = companiesData.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(companiesData.length/batchSize)} (${batch.length} companies)...`);
      
      // Transform data to match database schema (without metadata)
      const transformedBatch = [];
      
      for (const company of batch) {
        // Skip companies with missing essential data
        if (!company.CompanyName || company.CompanyName.trim() === '') {
          console.log(`Skipping company with missing name`);
          skipped++;
          continue;
        }

        // Clean and validate company name
        const companyName = company.CompanyName.trim();
        
        // Create a comprehensive description with available data
        let description = `${companyName} is a ${company.Industry || 'Technology'} company`;
        if (company['Founded At']) description += ` founded in ${company['Founded At']}`;
        if (company.Headquarters) description += `. Based in ${company.Headquarters}`;
        if (company.Employees) description += ` with ${company.Employees} employees`;
        description += '.';
        
        // Add financial information to description
        if (company['Total Funding'] && parseFloat(company['Total Funding']) > 0) {
          description += ` The company has raised $${parseFloat(company['Total Funding']).toFixed(2)}M in total funding`;
        }
        if (company['Funding Rounds']) {
          description += ` across ${company['Funding Rounds']} funding rounds`;
        }
        if (company['Latest Funding Round']) {
          description += ` with the latest being a ${company['Latest Funding Round']} round`;
        }
        description += '.';

        const transformedCompany = {
          name: companyName.substring(0, 255),
          description: description.substring(0, 1000), // Limit description length
          industry: (company.Industry || 'Technology').substring(0, 100),
          valuation: safeParseFloat(company['Total Funding']) * 1000000, // Convert millions to actual value
          total_investment: safeParseFloat(company['Total Funding']) * 1000000, // Convert millions to actual value
          investor_count: safeParseInt(company['Funding Rounds']) || 0,
          owner_id: ownerId,
          is_active: company.Status === 1 || company.Status === '1'
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
            
            // Small delay between individual inserts
            await new Promise(resolve => setTimeout(resolve, 10));
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
    
    if (processed > 0) {
      console.log('\n📊 Next Steps:');
      console.log('1. Check your Supabase dashboard to verify the data');
      console.log('2. Consider adding the metadata column for additional data storage');
      console.log('3. Create user profiles for proper company ownership');
      console.log('4. Test your API endpoints with the new data');
    }

  } catch (error) {
    console.error('Upload failed:', error);
  }
}

// Run the upload
async function main() {
  console.log('🚀 Starting Vyaapar.AI Company Data Upload (Simple Version)');
  console.log('======================================================\n');
  
  await uploadCompanies();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadCompanies };