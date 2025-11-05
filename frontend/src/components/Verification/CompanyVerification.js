import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, BadgeCheck, Mail, Building, DollarSign, TrendingUp, Users } from 'lucide-react';
import { apiMethods } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import Card from '../UI/Card';
import toast from 'react-hot-toast';

const CompanyVerification = ({ companyId, company }) => {
  const [verificationStatus, setVerificationStatus] = useState({
    cinVerified: false,
    emailVerified: false,
    loading: true,
    riskAnalysis: null
  });

  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');

  const fetchVerificationStatus = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const riskAnalysis = await apiMethods.companies.getRiskAnalysis(companyId);
      const riskData = riskAnalysis?.data?.data || null;
      
      setVerificationStatus(prev => ({
        ...prev,
        cinVerified: company?.cinVerified || riskData?.verificationStatus?.cinVerified || false,
        emailVerified: company?.emailVerified || riskData?.verificationStatus?.emailVerified || false,
        riskAnalysis: riskData,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching verification status:', error);
      // Don't show error toast for optional risk analysis
      setVerificationStatus(prev => ({ 
        ...prev, 
        loading: false,
        cinVerified: company?.cinVerified || false,
        emailVerified: company?.emailVerified || false,
        riskAnalysis: null
      }));
    }
  }, [companyId, company]);

  useEffect(() => {
    if (companyId && company) {
      fetchVerificationStatus();
    } else {
      // If no company data, set default state
      setVerificationStatus(prev => ({
        ...prev,
        loading: false,
        cinVerified: company?.cinVerified || false,
        emailVerified: company?.emailVerified || false,
        riskAnalysis: null
      }));
    }
  }, [companyId, company, fetchVerificationStatus]);

  // Early return if required props are missing
  if (!companyId) {
    return (
      <Card>
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-500">No company selected for verification</p>
        </div>
      </Card>
    );
  }

  const handleEmailVerification = async (e) => {
    e.preventDefault();
    try {
      await apiMethods.companies.verifyEmail(companyId, verificationToken);
      toast.success('Email verified successfully');
      setShowEmailVerification(false);
      fetchVerificationStatus();
    } catch (error) {
      toast.error('Email verification failed');
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'LOW':
        return 'text-green-600';
      case 'MODERATE':
        return 'text-yellow-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'VERY HIGH':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (verificationStatus.loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Company Verification</h3>
        
        <div className="space-y-4">
          {/* CIN Verification Status */}
          <div className="flex items-center space-x-3">
            {verificationStatus.cinVerified ? (
              <BadgeCheck className="w-6 h-6 text-green-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            )}
            <div>
              <p className="font-medium text-gray-900">CIN Verification</p>
              <p className="text-sm text-gray-500">
                {verificationStatus.cinVerified ? 'Verified' : 'Pending verification'}
              </p>
            </div>
          </div>

          {/* Email Verification Status */}
          <div className="flex items-center space-x-3">
            {verificationStatus.emailVerified ? (
              <Mail className="w-6 h-6 text-green-500" />
            ) : (
              <Mail className="w-6 h-6 text-yellow-500" />
            )}
            <div>
              <p className="font-medium text-gray-900">Email Verification</p>
              <p className="text-sm text-gray-500">
                {verificationStatus.emailVerified ? 'Verified' : 'Pending verification'}
              </p>
            </div>
          </div>

          {/* Email Verification Form */}
          {!verificationStatus.emailVerified && (
            <div className="mt-4">
              {showEmailVerification ? (
                <form onSubmit={handleEmailVerification} className="space-y-3">
                  <input
                    type="text"
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.target.value)}
                    placeholder="Enter verification token"
                    className="input"
                  />
                  <button type="submit" className="btn btn-primary">
                    Verify Email
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowEmailVerification(true)}
                  className="btn btn-outline btn-sm"
                >
                  Enter Verification Token
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Risk Analysis */}
      {verificationStatus.riskAnalysis ? (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Analysis</h3>
          
          <div className="space-y-4">
            {/* Risk Score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-gray-500" />
                <span className="font-medium">Risk Score</span>
              </div>
              <span className={`font-bold ${getRiskLevelColor(verificationStatus.riskAnalysis?.riskLevel)}`}>
                {verificationStatus.riskAnalysis?.riskScore || 0}/100
              </span>
            </div>

            {/* Risk Level */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Risk Level</span>
              <span className={`font-medium ${getRiskLevelColor(verificationStatus.riskAnalysis?.riskLevel)}`}>
                {verificationStatus.riskAnalysis?.riskLevel || 'Unknown'}
              </span>
            </div>

            {/* Risk Description */}
            {verificationStatus.riskAnalysis?.riskDescription && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{verificationStatus.riskAnalysis.riskDescription}</p>
              </div>
            )}

            {/* Company Metrics */}
            {verificationStatus.riskAnalysis?.metrics && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-gray-900">Company Metrics</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <span>Verification Status</span>
                    </div>
                    <span className="font-medium">
                      {verificationStatus.riskAnalysis.verificationStatus?.cinVerified 
                        ? 'CIN Verified' 
                        : 'Pending Verification'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
                      <span>Company Age</span>
                    </div>
                    <span className="font-medium">
                      {verificationStatus.riskAnalysis.metrics?.companyAge 
                        ? new Date(verificationStatus.riskAnalysis.metrics.companyAge).getFullYear()
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>Investors</span>
                    </div>
                    <span className="font-medium">
                      {verificationStatus.riskAnalysis.metrics?.investorCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>Total Investment</span>
                    </div>
                    <span className="font-medium">
                      ${(verificationStatus.riskAnalysis.metrics?.totalInvestment || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span>Revenue Status</span>
                    </div>
                    <span className="font-medium">
                      {(verificationStatus.riskAnalysis.metrics?.revenue || 0) > 0
                        ? 'Revenue Generating' 
                        : 'Pre-revenue'
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Analysis</h3>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-500">Risk analysis data not available</p>
            <p className="text-sm text-gray-400 mt-1">Complete company verification to generate risk analysis</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CompanyVerification;