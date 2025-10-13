# Blockchain Test Environment Setup

This file contains instructions for setting up the proper environment for blockchain testing with Vyaapar.AI.

## 1. Setting up the Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0xYourContractAddressHere
PRIVATE_KEY=0xYourPrivateKeyHere

# API Configuration
API_URL=http://localhost:5000/api
```

Create a `.env` file in the frontend directory with the following variables:

```
REACT_APP_CONTRACT_ADDRESS=0xYourContractAddressHere
REACT_APP_RPC_URL=http://localhost:8545
REACT_APP_CHAIN_ID=1337
```

## 2. Running a Local Blockchain Node

You can use Hardhat's built-in network for local development:

```bash
cd smart-contracts
npx hardhat node
```

This will start a local blockchain node on port 8545 with a set of pre-funded accounts.

## 3. Deploying the Smart Contract

In a new terminal, deploy the smart contract to the local network:

```bash
cd smart-contracts
npx hardhat run scripts/deploy.js --network localhost
```

Copy the deployed contract address and update your `.env` files.

## 4. Copy Contract Artifacts

Copy the contract artifacts to the frontend for client-side interaction:

```bash
# On Windows
mkdir -p frontend/src/contracts
copy smart-contracts\artifacts\contracts\VyaaparAI.sol\VyaaparAI.json frontend\src\contracts\

# On Unix/Linux
mkdir -p frontend/src/contracts
cp smart-contracts/artifacts/contracts/VyaaparAI.sol/VyaaparAI.json frontend/src/contracts/
```

## 5. Starting the Backend and Frontend

Start the backend server:

```bash
cd backend
npm run dev
```

In another terminal, start the frontend:

```bash
cd frontend
npm start
```

## 6. Running Tests

After setting up the environment, run the test scripts:

```bash
cd backend
npm run test-blockchain
npm run test-workflow
```

## Troubleshooting

### Contract Deployment Issues

If you encounter issues with contract deployment:

1. Make sure your Hardhat node is running
2. Check that you're using the correct network configuration in hardhat.config.js
3. Ensure you have enough ETH in the deployer account

### Connection Issues

If the tests can't connect to the blockchain:

1. Verify that your local node is running (`npx hardhat node`)
2. Check that the BLOCKCHAIN_RPC_URL is correct (usually http://localhost:8545)
3. Ensure the CONTRACT_ADDRESS in your .env file matches the deployed contract address

### Transaction Issues

If transactions fail:

1. Ensure your wallet has enough ETH for gas fees
2. Check that you're using the correct private key in the .env file
3. Verify that the contract functions are being called with the correct parameters

### Axios Issues

If the workflow test fails due to axios:

```bash
cd backend
npm install axios
```