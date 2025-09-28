import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Search,
  Filter,
  Plus,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Components
import Card from '../../components/UI/Card';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

// Utils
import { formatCurrency, formatCurrencyMillions, formatNumber, formatPercentage } from '../../utils/helpers';
import { apiMethods } from '../../services/api';
import socketService from '../../services/socket';

// Store
import useAuthStore from '../../store/authStore';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const { user } = useAuthStore();
  
  const industryOptions = [
    { value: '', label: 'All Industries' },
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'fintech', label: 'FinTech' },
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'education', label: 'Education' },
    { value: 'renewable-energy', label: 'Renewable Energy' },
  ];

  const stageOptions = [
    { value: '', label: 'All Stages' },
    { value: 'seed', label: 'Seed' },
    { value: 'series-a', label: 'Series A' },
    { value: 'series-b', label: 'Series B' },
    { value: 'growth', label: 'Growth' },
  ];

  const sortOptions = [
    { value: 'latest', label: 'Latest' },
    { value: 'funding', label: 'Funding Amount' },
    { value: 'valuation', label: 'Valuation' },
    { value: 'popular', label: 'Most Popular' }
  ];

  const fetchCompanies = useCallback(async (reset = false) => {
    try {
      console.log('🔄 Fetching companies...');
      console.log('Reset:', reset);
      console.log('Current page:', page);
      
      if (reset) {
        setIsLoading(true);
        setError(null);
        setPage(1);
      }

      const params = {
        page: reset ? 1 : page,
        limit: 12,
        search: searchTerm,
        industry: industryFilter,
        stage: stageFilter,
        sortBy,
      };

      console.log('📤 API Request params:', params);
      console.log('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

      const response = await apiMethods.companies.getAll(params);
      console.log('📥 API Response:', response);
      
      if (response.data && response.data.data) {
        const { companies: newCompanies, pagination } = response.data.data;
        console.log('📊 Companies received:', newCompanies ? newCompanies.length : 0);
        console.log('📄 Pagination:', pagination);
        
        if (newCompanies && newCompanies.length > 0) {
          console.log('📝 Sample company:', newCompanies[0]);
        }

        if (reset || page === 1) {
          setCompanies(newCompanies || []);
        } else {
          setCompanies(prev => [...prev, ...(newCompanies || [])]);
        }

        setHasMore(pagination?.hasNext || false);
      } else {
        console.warn('⚠️ Unexpected response structure:', response);
        setError('Received unexpected data format');
      }
    } catch (error) {
      console.error('❌ Failed to fetch companies:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(`Failed to load companies: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, industryFilter, stageFilter, sortBy, page]);

  useEffect(() => {
    fetchCompanies();
    
    // Subscribe to real-time company updates
    socketService.on('company:registered', handleNewCompany);
    socketService.on('funding:started', handleFundingUpdate);
    
    return () => {
      socketService.off('company:registered');
      socketService.off('funding:started');
    };
  }, [searchTerm, industryFilter, stageFilter, sortBy, page]);

  const handleNewCompany = (companyData) => {
    setCompanies(prev => [companyData, ...prev]);
  };

  const handleFundingUpdate = (fundingData) => {
    setCompanies(prev => 
      prev.map(company => 
        company.id === fundingData.companyId 
          ? { ...company, activeFunding: fundingData }
          : company
      )
    );
  };

  // Filter and sort companies based on search criteria
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = !industryFilter || company.industry === industryFilter;
    
    return matchesSearch && matchesIndustry;
  });

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'funding':
        return b.currentFunding - a.currentFunding;
      case 'investors':
        return b.investorCount - a.investorCount;
      case 'created':
        return new Date(b.createdAt) - new Date(a.createdAt);
      default:
        return 0;
    }
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger-600">{error}</p>
        <button 
          onClick={fetchCompanies}
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
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-2">Discover and invest in innovative companies</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link 
            to="/companies/register"
            className="btn btn-primary inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Company
          </Link>
        </div>
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
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Industry Filter */}
          <div className="sm:w-48">
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="input"
            >
              {industryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input"
            >
              <option value="name">Sort by Name</option>
              <option value="funding">Sort by Funding</option>
              <option value="investors">Sort by Investors</option>
              <option value="created">Sort by Date</option>
            </select>
          </div>

          {/* Filter Button */}
          <button
            onClick={fetchCompanies}
            className="btn btn-outline inline-flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Apply Filters
          </button>
        </div>
      </Card>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : sortedCompanies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCompanies.map((company) => {
            // Debug: Log funding values
            console.log('Company:', company.name, 'currentFunding:', company.currentFunding, 'fundingGoal:', company.fundingGoal);
            return (
              <Card key={company.id} className="hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Company Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-500">{company.industry}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      company.status === 'active' 
                        ? 'bg-success-100 text-success-800'
                        : company.status === 'funded'
                        ? 'bg-info-100 text-info-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {company.status}
                    </span>
                  </div>

                  {/* Company Info */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {company.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      Founded {new Date(company.foundedDate).getFullYear()}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {company.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <DollarSign className="w-4 h-4 text-success-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrencyMillions(company.currentFunding)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Raised</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Users className="w-4 h-4 text-info-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatNumber(company.investorCount)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Investors</p>
                    </div>
                  </div>

                  {/* Funding Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Funding Progress</span>
                      <span className="font-medium text-gray-900">
                        {Math.round((company.currentFunding / company.fundingGoal) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min((company.currentFunding / company.fundingGoal) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Goal: {formatCurrencyMillions(company.fundingGoal)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-4">
                    <Link
                      to={`/companies/${company.id}`}
                      className="flex-1 btn btn-outline btn-small inline-flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                    <Link
                      to={`/companies/${company.id}/invest`}
                      className="flex-1 btn btn-primary btn-small inline-flex items-center justify-center"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Invest
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No companies found</h3>
          <p className="mt-2 text-gray-500">
            {searchTerm || industryFilter 
              ? 'Try adjusting your filters to see more results.'
              : 'Be the first to register your company!'
            }
          </p>
          {!searchTerm && !industryFilter && (
            <Link
              to="/companies/register"
              className="mt-4 btn btn-primary inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Register Company
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default Companies;