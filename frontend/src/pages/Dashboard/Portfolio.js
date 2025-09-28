import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Building2,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Calendar
} from 'lucide-react';

// Components
import Card from '../../components/UI/Card';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { IndustryPieChart, PortfolioTrendChart, InvestmentComparisonChart } from '../../components/Charts/RechartsComponents';

// Utils
import { formatCurrency, formatPercentage } from '../../utils/helpers';
import { apiMethods } from '../../utils/api';
import socketService from '../../utils/socket';

// Store
import useAuthStore from '../../store/authStore';

const Portfolio = () => {
  const [portfolioData, setPortfolioData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('1M');

  const { user } = useAuthStore();

  const timeRangeOptions = [
    { value: '1W', label: '1 Week' },
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '6M', label: '6 Months' },
    { value: '1Y', label: '1 Year' },
    { value: 'ALL', label: 'All Time' }
  ];

  useEffect(() => {
    fetchPortfolioData();
    
    // Subscribe to real-time portfolio updates
    if (user?.id) {
      socketService.subscribeToPortfolioUpdates(user.id, handlePortfolioUpdate);
      socketService.subscribeToPriceUpdates(handlePriceUpdate);
    }
    
    return () => {
      socketService.off('portfolio:updated');
      socketService.off('price:update');
    };
  }, [timeRange, user]);

  const fetchPortfolioData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [summaryResponse, performanceResponse, analyticsResponse] = await Promise.all([
        apiMethods.portfolio.getSummary(),
        apiMethods.portfolio.getPerformance(timeRange),
        apiMethods.portfolio.getAnalytics()
      ]);

      const portfolioInfo = {
        ...summaryResponse.data,
        performanceData: performanceResponse.data,
        analytics: analyticsResponse.data
      };
      
      setPortfolioData(portfolioInfo);
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
      setError('Failed to load portfolio data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePortfolioUpdate = (data) => {
    setPortfolioData(prev => ({
      ...prev,
      totalValue: data.totalValue,
      totalGainLoss: data.totalGainLoss,
      gainLossPercentage: data.gainLossPercentage,
    }));
  };

  const handlePriceUpdate = (data) => {
    // Update portfolio data when prices change
    fetchPortfolioData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger-600">{error}</p>
        <button 
          onClick={fetchPortfolioData}
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    totalValue = 0,
    totalInvested = 0,
    totalGainLoss = 0,
    gainLossPercentage = 0,
    industryAllocation = [],
    topHoldings = [],
    recentPerformance = [],
    riskScore = 0
  } = portfolioData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-gray-600 mt-2">Analyze your investment performance and allocation</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input w-40"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio Value</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <PieChart className="w-8 h-8 text-primary-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invested</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalInvested)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-info-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Return</p>
              <p className={`text-3xl font-bold ${totalGainLoss >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {formatCurrency(totalGainLoss)}
              </p>
              <p className={`text-sm flex items-center mt-1 ${totalGainLoss >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {totalGainLoss >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                )}
                {formatPercentage(gainLossPercentage)}
              </p>
            </div>
            {totalGainLoss >= 0 ? (
              <TrendingUp className="w-8 h-8 text-success-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-danger-600" />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Risk Score</p>
              <p className="text-3xl font-bold text-gray-900">
                {riskScore}/10
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {riskScore <= 3 ? 'Conservative' : riskScore <= 7 ? 'Moderate' : 'Aggressive'}
              </p>
            </div>
            <Target className={`w-8 h-8 ${
              riskScore <= 3 ? 'text-success-600' : 
              riskScore <= 7 ? 'text-warning-600' : 'text-danger-600'
            }`} />
          </div>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Allocation */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Industry Allocation</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          {industryAllocation && industryAllocation.length > 0 ? (
            <IndustryPieChart data={industryAllocation} height={350} />
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">No allocation data available</p>
            </div>
          )}
        </Card>

        {/* Top Holdings */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Holdings</h3>
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {topHoldings.length > 0 ? (
              topHoldings.map((holding, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full">
                      <span className="text-sm font-medium text-primary-600">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{holding.companyName}</p>
                      <p className="text-sm text-gray-500">{holding.industry}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(holding.value)}
                    </p>
                    <p className={`text-sm ${holding.change >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {holding.change >= 0 ? '+' : ''}{formatPercentage(holding.change)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">No holdings data available</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        {recentPerformance && recentPerformance.length > 0 ? (
          <PortfolioTrendChart data={recentPerformance} height={300} />
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="mx-auto h-16 w-16 text-gray-400" />
              <p className="mt-4 text-gray-500">Performance chart will be displayed here</p>
              <p className="text-sm text-gray-400">Start investing to see your portfolio performance</p>
            </div>
          </div>
        )}
      </Card>

      {/* Portfolio Insights */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Insights</h3>
          <Target className="w-5 h-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-info-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-8 h-8 text-info-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Diversification</h4>
            <p className="text-sm text-gray-600 mt-2">
              Your portfolio is well-diversified across multiple industries
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-8 h-8 text-success-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Performance</h4>
            <p className="text-sm text-gray-600 mt-2">
              Your investments are performing above market average
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="w-8 h-8 text-warning-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Risk Level</h4>
            <p className="text-sm text-gray-600 mt-2">
              Consider rebalancing to align with your risk tolerance
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Portfolio;