
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Card from '../../components/UI/Card';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { apiMethods } from '../../services/api';
import { formatCurrency, formatNumber, formatDate, formatPercentage } from '../../utils/helpers';
import { DollarSign, Users, Calendar, Building2, ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';

const CompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompany();
    // eslint-disable-next-line
  }, [id]);

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
    } catch (err) {
      setError('Company not found or failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Company</h3>
          <p className="text-gray-500 mb-4">{error || 'Company not found.'}</p>
          <Link to="/companies" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link to="/companies" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Companies
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
        <p className="text-gray-600 mt-2">{company.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Info */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{company.name}</h3>
                <p className="text-sm text-gray-500">{company.industry}</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              Founded {company.foundedDate ? formatDate(company.foundedDate) : 'N/A'}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Status: <span className="ml-1 font-medium text-gray-900">{company.status || 'active'}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <DollarSign className="w-4 h-4 mr-2" />
              Valuation: <span className="ml-1 font-medium text-gray-900">{formatCurrency(company.valuation)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <DollarSign className="w-4 h-4 mr-2" />
              Funding Goal: <span className="ml-1 font-medium text-gray-900">{formatCurrency(company.fundingGoal)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <DollarSign className="w-4 h-4 mr-2" />
              Raised: <span className="ml-1 font-medium text-gray-900">{formatCurrency(company.total_investment || 0)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-4 h-4 mr-2" />
              Investors: <span className="ml-1 font-medium text-gray-900">{formatNumber(company.investor_count || 0)}</span>
            </div>
          </div>
        </Card>

        {/* Funding Progress & Actions */}
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Funding Progress</span>
              <span className="font-medium text-gray-900">
                {company.fundingGoal && company.total_investment
                  ? Math.round((company.total_investment / company.fundingGoal) * 100)
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    company.fundingGoal && company.total_investment
                      ? (company.total_investment / company.fundingGoal) * 100
                      : 0,
                    100
                  )}%`
                }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Goal: {formatCurrency(company.fundingGoal)} | Raised: {formatCurrency(company.total_investment || 0)}
            </p>

            <div className="pt-4 flex space-x-4">
              <Link
                to={`/companies/${company.id}/invest`}
                className="flex-1 btn btn-primary"
              >
                Invest
              </Link>
              <Link
                to="/companies"
                className="flex-1 btn btn-outline"
              >
                Back
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Milestones, Funding Rounds, etc. can be added here */}
    </div>
  );
};

export default CompanyDetail;