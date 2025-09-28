require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');

// Helper functions
function safeParseFloat(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function safeParseInt(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = parseInt(value);
  return isNaN(parsed) ? 0 : parsed;
}

function generateRandomDate(startYear, endYear) {
  const start = new Date(`${startYear}-01-01`);
  const end = new Date(`${endYear}-12-31`);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function populateAllTables() {
  try {
    console.log('🚀 Starting comprehensive data population...');

    // Read JSON data
    const jsonFilePath = path.join(__dirname, '../../csvjson_updated.json');
    const rawData = fs.readFileSync(jsonFilePath, 'utf8');
    const companiesData = JSON.parse(rawData);

    console.log(`📊 Processing ${companiesData.length} companies...`);

    // Get existing companies from database
    const { data: existingCompanies, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, valuation, created_at, owner_id');

    if (companyError) {
      console.error('❌ Error fetching companies:', companyError);
      return;
    }

    console.log(`✅ Found ${existingCompanies.length} existing companies in database`);

    // Create a map for quick lookup
    const companyMap = new Map();
    existingCompanies.forEach(company => {
      companyMap.set(company.name, company);
    });

    let processedCount = 0;
    let errorCount = 0;

    for (const jsonCompany of companiesData) {
      try {
        const companyName = jsonCompany.CompanyName?.trim();
        if (!companyName || !companyMap.has(companyName)) {
          continue; // Skip if company not found in database
        }

        const dbCompany = companyMap.get(companyName);
        console.log(`\n📈 Processing: ${companyName}`);

        // 1. CREATE FUNDING ROUNDS
        await createFundingRounds(dbCompany, jsonCompany);

        // 2. CREATE INVESTMENTS
        await createInvestments(dbCompany, jsonCompany);

        // 3. CREATE MILESTONES
        await createMilestones(dbCompany, jsonCompany);

        // 4. CREATE VALUATION HISTORY
        await createValuationHistory(dbCompany, jsonCompany);

        processedCount++;

        // Add small delay to avoid overwhelming the database
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log(`📊 Processed ${processedCount} companies...`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${jsonCompany.CompanyName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 Population Summary:');
    console.log(`✅ Successfully processed: ${processedCount} companies`);
    console.log(`❌ Errors: ${errorCount} companies`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

async function createFundingRounds(dbCompany, jsonCompany) {
  try {
    const fundingRounds = safeParseInt(jsonCompany['Funding Rounds']);
    const totalFunding = safeParseFloat(jsonCompany['Total Funding']);
    const latestRound = jsonCompany['Latest Funding Round'] || 'Seed';

    if (fundingRounds === 0 || totalFunding === 0) return;

    // Define round types in order
    const roundTypes = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth'];
    const rounds = [];

    for (let i = 0; i < Math.min(fundingRounds, 6); i++) {
      const roundName = i < roundTypes.length ? roundTypes[i] : `Round ${i + 1}`;
      const isLatest = (i === fundingRounds - 1);
      const targetAmount = totalFunding / fundingRounds; // Split evenly
      
      rounds.push({
        company_id: dbCompany.id,
        round_name: isLatest ? latestRound : roundName,
        target_amount: targetAmount,
        raised_amount: targetAmount * (Math.random() * 0.3 + 0.7), // 70-100% raised
        valuation_cap: targetAmount * (Math.random() * 2 + 3), // 3-5x target
        minimum_investment: Math.max(1000, targetAmount * 0.001), // Min $1000
        start_time: generateRandomDate(2020, 2023),
        end_time: generateRandomDate(2023, 2024),
        is_active: false,
        is_completed: true
      });
    }

    const { error } = await supabaseAdmin
      .from('funding_rounds')
      .insert(rounds);

    if (!error) {
      console.log(`  💰 Created ${rounds.length} funding rounds`);
    }
  } catch (error) {
    console.error(`  ❌ Funding rounds error: ${error.message}`);
  }
}

async function createInvestments(dbCompany, jsonCompany) {
  try {
    const fundingRounds = safeParseInt(jsonCompany['Funding Rounds']);
    const totalFunding = safeParseFloat(jsonCompany['Total Funding']);

    if (fundingRounds === 0 || totalFunding === 0) return;

    // Create simulated investments
    const investments = [];
    const investorsCount = Math.min(fundingRounds * 2, 10); // 2 investors per round, max 10

    for (let i = 0; i < investorsCount; i++) {
      const amount = totalFunding / investorsCount;
      const ownershipPercentage = (amount / dbCompany.valuation) * 100;

      investments.push({
        company_id: dbCompany.id,
        investor_id: dbCompany.owner_id, // Use same owner for simplicity
        amount: amount,
        ownership_percentage: Math.min(ownershipPercentage, 15), // Cap at 15%
        investment_type: 'traditional',
        created_at: generateRandomDate(2020, 2024)
      });
    }

    const { error } = await supabaseAdmin
      .from('investments')
      .insert(investments);

    if (!error) {
      console.log(`  🤝 Created ${investments.length} investments`);
    }
  } catch (error) {
    console.error(`  ❌ Investments error: ${error.message}`);
  }
}

async function createMilestones(dbCompany, jsonCompany) {
  try {
    const milestones = [];
    const acquisitions = safeParseInt(jsonCompany['Number of Acquisitions']);
    const revenue = safeParseFloat(jsonCompany['FY 2022-23 Revenue']);
    const profit = safeParseFloat(jsonCompany['Profit_Loss']);
    const employees = safeParseInt(jsonCompany['Employees']);

    // Acquisition milestones
    if (acquisitions > 0) {
      for (let i = 0; i < acquisitions; i++) {
        milestones.push({
          company_id: dbCompany.id,
          milestone_type: 'Acquisition',
          description: `Successfully completed acquisition #${i + 1}`,
          valuation_impact: 0.1, // 10% valuation increase
          verified: true,
          verified_at: generateRandomDate(2021, 2023),
          created_at: generateRandomDate(2021, 2023)
        });
      }
    }

    // Revenue milestones
    if (revenue > 0) {
      milestones.push({
        company_id: dbCompany.id,
        milestone_type: 'Revenue Target',
        description: `Achieved ₹${revenue}M revenue in FY 2022-23`,
        valuation_impact: revenue > 100 ? 0.2 : 0.1,
        verified: true,
        verified_at: new Date('2023-03-31'),
        created_at: new Date('2023-03-31')
      });
    }

    // Profitability milestone
    if (profit > 0) {
      milestones.push({
        company_id: dbCompany.id,
        milestone_type: 'Profitability',
        description: `Achieved profitability with ₹${profit}M profit`,
        valuation_impact: 0.25,
        verified: true,
        verified_at: new Date('2023-03-31'),
        created_at: new Date('2023-03-31')
      });
    }

    // Team growth milestones
    if (employees > 50) {
      const teamMilestone = employees > 500 ? '500+' : employees > 100 ? '100+' : '50+';
      milestones.push({
        company_id: dbCompany.id,
        milestone_type: 'Team Growth',
        description: `Scaled team to ${teamMilestone} employees`,
        valuation_impact: 0.05,
        verified: true,
        verified_at: generateRandomDate(2022, 2023),
        created_at: generateRandomDate(2022, 2023)
      });
    }

    if (milestones.length > 0) {
      const { error } = await supabaseAdmin
        .from('milestones')
        .insert(milestones);

      if (!error) {
        console.log(`  🎯 Created ${milestones.length} milestones`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Milestones error: ${error.message}`);
  }
}

async function createValuationHistory(dbCompany, jsonCompany) {
  try {
    const fundingRounds = safeParseInt(jsonCompany['Funding Rounds']);
    const currentValuation = dbCompany.valuation;

    if (fundingRounds === 0 || currentValuation === 0) return;

    const valuationHistory = [];
    let previousValuation = currentValuation * 0.1; // Start with 10% of current

    for (let i = 0; i < fundingRounds; i++) {
      const newValuation = previousValuation * (1.5 + Math.random()); // 1.5x to 2.5x growth
      
      valuationHistory.push({
        company_id: dbCompany.id,
        previous_valuation: previousValuation,
        new_valuation: newValuation,
        change_reason: `Funding Round ${i + 1}`,
        created_at: generateRandomDate(2020 + i, 2020 + i + 1)
      });

      previousValuation = newValuation;
    }

    const { error } = await supabaseAdmin
      .from('valuation_history')
      .insert(valuationHistory);

    if (!error) {
      console.log(`  📈 Created ${valuationHistory.length} valuation history records`);
    }
  } catch (error) {
    console.error(`  ❌ Valuation history error: ${error.message}`);
  }
}

// Run the population
if (require.main === module) {
  console.log('🎯 Starting Full Database Population from JSON');
  console.log('=============================================\n');
  populateAllTables().catch(console.error);
}

module.exports = { populateAllTables };