import React, { useState } from 'react';
import toast from 'react-hot-toast';
import bitcoinApi from '../lib/api';

export default function ApiConfigForm({ onConfigured }) {
  const [credentials, setCredentials] = useState({
    coinbase_api_key: '',
    coinbase_api_secret: '',
    openai_api_key: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    for (const key of ['coinbase_api_key', 'coinbase_api_secret', 'openai_api_key']) {
      if (!credentials[key] || credentials[key].trim() === '') {
        toast.error(`Please enter your ${key.replace('_', ' ')}`);
        return;
      }
    }
    
    // Show loading state
    setIsLoading(true);
    
    try {
      // Submit only the required API keys
      const payload = {
        coinbase_api_key: credentials.coinbase_api_key.trim(),
        coinbase_api_secret: credentials.coinbase_api_secret.trim(),
        openai_api_key: credentials.openai_api_key.trim()
      };
      
      // Call the API
      const result = await bitcoinApi.configureApi(payload);
      
      // Handle successful response
      if (result.status === 'success') {
        toast.success('API keys configured successfully');
        localStorage.setItem('btc_trader_api_configured', 'true');
        onConfigured && onConfigured();
      } else {
        toast.error(`Configuration failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('API configuration error:', error);
      toast.error(`Error: ${error.message || 'Failed to connect to the server'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-lg font-medium text-gray-900">API Configuration</h2>
      <p className="mt-1 text-sm text-gray-500">
        Configure your Coinbase and OpenAI API keys to use the Bitcoin AI Trader.
      </p>
      
      <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
        {/* Coinbase API Key */}
        <div>
          <label htmlFor="coinbase_api_key" className="block text-sm font-medium text-gray-700">
            Coinbase API Key
          </label>
          <div className="mt-1">
            <input
              type={showSecrets ? 'text' : 'password'}
              name="coinbase_api_key"
              id="coinbase_api_key"
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Enter your Coinbase API key"
              value={credentials.coinbase_api_key}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </div>
        
        {/* Coinbase API Secret */}
        <div>
          <label htmlFor="coinbase_api_secret" className="block text-sm font-medium text-gray-700">
            Coinbase API Secret
          </label>
          <div className="mt-1">
            <input
              type={showSecrets ? 'text' : 'password'}
              name="coinbase_api_secret"
              id="coinbase_api_secret"
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Enter your Coinbase API secret"
              value={credentials.coinbase_api_secret}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </div>
        
        {/* OpenAI API Key */}
        <div>
          <label htmlFor="openai_api_key" className="block text-sm font-medium text-gray-700">
            OpenAI API Key
          </label>
          <div className="mt-1">
            <input
              type={showSecrets ? 'text' : 'password'}
              name="openai_api_key"
              id="openai_api_key"
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Enter your OpenAI API key"
              value={credentials.openai_api_key}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </div>
        
        {/* Show/Hide Secrets */}
        <div className="flex items-center">
          <input
            id="show-secrets"
            name="show-secrets"
            type="checkbox"
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            checked={showSecrets}
            onChange={() => setShowSecrets(!showSecrets)}
          />
          <label htmlFor="show-secrets" className="block ml-2 text-sm text-gray-700">
            Show API keys
          </label>
        </div>
        
        {/* Security Note */}
        <div className="p-4 text-sm text-yellow-700 bg-yellow-50 rounded-md">
          <p>
            <strong>Security Note:</strong> Your API keys are only stored in memory and used to interact with the trading API.
            They are never stored on disk or sent to any third-party services other than Coinbase and OpenAI.
          </p>
        </div>
        
        {/* Submit button */}
        <div>
          <button
            type="submit"
            className={`w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Configuring...' : 'Configure API Keys'}
          </button>
        </div>
      </form>
    </div>
  );
} 