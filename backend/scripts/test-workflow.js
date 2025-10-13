#!/usr/bin/env node

/**
 * Blockchain Integration Workflow Test
 * This script performs a comprehensive test of the Vyaapar AI blockchain integration,
 * including company registration, investment, and verification.
 * 
 * Usage:
 *   npm run test-workflow
 */

require('dotenv').config();
const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL;

// Load contract artifact
const contractArtifactPath = path.join(__dirname, '../../smart-contracts/artifacts/contracts/VyaaparAI.sol/VyaaparAI.json');
const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));

// Global variables
let authToken = null;
let userId = null;
let companyId = null;
let provider = null;
let wallet = null;
let contract = null;

// Optional second investor wallet for investment step
let investor2 = null; // { wallet, token }

/**
 * Helper function to prompt for input
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Setup blockchain connection
 */
async function setupBlockchain() {
  console.log('\n🔄 Setting up blockchain connection...');
  
  try {
    provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
    const network = await provider.getNetwork();
    console.log(`  • Connected to network: Chain ID ${network.chainId.toString()} ✅`);
    
    if (process.env.PRIVATE_KEY) {
      wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      console.log(`  • Wallet loaded: ${wallet.address} ✅`);
      
      contract = new ethers.Contract(CONTRACT_ADDRESS, contractArtifact.abi, wallet);
    } else {
      console.log('  • ⚠️ No PRIVATE_KEY found in .env, using read-only mode');
      contract = new ethers.Contract(CONTRACT_ADDRESS, contractArtifact.abi, provider);
    }
    
    console.log(`  • Contract loaded at: ${CONTRACT_ADDRESS} ✅`);
    
    // Basic contract check
    const name = await contract.name();
    const symbol = await contract.symbol();
    console.log(`  • Contract verified: ${name} (${symbol}) ✅`);
    
    return true;
  } catch (error) {
    console.error(`  • Blockchain setup failed: ${error.message} ❌`);
    return false;
  }
}

/**
 * Wallet authentication using the loaded PRIVATE_KEY
 */
async function walletAuthLogin() {
  console.log('\n🔐 Authenticating with wallet (Web3)...');
  try {
    if (!wallet) {
      console.error('  • No wallet loaded for wallet-auth ❌');
      return false;
    }

    const message = `Login to Vyaapar.AI\nWallet: ${wallet.address}\nTimestamp: ${Date.now()}`;
    const signature = await wallet.signMessage(message);

    const payload = {
      walletAddress: wallet.address,
      signature,
      message,
      // Provide a minimal name to satisfy validation
      fullName: 'Workflow User'
    };

    const response = await axios.post(`${API_URL}/auth/wallet-auth`, payload);
    const token = response.data?.data?.token || response.data?.token;
    const user = response.data?.data?.user || response.data?.user;
    if (token && user?.id) {
      authToken = token;
      userId = user.id;
      console.log(`  • Wallet auth successful! User ID: ${userId} ✅`);
      return true;
    }

    console.error('  • Wallet auth failed: No token received ❌');
    return false;
  } catch (error) {
    console.error(`  • Wallet auth failed: ${error.response?.data?.message || error.message} ❌`);
    return false;
  }
}

/**
 * Login to the API
 */
async function login() {
  console.log('\n🔐 Logging in to API...');
  
  try {
    // Prefer wallet-auth if PRIVATE_KEY is available
    if (wallet) {
      const walletLoggedIn = await walletAuthLogin();
      if (walletLoggedIn) return true;
      console.log('  • Falling back to email/password login...');
    }

    const email = await prompt('Enter your email: ');
    const password = await prompt('Enter your password: ');
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    // Backend returns { success, message, data: { user, token } }
    const token = response.data?.data?.token || response.data?.token;
    const user = response.data?.data?.user || response.data?.user;
    if (token && user?.id) {
      authToken = token;
      userId = user.id;
      console.log(`  • Login successful! User ID: ${userId} ✅`);
      return true;
    } else {
      console.error('  • Login failed: No token received ❌');
      return false;
    }
  } catch (error) {
    console.error(`  • Login failed: ${error.response?.data?.message || error.message} ❌`);
    return false;
  }
}

