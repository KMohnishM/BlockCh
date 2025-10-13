# Setup script for blockchain testing environment

# Create a basic PowerShell function to set up the testing environment
function Setup-BlockchainTest {
    Write-Host "📋 Vyaapar AI Blockchain Test Setup" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""

    # Get project paths
    $backendPath = (Get-Location).Path
    $smartContractsPath = Join-Path (Split-Path $backendPath -Parent) "smart-contracts"
    $frontendPath = Join-Path (Split-Path $backendPath -Parent) "frontend"
    
    # Create or ensure .env file exists
    $envFile = Join-Path $backendPath ".env"
    if (-not (Test-Path $envFile)) {
        "" | Out-File -FilePath $envFile
        Write-Host "Created new .env file" -ForegroundColor Green
    }
    
    # Read .env content
    $envContent = Get-Content $envFile -ErrorAction SilentlyContinue

    # Set CONTRACT_ADDRESS if not present
    if (-not ($envContent | Where-Object { $_ -match "CONTRACT_ADDRESS=" })) {
        Write-Host "No CONTRACT_ADDRESS found in .env file" -ForegroundColor Yellow
        Write-Host "Please make sure to deploy the contract and add the address to .env" -ForegroundColor Yellow
        Add-Content -Path $envFile -Value "CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3"
        Write-Host "Added default local Hardhat contract address to .env file" -ForegroundColor Yellow
    } else {
        Write-Host "CONTRACT_ADDRESS already exists in .env file" -ForegroundColor Green
    }

    # Set BLOCKCHAIN_RPC_URL if not present
    if (-not ($envContent | Where-Object { $_ -match "BLOCKCHAIN_RPC_URL=" })) {
        Write-Host "Adding BLOCKCHAIN_RPC_URL to .env file" -ForegroundColor Yellow
        Add-Content -Path $envFile -Value "BLOCKCHAIN_RPC_URL=http://localhost:8545"
    } else {
        Write-Host "BLOCKCHAIN_RPC_URL already exists in .env file" -ForegroundColor Green
    }
    
    # Set API_URL if not present
    if (-not ($envContent | Where-Object { $_ -match "API_URL=" })) {
        Write-Host "Adding API_URL to .env file" -ForegroundColor Yellow
        Add-Content -Path $envFile -Value "API_URL=http://localhost:5000/api"
    } else {
        Write-Host "API_URL already exists in .env file" -ForegroundColor Green
    }

    # Check for test private key
    if (-not ($envContent | Where-Object { $_ -match "PRIVATE_KEY=" })) {
        Write-Host "No PRIVATE_KEY found in .env file" -ForegroundColor Yellow
        $addTestKey = Read-Host "Would you like to add a test private key? (y/n)"
        
        if ($addTestKey -eq "y" -or $addTestKey -eq "Y") {
            Add-Content -Path $envFile -Value "PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
            Write-Host "Added test private key to .env file" -ForegroundColor Green
        } else {
            Write-Host "Please add a PRIVATE_KEY to your .env file manually" -ForegroundColor Yellow
        }
    } else {
        Write-Host "PRIVATE_KEY already exists in .env file" -ForegroundColor Green
    }

    # Install axios if needed
    Write-Host "Checking for axios package..." -ForegroundColor Yellow
    try {
        npm list axios | Out-Null
        Write-Host "axios is already installed" -ForegroundColor Green
    }
    catch {
        Write-Host "Installing axios package..." -ForegroundColor Yellow
        npm install axios
    }
    
    # Check for contract artifacts and copy them if needed
    $artifactPath = Join-Path $smartContractsPath "artifacts\contracts\VyaaparAI.sol\VyaaparAI.json"
    if (Test-Path $artifactPath) {
        Write-Host "Found contract artifacts" -ForegroundColor Green
        
        # Create contracts directory in frontend
        $frontendContractsPath = Join-Path $frontendPath "src\contracts"
        if (-not (Test-Path $frontendContractsPath)) {
            New-Item -ItemType Directory -Path $frontendContractsPath -Force | Out-Null
            Write-Host "Created frontend contracts directory" -ForegroundColor Green
        }
        
        # Copy artifacts
        Copy-Item -Path $artifactPath -Destination $frontendContractsPath -Force
        Write-Host "Copied contract artifacts to frontend" -ForegroundColor Green
    } else {
        Write-Host "Contract artifacts not found. Make sure to compile the contract." -ForegroundColor Yellow
        Write-Host "Run 'npx hardhat compile' in the smart-contracts directory" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "✅ Setup completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Make sure your local blockchain is running" -ForegroundColor Cyan
    Write-Host "2. Run the test scripts:" -ForegroundColor Cyan
    Write-Host "   npm run test-blockchain" -ForegroundColor Cyan
    Write-Host "   npm run test-workflow" -ForegroundColor Cyan
}

# Run the setup function
Setup-BlockchainTest