import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import BitcoinPriceChart from '../components/BitcoinPriceChart';
import { formatPrice } from '../lib/utils';
import bitcoinApi from '../lib/api';
import toast from 'react-hot-toast';

export default function MarketData() {
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('ONE_HOUR');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch market data on mount and when timeframe changes
  useEffect(() => {
    // Check if API is configured first
    const apiConfigured = localStorage.getItem('btc_trader_api_configured') === 'true';
    if (!apiConfigured) {
      setIsLoading(false);
      return;
    }
    
    fetchMarketData();
  }, [selectedTimeframe]);

  // Fetch market data
  const fetchMarketData = async () => {
    setIsLoading(true);
    
    try {
      const response = await bitcoinApi.getMarketData(selectedTimeframe);
      
      if (response.status === 'success') {
        setMarketData(response.data);
        setLastUpdated(new Date());
      } else {
        toast.error('Failed to fetch market data');
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      toast.error('Error fetching market data. Please check your API configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle timeframe change
  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
  };

  return (
    <Layout>
      <div className="pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Market Data</h1>
          <div className="flex items-center space-x-2">
            <select
              className="block px-3 py-2 text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
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
              onClick={fetchMarketData}
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
            <div className="p-6 bg-white rounded-lg shadow">
              <h2 className="mb-4 text-lg font-medium text-gray-900">Technical Indicators</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Open
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        High
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Low
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Close
                      </th>
                      <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Volume
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {marketData.slice(-10).map((data, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(data.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatPrice(data.open)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatPrice(data.high)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatPrice(data.low)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatPrice(data.close)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{data.volume.toFixed(2)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 