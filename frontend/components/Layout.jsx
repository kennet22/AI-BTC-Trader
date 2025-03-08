import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import {
  HomeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Trading', href: '/trading', icon: ArrowTrendingUpIcon },
  { name: 'Market Data', href: '/market-data', icon: ChartBarIcon },
  { name: 'Positions', href: '/positions', icon: CurrencyDollarIcon },
  { name: 'History', href: '/history', icon: ClockIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export default function Layout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? '' : 'hidden'}`} role="dialog" aria-modal="true">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true" onClick={() => setSidebarOpen(false)}></div>
        
        {/* Sidebar */}
        <div className="relative flex flex-col flex-1 w-full max-w-xs pt-5 pb-4 bg-primary-700">
          <div className="absolute top-0 right-0 pt-2 -mr-12">
            <button
              type="button"
              className="flex items-center justify-center w-10 h-10 ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="w-6 h-6 text-white" aria-hidden="true" />
            </button>
          </div>
          
          <div className="flex items-center flex-shrink-0 px-4">
            <span className="text-2xl font-bold text-white">BTC Trader</span>
          </div>
          
          <div className="flex-1 h-0 mt-5 overflow-y-auto">
            <nav className="px-2 space-y-1">
              {navigation.map((item) => (
                <Link href={item.href} key={item.name}>
                  <span
                    className={`
                      group flex items-center px-2 py-2 text-base font-medium rounded-md
                      ${router.pathname === item.href
                        ? 'bg-primary-800 text-white'
                        : 'text-white hover:bg-primary-600'
                      }
                    `}
                  >
                    <item.icon className="w-6 h-6 mr-4 text-primary-300" aria-hidden="true" />
                    {item.name}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-1 min-h-0 bg-primary-700">
          <div className="flex items-center flex-shrink-0 h-16 px-4 bg-primary-800">
            <span className="text-2xl font-bold text-white">BTC Trader</span>
          </div>
          
          <div className="flex flex-col flex-1 overflow-y-auto">
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <Link href={item.href} key={item.name}>
                  <span
                    className={`
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md
                      ${router.pathname === item.href
                        ? 'bg-primary-800 text-white'
                        : 'text-primary-100 hover:bg-primary-600'
                      }
                    `}
                  >
                    <item.icon className="w-6 h-6 mr-3 text-primary-300" aria-hidden="true" />
                    {item.name}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:pl-64">
        {/* Top header */}
        <div className="sticky top-0 z-10 flex flex-shrink-0 h-16 bg-white shadow md:hidden">
          <button
            type="button"
            className="px-4 text-gray-500 border-r border-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="w-6 h-6" aria-hidden="true" />
          </button>
          
          <div className="flex justify-between flex-1 px-4">
            <div className="flex flex-1">
              <span className="flex items-center text-xl font-semibold">BTC Trader</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
      
      {/* Toast notifications */}
      <Toaster position="top-right" />
    </div>
  );
} 