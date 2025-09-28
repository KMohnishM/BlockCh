import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User, Phone, Building, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

// Store
import useAuthStore from '../../store/authStore';
import useWalletStore from '../../store/walletStore';

// Utils
import web3Service from '../../utils/web3';

// Components
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState('individual'); // 'individual' or 'company'
  const [isWalletAuth, setIsWalletAuth] = useState(false);
  
  const navigate = useNavigate();
  
  const { register: registerUser, walletAuth, isLoading } = useAuthStore();
  const walletStore = useWalletStore();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm();

  const password = watch('password');

  // Traditional registration
  const onSubmit = async (data) => {
    try {
      const registrationData = {
        ...data,
        userType: accountType
      };

      // Remove confirm password field
      delete registrationData.confirmPassword;

      await registerUser(registrationData);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  };

  // Web3 wallet registration
  const handleWalletRegister = async () => {
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

      // Update wallet store
      walletStore.setWallet(walletData);

      // Generate message to sign
      const message = `Welcome to Vyaapar.AI!\n\nPlease sign this message to create your account.\n\nWallet: ${walletData.address}\nTimestamp: ${Date.now()}`;
      
      // Sign message
      const signature = await web3Service.signMessage(message);
      
      // Register with backend
      await walletAuth({
        walletAddress: walletData.address,
        signature,
        message,
        userType: accountType
      });

      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Wallet registration error:', error);
      if (error.code === 4001) {
        toast.error('Registration cancelled');
      } else {
        toast.error('Wallet registration failed');
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
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in here
            </Link>
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          {/* Account Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Account Type
            </label>
            <div className="flex space-x-4">
              <label className="flex-1">
                <input
                  type="radio"
                  value="individual"
                  checked={accountType === 'individual'}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="sr-only"
                />
                <div className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                  accountType === 'individual' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <User className="w-5 h-5 mx-auto mb-2 text-gray-700" />
                  <div className="text-center text-sm font-medium">Individual</div>
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  value="company"
                  checked={accountType === 'company'}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="sr-only"
                />
                <div className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                  accountType === 'company' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <Building className="w-5 h-5 mx-auto mb-2 text-gray-700" />
                  <div className="text-center text-sm font-medium">Company</div>
                </div>
              </label>
            </div>
          </div>

          {/* Web3 Registration */}
          <div className="mb-6">
            <button
              onClick={handleWalletRegister}
              disabled={isWalletAuth || isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isWalletAuth ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : (
                <Wallet className="w-5 h-5 mr-2" />
              )}
              {isWalletAuth ? 'Creating Account...' : 'Create Account with Wallet'}
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

          {/* Traditional Registration Form */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  {accountType === 'company' ? 'Company Name' : 'Full Name'}
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('fullName', {
                      required: `${accountType === 'company' ? 'Company name' : 'Full name'} is required`,
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters'
                      }
                    })}
                    type="text"
                    autoComplete="name"
                    className={`input ${errors.fullName ? 'input-error' : ''}`}
                    placeholder={accountType === 'company' ? 'Enter company name' : 'Enter your full name'}
                  />
                  {accountType === 'company' ? (
                    <Building className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  ) : (
                    <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  )}
                </div>
                {errors.fullName && (
                  <p className="mt-1 text-sm text-danger-600">{errors.fullName.message}</p>
                )}
              </div>

              {/* Email */}
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

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^[\+]?[1-9][\d]{0,15}$/,
                        message: 'Please enter a valid phone number'
                      }
                    })}
                    type="tel"
                    autoComplete="tel"
                    className={`input ${errors.phone ? 'input-error' : ''}`}
                    placeholder="Enter your phone number"
                  />
                  <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-danger-600">{errors.phone.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters'
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                        message: 'Password must contain uppercase, lowercase, number, and special character'
                      }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="Create a strong password"
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

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: value => 
                        value === password || 'Passwords do not match'
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-danger-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Terms and Privacy */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  {...register('acceptTerms', {
                    required: 'You must accept the terms and conditions'
                  })}
                  id="acceptTerms"
                  type="checkbox"
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="acceptTerms" className="text-gray-700">
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary-600 hover:text-primary-500 font-medium">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary-600 hover:text-primary-500 font-medium">
                    Privacy Policy
                  </Link>
                </label>
                {errors.acceptTerms && (
                  <p className="mt-1 text-sm text-danger-600">{errors.acceptTerms.message}</p>
                )}
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
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Create Account
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

export default Register;