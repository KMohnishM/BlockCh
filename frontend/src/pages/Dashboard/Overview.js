import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  PieChart, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Components
import Card from '../../components/UI/Card';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { PortfolioChart, IndustryAllocationChart } from '../../components/Charts';
import { PortfolioTrendChart, InvestmentFlowChart } from '../../components/Charts/RechartsComponents';

// Utils
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/helpers';
import api, { apiMethods } from '../../utils/api';
import socketService from '../../utils/socket';

// Store
import useAuthStore from '../../store/authStore';

const Overview = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState(null);

  const { user } = useAuthStore();

  useEffect(() => {
    fetchDashboardData();
    
    // Connect to socket for real-time updates
    if (user?.id) {
      socketService.connect(user.id);
      socketService.subscribeToPortfolioUpdates(user.id, handlePortfolioUpdate);
      socketService.subscribeToInvestmentUpdates(handleInvestmentUpdate);
    }

    return () => {
      // Cleanup socket listeners
      socketService.off('portfolio:updated');
      socketService.off('investment:created');
      socketService.off('investment:updated');
    };
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch dashboard data using the new API methods
      const [portfolioResponse, performanceResponse] = await Promise.all([
        apiMethods.portfolio.getSummary(),
        apiMethods.portfolio.getPerformance('1M')
      ]);

      const dashboardInfo = {
        ...portfolioResponse.data,
        performanceData: performanceResponse.data.performanceData || [],
      };

      setDashboardData(dashboardInfo);

      // Prepare chart data
      if (performanceResponse.data.performanceData) {
        const chartInfo = {
          portfolioTrend: performanceResponse.data.performanceData.map(item => ({
            date: new Date(item.date).toLocaleDateString(),
            portfolioValue: item.portfolioValue,
            totalInvested: item.totalInvested,
          })),
          industryAllocation: portfolioResponse.data.industryAllocation?.map(item => ({
            industry: item.name,
            value: item.value,
            percentage: item.percentage,
          })) || [],
        };
        setChartData(chartInfo);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePortfolioUpdate = (data) => {
    console.log('Portfolio update received:', data);
    // Update dashboard data with real-time info
    setDashboardData(prev => ({
      ...prev,
      portfolioValue: data.totalValue,
      totalReturns: data.totalReturns,
      totalInvestments: data.totalInvestments,
    }));
  };

  const handleInvestmentUpdate = (data) => {
    console.log('Investment update received:', data);
    // Refresh dashboard data when new investment is made
    fetchDashboardData();
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
          onClick={fetchDashboardData}
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    totalInvestments = 0,
    totalReturns = 0,
    portfolioValue = 0,
    activeInvestments = 0,
    recentInvestments = [],
    performanceData = [],
    topPerformingCompanies = []
  } = dashboardData || {};

  const totalGainLoss = totalReturns - totalInvestments;
  const gainLossPercentage = totalInvestments > 0 ? ((totalGainLoss / totalInvestments) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your investment summary.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invested</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalInvestments)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio Value</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(portfolioValue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Returns</p>
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
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              totalGainLoss >= 0 ? 'bg-success-100' : 'bg-danger-100'
            }`}>
              {totalGainLoss >= 0 ? (
                <TrendingUp className={`w-6 h-6 ${totalGainLoss >= 0 ? 'text-success-600' : 'text-danger-600'}`} />
              ) : (
                <TrendingDown className="w-6 h-6 text-danger-600" />
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Investments</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(activeInvestments)}
              </p>
            </div>
            <div className="w-12 h-12 bg-info-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-info-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts and Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Performance Chart */}
        {chartData?.portfolioTrend && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <PortfolioTrendChart data={chartData.portfolioTrend} height={300} />
          </Card>
        )}

        {/* Industry Allocation */}
        {chartData?.industryAllocation && chartData.industryAllocation.length > 0 ? (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Industry Allocation</h3>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            <IndustryAllocationChart data={chartData.industryAllocation} height={300} />
          </Card>
        ) : (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Industry Allocation</h3>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <PieChart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No allocation data</h3>
                <p className="mt-1 text-sm text-gray-500">Start investing to see your allocation.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Recent Investments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Investments</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentInvestments.length > 0 ? (
              recentInvestments.map((investment, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{investment.companyName}</p>
                      <p className="text-sm text-gray-500">{investment.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(investment.amount)}
                    </p>
                    <p className="text-sm text-gray-500">{investment.type}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No investments yet</h3>
                <p className="mt-1 text-sm text-gray-500">Start investing in companies to see them here.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Top Performing Companies */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            <TrendingUp className="w-5 h-5 text-success-600" />
          </div>
          <div className="space-y-4">
            {topPerformingCompanies.length > 0 ? (
              topPerformingCompanies.map((company, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full">
                      <span className="text-sm font-medium text-primary-600">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{company.name}</p>
                      <p className="text-sm text-gray-500">{company.industry}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-success-600">
                      +{formatPercentage(company.growth)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(company.currentValue)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No performance data</h3>
                <p className="mt-1 text-sm text-gray-500">Investment performance will appear here.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
            <Building2 className="w-8 h-8 text-primary-600 mb-2" />
            <h4 className="font-medium text-gray-900">Explore Companies</h4>
            <p className="text-sm text-gray-500">Discover new investment opportunities</p>
          </button>
          
          <button className="p-4 border border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
            <DollarSign className="w-8 h-8 text-primary-600 mb-2" />
            <h4 className="font-medium text-gray-900">Make Investment</h4>
            <p className="text-sm text-gray-500">Invest in your favorite companies</p>
          </button>
          
          <button className="p-4 border border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
            <PieChart className="w-8 h-8 text-primary-600 mb-2" />
            <h4 className="font-medium text-gray-900">View Portfolio</h4>
            <p className="text-sm text-gray-500">Analyze your investment portfolio</p>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Overview;