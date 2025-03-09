import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatPrice, formatPercentage } from '../lib/utils';
import { ClockIcon } from '@heroicons/react/24/outline';

const WinRateCard = ({ 
  winRate, 
  tradeHistory, 
  hasUpdated = false,
  linkTo = null 
}) => {
  const [isPulsing, setIsPulsing] = React.useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('trade'); // 'trade', 'week', 'month', 'year'

  // Set animation state when hasUpdated prop changes
  React.useEffect(() => {
    if (hasUpdated) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasUpdated]);

  // Calculate net profit and other stats
  const calculateStats = () => {
    if (!tradeHistory || tradeHistory.length === 0) {
      return {
        netProfit: 0,
        totalTrades: 0,
        winCount: 0,
        lossCount: 0,
        avgProfit: 0,
        avgLoss: 0,
        perTradeReturn: 0,
        weeklyReturn: 0,
        monthlyReturn: 0,
        yearlyReturn: 0
      };
    }

    // Filter completed trades (those with profit data)
    const completedTrades = tradeHistory.filter(trade => trade.profit !== undefined);
    
    // Calculate win/loss counts
    const winningTrades = completedTrades.filter(trade => trade.profit > 0);
    const losingTrades = completedTrades.filter(trade => trade.profit < 0);
    
    // Calculate net profit
    const netProfit = completedTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
    
    // Calculate average profit/loss
    const avgProfit = winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + trade.profit, 0) / winningTrades.length 
      : 0;
    
    const avgLoss = losingTrades.length > 0 
      ? losingTrades.reduce((sum, trade) => sum + trade.profit, 0) / losingTrades.length 
      : 0;
    
    // Calculate per trade return
    const perTradeReturn = completedTrades.length > 0 
      ? netProfit / completedTrades.length 
      : 0;
    
    // Estimate weekly, monthly, and yearly returns based on average trade frequency
    // This is a simplified calculation for demonstration
    const oldestTradeDate = completedTrades.length > 0 
      ? Math.min(...completedTrades.map(t => new Date(t.date).getTime())) 
      : Date.now();
    
    const daysSinceFirstTrade = (Date.now() - oldestTradeDate) / (1000 * 60 * 60 * 24);
    const tradesPerDay = daysSinceFirstTrade > 0 ? completedTrades.length / daysSinceFirstTrade : 0;
    
    const weeklyReturn = perTradeReturn * tradesPerDay * 7;
    const monthlyReturn = perTradeReturn * tradesPerDay * 30;
    const yearlyReturn = perTradeReturn * tradesPerDay * 365;
    
    return {
      netProfit,
      totalTrades: completedTrades.length,
      winCount: winningTrades.length,
      lossCount: losingTrades.length,
      avgProfit,
      avgLoss,
      perTradeReturn,
      weeklyReturn,
      monthlyReturn,
      yearlyReturn
    };
  };

  const stats = calculateStats();
  const profitColor = stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600';
  
  // Get the current return value based on selected period
  const getCurrentReturn = () => {
    switch (selectedPeriod) {
      case 'trade': return stats.perTradeReturn;
      case 'week': return stats.weeklyReturn;
      case 'month': return stats.monthlyReturn;
      case 'year': return stats.yearlyReturn;
      default: return stats.perTradeReturn;
    }
  };
  
  // Get label for the current period
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'trade': return 'Per Trade';
      case 'week': return 'Weekly';
      case 'month': return 'Monthly';
      case 'year': return 'Yearly';
      default: return 'Per Trade';
    }
  };
  
  const currentReturn = getCurrentReturn();
  const currentReturnColor = currentReturn >= 0 ? 'text-green-600' : 'text-red-600';
  const currentReturnBg = currentReturn >= 0 ? 'bg-green-500' : 'bg-red-500';

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
          <div>
            <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
            
            <motion.div 
              className="mt-1 text-2xl font-semibold text-gray-900"
              key={winRate} // Key changes force re-render and animation
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {formatPercentage(winRate)}
            </motion.div>
            
            <div className="mt-3 space-y-2">
              {/* Net Profit */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Net Profit:</span>
                <span className={`font-medium ${profitColor}`}>
                  {formatPrice(stats.netProfit)}
                </span>
              </div>
              
              {/* Trade Count */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Total Trades:</span>
                <span>{stats.totalTrades}</span>
              </div>
              
              {/* Win/Loss */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">W/L:</span>
                <span>
                  <span className="text-green-600">{stats.winCount}</span>
                  <span className="mx-1">/</span>
                  <span className="text-red-600">{stats.lossCount}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div>
            {linkTo ? (
              <a href={linkTo}>
                <motion.div 
                  className="p-3 bg-blue-100 rounded-full mt-1 cursor-pointer"
                  animate={{ 
                    opacity: isPulsing ? 1 : 0.8,
                    scale: isPulsing ? 1.1 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.1 }}
                >
                  <ClockIcon className="h-6 w-6 text-blue-600" />
                </motion.div>
              </a>
            ) : (
              <motion.div 
                className="p-3 bg-blue-100 rounded-full mt-1"
                animate={{ 
                  opacity: isPulsing ? 1 : 0.8,
                  scale: isPulsing ? 1.1 : 1
                }}
                transition={{ duration: 0.3 }}
              >
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Return period selector and visualization */}
        <div className="mt-auto pt-3">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium text-gray-700">{getPeriodLabel()} Return:</div>
            <div className={`text-sm font-medium ${currentReturnColor}`}>
              {formatPrice(currentReturn)}
            </div>
          </div>
          
          {/* Period selector */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {['trade', 'week', 'month', 'year'].map(period => (
              <button
                key={period}
                className={`text-xs py-1 px-2 rounded ${selectedPeriod === period ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                onClick={() => setSelectedPeriod(period)}
              >
                {period === 'trade' ? 'Trade' : period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'Year'}
              </button>
            ))}
          </div>
          
          {/* Return visualization */}
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full ${currentReturnBg}`}
              initial={{ width: '50%' }}
              animate={{ 
                width: `${Math.min(Math.max((currentReturn / 100) * 100 + 50, 0), 100)}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <div className="flex justify-between text-xs mt-1">
            <div className="text-gray-500">Avg Win: {formatPrice(stats.avgProfit)}</div>
            <div className="text-gray-500">Avg Loss: {formatPrice(stats.avgLoss)}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Return the card directly, no longer wrapping it in a link
  return CardContent;
};

export default WinRateCard; 