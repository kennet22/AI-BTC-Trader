import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import AnimatedStatsCard from '../components/AnimatedStatsCard';
import { 
  ArrowTrendingUpIcon, 
  CurrencyDollarIcon, 
  ScaleIcon, 
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function UIShowcase() {
  const [btcPrice, setBtcPrice] = useState(36789.42);
  const [portfolioValue, setPortfolioValue] = useState(12435.87);
  const [positionValue, setPositionValue] = useState(5678.92);
  const [winRate, setWinRate] = useState(67.5);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [updatedCards, setUpdatedCards] = useState({
    price: false,
    portfolio: false,
    position: false,
    winRate: false
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Random price fluctuation between -2% and +2%
      const priceChange = btcPrice * (Math.random() * 0.04 - 0.02);
      const newPrice = btcPrice + priceChange;
      setBtcPrice(newPrice);
      setUpdatedCards(prev => ({ ...prev, price: true }));
      
      // Simulate portfolio value changes
      setTimeout(() => {
        const portfolioChange = portfolioValue * (Math.random() * 0.03 - 0.01);
        setPortfolioValue(prev => prev + portfolioChange);
        setUpdatedCards(prev => ({ ...prev, portfolio: true }));
      }, 1500);
      
      // Simulate position value changes
      setTimeout(() => {
        const positionChange = positionValue * (Math.random() * 0.05 - 0.02);
        setPositionValue(prev => prev + positionChange);
        setUpdatedCards(prev => ({ ...prev, position: true }));
      }, 3000);
      
      // Occasionally update win rate
      if (Math.random() > 0.7) {
        setTimeout(() => {
          const winRateChange = (Math.random() * 2 - 1);
          setWinRate(prev => Math.min(100, Math.max(0, prev + winRateChange)));
          setUpdatedCards(prev => ({ ...prev, winRate: true }));
        }, 4500);
      }
      
      setLastUpdated(new Date());
      
      // Reset update flags after animations complete
      setTimeout(() => {
        setUpdatedCards({
          price: false,
          portfolio: false,
          position: false,
          winRate: false
        });
      }, 6000);
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [btcPrice, portfolioValue, positionValue, winRate]);
  
  // Format price with commas and 2 decimal places
  const formatPrice = (price) => {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Calculate percentage change for display
  const calculateChange = (current, previous) => {
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };
  
  // Simulate previous values (for change calculation)
  const prevBtcPrice = btcPrice - (btcPrice * (Math.random() * 0.01 - 0.005));
  const prevPortfolioValue = portfolioValue - (portfolioValue * (Math.random() * 0.008 - 0.003));
  const prevPositionValue = positionValue - (positionValue * (Math.random() * 0.012 - 0.006));
  const prevWinRate = winRate - (Math.random() * 1 - 0.5);

  return (
    <Layout>
      <div className="pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">UI Showcase</h1>
          <button 
            onClick={() => {
              // Force update all cards
              setBtcPrice(btcPrice * (1 + (Math.random() * 0.04 - 0.02)));
              setPortfolioValue(portfolioValue * (1 + (Math.random() * 0.03 - 0.01)));
              setPositionValue(positionValue * (1 + (Math.random() * 0.05 - 0.02)));
              setWinRate(Math.min(100, Math.max(0, winRate + (Math.random() * 2 - 1))));
              setUpdatedCards({
                price: true,
                portfolio: true,
                position: true,
                winRate: true
              });
              setLastUpdated(new Date());
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
        
        {lastUpdated && (
          <p className="mt-1 text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()} 
            (updates automatically every 10 seconds)
          </p>
        )}
        
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Animated Dashboard Cards</h2>
          
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatedStatsCard 
              title="Bitcoin Price"
              value={formatPrice(btcPrice)}
              change={calculateChange(btcPrice, prevBtcPrice)}
              trend={btcPrice > prevBtcPrice ? 'up' : btcPrice < prevBtcPrice ? 'down' : 'neutral'}
              icon={ArrowTrendingUpIcon}
              hasUpdated={updatedCards.price}
            />
            
            <AnimatedStatsCard 
              title="Portfolio Value"
              value={formatPrice(portfolioValue)}
              change={calculateChange(portfolioValue, prevPortfolioValue)}
              trend={portfolioValue > prevPortfolioValue ? 'up' : portfolioValue < prevPortfolioValue ? 'down' : 'neutral'}
              icon={CurrencyDollarIcon}
              hasUpdated={updatedCards.portfolio}
            />
            
            <AnimatedStatsCard 
              title="Position Value"
              value={formatPrice(positionValue)}
              change={calculateChange(positionValue, prevPositionValue)}
              trend={positionValue > prevPositionValue ? 'up' : positionValue < prevPositionValue ? 'down' : 'neutral'}
              icon={ScaleIcon}
              hasUpdated={updatedCards.position}
            />
            
            <AnimatedStatsCard 
              title="Win Rate"
              value={`${winRate.toFixed(1)}%`}
              change={calculateChange(winRate, prevWinRate)}
              trend={winRate > prevWinRate ? 'up' : winRate < prevWinRate ? 'down' : 'neutral'}
              icon={ChartBarIcon}
              hasUpdated={updatedCards.winRate}
            />
          </div>
        </div>
        
        <div className="mt-12 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">How These Cards Work</h2>
          
          <div className="prose max-w-none">
            <h3>Key Features</h3>
            <ul>
              <li><strong>Value Transitions:</strong> Smooth animations when values change</li>
              <li><strong>Pulse Animations:</strong> Visual feedback when data updates</li>
              <li><strong>Hover Effects:</strong> Cards elevate and cast a larger shadow on hover</li>
              <li><strong>Dynamic Coloring:</strong> Colors change based on trend direction (up/down)</li>
              <li><strong>Background Animation:</strong> Subtle gradient changes when values update</li>
            </ul>
            
            <h3>Implementation Details</h3>
            <p>
              These cards are built using Framer Motion for animations, with Tailwind CSS for styling.
              The component tracks value changes internally and automatically triggers appropriate animations.
            </p>
            
            <h3>Integration Steps</h3>
            <p>To use these components in your dashboard:</p>
            <ol>
              <li>Install Framer Motion: <code>npm install framer-motion</code> or <code>yarn add framer-motion</code></li>
              <li>Replace existing StatsCard components with AnimatedStatsCard</li>
              <li>Pass the trend prop ('up', 'down', or 'neutral') based on your data</li>
              <li>Set the hasUpdated prop to true whenever you want to trigger the update animation</li>
            </ol>
          </div>
        </div>
      </div>
    </Layout>
  );
} 