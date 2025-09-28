import { QueryClient } from 'react-query';
import toast from 'react-hot-toast';

// Create a client with custom configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time of 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Don't refetch on window focus by default
      refetchOnWindowFocus: false,
      // Error handling
      onError: (error) => {
        console.error('Query error:', error);
        
        // Don't show toast for 401/403 errors (handled by axios interceptor)
        if (error.response?.status !== 401 && error.response?.status !== 403) {
          toast.error(error.response?.data?.message || 'An error occurred');
        }
      },
    },
    mutations: {
      // Error handling for mutations
      onError: (error) => {
        console.error('Mutation error:', error);
        
        // Don't show toast for validation errors (handled by forms)
        if (error.response?.status !== 400 && error.response?.status !== 422) {
          toast.error(error.response?.data?.message || 'An error occurred');
        }
      },
    },
  },
});

export default queryClient;

// Query keys for consistent caching
export const queryKeys = {
  // Auth
  user: ['user'],
  
  // Dashboard
  dashboardOverview: ['dashboard', 'overview'],
  
  // Portfolio
  portfolio: ['portfolio'],
  portfolioPerformance: (period) => ['portfolio', 'performance', period],
  portfolioAnalytics: ['portfolio', 'analytics'],
  
  // Companies
  companies: (params) => ['companies', params],
  company: (id) => ['company', id],
  userCompanies: ['companies', 'user'],
  
  // Investments
  investments: ['investments'],
  userInvestments: (params) => ['investments', 'user', params],
  investment: (id) => ['investment', id],
  companyInvestments: (companyId) => ['investments', 'company', companyId],
  
  // Funding
  activeFunding: ['funding', 'active'],
  funding: (id) => ['funding', id],
  
  // Milestones
  companyMilestones: (companyId) => ['milestones', 'company', companyId],
  
  // Activity
  userActivity: ['user', 'activity'],
};