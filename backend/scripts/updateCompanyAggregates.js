require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

async function updateCompanyAggregates() {
  try {
    console.log('🔄 Starting company aggregates update...');

    // Get all companies
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name, total_investment, investor_count');

    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError);
      return;
    }

    console.log(`📊 Found ${companies.length} companies to update`);

    let updated = 0;
    let errors = 0;

    for (const company of companies) {
      try {
        console.log(`\n🔄 Processing: ${company.name}`);

        // Get total investment amount for this company
        const { data: investments, error: investError } = await supabaseAdmin
          .from('investments')
          .select('amount, investor_id')
          .eq('company_id', company.id);

        if (investError) {
          console.error(`❌ Error fetching investments for ${company.name}:`, investError);
          errors++;
          continue;
        }

        // Calculate aggregates
        const totalInvestment = investments.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
        const uniqueInvestors = new Set(investments.map(inv => inv.investor_id)).size;

        console.log(`  💰 Total Investment: $${totalInvestment.toFixed(2)}M`);
        console.log(`  👥 Unique Investors: ${uniqueInvestors}`);
        console.log(`  📊 Total Investment Records: ${investments.length}`);

        // Update company with aggregated data
        const { error: updateError } = await supabaseAdmin
          .from('companies')
          .update({
            total_investment: totalInvestment,
            investor_count: uniqueInvestors,
            updated_at: new Date().toISOString()
          })
          .eq('id', company.id);

        if (updateError) {
          console.error(`❌ Error updating ${company.name}:`, updateError);
          errors++;
        } else {
          updated++;
          console.log(`  ✅ Updated successfully`);
        }

      } catch (err) {
        console.error(`❌ Exception processing ${company.name}:`, err);
        errors++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n=== Update Summary ===');
    console.log(`✅ Successfully updated: ${updated} companies`);
    console.log(`❌ Errors: ${errors} companies`);
    console.log(`📊 Success rate: ${((updated / companies.length) * 100).toFixed(2)}%`);

    // Verify some results
    console.log('\n🔍 Verification - Top 5 companies by investment:');
    const { data: topCompanies } = await supabaseAdmin
      .from('companies')
      .select('name, total_investment, investor_count')
      .order('total_investment', { ascending: false })
      .limit(5);

    topCompanies?.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name}: $${company.total_investment}M (${company.investor_count} investors)`);
    });

    console.log('\n✅ Company aggregates update completed!');

  } catch (error) {
    console.error('🚨 Update failed:', error);
  }
}

// Run the update
if (require.main === module) {
  updateCompanyAggregates().catch(console.error);
}

module.exports = { updateCompanyAggregates };