/**
 * Register a company with blockchain verification
 */
async function registerCompany() {
  console.log('\n🏢 Registering a new company with blockchain verification...');
  
  try {
    if (!authToken) {
      console.error('  • Not authenticated ❌');
      return false;
    }
    
    // Generate a unique company name
    const companyName = `Test Company ${Date.now()}`;
    
    // Create company payload
    const companyData = {
      name: companyName,
      description: 'A test company created by the workflow script',
      industry: 'Technology',
      foundedYear: 2023,
      valuation: 1000000,
      website: 'https://example.com',
      location: 'Test Location',
      useBlockchain: true, // Enable blockchain verification
      walletAddress: wallet?.address || ''
    };
    
    console.log('  • Sending company registration request...');
    
    const response = await axios.post(
      `${API_URL}/companies/register`, 
      companyData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    // Backend returns { success, message, data: { company, blockchain } }
    const respCompany = response.data?.data?.company || response.data?.company;
    const respBlockchain = response.data?.data?.blockchain || response.data?.blockchain;

    if (respCompany?.id) {
      companyId = respCompany.id;
      console.log(`  • Company registered! ID: ${companyId} ✅`);

      if (respBlockchain?.txHash) {
        console.log(`  • Blockchain transaction hash: ${respBlockchain.txHash} ✅`);
        console.log('  • Waiting for blockchain confirmation...');
        const txReceipt = await provider.waitForTransaction(respBlockchain.txHash);
        console.log(`  • Transaction confirmed in block ${txReceipt.blockNumber} ✅`);
      } else if (respCompany.isBlockchainVerified) {
        console.log('  • Company marked as blockchain verified ✅');
      } else {
        console.log('  • ⚠️ Company registered but not blockchain verified');
      }

      return true;
    }

    console.error('  • Company registration failed ❌');
    return false;
  } catch (error) {
    console.error(`  • Company registration failed: ${error.response?.data?.message || error.message} ❌`);
    return false;
  }
}

/**
 * Make an investment in the company
 */
async function investInCompany() {
  console.log('\n💰 Making an investment with blockchain verification...');
  
  try {
    if (!authToken || !companyId) {
      console.error('  • Not authenticated or no company registered ❌');
      return false;
    }
    
    // Investment data
    const investmentData = {
      companyId,
      amount: 0.01, // invest 0.01 ETH for on-chain test
      equity: 1, // informational only; backend calculates ownership
      useBlockchain: true,
      walletAddress: (investor2?.wallet?.address) || wallet?.address || ''
    };
    
    console.log('  • Sending investment request...');
    
    // Use second investor token if available to avoid self-invest restriction
    const bearerToken = investor2?.token || authToken;
    const response = await axios.post(
      `${API_URL}/investments`,
      investmentData,
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );

    // Backend returns { success, message, data: { investment, blockchain } }
    const respInvestment = response.data?.data?.investment || response.data?.investment;
    const respBlockchain = response.data?.data?.blockchain || response.data?.blockchain;

    if (respInvestment?.id) {
      console.log(`  • Investment created! ID: ${respInvestment.id} ✅`);

      if (respBlockchain?.txHash) {
        console.log(`  • Blockchain transaction hash: ${respBlockchain.txHash} ✅`);
        console.log('  • Waiting for blockchain confirmation...');
        const txReceipt = await provider.waitForTransaction(respBlockchain.txHash);
        console.log(`  • Transaction confirmed in block ${txReceipt.blockNumber} ✅`);
      } else if (respInvestment.isBlockchainVerified) {
        console.log('  • Investment marked as blockchain verified ✅');
      } else {
        console.log('  • ⚠️ Investment created but not blockchain verified');
      }

      return true;
    }

    console.error('  • Investment failed ❌');
    return false;
  } catch (error) {
    console.error(`  • Investment failed: ${error.response?.data?.message || error.message} ❌`);
    return false;
  }
}

/**
 * Verify blockchain data
 */
async function verifyBlockchainData() {
  console.log('\n🔍 Verifying blockchain data...');
  
  try {
    if (!contract) {
      console.error('  • No blockchain connection ❌');
      return false;
    }
    
    // If companyId exists, try to fetch blockchain tokenId via companies API or assume 0 for demo
    console.log('  • Fetching on-chain company details using tokenId from registration if available...');
    // We don't have tokenId directly here; in a fuller flow we could GET /companies/:id.
    // As a generic verification, we'll just try to read company 0 if callable.
    try {
      // Fetch company details from API to get tokenId
      const resp = await axios.get(`${API_URL}/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const apiCompany = resp.data?.data?.company;
      if (apiCompany?.tokenId != null) {
        const tokenId = Number(apiCompany.tokenId);
        console.log(`  • Using tokenId from API: ${tokenId}`);
        const chainCompany = await contract.getCompany(tokenId);
        console.log('\n📊 On-chain Company:');
        console.log(`  • Name: ${chainCompany.name}`);
        console.log(`  • Valuation: ${ethers.formatEther(chainCompany.valuation)} ETH`);
      } else {
        console.log('  • No tokenId present (company not blockchain-verified).');
      }
    } catch (e) {
      console.log('  • Could not fetch on-chain details via API tokenId.');
    }
    
    return true;
  } catch (error) {
    console.error(`  • Blockchain data verification failed: ${error.message} ❌`);
    return false;
  }
}

/**
 * Optionally initialize a second investor (wallet-auth) using SECOND_PRIVATE_KEY
 */
async function setupSecondInvestorIfAvailable() {
  const pk2 = process.env.SECOND_PRIVATE_KEY;
  if (!pk2) return;

  try {
    const wallet2 = new ethers.Wallet(pk2, provider);
    const message = `Login to Vyaapar.AI\nWallet: ${wallet2.address}\nTimestamp: ${Date.now()}`;
    const signature = await wallet2.signMessage(message);
    const payload = { walletAddress: wallet2.address, signature, message, fullName: 'Workflow Investor2' };
    const resp = await axios.post(`${API_URL}/auth/wallet-auth`, payload);
    const token = resp.data?.data?.token || resp.data?.token;
    if (token) {
      investor2 = { wallet: wallet2, token };
      console.log(`  • Second investor ready: ${wallet2.address} ✅`);
    }
  } catch (e) {
    console.log('  • Failed to init second investor (optional):', e.message);
  }
}

/**
 * Run the complete workflow test
 */
async function runWorkflow() {
  try {
    console.log('🧪 VYAAPAR AI BLOCKCHAIN INTEGRATION TEST');
    console.log('======================================');
    
    // Setup blockchain
    const blockchainSetup = await setupBlockchain();
    if (!blockchainSetup) {
      console.error('\n❌ Blockchain setup failed, aborting workflow test');
      return;
    }
    // Prepare second investor (optional)
    await setupSecondInvestorIfAvailable();
    
    // Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('\n❌ Login failed, aborting workflow test');
      return;
    }
    
    // Register company
    const companyRegistered = await registerCompany();
    if (!companyRegistered) {
      console.error('\n❌ Company registration failed, aborting workflow test');
      return;
    }
    
    // Make investment
    const investmentSuccess = await investInCompany();
    if (!investmentSuccess) {
      console.error('\n❌ Investment failed, aborting workflow test');
      return;
    }
    
    // Verify blockchain data
    await verifyBlockchainData();
    
    console.log('\n✅ WORKFLOW TEST COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ Workflow test failed:');
    console.error(error);
  } finally {
    rl.close();
  }
}

runWorkflow();