#!/usr/bin/env node

/**
 * Test script to verify blockchain functionality
 * Usage: 
 *   npm run test-blockchain
 * 
 * This script is used to test the connection to the blockchain and
 * verify that the contract is deployed and accessible.
 */

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load contract artifact
const contractArtifactPath = path.join(__dirname, '../../smart-contracts/artifacts/contracts/VyaaparAI.sol/VyaaparAI.json');
const contractArtifact = JSON.parse(fs.readFileSync(contractArtifactPath, 'utf8'));

async function main() {
  try {
    console.log('\n🔍 Testing Blockchain Configuration\n');
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`  • BLOCKCHAIN_RPC_URL: ${process.env.BLOCKCHAIN_RPC_URL ? '✅ Set' : '❌ Not set'}`);
    console.log(`  • CONTRACT_ADDRESS: ${process.env.CONTRACT_ADDRESS ? '✅ Set' : '❌ Not set'}`);
    console.log(`  • PRIVATE_KEY: ${process.env.PRIVATE_KEY ? '✅ Set' : '❌ Not set (first 4 chars: ' + process.env.PRIVATE_KEY?.substring(0, 4) + '...)'}`);
    
    if (!process.env.BLOCKCHAIN_RPC_URL || !process.env.CONTRACT_ADDRESS) {
      throw new Error('Required environment variables are missing');
    }

    // Connect to the network
    console.log('\n🌐 Connecting to blockchain network...');
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const network = await provider.getNetwork();
    console.log(`  • Connected to network: Chain ID ${network.chainId.toString()}`);
    
    // Preflight: verify code exists at address
    console.log('\n📄 Loading contract...');
    let signer;
    if (process.env.PRIVATE_KEY) {
      signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      console.log(`  • Using wallet address: ${signer.address}`);
    } else {
      console.log('  • ⚠️ No private key provided, using read-only mode');
    }

    const code = await provider.getCode(process.env.CONTRACT_ADDRESS);
    if (!code || code === '0x') {
      console.error(`  • ❌ No contract code found at ${process.env.CONTRACT_ADDRESS}`);
      // Try to suggest the correct address from smart-contracts/contractAddresses/contract-address.json
      try {
        const deployedMetaPath = path.join(__dirname, '../../smart-contracts/contractAddresses/contract-address.json');
        const deployedMeta = JSON.parse(fs.readFileSync(deployedMetaPath, 'utf8'));
        if (deployedMeta?.VyaaparAI) {
          console.error(`  • Hint: Latest deployed address appears to be ${deployedMeta.VyaaparAI} (network: ${deployedMeta.network})`);
        }
      } catch {}
      console.error('  • Action: Update CONTRACT_ADDRESS in backend .env (and frontend .env.local) to the correct deployed address and rerun.');
      throw new Error('Contract code not found at provided CONTRACT_ADDRESS');
    }
    
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractArtifact.abi,
      signer || provider
    );
    console.log(`  • Contract loaded at address: ${process.env.CONTRACT_ADDRESS}`);
    
    // Basic contract interactions
    console.log('\n⚙️ Testing contract functions:');
    
    // Get contract name
    try {
      const name = await contract.name();
      console.log(`  • Contract name: ${name} ✅`);
    } catch (error) {
      console.error(`  • Failed to get contract name: ${error.message} ❌`);
    }
    
    // Get contract symbol
    try {
      const symbol = await contract.symbol();
      console.log(`  • Contract symbol: ${symbol} ✅`);
    } catch (error) {
      console.error(`  • Failed to get contract symbol: ${error.message} ❌`);
    }
    
    // Get contract owner
    try {
      const owner = await contract.owner();
      console.log(`  • Contract owner: ${owner} ✅`);
      
      if (signer && owner === signer.address) {
        console.log(`  • You are the contract owner ✅`);
      } else if (signer) {
        console.log(`  • You are NOT the contract owner ⚠️`);
      }
    } catch (error) {
      console.error(`  • Failed to get contract owner: ${error.message} ❌`);
    }

    // Mint a test company (if wallet is provided)
    if (signer) {
      console.log('\n🧪 Testing mintCompany function:');
      try {
        // Check balance before minting (ERC721 balance)
        const balanceBefore = await contract.balanceOf(signer.address).catch(() => null);
        if (balanceBefore === null) {
          console.log('  • Skipping balanceOf pre-check (not available)');
        }
        console.log(`  • Current company tokens owned: ${balanceBefore.toString()}`);
        
        // Only mint if explicitly requested
        if (process.argv.includes('--mint')) {
          console.log('  • Minting new company token...');
          const tx = await contract.mintCompany(
            'Test Company ' + Date.now(),
            'A test company created by the debug script',
            'Technology',
            ethers.parseEther('1000000'), // 1M valuation
            'https://vyaapar.ai/test-company'
          );
          
          console.log(`  • Transaction submitted: ${tx.hash}`);
          console.log('  • Waiting for confirmation...');
          
          const receipt = await tx.wait();
          console.log(`  • Transaction confirmed in block ${receipt.blockNumber} ✅`);
          
          // Check balance after minting
          const balanceAfter = await contract.balanceOf(signer.address).catch(() => null);
          if (balanceAfter !== null) {
            console.log(`  • New company tokens owned: ${balanceAfter.toString()} ✅`);
          }
        } else {
          console.log('  • Skipping mint test (add --mint flag to test minting) ⏭️');
        }
      } catch (error) {
        console.error(`  • Failed to mint company: ${error.message} ❌`);
      }
    } else {
      console.log('\n🧪 Skipping mintCompany test (no wallet provided) ⏭️');
    }

    console.log('\n✅ Blockchain testing completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Blockchain testing failed:');
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });