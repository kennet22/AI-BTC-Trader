import React, { useState, useEffect } from 'react';
import { formatPrice, formatPercentage, formatBtcAmount } from '../lib/utils';
import bitcoinApi from '../lib/api';

const ProfitSummary = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfitSummary = async () => {
      try {
        setLoading(true);
        // Use axios directly since we don't have fetchWithErrorHandling
        const response = await fetch('/api/profit-summary');
        const data = await response.json();
        
        if (response.ok) {
          setSummary(data.data);
        } else {
          setError(data.detail || 'Failed to fetch profit summary');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch profit summary');
      } finally {
        setLoading(false);
      }
    };

    fetchProfitSummary();
    // Refresh every 60 seconds
    const interval = setInterval(fetchProfitSummary, 60000);
    return () => clearInterval(interval);
  }, []);

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
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="text-gray-500">No profit data available</div>
      </div>
    );
  }

  const {
    realized_profit,
    unrealized_profit,
    total_profit,
    realized_profit_percentage,
    unrealized_profit_percentage,
    total_profit_percentage,
    total_buy_volume,
    total_sell_volume,
    open_positions_count,
    closed_positions_count
  } = summary;

  // Determine colors based on profit values
  const realizedProfitColor = realized_profit >= 0 ? 'text-green-600' : 'text-red-600';
  const unrealizedProfitColor = unrealized_profit >= 0 ? 'text-green-600' : 'text-red-600';
  const totalProfitColor = total_profit >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Profit Summary</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Overview of your trading performance
        </p>
      </div>
      <div className="border-t border-gray-200">
        <dl>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Realized Profit</dt>
            <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
              <span className={`font-bold ${realizedProfitColor}`}>
                {formatPrice(realized_profit)}
              </span>
              <span className="ml-2 text-gray-500">
                ({formatPercentage(realized_profit_percentage)})
              </span>
            </dd>
          </div>
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Unrealized Profit</dt>
            <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
              <span className={`font-bold ${unrealizedProfitColor}`}>
                {formatPrice(unrealized_profit)}
              </span>
              <span className="ml-2 text-gray-500">
                ({formatPercentage(unrealized_profit_percentage)})
              </span>
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Total Profit</dt>
            <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
              <span className={`font-bold ${totalProfitColor}`}>
                {formatPrice(total_profit)}
              </span>
              <span className="ml-2 text-gray-500">
                ({formatPercentage(total_profit_percentage)})
              </span>
            </dd>
          </div>
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Trading Volume</dt>
            <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
              Buy: {formatBtcAmount(total_buy_volume)} BTC | Sell: {formatBtcAmount(total_sell_volume)} BTC
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Positions</dt>
            <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
              Open: {open_positions_count} | Closed: {closed_positions_count}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default ProfitSummary; 