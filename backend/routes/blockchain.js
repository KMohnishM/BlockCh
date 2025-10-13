const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../config/blockchain');

// Diagnostics: blockchain status
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const status = {
      hasProvider: !!blockchainService.provider,
      hasSigner: !!blockchainService.signer,
      hasContract: !!blockchainService.contract,
      env: {
        rpc: !!process.env.BLOCKCHAIN_RPC_URL,
        contract: !!process.env.CONTRACT_ADDRESS,
        privateKey: !!process.env.PRIVATE_KEY
      }
    };
    let network = null;
    if (blockchainService.provider) {
      try { network = await blockchainService.provider.getNetwork(); } catch {}
    }
    res.json({ success: true, data: { status, network } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Status check failed', error: e.message });
  }
}));

// Make a blockchain investment
router.post('/invest', authMiddleware, asyncHandler(async (req, res) => {
  const { companyId, amount, txHash } = req.body;
  const userId = req.user.id;

  if (!companyId || !amount || !txHash) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  // Get the company details first
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (companyError || !company) {
    return res.status(404).json({
      success: false,
      message: 'Company not found'
    });
  }

  // Convert amount (ETH -> USD) if possible and compute ownership
  const amountEth = parseFloat(amount);
  const rate = parseFloat(process.env.ETH_USD_RATE || '0');
  const amountUsd = Number.isFinite(rate) && rate > 0 ? amountEth * rate : amountEth; // fallback to 1:1 if no rate provided

  const ownershipPercentage = (amountUsd / (company.valuation + amountUsd)) * 100;
  console.log('📈 Blockchain investment conversion:', { amountEth, rate, amountUsd, ownershipPercentage });

  // Create investment record (store amount in USD-equivalent)
  const { data: investment, error: investmentError } = await supabaseAdmin
    .from('investments')
    .insert({
      company_id: companyId,
      investor_id: userId,
      amount: parseFloat(amountUsd.toFixed(2)),
      ownership_percentage: ownershipPercentage,
      blockchain_tx_hash: txHash,
      is_blockchain_verified: true,
      investment_type: 'blockchain',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (investmentError) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record investment',
      error: investmentError.message
    });
  }

  // Update company total investment and investor count (mirror traditional route behavior)
  const currentTotal = company.total_investment || 0;
  const newTotalInvestment = currentTotal + parseFloat(amountUsd.toFixed(2));
  console.log('🔄 Updating company totals (blockchain):', { currentTotal, add: amountUsd, newTotalInvestment });

  const { data: updatedCompany, error: updateError } = await supabaseAdmin
    .from('companies')
    .update({
      total_investment: newTotalInvestment,
      updated_at: new Date().toISOString()
    })
    .eq('id', companyId)
    .select('id, name, total_investment, investor_count');

  if (updateError) {
    console.error('❌ Company update error (blockchain):', updateError);
  } else {
    console.log('✅ Company updated successfully (blockchain):', updatedCompany?.[0] || updatedCompany);
  }

  // Update investor count
  const { count: uniqueInvestors, error: countQueryError } = await supabaseAdmin
    .from('investments')
    .select('investor_id', { count: 'exact' })
    .eq('company_id', companyId);

  if (countQueryError) {
    console.error('❌ Error counting investors (blockchain):', countQueryError);
  } else {
    console.log('📊 Current investor count (blockchain):', uniqueInvestors);
    const { error: investorCountUpdateError } = await supabaseAdmin
      .from('companies')
      .update({ investor_count: uniqueInvestors })
      .eq('id', companyId);
    if (investorCountUpdateError) {
      console.error('❌ Investor count update error (blockchain):', investorCountUpdateError);
    } else {
      console.log('✅ Investor count updated (blockchain):', uniqueInvestors);
    }
  }

  // Create activity log
  await supabaseAdmin
    .from('user_activities')
    .insert({
      user_id: userId,
      activity_type: 'investment_made',
      description: `Invested ${amountEth} ETH (~$${amountUsd.toFixed(2)}) in ${company.name}`,
      metadata: { companyId, investmentId: investment.id, txHash, amountEth, amountUsd }
    });

  // Emit real-time updates via Socket.IO
  try {
    const io = req.app.get('io');
    if (io) {
      // Notify the investing user (portfolio updates)
      io.to(`user:${userId}`).emit('portfolio:updated', {
        type: 'investment-created',
        investmentId: investment.id,
        amount: parseFloat(amountUsd.toFixed(2)),
        companyId,
        timestamp: Date.now()
      });

      // Notify company room for dashboards listening to company changes
      io.to(`company:${companyId}`).emit('investment:created', {
        id: investment.id,
        amount: parseFloat(amountUsd.toFixed(2)),
        investmentType: 'blockchain',
        isBlockchainVerified: true,
        companyId,
        companyName: company.name,
        createdAt: investment.created_at
      });

      // Also broadcast updated company aggregates
      io.to(`company:${companyId}`).emit('company:updated', {
        id: companyId,
        totalInvestment: newTotalInvestment,
        investorCount: uniqueInvestors
      });
    }
  } catch (e) {
    console.warn('Socket emit failed (blockchain):', e.message);
  }

  res.json({
    success: true,
    message: 'Investment recorded successfully',
    data: {
      investment: {
        id: investment.id,
        amount: parseFloat(amountUsd.toFixed(2)),
        ownershipPercentage: ownershipPercentage,
        investmentType: 'blockchain',
        isBlockchainVerified: true,
        company: {
          id: investment.company_id,
          name: company.name,
          industry: company.industry,
          tokenId: company.blockchain_token_id
        },
        txHash: investment.blockchain_tx_hash,
        createdAt: investment.created_at
      }
    }
  });
}));

// Verify blockchain transaction
router.post('/verify-transaction', authMiddleware, asyncHandler(async (req, res) => {
  const { txHash } = req.body;
  
  if (!txHash) {
    return res.status(400).json({
      success: false,
      message: 'Transaction hash is required'
    });
  }

  try {
    // Verify transaction on blockchain
    const txReceipt = await blockchainService.provider.getTransactionReceipt(txHash);
    
    if (!txReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found on blockchain'
      });
    }

    // Check if transaction was successful
    if (txReceipt.status === 1) {
      return res.json({
        success: true,
        message: 'Transaction verified successfully',
        data: {
          verified: true,
          blockNumber: txReceipt.blockNumber,
          gasUsed: txReceipt.gasUsed.toString()
        }
      });
    } else {
      return res.json({
        success: false,
        message: 'Transaction failed on blockchain',
        data: {
          verified: false,
          blockNumber: txReceipt.blockNumber,
          gasUsed: txReceipt.gasUsed.toString()
        }
      });
    }
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify transaction',
      error: error.message
    });
  }
}));

module.exports = router;