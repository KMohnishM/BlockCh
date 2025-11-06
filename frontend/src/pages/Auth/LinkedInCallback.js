import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

// Store
import useAuthStore from '../../store/authStore';

// Components
import LoadingSpinner from '../../components/UI/LoadingSpinner';

// Utils
import { apiMethods } from '../../services/api';

const LinkedInCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processLinkedInCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for OAuth errors
        if (error) {
          throw new Error(errorDescription || 'LinkedIn authentication failed');
        }

        // Validate state parameter
        const savedState = sessionStorage.getItem('linkedin_oauth_state');
        if (!state || state !== savedState) {
          throw new Error('Invalid OAuth state parameter');
        }

        // Clear saved state
        sessionStorage.removeItem('linkedin_oauth_state');

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for access token and user info
        const response = await apiMethods.auth.linkedinCallback({
          code,
          state,
          redirect_uri: window.location.origin + '/auth/linkedin/callback'
        });

        if (response.data.success) {
          const { user, token } = response.data.data;
          
          // Set authentication state
          setAuth({ user, token });
          
          toast.success(`Welcome ${user.firstName}!`);
          navigate('/dashboard', { replace: true });
        } else {
          throw new Error(response.data.message || 'Authentication failed');
        }
      } catch (error) {
        console.error('LinkedIn callback error:', error);
        setError(error.message);
        toast.error(error.message || 'LinkedIn authentication failed');
        
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      } finally {
        setIsProcessing(false);
      }
    };

    processLinkedInCallback();
  }, [searchParams, navigate, setAuth]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" className="mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authenticating with LinkedIn
          </h2>
          <p className="text-gray-600">Please wait while we process your login...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Redirecting to login page in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default LinkedInCallback;