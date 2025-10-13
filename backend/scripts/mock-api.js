#!/usr/bin/env node

/**
 * Mock API Server for Blockchain Testing
 * 
 * This script creates a simple Express server that mocks the backend API endpoints
 * needed for blockchain testing. It allows testing the workflow without a real backend.
 * 
 * Usage:
 *   npm run mock-api
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load contract
const contractArtifactPath = path.join(__dirname, '../../smart-contracts/artifacts/contracts/VyaaparAI.sol/VyaaparAI.json');
const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));

// Configuration
const PORT = process.env.MOCK_API_PORT || 5001;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractArtifact.abi, wallet);

// Database mock
const db = {
  users: [
    {
      id: '1',
      email: 'test@example.com',
      password: 'password123', // In a real app, never store plaintext passwords
      name: 'Test User'
    }
  ],
  companies: [],
  investments: []
};

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = db.users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  
  // Generate a mock JWT token
  const token = `mock_token_${Date.now()}`;
  
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

// Company endpoints
app.post('/api/companies', async (req, res) => {
  try {
    const { name, description, industry, valuation, useBlockchain, walletAddress } = req.body;
    
    // Create company record
    const companyId = `company_${Date.now()}`;
    const newCompany = {
      id: companyId,
      name,
      description,
      industry,
      valuation,
      blockchainVerified: useBlockchain,
      createdAt: new Date().toISOString()
    };
    
    db.companies.push(newCompany);
    console.log('Created company:', newCompany);
    
    // If blockchain verification is requested
    if (useBlockchain) {
      try {
        console.log('Minting company on blockchain...');
        
        // Mint company on blockchain
        const valuationInEth = ethers.parseEther('1'); // Convert to wei (1 ETH for testing)
        const tx = await contract.mintCompany(
          name,
          description,
          industry,
          valuationInEth,
          `https://vyaapar.ai/company/${companyId}`
        );
        
        console.log('Transaction sent:', tx.hash);
        
        // Return company with blockchain tx hash
        return res.json({
          success: true,
          company: newCompany,
          blockchainTxHash: tx.hash
        });
      } catch (error) {
        console.error('Blockchain error:', error);
        
        // Still return success but note blockchain verification failed
        return res.json({
          success: true,
          company: { ...newCompany, blockchainVerified: false },
          blockchainError: error.message
        });
      }
    }
    
    // Return success response without blockchain
    res.json({
      success: true,
      company: newCompany
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Investment endpoints
app.post('/api/investments', async (req, res) => {
  try {
    const { companyId, amount, equity, useBlockchain, walletAddress } = req.body;
    
    const company = db.companies.find(c => c.id === companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    
    // Create investment record
    const investmentId = `investment_${Date.now()}`;
    const newInvestment = {
      id: investmentId,
      companyId,
      amount,
      equity,
      blockchainVerified: useBlockchain,
      createdAt: new Date().toISOString()
    };
    
    db.investments.push(newInvestment);
    console.log('Created investment:', newInvestment);
    
    // If blockchain verification is requested
    if (useBlockchain) {
      try {
        console.log('Processing investment on blockchain...');
        
        // Get the token ID for the company
        // In a real app, you'd store this with the company record
        // For this mock, we'll assume the company was just minted and is the latest token
        const tokenCount = await contract.totalSupply();
        const tokenId = tokenCount - 1; // Latest token
        
        // Process investment on blockchain
        const amountInEth = ethers.parseEther('0.1'); // 0.1 ETH for testing
        const tx = await contract.investInCompany(tokenId, equity, { value: amountInEth });
        
        console.log('Transaction sent:', tx.hash);
        
        // Return investment with blockchain tx hash
        return res.json({
          success: true,
          investment: newInvestment,
          blockchainTxHash: tx.hash
        });
      } catch (error) {
        console.error('Blockchain error:', error);
        
        // Still return success but note blockchain verification failed
        return res.json({
          success: true,
          investment: { ...newInvestment, blockchainVerified: false },
          blockchainError: error.message
        });
      }
    }
    
    // Return success response without blockchain
    res.json({
      success: true,
      investment: newInvestment
    });
  } catch (error) {
    console.error('Error creating investment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Blockchain endpoints
app.post('/api/blockchain/verify', async (req, res) => {
  try {
    const { txHash } = req.body;
    
    if (!txHash) {
      return res.status(400).json({ success: false, message: 'Transaction hash is required' });
    }
    
    // Verify transaction on blockchain
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return res.json({ success: false, message: 'Transaction not found' });
    }
    
    const receipt = await provider.getTransactionReceipt(txHash);
    
    res.json({
      success: true,
      verified: receipt && receipt.status === 1,
      transaction: {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        blockNumber: tx.blockNumber,
        confirmations: tx.confirmations,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending'
      }
    });
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock API server running at http://localhost:${PORT}`);
  console.log(`Connected to blockchain at ${BLOCKCHAIN_RPC_URL}`);
  console.log(`Using contract at ${CONTRACT_ADDRESS}`);
  console.log(`Wallet address: ${wallet.address}`);
  console.log('\nAvailable endpoints:');
  console.log('POST /api/auth/login - Login');
  console.log('POST /api/companies - Create company');
  console.log('POST /api/investments - Create investment');
  console.log('POST /api/blockchain/verify - Verify transaction');
});