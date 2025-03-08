import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import TradeForm from '../components/TradeForm';
import BitcoinPriceChart from '../components/BitcoinPriceChart';
import PositionsList from '../components/PositionsList';
import { formatPrice } from '../lib/utils';
import bitcoinApi from '../lib/api';
import toast from 'react-hot-toast';

export default function Trading() {
  const router = useRouter();
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState([]);
  const [accountBalance, setAccountBalance] = useState(null);
  const [positions, setPositions] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('ONE_HOUR');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
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
      router.push('/');
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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data. Please check your API configuration.');
    } finally {
      setIsLoading(false);
    }
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

  // Handle trade completion
  const handleTradeComplete = () => {
    fetchData();
  };

  // Handle position update
  const handleUpdatePosition = (positionId, position) => {
    setSelectedPosition({ id: positionId, ...position });
    setUpdateModalOpen(true);
  };

  // Handle position close
  const handleClosePosition = async (positionId) => {
    if (!confirm('Are you sure you want to close this position?')) {
      return;
    }
    
    try {
      const response = await bitcoinApi.closePosition(positionId);
      
      if (response.status === 'success') {
        toast.success('Position closed successfully');
        fetchData();
      } else {
        toast.error(`Failed to close position: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error closing position:', error);
      toast.error(`Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Handle position update form submission
  const handleUpdatePositionSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await bitcoinApi.updatePosition(selectedPosition.id, {
        stop_loss: parseFloat(e.target.stop_loss.value),
        take_profit: parseFloat(e.target.take_profit.value),
      });
      
      if (response.status === 'success') {
        toast.success('Position updated successfully');
        setUpdateModalOpen(false);
        fetchData();
      } else {
        toast.error(`Failed to update position: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating position:', error);
      toast.error(`Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Calculate current price
  const currentPrice = marketData.length > 0 ? marketData[marketData.length - 1].close : 0;

  if (!isConfigured) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Please configure API keys first</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trading</h1>
        
        <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-3">
          {/* Left column - Trade Form */}
          <div className="lg:col-span-1">
            <TradeForm
              currentPrice={currentPrice}
              accountBalance={accountBalance}
              onTradeComplete={handleTradeComplete}
            />
          </div>
          
          {/* Right column - Chart and Positions */}
          <div className="lg:col-span-2">
            {/* Bitcoin Price Chart */}
            <div className="p-6 mb-6 bg-white rounded-lg shadow">
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
            
            {/* Active Positions */}
            <div className="p-6 bg-white rounded-lg shadow">
              <h2 className="mb-4 text-lg font-medium text-gray-900">Active Positions</h2>
              <PositionsList
                positions={positions}
                currentPrice={currentPrice}
                onUpdate={handleUpdatePosition}
                onClose={handleClosePosition}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Position Update Modal */}
      {updateModalOpen && selectedPosition && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900">Update Position</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Update stop loss and take profit levels for your position.
                  </p>
                </div>
              </div>
              
              <form className="mt-5 sm:mt-6" onSubmit={handleUpdatePositionSubmit}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="entry-price" className="block text-sm font-medium text-gray-700">
                      Entry Price
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="entry-price"
                        id="entry-price"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={formatPrice(selectedPosition.entry_price, '')}
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="stop_loss" className="block text-sm font-medium text-gray-700">
                      Stop Loss
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        name="stop_loss"
                        id="stop_loss"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        defaultValue={selectedPosition.stop_loss}
                        step="any"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="take_profit" className="block text-sm font-medium text-gray-700">
                      Take Profit
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        name="take_profit"
                        id="take_profit"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        defaultValue={selectedPosition.take_profit}
                        step="any"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm"
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    onClick={() => setUpdateModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 