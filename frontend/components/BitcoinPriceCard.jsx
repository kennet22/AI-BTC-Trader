import React from 'react';
import { motion } from 'framer-motion';
import { formatPrice, formatPercentage } from '../lib/utils';
import { ArrowTrendingUpIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import MiniPriceChart from './MiniPriceChart';

const BitcoinPriceCard = ({ 
  currentPrice, 
  priceChangePercent,
  marketData = [],
  hasUpdated = false,
  linkTo = null,
  secondaryLinkTo = null
}) => {
  const [isPulsing, setIsPulsing] = React.useState(false);
  const [blinkState, setBlinkState] = React.useState(false);

  // Set animation state when hasUpdated prop changes
  React.useEffect(() => {
    if (hasUpdated) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasUpdated]);

  // Determine trend
  const trend = priceChangePercent > 0 ? 'up' : priceChangePercent < 0 ? 'down' : 'neutral';
  
  // Determine colors based on trend
  const trendConfig = {
    up: {
      textColor: 'text-green-600',
      gradientFrom: 'from-green-500/5',
      gradientTo: 'to-green-500/10',
      arrowRotate: 0,
    },
    down: {
      textColor: 'text-red-600',
      gradientFrom: 'from-red-500/5',
      gradientTo: 'to-red-500/10',
      arrowRotate: 180,
    },
    neutral: {
      textColor: 'text-gray-600',
      gradientFrom: 'from-blue-500/5',
      gradientTo: 'to-purple-500/10',
      arrowRotate: 90,
    }
  };

  const { textColor, gradientFrom, gradientTo, arrowRotate } = trendConfig[trend];

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
      {/* Animated background gradient */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} z-0`}
        animate={{ 
          opacity: isPulsing ? 0.8 : 0.3,
        }}
        transition={{ duration: 1 }}
      />

      <div className="relative p-5 z-10 flex flex-col h-full">
        <div className="flex justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Bitcoin Price</h3>
            
            <motion.div 
              className="mt-1 text-2xl font-semibold text-gray-900"
              key={currentPrice} // Key changes force re-render and animation
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {formatPrice(currentPrice)}
            </motion.div>
            
            {/* Animated change indicator */}
            <div className="flex items-center mt-1">
              <motion.div
                animate={{ rotate: arrowRotate }}
                className="mr-1"
              >
                {trend !== 'neutral' && (
                  <svg 
                    className={`h-4 w-4 ${textColor}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                )}
              </motion.div>
              <motion.span 
                className={`text-sm ${textColor}`}
                key={priceChangePercent} // Key changes force re-render and animation
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {`${priceChangePercent > 0 ? '+' : ''}${formatPercentage(priceChangePercent)}`}
              </motion.span>
            </div>
            
            {/* Market data link */}
            {secondaryLinkTo && (
              <div className="mt-3">
                <a 
                  href={secondaryLinkTo}
                  className="inline-flex items-center text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  <ChartBarIcon className="h-3 w-3 mr-1" />
                  View Market Data
                </a>
              </div>
            )}
          </div>
          
          <div>
            {linkTo ? (
              <a href={linkTo}>
                <motion.div 
                  className="p-3 bg-orange-100 rounded-full mt-1 cursor-pointer"
                  animate={{ 
                    opacity: isPulsing || blinkState ? 1 : 0.8,
                    scale: isPulsing ? 1.1 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.1 }}
                >
                  <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600" />
                </motion.div>
              </a>
            ) : (
              <motion.div 
                className="p-3 bg-orange-100 rounded-full mt-1"
                animate={{ 
                  opacity: isPulsing || blinkState ? 1 : 0.8,
                  scale: isPulsing ? 1.1 : 1
                }}
                transition={{ duration: 0.3 }}
              >
                <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600" />
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Mini price chart */}
        {marketData && marketData.length > 0 && (
          <div className="mt-4 flex-grow">
            <MiniPriceChart data={marketData} trend={trend} />
          </div>
        )}
        
        {/* Price change visualization */}
        <div className="mt-2 pt-1">
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full ${trend === 'up' ? 'bg-green-500' : trend === 'down' ? 'bg-red-500' : 'bg-gray-400'}`}
              initial={{ width: '50%' }}
              animate={{ 
                width: `${50 + (priceChangePercent * 10)}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>24h Low</span>
            <span>24h High</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Return the card directly, no longer wrapping it in a link
  return CardContent;
};

export default BitcoinPriceCard; 