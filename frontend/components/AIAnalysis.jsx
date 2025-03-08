import React, { useState, useEffect } from 'react';
import { formatPercentage } from '../lib/utils';

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

// Helper function to store analysis data
const cacheAnalysisData = (data) => {
  if (typeof window === 'undefined') return; // Guard against SSR
  
  try {
    localStorage.setItem(
      'aiAnalysisData', 
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (error) {
    console.error('Error caching analysis data:', error);
  }
};

const AIAnalysis = ({ onError, onSuccess, isManualRequest = false }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestTimeout, setRequestTimeout] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set isClient to true once mounted
    setIsClient(true);
    
    // If not a manual request and we have cached data, use it
    if (!isManualRequest) {
      const cachedData = getCachedAnalysis();
      if (cachedData) {
        setAnalysis(cachedData);
        setLoading(false);
        if (onSuccess) onSuccess();
        return;
      }
    }

    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        
        // Set a timeout to cancel the request after 15 seconds
        const timeoutId = setTimeout(() => {
          setError('Request timed out after 15 seconds. The server might be busy.');
          setLoading(false);
          if (onError) onError('Request timed out after 15 seconds');
        }, 15000);
        
        setRequestTimeout(timeoutId);
        
        const controller = new AbortController();
        const timeoutSignal = AbortSignal.timeout(15000);
        
        const response = await fetch('/api/ai-analysis', {
          // Use both abort controller and timeout signal
          signal: controller.signal
        });
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Try to parse the error message from the response
          try {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Server error: ${response.status}`);
          } catch (jsonError) {
            throw new Error(`Server error: ${response.status}`);
          }
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
          setAnalysis(data.data);
          // Cache the successful analysis data
          if (isClient) {
            cacheAnalysisData(data.data);
          }
          if (onSuccess) onSuccess();
        } else {
          throw new Error(data.detail || 'Failed to fetch AI analysis');
        }
      } catch (err) {
        console.error('AI Analysis error:', err);
        
        // Handle different types of errors specifically
        if (err.name === 'AbortError') {
          setError('Request timed out. The server might be busy.');
        } else if (err.message.includes('pattern')) {
          setError('Invalid data format received from server. Try again later.');
        } else {
          setError(err.message || 'Failed to fetch AI analysis');
        }
        
        if (onError) onError(err.message || 'Failed to fetch AI analysis');
      } finally {
        setLoading(false);
      }
    };

    // For manual requests, always fetch fresh data
    if (isManualRequest && isClient) {
      fetchAnalysis();
    } else if (isClient) {
      // For automatic requests, only fetch if needed (no cached data)
      const cachedData = getCachedAnalysis();
      if (!cachedData) {
        fetchAnalysis();
      } else {
        setAnalysis(cachedData);
        setLoading(false);
        if (onSuccess) onSuccess();
      }
    }

    // Cleanup function to clear timeout if component unmounts
    return () => {
      if (requestTimeout) {
        clearTimeout(requestTimeout);
      }
    };
  }, [isManualRequest, onError, onSuccess, isClient]);

  // Helper function to render any value, handling objects and arrays recursively
  const renderValue = (value, depth = 0) => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {value.map((item, index) => (
            <li key={index}>{renderValue(item, depth + 1)}</li>
          ))}
        </ul>
      );
    }
    
    if (typeof value === 'object') {
      return (
        <div className={`${depth > 0 ? 'ml-4 mt-2' : ''}`}>
          {Object.entries(value).map(([key, val], index) => (
            <div key={index} className="mb-2">
              <span className="font-medium">{key.replace(/_/g, ' ')}:</span>{' '}
              {renderValue(val, depth + 1)}
            </div>
          ))}
        </div>
      );
    }
    
    return String(value);
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="text-red-500">Error: {error}</div>
        <p className="mt-2 text-sm text-gray-500">
          The AI analysis may take some time to generate. Please try again in a moment.
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="text-gray-500">No AI analysis available</div>
      </div>
    );
  }

  // Determine signal color
  const signalColor = analysis.signal === 'BUY' 
    ? 'text-green-600' 
    : analysis.signal === 'SELL' 
      ? 'text-red-600' 
      : 'text-yellow-600';

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">AI Trading Analysis</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Latest trading recommendation from AI
        </p>
      </div>
      <div className="border-t border-gray-200">
        <dl>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Signal</dt>
            <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
              <span className={`font-bold ${signalColor}`}>
                {analysis.signal}
              </span>
              <span className="ml-2 text-gray-500">
                (Confidence: {(analysis.confidence * 100).toFixed(1)}%)
              </span>
            </dd>
          </div>
          
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Position Size</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {formatPercentage(analysis.position_size_percent)} of available funds
            </dd>
          </div>
          
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Risk Management</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="flex flex-col space-y-1">
                <div>Stop Loss: {formatPercentage(analysis.stop_loss_percent)}</div>
                <div>Take Profit: {formatPercentage(analysis.take_profit_percent)}</div>
                <div>Time Horizon: {analysis.time_horizon}</div>
              </div>
            </dd>
          </div>
          
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Reasoning</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {renderValue(analysis.reasoning)}
            </dd>
          </div>
          
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Risks</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {renderValue(analysis.risks)}
            </dd>
          </div>
          
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Alternative Scenarios</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {renderValue(analysis.alternative_scenarios)}
            </dd>
          </div>
          
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Priority Indicators</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {renderValue(analysis.priority_indicators)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default AIAnalysis; 