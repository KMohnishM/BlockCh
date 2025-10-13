
import React, { useState, useEffect } from 'react';
import Card from '../../components/UI/Card';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { apiMethods } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import web3Service from '../../utils/web3';
import useWalletStore from '../../store/walletStore';

const industryOptions = [
  { value: '', label: 'Select Industry' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'fintech', label: 'FinTech' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'education', label: 'Education' },
  { value: 'renewable-energy', label: 'Renewable Energy' },
];

const RegisterCompany = () => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    industry: '',
    location: '',
    valuation: '',
    fundingGoal: '',
    foundedDate: '',
    useBlockchain: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();
  const { isConnected, address } = useWalletStore();

  // Check wallet connection on component mount
  useEffect(() => {
    if (form.useBlockchain && !isConnected) {
      setError('Wallet not connected. Please connect your wallet to register with blockchain verification or disable blockchain verification.');
    } else {
      setError(null);
    }
  }, [form.useBlockchain, isConnected]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: val }));
    
    // Clear errors when blockchain option changes
    if (name === 'useBlockchain') {
      setError(null);
    }
  };

  const validate = () => {
    if (!form.name.trim()) return 'Company name is required';
    if (!form.description.trim() || form.description.length < 10) return 'Description must be at least 10 characters';
    if (!form.industry) return 'Industry is required';
    if (!form.valuation || isNaN(form.valuation) || Number(form.valuation) <= 0) return 'Valid valuation is required';
    
    // Check wallet connection if blockchain verification is enabled
    if (form.useBlockchain && !isConnected) {
      return 'Please connect your wallet to register with blockchain verification or disable blockchain verification';
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const payload = {
        name: form.name,
        description: form.description,
        industry: form.industry,
        valuation: Number(form.valuation),
        useBlockchain: form.useBlockchain
      };
      
      console.log('Registering company with payload:', payload);
      const response = await apiMethods.companies.register(payload);
      
      if (response.data.success) {
        console.log('Company registration successful:', response.data);
        setSuccess('Company registered successfully!');
        
        setTimeout(() => {
          navigate(`/dashboard/companies/${response.data.data.company.id}`);
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to register company');
      }
    } catch (err) {
      console.error('Error registering company:', err);
      setError(err.response?.data?.message || 'Failed to register company');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Register Company</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">{success}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="input"
              placeholder="Enter company name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="input"
              placeholder="Describe your company (min 10 characters)"
              rows={3}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {form.description.length}/10 characters minimum
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
            <select
              name="industry"
              value={form.industry}
              onChange={handleChange}
              className="input"
              required
            >
              {industryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              className="input"
              placeholder="e.g. Mumbai, India"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valuation (USD)</label>
              <input
                type="number"
                name="valuation"
                value={form.valuation}
                onChange={handleChange}
                className="input"
                placeholder="e.g. 5000000"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Funding Goal (USD)</label>
              <input
                type="number"
                name="fundingGoal"
                value={form.fundingGoal}
                onChange={handleChange}
                className="input"
                placeholder="e.g. 1000000"
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Founded Date</label>
            <input
              type="date"
              name="foundedDate"
              value={form.foundedDate}
              onChange={handleChange}
              className="input"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              name="useBlockchain"
              id="useBlockchain"
              checked={form.useBlockchain}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="useBlockchain" className="ml-2 block text-sm text-gray-700">
              Use Blockchain Verification {!isConnected && form.useBlockchain && 
              <span className="text-red-600 font-semibold">(Connect wallet first)</span>}
            </label>
          </div>
          
          {form.useBlockchain && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
              <p className="font-medium mb-2">Blockchain Benefits:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Immutable proof of company registration</li>
                <li>Transparent investment tracking</li>
                <li>Verifiable ownership and milestones</li>
              </ul>
              <div className="mt-3 flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Wallet status: {isConnected ? `Connected (${address?.slice(0, 6)}...${address?.slice(-4)})` : 'Not connected'}</span>
              </div>
            </div>
          )}
          
          <div className="pt-4">
            <button
              type="submit"
              className="btn btn-primary w-full flex items-center justify-center"
              disabled={isLoading || (form.useBlockchain && !isConnected)}
            >
              {isLoading ? <LoadingSpinner size="small" /> : 'Register Company'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default RegisterCompany;