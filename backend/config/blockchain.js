const { ethers } = require('ethers');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.init();
  }

  async init() {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
      
      // Initialize signer (for contract interactions)
      if (process.env.PRIVATE_KEY) {
        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      }

      // Load contract ABI and address
      if (process.env.CONTRACT_ADDRESS) {
        // In production, you would load the ABI from a file or database
        // For now, we'll define it inline (you should replace this with the actual ABI)
        const contractABI = [
          // Add your contract ABI here after deployment
          "function mintCompany(string memory name, string memory description, string memory industry, uint256 valuation, string memory tokenURI) public returns (uint256)",
          "function investInCompany(uint256 companyTokenId) public payable",
          "function completeMilestone(uint256 companyTokenId, string memory milestoneType, string memory description, uint256 valuationImpact) public",
          "function getCompany(uint256 tokenId) public view returns (tuple(uint256 tokenId, string name, string description, string industry, uint256 valuation, uint256 totalInvestment, uint256 milestoneCount, address owner, uint256 createdAt, bool isActive))",
          "function getCompanyInvestments(uint256 tokenId) public view returns (tuple(uint256 companyTokenId, address investor, uint256 amount, uint256 timestamp, uint256 ownershipPercentage)[])",
          "function getUserInvestments(address user) public view returns (uint256[])",
          "function getCompanyMilestones(uint256 tokenId) public view returns (tuple(uint256 companyTokenId, string milestoneType, string description, uint256 timestamp, bool verified, uint256 valuationImpact)[])"
        ];

        this.contract = new ethers.Contract(
          process.env.CONTRACT_ADDRESS,
          contractABI,
          this.signer || this.provider
        );
      }

      console.log('✅ Blockchain service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error);
    }
  }

  // Company Methods
  async mintCompany(name, description, industry, valuation, tokenURI, fromAddress) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const tx = await this.contract.mintCompany(
        name,
        description,
        industry,
        ethers.parseEther(valuation.toString()),
        tokenURI
      );

      const receipt = await tx.wait();
      
      // Parse the event to get the token ID
      const event = receipt.logs.find(log => {
        try {
          return this.contract.interface.parseLog(log).name === 'CompanyCreated';
        } catch {
          return false;
        }
      });

      let tokenId = null;
      if (event) {
        const parsedEvent = this.contract.interface.parseLog(event);
        tokenId = parsedEvent.args.tokenId.toString();
      }

      return {
        success: true,
        txHash: tx.hash,
        tokenId,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error minting company:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async investInCompany(companyTokenId, investmentAmount) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const tx = await this.contract.investInCompany(companyTokenId, {
        value: ethers.parseEther(investmentAmount.toString())
      });

      const receipt = await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error investing in company:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async completeMilestone(companyTokenId, milestoneType, description, valuationImpact) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const tx = await this.contract.completeMilestone(
        companyTokenId,
        milestoneType,
        description,
        ethers.parseEther(valuationImpact.toString())
      );

      const receipt = await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error completing milestone:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Query Methods
  async getCompany(tokenId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const company = await this.contract.getCompany(tokenId);
      
      return {
        success: true,
        data: {
          tokenId: company.tokenId.toString(),
          name: company.name,
          description: company.description,
          industry: company.industry,
          valuation: ethers.formatEther(company.valuation),
          totalInvestment: ethers.formatEther(company.totalInvestment),
          milestoneCount: company.milestoneCount.toString(),
          owner: company.owner,
          createdAt: company.createdAt.toString(),
          isActive: company.isActive
        }
      };
    } catch (error) {
      console.error('Error getting company:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getCompanyInvestments(tokenId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const investments = await this.contract.getCompanyInvestments(tokenId);
      
      return {
        success: true,
        data: investments.map(investment => ({
          companyTokenId: investment.companyTokenId.toString(),
          investor: investment.investor,
          amount: ethers.formatEther(investment.amount),
          timestamp: investment.timestamp.toString(),
          ownershipPercentage: investment.ownershipPercentage.toString()
        }))
      };
    } catch (error) {
      console.error('Error getting company investments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserInvestments(userAddress) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const investments = await this.contract.getUserInvestments(userAddress);
      
      return {
        success: true,
        data: investments.map(tokenId => tokenId.toString())
      };
    } catch (error) {
      console.error('Error getting user investments:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getCompanyMilestones(tokenId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const milestones = await this.contract.getCompanyMilestones(tokenId);
      
      return {
        success: true,
        data: milestones.map(milestone => ({
          companyTokenId: milestone.companyTokenId.toString(),
          milestoneType: milestone.milestoneType,
          description: milestone.description,
          timestamp: milestone.timestamp.toString(),
          verified: milestone.verified,
          valuationImpact: ethers.formatEther(milestone.valuationImpact)
        }))
      };
    } catch (error) {
      console.error('Error getting company milestones:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Utility Methods
  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  async estimateGas(method, params) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const gasEstimate = await this.contract[method].estimateGas(...params);
      return gasEstimate.toString();
    } catch (error) {
      console.error('Error estimating gas:', error);
      return null;
    }
  }

  isValidAddress(address) {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }
}

module.exports = new BlockchainService();