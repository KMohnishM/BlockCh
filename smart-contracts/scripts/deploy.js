const hre = require("hardhat");

async function main() {
  console.log("Deploying VyaaparAI contract...");

  // Get the ContractFactory and Signers here
  const VyaaparAI = await hre.ethers.getContractFactory("VyaaparAI");
  
  // Deploy the contract
  const vyaaparAI = await VyaaparAI.deploy();
  
  // Wait for the contract to be deployed
  await vyaaparAI.waitForDeployment();
  
  // Get the contract address
  const contractAddress = await vyaaparAI.getAddress();
  
  // Get the deployment transaction
  const deployTx = vyaaparAI.deploymentTransaction();
  const provider = hre.ethers.provider;
  const receipt = await provider.getTransactionReceipt(deployTx.hash);
  
  console.log("VyaaparAI deployed to:", contractAddress);
  console.log("Contract deployed by:", receipt.from);
  console.log("Transaction hash:", deployTx.hash);

  // Save the contract address to a file for the frontend
  const fs = require("fs");
  const contractsDir = __dirname + "/../contractAddresses";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({
      VyaaparAI: contractAddress,
      network: hre.network.name,
      deployer: receipt.from,
      blockNumber: receipt.blockNumber,
      deployedAt: new Date().toISOString()
    }, undefined, 2)
  );

  // Also copy artifacts to frontend
  const artifactsSource = __dirname + "/../artifacts/contracts/VyaaparAI.sol/VyaaparAI.json";
  const frontendArtifacts = __dirname + "/../../frontend/src/contracts/VyaaparAI.json";
  
  // Create frontend contracts directory if it doesn't exist
  const frontendContractsDir = __dirname + "/../../frontend/src/contracts";
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }
  
  // Copy the artifact
  if (fs.existsSync(artifactsSource)) {
    fs.copyFileSync(artifactsSource, frontendArtifacts);
    console.log("Contract artifacts copied to frontend");
  }

  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });