// Format currency values
export const formatCurrency = (value, currency = 'USD', decimals = 2) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
};

// Format percentage values
export const formatPercentage = (value, decimals = 2) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0.00%';
  
  return `${numValue.toFixed(decimals)}%`;
};

// Format large numbers with suffixes
export const formatNumber = (value, decimals = 1) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let suffixIndex = 0;
  let scaledValue = numValue;
  
  while (scaledValue >= 1000 && suffixIndex < suffixes.length - 1) {
    scaledValue /= 1000;
    suffixIndex++;
  }
  
  return scaledValue.toFixed(decimals).replace(/\.0$/, '') + suffixes[suffixIndex];
};

// Format wallet addresses
export const formatAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

// Format date and time
export const formatDate = (date, format = 'MMM dd, yyyy') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  const options = {
    'MMM dd, yyyy': { month: 'short', day: '2-digit', year: 'numeric' },
    'dd/MM/yyyy': { day: '2-digit', month: '2-digit', year: 'numeric' },
    'yyyy-MM-dd': { year: 'numeric', month: '2-digit', day: '2-digit' },
    'relative': 'relative'
  };
  
  if (format === 'relative') {
    return formatRelativeTime(dateObj);
  }
  
  const formatOptions = options[format] || options['MMM dd, yyyy'];
  return dateObj.toLocaleDateString('en-US', formatOptions);
};

// Format relative time (e.g., "2 days ago")
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now - dateObj;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
};

// Format time duration
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Format blockchain transaction hash
export const formatTxHash = (hash, startChars = 6, endChars = 4) => {
  return formatAddress(hash, startChars, endChars);
};

// Format file size
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// Format investment return with color
export const formatReturn = (value, showSign = true) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return { text: '0.00%', color: 'text-gray-500' };
  
  const sign = showSign && numValue > 0 ? '+' : '';
  const color = numValue > 0 ? 'text-success-600' : numValue < 0 ? 'text-danger-600' : 'text-gray-500';
  
  return {
    text: `${sign}${numValue.toFixed(2)}%`,
    color
  };
};

// Format company valuation with proper scaling
export const formatValuation = (value) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '$0';
  
  if (numValue >= 1000000000) {
    return `$${(numValue / 1000000000).toFixed(1)}B`;
  } else if (numValue >= 1000000) {
    return `$${(numValue / 1000000).toFixed(1)}M`;
  } else if (numValue >= 1000) {
    return `$${(numValue / 1000).toFixed(1)}K`;
  } else {
    return `$${numValue.toFixed(0)}`;
  }
};

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength).trim() + suffix;
};

// Generate random color for charts
export const generateColor = (seed = '') => {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ];
  
  if (seed) {
    const hash = seed.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }
  
  return colors[Math.floor(Math.random() * colors.length)];
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate wallet address format
export const isValidWalletAddress = (address) => {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Generate pagination info
export const getPaginationInfo = (currentPage, totalPages, totalItems, itemsPerPage) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return {
    startItem,
    endItem,
    totalItems,
    currentPage,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1
  };
};

// Calculate days between dates
export const daysBetween = (date1, date2) => {
  const startDate = typeof date1 === 'string' ? new Date(date1) : date1;
  const endDate = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Get investment risk level based on amount and company age
export const getInvestmentRisk = (investmentAmount, companyAge, industry) => {
  let riskScore = 0;
  
  // Amount factor (higher amount = higher risk in early stage)
  if (investmentAmount > 100000) riskScore += 2;
  else if (investmentAmount > 10000) riskScore += 1;
  
  // Company age factor
  if (companyAge < 1) riskScore += 3;
  else if (companyAge < 2) riskScore += 2;
  else if (companyAge < 5) riskScore += 1;
  
  // Industry factor
  const highRiskIndustries = ['technology', 'biotech', 'crypto'];
  if (highRiskIndustries.includes(industry.toLowerCase())) riskScore += 1;
  
  if (riskScore >= 5) return { level: 'High', color: 'text-danger-600' };
  if (riskScore >= 3) return { level: 'Medium', color: 'text-warning-600' };
  return { level: 'Low', color: 'text-success-600' };
};