require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');

async function fixMillionsConversion() {
  try {
    console.log('🔧 Starting millions conversion fix...');

    // Step 1: Fix companies table - multiply by 1 million
    console.log('\n📊 Fixing companies table...');
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name, valuation, total_investment');

    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError);
      return;
    }

    let companiesUpdated = 0;
    for (const company of companies) {
      // Only update if values are small (indicating they're in millions format)
      if (company.valuation < 1000000 && company.valuation > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('companies')
          .update({
            valuation: company.valuation * 1000000,
            total_investment: (company.total_investment || 0) * 1000000
          })
          .eq('id', company.id);

        if (!updateError) {
          companiesUpdated++;
          if (companiesUpdated % 50 === 0) {
            console.log(`  📈 Updated ${companiesUpdated} companies...`);
          }
        } else {
          console.error(`❌ Error updating ${company.name}:`, updateError);
        }
      }
    }
    console.log(`✅ Updated ${companiesUpdated} companies`);

    // Step 2: Fix funding_rounds table
    console.log('\n💰 Fixing funding_rounds table...');
    const { data: fundingRounds, error: fundingError } = await supabaseAdmin
      .from('funding_rounds')
      .select('id, target_amount, raised_amount');

    if (fundingError) {
      console.error('❌ Error fetching funding rounds:', fundingError);
      return;
    }

    let fundingUpdated = 0;
    for (const round of fundingRounds) {
      if (round.target_amount < 1000000 && round.target_amount > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('funding_rounds')
          .update({
            target_amount: round.target_amount * 1000000,
            raised_amount: (round.raised_amount || 0) * 1000000
          })
          .eq('id', round.id);

        if (!updateError) {
          fundingUpdated++;
        }
      }
    }
    console.log(`✅ Updated ${fundingUpdated} funding rounds`);

    // Step 3: Fix investments table  
    console.log('\n🤝 Fixing investments table...');
    const { data: investments, error: investError } = await supabaseAdmin
      .from('investments')
      .select('id, amount');

    if (investError) {
      console.error('❌ Error fetching investments:', investError);
      return;
    }

    let investmentsUpdated = 0;
    for (const investment of investments) {
      if (investment.amount < 1000000 && investment.amount > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('investments')
          .update({
            amount: investment.amount * 1000000
          })
          .eq('id', investment.id);

        if (!updateError) {
          investmentsUpdated++;
        }
      }
    }
    console.log(`✅ Updated ${investmentsUpdated} investments`);

    // Step 4: Fix milestones table
    console.log('\n🎯 Fixing milestones table...');
    const { data: milestones, error: milestonesError } = await supabaseAdmin
      .from('milestones')
      .select('id, valuation_impact');

    if (milestonesError) {
      console.error('❌ Error fetching milestones:', milestonesError);
      return;
    }

    let milestonesUpdated = 0;
    for (const milestone of milestones) {
      if (milestone.valuation_impact && milestone.valuation_impact < 1000000 && milestone.valuation_impact > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('milestones')
          .update({
            valuation_impact: milestone.valuation_impact * 1000000
          })
          .eq('id', milestone.id);

        if (!updateError) {
          milestonesUpdated++;
        }
      }
    }
    console.log(`✅ Updated ${milestonesUpdated} milestones`);

    // Step 5: Update company aggregates again
    console.log('\n🔄 Recalculating company aggregates...');
    const { updateCompanyAggregates } = require('./updateCompanyAggregates');
    await updateCompanyAggregates();

    console.log('\n🎉 Millions conversion fix completed!');
    console.log('\n📊 Summary:');
    console.log(`  Companies: ${companiesUpdated} updated`);
    console.log(`  Funding rounds: ${fundingUpdated} updated`);
    console.log(`  Investments: ${investmentsUpdated} updated`);
    console.log(`  Milestones: ${milestonesUpdated} updated`);

    // Verification
    console.log('\n🔍 Verification - Sample companies after fix:');
    const { data: sampleCompanies } = await supabaseAdmin
      .from('companies')
      .select('name, valuation, total_investment, investor_count')
      .order('total_investment', { ascending: false })
      .limit(3);

    sampleCompanies?.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name}:`);
      console.log(`     Valuation: $${(company.valuation / 1000000).toFixed(2)}M`);
      console.log(`     Total Investment: $${(company.total_investment / 1000000).toFixed(2)}M`);
      console.log(`     Investors: ${company.investor_count}`);
    });

  } catch (error) {
    console.error('🚨 Fix failed:', error);
  }
}

// Run the fix
if (require.main === module) {
  fixMillionsConversion().catch(console.error);
}

module.exports = { fixMillionsConversion };