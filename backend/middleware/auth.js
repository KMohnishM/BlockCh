const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is missing'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from Supabase
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    // Add user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      walletAddress: user.wallet_address,
      role: user.role || 'user'
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const { data: user, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email,
          walletAddress: user.wallet_address,
          role: user.role || 'user'
        };
      }
    }
    
    next();
  } catch (error) {
    // If auth fails, just continue without user info
    next();
  }
};

// Admin role middleware
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Wallet verification middleware
const walletAuthMiddleware = async (req, res, next) => {
  try {
    const walletAddress = req.header('x-wallet-address');
    const signature = req.header('x-wallet-signature');
    const message = req.header('x-wallet-message');

    if (!walletAddress || !signature || !message) {
      return res.status(401).json({
        success: false,
        message: 'Wallet authentication headers missing'
      });
    }

    // Here you would verify the wallet signature
    // This is a simplified version - in production, implement proper signature verification
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Wallet not registered or invalid'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      walletAddress: user.wallet_address,
      role: user.role || 'user'
    };

    next();
  } catch (error) {
    console.error('Wallet auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Wallet authentication error'
    });
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  adminMiddleware,
  walletAuthMiddleware
};