# Vyaapar.AI - Blockchain Investment Platform

A comprehensive full-stack blockchain investment platform that bridges traditional finance with Web3 technology, featuring both traditional email/password and Web3 wallet authentication with real-time updates and advanced analytics.

## 🚀 Features

### Core Features
- **Dual Authentication**: Traditional email/password + Web3 wallet authentication
- **Company Registration**: Blockchain-verified company profiles with NFT tokens
- **Investment Tracking**: Real-time portfolio management and analytics
- **Funding Rounds**: Milestone-based fundraising with smart contract automation
- **Real-time Updates**: WebSocket-powered live data synchronization
- **Interactive Charts**: Advanced portfolio analytics and performance visualization

### New Real-time Features ✨
- **Live Portfolio Updates**: WebSocket-powered real-time portfolio value changes
- **Investment Notifications**: Instant notifications for new opportunities
- **Company Milestones**: Real-time achievement tracking and notifications
- **Price Updates**: Live asset price monitoring and alerts
- **Interactive Dashboards**: Dynamic charts with hover effects and responsiveness

## Tech Stack

### Frontend
- **Core**: React.js with TypeScript, Tailwind CSS
- **State Management**: Zustand for global state, React Query for server state
- **Real-time**: Socket.io-client for WebSocket connections
- **Charts**: Chart.js and Recharts for data visualization
- **Blockchain**: Web3.js/Ethers.js, MetaMask integration
- **HTTP Client**: Axios with interceptors for API communication

### Backend
- **Server**: Node.js with Express.js
- **Database**: Supabase for data storage and real-time features
- **Authentication**: JWT tokens + Web3 message signing
- **Real-time**: Socket.io for WebSocket server
- **File Handling**: Multer for uploads
- **Security**: bcrypt, CORS, rate limiting

### Blockchain
- **Smart Contracts**: Solidity with OpenZeppelin libraries
- **Development**: Hardhat environment with testing
- **Network Support**: Ethereum, Polygon, local networks
- **Security**: Multi-signature patterns, reentrancy protection

## Project Structure

```
vyaapar-ai/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── Charts/      # Chart.js & Recharts components
│   │   │   ├── Dashboard/   # Dashboard-specific components
│   │   │   └── common/      # Shared components
│   │   ├── pages/          # Route pages (Dashboard, Login, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   │   └── useRealTime.js # WebSocket hooks
│   │   ├── store/          # Zustand stores
│   │   ├── services/       # API and WebSocket services
│   │   │   ├── api.js      # Enhanced API methods
│   │   │   └── socket.js   # WebSocket service
│   │   ├── utils/          # Utility functions
│   │   └── config/         # Configuration files
├── backend/                  # Node.js backend API
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Authentication & validation
│   ├── models/            # Database models
│   ├── routes/            # API endpoints
│   └── services/          # Business logic
├── smart-contracts/          # Solidity smart contracts
│   ├── contracts/         # Smart contract files
│   ├── scripts/           # Deployment scripts
│   └── test/              # Contract tests
└── README.md
```

## Getting Started

### Prerequisites
- Node.js v18+ 
- npm or yarn
- MetaMask browser extension (for Web3 features)
- Supabase account
- Git

### Quick Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd vyaapar-ai
```

2. **Install all dependencies**
```bash
# Frontend
cd frontend
npm install

# Backend  
cd ../backend
npm install

# Smart Contracts
cd ../smart-contracts
npm install
```

3. **Environment Configuration**

Create `.env` files in each directory:

**Backend `.env`:**
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development

# Blockchain
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=deployed_contract_address
RPC_URL=http://localhost:8545

# CORS
FRONTEND_URL=http://localhost:3000
```

**Frontend `.env.local`:**
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000

# App Configuration  
REACT_APP_NAME=Vyaapar.AI
REACT_APP_VERSION=1.0.0

# Blockchain Configuration
REACT_APP_CHAIN_ID=1337
REACT_APP_NETWORK_NAME=localhost
REACT_APP_CONTRACT_ADDRESS=your_deployed_contract_address
```

4. **Start Development Servers**
```bash
# Terminal 1: Smart Contracts
cd smart-contracts
npx hardhat node

# Terminal 2: Backend
cd backend  
npm run dev

# Terminal 3: Frontend
cd frontend
npm start
```

5. **Deploy Smart Contracts**
```bash
cd smart-contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

## 🎯 Usage Guide

### Authentication Options

#### Traditional Authentication
1. Navigate to `/register` or `/login`
2. Create account with email/password  
3. Access full platform features

#### Web3 Wallet Authentication
1. Install MetaMask browser extension
2. Click "Connect with Wallet" on login/register page
3. Sign message to authenticate
4. Access blockchain features

### Dashboard Features

#### Portfolio Overview
- **Real-time Portfolio Value**: Live updates via WebSocket
- **Performance Analytics**: Interactive charts showing returns
- **Industry Allocation**: Pie charts with investment distribution
- **Recent Activity Feed**: Live transaction and milestone updates

#### Company Discovery  
- **Browse Opportunities**: Filter by industry, stage, location
- **Company Profiles**: Detailed information and funding progress
- **Investment Interface**: Direct investment through the platform
- **Real-time Updates**: Live funding progress and milestones

#### Investment Management
- **Portfolio Tracking**: All investments in one dashboard
- **Performance Monitoring**: ROI calculations and trends
- **Data Export**: CSV/PDF reports for tax purposes
- **Real-time Notifications**: Investment updates and opportunities

### Real-time Features ⚡

The platform provides comprehensive real-time functionality:

- **Portfolio Updates**: Live portfolio value changes as market moves
- **Investment Notifications**: Instant alerts for new opportunities
- **Company Milestones**: Real-time achievement notifications
- **Price Updates**: Live asset price monitoring
- **Funding Progress**: Real-time funding round updates
- **Blockchain Events**: Smart contract event notifications

### Chart and Analytics 📊

#### Available Chart Types
- **Portfolio Performance**: Line charts showing value over time
- **Industry Allocation**: Doughnut charts for sector distribution  
- **Investment Comparison**: Bar charts comparing investments
- **Risk Analysis**: Scatter plots for risk vs return
- **Trend Analysis**: Multi-line charts for comparative performance

#### Interactive Features
- Responsive design for all screen sizes
- Hover tooltips with detailed information
- Real-time data updates via WebSocket
- Export functionality for all charts
- Time period filtering (1D, 1W, 1M, 1Y, ALL)

## 🔌 API Integration

### Enhanced API Methods

The platform uses a comprehensive API structure:

```javascript
// Authentication
apiMethods.auth.login(credentials)
apiMethods.auth.register(userData) 
apiMethods.auth.walletAuth(signature)
apiMethods.auth.logout()

// Companies
apiMethods.companies.getAll(filters)
apiMethods.companies.getById(id)
apiMethods.companies.register(companyData)
apiMethods.companies.update(id, data)

// Investments  
apiMethods.investments.create(investmentData)
apiMethods.investments.getUserInvestments()
apiMethods.investments.getCompanyInvestments(companyId)

// Portfolio
apiMethods.portfolio.getSummary()
apiMethods.portfolio.getPerformance()
apiMethods.portfolio.getAnalytics()
```

### WebSocket Events

#### Real-time Event Subscriptions
```javascript
// Portfolio Updates
socket.on('portfolio:updated', (data) => {
  // Handle portfolio changes
});

// Investment Notifications  
socket.on('investment:created', (investment) => {
  // Handle new investment
});

// Company Updates
socket.on('company:milestone', (milestone) => {
  // Handle milestone achievements
});

// Price Updates
socket.on('price:update', (priceData) => {
  // Handle price changes
});
```

#### Custom Hooks for Real-time Data
```javascript
import { 
  usePortfolioUpdates,
  useInvestmentUpdates,
  usePriceUpdates 
} from './hooks/useRealTime';

// Usage in components
const MyComponent = () => {
  usePortfolioUpdates((portfolioData) => {
    console.log('Portfolio updated:', portfolioData);
  });
  
  return <div>Portfolio Dashboard</div>;
};
```

## 🎨 UI Components

### Chart Components Usage
```javascript
import { 
  PortfolioChart, 
  IndustryAllocationChart,
  InvestmentReturnsChart 
} from './components/Charts';

// Portfolio Performance Chart
<PortfolioChart 
  data={portfolioData} 
  height={400}
  showLegend={true}
  responsive={true}
/>

// Industry Allocation Doughnut Chart  
<IndustryAllocationChart 
  data={allocationData}
  showPercentages={true}
  animated={true}
/>

// Investment Returns Bar Chart
<InvestmentReturnsChart
  data={returnsData}
  compareMode={true}
  timeframe="1Y"
/>
```

### Recharts Components
```javascript
import { 
  PortfolioTrendChart,
  InvestmentComparisonChart 
} from './components/Charts/RechartsComponents';

// Advanced Portfolio Trend Analysis
<PortfolioTrendChart
  data={trendData}
  metrics={['value', 'returns', 'risk']}
  interactive={true}
/>

// Investment Performance Comparison
<InvestmentComparisonChart
  investments={investmentData}
  metric="returns"
  groupBy="industry"
/>
```

## 🔐 Security & Performance

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Web3 Message Signing**: Cryptographic wallet verification  
- **Password Hashing**: bcrypt for secure password storage
- **CORS Protection**: Cross-origin request filtering
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries

### Performance Optimizations
- **React Query**: Intelligent data caching and synchronization
- **Lazy Loading**: Code splitting for faster initial loads
- **WebSocket Connection Pooling**: Efficient real-time connections
- **Database Indexing**: Optimized query performance
- **Image Optimization**: Compressed assets for faster loading
- **Bundle Splitting**: Optimized JavaScript delivery

## 🛠️ Development

### Available Scripts

#### Frontend
```bash
npm start          # Development server
npm run build      # Production build
npm test           # Run tests
npm run lint       # Code linting
npm run analyze    # Bundle analysis
```

#### Backend
```bash
npm start          # Production server
npm run dev        # Development with hot reload
npm test           # Test suite
npm run lint       # Code linting
npm run migrate    # Database migrations
```

#### Smart Contracts
```bash
npx hardhat compile       # Compile contracts
npx hardhat test         # Run contract tests
npx hardhat node         # Local blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### Development Workflow

1. **Feature Development**
   - Create feature branch from `main`
   - Implement feature with tests
   - Update documentation
   - Submit pull request

2. **Testing Strategy**
   - Unit tests for components and utilities
   - Integration tests for API endpoints
   - Contract tests for smart contracts
   - End-to-end tests for user flows

3. **Code Quality**
   - ESLint for JavaScript/TypeScript
   - Prettier for code formatting
   - Husky for git hooks
   - Conventional commits

## 🚀 Deployment

### Production Deployment

#### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder to hosting service
```

#### Backend (Railway/Heroku)
```bash
# Set production environment variables
# Deploy via Git or Docker
```

#### Smart Contracts (Mainnet)
```bash
npx hardhat run scripts/deploy.js --network mainnet
# Update frontend with contract address
```

### Environment Variables for Production

**Backend Production:**
```env
NODE_ENV=production
DATABASE_URL=production_database_url
JWT_SECRET=secure_production_secret
CORS_ORIGIN=https://your-domain.com
```

**Frontend Production:**
```env  
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_SOCKET_URL=https://api.your-domain.com
REACT_APP_CHAIN_ID=1
REACT_APP_NETWORK_NAME=mainnet
```

## 🐛 Troubleshooting

### Common Issues

#### MetaMask Connection
```javascript
// Check MetaMask availability
if (typeof window.ethereum === 'undefined') {
  console.error('MetaMask not installed');
}

// Handle connection errors
try {
  await window.ethereum.request({ method: 'eth_requestAccounts' });
} catch (error) {
  console.error('User denied account access');
}
```

#### WebSocket Connection Issues
```javascript
// Check connection status
socket.on('connect', () => {
  console.log('WebSocket connected');
});

socket.on('disconnect', () => {
  console.log('WebSocket disconnected');
});

// Handle reconnection
socket.on('reconnect', () => {
  console.log('WebSocket reconnected');
});
```

#### API Connection Errors
- Verify backend server is running on correct port
- Check CORS configuration for frontend domain
- Ensure environment variables are correctly set
- Check network connectivity and firewall settings

#### Real-time Updates Not Working  
- Verify WebSocket connection in browser dev tools
- Check Socket.io server configuration
- Ensure proper event listeners are attached
- Validate authentication tokens for protected events

### Performance Debugging
- Use React DevTools Profiler for component performance
- Monitor WebSocket message frequency and size
- Check database query performance with logging
- Analyze bundle size with webpack-bundle-analyzer

## 📱 Mobile & Responsive Design

The platform is fully responsive across all devices:

