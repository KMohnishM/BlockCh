import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from 'react-query';

// Store
import useAuthStore from './store/authStore';
import useWalletStore from './store/walletStore';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Pages
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import LinkedInCallback from './pages/Auth/LinkedInCallback';
import Dashboard from './pages/Dashboard/Dashboard';
import Companies from './pages/Dashboard/Companies';
import CompanyDetail from './pages/Dashboard/CompanyDetail';
import RegisterCompany from './pages/Dashboard/RegisterCompany';
import InvestInCompany from './pages/Dashboard/InvestInCompany';
import Portfolio from './pages/Dashboard/Portfolio';
import Investments from './pages/Dashboard/Investments';
import Profile from './pages/Dashboard/Profile';

// Utils
import web3Service from './utils/web3';

// Hooks
import { useRealTimeUpdates } from './hooks/useRealTime';

function App() {
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();
  const walletStore = useWalletStore();

  // Initialize real-time updates
  useRealTimeUpdates();

  // Check authentication on app load
  useQuery('checkAuth', checkAuth, {
    enabled: !isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Setup Web3 event listeners
  useEffect(() => {
    web3Service.setupEventListeners();
    
    // Cleanup on unmount
    return () => {
      web3Service.disconnect();
    };
  }, []);

  // Auto-reconnect wallet if previously connected
  useEffect(() => {
    const reconnectWallet = async () => {
      if (walletStore.isConnected && walletStore.address && !walletStore.provider) {
        try {
          const walletData = await web3Service.connectWallet();
          if (walletData) {
            walletStore.setWallet(walletData);
          }
        } catch (error) {
          console.error('Failed to reconnect wallet:', error);
          walletStore.disconnect();
        }
      }
    };

    reconnectWallet();
  }, [walletStore]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
          } 
        />
        <Route 
          path="/auth/linkedin/callback" 
          element={<LinkedInCallback />} 
        />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route 
            path="/companies/:id/invest" 
            element={
              <ProtectedRoute>
                <InvestInCompany />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/companies/register" 
            element={
              <ProtectedRoute>
                <RegisterCompany />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/portfolio" 
            element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/investments" 
            element={
              <ProtectedRoute>
                <Investments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* 404 Route */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-8">Page not found</p>
                <a 
                  href="/" 
                  className="btn-primary"
                >
                  Go Home
                </a>
              </div>
            </div>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;