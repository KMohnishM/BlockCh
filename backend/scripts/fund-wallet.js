const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
        const localSigner = new ethers.Wallet(
            // First account private key from Hardhat
            '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            provider
        );

        // The address we want to fund (from env)
        const targetAddress = process.env.WALLET_ADDRESS || '0xBCfb98b5fc4Fa8a8169253f0008943F74668b39A';

        console.log('Funding wallet:', targetAddress);
        
        // Send 1 ETH
        const tx = await localSigner.sendTransaction({
            to: targetAddress,
            value: ethers.parseEther('1.0')
        });

        console.log('Transaction sent:', tx.hash);
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);

        const balance = await provider.getBalance(targetAddress);
        console.log('New balance:', ethers.formatEther(balance), 'ETH');

    } catch (error) {
        console.error('Error funding wallet:', error);
    }
}

main();