import { ethers } from 'ethers';
import toast from 'react-hot-toast';

// Contract ABI - This should match your deployed contract
const CONTRACT_ABI = [
  "function mintCompany(string memory name, string memory description, string memory industry, uint256 valuation, string memory tokenURI) public returns (uint256)",
  "function investInCompany(uint256 companyTokenId) public payable",
  "function completeMilestone(uint256 companyTokenId, string memory milestoneType, string memory description, uint256 valuationImpact) public",
  "function getCompany(uint256 tokenId) public view returns (tuple(uint256 tokenId, string name, string description, string industry, uint256 valuation, uint256 totalInvestment, uint256 milestoneCount, address owner, uint256 createdAt, bool isActive))",
  "function getCompanyInvestments(uint256 tokenId) public view returns (tuple(uint256 companyTokenId, address investor, uint256 amount, uint256 timestamp, uint256 ownershipPercentage)[])",
  "function getUserInvestments(address user) public view returns (uint256[])",
  "function getCompanyMilestones(uint256 tokenId) public view returns (tuple(uint256 companyTokenId, string milestoneType, string description, uint256 timestamp, bool verified, uint256 valuationImpact)[])"
];

class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    this.chainId = process.env.REACT_APP_CHAIN_ID || '1337';
    console.log('Web3Service initialized with contract address:', this.contractAddress);
  }

  // Check if MetaMask is installed
  isMetaMaskInstalled() {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
  }

  // Initialize Web3 connection
  async init() {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get the signer (user's account)
      this.signer = await this.provider.getSigner();
      
      // Initialize contract if address is available
      if (this.contractAddress) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          CONTRACT_ABI,
          this.signer
        );
      }

      return {
        provider: this.provider,
        signer: this.signer,
        contract: this.contract
      };
    } catch (error) {
      console.error('Failed to initialize Web3:', error);
      throw error;
    }
  }

  // Connect wallet
  async connectWallet() {
    if (!this.isMetaMaskInstalled()) {
      toast.error('Please install MetaMask to connect your wallet');
      return null;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      await this.init();

      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      const network = await this.provider.getNetwork();

      return {
        address,
        balance: ethers.formatEther(balance),
        chainId: network.chainId.toString(),
        provider: this.provider,
        signer: this.signer
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      if (error.code === 4001) {
        toast.error('Please connect your MetaMask wallet');
      } else {
        toast.error(`Failed to connect wallet: ${error.message}`);
      }
      throw error;
    }
  }

  // Sign message for authentication
  async signMessage(message) {
    try {
      if (!this.signer) {
        await this.init();
      }

      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      if (error.code === 4001) {
        toast.error('Message signing was rejected');
      } else {
        toast.error(`Failed to sign message: ${error.message}`);
      }
      throw error;
    }
  }

  // Switch to correct network
  async switchNetwork(targetChainId) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(targetChainId).toString(16)}` }],
      });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Network not added to MetaMask
        return this.addNetwork(targetChainId);
      }
      throw error;
    }
  }

  // Add network to MetaMask
  async addNetwork(chainId) {
    const networks = {
      '1337': {
        chainId: '0x539',
        chainName: 'Localhost 8545',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['http://localhost:8545'],
        blockExplorerUrls: null,
      },
      '11155111': {
        chainId: '0xaa36a7',
        chainName: 'Sepolia Testnet',
        nativeCurrency: { name: 'SepoliaETH', symbol: 'SEP', decimals: 18 },
        rpcUrls: ['https://sepolia.infura.io/v3/'],
        blockExplorerUrls: ['https://sepolia.etherscan.io/'],
      },
    };

    const networkConfig = networks[chainId];
    if (!networkConfig) {
      throw new Error('Unsupported network');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig],
      });
      return true;
    } catch (error) {
      console.error('Failed to add network:', error);
      throw error;
    }
  }

  // Contract Methods
  async mintCompany(name, description, industry, valuation, tokenURI) {
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

      toast.success('Transaction submitted. Waiting for confirmation...');
      const receipt = await tx.wait();

      return {
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error('Failed to mint company:', error);
      this.handleContractError(error);
      throw error;
    }
  }

  async investInCompany(companyTokenId, amount) {
    try {
      console.log('investInCompany called with:', { companyTokenId, amount, hasContract: !!this.contract });
      
      if (!this.contract) {
        console.log('Contract not initialized, attempting to initialize...');
        await this.init();
        if (!this.contract) {
          throw new Error('Contract not initialized - missing contract address');
        }
      }

      console.log('Contract available, submitting transaction...');
      const tx = await this.contract.investInCompany(companyTokenId, {
        value: ethers.parseEther(amount.toString())
      });

      toast.success('Investment submitted. Waiting for confirmation...');
      const receipt = await tx.wait();

      return {
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error('Failed to invest:', error);
      this.handleContractError(error);
      throw error;
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

      toast.success('Milestone submitted. Waiting for confirmation...');
      const receipt = await tx.wait();

      return {
        txHash: tx.hash,
        receipt
      };
    } catch (error) {
      console.error('Failed to complete milestone:', error);
      this.handleContractError(error);
      throw error;
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
      };
    } catch (error) {
      console.error('Failed to get company:', error);
      throw error;
    }
  }

  async getCompanyInvestments(tokenId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const investments = await this.contract.getCompanyInvestments(tokenId);
      return investments.map(inv => ({
        companyTokenId: inv.companyTokenId.toString(),
        investor: inv.investor,
        amount: ethers.formatEther(inv.amount),
        timestamp: inv.timestamp.toString(),
        ownershipPercentage: inv.ownershipPercentage.toString()
      }));
    } catch (error) {
      console.error('Failed to get company investments:', error);
      throw error;
    }
  }

  async getUserInvestments(userAddress) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const investments = await this.contract.getUserInvestments(userAddress);
      return investments.map(tokenId => tokenId.toString());
    } catch (error) {
      console.error('Failed to get user investments:', error);
      throw error;
    }
  }

  // Utility Methods
  handleContractError(error) {
    if (error.code === 4001) {
      toast.error('Transaction rejected by user');
    } else if (error.message.includes('insufficient funds')) {
      toast.error('Insufficient funds for transaction');
    } else if (error.message.includes('gas')) {
      toast.error('Transaction failed due to gas issues');
    } else {
      toast.error(`Transaction failed: ${error.message}`);
    }
  }

  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  formatEther(value) {
    return ethers.formatEther(value);
  }

  parseEther(value) {
    return ethers.parseEther(value.toString());
  }

  // Event listeners
  setupEventListeners() {
    if (!window.ethereum) return;

    // Listen for account changes
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        this.disconnect();
      } else {
        // Account changed
        window.location.reload();
      }
    });

    // Listen for chain changes
    window.ethereum.on('chainChanged', (chainId) => {
      window.location.reload();
    });
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }
}

const web3Service = new Web3Service();
export default web3Service;