const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../config/blockchain');

const router = express.Router();

// Create funding round
router.post('/', authMiddleware, [
  body('companyId').isUUID().withMessage('Valid company ID is required'),
  body('roundName').trim().isLength({ min: 1 }).withMessage('Round name is required'),
  body('targetAmount').isNumeric().withMessage('Target amount must be a number'),
  body('valuationCap').isNumeric().withMessage('Valuation cap must be a number'),
  body('minimumInvestment').optional().isNumeric(),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive number')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const {
    companyId,
    roundName,
    targetAmount,
    valuationCap,
    minimumInvestment = 100,
    duration
  } = req.body;

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

  const startTime = new Date();
  const endTime = new Date();
  endTime.setDate(endTime.getDate() + parseInt(duration));

  // Create funding round
  const { data: fundingRound, error } = await supabase
    .from('funding_rounds')
    .insert({
      company_id: companyId,
      round_name: roundName,
      target_amount: parseFloat(targetAmount),
      valuation_cap: parseFloat(valuationCap),
      minimum_investment: parseFloat(minimumInvestment),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      is_active: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create funding round'
    });
  }

  res.status(201).json({
    success: true,
    message: 'Funding round created successfully',
    data: { fundingRound }
  });
}));

// Get all active funding rounds
router.get('/active', asyncHandler(async (req, res) => {
  const { data: fundingRounds, error } = await supabase
    .from('funding_rounds')
    .select(`
      *,
      companies (
        id,
        name,
        description,
        industry,
        valuation,
        blockchain_token_id,
        profiles:owner_id (
          first_name,
          last_name
        )
      )
    `)
    .eq('is_active', true)
    .lte('start_time', new Date().toISOString())
    .gte('end_time', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch funding rounds'
    });
  }

  res.json({
    success: true,
    data: { fundingRounds }
  });
}));

// Get funding round details
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: fundingRound, error } = await supabase
    .from('funding_rounds')
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
      investments (
        id,
        amount,
        created_at,
        profiles:investor_id (
          first_name,
          last_name
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !fundingRound) {
    return res.status(404).json({
      success: false,
      message: 'Funding round not found'
    });
  }

  const totalRaised = fundingRound.investments.reduce((sum, inv) => sum + inv.amount, 0);
  const progressPercentage = (totalRaised / fundingRound.target_amount) * 100;
  const daysRemaining = Math.max(0, Math.ceil(
    (new Date(fundingRound.end_time) - new Date()) / (1000 * 60 * 60 * 24)
  ));

  res.json({
    success: true,
    data: {
      fundingRound: {
        ...fundingRound,
        totalRaised,
        progressPercentage,
        daysRemaining,
        investorCount: fundingRound.investments.length
      }
    }
  });
}));

// Update funding round
router.put('/:id', authMiddleware, [
  body('targetAmount').optional().isNumeric(),
  body('valuationCap').optional().isNumeric(),
  body('endTime').optional().isISO8601(),
  body('isActive').optional().isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const updates = req.body;

  // Verify ownership
  const { data: fundingRound } = await supabase
    .from('funding_rounds')
    .select(`
      *,
      companies!inner (
        owner_id
      )
    `)
    .eq('id', id)
    .single();

  if (!fundingRound || fundingRound.companies.owner_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const { data: updatedRound, error } = await supabase
    .from('funding_rounds')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update funding round'
    });
  }

  res.json({
    success: true,
    message: 'Funding round updated successfully',
    data: { fundingRound: updatedRound }
  });
}));

module.exports = router;