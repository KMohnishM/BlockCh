import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (Zustand persist)
    const authData = localStorage.getItem('vyaapar-auth');
    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        if (state.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }

    // Add wallet address header if available
    const walletData = localStorage.getItem('vyaapar-wallet');
    if (walletData) {
      try {
        const { state } = JSON.parse(walletData);
        if (state.address) {
          config.headers['x-wallet-address'] = state.address;
        }
      } catch (error) {
        console.error('Error parsing wallet data:', error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;

    if (response) {
      const { status, data } = response;

      // Handle different error status codes
      switch (status) {
        case 401:
          // Unauthorized - clear auth data and redirect to login
          localStorage.removeItem('vyaapar-auth');
          localStorage.removeItem('vyaapar-wallet');
          if (window.location.pathname !== '/login') {
            toast.error('Session expired. Please login again.');
            window.location.href = '/login';
          }
          break;

        case 403:
          toast.error(data.message || 'Access denied');
          break;

        case 404:
          toast.error(data.message || 'Resource not found');
          break;

        case 422:
        case 400:
          // Validation errors
          if (data.errors && Array.isArray(data.errors)) {
            data.errors.forEach((err) => {
              toast.error(err.msg || err.message || err);
            });
          } else {
            toast.error(data.message || 'Validation failed');
          }
          break;

        case 409:
          toast.error(data.message || 'Conflict occurred');
          break;

        case 429:
          toast.error('Too many requests. Please wait a moment.');
          break;

        case 500:
          toast.error('Server error. Please try again later.');
          break;

        default:
          toast.error(data.message || 'An error occurred');
          break;
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. Please check your connection.');
    } else if (error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

// API methods
const apiMethods = {
  // Auth endpoints
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    walletAuth: (walletData) => api.post('/auth/wallet-auth', walletData),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  },

  // Company endpoints
  companies: {
    getAll: (params) => api.get('/companies', { params }),
    getById: (id) => api.get(`/companies/${id}`),
    register: (companyData) => api.post('/companies/register', companyData),
    create: (companyData) => api.post('/companies/register', companyData), // Alias for register
    update: (id, updates) => api.put(`/companies/${id}`, updates),
    getUserCompanies: () => api.get('/companies/user/my-companies'),
    verifyBlockchain: (id) => api.post(`/companies/${id}/verify-blockchain`),
    getBlockchainStatus: (id) => api.get(`/companies/${id}/blockchain-status`),
  },

  // Investment endpoints
  investments: {
    create: (investmentData) => api.post('/investments', investmentData),
    createBlockchainInvestment: (data) => api.post('/blockchain/invest', data),
    getUserInvestments: () => api.get('/investments/my-investments'),
    getById: (id) => api.get(`/investments/${id}`),
    getCompanyInvestments: (companyId) => api.get(`/investments/company/${companyId}`),
  },

  // Portfolio endpoints
  portfolio: {
    getSummary: () => api.get('/portfolio'),
    getPerformance: (period) => api.get('/portfolio/performance', { params: { period } }),
    getAnalytics: () => api.get('/portfolio/analytics'),
  },

  // Funding rounds endpoints
  funding: {
    create: (roundData) => api.post('/funding', roundData),
    getActive: () => api.get('/funding/active'),
    getById: (id) => api.get(`/funding/${id}`),
    update: (id, updates) => api.put(`/funding/${id}`, updates),
  },

  // Milestones endpoints
  milestones: {
    create: (milestoneData) => api.post('/milestones', milestoneData),
    getCompanyMilestones: (companyId) => api.get(`/milestones/company/${companyId}`),
    verify: (id, verificationData) => api.patch(`/milestones/${id}/verify`, verificationData),
  },

  // User endpoints
  users: {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (updates) => api.put('/users/profile', updates),
    getActivity: () => api.get('/users/activity'),
  },

  // Blockchain endpoints
  blockchain: {
    verifyTransaction: (txHash) => api.post('/blockchain/verify-transaction', { txHash }),
    investInCompany: (data) => api.post('/blockchain/invest', data),
    status: () => api.get('/blockchain/status')
  },
};

export default api;
export { apiMethods };