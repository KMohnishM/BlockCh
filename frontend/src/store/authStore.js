import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiMethods } from '../services/api';
import socketService from '../services/socket';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      walletAddress: null,
      authMethod: null,

      // Actions
      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await apiMethods.auth.login(credentials);
          const { user, token } = response.data.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            authMethod: 'email',
            isLoading: false
          });

          // Connect to WebSocket after successful login
          socketService.connect(user.id);
          
          return response.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await apiMethods.auth.register(userData);
          const { user, token } = response.data.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            authMethod: 'email',
            isLoading: false
          });

          // Connect to WebSocket after successful registration
          socketService.connect(user.id);
          
          return response.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      walletAuth: async (walletData) => {
        set({ isLoading: true });
        try {
          const response = await apiMethods.auth.walletAuth(walletData);
          const { user, token } = response.data.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            authMethod: 'web3',
            walletAddress: user.walletAddress,
            isLoading: false
          });

          // Connect to WebSocket after successful wallet auth
          socketService.connect(user.id);
          
          return response.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiMethods.auth.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Disconnect from WebSocket
          socketService.disconnect();
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            authMethod: null,
            walletAddress: null,
            isLoading: false
          });
        }
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }));
      },

      setWalletAddress: (address) => {
        set({ walletAddress: address });
      },

      // Check if user is authenticated on app load
      checkAuth: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await apiMethods.auth.me();
          const user = response.data.data.user;
          
          set({
            user,
            isAuthenticated: true,
            walletAddress: user.walletAddress,
            authMethod: user.authMethod
          });

          // Connect to WebSocket if authenticated
          socketService.connect(user.id);
        } catch (error) {
          // Token is invalid, clear auth state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            walletAddress: null,
            authMethod: null
          });
        }
      }
    }),
    {
      name: 'vyaapar-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        walletAddress: state.walletAddress,
        authMethod: state.authMethod
      })
    }
  )
);

export default useAuthStore;