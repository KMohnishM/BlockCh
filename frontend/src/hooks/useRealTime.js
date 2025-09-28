import { useEffect, useCallback, useRef } from 'react';
import socketService from '../utils/socket';
import useAuthStore from '../store/authStore';

// Custom hook for managing real-time updates
export const useRealTimeUpdates = () => {
  const { user } = useAuthStore();
  const isConnected = useRef(false);

  const connect = useCallback(() => {
    if (user?.id && !isConnected.current) {
      socketService.connect(user.id);
      isConnected.current = true;
    }
  }, [user]);

  const disconnect = useCallback(() => {
    if (isConnected.current) {
      socketService.disconnect();
      isConnected.current = false;
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  return {
    isConnected: isConnected.current,
    connect,
    disconnect,
    getConnectionStatus: () => socketService.getConnectionStatus(),
  };
};

// Hook for portfolio real-time updates
export const usePortfolioUpdates = (callback) => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.id && callback) {
      socketService.subscribeToPortfolioUpdates(user.id, callback);
    }

    return () => {
      socketService.off('portfolio:updated', callback);
    };
  }, [user, callback]);
};

// Hook for investment real-time updates
export const useInvestmentUpdates = (callback) => {
  useEffect(() => {
    if (callback) {
      socketService.subscribeToInvestmentUpdates(callback);
    }

    return () => {
      socketService.off('investment:created', callback);
      socketService.off('investment:updated', callback);
    };
  }, [callback]);
};

// Hook for company real-time updates
export const useCompanyUpdates = (companyId, callback) => {
  useEffect(() => {
    if (companyId && callback) {
      socketService.subscribeToCompanyUpdates(companyId, callback);
    }

    return () => {
      socketService.off('company:milestone', callback);
      socketService.off('funding:started', callback);
      socketService.off('funding:completed', callback);
    };
  }, [companyId, callback]);
};

// Hook for price updates
export const usePriceUpdates = (callback) => {
  useEffect(() => {
    if (callback) {
      socketService.subscribeToPriceUpdates(callback);
    }

    return () => {
      socketService.off('price:update', callback);
    };
  }, [callback]);
};

// Hook for blockchain events
export const useBlockchainEvents = (callback) => {
  useEffect(() => {
    if (callback) {
      socketService.subscribeToBlockchainEvents(callback);
    }

    return () => {
      socketService.off('blockchain:event', callback);
    };
  }, [callback]);
};

// Hook for notifications
export const useNotifications = (callback) => {
  useEffect(() => {
    if (callback) {
      socketService.on('notification', callback);
    }

    return () => {
      socketService.off('notification', callback);
    };
  }, [callback]);
};