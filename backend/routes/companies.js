const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const blockchainService = require('../config/blockchain');
const companyVerification = require('../utils/companyVerification');
const riskAnalysis = require('../utils/riskAnalysis');

const router = express.Router();

// Search companies by name for CIN lookup
router.get('/search/by-name', [
  query('name').trim().isLength({ min: 2 }).withMessage('Company name must be at least 2 characters'),
  query('mode').optional().isIn(['SW', 'NC']).withMessage('Search mode must be SW or NC')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { name, mode = 'SW' } = req.query;
  const result = await companyVerification.searchCompanyByName(name, mode);

  if (result.success) {
    res.json({
      success: true,
      data: result.companies
    });
  } else {
    res.status(404).json({
      success: false,
      message: result.error
    });
  }
}));

// Search company by PAN for CIN lookup
router.get('/search/by-pan', [
  query('pan').trim().isLength({ min: 10, max: 10 }).withMessage('PAN must be 10 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { pan } = req.query;
  const result = await companyVerification.searchCompanyByPAN(pan);

  if (result.success) {
    res.json({
      success: true,
      data: result.companies
    });
  } else {
    res.status(404).json({
      success: false,
      message: result.error
    });
  }
}));

// Validation middleware
const validateCompanyRegistration = [
  body('name').trim().isLength({ min: 1 }).withMessage('Company name is required'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('industry').trim().isLength({ min: 1 }).withMessage('Industry is required'),
  body('valuation').isFloat({ gt: 0 }).withMessage('Valuation must be a positive number'),
  body('useBlockchain').optional().isBoolean()
];

// Register a new company
router.post('/register', authMiddleware, validateCompanyRegistration, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // Verify CIN and company details
  const { cin, email } = req.body;
  if (cin) {
    const cinVerification = await companyVerification.verifyCIN(cin);
    if (!cinVerification.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CIN or company verification failed',
        error: cinVerification.error
      });
    }

    // Store verified company data
    const verificationData = {
      cin,
      company_name: cinVerification.companyData.name,
      registered_address: cinVerification.companyData.address,
      incorporation_date: cinVerification.companyData.incorporation_date,
      status: cinVerification.companyData.status,
      pan: cinVerification.companyData.pan,
      industry: cinVerification.companyData.industry,
      verified_at: new Date().toISOString()
    };

    // Save verification data
    await supabase.from('company_verifications').insert(verificationData);
  }

  // Start email verification process if email provided
  if (email) {
    const emailResult = await companyVerification.verifyBusinessEmail(email, email.split('@')[1]);
    if (emailResult.status === 'error') {
      return res.status(400).json({
        success: false,
        message: 'Email verification failed',
        error: emailResult.error
      });
    }
  }

  const { name, description, industry, valuation, useBlockchain = true } = req.body;
  const userId = req.user.id;
  console.log('🧾 Register company request:', { name, useBlockchain, walletAddress: req.user.walletAddress });

  // Check if company name already exists
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('name')
    .eq('name', name)
    .single();

  if (existingCompany) {
    return res.status(409).json({
      success: false,
      message: 'Company with this name already exists'
    });
  }

  let blockchainData = null;
  let tokenId = null;

  // Handle blockchain registration
  if (useBlockchain && req.user.walletAddress) {
    try {
      // If configured, require a minimum wallet balance to attempt on-chain minting
      const minMintBalance = parseFloat(process.env.MIN_WALLET_BALANCE_FOR_MINT_ETH || '0');
      if (minMintBalance > 0) {
        try {
          const walletBalStr = await blockchainService.getBalance(req.user.walletAddress);
          const walletBal = parseFloat(walletBalStr || '0');
          if (isNaN(walletBal) || walletBal < minMintBalance) {
            return res.status(400).json({
              success: false,
              message: `Wallet balance too low to register on-chain. Minimum ${minMintBalance} ETH required.`
            });
          }
        } catch (e) {
          console.warn('Company register balance check failed:', e?.message || e);
          // allow mint attempt to continue on provider errors
        }
      }

      console.log('⛓️  Attempting on-chain mint with config:', {
        hasProvider: !!blockchainService.provider,
        hasSigner: !!blockchainService.signer,
        hasContract: !!blockchainService.contract,
        hasRPC: !!process.env.BLOCKCHAIN_RPC_URL,
        hasAddress: !!process.env.CONTRACT_ADDRESS,
        hasPK: !!process.env.PRIVATE_KEY
      });
      const tokenURI = `https://vyaapar.ai/company/${name.replace(/\s+/g, '-').toLowerCase()}`;
      
      blockchainData = await blockchainService.mintCompany(
        name,
        description,
        industry,
        valuation,
        tokenURI,
        req.user.walletAddress
      );

      if (blockchainData.success) {
        tokenId = blockchainData.tokenId;
        console.log('✅ Mint succeeded:', { tokenId, txHash: blockchainData.txHash });
      } else {
        console.error('❌ Blockchain mint failed:', blockchainData.error);
        // Continue with database-only registration
      }
    } catch (error) {
      console.error('❌ Blockchain error during register:', error);
      // Continue with database-only registration
    }
  }

  // Create company record in database
  const { data: company, error: dbError } = await supabaseAdmin
    .from('companies')
    .insert({
      name,
      description,
      industry,
      valuation: parseFloat(valuation),
      owner_id: userId,
      blockchain_token_id: tokenId,
      blockchain_tx_hash: blockchainData?.txHash,
      is_blockchain_verified: !!tokenId,
      created_at: new Date().toISOString()
    })
    .select(`
      *,
      profiles:owner_id (
        first_name,
        last_name,
        wallet_address
      )
    `)
    .single();

  if (dbError) {
    console.error('❌ Database insert error (company):', dbError);
    return res.status(500).json({
      success: false,
      message: 'Failed to register company'
    });
  }

  // Create activity log
  await supabaseAdmin
    .from('user_activities')
    .insert({
      user_id: userId,
      activity_type: 'company_registered',
      description: `Registered company: ${name}`,
      metadata: { companyId: company.id, tokenId }
    });

  res.status(201).json({
    success: true,
    message: 'Company registered successfully',
    data: {
      company: {
        id: company.id,
        name: company.name,
        description: company.description,
        industry: company.industry,
        valuation: company.valuation,
        tokenId: company.blockchain_token_id,
        isBlockchainVerified: company.is_blockchain_verified,
        owner: {
          firstName: company.profiles.first_name,
          lastName: company.profiles.last_name,
          walletAddress: company.profiles.wallet_address
        },
        createdAt: company.created_at
      },
      blockchain: blockchainData
    }
  });
}));

