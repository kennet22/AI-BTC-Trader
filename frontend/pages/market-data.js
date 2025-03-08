import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import BitcoinPriceChart from '../components/BitcoinPriceChart';
import TechnicalIndicators from '../components/TechnicalIndicators';
import AIAnalysis from '../components/AIAnalysis';
import { formatPrice } from '../lib/utils';
import bitcoinApi from '../lib/api';
import dynamic from 'next/dynamic';

// Dynamically import toast to prevent SSR issues
const toast = dynamic(
  () => import('react-hot-toast').then((mod) => mod.toast),
  { ssr: false }
);

// Use local storage to cache market data between page navigations
const getStoredMarketData = (timeframe) => {
  if (typeof window === 'undefined') return null; // Guard against SSR
  
  try {
    const cachedData = localStorage.getItem(`marketData_${timeframe}`);
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

const storeMarketData = (timeframe, data) => {
  if (typeof window === 'undefined') return; // Guard against SSR
  
  try {
    localStorage.setItem(
      `marketData_${timeframe}`, 
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (error) {
    console.error('Error caching market data:', error);
  }
};

export default function MarketData() {
  const [marketData, setMarketData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('ONE_HOUR');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set isClient to true once we're on the client side
    setIsClient(true);
    
    // Check if we have cached data first
    const cachedData = getStoredMarketData(selectedTimeframe);
    if (cachedData) {
      setMarketData(cachedData);
      setIsLoading(false);
      // Set last updated from cached data timestamp
      setLastUpdated(new Date());
    } else {
      // No cached data, fetch fresh data
      fetchMarketData();
    }
  }, [selectedTimeframe]);

  const fetchMarketData = async () => {
    try {
      setIsLoading(true);
      const response = await bitcoinApi.getMarketData(selectedTimeframe);
      
      if (response.status === 'success') {
        setMarketData(response.data);
        // Cache the data for future use
        storeMarketData(selectedTimeframe, response.data);
        setLastUpdated(new Date());
      } else {
        if (isClient) {
          toast.error(`Failed to fetch market data: ${response.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      if (isClient) {
        toast.error(`Error: ${error.message}`);
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

  return (
    <Layout>
      <div className="pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Market Data</h1>
          <div className="flex space-x-2">
            <select
              className="block w-full px-3 py-2 text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              value={selectedTimeframe}
              onChange={(e) => handleTimeframeChange(e.target.value)}
              disabled={isLoading}
            >
              <option value="ONE_MINUTE">1m</option>
              <option value="FIVE_MINUTE">5m</option>
              <option value="FIFTEEN_MINUTE">15m</option>
              <option value="THIRTY_MINUTE">30m</option>
              <option value="ONE_HOUR">1h</option>
              <option value="TWO_HOUR">2h</option>
              <option value="SIX_HOUR">6h</option>
              <option value="ONE_DAY">1d</option>
            </select>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <p className="mt-1 text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
        
        <div className="mt-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">Bitcoin Price Chart</h2>
            <BitcoinPriceChart data={marketData} timeframe={selectedTimeframe} />
          </div>
        </div>
        
        {marketData.length > 0 && (
          <div className="mt-6">
            <TechnicalIndicators marketData={marketData} />
          </div>
        )}
        
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalysisLoading || marketData.length === 0}
            className="mb-4 inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isAnalysisLoading ? 'Running AI Analysis...' : 'Run AI Analysis'}
          </button>
        </div>
        
        {analysisError && (
          <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">Error running AI analysis: {analysisError}</p>
            <p className="text-sm text-red-500 mt-1">
              Try again or check server logs for more details.
            </p>
          </div>
        )}
        
        {showAnalysis && (
          <div className="mt-2">
            <AIAnalysis 
              onError={handleAnalysisError} 
              onSuccess={handleAnalysisSuccess}
              isManualRequest={true}
            />
          </div>
        )}
      </div>
    </Layout>
  );
} 