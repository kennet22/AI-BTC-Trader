import React, { useState, useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import bitcoinApi from '../lib/api';

export default function RunAIAnalysisButton({ 
  className = '', 
  variant = 'primary', 
  onClick, 
  isProcessing = false,
  cryptoAsset = 'BTC' 
}) {
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Helper function for safe toast usage
  const showToast = (message, type = 'error') => {
    if (isClient) {
      if (type === 'success') {
        toast.success(message);
      } else {
        toast.error(message);
      }
    } else {
      console[type === 'success' ? 'log' : 'error'](message);
    }
  };

  const runAnalysis = async () => {
    if (isProcessing) {
      // Don't do anything if already processing
      return;
    }
    
    if (onClick) {
      // Use the provided onClick handler if available
      onClick();
    } else {
      // Fallback to default implementation
      try {
        // Show loading toast with a unique ID to prevent duplicates
        if (isClient) {
          toast.loading(`Starting AI Analysis for ${cryptoAsset}...`, { id: 'run-ai-analysis-toast' });
        }
        
        // Call the runStrategy API endpoint to start the analysis
        const response = await bitcoinApi.runStrategy(cryptoAsset);
        
        if (response.status === 'success') {
          showToast(`AI Analysis for ${cryptoAsset} started! Results will be available soon.`, 'success');
          
          // Start polling for results
          let attempts = 0;
          const maxAttempts = 12; // 1 minute (12 * 5 seconds)
          
          const pollInterval = setInterval(async () => {
            attempts++;
            
            try {
              // Check if analysis is complete
              const analysisResponse = await bitcoinApi.getAIAnalysis(cryptoAsset);
              
              if (analysisResponse.status === 'success') {
                clearInterval(pollInterval);
                showToast(`AI Analysis for ${cryptoAsset} completed!`, 'success');
                
                // Store analysis data by crypto asset
                if (typeof window !== 'undefined') {
                  const analysisCache = JSON.parse(localStorage.getItem('aiAnalysisCache') || '{}');
                  analysisCache[cryptoAsset] = {
                    data: analysisResponse.data,
                    timestamp: Date.now()
                  };
                  localStorage.setItem('aiAnalysisCache', JSON.stringify(analysisCache));
                }
              } else if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                showToast(`Analysis for ${cryptoAsset} is still processing in the background.`, 'success');
              }
            } catch (pollError) {
              console.error('Error checking analysis status:', pollError);
              
              if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                showToast(`Error checking analysis status for ${cryptoAsset}. Please check the AI Analysis page for results.`);
              }
            }
          }, 5000); // Poll every 5 seconds
        } else {
          showToast(`Error: ${response.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error running analysis:', error);
        showToast(`Error: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const baseClasses = 'inline-flex items-center px-4 py-2 rounded-md text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200';
  const variantClasses = {
    primary: `bg-primary-600 text-white ${isProcessing ? 'opacity-70' : 'hover:bg-primary-700'} focus:ring-primary-500`,
    secondary: `bg-white text-gray-700 ${isProcessing ? 'opacity-70' : 'hover:bg-gray-50'} focus:ring-primary-500 border border-gray-300`,
  };

  // Create button styles with hover and tap effects
  const buttonStyles = {
    className: `${baseClasses} ${variantClasses[variant]} ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`,
    style: isClient ? {
      transition: 'transform 0.2s, opacity 0.2s',
      transform: 'scale(1)',
      opacity: isProcessing ? 0.7 : 1
    } : {}
  };

  // Add hover and active event handlers for client-side only
  const buttonEvents = isClient ? {
    onMouseEnter: (e) => {
      if (!isProcessing) {
        e.currentTarget.style.transform = 'scale(1.02)';
      }
    },
    onMouseLeave: (e) => {
      if (!isProcessing) {
        e.currentTarget.style.transform = 'scale(1)';
      }
    },
    onMouseDown: (e) => {
      if (!isProcessing) {
        e.currentTarget.style.transform = 'scale(0.98)';
      }
    },
    onMouseUp: (e) => {
      if (!isProcessing) {
        e.currentTarget.style.transform = 'scale(1.02)';
      }
    }
  } : {};

  return (
    <button
      {...buttonStyles}
      {...buttonEvents}
      onClick={runAnalysis}
      disabled={isProcessing}
      title={`Run AI Analysis for ${cryptoAsset}`}
    >
      <SparklesIcon className={`w-5 h-5 mr-2 ${isProcessing ? 'animate-pulse' : ''}`} />
      {isProcessing ? 'Analyzing...' : 'Run AI Analysis'}
    </button>
  );
} 