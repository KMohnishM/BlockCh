const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get user's portfolio summary
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Prevent caching to ensure fresh portfolio data after changes
  res.set('Cache-Control', 'no-store');

  // Get all investments with company details
  const { data: investments, error } = await supabaseAdmin
    .from('investments')
    .select(`
      *,
      companies (
        id,
        name,
        industry,
        valuation,
        total_investment,
        created_at
      )
    `)
    .eq('investor_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolio data'
    });
  }

  // Calculate portfolio metrics
  let totalInvested = 0;
  let currentPortfolioValue = 0;
  const industryBreakdown = {};
  const performanceData = [];

  const enhancedInvestments = investments.map(investment => {
    const { companies: company } = investment;
    
    // Calculate current value based on ownership percentage
    const currentValue = (investment.ownership_percentage / 100) * company.valuation;
    const returnAmount = currentValue - investment.amount;
    const returnPercentage = (returnAmount / investment.amount) * 100;

    totalInvested += investment.amount;
    currentPortfolioValue += currentValue;

    // Industry breakdown
    if (!industryBreakdown[company.industry]) {
      industryBreakdown[company.industry] = {
        industry: company.industry,
        totalInvested: 0,
        currentValue: 0,
        companyCount: 0
      };
    }
    industryBreakdown[company.industry].totalInvested += investment.amount;
    industryBreakdown[company.industry].currentValue += currentValue;
    industryBreakdown[company.industry].companyCount += 1;

    // Performance data for charts
    performanceData.push({
      date: investment.created_at,
      investmentAmount: investment.amount,
      currentValue: currentValue
    });

    return {
      id: investment.id,
      amount: investment.amount,
      currentValue,
      returnAmount,
      returnPercentage,
      ownershipPercentage: investment.ownership_percentage,
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
        valuation: company.valuation
      },
      createdAt: investment.created_at
    };
  });

  const totalReturn = currentPortfolioValue - totalInvested;
  const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  // Top performing investments
  const topPerformers = enhancedInvestments
    .sort((a, b) => b.returnPercentage - a.returnPercentage)
    .slice(0, 5);

  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentInvestments = enhancedInvestments.filter(
    inv => new Date(inv.createdAt) >= thirtyDaysAgo
  );

  res.json({
    success: true,
    data: {
      summary: {
        totalInvested,
        currentPortfolioValue,
        totalReturn,
        totalReturnPercentage,
        investmentCount: investments.length,
        companiesCount: new Set(investments.map(inv => inv.companies.id)).size
      },
      investments: enhancedInvestments,
      industryBreakdown: Object.values(industryBreakdown),
      topPerformers,
      recentActivity: recentInvestments,
      performanceHistory: performanceData.sort((a, b) => new Date(a.date) - new Date(b.date))
    }
  });
}));

// Get portfolio performance over time
router.get('/performance', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = '1M' } = req.query;

  res.set('Cache-Control', 'no-store');

  try {
    // Simplified performance data for now
    const performanceData = [
      { date: '2025-08-28', value: 95000, investment: 100000 },
      { date: '2025-09-05', value: 102000, investment: 100000 },
      { date: '2025-09-12', value: 98000, investment: 100000 },
      { date: '2025-09-19', value: 110000, investment: 100000 },
      { date: '2025-09-26', value: 115000, investment: 100000 },
      { date: '2025-09-28', value: 120000, investment: 100000 }
    ];

    // Calculate performance metrics
    const startValue = performanceData[0]?.value || 0;
    const endValue = performanceData[performanceData.length - 1]?.value || 0;
    const totalReturn = endValue - startValue;
    const totalReturnPercentage = startValue > 0 ? ((totalReturn / startValue) * 100) : 0;

    res.json({
      success: true,
      data: {
        timeline: performanceData,
        summary: {
          totalInvestment: 100000,
          currentValue: endValue,
          totalReturn,
          totalReturnPercentage: totalReturnPercentage.toFixed(2),
          period
        }
      }
    });

  } catch (error) {
    console.error('Performance data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance data',
      error: error.message
    });
  }
}));

// Get portfolio analytics
router.get('/analytics', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  res.set('Cache-Control', 'no-store');

  // Complex analytics query
  const { data: analytics, error } = await supabaseAdmin.rpc('get_portfolio_analytics', {
    p_user_id: userId
  });

  if (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }

  res.json({
    success: true,
    data: analytics || {
      diversificationScore: 0,
      riskLevel: 'Unknown',
      averageCompanyAge: 0,
      sectorAllocation: [],
      investmentTrends: []
    }
  });
}));

module.exports = router;