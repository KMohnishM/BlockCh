# Blockchain Testing Guide

This document provides a guide for testing the blockchain integration in the Vyaapar.AI application. It covers the testing of company registration, investment processing, and verification of blockchain data.

## Prerequisites

Before testing, ensure you have the following:

1. A running local blockchain node (Hardhat or Ganache)
2. The VyaaparAI smart contract deployed
3. Environment variables set up in `.env` file:
   ```
   BLOCKCHAIN_RPC_URL=http://localhost:8545
   CONTRACT_ADDRESS=0x...
   PRIVATE_KEY=0x...
   API_URL=http://localhost:5000/api
   ```

## Testing Scripts

We've created two scripts to help with testing:

### 1. Basic Blockchain Connection Test

This script tests the basic connection to the blockchain and contract functionality.

```bash
# Add the script to package.json scripts
npm run test-blockchain
```

To test minting a company directly on the blockchain:

```bash
npm run test-blockchain -- --mint
```

### 2. Complete Workflow Test

This script tests the complete blockchain workflow from the API, including:
- Company registration with blockchain verification
- Making an investment with blockchain verification
- Verifying the data on the blockchain

```bash
npm run test-workflow
```

## Manual Testing Guide

### 1. Testing Company Registration with Blockchain

1. **Connect Wallet:**
   - Open the application and log in
   - Click "Connect Wallet" in the header
   - Ensure MetaMask connects successfully

2. **Register a Company:**
   - Navigate to Dashboard → Register Company
   - Fill in company details
   - Check "Verify on Blockchain" option
   - Submit the form
   - Approve the transaction in MetaMask when prompted

3. **Verify Registration:**
   - Navigate to Dashboard → Companies
   - Find your company in the list
   - Verify the "Blockchain Verified" badge is displayed

### 2. Testing Investment with Blockchain

1. **View Company Details:**
   - Navigate to Dashboard → Companies
   - Click on a blockchain-verified company

2. **Make an Investment:**
   - Click "Invest" button
   - Enter investment amount and equity percentage
   - Check "Process via Blockchain" option
   - Submit the investment
   - Approve the transaction in MetaMask when prompted

3. **Verify Investment:**
   - Check the company's investments tab
   - Verify the investment shows "Blockchain Verified" status

### 3. Using the Debug Panel

A debug panel is available to verify blockchain data:

1. Navigate to Dashboard → Profile
2. Click on "Blockchain Debug Panel"
3. Check wallet connection status
4. View owned company tokens
5. Verify transaction history

## Troubleshooting

### Common Issues:

1. **Wallet Connection Issues:**
   - Ensure MetaMask is installed and unlocked
   - Check you're on the correct network (localhost:8545 for development)
   - Try disconnecting and reconnecting

2. **Transaction Failures:**
   - Check browser console for errors
   - Verify gas settings in MetaMask
   - Ensure the wallet has enough ETH for gas fees

3. **Contract Interaction Failures:**
   - Verify contract address is correct in environment variables
   - Check that ABI matches deployed contract
   - Ensure the contract is deployed on the connected network

### Backend Logs:

Monitor the backend logs for blockchain-related errors:

```bash
# Filter backend logs for blockchain-related messages
npm run dev | grep -i blockchain
```

## Integration Points

The main integration points between the application and blockchain are:

1. **Frontend:**
   - `src/utils/web3.js` - Web3 service
   - `src/components/Wallet/WalletButton.js` - Wallet connection
   - `src/pages/Dashboard/RegisterCompany.js` - Company registration
   - `src/pages/Dashboard/CompanyDetail.js` - Investment processing

2. **Backend:**
   - `config/blockchain.js` - Blockchain service
   - `routes/companies.js` - Company registration API
   - `routes/investments.js` - Investment API
   - `routes/blockchain.js` - Blockchain-specific APIs

## Next Steps

After testing, consider the following improvements:

1. Add more comprehensive error handling for blockchain transactions
2. Implement transaction status monitoring
3. Add blockchain event listeners for real-time updates
4. Improve the UI feedback during blockchain interactions