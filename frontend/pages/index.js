import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import BitcoinPriceCard from '../components/BitcoinPriceCard';
import PortfolioCard from '../components/PortfolioCard';
import WinRateCard from '../components/WinRateCard';
import AIAnalysisCard from '../components/AIAnalysisCard';
import BitcoinPriceChart from '../components/BitcoinPriceChart';
import ApiConfigForm from '../components/ApiConfigForm';
import ProfitSummary from '../components/ProfitSummary';
import { formatPrice, formatPercentage, formatBtcAmount } from '../lib/utils';
import bitcoinApi from '../lib/api';
import { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Import icons
import {
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// Dynamically import toast to prevent SSR issues
const toast = dynamic(
  () => import('react-hot-toast').then((mod) => mod.toast),
  { ssr: false }
);

// Cache helper functions
const getCachedData = (key, expiryMinutes = 5) => {
  if (typeof window === 'undefined') return null; // Guard against SSR
  
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Check if data is still valid (not expired)
      if (Date.now() - timestamp < expiryMinutes * 60 * 1000) {
        return data;
      }
    }
  } catch (error) {
    console.error(`Error retrieving cached ${key}:`, error);
  }
  return null;
};

const cacheData = (key, data) => {
  if (typeof window === 'undefined') return; // Guard against SSR
  
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (error) {
    console.error(`Error caching ${key}:`, error);
  }
};

// Specific cache functions
const getCachedMarketData = (timeframe) => getCachedData(`dashboardMarketData_${timeframe}`);
const cacheMarketData = (timeframe, data) => cacheData(`dashboardMarketData_${timeframe}`, data);

const getCachedAccountBalance = () => getCachedData('dashboardAccountBalance');
const cacheAccountBalance = (data) => cacheData('dashboardAccountBalance', data);

const getCachedPositions = () => getCachedData('dashboardPositions');
const cachePositions = (data) => cacheData('dashboardPositions', data);

const getCachedTradeHistory = () => getCachedData('dashboardTradeHistory');
const cacheTradeHistory = (data) => cacheData('dashboardTradeHistory', data);

