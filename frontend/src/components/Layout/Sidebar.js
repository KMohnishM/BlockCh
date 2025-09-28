import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Wallet, 
  TrendingUp, 
  Plus,
  Target
} from 'lucide-react';

// Store
import useAuthStore from '../../store/authStore';

const Sidebar = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  // Don't show sidebar on certain pages
  if (!isAuthenticated || location.pathname === '/' || location.pathname.startsWith('/auth')) {
    return null;
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard',
    },
    {
      name: 'Companies',
      href: '/companies',
      icon: Building2,
      current: location.pathname === '/companies',
    },
    {
      name: 'Portfolio',
      href: '/portfolio',
      icon: Wallet,
      current: location.pathname === '/portfolio',
    },
    {
      name: 'Investments',
      href: '/investments',
      icon: TrendingUp,
      current: location.pathname === '/investments',
    },
  ];

  const actions = [
    {
      name: 'Register Company',
      href: '/companies/register',
      icon: Plus,
    },
  ];

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors`}
              >
                <Icon
                  className={`${
                    item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 h-5 w-5`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Quick Actions
          </h3>
          <div className="mt-2 space-y-1">
            {actions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className="group flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  <Icon className="text-gray-400 group-hover:text-gray-500 mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;