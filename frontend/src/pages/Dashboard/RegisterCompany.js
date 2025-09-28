
import React, { useState } from 'react';
import Card from '../../components/UI/Card';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { apiMethods } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/helpers';

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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Company name is required';
    if (!form.description.trim()) return 'Description is required';
    if (!form.industry) return 'Industry is required';
    if (!form.valuation || isNaN(form.valuation) || Number(form.valuation) <= 0) return 'Valid valuation is required';
    if (!form.fundingGoal || isNaN(form.fundingGoal) || Number(form.fundingGoal) <= 0) return 'Valid funding goal is required';
    if (!form.foundedDate) return 'Founded date is required';
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
        ...form,
        valuation: Number(form.valuation),
        fundingGoal: Number(form.fundingGoal),
      };
      const response = await apiMethods.companies.create(payload);
      if (response.data.success) {
        setSuccess('Company registered successfully!');
        setTimeout(() => {
          navigate(`/companies/${response.data.data.company.id}`);
        }, 1200);
      } else {
        setError(response.data.message || 'Failed to register company');
      }
    } catch (err) {
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
              placeholder="Describe your company"
              rows={3}
              required
            />
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
              placeholder="e.g. San Francisco, CA"
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
                required
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
              required
            />
          </div>
          <div className="pt-4">
            <button
              type="submit"
              className="btn btn-primary w-full flex items-center justify-center"
              disabled={isLoading}
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