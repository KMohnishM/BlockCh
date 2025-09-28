const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const router = express.Router();

// Test endpoint to check database connection and company data
router.get('/test-companies', async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');

    // Test 1: Basic connection
    const { data: testConnection, error: connectionError } = await supabaseAdmin
      .from('companies')
      .select('count', { count: 'exact', head: true });

    console.log('✅ Connection test result:', { testConnection, connectionError });

    // Test 2: Get raw company data
    const { data: rawCompanies, error: rawError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .limit(5);

    console.log('📋 Raw companies data:', rawCompanies);
    console.log('❌ Raw query error:', rawError);

    // Test 3: Check is_active values
    const { data: activeCheck, error: activeError } = await supabaseAdmin
      .from('companies')
      .select('id, name, is_active')
      .limit(10);

    console.log('🔍 Active status check:', activeCheck);

    // Test 4: Count by active status
    const { count: activeCount } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: inactiveCount } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);

    const { count: nullCount } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .is('is_active', null);

    console.log('📊 Company counts by status:', {
      active: activeCount,
      inactive: inactiveCount,
      null: nullCount,
      total: testConnection
    });

    res.json({
      success: true,
      data: {
        connection: { testConnection, connectionError },
        rawSample: { companies: rawCompanies, error: rawError },
        activeSample: { companies: activeCheck, error: activeError },
        counts: {
          total: testConnection,
          active: activeCount,
          inactive: inactiveCount,
          nullActive: nullCount
        }
      }
    });

  } catch (error) {
    console.error('🚨 Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;