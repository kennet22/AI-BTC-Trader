import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { formatPercentage } from '../lib/utils';
import { LightBulbIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import bitcoinApi from '../lib/api';
import { useCrypto } from '../lib/cryptoContext';

// Dynamically import motion components with SSR disabled
const MotionDiv = dynamic(() => import('framer-motion').then(mod => mod.motion.div), { ssr: false });

// Helper function to get cached analysis data
const getCachedAnalysis = (cryptoAsset = 'BTC') => {
  if (typeof window === 'undefined') return null; // Guard against SSR
  
  try {
    // First check the new cache format
    const analysisCache = JSON.parse(localStorage.getItem('aiAnalysisCache') || '{}');
    if (analysisCache[cryptoAsset]) {
      const { data, timestamp } = analysisCache[cryptoAsset];
      // Check if data is less than 5 minutes old
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
    
    // Fallback to the old format for backward compatibility
    const cached = localStorage.getItem('aiAnalysis');
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Check if data is less than 5 minutes old
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        // Assume this is for BTC unless proven otherwise
        if (cryptoAsset === 'BTC') {
          return data;
        }
      }
    }
  } catch (error) {
    console.error('Error retrieving cached analysis:', error);
  }
  return null;
};

// Helper function to parse API response data
const parseAnalysisData = (responseData) => {
  // For debugging
  console.log('Parsing analysis data:', JSON.stringify(responseData));
  
  // If the data is already in the expected format, return it
  if (responseData && responseData.signal) {
    return responseData;
  }
  
  // Check for detailed analysis data nested in different formats
  let analysisData = null;
  
  // Case 1: Data is nested in a "data" property
  if (responseData && responseData.data) {
    analysisData = responseData.data;
  } 
  // Case 2: Response itself is the data
  else if (responseData && typeof responseData === 'object') {
    analysisData = responseData;
  }
  
  // If we found some analysis data, return it in a standardized format
  if (analysisData) {
    // Extract signal with fallbacks
    const signal = analysisData.signal || 
                  (analysisData.data && analysisData.data.signal) || 
                  "HOLD";
    
    // Extract confidence with fallbacks
    const confidence = analysisData.confidence || 
                      (analysisData.data && analysisData.data.confidence) || 
                      0.5;
    
    // Extract other fields with fallbacks
    return {
      signal: signal,
      confidence: confidence,
      position_size_percent: analysisData.position_size_percent || 
                            (analysisData.data && analysisData.data.position_size_percent) || 
                            0,
      stop_loss_percent: analysisData.stop_loss_percent || 
                        (analysisData.data && analysisData.data.stop_loss_percent) || 
                        0,
      take_profit_percent: analysisData.take_profit_percent || 
                          (analysisData.data && analysisData.data.take_profit_percent) || 
                          0,
      priority_indicators: analysisData.priority_indicators || 
                          (analysisData.data && analysisData.data.priority_indicators) || 
                          [],
      reasoning: analysisData.reasoning || 
                (analysisData.data && analysisData.data.reasoning) || 
                {},
      crypto_asset: analysisData.crypto_asset ||
                  (analysisData.data && analysisData.data.crypto_asset) ||
                  'BTC',
      error_occurred: analysisData.error_occurred ||
                    (analysisData.data && analysisData.data.error_occurred) ||
                    false
    };
  }
  
  // If we couldn't parse the data, return null
  console.error('Failed to parse analysis data:', responseData);
  return null;
};

