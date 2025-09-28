import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
);

// Default chart options
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
};

// Line Chart Component
export const LineChart = ({ 
  data, 
  options = {}, 
  height = 300,
  title,
  className = "" 
}) => {
  const chartOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
      ...(title && {
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      }),
    },
  };

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <Line data={data} options={chartOptions} />
    </div>
  );
};

// Bar Chart Component
export const BarChart = ({ 
  data, 
  options = {}, 
  height = 300,
  title,
  className = "" 
}) => {
  const chartOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
      ...(title && {
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      }),
    },
  };

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <Bar data={data} options={chartOptions} />
    </div>
  );
};

// Doughnut Chart Component
export const DoughnutChart = ({ 
  data, 
  options = {}, 
  height = 300,
  title,
  className = "" 
}) => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      ...options.plugins,
      ...(title && {
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
      }),
    },
    ...options,
  };

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <Doughnut data={data} options={chartOptions} />
    </div>
  );
};

// Portfolio Performance Chart
export const PortfolioChart = ({ performanceData, height = 400 }) => {
  const data = {
    labels: performanceData?.map(item => item.date) || [],
    datasets: [
      {
        label: 'Portfolio Value',
        data: performanceData?.map(item => item.value) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Total Invested',
        data: performanceData?.map(item => item.invested) || [],
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const options = {
    ...defaultOptions,
    plugins: {
      ...defaultOptions.plugins,
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      ...defaultOptions.scales,
      y: {
        ...defaultOptions.scales.y,
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <LineChart 
      data={data} 
      options={options} 
      height={height}
      title="Portfolio Performance"
    />
  );
};

// Industry Allocation Chart
export const IndustryAllocationChart = ({ allocationData, height = 400 }) => {
  const colors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ];

  const data = {
    labels: allocationData?.map(item => item.industry) || [],
    datasets: [
      {
        data: allocationData?.map(item => item.percentage) || [],
        backgroundColor: colors.slice(0, allocationData?.length || 0),
        borderColor: colors.slice(0, allocationData?.length || 0),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value.toFixed(1)}%`;
          },
        },
      },
    },
  };

  return (
    <DoughnutChart 
      data={data} 
      options={options} 
      height={height}
      title="Industry Allocation"
    />
  );
};

// Investment Returns Chart
export const InvestmentReturnsChart = ({ returnsData, height = 300 }) => {
  const data = {
    labels: returnsData?.map(item => item.company) || [],
    datasets: [
      {
        label: 'Returns (%)',
        data: returnsData?.map(item => item.returnPercentage) || [],
        backgroundColor: returnsData?.map(item => 
          item.returnPercentage >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ) || [],
        borderColor: returnsData?.map(item => 
          item.returnPercentage >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'
        ) || [],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    ...defaultOptions,
    plugins: {
      ...defaultOptions.plugins,
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `Return: ${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      ...defaultOptions.scales,
      y: {
        ...defaultOptions.scales.y,
        ticks: {
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  return (
    <BarChart 
      data={data} 
      options={options} 
      height={height}
      title="Investment Returns"
    />
  );
};