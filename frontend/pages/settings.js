import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ApiConfigForm from '../components/ApiConfigForm';
import toast from 'react-hot-toast';

export default function Settings() {
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if API has been configured
    const apiConfigured = localStorage.getItem('btc_trader_api_configured') === 'true';
    setIsConfigured(apiConfigured);
  }, []);

  // Handle API configuration
  const handleApiConfigured = () => {
    setIsConfigured(true);
    toast.success('API keys updated successfully');
  };

  return (
    <Layout>
      <div className="pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        
        <div className="mt-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900">API Configuration</h2>
            <p className="mt-1 text-sm text-gray-500">
              {isConfigured
                ? 'Update your API keys below. Your existing keys are currently active.'
                : 'Configure your API keys to start using the Bitcoin AI Trader.'}
            </p>
            
            <div className="mt-4">
              <ApiConfigForm onConfigured={handleApiConfigured} />
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900">Trading Settings</h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure trading parameters
            </p>
            
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="max-daily-trades" className="block text-sm font-medium text-gray-700">
                  Maximum Daily Trades
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="max-daily-trades"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    defaultValue={5}
                    min={1}
                    max={20}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Limit the number of trades the system can make per day
                </p>
              </div>
              
              <div>
                <label htmlFor="risk-level" className="block text-sm font-medium text-gray-700">
                  Risk Level
                </label>
                <div className="mt-1">
                  <select
                    id="risk-level"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    defaultValue="medium"
                  >
                    <option value="low">Low (1-2% per trade)</option>
                    <option value="medium">Medium (3-5% per trade)</option>
                    <option value="high">High (6-10% per trade)</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  The risk level determines the size of each position
                </p>
              </div>
              
              <div className="flex items-center">
                <input
                  id="enable-auto-trading"
                  name="enable-auto-trading"
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  defaultChecked={false}
                />
                <label htmlFor="enable-auto-trading" className="block ml-2 text-sm text-gray-700">
                  Enable automated trading
                </label>
              </div>
              
              <div className="pt-5">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 