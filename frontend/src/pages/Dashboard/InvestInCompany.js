import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  Shield, 
  ArrowLeft,
  Users,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Wallet
} from 'lucide-react';

// Components
import Card from '../../components/UI/Card';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

// Utils
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/helpers';
import { apiMethods } from '../../services/api';

// Store
import useAuthStore from '../../store/authStore';
import useWalletStore from '../../store/walletStore';

const InvestInCompany = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { address: walletAddress, isConnected } = useWalletStore();

  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvesting, setIsInvesting] = useState(false);
  const [error, setError] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('traditional');
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { 
        state: { 
          returnUrl: `/companies/${id}/invest`,
          message: 'Please login to invest in companies'
        }
      });
      return;
    }

    fetchCompany();
  }, [id, isAuthenticated, navigate]);

  const fetchCompany = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiMethods.companies.getById(id);
      
      if (response.data.success) {
        setCompany(response.data.data.company);
      } else {
        setError('Failed to load company details');
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      setError('Company not found or failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOwnership = () => {
    if (!investmentAmount || !company?.valuation) return 0;
    return (parseFloat(investmentAmount) / company.valuation) * 100;
  };

  const handleInvestmentSubmit = async (e) => {
    e.preventDefault();
    
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      setError('Please enter a valid investment amount');
      return;
    }

    if (parseFloat(investmentAmount) < 100) {
      setError('Minimum investment amount is $100');
      return;
    }

    setShowConfirmation(true);
  };

  const confirmInvestment = async () => {
    try {
      setIsInvesting(true);
      setError(null);

      const investmentData = {
        companyId: id,
        amount: parseFloat(investmentAmount),
        paymentMethod,
        walletAddress: paymentMethod === 'blockchain' ? walletAddress : null
      };

      console.log('Creating investment:', investmentData);

      const response = await apiMethods.investments.create(investmentData);

      if (response.data.success) {
        // Success! Navigate to portfolio or show success message
        navigate('/portfolio', {
          state: {
            message: `Successfully invested $${formatCurrency(investmentAmount)} in ${company.name}!`,
            type: 'success'
          }
        });
      } else {
        setError(response.data.message || 'Investment failed');
        setShowConfirmation(false);
      }
    } catch (error) {
      console.error('Investment error:', error);
      setError(error.response?.data?.message || 'Investment failed. Please try again.');
      setShowConfirmation(false);
    } finally {
      setIsInvesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Company</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Link to="/companies" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            to={`/companies/${id}`} 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Company Details
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Invest in {company?.name}
          </h1>
          <p className="text-gray-600 mt-2">Join other investors in funding this company</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Overview */}
        <div className="lg:col-span-1">
          <Card>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{company?.name}</h3>
                  <p className="text-sm text-gray-500">{company?.industry}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valuation</span>
                  <span className="font-medium">{formatCurrency(company?.valuation || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Raised</span>
                  <span className="font-medium">{formatCurrency(company?.totalInvestment || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Investors</span>
                  <span className="font-medium">{formatNumber(company?.investorCount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Milestones</span>
                  <span className="font-medium">
                    {company?.completedMilestones || 0}/{company?.totalMilestones || 0}
                  </span>
                </div>
              </div>

              {/* Investment Progress */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Funding Progress</span>
                  <span className="font-medium">
                    {Math.round(((company?.totalInvestment || 0) / (company?.valuation || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ 
                      width: `${Math.min(((company?.totalInvestment || 0) / (company?.valuation || 1)) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Investment Form */}
        <div className="lg:col-span-2">
          <Card>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Investment Details</h3>
                <p className="text-gray-600">Enter your investment amount and payment method</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                    <span className="text-red-800">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleInvestmentSubmit} className="space-y-6">
                {/* Investment Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Investment Amount (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      className="input pl-10"
                      placeholder="Enter amount (minimum $100)"
                      min="100"
                      step="1"
                      required
                    />
                  </div>
                  {investmentAmount && (
                    <p className="text-sm text-gray-500 mt-1">
                      This will give you approximately {formatPercentage(calculateOwnership())} ownership
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Method
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        id="traditional"
                        name="paymentMethod"
                        type="radio"
                        value="traditional"
                        checked={paymentMethod === 'traditional'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 text-primary-600"
                      />
                      <label htmlFor="traditional" className="ml-3 flex items-center">
                        <CreditCard className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Traditional Payment</div>
                          <div className="text-xs text-gray-500">Credit card, bank transfer</div>
                        </div>
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="blockchain"
                        name="paymentMethod"
                        type="radio"
                        value="blockchain"
                        checked={paymentMethod === 'blockchain'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 text-primary-600"
                        disabled={!isConnected}
                      />
                      <label htmlFor="blockchain" className="ml-3 flex items-center">
                        <Wallet className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Blockchain Payment
                            {!isConnected && <span className="text-red-500 ml-1">(Wallet not connected)</span>}
                          </div>
                          <div className="text-xs text-gray-500">Pay with cryptocurrency</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Investment Summary */}
                {investmentAmount && parseFloat(investmentAmount) > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Investment Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Investment Amount</span>
                        <span className="font-medium">${formatCurrency(investmentAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimated Ownership</span>
                        <span className="font-medium">{formatPercentage(calculateOwnership())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method</span>
                        <span className="font-medium capitalize">{paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4">
                  <Link
                    to={`/companies/${id}`}
                    className="flex-1 btn btn-outline"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={!investmentAmount || parseFloat(investmentAmount) < 100}
                    className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Review Investment
                  </button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Your Investment
              </h3>
              <p className="text-gray-600 mb-6">
                You are about to invest <strong>${formatCurrency(investmentAmount)}</strong> in{' '}
                <strong>{company?.name}</strong>. This action cannot be undone.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={isInvesting}
                  className="flex-1 btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmInvestment}
                  disabled={isInvesting}
                  className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isInvesting ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span className="ml-2">Processing...</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Confirm Investment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestInCompany;