#!/usr/bin/env node

/**
 * Setup Verification Script for Vyaapar.AI Frontend
 * Verifies all dependencies and configurations are working correctly
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Vyaapar.AI Frontend Setup Verification\n');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}\n=== ${msg} ===${colors.reset}`)
};

let errorCount = 0;
let warningCount = 0;

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log.success(`${description} exists`);
    return true;
  } else {
    log.error(`${description} missing: ${filePath}`);
    errorCount++;
    return false;
  }
}

function checkPackage(packageName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies[packageName]) {
      log.success(`${packageName} v${dependencies[packageName]} installed`);
      return true;
    } else {
      log.error(`${packageName} not found in package.json`);
      errorCount++;
      return false;
    }
  } catch (error) {
    log.error(`Error reading package.json: ${error.message}`);
    errorCount++;
    return false;
  }
}

// 1. Check Node.js version
log.header('Node.js Environment');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 16) {
    log.success(`Node.js ${nodeVersion} (compatible)`);
  } else {
    log.warning(`Node.js ${nodeVersion} (recommended v16+)`);
    warningCount++;
  }
} catch (error) {
  log.error(`Node.js not found: ${error.message}`);
  errorCount++;
}

// 2. Check package.json and dependencies
log.header('Dependencies Check');
checkFile('package.json', 'package.json');

const requiredPackages = [
  'react',
  'react-dom',
  'react-router-dom',
  'axios',
  'socket.io-client',
  'chart.js',
  'recharts',
  '@tanstack/react-query',
  'zustand',
  'tailwindcss',
  '@heroicons/react',
  'ethers'
];

requiredPackages.forEach(pkg => checkPackage(pkg));

// 3. Check configuration files
log.header('Configuration Files');
checkFile('.env.local', 'Environment configuration (.env.local)');
checkFile('tailwind.config.js', 'Tailwind CSS configuration');
checkFile('src/services/api.js', 'API service configuration');
checkFile('src/services/socket.js', 'WebSocket service configuration');

// 4. Check component structure
log.header('Component Structure');
checkFile('src/components/Charts/index.js', 'Chart.js components');
checkFile('src/components/Charts/RechartsComponents.js', 'Recharts components');
checkFile('src/pages/Dashboard/Overview.js', 'Dashboard Overview page');
checkFile('src/pages/Dashboard/Portfolio.js', 'Portfolio page');
checkFile('src/pages/Dashboard/Companies.js', 'Companies page');
checkFile('src/pages/Dashboard/Investments.js', 'Investments page');

// 5. Check hooks and utilities
log.header('Hooks and Utilities');
checkFile('src/hooks/useRealTime.js', 'Real-time WebSocket hooks');
checkFile('src/config/queryClient.js', 'React Query configuration');
checkFile('src/store/authStore.js', 'Authentication store');

// 6. Check environment variables
log.header('Environment Variables');
try {
  if (fs.existsSync('.env.local')) {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const requiredEnvVars = [
      'REACT_APP_API_URL',
      'REACT_APP_SOCKET_URL',
      'REACT_APP_NAME',
      'REACT_APP_CHAIN_ID'
    ];
    
    requiredEnvVars.forEach(envVar => {
      if (envContent.includes(envVar)) {
        log.success(`${envVar} configured`);
      } else {
        log.warning(`${envVar} not found in .env.local`);
        warningCount++;
      }
    });
  }
} catch (error) {
  log.error(`Error checking environment variables: ${error.message}`);
  errorCount++;
}

// 7. Check build capability
log.header('Build Verification');
try {
  log.info('Testing build process...');
  execSync('npm run build', { stdio: 'pipe' });
  log.success('Build process completed successfully');
  
  // Check if build folder was created
  if (fs.existsSync('build')) {
    log.success('Build output directory created');
  } else {
    log.error('Build output directory not found');
    errorCount++;
  }
} catch (error) {
  log.error('Build process failed');
  log.error(error.message);
  errorCount++;
}

// 8. Summary
log.header('Verification Summary');

if (errorCount === 0 && warningCount === 0) {
  log.success('🎉 All checks passed! Your Vyaapar.AI frontend is ready to run.');
  console.log('\nNext steps:');
  console.log('1. Start the backend server: cd ../backend && npm run dev');
  console.log('2. Start the frontend: npm start');
  console.log('3. Open http://localhost:3000 in your browser');
} else {
  if (errorCount > 0) {
    log.error(`${errorCount} error(s) found that need to be fixed`);
  }
  if (warningCount > 0) {
    log.warning(`${warningCount} warning(s) found - consider addressing these`);
  }
  
  console.log('\nRecommended actions:');
  if (errorCount > 0) {
    console.log('1. Fix the errors listed above');
    console.log('2. Run this script again to verify');
  }
  if (warningCount > 0) {
    console.log('3. Review warnings for potential improvements');
  }
}

console.log('\n📚 For detailed setup instructions, see README.md');
console.log('🆘 For support, visit: https://github.com/your-repo/issues');

process.exit(errorCount > 0 ? 1 : 0);