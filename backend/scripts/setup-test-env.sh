#!/bin/bash

# Blockchain Test Environment Setup Script
# This script sets up the environment for testing the blockchain integration.

# Create temporary directory for this script
mkdir -p temp

echo "📋 Vyaapar AI Blockchain Test Setup"
echo "==================================="
echo ""

# Check if contract is deployed
echo "🔍 Checking for deployed contract..."

# Get deployed contract address
if [ -f .env ] && grep -q "CONTRACT_ADDRESS" .env; then
  CONTRACT_ADDRESS=$(grep CONTRACT_ADDRESS .env | cut -d '=' -f2)
  echo "✅ Found contract address: $CONTRACT_ADDRESS"
else
  echo "⚠️ No contract address found in .env file"
  echo "❓ Would you like to deploy the contract now? (y/n)"
  read -r deploy_contract

  if [ "$deploy_contract" = "y" ] || [ "$deploy_contract" = "Y" ]; then
    echo "🚀 Deploying contract..."
    cd ../smart-contracts || exit
    CONTRACT_ADDRESS=$(npx hardhat run scripts/deploy.js --network localhost | grep -oE '0x[a-fA-F0-9]{40}')
    cd ../backend || exit
    echo "✅ Contract deployed at: $CONTRACT_ADDRESS"
    
    # Update .env file
    if [ -f .env ]; then
      sed -i '/CONTRACT_ADDRESS=/d' .env
      echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> .env
    else
      echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" > .env
    fi
    
    # Update frontend .env file
    if [ -f ../frontend/.env ]; then
      sed -i '/REACT_APP_CONTRACT_ADDRESS=/d' ../frontend/.env
      echo "REACT_APP_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> ../frontend/.env
    else
      echo "REACT_APP_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" > ../frontend/.env
      echo "REACT_APP_RPC_URL=http://localhost:8545" >> ../frontend/.env
      echo "REACT_APP_CHAIN_ID=1337" >> ../frontend/.env
    fi
  else
    echo "❌ Contract deployment skipped. Please deploy the contract manually."
    exit 1
  fi
fi

# Copy contract artifacts to frontend
echo ""
echo "📂 Copying contract artifacts to frontend..."

if [ -d "../smart-contracts/artifacts/contracts/VyaaparAI.sol" ]; then
  mkdir -p ../frontend/src/contracts
  cp "../smart-contracts/artifacts/contracts/VyaaparAI.sol/VyaaparAI.json" "../frontend/src/contracts/"
  echo "✅ Artifacts copied successfully"
else
  echo "❌ Contract artifacts not found. Make sure the contract is compiled."
  echo "💡 Try running: cd ../smart-contracts && npx hardhat compile"
  exit 1
fi

# Check if environment variables are set
echo ""
echo "🔑 Checking environment variables..."

# Check BLOCKCHAIN_RPC_URL
if [ -f .env ] && grep -q "BLOCKCHAIN_RPC_URL" .env; then
  echo "✅ BLOCKCHAIN_RPC_URL is set"
else
  echo "⚠️ BLOCKCHAIN_RPC_URL not found in .env file"
  echo "📝 Adding default value (http://localhost:8545)"
  echo "BLOCKCHAIN_RPC_URL=http://localhost:8545" >> .env
fi

# Check PRIVATE_KEY
if [ -f .env ] && grep -q "PRIVATE_KEY" .env; then
  echo "✅ PRIVATE_KEY is set"
else
  echo "⚠️ PRIVATE_KEY not found in .env file"
  echo "❓ Would you like to use a test private key? (y/n)"
  read -r use_test_key
  
  if [ "$use_test_key" = "y" ] || [ "$use_test_key" = "Y" ]; then
    # First test account from Hardhat
    echo "PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" >> .env
    echo "✅ Test private key added"
  else
    echo "❌ PRIVATE_KEY is required for testing. Please add it to your .env file."
  fi
fi

# Check API_URL
if [ -f .env ] && grep -q "API_URL" .env; then
  echo "✅ API_URL is set"
else
  echo "⚠️ API_URL not found in .env file"
  echo "📝 Adding default value (http://localhost:5000/api)"
  echo "API_URL=http://localhost:5000/api" >> .env
fi

# Install required packages
echo ""
echo "📦 Checking required packages..."

if ! npm list axios | grep -q axios; then
  echo "📦 Installing axios..."
  npm install axios
else
  echo "✅ axios is already installed"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🧪 You can now run the test scripts:"
echo "  npm run test-blockchain"
echo "  npm run test-workflow"
echo ""
echo "💡 Make sure your local blockchain node is running with:"
echo "  cd ../smart-contracts && npx hardhat node"
echo ""

# Clean up
rm -rf temp