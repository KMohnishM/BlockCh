const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../config/blockchain');

const router = express.Router();

// Validation middleware
const validateInvestment = [
  body('companyId').isUUID().withMessage('Valid company ID is required'),
  body('amount').isNumeric().withMessage('Investment amount must be a number'),
  body('useBlockchain').optional().isBoolean()
];

// Invest in a company
router.post('/', authMiddleware, validateInvestment, asyncHandler(async (req, res) => {
  console.log('💰 Investment Request Received');
  console.log('User ID:', req.user.id);
  console.log('Request Body:', req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { companyId, amount, useBlockchain = true } = req.body;
  const investorId = req.user.id;
  const investmentAmount = parseFloat(amount);
  
  console.log('📊 Investment Details:');
  console.log('- Company ID:', companyId);
  console.log('- Investor ID:', investorId);
  console.log('- Amount:', investmentAmount);
  console.log('- Use Blockchain:', useBlockchain);

  if (investmentAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Investment amount must be greater than 0'
    });
  }

  // Get company details
  console.log('🏢 Fetching company details...');
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  console.log('Company fetch result:', { company: company?.name, error: companyError });

  if (companyError || !company) {
    console.log('❌ Company not found:', companyError);
    return res.status(404).json({
      success: false,
      message: 'Company not found'
    });
  }
  
  console.log('✅ Company found:', {
    name: company.name,
    is_active: company.is_active,
    current_total_investment: company.total_investment,
    current_investor_count: company.investor_count
  });

  if (!company.is_active) {
    return res.status(400).json({
      success: false,
      message: 'Company is not accepting investments'
    });
  }

  if (company.owner_id === investorId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot invest in your own company'
    });
  }

  // Calculate ownership percentage
  const currentTotalInvestment = company.total_investment || 0;
  const ownershipPercentage = (investmentAmount / (company.valuation + investmentAmount)) * 100;

  let blockchainData = null;

  // Handle blockchain investment
  if (useBlockchain && company.blockchain_token_id && req.user.walletAddress) {
    try {
      blockchainData = await blockchainService.investInCompany(
        company.blockchain_token_id,
        investmentAmount
      );

      if (!blockchainData.success) {
        return res.status(400).json({
          success: false,
          message: `Blockchain investment failed: ${blockchainData.error}`
        });
      }
    } catch (error) {
      console.error('Blockchain investment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Blockchain investment failed'
      });
    }
  }

  // Create investment record
  console.log('💾 Creating investment record...');
  const investmentRecord = {
    company_id: companyId,
    investor_id: investorId,
    amount: investmentAmount,
    ownership_percentage: ownershipPercentage,
    blockchain_tx_hash: blockchainData?.txHash,
    is_blockchain_verified: !!blockchainData?.success,
    investment_type: (useBlockchain && blockchainData?.success) ? 'blockchain' : 'traditional',
    created_at: new Date().toISOString()
  };
  
  console.log('Investment record to insert:', investmentRecord);
  
  const { data: investment, error: investmentError } = await supabaseAdmin
    .from('investments')
    .insert(investmentRecord)
    .select(`
      *,
      companies (
        name,
        industry,
        blockchain_token_id
      ),
      profiles:investor_id (
        first_name,
        last_name,
        wallet_address
      )
    `)
    .single();

  if (investmentError) {
    console.error('❌ Investment creation error:', investmentError);
    return res.status(500).json({
      success: false,
      message: 'Failed to record investment'
    });
  }
  
  console.log('✅ Investment created successfully:', investment.id);

  // Update company's total investment
  console.log('🔄 Updating company totals...');
  const newTotalInvestment = currentTotalInvestment + investmentAmount;
  console.log('New total investment:', newTotalInvestment);
  
  const { data: updatedCompany, error: updateError } = await supabaseAdmin
    .from('companies')
    .update({
      total_investment: newTotalInvestment,
      updated_at: new Date().toISOString()
    })
    .eq('id', companyId)
    .select('id, name, total_investment, investor_count');
    
  if (updateError) {
    console.error('❌ Company update error:', updateError);
  } else {
    console.log('✅ Company updated successfully:', updatedCompany?.[0] || updatedCompany);
  }
  
  // Update investor count separately
  console.log('👥 Updating investor count...');
  
  // First, get current unique investor count
  const { count: uniqueInvestors, error: countQueryError } = await supabaseAdmin
    .from('investments')
    .select('investor_id', { count: 'exact' })
    .eq('company_id', companyId);
    
  if (countQueryError) {
    console.error('❌ Error counting investors:', countQueryError);
  } else {
    console.log('📊 Current investor count:', uniqueInvestors);
    
    // Update the company with new investor count
    const { error: investorCountUpdateError } = await supabaseAdmin
      .from('companies')
      .update({ investor_count: uniqueInvestors })
      .eq('id', companyId);
      
    if (investorCountUpdateError) {
      console.error('❌ Investor count update error:', investorCountUpdateError);
    } else {
      console.log('✅ Investor count updated to:', uniqueInvestors);
    }
  }

  // Create activity log
  console.log('📝 Creating activity log...');
  const { data: activityLog, error: activityError } = await supabaseAdmin
    .from('user_activities')
    .insert({
      user_id: investorId,
      activity_type: 'investment_made',
      description: `Invested ${useBlockchain ? investmentAmount + ' ETH' : '$' + investmentAmount} in ${company.name}`,
      metadata: { 
        companyId, 
        amount: investmentAmount,
        txHash: blockchainData?.txHash
      }
    })
    .select('*')
    .single();
    
  if (activityError) {
    console.error('❌ Activity log creation error:', activityError);
  } else {
    console.log('✅ Activity log created:', activityLog.id);
  }

  // Send notification to company owner (you can implement this later)
  // await sendNotification(company.owner_id, 'new_investment', {...});

  // Emit real-time updates via Socket.IO
  try {
    const io = req.app.get('io');
    if (io) {
      // Notify the investing user (portfolio updates)
      io.to(`user:${investorId}`).emit('portfolio:updated', {
        type: 'investment-created',
        investmentId: investment.id,
        amount: investment.amount,
        companyId,
        timestamp: Date.now()
      });

      // Notify company room for dashboards listening to company changes
      io.to(`company:${companyId}`).emit('investment:created', {
        id: investment.id,
        amount: investment.amount,
        investmentType: investment.investment_type,
        isBlockchainVerified: investment.is_blockchain_verified,
        companyId,
        companyName: company.name,
        createdAt: investment.created_at
      });

      // Also broadcast updated company aggregates (best-effort)
      io.to(`company:${companyId}`).emit('company:updated', {
        id: companyId,
        totalInvestment: newTotalInvestment,
        investorCount: uniqueInvestors
      });
    }
  } catch (e) {
    console.warn('Socket emit failed:', e.message);
  }

  res.status(201).json({
    success: true,
    message: 'Investment successful',
    data: {
      investment: {
        id: investment.id,
        amount: investment.amount,
        ownershipPercentage: investment.ownership_percentage,
        company: {
          id: companyId,
          name: investment.companies.name,
          industry: investment.companies.industry,
          tokenId: investment.companies.blockchain_token_id
        },
        isBlockchainVerified: investment.is_blockchain_verified,
        createdAt: investment.created_at
      },
      blockchain: blockchainData
    }
  });
}));

