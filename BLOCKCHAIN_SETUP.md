# Blockchain Integration Testing - Setup Guide

This guide provides detailed instructions for setting up and testing the blockchain integration in the Vyaapar.AI platform.

## Prerequisites

Before starting, ensure you have:

- Node.js v18+ and npm installed
- Git repository cloned and dependencies installed
- MetaMask browser extension installed

## 1. Environment Setup

### Create or Update Environment Files

#### Backend `.env`

Create or update your backend `.env` file with these blockchain-specific settings:

```
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0xYourDeployedContractAddress
PRIVATE_KEY=0xYourPrivateKeyForServerOperations
API_URL=http://localhost:5000/api
```

#### Frontend `.env.local`

Create or update your frontend `.env.local` file:

```
# Blockchain Configuration
REACT_APP_CONTRACT_ADDRESS=0xYourDeployedContractAddress
REACT_APP_RPC_URL=http://localhost:8545
REACT_APP_CHAIN_ID=1337
```

## 2. Start Local Blockchain

Run a local Hardhat node for development:

```bash
cd smart-contracts
npx hardhat node
```

This will start a local blockchain on `http://localhost:8545` with pre-funded test accounts.

## 3. Deploy Smart Contract

In a new terminal, deploy the VyaaparAI contract to your local blockchain:

```bash
cd smart-contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

Note the deployed contract address and update your `.env` files with this address.

## 4. Copy Contract Artifacts

Copy the compiled contract artifacts to the frontend for client-side interaction:

```bash
# Create directory if it doesn't exist
mkdir -p frontend/src/contracts

# Copy contract artifacts
cp smart-contracts/artifacts/contracts/VyaaparAI.sol/VyaaparAI.json frontend/src/contracts/
```

## 5. Run Setup Script

We've created a setup script to automate most of these steps:

```bash
cd backend
npm run setup-blockchain
```

This will:
- Install required dependencies
- Set up environment variables
- Copy contract artifacts to the frontend
- Configure the testing environment

## 6. Start Backend and Frontend

In separate terminals:

```bash
# Start backend server
cd backend
npm run dev

# Start frontend server
cd frontend
npm start
```

## 7. Testing the Integration

### Automated Testing Scripts

We've created two test scripts to verify your blockchain integration:

#### Basic Blockchain Connection Test

```bash
cd backend
npm run test-blockchain
```

This script verifies:
- Connection to the blockchain
- Contract loading
- Basic contract functions

To test minting a company directly on the blockchain:

```bash
npm run test-blockchain -- --mint
```

#### Complete Workflow Test

```bash
cd backend
npm run test-workflow
```

This script tests the complete workflow:
- API authentication
- Company registration with blockchain verification
- Investment with blockchain processing
- Verification of blockchain data

### Manual Testing Steps

#### 1. Connect MetaMask to Local Network

- Open MetaMask
- Add network with:
  - Network Name: `Localhost`
  - RPC URL: `http://localhost:8545`
  - Chain ID: `1337`
  - Currency Symbol: `ETH`

#### 2. Import Test Account

- In MetaMask, click "Import Account"
- Paste one of the private keys from the Hardhat console output
- This account will have test ETH for transactions

#### 3. Test Company Registration

- Log in to the frontend application
- Navigate to "Register Company"
- Fill in company details
- Check "Verify on Blockchain" option
- Submit the form
- Confirm the transaction in MetaMask
- Verify the company shows "Blockchain Verified" badge

#### 4. Test Investment Flow

- Navigate to "Companies"
- Select a blockchain-verified company
- Click "Invest"
- Enter investment amount and equity percentage
- Check "Process via Blockchain" option
- Submit the form
- Confirm the transaction in MetaMask
- Verify the investment shows "Blockchain Verified" status

## 8. Troubleshooting

### Common Issues

#### MetaMask Connection Problems

- Ensure MetaMask is connected to `http://localhost:8545`
- Verify you've imported an account with sufficient ETH
- Check that you're on the correct network (Chain ID: 1337)

#### Contract Deployment Failures

- Make sure Hardhat node is running
- Check for compilation errors
- Verify deployment script is configured correctly

#### Transaction Failures

- Ensure wallet has sufficient ETH for gas
- Check console for error messages
- Verify contract address is correct in environment files

#### API Connection Issues

- Make sure backend server is running on the correct port
- Check for CORS issues in browser console
- Verify API endpoints are accessible

## 9. Production Considerations

For production deployment:

1. Deploy contract to a testnet or mainnet
2. Use secure key management for private keys
3. Implement proper error handling and recovery
4. Set up monitoring for blockchain events
5. Consider gas price management strategies

## Need Help?

If you encounter any issues with the blockchain integration:

1. Check the detailed logs in the console
2. Refer to the blockchain testing report
3. Review the smart contract documentation
4. Follow the troubleshooting guide in this document

---

**Happy Testing!**