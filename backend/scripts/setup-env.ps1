# Basic PowerShell Setup Script for Blockchain Testing

Write-Host "Setting up blockchain test environment..." -ForegroundColor Cyan

# Ensure axios is installed
Write-Host "Installing axios package if needed..." -ForegroundColor Yellow
npm install axios

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file with default values..." -ForegroundColor Yellow
    "BLOCKCHAIN_RPC_URL=http://localhost:8545" | Out-File -FilePath ".env"
    "CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3" | Add-Content -FilePath ".env"
    "PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" | Add-Content -FilePath ".env"
    "API_URL=http://localhost:5000/api" | Add-Content -FilePath ".env"
}

# Try to copy contract artifacts
$smartContractsPath = Join-Path (Split-Path (Get-Location) -Parent) "smart-contracts"
$artifactPath = Join-Path $smartContractsPath "artifacts\contracts\VyaaparAI.sol\VyaaparAI.json"
$frontendPath = Join-Path (Split-Path (Get-Location) -Parent) "frontend"
$frontendContractsPath = Join-Path $frontendPath "src\contracts"

if (Test-Path $artifactPath) {
    Write-Host "Copying contract artifacts to frontend..." -ForegroundColor Yellow
    
    # Create contracts directory if it doesn't exist
    if (-not (Test-Path $frontendContractsPath)) {
        New-Item -ItemType Directory -Path $frontendContractsPath -Force | Out-Null
    }
    
    # Copy artifacts
    Copy-Item -Path $artifactPath -Destination $frontendContractsPath -Force
    Write-Host "Contract artifacts copied successfully" -ForegroundColor Green
} else {
    Write-Host "Contract artifacts not found. Make sure to compile the contract with hardhat." -ForegroundColor Red
}

Write-Host "Setup completed!" -ForegroundColor Green
Write-Host "You can now run the test scripts:" -ForegroundColor Cyan
Write-Host "  npm run test-blockchain" -ForegroundColor Cyan
Write-Host "  npm run test-workflow" -ForegroundColor Cyan