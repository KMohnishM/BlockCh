const hre = require("hardhat");

async function main() {
  console.log("Deploying VyaaparAI contract...");

  // Get the ContractFactory and Signers here
  const VyaaparAI = await hre.ethers.getContractFactory("VyaaparAI");
  
  // Deploy the contract
  const vyaaparAI = await VyaaparAI.deploy();

  await vyaaparAI.deployed();

  console.log("VyaaparAI deployed to:", vyaaparAI.address);
  console.log("Contract deployed by:", vyaaparAI.deployTransaction.from);
  console.log("Transaction hash:", vyaaparAI.deployTransaction.hash);

  // Save the contract address to a file for the frontend
  const fs = require("fs");
  const contractsDir = __dirname + "/../contractAddresses";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({
      VyaaparAI: vyaaparAI.address,
      network: hre.network.name,
      deployer: vyaaparAI.deployTransaction.from,
      blockNumber: vyaaparAI.deployTransaction.blockNumber,
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