// Get all companies with pagination and filters
router.get('/', optionalAuthMiddleware, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('industry').optional().trim(),
  query('minValuation').optional().isNumeric(),
  query('maxValuation').optional().isNumeric(),
  query('search').optional().trim()
], asyncHandler(async (req, res) => {
  console.log('🔍 GET /companies - Request received');
  console.log('Query parameters:', req.query);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: errors.array()
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { industry, minValuation, maxValuation, search } = req.query;

  console.log('📊 Pagination settings:', { page, limit, offset });
  console.log('🔧 Filters:', { industry, minValuation, maxValuation, search });

  // First, let's check total count of companies in database
  const { count: totalCount, error: countError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });
  
  console.log('📈 Total companies in database:', totalCount);
  if (countError) {
    console.log('❌ Error counting companies:', countError);
  }

  // Check active companies count
  const { count: activeCount, error: activeCountError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  console.log('✅ Active companies in database:', activeCount);
  if (activeCountError) {
    console.log('❌ Error counting active companies:', activeCountError);
  }

  // Build query
  let query = supabase
    .from('companies')
    .select(`
      *,
      profiles:owner_id (
        first_name,
        last_name,
        wallet_address
      ),
      investments (
        amount,
        created_at
      ),
      milestones (
        id,
        milestone_type,
        verified
      )
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  console.log('🏗️ Base query built with is_active=true filter');

  // Apply filters
  if (industry) {
    console.log('🏭 Applying industry filter:', industry);
    query = query.ilike('industry', `%${industry}%`);
  }

  if (minValuation) {
    console.log('💰 Applying min valuation filter:', minValuation);
    query = query.gte('valuation', parseFloat(minValuation));
  }

  if (maxValuation) {
    console.log('💰 Applying max valuation filter:', maxValuation);
    query = query.lte('valuation', parseFloat(maxValuation));
  }

  if (search) {
    console.log('🔎 Applying search filter:', search);
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  console.log('⏳ Executing final query...');
  const { data: companies, error, count } = await query;

  console.log('📊 Query results:');
  console.log('- Companies returned:', companies ? companies.length : 0);
  console.log('- Total count from query:', count);
  console.log('- Error:', error);
  
  if (companies && companies.length > 0) {
    console.log('📝 First company sample:', {
      id: companies[0].id,
      name: companies[0].name,
      industry: companies[0].industry,
      is_active: companies[0].is_active,
      valuation: companies[0].valuation
    });
  }

  if (error) {
    console.error('❌ Database error fetching companies:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error.message
    });
  }

  // Calculate additional metrics for each company
  console.log('🔧 Processing companies data...');
  const enhancedCompanies = companies.map(company => {
    // Use the stored aggregate values instead of calculating from JOIN
    // This is more efficient and accurate
    const totalInvestment = parseFloat(company.total_investment || 0);
    const investorCount = parseInt(company.investor_count || 0);
    const completedMilestones = company.milestones ? company.milestones.filter(m => m.verified).length : 0;

    console.log(`📊 Company: ${company.name} - Investment: $${totalInvestment}M, Investors: ${investorCount}`);

    return {
      id: company.id,
      name: company.name,
      description: company.description,
      industry: company.industry,
      valuation: company.valuation,
      totalInvestment,
      investorCount,
      completedMilestones,
      totalMilestones: company.milestones ? company.milestones.length : 0,
      tokenId: company.blockchain_token_id,
      isBlockchainVerified: company.is_blockchain_verified,
      owner: {
        firstName: company.profiles?.first_name,
        lastName: company.profiles?.last_name,
        walletAddress: company.profiles?.wallet_address
      },
      createdAt: company.created_at,
      // Add fields expected by frontend
      status: company.is_active ? 'active' : 'inactive',
      location: 'India', // Default location
      foundedDate: company.created_at,
      currentFunding: totalInvestment,
      fundingGoal: company.valuation || 1000000 // Use valuation as funding goal or default
    };
  });

  const responseData = {
    success: true,
    data: {
      companies: enhancedCompanies,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: count > (page * limit)
      }
    }
  };

  console.log('✅ Sending response with', enhancedCompanies.length, 'companies');
  console.log('📄 Pagination info:', responseData.data.pagination);

  res.json(responseData);
}));

// Get company by ID
router.get('/:id', optionalAuthMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      *,
      profiles:owner_id (
        first_name,
        last_name,
        wallet_address
      ),
      investments (
        id,
        amount,
        investor_id,
        created_at,
        profiles:investor_id (
          first_name,
          last_name,
          wallet_address
        )
      ),
      milestones (
        id,
        milestone_type,
        description,
        verified,
        valuation_impact,
        created_at
      ),
      funding_rounds (
        id,
        round_name,
        target_amount,
        raised_amount,
        is_active,
        start_time,
        end_time
      ),
      company_verifications (
        id,
        cin,
        company_name,
        status,
        verified_at
      )
    `)
    .eq('id', id)
    .single();

  if (error || !company) {
    return res.status(404).json({
      success: false,
      message: 'Company not found'
    });
  }

  // Get blockchain data if available
  let blockchainData = null;
  if (company.blockchain_token_id) {
    try {
      const blockchainResult = await blockchainService.getCompany(company.blockchain_token_id);
      if (blockchainResult.success) {
        blockchainData = blockchainResult.data;
      }
    } catch (error) {
      console.error('Error fetching blockchain data:', error);
    }
  }

  // Calculate metrics
  const totalInvestment = company.investments.reduce((sum, inv) => sum + inv.amount, 0);
  const investorCount = company.investments.length;
  const completedMilestones = company.milestones.filter(m => m.verified).length;

  // Check if current user is an investor
  let userInvestment = null;
  if (req.user) {
    userInvestment = company.investments.find(inv => inv.investor_id === req.user.id);
  }

  res.json({
    success: true,
    data: {
      company: {
        id: company.id,
        name: company.name,
        description: company.description,
        industry: company.industry,
        valuation: company.valuation,
        totalInvestment,
        investorCount,
        completedMilestones,
        totalMilestones: company.milestones.length,
        tokenId: company.blockchain_token_id,
        isBlockchainVerified: company.is_blockchain_verified,
        cinVerified: false, // Hardcoded to not verified for now
        emailVerified: company.email_verified || false,
        owner: {
          firstName: company.profiles?.first_name,
          lastName: company.profiles?.last_name,
          walletAddress: company.profiles?.wallet_address
        },
        investments: company.investments.map(inv => ({
          id: inv.id,
          amount: inv.amount,
          createdAt: inv.created_at,
          investor: {
            firstName: inv.profiles?.first_name,
            lastName: inv.profiles?.last_name,
            walletAddress: inv.profiles?.wallet_address
          }
        })),
        milestones: company.milestones.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        fundingRounds: company.funding_rounds.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)),
        userInvestment,
        blockchain: blockchainData,
        createdAt: company.created_at
      }
    }
  });
}));

// Update company (owner only)
router.put('/:id', authMiddleware, [
  body('description').optional().trim().isLength({ min: 10 }),
  body('valuation').optional().isNumeric()
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
  const userId = req.user.id;
  const updates = {};

  // Only allow certain fields to be updated
  const allowedUpdates = ['description', 'valuation'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid updates provided'
    });
  }

  // Check ownership
  const { data: company } = await supabase
    .from('companies')
    .select('owner_id, blockchain_token_id')
    .eq('id', id)
    .single();

  if (!company || company.owner_id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own companies'
    });
  }

  // Update database
  const { data: updatedCompany, error } = await supabase
    .from('companies')
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
      message: 'Failed to update company'
    });
  }

  // Update blockchain if valuation changed and company is on blockchain
  if (updates.valuation && company.blockchain_token_id) {
    try {
      await blockchainService.updateCompanyValuation(
        company.blockchain_token_id,
        updates.valuation
      );
    } catch (error) {
      console.error('Failed to update blockchain valuation:', error);
    }
  }

  res.json({
    success: true,
    message: 'Company updated successfully',
    data: { company: updatedCompany }
  });
}));

// Get user's companies
router.get('/user/my-companies', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const { data: companies, error } = await supabase
    .from('companies')
    .select(`
      *,
      investments (
        amount,
        created_at
      ),
      milestones (
        id,
        verified
      )
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your companies'
    });
  }

  const enhancedCompanies = companies.map(company => {
    const totalInvestment = company.investments.reduce((sum, inv) => sum + inv.amount, 0);
    const investorCount = company.investments.length;
    const completedMilestones = company.milestones.filter(m => m.verified).length;

    return {
      id: company.id,
      name: company.name,
      description: company.description,
      industry: company.industry,
      valuation: company.valuation,
      totalInvestment,
      investorCount,
      completedMilestones,
      totalMilestones: company.milestones.length,
      tokenId: company.blockchain_token_id,
      isBlockchainVerified: company.is_blockchain_verified,
      createdAt: company.created_at
    };
  });

  res.json({
    success: true,
    data: { companies: enhancedCompanies }
  });
}));

// Debug: company blockchain status
router.get('/:id/blockchain-status', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, is_blockchain_verified, blockchain_token_id, blockchain_tx_hash')
    .eq('id', id)
    .single();

  if (error || !company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  let onchain = null;
  if (company.blockchain_token_id && blockchainService.contract) {
    try {
      const result = await blockchainService.getCompany(company.blockchain_token_id);
      onchain = result.success ? result.data : { error: result.error };
    } catch (e) {
      onchain = { error: e.message };
    }
  }

  res.json({
    success: true,
    data: {
      db: company,
      onchain,
      service: {
        hasProvider: !!blockchainService.provider,
        hasSigner: !!blockchainService.signer,
        hasContract: !!blockchainService.contract,
      },
      env: {
        rpc: !!process.env.BLOCKCHAIN_RPC_URL,
        contract: !!process.env.CONTRACT_ADDRESS,
        privateKey: !!process.env.PRIVATE_KEY
      }
    }
  });
}));

// Verify or mint a company on blockchain (owner only)
router.post('/:id/verify-blockchain', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Fetch minimal company info
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, owner_id, name, description, industry, valuation, blockchain_token_id, is_blockchain_verified')
    .eq('id', id)
    .single();

  if (companyError || !company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  if (company.owner_id !== userId) {
    return res.status(403).json({ success: false, message: 'Only the owner can verify on-chain' });
  }

  // If already verified, optionally re-check on-chain and return
  if (company.is_blockchain_verified && company.blockchain_token_id) {
    try {
      const onchain = await blockchainService.getCompany(company.blockchain_token_id);
      if (!onchain.success) {
        return res.status(200).json({ success: true, message: 'Already verified (on-chain fetch failed, but DB shows verified)', data: { tokenId: company.blockchain_token_id, verified: true } });
      }
      return res.status(200).json({ success: true, message: 'Already verified', data: { tokenId: company.blockchain_token_id, verified: true, blockchain: onchain.data } });
    } catch (_) {
      return res.status(200).json({ success: true, message: 'Already verified', data: { tokenId: company.blockchain_token_id, verified: true } });
    }
  }

  // If token exists but not flagged, try verifying against chain
  if (company.blockchain_token_id && !company.is_blockchain_verified) {
    try {
      const onchain = await blockchainService.getCompany(company.blockchain_token_id);
      if (onchain.success) {
        const { error: updErr } = await supabase
          .from('companies')
          .update({ is_blockchain_verified: true })
          .eq('id', id);
        if (!updErr) {
          const io = req.app.get('io');
          io?.to(`company:${id}`).emit('company:updated', { id, isBlockchainVerified: true, tokenId: company.blockchain_token_id });
        }
        return res.json({ success: true, message: 'Verification updated from existing token', data: { tokenId: company.blockchain_token_id, verified: true, blockchain: onchain.data } });
      }
    } catch (_) {
      // fall through to mint
    }
  }

  // Otherwise mint a new company token if wallet is connected
  if (!req.user.walletAddress) {
    return res.status(400).json({ success: false, message: 'Connect a wallet to verify on-chain' });
  }

  const tokenURI = `https://vyaapar.ai/company/${company.name.replace(/\s+/g, '-').toLowerCase()}`;
  try {
    const result = await blockchainService.mintCompany(
      company.name,
      company.description,
      company.industry,
      company.valuation,
      tokenURI,
      req.user.walletAddress
    );

    if (!result?.success) {
      return res.status(502).json({ success: false, message: `Mint failed: ${result?.error || 'unknown error'}` });
    }

    const { tokenId, txHash } = result;
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('companies')
      .update({
        blockchain_token_id: tokenId,
        blockchain_tx_hash: txHash,
        is_blockchain_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, name, blockchain_token_id, is_blockchain_verified')
      .single();

    if (updateError) {
      console.error('Database update error after minting:', updateError);
      // Fallback: Return success with token info even if DB update fails
      return res.json({ 
        success: true, 
        message: 'Company minted successfully (database update pending)', 
        data: { tokenId, txHash, dbUpdateFailed: true }
      });
    }

    // Emit update to subscribers
    const io = req.app.get('io');
    io?.to(`company:${id}`).emit('company:updated', { id, isBlockchainVerified: true, tokenId });

    return res.json({ success: true, message: 'Company verified on-chain', data: { tokenId, txHash, company: updated } });
  } catch (err) {
    console.error('verify-blockchain error:', err);
    return res.status(500).json({ success: false, message: 'Blockchain verification failed' });
  }
}));

// Verify email token
router.post('/:id/verify-email', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { token } = req.body;

  // Check company ownership
  const { data: company } = await supabase
    .from('companies')
    .select('owner_id, email')
    .eq('id', id)
    .single();

  if (!company || company.owner_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only verify your own company\'s email'
    });
  }

  const result = await companyVerification.verifyEmailToken(company.email, token);
  if (!result.verified) {
    return res.status(400).json({
      success: false,
      message: 'Email verification failed',
      error: result.error
    });
  }

  // Update company with verified email status
  await supabase
    .from('companies')
    .update({
      email_verified: true,
      verified_domain: company.email.split('@')[1],
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
}));

// Get company risk analysis
router.get('/:id/risk-analysis', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const riskReport = await riskAnalysis.generateRiskReport(id);

    res.json({
      success: true,
      data: riskReport
    });
  } catch (error) {
    console.error('Risk analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate risk analysis',
      error: error.message
    });
  }
}));

module.exports = router;