// Get user's investments
router.get('/my-investments', authMiddleware, asyncHandler(async (req, res) => {
  const investorId = req.user.id;

  const { data: investments, error } = await supabase
    .from('investments')
    .select(`
      *,
      companies (
        id,
        name,
        industry,
        valuation,
        blockchain_token_id,
        is_blockchain_verified,
        profiles:owner_id (
          first_name,
          last_name
        )
      )
    `)
    .eq('investor_id', investorId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch investments'
    });
  }

  // Calculate current values and returns
  const enhancedInvestments = await Promise.all(investments.map(async (investment) => {
    let currentValue = investment.amount;
    let returnPercentage = 0;

    // Get current company valuation to calculate current investment value
    if (investment.companies) {
      const currentValuation = investment.companies.valuation;
      currentValue = (investment.ownership_percentage / 100) * currentValuation;
      returnPercentage = ((currentValue - investment.amount) / investment.amount) * 100;
    }

    // Get blockchain data if available
    let blockchainVerification = null;
    if (investment.companies?.blockchain_token_id) {
      try {
        const blockchainResult = await blockchainService.getCompanyInvestments(
          investment.companies.blockchain_token_id
        );
        if (blockchainResult.success) {
          // Find this specific investment in blockchain data
          blockchainVerification = blockchainResult.data.find(
            inv => inv.investor.toLowerCase() === req.user.walletAddress?.toLowerCase()
          );
        }
      } catch (error) {
        console.error('Error fetching blockchain investment data:', error);
      }
    }

    return {
      id: investment.id,
      amount: investment.amount,
      currentValue,
      returnPercentage,
      ownershipPercentage: investment.ownership_percentage,
      investmentType: investment.investment_type,
      isBlockchainVerified: investment.is_blockchain_verified,
      company: {
        id: investment.companies.id,
        name: investment.companies.name,
        industry: investment.companies.industry,
        valuation: investment.companies.valuation,
        owner: {
          firstName: investment.companies.profiles?.first_name,
          lastName: investment.companies.profiles?.last_name
        }
      },
      blockchainVerification,
      createdAt: investment.created_at
    };
  }));

  // Calculate portfolio summary
  const totalInvested = enhancedInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const currentPortfolioValue = enhancedInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalReturn = currentPortfolioValue - totalInvested;
  const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  res.json({
    success: true,
    data: {
      investments: enhancedInvestments,
      summary: {
        totalInvested,
        currentPortfolioValue,
        totalReturn,
        totalReturnPercentage,
        investmentCount: enhancedInvestments.length
      }
    }
  });
}));

