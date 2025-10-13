# Blockchain Testing Guide Update

## Fixing the Path Issue

The test scripts have been updated to use the correct path to the contract artifacts. The original path was incorrect as it was looking for the artifacts in the wrong location.

## Prerequisites

Before running the tests, ensure you have:

1. A running local blockchain node (Hardhat or Ganache)
2. Deployed the VyaaparAI smart contract to the local node
3. Set up environment variables in `.env` file in the backend directory:

```
BLOCKCHAIN_RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0xYourContractAddressHere
PRIVATE_KEY=0xYourPrivateKeyHere
API_URL=http://localhost:5000/api
```

## Running Tests

### Basic Blockchain Connection Test

```bash
cd backend
npm run test-blockchain
```

For testing minting functionality:

```bash
npm run test-blockchain -- --mint
```

### Complete Workflow Test

```bash
cd backend
npm run test-workflow
```

## Common Issues and Fixes

1. **Contract artifact not found**
   - Ensure the smart contract has been compiled and deployed with Hardhat
   - Verify the path to the artifacts is correct (now fixed in the scripts)

2. **Missing dependencies**
   - The workflow test requires axios: `npm install axios`

3. **Environment variables**
   - Double-check that your `.env` file contains all required variables
   - Ensure the `CONTRACT_ADDRESS` matches your deployed contract

4. **Contract not deployed**
   - Run `npx hardhat run scripts/deploy.js --network localhost` in the smart-contracts directory

## Directory Structure

For reference, here's the correct directory structure for the blockchain-related files:

```
vyaapar-ai/
  ├── backend/
  │   ├── scripts/
  │   │   ├── test-blockchain.js
  │   │   └── test-workflow.js
  │   └── .env  # Backend environment variables
  │
  ├── smart-contracts/
  │   ├── artifacts/
  │   │   └── contracts/
  │   │       └── VyaaparAI.sol/
  │   │           └── VyaaparAI.json
  │   ├── contracts/
  │   │   └── VyaaparAI.sol
  │   └── scripts/
  │       └── deploy.js
  │
  └── frontend/
      ├── src/
      │   ├── contracts/
      │   │   └── VyaaparAI.json  # Copy from smart-contracts/artifacts
      │   └── components/
      │       └── Blockchain/
      │           └── BlockchainDebugPanel.js
      └── .env  # Frontend environment variables
```

## Next Steps

After fixing these issues, you should be able to run the tests successfully. Remember to:

1. Have the local blockchain node running
2. Have the contract deployed
3. Set up all environment variables correctly

For any additional issues, check the console output for specific error messages and refer to this guide for solutions.