const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get user profile
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error || !profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found'
    });
  }

  res.json({
    success: true,
    data: {
      profile: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        walletAddress: profile.wallet_address,
        investorType: profile.investor_type,
        authMethod: profile.auth_method,
        createdAt: profile.created_at,
        lastLogin: profile.last_login
      }
    }
  });
}));

// Update user profile
router.put('/profile', authMiddleware, [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('investorType').optional().isIn(['individual', 'accredited', 'institutional'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const updates = {};
  const allowedFields = ['firstName', 'lastName', 'investorType'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      const dbField = field === 'firstName' ? 'first_name' : 
                     field === 'lastName' ? 'last_name' : 
                     field === 'investorType' ? 'investor_type' : field;
      updates[dbField] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid updates provided'
    });
  }

  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { profile: updatedProfile }
  });
}));

// Get user activity
router.get('/activity', authMiddleware, asyncHandler(async (req, res) => {
  const { data: activities, error } = await supabase
    .from('user_activities')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch activity'
    });
  }

  res.json({
    success: true,
    data: { activities }
  });
}));

module.exports = router;