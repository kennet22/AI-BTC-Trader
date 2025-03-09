import React from 'react';
import { motion } from 'framer-motion';

/**
 * AnimatedButton - A button component with built-in hover and press animations
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button style variant: 'primary', 'secondary', 'success', 'danger', or 'neutral'
 * @param {boolean} props.isLoading - Whether the button is in loading state
 * @param {Object} props.animationProps - Additional animation properties to customize animations
 * @param {Function} props.onClick - Click handler function
 * @param {string} props.className - Additional CSS classes
 */
const AnimatedButton = ({ 
  children, 
  variant = 'primary',
  isLoading = false,
  animationProps = {},
  className = '',
  ...props 
}) => {
  // Define style variants
  const variantStyles = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    neutral: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
  };

  // Default animation settings
  const defaultAnimations = {
    whileHover: { scale: 1.03 },
    whileTap: { scale: 0.97 },
    transition: { 
      duration: 0.2,
      ease: 'easeInOut'
    }
  };

  // Merge default animations with custom ones
  const animations = {
    ...defaultAnimations,
    ...animationProps
  };

  return (
    <motion.button
      className={`
        px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 
        focus:ring-indigo-500 transition-colors duration-200 ease-in-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant] || variantStyles.primary}
        ${className}
      `}
      disabled={isLoading}
      {...animations}
      {...props}
    >
      <div className="flex items-center justify-center">
        {isLoading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </div>
    </motion.button>
  );
};

export default AnimatedButton; 