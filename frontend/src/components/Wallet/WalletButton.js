import React, { useState } from 'react';
import { Wallet, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Store
import useWalletStore from '../../store/walletStore';
import useAuthStore from '../../store/authStore';

// Utils
import web3Service from '../../utils/web3';
import { formatAddress } from '../../utils/formatters';

const WalletButton = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  
  const walletStore = useWalletStore();
  const { user, walletAuth } = useAuthStore();

  const handleConnectWallet = async () => {
    if (!web3Service.isMetaMaskInstalled()) {
      toast.error('Please install MetaMask to connect your wallet');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);
    walletStore.setConnecting(true);

    try {
      // Connect wallet
      const walletData = await web3Service.connectWallet();
      
      if (!walletData) {
        throw new Error('Failed to connect wallet');
      }

      // Update wallet store
      walletStore.setWallet(walletData);

      // Always authenticate (or link) with backend so the wallet is stored on the profile
      try {
        // Generate a message to sign
        const message = `Welcome to Vyaapar.AI!\n\nPlease sign this message to verify your wallet ownership.\n\nWallet: ${walletData.address}\nTimestamp: ${Date.now()}`;

        // Sign the message
        const signature = await web3Service.signMessage(message);

        // Authenticate with backend; if already logged in, server will link this wallet to your account
        await walletAuth({
          walletAddress: walletData.address,
          signature,
          message
        });

        toast.success(user ? 'Wallet linked to your account!' : 'Wallet connected and authenticated!');
      } catch (authError) {
        console.error('Wallet auth failed:', authError);
        toast.error('Wallet connected but authentication failed');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      walletStore.setError(error.message);
      toast.error('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
      walletStore.setConnecting(false);
    }
  };

  const handleDisconnectWallet = () => {
    walletStore.disconnect();
    web3Service.disconnect();
    toast.success('Wallet disconnected');
  };

  if (walletStore.isConnected && walletStore.address) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-md border border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:block">
            {formatAddress(walletStore.address)}
          </span>
        </div>
        
        <button
          onClick={handleDisconnectWallet}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors"
          title="Disconnect Wallet"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {walletStore.error && (
        <div className="flex items-center text-red-600" title={walletStore.error}>
          <AlertCircle className="w-4 h-4" />
        </div>
      )}
      
      <button
        onClick={handleConnectWallet}
        disabled={isConnecting || walletStore.isConnecting}
        className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:opacity-50 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
      >
        <Wallet className="w-4 h-4" />
        <span>
          {isConnecting || walletStore.isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </span>
      </button>
    </div>
  );
};

export default WalletButton;