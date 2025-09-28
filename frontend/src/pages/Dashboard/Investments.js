import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Download
} from 'lucide-react';

// Components
import Card from '../../components/UI/Card';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

// Utils
import { formatCurrency, formatPercentage, formatDate } from '../../utils/helpers';
import { apiMethods } from '../../services/api';
import socketService from '../../services/socket';

// Store
import useAuthStore from '../../store/authStore';

const Investments = () => {
  const [investments, setInvestments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('');

  const { user } = useAuthStore();

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' }
  ];

  const dateRangeOptions = [
    { value: '', label: 'All Time' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ];

  const fetchInvestments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = {
        search: searchTerm,
        status: statusFilter,
        dateRange: dateRange
      };
      
      const response = await apiMethods.investments.getUserInvestments(params);
      setInvestments(response.data?.investments || []);
    } catch (error) {
      console.error('Failed to fetch investments:', error);
      setError('Failed to load investments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, dateRange]);

  const handleInvestmentUpdate = useCallback((data) => {
    setInvestments(prev => 
      prev.map(inv => 
        inv.id === data.id ? { ...inv, ...data } : inv
      )
    );
  }, []);

  const handlePortfolioUpdate = useCallback((data) => {
    // Refresh investments when portfolio updates
    fetchInvestments();
  }, [fetchInvestments]);

  useEffect(() => {
    fetchInvestments();
    
    // Subscribe to real-time investment updates
    if (user?.id) {
      socketService.subscribeToInvestmentUpdates(handleInvestmentUpdate);
      socketService.subscribeToPortfolioUpdates(user.id, handlePortfolioUpdate);
    }
    
    return () => {
      socketService.off('investment:updated');
      socketService.off('portfolio:updated');
    };
  }, [user, fetchInvestments, handleInvestmentUpdate, handlePortfolioUpdate]);

  useEffect(() => {
    fetchInvestments();
  }, [searchTerm, statusFilter, dateRange, fetchInvestments]);

  const calculateStats = () => {
    // Ensure investments is an array
    const investmentsArray = Array.isArray(investments) ? investments : [];
    
    const totalInvested = investmentsArray.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const currentValue = investmentsArray.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    const totalGainLoss = currentValue - totalInvested;
    const totalReturn = totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100) : 0;

    return {
      totalInvested,
      currentValue,
      totalGainLoss,
      totalReturn,
      activeInvestments: investmentsArray.filter(inv => inv.status === 'active').length
    };
  };

  const stats = calculateStats();

  const exportInvestments = async () => {
    try {
      const response = await apiMethods.investments.export({
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `investments_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export investments:', error);
      toast.error('Failed to export investments');
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger-600">{error}</p>
        <button 
          onClick={fetchInvestments}
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Investments</h1>
          <p className="text-gray-600 mt-2">Track and manage your investment portfolio</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={exportInvestments}
            className="btn btn-outline inline-flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invested</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalInvested)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-primary-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.currentValue)}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-info-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Return</p>
              <p className={`text-2xl font-bold ${stats.totalGainLoss >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {formatCurrency(stats.totalGainLoss)}
              </p>
              <p className={`text-sm flex items-center mt-1 ${stats.totalGainLoss >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {stats.totalGainLoss >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                )}
                {formatPercentage(stats.totalReturn)}
              </p>
            </div>
            {stats.totalGainLoss >= 0 ? (
              <TrendingUp className="w-8 h-8 text-success-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-danger-600" />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Investments</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeInvestments}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-warning-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search investments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="sm:w-48">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Apply Button */}
          <button
            onClick={fetchInvestments}
            className="btn btn-outline inline-flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Apply
          </button>
        </div>
      </Card>

      {/* Investments List */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : (Array.isArray(investments) && investments.length > 0) ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(investments) && investments.map((investment) => {
                  const gainLoss = investment.currentValue - investment.amount;
                  const returnPercentage = (gainLoss / investment.amount) * 100;

                  return (
                    <tr key={investment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                            <Building2 className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {investment.companyName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {investment.companyIndustry}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(investment.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {investment.investmentType}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(investment.currentValue)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium flex items-center ${
                          gainLoss >= 0 ? 'text-success-600' : 'text-danger-600'
                        }`}>
                          {gainLoss >= 0 ? (
                            <ArrowUpRight className="w-4 h-4 mr-1" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 mr-1" />
                          )}
                          {formatCurrency(gainLoss)}
                        </div>
                        <div className={`text-sm ${
                          gainLoss >= 0 ? 'text-success-600' : 'text-danger-600'
                        }`}>
                          {formatPercentage(returnPercentage)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          investment.status === 'active' 
                            ? 'bg-success-100 text-success-800'
                            : investment.status === 'completed'
                            ? 'bg-info-100 text-info-800'
                            : 'bg-warning-100 text-warning-800'
                        }`}>
                          {investment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(investment.investmentDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No investments found</h3>
            <p className="mt-2 text-gray-500">
              Start investing in companies to see your portfolio here.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Investments;