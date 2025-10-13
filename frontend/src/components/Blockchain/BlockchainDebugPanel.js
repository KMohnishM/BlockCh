import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

// Services & Utilities
import { apiMethods } from '../../services/api';
import { useWallet } from '../../store/walletStore';
import { formatEther } from '../../utils/formatters';

// Contract artifacts
import VyaaparAIArtifact from '../../contracts/VyaaparAI.json';

const BlockchainDebugPanel = () => {
  const { connected, address, provider, signer } = useWallet();
  const [contractAddress, setContractAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [ethBalance, setEthBalance] = useState('0');
  const [ownedTokens, setOwnedTokens] = useState([]);
  const [contract, setContract] = useState(null);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Initialize contract and address
  useEffect(() => {
    const contractAddr = process.env.REACT_APP_CONTRACT_ADDRESS;
    setContractAddress(contractAddr);

    if (connected && provider && contractAddr) {
      try {
        const contractInstance = new ethers.Contract(
          contractAddr,
          VyaaparAIArtifact.abi,
          signer || provider
        );
        setContract(contractInstance);

        // Load ETH balance
        const loadBalance = async () => {
          try {
            const balance = await provider.getBalance(address);
            setEthBalance(ethers.formatEther(balance));
          } catch (error) {
            console.error('Error fetching ETH balance:', error);
          }
        };
        
        loadBalance();
      } catch (err) {
        console.error('Error initializing contract:', err);
        toast.error('Failed to initialize contract connection');
      }
    }
  }, [connected, provider, signer, address]);

  // Verify a transaction
  const verifyTransaction = async () => {
    if (!txHash) {
      toast.error('Please enter a transaction hash');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiMethods.blockchain.verifyTransaction(txHash);
      setVerificationResult(response.data);
      
      if (response.data.success) {
        toast.success('Transaction verified successfully');
      } else {
        toast.error('Transaction verification failed');
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
      toast.error('Error verifying transaction');
      setVerificationResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Load tokens owned by the wallet
  const loadOwnedTokens = async () => {
    if (!connected || !contract) {
      toast.error('Wallet not connected or contract not initialized');
      return;
    }

    setLoadingTokens(true);
    try {
      // Get token balance
      const balance = await contract.balanceOf(address);
      setTokenBalance(balance.toString());

      // Get all tokens
      const tokens = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(address, i);
        const company = await contract.companies(tokenId);
        
        // Get investments for this token
        const investmentCount = await contract.getInvestmentCount(tokenId);
        const investments = [];
        
        for (let j = 0; j < investmentCount; j++) {
          const inv = await contract.getInvestment(tokenId, j);
          investments.push({
            investor: inv.investor,
            amount: ethers.formatEther(inv.amount),
            equity: inv.equity.toString(),
            timestamp: new Date(Number(inv.timestamp) * 1000).toLocaleString()
          });
        }

        tokens.push({
          tokenId: tokenId.toString(),
          name: company.name,
          description: company.description,
          industry: company.industry,
          valuation: ethers.formatEther(company.valuation),
          investments
        });
      }
      
      setOwnedTokens(tokens);
      if (tokens.length > 0) {
        toast.success(`Found ${tokens.length} company tokens`);
      } else {
        toast.info('No company tokens found for this wallet');
      }
    } catch (error) {
      console.error('Error loading owned tokens:', error);
      toast.error('Failed to load company tokens');
    } finally {
      setLoadingTokens(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Blockchain Debug Panel</h3>
      
      {/* Wallet Status */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-800 mb-2">Wallet Status</h4>
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="mb-2">
            <span className="font-medium">Connection:</span> 
            <span className={`ml-2 ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </p>
          
          {connected && (
            <>
              <p className="mb-2">
                <span className="font-medium">Wallet Address:</span>
                <span className="ml-2 font-mono text-sm break-all">{address}</span>
              </p>
              <p className="mb-2">
                <span className="font-medium">ETH Balance:</span>
                <span className="ml-2">{ethBalance} ETH</span>
              </p>
              <p>
                <span className="font-medium">Company Tokens:</span>
                <span className="ml-2">{tokenBalance}</span>
              </p>
            </>
          )}
        </div>
      </div>
      
      {/* Contract Information */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-800 mb-2">Contract Information</h4>
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm mb-2">
            <span className="font-medium">Contract Address:</span> 
            <span className="ml-2 font-mono text-sm break-all">
              {contractAddress || "Not set - check .env file"}
            </span>
          </p>
          <p className="text-sm mb-2">
            <span className="font-medium">Network:</span>
            <span className="ml-2 font-mono text-sm">
              {process.env.REACT_APP_CHAIN_ID === '1' ? 'Ethereum Mainnet' : 
               process.env.REACT_APP_CHAIN_ID === '11155111' ? 'Sepolia Testnet' :
               process.env.REACT_APP_CHAIN_ID === '1337' ? 'Local Hardhat Node' :
               `Unknown (Chain ID: ${process.env.REACT_APP_CHAIN_ID || 'Not set'})`}
            </span>
          </p>
        </div>
      </div>
      
      {/* Transaction Verification */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-800 mb-2">Verify Transaction</h4>
        <div className="flex space-x-2">
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Enter transaction hash (0x...)"
            className="input flex-1"
          />
          <button 
            onClick={verifyTransaction}
            disabled={isLoading}
            className="btn btn-primary whitespace-nowrap"
          >
            {isLoading ? 'Verifying...' : 'Verify Tx'}
          </button>
        </div>
        
        {verificationResult && (
          <div className={`mt-4 p-4 rounded-md ${verificationResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <h5 className="font-medium mb-2">Result:</h5>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(verificationResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      {/* Company Tokens */}
      {connected && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-md font-medium text-gray-800">Your Company Tokens</h4>
            <button
              onClick={loadOwnedTokens}
              disabled={loadingTokens || !connected}
              className="btn btn-sm btn-secondary"
            >
              {loadingTokens ? 'Loading...' : 'Refresh Tokens'}
            </button>
          </div>
          
          {loadingTokens ? (
            <p className="text-gray-600">Loading tokens...</p>
          ) : ownedTokens.length > 0 ? (
            <div className="space-y-4">
              {ownedTokens.map(token => (
                <div key={token.tokenId} className="border border-gray-200 rounded-md p-4">
                  <p className="mb-1"><span className="font-medium">Token ID:</span> {token.tokenId}</p>
                  <p className="mb-1"><span className="font-medium">Name:</span> {token.name}</p>
                  <p className="mb-1"><span className="font-medium">Industry:</span> {token.industry}</p>
                  <p className="mb-1"><span className="font-medium">Valuation:</span> {token.valuation} ETH</p>
                  
                  {token.investments.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium mb-1">Investments:</p>
                      <div className="bg-gray-50 p-2 rounded max-h-40 overflow-y-auto">
                        {token.investments.map((inv, idx) => (
                          <div key={idx} className="text-sm border-b border-gray-200 pb-1 mb-1">
                            <p>From: {inv.investor.substring(0, 6)}...{inv.investor.substring(38)}</p>
                            <p>Amount: {inv.amount} ETH</p>
                            <p>Equity: {inv.equity}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No company tokens found for this wallet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BlockchainDebugPanel;