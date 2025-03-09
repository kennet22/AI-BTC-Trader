import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowTopRightOnSquareIcon, ChartBarIcon } from '@heroicons/react/24/outline';

/**
 * AnimatedStatsCard - An enhanced card component for displaying statistics with animations
 * 
 * @param {Object} props
 * @param {string} props.title - The title of the card
 * @param {string|number} props.value - The main value to display
 * @param {string} props.change - The change amount/percentage to display
 * @param {string} props.trend - 'up', 'down', or 'neutral' to indicate the trend direction
 * @param {React.ElementType} props.icon - Icon component to display
 * @param {boolean} props.hasUpdated - Set to true to trigger the update animation
 * @param {string} props.linkTo - Optional URL to navigate to when card is clicked
 * @param {string} props.secondaryLinkTo - Optional secondary link URL
 * @param {string} props.secondaryLinkLabel - Optional tooltip text for secondary link
 * @param {React.ElementType} props.secondaryIcon - Optional custom icon for secondary link
 */
const AnimatedStatsCard = ({ 
  title, 
  value, 
  change, 
  trend = 'neutral', 
  icon: Icon,
  hasUpdated = false,
  linkTo = null,
  secondaryLinkTo = null,
  secondaryLinkLabel = "View details",
  secondaryIcon: SecondaryIcon = ChartBarIcon
}) => {
  // Track previous value to animate between values
  const [prevValue, setPrevValue] = useState(value);
  // Track animation state for the pulse effect
  const [isPulsing, setIsPulsing] = useState(false);

  // When value changes, trigger animations
  useEffect(() => {
    if (value !== prevValue) {
      setPrevValue(value);
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  // Set animation state when hasUpdated prop changes
  useEffect(() => {
    if (hasUpdated) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasUpdated]);

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
      className={`relative overflow-hidden bg-white rounded-lg shadow-md h-full ${isPulsing ? 'shadow-lg' : 'shadow-md'} ${linkTo ? 'cursor-pointer' : ''}`}
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
      whileHover={{ 
        y: -5,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
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

      {/* Pulse ring animation */}
      <AnimatePresence>
        {isPulsing && (
          <motion.div
            className="absolute inset-0 rounded-lg z-0"
            initial={{ boxShadow: `0 0 0 0 ${trend === 'up' ? 'rgba(52, 211, 153, 0.7)' : trend === 'down' ? 'rgba(248, 113, 113, 0.7)' : 'rgba(96, 165, 250, 0.7)'}` }}
            animate={{ 
              boxShadow: `0 0 0 10px ${trend === 'up' ? 'rgba(52, 211, 153, 0)' : trend === 'down' ? 'rgba(248, 113, 113, 0)' : 'rgba(96, 165, 250, 0)'}` 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          />
        )}
      </AnimatePresence>

      <div className="relative p-5 z-10 flex flex-col h-full">
        <div className="flex justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            
            {/* Animated value that transitions between numbers */}
            <motion.div 
              className="mt-1 text-2xl font-semibold text-gray-900"
              key={value} // Key changes force re-render and animation
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {value}
            </motion.div>
            
            {/* Animated change indicator */}
            {change && (
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
                  key={change} // Key changes force re-render and animation
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {change}
                </motion.span>
              </div>
            )}
          </div>
          
          <div className="flex items-start">
            {/* Secondary link button */}
            {secondaryLinkTo && (
              <Link href={secondaryLinkTo} legacyBehavior>
                <motion.a
                  className="mr-2 p-2 bg-primary-100 rounded-full hover:bg-primary-200 transition-colors duration-200"
                  title={secondaryLinkLabel}
                  onClick={(e) => e.stopPropagation()} // Prevent triggering the main card click
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <SecondaryIcon className="h-4 w-4 text-primary-700" />
                </motion.a>
              </Link>
            )}
            
            {/* Icon with opacity animation */}
            {Icon && (
              <motion.div 
                className="p-3 bg-primary-100 rounded-full"
                animate={{ 
                  opacity: isPulsing ? 1 : 0.8,
                  scale: isPulsing ? 1.1 : 1
                }}
                transition={{ duration: 0.3 }}
              >
                <Icon className="h-6 w-6 text-primary-700" />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Return the card with or without a link wrapper
  return linkTo ? (
    <Link href={linkTo} className="block h-full" legacyBehavior>
      <a className="block h-full">{CardContent}</a>
    </Link>
  ) : CardContent;
};

export default AnimatedStatsCard; 