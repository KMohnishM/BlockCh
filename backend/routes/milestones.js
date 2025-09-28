const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../config/blockchain');

const router = express.Router();

// Create milestone
router.post('/', authMiddleware, [
  body('companyId').isUUID().withMessage('Valid company ID is required'),
  body('milestoneType').trim().isLength({ min: 1 }).withMessage('Milestone type is required'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('valuationImpact').optional().isNumeric()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { companyId, milestoneType, description, valuationImpact = 0 } = req.body;

  // Verify company ownership
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .eq('owner_id', req.user.id)
    .single();

  if (!company) {
    return res.status(403).json({
      success: false,
      message: 'Company not found or access denied'
    });
  }

  let blockchainData = null;

  // Handle blockchain milestone completion
  if (company.blockchain_token_id && req.user.walletAddress) {
    try {
      blockchainData = await blockchainService.completeMilestone(
        company.blockchain_token_id,
        milestoneType,
        description,
        valuationImpact
      );
    } catch (error) {
      console.error('Blockchain milestone error:', error);
    }
  }

  // Create milestone record
  const { data: milestone, error } = await supabase
    .from('milestones')
    .insert({
      company_id: companyId,
      milestone_type: milestoneType,
      description,
      valuation_impact: parseFloat(valuationImpact),
      blockchain_tx_hash: blockchainData?.txHash,
      is_blockchain_verified: !!blockchainData?.success,
      verified: false, // Will be verified by admin/automated process
      created_at: new Date().toISOString()
    })
    .select(`
      *,
      companies (
        name,
        blockchain_token_id
      )
    `)
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create milestone'
    });
  }

  // Update company milestone count
  await supabase.rpc('increment_milestone_count', {
    company_id: companyId
  });

  res.status(201).json({
    success: true,
    message: 'Milestone created successfully',
    data: {
      milestone,
      blockchain: blockchainData
    }
  });
}));

// Get company milestones
router.get('/company/:companyId', asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  const { data: milestones, error } = await supabase
    .from('milestones')
    .select(`
      *,
      companies (
        name,
        blockchain_token_id,
        owner_id
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch milestones'
    });
  }

  res.json({
    success: true,
    data: { milestones }
  });
}));

// Verify milestone (admin only)
router.patch('/:id/verify', authMiddleware, [
  body('verified').isBoolean(),
  body('verificationNotes').optional().trim()
], asyncHandler(async (req, res) => {
  // For now, allow company owners to verify their own milestones
  // In production, this should be restricted to admins or automated verification
  
  const { id } = req.params;
  const { verified, verificationNotes } = req.body;

  const { data: milestone } = await supabase
    .from('milestones')
    .select(`
      *,
      companies!inner (
        owner_id,
        valuation
      )
    `)
    .eq('id', id)
    .single();

  if (!milestone || milestone.companies.owner_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Update milestone verification
  const { data: updatedMilestone, error } = await supabase
    .from('milestones')
    .update({
      verified,
      verification_notes: verificationNotes,
      verified_at: verified ? new Date().toISOString() : null,
      verified_by: verified ? req.user.id : null
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update milestone'
    });
  }

  // If milestone is verified and has valuation impact, update company valuation
  if (verified && milestone.valuation_impact > 0) {
    await supabase
      .from('companies')
      .update({
        valuation: milestone.companies.valuation + milestone.valuation_impact,
        updated_at: new Date().toISOString()
      })
      .eq('id', milestone.company_id);
  }

  res.json({
    success: true,
    message: 'Milestone verification updated',
    data: { milestone: updatedMilestone }
  });
}));

module.exports = router;