const AIAnalysisCard = ({ hasUpdated = false, isProcessing = false }) => {
  const { selectedCryptoAsset } = useCrypto();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const [blinkState, setBlinkState] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  
  // AI model information
  const aiModel = {
    name: "GPT-4o",
    engine: "Auto Trader v0.5"
  };

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Try to get cached analysis data
    const cachedData = getCachedAnalysis(selectedCryptoAsset);
    if (cachedData && isMounted) {
      try {
        const parsedData = parseAnalysisData(cachedData);
        if (parsedData) {
          setAnalysis(parsedData);
        } else {
          console.error('Failed to parse cached analysis data');
        }
      } catch (error) {
        console.error('Error parsing cached analysis:', error);
      }
      setLoading(false);
    } else {
      // Fetch analysis data if no cached data
      fetchAnalysis();
    }
    
    return () => {
      isMounted = false;
    };
  }, [selectedCryptoAsset]);

  useEffect(() => {
    if (hasUpdated) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasUpdated]);
  
  // Blinking effect when processing
  useEffect(() => {
    let interval;
    let fetchTimer;
    
    if (isProcessing) {
      interval = setInterval(() => {
        setBlinkState(prev => !prev);
      }, 500); // Blink every 500ms
      
      // Fetch new analysis data after processing completes
      fetchTimer = setTimeout(() => {
        fetchAnalysis();
      }, 5000); // Fetch after 5 seconds (matching the strategy running time)
    } else {
      setBlinkState(false);
    }
    
    return () => {
      if (interval) clearInterval(interval);
      if (fetchTimer) clearTimeout(fetchTimer);
    };
  }, [isProcessing]);

  const fetchAnalysis = async () => {
    // Rate limiting - prevent fetching more than once every 10 seconds
    const now = Date.now();
    if (now - lastFetchTime < 10000) {
      console.log('Rate limiting AI analysis fetch - too soon since last fetch');
      return;
    }
    
    try {
      setLoading(true);
      setLastFetchTime(now);
      
      // Use the API client instead of direct fetch
      const response = await bitcoinApi.getAIAnalysis(selectedCryptoAsset);
      
      if (response.status === 'success') {
        try {
          const parsedData = parseAnalysisData(response);
          if (parsedData) {
            setAnalysis(parsedData);
            // Store in localStorage for caching
            if (typeof window !== 'undefined') {
              // Store in both the new per-asset cache and the old cache for backward compatibility
              const analysisCache = JSON.parse(localStorage.getItem('aiAnalysisCache') || '{}');
              analysisCache[selectedCryptoAsset] = {
                data: response,
                timestamp: Date.now()
              };
              localStorage.setItem('aiAnalysisCache', JSON.stringify(analysisCache));
              
              // Old format
              localStorage.setItem('aiAnalysis', JSON.stringify({
                data: response,
                timestamp: Date.now()
              }));
            }
          } else {
            console.error('Failed to parse analysis data:', response);
            setError('Failed to parse analysis data');
          }
        } catch (parseError) {
          console.error('Error parsing analysis data:', parseError);
          setError(`Error parsing data: ${parseError.message}`);
        }
      } else if (response.status === 'error' && response.message && response.message.includes('in progress')) {
        console.log('AI analysis is already in progress, will try again later');
        setError('Analysis in progress, please wait...');
      } else {
        throw new Error(response.detail || 'Failed to fetch AI analysis');
      }
    } catch (err) {
      console.error('AI Analysis error:', err);
      setError(err.message || 'Failed to fetch AI analysis');
    } finally {
      setLoading(false);
    }
  };

  // Determine signal color
  const getSignalColor = (signal) => {
    return signal === 'BUY' 
      ? 'text-green-600' 
      : signal === 'SELL' 
        ? 'text-red-600' 
        : 'text-yellow-600';
  };

  const getSignalBgColor = (signal) => {
    return signal === 'BUY' 
      ? 'bg-green-100' 
      : signal === 'SELL' 
        ? 'bg-red-100' 
        : 'bg-yellow-100';
  };

  // Create a card with animation styles
  const cardStyles = {
    className: "relative overflow-hidden bg-white rounded-lg shadow-md h-full",
    style: {
      boxShadow: isPulsing 
        ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      transition: 'box-shadow 0.5s ease-out'
    }
  };

  // Create a gradient background with animation styles
  const gradientStyles = {
    className: "absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/10 z-0",
    style: {
      opacity: isPulsing ? 0.8 : 0.3,
      transition: 'opacity 1s'
    }
  };

  // Create a light bulb icon with animation styles
  const lightBulbStyles = {
    className: `p-3 ${isProcessing ? 'bg-purple-200' : 'bg-purple-100'} rounded-full mt-1`,
    style: {
      opacity: isPulsing || blinkState ? 1 : 0.8,
      transform: isPulsing || blinkState ? 'scale(1.1)' : 'scale(1)',
      transition: 'opacity 0.3s, transform 0.3s'
    }
  };

  // Use a regular div for both server-side rendering and client-side rendering
  return (
    <div {...cardStyles}>
      {/* Background gradient */}
      <div {...gradientStyles} />

      <div className="relative p-5 z-10 flex flex-col h-full">
        <div className="flex justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">AI Analysis</h3>
            
            {loading && !analysis ? (
              <div className="mt-1 text-2xl font-semibold text-gray-900 animate-pulse">
                Analyzing...
              </div>
            ) : error && !analysis ? (
              <div className="mt-1 text-lg font-semibold text-red-500">
                Analysis unavailable
              </div>
            ) : analysis ? (
              <div>
                {analysis.error_occurred ? (
                  <div className="mt-1 text-lg font-semibold text-yellow-500">
                    Limited Analysis
                  </div>
                ) : (
                  <div className={`mt-1 text-2xl font-semibold ${getSignalColor(analysis.signal)}`}>
                    {analysis.signal}
                  </div>
                )}
                
                {/* Asset and model info */}
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <CpuChipIcon className="h-3 w-3 mr-1" />
                  <span>{aiModel.name}</span>
                  <span className="mx-1">•</span>
                  <span>{analysis.crypto_asset || selectedCryptoAsset || 'BTC'}</span>
                  <span className="mx-1">•</span>
                  <span>{(analysis.confidence * 100).toFixed(0)}% confidence</span>
                </div>
                
                {/* Show error message if present */}
                {analysis.error_occurred && analysis.reasoning && analysis.reasoning.error && (
                  <div className="mt-2 text-xs text-red-500 italic">
                    {analysis.reasoning.error}
                  </div>
                )}
                
                {/* Trading parameters */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500">Position</div>
                    <div className="font-medium">{formatPercentage(analysis.position_size_percent)}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500">Stop Loss</div>
                    <div className="font-medium text-red-600">{formatPercentage(analysis.stop_loss_percent)}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500">Take Profit</div>
                    <div className="font-medium text-green-600">{formatPercentage(analysis.take_profit_percent)}</div>
                  </div>
                </div>
                
                {/* Top indicators */}
                {analysis.priority_indicators && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">TOP INDICATORS:</div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(analysis.priority_indicators) && 
                        analysis.priority_indicators.slice(0, 3).map((indicator, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {typeof indicator === 'string' ? indicator : indicator.name || 'Indicator'}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1 text-lg font-semibold text-gray-900">
                No analysis available
              </div>
            )}
          </div>
          
          <div>
            <div {...lightBulbStyles}>
              <LightBulbIcon className={`h-6 w-6 ${isProcessing ? 'text-purple-800' : 'text-purple-600'}`} />
            </div>
          </div>
        </div>
        
        {/* Link to full analysis */}
        <div className="mt-auto pt-4">
          <a 
            href="/ai-analysis" 
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
          >
            View full analysis
            <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisCard; 