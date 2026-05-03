require('dotenv').config();
const { ethers } = require('ethers');
const blockchainService = require('../config/blockchain');

async function showBalances() {
  try {
    // Wait briefly for blockchainService init
    await new Promise(r => setTimeout(r, 500));

    // Configured env vars
    const envWallet = process.env.WALLET_ADDRESS || null;
    const privKey = process.env.PRIVATE_KEY || null;

    // Resolve signer address from service if available
    let signerAddr = null;
    try {
      signerAddr = blockchainService.signer ? await blockchainService.signer.getAddress() : null;
    } catch (e) {
      signerAddr = null;
    }

    // If no signerAddr but PRIVATE_KEY present, compute it
    if (!signerAddr && privKey) {
      try {
        signerAddr = new ethers.Wallet(privKey).address;
      } catch (e) {
        // ignore
      }
    }

    console.log('Configured environment:');
    console.log('  WALLET_ADDRESS =', envWallet);
    console.log('  PRIVATE_KEY set =', !!privKey);
    console.log('');

    const provider = blockchainService.provider || new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545');

    // Gather addresses to check
    const addrs = new Set();
    if (envWallet) addrs.add(envWallet.toLowerCase());
    if (signerAddr) addrs.add(signerAddr.toLowerCase());

    if (addrs.size === 0) {
      console.log('No wallet addresses configured.');
      return;
    }

    for (const a of addrs) {
      try {
        const bal = await provider.getBalance(a);
        console.log(`Address: ${a}`);
        console.log(`  Balance: ${ethers.formatEther(bal)} ETH`);
      } catch (e) {
        console.log(`Address: ${a}`);
        console.log('  Error fetching balance:', e.message);
      }
    }

  } catch (error) {
    console.error('Error:', error.message || error);
  }
}

showBalances();