export default function Dashboard() {
  const router = useRouter();
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [marketData, setMarketData] = useState([]);
  const [accountBalance, setAccountBalance] = useState(null);
  const [positions, setPositions] = useState({});
  const [tradeHistory, setTradeHistory] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('ONE_HOUR');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [socket, setSocket] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [dataFetched, setDataFetched] = useState({
    market: false,
    balance: false,
    positions: false,
    history: false,
    analysis: false
  });
  
  // Add state for tracking card updates to trigger animations
  const [updatedCards, setUpdatedCards] = useState({
    price: false,
    portfolio: false,
    position: false,
    winRate: false
  });

  const [isStrategyRunning, setIsStrategyRunning] = useState(false);
  const [isAiServiceEnabled, setIsAiServiceEnabled] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(null);
  const [nextAnalysisAvailable, setNextAnalysisAvailable] = useState(null);

  // Clear update flags after animations complete
  useEffect(() => {
    if (Object.values(updatedCards).some(Boolean)) {
      const timer = setTimeout(() => {
        setUpdatedCards({
          price: false,
          portfolio: false,
          position: false,
          winRate: false
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [updatedCards]);

  // Check if API is configured on mount
  useEffect(() => {
    const apiConfigured = localStorage.getItem('btc_trader_api_configured') === 'true';
    setIsConfigured(apiConfigured);
    
    if (apiConfigured) {
      // Load cached data if available, then fetch fresh data as needed
      loadCachedData();
      fetchData(true); // true = use cached data when available
      setupWebSocket();
    } else {
      setIsLoading(false);
    }
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // Load cached data
  const loadCachedData = () => {
    // Load cached market data
    const cachedMarketData = getCachedMarketData(selectedTimeframe);
    if (cachedMarketData) {
      setMarketData(cachedMarketData);
      setDataFetched(prev => ({ ...prev, market: true }));
    }
    
    // Load cached account balance
    const cachedBalance = getCachedAccountBalance();
    if (cachedBalance) {
      setAccountBalance(cachedBalance);
      setDataFetched(prev => ({ ...prev, balance: true }));
    }
    
    // Load cached positions
    const cachedPositions = getCachedPositions();
    if (cachedPositions) {
      setPositions(cachedPositions);
      setDataFetched(prev => ({ ...prev, positions: true }));
    }
    
    // Load cached trade history
    const cachedHistory = getCachedTradeHistory();
    if (cachedHistory) {
      setTradeHistory(cachedHistory);
      setDataFetched(prev => ({ ...prev, history: true }));
    }
    
    // If we've loaded all data from cache, we're not loading anymore
    if (cachedMarketData && cachedBalance && cachedPositions && cachedHistory) {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  };

  // Set up WebSocket connection
  const setupWebSocket = () => {
    const ws = bitcoinApi.connectWebSocket();
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'market_update') {
          // Update market data
          setMarketData((prev) => {
            const newData = [...prev];
            newData[newData.length - 1] = data.data;
            return newData;
          });
          // Cache the updated data
          cacheMarketData(selectedTimeframe, [...marketData, data.data]);
          // Trigger animation for price card
          setUpdatedCards(prev => ({ ...prev, price: true }));
        } else if (data.type === 'position_update') {
          // Update positions
          setPositions(data.data);
          // Cache the updated data
          cachePositions(data.data);
          // Trigger animation for position card
          setUpdatedCards(prev => ({ ...prev, position: true }));
        } else if (data.type === 'balance_update') {
          // Update account balance with the new structure
          setAccountBalance({
            main: {
              name: 'Main Account',
              USD: data.data.main?.USD || 0,
              BTC: data.data.main?.BTC || 0
            },
            savings: {
              name: 'Savings',
              USDC: data.data.savings?.USDC || 0,
              ETH: data.data.savings?.ETH || 0
            },
            trading: {
              name: 'Trading',
              SOL: data.data.trading?.SOL || 0,
              XRP: data.data.trading?.XRP || 0
            }
          });
          cacheAccountBalance(data.data);
          setUpdatedCards(prev => ({ ...prev, portfolio: true }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    setSocket(ws);
  };

  // Fetch all data
  const fetchData = async (useCached = false) => {
    setIsLoading(true);
    
    try {
      // Fetch other data first
      const fetchPromises = [];
      
      if (!useCached || !dataFetched.market) {
        fetchPromises.push(
          bitcoinApi.getMarketData(selectedTimeframe)
            .then(response => {
              if (response.status === 'success') {
                setMarketData(response.data);
                cacheMarketData(selectedTimeframe, response.data);
                setDataFetched(prev => ({ ...prev, market: true }));
                setUpdatedCards(prev => ({ ...prev, price: true }));
              }
            })
        );
      }
      
      if (!useCached || !dataFetched.balance) {
        fetchPromises.push(
          bitcoinApi.getAccountBalance()
            .then(response => {
              if (response.status === 'success') {
                // Transform the response data to match our structure
                const balanceData = {
                  main: {
                    name: 'Main Account',
                    USD: response.data.main?.USD || 0,
                    BTC: response.data.main?.BTC || 0
                  },
                  savings: {
                    name: 'Savings',
                    USDC: response.data.savings?.USDC || 0,
                    ETH: response.data.savings?.ETH || 0
                  },
                  trading: {
                    name: 'Trading',
                    SOL: response.data.trading?.SOL || 0,
                    XRP: response.data.trading?.XRP || 0
                  }
                };
                setAccountBalance(balanceData);
                cacheAccountBalance(balanceData);
                setDataFetched(prev => ({ ...prev, balance: true }));
                setUpdatedCards(prev => ({ ...prev, portfolio: true }));
              }
            })
        );
      }
      
      if (!useCached || !dataFetched.positions) {
        fetchPromises.push(
          bitcoinApi.getPositions()
            .then(response => {
              if (response.status === 'success') {
                setPositions(response.data);
                cachePositions(response.data);
                setDataFetched(prev => ({ ...prev, positions: true }));
                setUpdatedCards(prev => ({ ...prev, position: true }));
              }
            })
        );
      }
      
      if (!useCached || !dataFetched.history) {
        fetchPromises.push(
          bitcoinApi.getTradeHistory()
            .then(response => {
              if (response.status === 'success') {
                setTradeHistory(response.data);
                cacheTradeHistory(response.data);
                setDataFetched(prev => ({ ...prev, history: true }));
                setUpdatedCards(prev => ({ ...prev, winRate: true }));
              }
            })
        );
      }
      
      // Wait for all other data to be fetched
      await Promise.all(fetchPromises);
      setIsLoading(false);
      setLastUpdated(new Date());
      
      // Then fetch AI analysis separately
      if (!useCached || !dataFetched.analysis) {
        setIsAnalysisLoading(true);
        const analysisResponse = await bitcoinApi.getAnalysis();
        if (analysisResponse.status === 'success') {
          setAnalysis(analysisResponse.data);
          setDataFetched(prev => ({ ...prev, analysis: true }));
        }
        setIsAnalysisLoading(false);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          try {
            toast?.error?.('Failed to fetch data. Please check your API configuration.');
          } catch (err) {
            console.log('Toast notification failed');
          }
        }, 0);
      }
      setIsLoading(false);
      setIsAnalysisLoading(false);
    }
  };

  // Handle API configuration
  const handleApiConfigured = () => {
    setIsConfigured(true);
    fetchData();
    setupWebSocket();
  };

  // Handle refresh button click
  const handleRefresh = () => {
    // Force fetch fresh data (don't use cached)
    fetchData(false);
  };

  // Handle timeframe change
  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
    
    // First check if we have cached data for this timeframe
    const cachedData = getCachedMarketData(timeframe);
    if (cachedData) {
      setMarketData(cachedData);
      // Trigger animation for price card
      setUpdatedCards(prev => ({ ...prev, price: true }));
      return;
    }
    
    // If no cached data, fetch fresh data
    bitcoinApi.getMarketData(timeframe)
      .then((response) => {
        if (response.status === 'success') {
          setMarketData(response.data);
          cacheMarketData(timeframe, response.data);
          // Trigger animation for price card
          setUpdatedCards(prev => ({ ...prev, price: true }));
        }
      })
      .catch((error) => {
        console.error('Error fetching market data:', error);
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            try {
              toast?.error?.('Failed to fetch market data');
            } catch (err) {
              console.log('Toast notification failed');
            }
          }, 0);
        }
      });
  };

  // Add effect to check if analysis is available
  useEffect(() => {
    if (lastAnalysisTime) {
      const checkAvailability = () => {
        const now = Date.now();
        const timeSinceLastAnalysis = now - lastAnalysisTime;
        const timeRemaining = Math.max(30000 - timeSinceLastAnalysis, 0);
        
        if (timeRemaining === 0) {
          setNextAnalysisAvailable(null);
        } else {
          setNextAnalysisAvailable(new Date(now + timeRemaining));
          setTimeout(checkAvailability, 1000);
        }
      };
      
      checkAvailability();
    }
  }, [lastAnalysisTime]);

  // Add effect to check AI service status on mount and periodically
  useEffect(() => {
    const checkAiServiceStatus = async () => {
      try {
        const response = await bitcoinApi.getAiServiceStatus();
        setIsAiServiceEnabled(response.status === 'running');
      } catch (error) {
        console.error('Error checking AI service status:', error);
        setIsAiServiceEnabled(false);
      }
    };

    checkAiServiceStatus();
    const interval = setInterval(checkAiServiceStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Handle enabling/disabling AI service
  const handleToggleAiService = async () => {
    try {
      const action = isAiServiceEnabled ? 'stop' : 'start';
      setIsLoading(true);
      
      const response = await bitcoinApi.toggleAiService(action);
      if (response.status === 'success') {
        setIsAiServiceEnabled(!isAiServiceEnabled);
        toast?.success?.(
          `AI Trading ${action === 'start' ? 'enabled' : 'disabled'} successfully`
        );
      } else {
        throw new Error(response.message || `Failed to ${action} AI service`);
      }
    } catch (error) {
      console.error('Error toggling AI service:', error);
      toast?.error?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the run strategy function to include rate limiting
  const handleRunAnalysis = async () => {
    // Check if enough time has passed since last analysis
    if (lastAnalysisTime && Date.now() - lastAnalysisTime < 30000) {
      const remainingTime = Math.ceil((30000 - (Date.now() - lastAnalysisTime)) / 1000);
      toast?.error?.(`Please wait ${remainingTime} seconds before running another analysis`);
      return;
    }

    try {
      setIsAnalysisLoading(true);
      const response = await bitcoinApi.runStrategy();
      
      if (response.status === 'success') {
        setLastAnalysisTime(Date.now());
        
        if (response.data?.analysis) {
          setAnalysis(response.data.analysis);
          setDataFetched(prev => ({ ...prev, analysis: true }));
          toast?.success?.('Analysis completed successfully');
        }
      } else {
        throw new Error(response.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error running analysis:', error);
      toast?.error?.(`Error: ${error.message}`);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  // Calculate current price and 24h change
  const currentPrice = marketData.length > 0 ? marketData[marketData.length - 1].close : 0;
  const previousPrice = marketData.length > 0 ? marketData[0].close : 0;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

  // Calculate total portfolio value
  const calculatePortfolioValue = () => {
    if (!accountBalance) return 0;

    const mainAccountValue = (accountBalance.main?.USD || 0) + 
                           ((accountBalance.main?.BTC || 0) * currentPrice);
    
    const savingsValue = (accountBalance.savings?.USDC || 0) + 
                        ((accountBalance.savings?.ETH || 0) * 2000); // Mock ETH price
    
    const tradingValue = ((accountBalance.trading?.SOL || 0) * 60) + // Mock SOL price
                        ((accountBalance.trading?.XRP || 0) * 0.50); // Mock XRP price

    return mainAccountValue + savingsValue + tradingValue;
  };

  const portfolioValue = calculatePortfolioValue();

  // Calculate total position value
  const positionValue = Object.values(positions).reduce(
    (total, position) => total + position.size * currentPrice,
    0
  );

  // Calculate win rate
  const completedTrades = tradeHistory.filter((trade) => trade.exit_price);
  const winningTrades = completedTrades.filter(
    (trade) => trade.exit_price > trade.entry_price
  );
  const winRate = completedTrades.length > 0
    ? (winningTrades.length / completedTrades.length) * 100
    : 0;

  if (!isConfigured) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-8">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Welcome to Bitcoin AI Trader</h1>
          <ApiConfigForm onConfigured={handleApiConfigured} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              type="button"
              onClick={handleToggleAiService}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isAiServiceEnabled 
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              }`}
              disabled={isLoading}
            >
              {isAiServiceEnabled ? 'Disable AI Trading' : 'Enable AI Trading'}
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <p className="mt-1 text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 mt-6 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
          <BitcoinPriceCard
            currentPrice={currentPrice}
            priceChangePercent={priceChangePercent}
            marketData={marketData}
            hasUpdated={updatedCards.price}
            linkTo="/trading"
            secondaryLinkTo="/market-data"
          />
          <PortfolioCard
            portfolioValue={portfolioValue}
            accountBalance={accountBalance}
            currentPrice={currentPrice}
            hasUpdated={updatedCards.portfolio}
            linkTo="/history"
          />
          <AIAnalysisCard
            hasUpdated={updatedCards.price}
            isProcessing={isAnalysisLoading}
          />
          <WinRateCard
            winRate={winRate}
            tradeHistory={tradeHistory}
            hasUpdated={updatedCards.winRate}
            linkTo="/history"
          />
        </div>
        
        {/* Two Column Layout: Profit Summary and AI Analysis Info */}
        <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-2">
          {/* Profit Summary Column */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* <h2 className="text-lg font-medium text-gray-900">Profit Summary</h2> */}
              <div className="mt-4">
                <ProfitSummary />
              </div>
            </div>
          </div>
          
          {/* AI Analysis Information Column */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">AI Analysis Details</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className={`inline-flex h-3 w-3 rounded-full ${
                      isAiServiceEnabled ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span className="ml-2 text-sm text-gray-500">
                      Service {isAiServiceEnabled ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  {isAiServiceEnabled && (
                    <button
                      type="button"
                      onClick={handleRunAnalysis}
                      disabled={isAnalysisLoading || (nextAnalysisAvailable !== null)}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm 
                        ${isAnalysisLoading || nextAnalysisAvailable !== null 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-blue-700'} 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                    >
                      {isAnalysisLoading ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                  )}
                </div>
              </div>
              
              {nextAnalysisAvailable && (
                <div className="mb-4 text-sm text-gray-500">
                  Next analysis available in {Math.ceil((nextAnalysisAvailable - Date.now()) / 1000)}s
                </div>
              )}

              <div className="mt-4 space-y-4">
                {/* Status Section */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isAnalysisLoading ? 'bg-blue-100 text-blue-800' :
                      isStrategyRunning ? 'bg-green-100 text-green-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {isAnalysisLoading ? 'Analyzing...' :
                       isStrategyRunning ? 'Running' : 
                       'Idle'}
                    </span>
                  </div>
                </div>
                
                {/* Last Run Section */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Last Analysis:</span>
                    <span className="text-sm text-gray-900">{lastUpdated ? lastUpdated.toLocaleString() : 'Never'}</span>
                  </div>
                </div>
                
                {/* Reasoning Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Analysis Reasoning:</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {isAnalysisLoading ? (
                      <div className="flex items-center justify-center py-4">
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
                    ) : (
                      <>
                        <p className="text-sm text-gray-700">
                          {analysis?.reasoning || 'No analysis available'}
                        </p>
                        {analysis?.confidence && (
                          <div className="mt-2 flex items-center">
                            <span className="text-xs text-gray-500 mr-2">Confidence:</span>
                            <div className="flex-grow h-2 bg-gray-200 rounded-full">
                              <div 
                                className="h-2 bg-blue-500 rounded-full"
                                style={{ width: `${analysis.confidence * 100}%` }}
                              />
                            </div>
                            <span className="ml-2 text-xs text-gray-500">
                              {Math.round(analysis.confidence * 100)}%
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Key Indicators Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Key Indicators:</h3>
                  {isAnalysisLoading ? (
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {analysis?.indicators?.map((indicator, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* API Configuration Form */}
      {!isConfigured && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
            <h2 className="mb-4 text-xl font-bold">API Configuration</h2>
            <ApiConfigForm onConfigured={handleApiConfigured} />
          </div>
        </div>
      )}
      
      {/* Toast notifications */}
      <Toaster position="top-right" />
    </Layout>
  );
} 