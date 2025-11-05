import React, { useState } from 'react';
import { Search, Building, AlertCircle, X } from 'lucide-react';
import { apiMethods } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

const CINLookup = ({ onCINSelect, isOpen, onClose }) => {
  const [searchType, setSearchType] = useState('name'); // 'name' or 'pan'
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('SW'); // 'SW' or 'NC'
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCompanies([]);

    try {
      let response;
      if (searchType === 'name') {
        response = await apiMethods.companies.searchByName(searchTerm, searchMode);
      } else {
        response = await apiMethods.companies.searchByPAN(searchTerm);
      }

      if (response.data.success) {
        setCompanies(response.data.data);
      } else {
        setError(response.data.message || 'No companies found');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search companies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCompany = (company) => {
    onCINSelect({
      cin: company.CompanyCIN,
      name: company.CompanyName,
      status: company.CompanyStatus,
      address: company.Address
    });
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Search for CIN</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Controls */}
        <div className="space-y-4 mb-6">
          {/* Search Type */}
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="name"
                checked={searchType === 'name'}
                onChange={(e) => setSearchType(e.target.value)}
                className="mr-2"
              />
              Search by Company Name
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="pan"
                checked={searchType === 'pan'}
                onChange={(e) => setSearchType(e.target.value)}
                className="mr-2"
              />
              Search by Company PAN
            </label>
          </div>

          {/* Search Input */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  searchType === 'name' 
                    ? 'Enter company name (e.g., "Tata Consultancy")' 
                    : 'Enter 10-digit PAN (e.g., "AAGCC4475J")'
                }
                className="input w-full"
                maxLength={searchType === 'pan' ? 10 : undefined}
              />
            </div>

            {/* Search Mode for Name Search */}
            {searchType === 'name' && (
              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value)}
                className="input w-40"
              >
                <option value="SW">Starts With</option>
                <option value="NC">Contains</option>
              </select>
            )}

            <button
              onClick={handleSearch}
              disabled={isLoading || !searchTerm.trim()}
              className="btn btn-primary flex items-center"
            >
              {isLoading ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Search Results */}
        <div className="overflow-y-auto max-h-96">
          {companies.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Search Results ({companies.length})
              </h3>
              {companies.map((company, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectCompany(company)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Building className="w-5 h-5 text-gray-600 mr-2" />
                        <h4 className="font-semibold text-gray-900">
                          {company.CompanyName}
                        </h4>
                        <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                          company.CompanyStatus === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {company.CompanyStatus}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>CIN:</strong> {company.CompanyCIN}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Address:</strong> {company.Address}
                      </p>
                      {company.href && (
                        <p className="text-sm text-blue-600">
                          <a href={company.href} target="_blank" rel="noopener noreferrer">
                            View on InstaFinancials →
                          </a>
                        </p>
                      )}
                    </div>
                    <button className="btn btn-secondary btn-sm">
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {companies.length === 0 && !isLoading && !error && searchTerm && (
            <div className="text-center py-8 text-gray-500">
              <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No companies found for "{searchTerm}"</p>
              <p className="text-sm mt-2">Try adjusting your search terms or search mode</p>
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Search Tips:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Company Name:</strong> Use "Starts With" for exact name beginnings or "Contains" for partial matches</li>
            <li>• <strong>Company PAN:</strong> Enter the exact 10-character PAN (e.g., AAGCC4475J)</li>
            <li>• Click on any result to automatically fill in the CIN and company details</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CINLookup;