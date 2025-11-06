const { ethers } = require('ethers');
require('dotenv').config();

async function checkBalance() {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545');
        
        // Check the signer wallet balance
        const signerAddress = '0xe28A4a57D33b0aa111DB89930FF2b1e38dc38f34';
        const balance = await provider.getBalance(signerAddress);
        
        console.log('Wallet Address:', signerAddress);
        console.log('Balance:', ethers.formatEther(balance), 'ETH');
        console.log('Balance sufficient for transaction:', parseFloat(ethers.formatEther(balance)) > 0.001 ? '✅ Yes' : '❌ No');
        
    } catch (error) {
        console.error('Error checking balance:', error);
    }
}

checkBalance();