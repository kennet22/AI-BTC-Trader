import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import BitcoinPriceChart from '../components/BitcoinPriceChart';
import ChartIndicators from '../components/ChartIndicators';
import TechnicalIndicators from '../components/TechnicalIndicators';
import AIAnalysis from '../components/AIAnalysis';
import RunAIAnalysisButton from '../components/RunAIAnalysisButton';
import { formatPrice } from '../lib/utils';
import bitcoinApi from '../lib/api';
import { toast, Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import PageTransition from '../components/PageTransition';
import { useCrypto } from '../lib/cryptoContext';

// Use local storage to cache market data between page navigations
const getStoredMarketData = (timeframe, cryptoAsset) => {
  if (typeof window === 'undefined') return null; // Guard against SSR
  
  try {
    const cachedData = localStorage.getItem(`marketData_${cryptoAsset}_${timeframe}`);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      // Check if data is less than 5 minutes old
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
  } catch (error) {
    console.error('Error retrieving cached market data:', error);
  }
  return null;
};

const storeMarketData = (timeframe, cryptoAsset, data) => {
  if (typeof window === 'undefined') return; // Guard against SSR
  
  try {
    localStorage.setItem(
      `marketData_${cryptoAsset}_${timeframe}`, 
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (error) {
    console.error('Error caching market data:', error);
  }
};

// Get stored indicators from local storage
const getStoredIndicators = () => {
  if (typeof window === 'undefined') return []; // Guard against SSR
  
  try {
    const storedIndicators = localStorage.getItem('chartIndicators');
    if (storedIndicators) {
      return JSON.parse(storedIndicators);
    }
  } catch (error) {
    console.error('Error retrieving stored indicators:', error);
  }
  return [];
};

// Store indicators in local storage
const storeIndicators = (indicators) => {
  if (typeof window === 'undefined') return; // Guard against SSR
  
  try {
    localStorage.setItem('chartIndicators', JSON.stringify(indicators));
  } catch (error) {
    console.error('Error storing indicators:', error);
  }
};

export default function MarketData() {
  const { selectedCryptoAsset, isChangingCrypto } = useCrypto();
  const [isClient, setIsClient] = useState(false);
  const [marketData, setMarketData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('ONE_HOUR');
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  // Set isClient to true once the component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper functions for toast
  const showErrorToast = (message) => {
    if (isClient) {
      toast.error(message);
    } else {
      console.error(message);
    }
  };
  
  const showSuccessToast = (message) => {
    if (isClient) {
      toast.success(message);
    } else {
      console.log(message);
    }
  };

  // Load cached data on mount
  useEffect(() => {
    if (!isClient) return;

    const cachedIndicators = getStoredIndicators();
    if (cachedIndicators) {
      setActiveIndicators(cachedIndicators);
    }

    const cachedData = getStoredMarketData(selectedTimeframe, selectedCryptoAsset);
    if (cachedData) {
      setMarketData(cachedData);
      // Set last updated from cached data timestamp
      setLastUpdated(new Date());
    } else {
      // No cached data, fetch fresh data
      fetchMarketData();
    }
  }, [isClient, selectedTimeframe]); // Remove selectedCryptoAsset from here
  
  // Watch for changes to selectedCryptoAsset
  useEffect(() => {
    if (!isClient) return;
    
    console.log('Crypto asset changed to:', selectedCryptoAsset);
    fetchMarketData();
    
    // Reset analysis if it was showing
    if (showAnalysis) {
      setShowAnalysis(false);
      setAnalysisError(null);
    }
  }, [selectedCryptoAsset, isClient]);

  const fetchMarketData = async () => {
    try {
      setIsLoading(true);
      const response = await bitcoinApi.getMarketData(selectedTimeframe, selectedCryptoAsset);
      
      if (response.status === 'success') {
        setMarketData(response.data);
        // Cache the data for future use
        storeMarketData(selectedTimeframe, selectedCryptoAsset, response.data);
        setLastUpdated(new Date());
      } else {
        if (isClient) {
          showErrorToast(`Failed to fetch market data: ${response.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      if (isClient) {
        showErrorToast(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchMarketData();
    // Reset analysis if it was showing
    if (showAnalysis) {
      setShowAnalysis(false);
      setAnalysisError(null);
    }
  };

  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
    // Reset analysis if it was showing
    if (showAnalysis) {
      setShowAnalysis(false);
      setAnalysisError(null);
    }
  };

  const handleRunAnalysis = () => {
    setShowAnalysis(true);
    setAnalysisError(null);
    setIsAnalysisLoading(true);
    
    // AI analysis will be loaded by the AIAnalysis component
    // We just need to show it and handle any errors that come back
  };

  const handleAnalysisError = (error) => {
    setAnalysisError(error);
    setIsAnalysisLoading(false);
  };

  const handleAnalysisSuccess = () => {
    setIsAnalysisLoading(false);
  };
  
  const handleIndicatorChange = (indicators) => {
    setActiveIndicators(indicators);
    storeIndicators(indicators);
  };

  return (
    <Layout>
      <PageTransition>
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Market Data</h1>
            <div className="flex space-x-2">
              <RunAIAnalysisButton
                onClick={handleRunAnalysis}
                isProcessing={false}
                variant="secondary"
                cryptoAsset={selectedCryptoAsset}
              />
            </div>
          </div>
          
          {/* Chart Section */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex flex-col sm:flex-row justify-between mb-4">
              <h2 className="text-lg font-semibold mb-2 sm:mb-0">
                {selectedCryptoAsset} Price Chart
              </h2>
              <div className="flex space-x-2">
                <select
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 p-2"
                  value={selectedTimeframe}
                  onChange={(e) => handleTimeframeChange(e.target.value)}
                >
                  <option value="ONE_DAY">1 Day</option>
                  <option value="SIX_HOURS">6 Hours</option>
                  <option value="ONE_HOUR">1 Hour</option>
                  <option value="FIFTEEN_MINUTES">15 Minutes</option>
                  <option value="FIVE_MINUTES">5 Minutes</option>
                  <option value="ONE_MINUTE">1 Minute</option>
                </select>
                <button
                  className="bg-primary-50 hover:bg-primary-100 text-primary-600 font-medium py-2 px-4 rounded-lg"
                  onClick={handleRefresh}
                >
                  Refresh
                </button>
              </div>
            </div>
            
            <BitcoinPriceChart
              marketData={marketData}
              timeframe={selectedTimeframe}
              indicators={activeIndicators}
              cryptoAsset={selectedCryptoAsset}
              isLoading={isLoading || isChangingCrypto}
            />
            
            {isClient && (
              <div className="mt-4">
                <ChartIndicators 
                  indicators={activeIndicators} 
                  onIndicatorChange={handleIndicatorChange} 
                />
              </div>
            )}
          </div>
          
          {/* Technical Indicators */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Technical Indicators</h2>
            <TechnicalIndicators marketData={marketData} />
          </div>
          
          {/* AI Analysis */}
          {(showAnalysis || analysisError) && (
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">
                AI Analysis
              </h2>
              <AIAnalysis marketData={marketData} error={analysisError} />
            </div>
          )}
        </div>
        
        {/* Add the Toaster component */}
        {isClient && <Toaster position="bottom-right" />}
      </PageTransition>
    </Layout>
  );
} 