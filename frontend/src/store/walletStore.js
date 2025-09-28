import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useWalletStore = create(
  persist(
    (set, get) => ({
      // State
      isConnected: false,
      address: null,
      provider: null,
      signer: null,
      chainId: null,
      balance: '0',
      isConnecting: false,
      error: null,

      // Actions
      setWallet: (walletData) => {
        set({
          isConnected: true,
          address: walletData.address,
          provider: walletData.provider,
          signer: walletData.signer,
          chainId: walletData.chainId,
          balance: walletData.balance || '0',
          error: null
        });
      },

      setBalance: (balance) => {
        set({ balance });
      },

      setChainId: (chainId) => {
        set({ chainId });
      },

      setConnecting: (isConnecting) => {
        set({ isConnecting });
      },

      setError: (error) => {
        set({ error, isConnecting: false });
      },

      clearError: () => {
        set({ error: null });
      },

      disconnect: () => {
        set({
          isConnected: false,
          address: null,
          provider: null,
          signer: null,
          chainId: null,
          balance: '0',
          isConnecting: false,
          error: null
        });
      },

      // Getters
      getFormattedBalance: () => {
        const { balance } = get();
        return parseFloat(balance).toFixed(4);
      },

      getShortAddress: () => {
        const { address } = get();
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
      }
    }),
    {
      name: 'vyaapar-wallet',
      partialize: (state) => ({
        isConnected: state.isConnected,
        address: state.address,
        chainId: state.chainId,
        balance: state.balance
      })
    }
  )
);

export default useWalletStore;