const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/errorHandler');
const { ethers } = require('ethers');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').optional().trim().isLength({ min: 1 }).withMessage('Full name is required'),
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name is required')
].concat([
  // Custom validation to ensure either fullName OR (firstName AND lastName) is provided
  body().custom((value, { req }) => {
    const { fullName, firstName, lastName } = req.body;
    
    if (!fullName && (!firstName || !lastName)) {
      throw new Error('Either full name or both first name and last name are required');
    }
    return true;
  })
]);

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').exists().withMessage('Password is required')
];

const validateWalletAuth = [
  body('walletAddress').custom(value => {
    if (!ethers.isAddress(value)) {
      throw new Error('Invalid wallet address');
    }
    return true;
  }),
  body('signature').exists().withMessage('Signature is required'),
  body('message').exists().withMessage('Message is required'),
  body('fullName').optional().trim().isLength({ min: 1 }).withMessage('Full name is required'),
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name is required'),
  // Custom validation to ensure either fullName OR (firstName AND lastName) is provided for new wallets
  body().custom((_, { req }) => {
    const { fullName, firstName, lastName } = req.body;
    
    if (!fullName && (!firstName || !lastName)) {
      throw new Error('Either full name or both first name and last name are required');
    }
    return true;
  })
];

// Traditional email/password registration
router.post('/register', validateRegistration, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password, fullName, firstName, lastName, investorType = 'individual', userType } = req.body;

  // Handle name fields - accept either fullName or firstName/lastName
  let finalFirstName, finalLastName;
  
  if (fullName) {
    // Split fullName into firstName and lastName
    const nameParts = fullName.trim().split(' ');
    finalFirstName = nameParts[0];
    finalLastName = nameParts.slice(1).join(' ') || nameParts[0]; // Use first name as last name if only one name provided
  } else {
    finalFirstName = firstName;
    finalLastName = lastName;
  }

  // Check if user already exists
  const { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('email', email)
    .single();

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user with Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    console.error('Supabase auth error:', authError);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user account'
    });
  }

  // Create user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      first_name: finalFirstName,
      last_name: finalLastName,
      investor_type: investorType,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (profileError) {
    console.error('Profile creation error:', profileError);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user profile'
    });
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: profile.id, email: profile.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        investorType: profile.investor_type
      },
      token
    }
  });
}));

// Traditional email/password login
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  // Authenticate with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile'
    });
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: profile.id, email: profile.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  // Update last login
  await supabase
    .from('profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', profile.id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        walletAddress: profile.wallet_address,
        investorType: profile.investor_type
      },
      token
    }
  });
}));

// Web3 wallet authentication
router.post('/wallet-auth', validateWalletAuth, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { walletAddress, signature, message, fullName, firstName, lastName } = req.body;

  // Handle name fields - accept either fullName or firstName/lastName
  let finalFirstName, finalLastName;
  
  if (fullName) {
    // Split fullName into firstName and lastName
    const nameParts = fullName.trim().split(' ');
    finalFirstName = nameParts[0];
    finalLastName = nameParts.slice(1).join(' ') || nameParts[0]; // Use first name as last name if only one name provided
  } else {
    finalFirstName = firstName || '';
    finalLastName = lastName || '';
  }

  // Verify signature (simplified - implement proper verification in production)
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Signature verification failed'
    });
  }

  const normalizedAddress = walletAddress.toLowerCase();

  // Check if wallet is already registered
  let { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('wallet_address', normalizedAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({
      success: false,
      message: 'Database error'
    });
  }

  // If user doesn't exist, create new profile
  if (!profile) {
    const userId = crypto.randomUUID();
    
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        wallet_address: normalizedAddress,
        first_name: finalFirstName,
        last_name: finalLastName,
        auth_method: 'web3',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create wallet profile'
      });
    }

    profile = newProfile;
  }

  // Update last login
  await supabaseAdmin
    .from('profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', profile.id);

  // Generate JWT token
  const token = jwt.sign(
    { userId: profile.id, walletAddress: normalizedAddress },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  res.json({
    success: true,
    message: 'Wallet authentication successful',
    data: {
      user: {
        id: profile.id,
        walletAddress: profile.wallet_address,
        firstName: profile.first_name,
        lastName: profile.last_name,
        investorType: profile.investor_type,
        isNewUser: !profile.first_name // If no name, it's likely a new user
      },
      token
    }
  });
}));

// Logout (invalidate token)
router.post('/logout', asyncHandler(async (req, res) => {
  // In a more sophisticated setup, you might maintain a token blacklist
  // For now, we'll just return success and let the frontend handle token removal
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Get current user
router.get('/me', asyncHandler(async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is missing'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !profile) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          walletAddress: profile.wallet_address,
          investorType: profile.investor_type,
          authMethod: profile.auth_method,
          createdAt: profile.created_at
        }
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}));

// Request password reset
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Valid email is required',
      errors: errors.array()
    });
  }

  const { email } = req.body;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`
  });

  if (error) {
    console.error('Password reset error:', error);
  }

  // Always return success for security (don't reveal if email exists)
  res.json({
    success: true,
    message: 'If the email exists, a reset link has been sent'
  });
}));

module.exports = router;