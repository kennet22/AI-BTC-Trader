import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPercentage } from '../lib/utils';
import { LightBulbIcon, CpuChipIcon } from '@heroicons/react/24/outline';

// Helper function to get cached analysis data
const getCachedAnalysis = () => {
  if (typeof window === 'undefined') return null; // Guard against SSR
  
  try {
    const cachedData = localStorage.getItem('aiAnalysisData');
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      // Check if data is less than 30 minutes old
      if (Date.now() - timestamp < 30 * 60 * 1000) {
        return data;
      }
    }
  } catch (error) {
    console.error('Error retrieving cached analysis data:', error);
  }
  return null;
};

const AIAnalysisCard = ({ hasUpdated = false, isProcessing = false }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const [blinkState, setBlinkState] = useState(false);
  
  // AI model information
  const aiModel = {
    name: "GPT-4o",
    engine: "Auto Trader v0.5"
  };

  useEffect(() => {
    // Try to get cached analysis data
    const cachedData = getCachedAnalysis();
    if (cachedData) {
      setAnalysis(cachedData);
      setLoading(false);
    } else {
      // Fetch analysis data if no cached data
      fetchAnalysis();
    }
  }, []);

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
    if (isProcessing) {
      interval = setInterval(() => {
        setBlinkState(prev => !prev);
      }, 500); // Blink every 500ms
      
      // Fetch new analysis data after processing completes
      const fetchTimer = setTimeout(() => {
        fetchAnalysis();
      }, 5000); // Fetch after 5 seconds (matching the strategy running time)
      
      return () => {
        clearInterval(interval);
        clearTimeout(fetchTimer);
      };
    } else {
      setBlinkState(false);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-analysis');
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        setAnalysis(data.data);
      } else {
        throw new Error(data.detail || 'Failed to fetch AI analysis');
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

  return (
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
                <div className={`mt-1 text-2xl font-semibold ${getSignalColor(analysis.signal)}`}>
                  {analysis.signal}
                </div>
                
                {/* Confidence and model info */}
                <div className="flex items-center mt-1 text-xs text-gray-500">
                  <CpuChipIcon className="h-3 w-3 mr-1" />
                  <span>{aiModel.name}</span>
                  <span className="mx-1">•</span>
                  <span>{(analysis.confidence * 100).toFixed(0)}% confidence</span>
                </div>
                
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
            <motion.div 
              className={`p-3 ${isProcessing ? 'bg-purple-200' : 'bg-purple-100'} rounded-full mt-1`}
              animate={{ 
                opacity: isPulsing || blinkState ? 1 : 0.8,
                scale: isPulsing || blinkState ? 1.1 : 1
              }}
              transition={{ duration: 0.3 }}
            >
              <LightBulbIcon className={`h-6 w-6 ${isProcessing ? 'text-purple-800' : 'text-purple-600'}`} />
            </motion.div>
          </div>
        </div>
        
        {/* Footer with time horizon */}
        {analysis && analysis.signal && (
          <div className="mt-auto pt-3 flex justify-between items-center">
            <div className={`text-xs font-medium px-2 py-1 rounded-full ${getSignalBgColor(analysis.signal)} ${getSignalColor(analysis.signal)}`}>
              {analysis.time_horizon || 'Short-term'} outlook
            </div>
            <div className="text-xs text-gray-400">
              {aiModel.engine}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AIAnalysisCard; 