- **Desktop**: Full feature set with advanced charts
- **Tablet**: Touch-optimized interface with chart interactions  
- **Mobile**: Streamlined UI with essential features
- **PWA Support**: Add to home screen capability

### Mobile-Specific Features
- Touch-friendly chart interactions
- Responsive navigation with hamburger menu
- Optimized form inputs for mobile keyboards
- Swipe gestures for chart navigation

## 📊 Monitoring & Analytics

### Application Monitoring
- Error tracking with Sentry integration
- Performance monitoring for API endpoints
- WebSocket connection analytics
- User behavior tracking (privacy-compliant)

### Business Analytics  
- Investment flow tracking
- User engagement metrics
- Portfolio performance analytics
- Company registration trends

## API Documentation

### Core Endpoints

#### Authentication Endpoints
- `POST /api/auth/login` - Traditional email/password login
- `POST /api/auth/register` - User registration with email
- `POST /api/auth/wallet-auth` - Web3 wallet authentication  
- `POST /api/auth/logout` - User session logout
- `GET /api/auth/me` - Get current authenticated user

#### Company Management
- `GET /api/companies` - List companies with filtering
- `GET /api/companies/:id` - Get specific company details
- `POST /api/companies/register` - Register new company
- `PUT /api/companies/:id` - Update company information
- `GET /api/companies/:id/funding` - Get company funding rounds

#### Investment Operations
- `POST /api/investments` - Create new investment
- `GET /api/investments/my-investments` - Get user's investments
- `GET /api/investments/company/:id` - Get company investments
- `PUT /api/investments/:id` - Update investment details
- `DELETE /api/investments/:id` - Cancel investment (if allowed)

#### Portfolio Management  
- `GET /api/portfolio` - Portfolio summary with real-time data
- `GET /api/portfolio/performance` - Historical performance data
- `GET /api/portfolio/analytics` - Advanced portfolio analytics
- `GET /api/portfolio/allocation` - Industry/sector allocation
- `GET /api/portfolio/transactions` - Transaction history

#### Real-time Data Endpoints
- `GET /api/real-time/portfolio` - Live portfolio updates
- `GET /api/real-time/prices` - Current asset prices
- `GET /api/real-time/market` - Market data and trends
- `WebSocket /socket.io` - Real-time event subscriptions

## 🤝 Contributing

We welcome contributions to Vyaapar.AI! Here's how to get started:

### Development Process
1. **Fork the repository** from GitHub
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper testing
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request** with detailed description

### Contribution Guidelines
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation for API changes
- Ensure all tests pass before submitting
- Use conventional commit messages

### Development Setup for Contributors
```bash
# Fork and clone the repository
git clone https://github.com/your-username/vyaapar-ai.git
cd vyaapar-ai

# Install dependencies
npm run install:all

# Set up development environment
npm run setup:dev

# Run all services
npm run dev:all
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for complete details.

### Third-Party Licenses
- React: MIT License
- Chart.js: MIT License  
- Socket.io: MIT License
- OpenZeppelin: MIT License

## 📞 Support & Community

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Documentation**: [docs.vyaapar.ai](https://docs.vyaapar.ai)
- **Email Support**: support@vyaapar.ai
- **Discord Community**: [Join our Discord](https://discord.gg/vyaapar-ai)

### Community Resources
- **Developer Blog**: Latest updates and tutorials
- **Video Tutorials**: Step-by-step implementation guides
- **API Reference**: Complete endpoint documentation
- **Best Practices**: Security and performance guidelines

### Reporting Issues
When reporting bugs, please include:
- Operating system and browser version
- Node.js version
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots or error messages

---

## 🎯 Roadmap

### Upcoming Features
- **Mobile App**: React Native mobile application
- **Advanced Analytics**: ML-powered investment insights
- **DeFi Integration**: Yield farming and liquidity pools
- **Multi-chain Support**: Polygon, BSC, Avalanche
- **Social Features**: Investment communities and discussions

### Recent Updates
- ✅ **Real-time WebSocket Integration**: Live portfolio updates
- ✅ **Interactive Charts**: Chart.js and Recharts implementation  
- ✅ **Enhanced API**: Comprehensive endpoint structure
- ✅ **Performance Optimization**: React Query and caching
- ✅ **Mobile Responsiveness**: Full mobile optimization

---

**🚀 Built with ❤️ by the Vyaapar.AI Team**

*Bridging Traditional Finance with Web3 Technology*