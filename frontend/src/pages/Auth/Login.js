import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

// Store
import useAuthStore from '../../store/authStore';
import useWalletStore from '../../store/walletStore';

// Utils
import web3Service from '../../utils/web3';

// Components
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isWalletAuth, setIsWalletAuth] = useState(false);
  const [isLinkedInAuth, setIsLinkedInAuth] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  
  const { login, walletAuth, isLoading } = useAuthStore();
  const walletStore = useWalletStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  // Traditional email/password login
  const onSubmit = async (data) => {
    try {
      await login(data);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed');
    }
  };

  // LinkedIn OAuth authentication
  const handleLinkedInAuth = async () => {
    setIsLinkedInAuth(true);
    
    try {
      const linkedInConfig = {
        client_id: process.env.REACT_APP_LINKEDIN_CLIENT_ID || 'your_linkedin_client_id',
        redirect_uri: encodeURIComponent(window.location.origin + '/auth/linkedin/callback'),
        scope: encodeURIComponent('openid profile email'),
        response_type: 'code',
        state: Math.random().toString(36).substring(2, 15)
      };

      const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=${linkedInConfig.response_type}&` +
        `client_id=${linkedInConfig.client_id}&` +
        `redirect_uri=${linkedInConfig.redirect_uri}&` +
        `scope=${linkedInConfig.scope}&` +
        `state=${linkedInConfig.state}`;

      // Store state for validation
      sessionStorage.setItem('linkedin_oauth_state', linkedInConfig.state);
      
      // Redirect to LinkedIn OAuth
      window.location.href = linkedInAuthUrl;
    } catch (error) {
      console.error('LinkedIn auth error:', error);
      toast.error('LinkedIn authentication failed');
      setIsLinkedInAuth(false);
    }
  };

  // Web3 wallet authentication
  const handleWalletAuth = async () => {
    if (!web3Service.isMetaMaskInstalled()) {
      toast.error('Please install MetaMask to continue');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsWalletAuth(true);

    try {
      // Connect wallet
      const walletData = await web3Service.connectWallet();
      
      if (!walletData) {
        throw new Error('Failed to connect wallet');
      }

      // Log wallet address in browser console for debugging
      console.log('[Wallet] Connected wallet address:', walletData.address);

      // Update wallet store
      walletStore.setWallet(walletData);

      // Generate message to sign
      const message = `Welcome to Vyaapar.AI!\n\nPlease sign this message to authenticate.\n\nWallet: ${walletData.address}\nTimestamp: ${Date.now()}`;
      
      // Sign message
      const signature = await web3Service.signMessage(message);
      
      // Authenticate with backend
      await walletAuth({
        walletAddress: walletData.address,
        signature,
        message
      });

      // Log wallet address after successful auth
      console.log('[Wallet] Authenticated wallet address:', walletData.address);

      toast.success('Authentication successful!');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Wallet auth error:', error);
      if (error.code === 4001) {
        toast.error('Authentication cancelled');
      } else {
        toast.error('Wallet authentication failed');
      }
    } finally {
      setIsWalletAuth(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign up here
            </Link>
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          {/* Social Authentication */}
          <div className="space-y-3 mb-6">
            {/* LinkedIn Authentication */}
            <button
              onClick={handleLinkedInAuth}
              disabled={isLinkedInAuth || isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-white bg-[#0A66C2] hover:bg-[#004182] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A66C2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLinkedInAuth ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              )}
              {isLinkedInAuth ? 'Connecting...' : 'Continue with LinkedIn'}
            </button>
            
            {/* Web3 Authentication */}
            <button
              onClick={handleWalletAuth}
              disabled={isWalletAuth || isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isWalletAuth ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : (
                <Wallet className="w-5 h-5 mr-2" />
              )}
              {isWalletAuth ? 'Connecting...' : 'Connect with Wallet'}
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Traditional Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email'
                    }
                  })}
                  type="email"
                  autoComplete="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="Enter your email"
                />
                <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-danger-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link 
                  to="/forgot-password" 
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="small" className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Sign in
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;