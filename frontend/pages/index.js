import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import BitcoinPriceChart from '../components/BitcoinPriceChart';
import ApiConfigForm from '../components/ApiConfigForm';
import { formatPrice, formatPercentage, formatBtcAmount } from '../lib/utils';
import bitcoinApi from '../lib/api';
import toast from 'react-hot-toast';
import {
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const router = useRouter();
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState([]);
  const [accountBalance, setAccountBalance] = useState(null);
  const [positions, setPositions] = useState({});
  const [tradeHistory, setTradeHistory] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('ONE_HOUR');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [socket, setSocket] = useState(null);

  // Check if API is configured on mount
  useEffect(() => {
    const apiConfigured = localStorage.getItem('btc_trader_api_configured') === 'true';
    setIsConfigured(apiConfigured);
    
    if (apiConfigured) {
      fetchData();
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
        } else if (data.type === 'position_update') {
          // Update positions
          setPositions(data.data);
        } else if (data.type === 'balance_update') {
          // Update account balance
          setAccountBalance(data.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    setSocket(ws);
  };

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch market data
      const marketResponse = await bitcoinApi.getMarketData(selectedTimeframe);
      if (marketResponse.status === 'success') {
        setMarketData(marketResponse.data);
      }
      
      // Fetch account balance
      const balanceResponse = await bitcoinApi.getAccountBalance();
      if (balanceResponse.status === 'success') {
        setAccountBalance(balanceResponse.data);
      }
      
      // Fetch positions
      const positionsResponse = await bitcoinApi.getPositions();
      if (positionsResponse.status === 'success') {
        setPositions(positionsResponse.data);
      }
      
      // Fetch trade history
      const historyResponse = await bitcoinApi.getTradeHistory();
      if (historyResponse.status === 'success') {
        setTradeHistory(historyResponse.data);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data. Please check your API configuration.');
    } finally {
      setIsLoading(false);
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
    fetchData();
  };

  // Handle timeframe change
  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
    bitcoinApi.getMarketData(timeframe)
      .then((response) => {
        if (response.status === 'success') {
          setMarketData(response.data);
        }
      })
      .catch((error) => {
        console.error('Error fetching market data:', error);
        toast.error('Failed to fetch market data');
      });
  };

  // Handle run strategy button click
  const handleRunStrategy = async () => {
    try {
      const response = await bitcoinApi.runStrategy();
      if (response.status === 'success') {
        toast.success('Trading strategy started');
      } else {
        toast.error(`Failed to start trading strategy: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error running strategy:', error);
      toast.error(`Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Calculate current price and 24h change
  const currentPrice = marketData.length > 0 ? marketData[marketData.length - 1].close : 0;
  const previousPrice = marketData.length > 0 ? marketData[0].close : 0;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

  // Calculate total portfolio value
  const portfolioValue = accountBalance
    ? (accountBalance.BTC?.available || 0) * currentPrice + (accountBalance.USD?.available || 0)
    : 0;

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
              onClick={handleRunStrategy}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              disabled={isLoading}
            >
              Run Strategy
            </button>
          </div>
        </div>
        
        {lastUpdated && (
          <p className="mt-1 text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 mt-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Bitcoin Price"
            value={formatPrice(currentPrice)}
            change={`${priceChangePercent > 0 ? '+' : ''}${formatPercentage(priceChangePercent)}`}
            icon={ArrowTrendingUpIcon}
            trend={priceChangePercent > 0 ? 'up' : priceChangePercent < 0 ? 'down' : 'neutral'}
          />
          <StatsCard
            title="Portfolio Value"
            value={formatPrice(portfolioValue)}
            icon={CurrencyDollarIcon}
          />
          <StatsCard
            title="Position Value"
            value={formatPrice(positionValue)}
            icon={ScaleIcon}
          />
          <StatsCard
            title="Win Rate"
            value={`${formatPercentage(winRate)}`}
            icon={ClockIcon}
          />
        </div>
        
        {/* Bitcoin Price Chart */}
        <div className="mt-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Bitcoin Price Chart</h2>
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
              </div>
            </div>
            <BitcoinPriceChart data={marketData} timeframe={selectedTimeframe} />
          </div>
        </div>
        
        {/* Account Balance */}
        <div className="mt-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900">Account Balance</h2>
            {accountBalance ? (
              <div className="mt-4 overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Currency
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Available
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Hold
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountBalance.USD && (
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">USD</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatPrice(accountBalance.USD.available)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatPrice(accountBalance.USD.hold)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatPrice(accountBalance.USD.total)}</div>
                        </td>
                      </tr>
                    )}
                    {accountBalance.BTC && (
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">BTC</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatBtcAmount(accountBalance.BTC.available)} BTC</div>
                          <div className="text-xs text-gray-500">{formatPrice(accountBalance.BTC.available * currentPrice)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatBtcAmount(accountBalance.BTC.hold)} BTC</div>
                          <div className="text-xs text-gray-500">{formatPrice(accountBalance.BTC.hold * currentPrice)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatBtcAmount(accountBalance.BTC.total)} BTC</div>
                          <div className="text-xs text-gray-500">{formatPrice(accountBalance.BTC.total * currentPrice)}</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">Loading account balance...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 