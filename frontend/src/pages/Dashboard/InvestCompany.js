import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

// Components
import Card from '../../components/UI/Card';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

// Stores
import useWalletStore from '../../store/walletStore';

// Services & Utils
import { apiMethods } from '../../services/api';
import web3Service from '../../utils/web3';

const InvestCompany = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('fiat'); // 'fiat' or 'blockchain'
  const { isConnected, address } = useWalletStore();

  // Fetch company details
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setIsLoading(true);
        const response = await apiMethods.companies.getById(companyId);
        if (response.data.success) {
          setCompany(response.data.data.company);
        } else {
          setError('Failed to load company details');
        }
      } catch (err) {
        console.error('Error fetching company:', err);
        setError('Failed to load company details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  // Handle blockchain payment method selection
  useEffect(() => {
    if (paymentMethod === 'blockchain' && !isConnected) {
      toast.error('Please connect your wallet to use blockchain payment');
      setPaymentMethod('fiat');
    }
  }, [paymentMethod, isConnected]);

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  const handleInvestment = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Please enter a valid investment amount');
      return;
    }

    setIsSubmitting(true);

    try {
      if (paymentMethod === 'blockchain') {
        await processBlockchainInvestment();
      } else {
        await processFiatInvestment();
      }
    } catch (err) {
      console.error('Investment failed:', err);
      setError(err.message || 'Investment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const processBlockchainInvestment = async () => {
    try {
      // Initialize web3 if not already initialized
      if (!web3Service.contract) {
        await web3Service.init();
      }

      // Ensure company has a blockchain token ID
      if (!company.tokenId) {
        throw new Error('This company is not registered on the blockchain');
      }

      toast.info('Please confirm the transaction in your wallet...');

      // Execute blockchain transaction
      const tx = await web3Service.investInCompany(
        company.tokenId,
        amount
      );

      toast.success('Transaction submitted! Processing...');

      // Record investment on backend
      const investmentData = {
        companyId: company.id,
        amount: amount,
        txHash: tx.txHash
      };

      const response = await apiMethods.investments.createBlockchainInvestment(investmentData);

      if (response.data.success) {
        setSuccess('Investment successful! Transaction has been recorded on the blockchain.');
        toast.success('Investment successful!');
        
        // Redirect after a delay
        setTimeout(() => {
          navigate(`/dashboard/companies/${companyId}`);
        }, 3000);
      } else {
        throw new Error(response.data.message || 'Failed to record investment');
      }
    } catch (error) {
      console.error('Blockchain investment failed:', error);
      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
      } else {
        toast.error(`Investment failed: ${error.message}`);
      }
      throw error;
    }
  };

  const processFiatInvestment = async () => {
    try {
      const payload = {
        companyId: company.id,
        amount: Number(amount),
      };

      const response = await apiMethods.investments.create(payload);
      
      if (response.data.success) {
        setSuccess('Investment successful!');
        toast.success('Investment successful!');
        
        // Redirect after a delay
        setTimeout(() => {
          navigate(`/dashboard/companies/${companyId}`);
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Investment failed');
      }
    } catch (error) {
      console.error('Fiat investment failed:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
        <button
          onClick={() => navigate('/dashboard/companies')}
          className="mt-4 btn btn-secondary"
        >
          Back to Companies
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Invest in {company?.name}</h1>
      
      <Card>
        <div className="space-y-6">
          {/* Company Info */}
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-xl font-semibold mb-2">{company?.name}</h2>
            <p className="text-gray-600">{company?.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Industry:</span>
                <span className="ml-2 font-medium">{company?.industry}</span>
              </div>
              <div>
                <span className="text-gray-500">Valuation:</span>
                <span className="ml-2 font-medium">${new Intl.NumberFormat().format(company?.valuation)}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Investment:</span>
                <span className="ml-2 font-medium">${new Intl.NumberFormat().format(company?.totalInvestment || 0)}</span>
              </div>
              <div>
                <span className="text-gray-500">Investors:</span>
                <span className="ml-2 font-medium">{company?.investorCount || 0}</span>
              </div>
            </div>
            
            {/* Blockchain Status */}
            <div className="mt-4">
              <span className="text-gray-500">Blockchain Status:</span>
              {company?.isBlockchainVerified ? (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Verified on Blockchain
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Not on Blockchain
                </span>
              )}
            </div>
          </div>

          {/* Investment Form */}
          <form onSubmit={handleInvestment} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">{success}</div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Investment Amount (USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                min="1"
                step="0.01"
                className="input"
                placeholder="Enter amount"
                required
                disabled={isSubmitting || success}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="fiat"
                    checked={paymentMethod === 'fiat'}
                    onChange={handlePaymentMethodChange}
                    className="mr-2"
                    disabled={isSubmitting || success}
                  />
                  <div>
                    <div className="font-medium">Traditional</div>
                    <div className="text-xs text-gray-500">Bank transfer</div>
                  </div>
                </label>
                
                <label className={`flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 ${!company?.isBlockchainVerified ? 'opacity-50' : ''} ${!isConnected ? 'opacity-50' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="blockchain"
                    checked={paymentMethod === 'blockchain'}
                    onChange={handlePaymentMethodChange}
                    disabled={!company?.isBlockchainVerified || !isConnected || isSubmitting || success}
                    className="mr-2"
                  />
                  <div>
                    <div className="font-medium">Blockchain</div>
                    <div className="text-xs text-gray-500">Ethereum payment</div>
                  </div>
                </label>
              </div>
              
              {paymentMethod === 'blockchain' && !isConnected && (
                <div className="mt-2 text-sm text-red-600">
                  Please connect your wallet to use blockchain payment
                </div>
              )}
              
              {paymentMethod === 'blockchain' && !company?.isBlockchainVerified && (
                <div className="mt-2 text-sm text-red-600">
                  This company is not registered on the blockchain
                </div>
              )}
            </div>
            
            {paymentMethod === 'blockchain' && isConnected && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
                <p className="font-medium mb-1">Blockchain Transaction Info:</p>
                <ul className="space-y-1">
                  <li><span className="font-medium">Wallet:</span> {address?.slice(0, 6)}...{address?.slice(-4)}</li>
                  <li><span className="font-medium">Gas fees:</span> Will be calculated in MetaMask</li>
                  <li><span className="font-medium">Company Token ID:</span> {company?.tokenId}</li>
                </ul>
              </div>
            )}
            
            <div className="pt-4 flex space-x-4">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/companies/${companyId}`)}
                className="btn btn-secondary w-full"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary w-full flex items-center justify-center"
                disabled={
                  isSubmitting || 
                  success || 
                  (paymentMethod === 'blockchain' && !isConnected) ||
                  (paymentMethod === 'blockchain' && !company?.isBlockchainVerified)
                }
              >
                {isSubmitting ? <LoadingSpinner size="small" /> : 'Invest'}
              </button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default InvestCompany;