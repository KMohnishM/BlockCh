import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Initialize socket connection
  connect(userId = null) {
    if (this.socket?.connected) return;

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    
    // Get auth token
    const authData = localStorage.getItem('vyaapar-auth');
    let token = null;
    
    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        token = state.token;
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }

    this.socket = io(socketUrl, {
      auth: {
        token,
        userId
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  // Setup basic event listeners
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      toast.success('Connected to real-time updates');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected the client, need to reconnect manually
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Failed to connect to real-time updates');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      toast.success('Reconnected to real-time updates');
    });

    // Portfolio updates
    this.socket.on('portfolio:updated', (data) => {
      this.emit('portfolio:updated', data);
    });

    // Investment updates
    this.socket.on('investment:created', (data) => {
      this.emit('investment:created', data);
      toast.success(`New investment: ${data.companyName}`);
    });

    this.socket.on('investment:updated', (data) => {
      this.emit('investment:updated', data);
    });

    // Company updates
    this.socket.on('company:registered', (data) => {
      this.emit('company:registered', data);
      toast.success(`New company registered: ${data.name}`);
    });

    this.socket.on('company:milestone', (data) => {
      this.emit('company:milestone', data);
      toast.success(`Milestone completed: ${data.companyName}`);
    });

    // Funding round updates
    this.socket.on('funding:started', (data) => {
      this.emit('funding:started', data);
      toast.success(`New funding round: ${data.companyName}`);
    });

    this.socket.on('funding:completed', (data) => {
      this.emit('funding:completed', data);
      toast.success(`Funding completed: ${data.companyName}`);
    });

    // Price updates
    this.socket.on('price:update', (data) => {
      this.emit('price:update', data);
    });

    // Blockchain events
    this.socket.on('blockchain:event', (data) => {
      this.emit('blockchain:event', data);
      console.log('Blockchain event:', data);
    });

    // Notifications
    this.socket.on('notification', (data) => {
      this.emit('notification', data);
      
      if (data.type === 'info') {
        toast.success(data.message);
      } else if (data.type === 'warning') {
        toast.error(data.message);
      } else {
        toast(data.message);
      }
    });
  }

  // Subscribe to events
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);

    // If socket exists, also listen on socket
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Unsubscribe from events
  off(event, callback = null) {
    if (callback) {
      const handlers = this.eventHandlers.get(event) || [];
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.eventHandlers.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  // Emit events to local handlers
  emit(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in socket event handler:', error);
      }
    });
  }

  // Send data to server
  send(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot send:', event, data);
    }
  }

  // Join specific rooms
  joinRoom(room) {
    this.send('join:room', { room });
  }

  // Leave specific rooms
  leaveRoom(room) {
    this.send('leave:room', { room });
  }

  // Join user-specific room
  joinUserRoom(userId) {
    this.joinRoom(`user:${userId}`);
  }

  // Join company-specific room
  joinCompanyRoom(companyId) {
    this.joinRoom(`company:${companyId}`);
  }

  // Join investment-specific room
  joinInvestmentRoom(investmentId) {
    this.joinRoom(`investment:${investmentId}`);
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket disconnected');
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
    };
  }

  // Utility methods for common real-time features
  subscribeToPortfolioUpdates(userId, callback) {
    this.joinUserRoom(userId);
    this.on('portfolio:updated', callback);
  }

  subscribeToCompanyUpdates(companyId, callback) {
    this.joinCompanyRoom(companyId);
    this.on('company:milestone', callback);
    this.on('funding:started', callback);
    this.on('funding:completed', callback);
  }

  subscribeToInvestmentUpdates(callback) {
    this.on('investment:created', callback);
    this.on('investment:updated', callback);
  }

  subscribeToPriceUpdates(callback) {
    this.on('price:update', callback);
  }

  subscribeToBlockchainEvents(callback) {
    this.on('blockchain:event', callback);
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;