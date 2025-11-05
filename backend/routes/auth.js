const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/errorHandler');
const { ethers } = require('ethers');
const blockchainService = require('../config/blockchain');

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
  // Name fields are optional for wallet-only auth; if absent, we'll create a minimal profile
  body('fullName').optional().trim(),
  body('firstName').optional().trim(),
  body('lastName').optional().trim()
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
    console.warn('wallet-auth validation failed:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { walletAddress, signature, message, fullName, firstName, lastName } = req.body;

  // Server-side diagnostic log for wallet address
  console.log('🔐 wallet-auth received:', {
    walletAddress,
    hasSignature: !!signature,
    messagePreview: typeof message === 'string' ? message.slice(0, 40) + '…' : null
  });

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
    console.error('wallet-auth signature verification error:', error?.message || error);
    return res.status(401).json({
      success: false,
      message: 'Signature verification failed'
    });
  }

  const normalizedAddress = walletAddress.toLowerCase();

  // Optional: enforce a minimum wallet balance for onboarding (configurable via env)
  // Set MIN_WALLET_BALANCE_ETH (e.g. 0.001) to require a minimum ETH balance for wallet-based registration.
  const minBalanceRequired = parseFloat(process.env.MIN_WALLET_BALANCE_ETH || '0');
  if (minBalanceRequired > 0) {
    try {
      const balStr = await blockchainService.getBalance(normalizedAddress);
      const bal = parseFloat(balStr || '0');
      if (isNaN(bal) || bal < minBalanceRequired) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Minimum ${minBalanceRequired} ETH required to register with a wallet.`
        });
      }
    } catch (e) {
      console.warn('wallet-auth balance check failed:', e?.message || e);
      // If balance check fails due to provider error, allow flow to continue (avoid blocking signups for infra issues)
    }
  }

  // If caller is already authenticated, link wallet to existing profile
  let linkUserId = null;
  const bearer = req.header('Authorization');
  if (bearer?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(bearer.replace('Bearer ', ''), process.env.JWT_SECRET);
      linkUserId = decoded?.userId || null;
    } catch (_) {
      // ignore token errors for linking; proceed as unauthenticated flow
      linkUserId = null;
    }
  }

  // Ensure service role key is available for admin ops
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('wallet-auth error: SUPABASE_SERVICE_ROLE_KEY is missing. Wallet auth requires admin privileges.');
    return res.status(500).json({
      success: false,
      message: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing'
    });
  }

  // Check if wallet is already registered
  let profile = null;
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single();
    if (error && error.code !== 'PGRST116') {
      console.error('wallet-auth select error:', { code: error.code, message: error.message });
      return res.status(500).json({ success: false, message: 'Database error (select)' });
    }
    profile = data || null;
  } catch (e) {
    console.error('wallet-auth unexpected select exception:', e);
    return res.status(500).json({ success: false, message: 'Database error (select exception)' });
  }

  // If linking to an existing authenticated user
  if (linkUserId) {
    // Ensure no other account has this wallet already
    if (profile && profile.id !== linkUserId) {
      return res.status(409).json({ success: false, message: 'This wallet is already linked to another account' });
    }
    // Fetch the target profile
    const { data: existingProfile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', linkUserId)
      .single();
    if (fetchErr || !existingProfile) {
      return res.status(401).json({ success: false, message: 'Invalid session for wallet linking' });
    }
    // Update existing profile with wallet address and optional names if empty
    const updates = {
      wallet_address: normalizedAddress,
      last_login: new Date().toISOString(),
    };
    if (!existingProfile.first_name && finalFirstName) updates.first_name = finalFirstName;
    if (!existingProfile.last_name && finalLastName) updates.last_name = finalLastName;
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', linkUserId)
      .select('*')
      .single();
    if (updErr) {
      console.error('wallet-auth link update error:', updErr);
      return res.status(500).json({ success: false, message: 'Failed to link wallet to profile' });
    }
    profile = updated;
  }

  // If user doesn't exist and no link, create Supabase Auth user then profile (to satisfy FK profiles.id -> auth.users.id)
  if (!profile && !linkUserId) {
    try {
      const derivedEmail = `wallet+${normalizedAddress}@vyaapar.local`;
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: derivedEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { authMethod: 'web3', walletAddress: normalizedAddress }
      });
      if (authError) {
        console.error('wallet-auth createUser error:', authError);
        return res.status(500).json({ success: false, message: 'Failed to create auth user for wallet' });
      }

      const authUserId = authData.user.id;

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authUserId,
          email: derivedEmail,
          wallet_address: normalizedAddress,
          first_name: finalFirstName,
          last_name: finalLastName,
          auth_method: 'web3',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      if (createError) {
        console.error('wallet-auth insert error:', { code: createError.code, message: createError.message });
        return res.status(500).json({ success: false, message: 'Failed to create wallet profile' });
      }
      profile = newProfile;
    } catch (e) {
      console.error('wallet-auth unexpected user/profile creation exception:', e);
      return res.status(500).json({ success: false, message: 'Failed to create wallet user/profile' });
    }
  }

  // Update last login
  try {
    const { error: lastLoginError } = await supabaseAdmin
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', profile.id);
    if (lastLoginError) {
      console.warn('wallet-auth last_login update warning:', { code: lastLoginError.code, message: lastLoginError.message });
    }
  } catch (e) {
    console.warn('wallet-auth last_login update exception:', e);
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: profile.id, walletAddress: profile.wallet_address || normalizedAddress },
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