// Get investment details
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const { data: investment, error } = await supabase
    .from('investments')
    .select(`
      *,
      companies (
        *,
        profiles:owner_id (
          first_name,
          last_name,
          wallet_address
        )
      ),
      profiles:investor_id (
        first_name,
        last_name,
        wallet_address
      )
    `)
    .eq('id', id)
    .single();

  if (error || !investment) {
    return res.status(404).json({
      success: false,
      message: 'Investment not found'
    });
  }

  // Check if user has access to this investment
  if (investment.investor_id !== userId && investment.companies.owner_id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Calculate current value
  let currentValue = investment.amount;
  let returnPercentage = 0;
  
  if (investment.companies) {
    const currentValuation = investment.companies.valuation;
    currentValue = (investment.ownership_percentage / 100) * currentValuation;
    returnPercentage = ((currentValue - investment.amount) / investment.amount) * 100;
  }

  res.json({
    success: true,
    data: {
      investment: {
        id: investment.id,
        amount: investment.amount,
        currentValue,
        returnPercentage,
        ownershipPercentage: investment.ownership_percentage,
        investmentType: investment.investment_type,
        isBlockchainVerified: investment.is_blockchain_verified,
        txHash: investment.blockchain_tx_hash,
        company: {
          id: investment.companies.id,
          name: investment.companies.name,
          description: investment.companies.description,
          industry: investment.companies.industry,
          valuation: investment.companies.valuation,
          tokenId: investment.companies.blockchain_token_id,
          owner: {
            firstName: investment.companies.profiles?.first_name,
            lastName: investment.companies.profiles?.last_name,
            walletAddress: investment.companies.profiles?.wallet_address
          }
        },
        investor: {
          firstName: investment.profiles?.first_name,
          lastName: investment.profiles?.last_name,
          walletAddress: investment.profiles?.wallet_address
        },
        createdAt: investment.created_at
      }
    }
  });
}));

// Get company's investments (for company owners)
router.get('/company/:companyId', authMiddleware, asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const userId = req.user.id;

  // Verify ownership
  const { data: company } = await supabase
    .from('companies')
    .select('owner_id')
    .eq('id', companyId)
    .single();

  if (!company || company.owner_id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'You can only view investments for your own companies'
    });
  }

  const { data: investments, error } = await supabase
    .from('investments')
    .select(`
      *,
      profiles:investor_id (
        first_name,
        last_name,
        wallet_address,
        investor_type
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch company investments'
    });
  }

  const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const investorCount = investments.length;

  res.json({
    success: true,
    data: {
      investments: investments.map(inv => ({
        id: inv.id,
        amount: inv.amount,
        ownershipPercentage: inv.ownership_percentage,
        investmentType: inv.investment_type,
        isBlockchainVerified: inv.is_blockchain_verified,
        investor: {
          firstName: inv.profiles?.first_name,
          lastName: inv.profiles?.last_name,
          walletAddress: inv.profiles?.wallet_address,
          investorType: inv.profiles?.investor_type
        },
        createdAt: inv.created_at
      })),
      summary: {
        totalInvestment,
        investorCount,
        averageInvestment: investorCount > 0 ? totalInvestment / investorCount : 0
      }
    }
  });
}));

module.exports = router;