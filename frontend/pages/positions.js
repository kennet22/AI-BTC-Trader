import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import PositionsList from '../components/PositionsList';
import { formatPrice } from '../lib/utils';
import bitcoinApi from '../lib/api';
import toast from 'react-hot-toast';

export default function Positions() {
  const router = useRouter();
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState([]);
  const [positions, setPositions] = useState({});
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Check if API is configured on mount
  useEffect(() => {
    const apiConfigured = localStorage.getItem('btc_trader_api_configured') === 'true';
    setIsConfigured(apiConfigured);
    
    if (apiConfigured) {
      fetchData();
    } else {
      setIsLoading(false);
      router.push('/');
    }
  }, []);

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch market data for current price
      const marketResponse = await bitcoinApi.getMarketData('ONE_HOUR');
      if (marketResponse.status === 'success') {
        setMarketData(marketResponse.data);
      }
      
      // Fetch positions
      const positionsResponse = await bitcoinApi.getPositions();
      if (positionsResponse.status === 'success') {
        setPositions(positionsResponse.data);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data. Please check your API configuration.');
    } finally {
      setIsLoading(false);
    }
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

  return (
    <Layout>
      <div className="pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Active Positions</h1>
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        {lastUpdated && (
          <p className="mt-1 text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
        
        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Loading positions...</p>
            </div>
          ) : (
            <PositionsList
              positions={positions}
              currentPrice={currentPrice}
              onUpdate={handleUpdatePosition}
              onClose={handleClosePosition}
            />
          )}
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