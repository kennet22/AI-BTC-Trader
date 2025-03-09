import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatPrice, formatBtcAmount, formatPercentage } from '../lib/utils';
import { CurrencyDollarIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const PortfolioCard = ({ 
  portfolioValue, 
  accountBalance, 
  positions, 
  hasUpdated = false,
  linkTo = null 
}) => {
  const [isPulsing, setIsPulsing] = React.useState(false);
  const [showAllHoldings, setShowAllHoldings] = React.useState(false);
  const [showAllAccounts, setShowAllAccounts] = useState(false);

  // Set animation state when hasUpdated prop changes
  React.useEffect(() => {
    if (hasUpdated) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasUpdated]);

  // Group positions by asset
  const getHoldings = () => {
    // Default holdings with USD
    const holdings = {
      USD: {
        symbol: 'USD',
        amount: accountBalance?.usd_balance || 0,
        value: accountBalance?.usd_balance || 0,
        percentage: 0
      }
    };
    
    // Add crypto holdings from positions
    if (positions && positions.length > 0) {
      positions.forEach(position => {
        const symbol = position.symbol || 'BTC';
        
        if (!holdings[symbol]) {
          holdings[symbol] = {
            symbol,
            amount: 0,
            value: 0,
            percentage: 0
          };
        }
        
        holdings[symbol].amount += position.size;
        holdings[symbol].value += position.size * (position.current_price || 0);
      });
    }
    
    // Calculate percentages
    if (portfolioValue > 0) {
      Object.keys(holdings).forEach(symbol => {
        holdings[symbol].percentage = holdings[symbol].value / portfolioValue;
      });
    }
    
    // Sort by value (descending)
    return Object.values(holdings).sort((a, b) => b.value - a.value);
  };
  
  // Mock Coinbase accounts data (in a real app, this would come from the API)
  const getCoinbaseAccounts = () => {
    return [
      {
        id: 'main',
        name: 'Main Account',
        value: portfolioValue * 0.7, // 70% of portfolio in main account
        holdings: [
          { symbol: 'BTC', amount: 0.00011579, value: accountBalance?.btc_balance_usd || 0 },
          { symbol: 'USD', amount: accountBalance?.usd_balance || 0, value: accountBalance?.usd_balance || 0 }
        ]
      },
      {
        id: 'savings',
        name: 'Savings',
        value: portfolioValue * 0.2, // 20% of portfolio in savings
        holdings: [
          { symbol: 'ETH', amount: 0.15, value: 300 },
          { symbol: 'USDC', amount: 200, value: 200 }
        ]
      },
      {
        id: 'trading',
        name: 'Trading',
        value: portfolioValue * 0.1, // 10% of portfolio in trading
        holdings: [
          { symbol: 'SOL', amount: 2.5, value: 150 },
          { symbol: 'XRP', amount: 100, value: 50 }
        ]
      }
    ];
  };

  const holdings = getHoldings();
  const topHoldings = holdings.slice(0, 3); // Top 3 holdings for compact view
  const hasMoreHoldings = holdings.length > 3;
  
  const accounts = getCoinbaseAccounts();

  // Format amount based on asset type
  const formatAmount = (holding) => {
    if (holding.symbol === 'USD' || holding.symbol === 'USDC' || holding.symbol === 'USDT') {
      return formatPrice(holding.amount);
    } else if (holding.symbol === 'BTC') {
      return `${formatBtcAmount(holding.amount)} BTC`;
    } else {
      // Format other crypto with 4 decimal places
      return `${holding.amount.toFixed(4)} ${holding.symbol}`;
    }
  };

  // Create the card content
  const CardContent = (
    <motion.div
      className="relative overflow-hidden bg-white rounded-lg shadow-md h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        boxShadow: isPulsing 
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
      transition={{ 
        duration: 0.3,
        boxShadow: { 
          duration: 0.5, 
          ease: "easeOut" 
        }
      }}
    >
      {/* Background gradient */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/10 z-0"
        animate={{ 
          opacity: isPulsing ? 0.8 : 0.3,
        }}
        transition={{ duration: 1 }}
      />

      <div className="relative p-5 z-10 flex flex-col h-full">
        <div className="flex justify-between">
          <div className="w-full">
            <h3 className="text-sm font-medium text-gray-500">Portfolio Value</h3>
            
            <motion.div 
              className="mt-1 text-2xl font-semibold text-gray-900"
              key={portfolioValue} // Key changes force re-render and animation
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {formatPrice(portfolioValue)}
            </motion.div>
            
            {/* Account summary */}
            <div className="mt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700">ACCOUNTS</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the card's link
                    setShowAllAccounts(!showAllAccounts);
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center focus:outline-none"
                >
                  {showAllAccounts ? (
                    <>Less <ChevronUpIcon className="h-3 w-3 ml-1" /></>
                  ) : (
                    <>More <ChevronDownIcon className="h-3 w-3 ml-1" /></>
                  )}
                </button>
              </div>
              
              {/* Account list */}
              <div className="space-y-2">
                {accounts.map((account, index) => (
                  <div 
                    key={account.id}
                    className={`${index > 0 && !showAllAccounts ? 'hidden' : ''}`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{account.name}:</span>
                      <span>{formatPrice(account.value)}</span>
                    </div>
                    
                    {/* Account holdings (only shown when expanded) */}
                    {showAllAccounts && (
                      <div className="ml-4 mt-1 space-y-1">
                        {account.holdings.map(holding => (
                          <div key={holding.symbol} className="flex justify-between text-xs text-gray-500">
                            <span>{holding.symbol}:</span>
                            <span>{formatAmount({ symbol: holding.symbol, amount: holding.amount })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Top holdings */}
              <div className="mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">TOP HOLDINGS</span>
                  {hasMoreHoldings && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the card's link
                        setShowAllHoldings(!showAllHoldings);
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 flex items-center focus:outline-none"
                    >
                      {showAllHoldings ? (
                        <>Less <ChevronUpIcon className="h-3 w-3 ml-1" /></>
                      ) : (
                        <>More <ChevronDownIcon className="h-3 w-3 ml-1" /></>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Holdings list */}
                <div className="space-y-2 mt-1">
                  {(showAllHoldings ? holdings : topHoldings).map(holding => (
                    <div key={holding.symbol} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{holding.symbol}:</span>
                      <div className="flex flex-col items-end">
                        <span>{formatAmount(holding)}</span>
                        <span className="text-xs text-gray-500">
                          {formatPercentage(holding.percentage)} of portfolio
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            {linkTo ? (
              <a href={linkTo}>
                <motion.div 
                  className="p-3 bg-green-100 rounded-full mt-1 cursor-pointer"
                  animate={{ 
                    opacity: isPulsing ? 1 : 0.8,
                    scale: isPulsing ? 1.1 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.1 }}
                >
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </motion.div>
              </a>
            ) : (
              <motion.div 
                className="p-3 bg-green-100 rounded-full mt-1"
                animate={{ 
                  opacity: isPulsing ? 1 : 0.8,
                  scale: isPulsing ? 1.1 : 1
                }}
                transition={{ duration: 0.3 }}
              >
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Portfolio allocation visualization */}
        <div className="mt-auto pt-3">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            {holdings.map((holding, index) => {
              // Calculate the starting position for this segment
              const previousWidth = holdings
                .slice(0, index)
                .reduce((sum, h) => sum + h.percentage, 0) * 100;
              
              // Skip rendering tiny segments
              if (holding.percentage < 0.01) return null;
              
              // Assign colors based on asset type
              const getColor = (symbol, index) => {
                const colors = [
                  'bg-primary-600', // Primary color for first asset
                  'bg-blue-500',    // Blue for second
                  'bg-green-500',   // Green for third
                  'bg-yellow-500',  // Yellow for fourth
                  'bg-purple-500',  // Purple for fifth
                  'bg-pink-500'     // Pink for sixth
                ];
                
                // Special colors for common assets
                if (symbol === 'BTC') return 'bg-orange-500';
                if (symbol === 'ETH') return 'bg-indigo-500';
                if (symbol === 'USD') return 'bg-green-600';
                if (symbol === 'XRP') return 'bg-blue-600';
                if (symbol === 'SOL') return 'bg-purple-600';
                
                // Default to the color array
                return colors[index % colors.length];
              };
              
              return (
                <div 
                  key={holding.symbol}
                  className={`h-full ${getColor(holding.symbol, index)} absolute`}
                  style={{ 
                    width: `${holding.percentage * 100}%`,
                    left: `${previousWidth}%`
                  }}
                />
              );
            })}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-500">
            {holdings.slice(0, 5).map((holding, index) => (
              <span key={holding.symbol} className="whitespace-nowrap">
                {holding.symbol} {formatPercentage(holding.percentage)}
              </span>
            ))}
            {holdings.length > 5 && (
              <span>+{holdings.length - 5} more</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Return the card directly, no longer wrapping it in a link
  return CardContent;
};

export default PortfolioCard; 